import _ from "lodash";
import { getPool } from "../connection";
import { DbPool, ResultSet } from "../connection/connect";
import { DomainObject } from "../domain";
import {
  dbColumnNameToColumnKey,
  extractDomainKeyFromTable,
  splitResultSetColumnName,
} from "../helpers";
import { Constructor } from "../helpers/types";
import { write } from "../lib-test/tests/helpers";
import { registry } from "../registry";
import { Query } from "../repository/query";
import { Operators } from "../repository/types";
import { getVirtualDomainObject } from "./lazyLoad";
import { MetaData, MetaDataObjectType, RelationType } from "./metadata";
import { Table } from "./table";

export abstract class DataMapper {
  // TODO: config
  static domainKey: string;
  static dbPool: Promise<DbPool> = getPool(); // TODO: is it possible to not have the promise here?
  static metadata: MetaData;

  /**
   * Creates all registered tables in db.
   * @returns Promise of db query.
   */
  static async createTables() {
    let sql = "";
    for (const { _Table } of Object.values(registry.registry)) {
      sql += _Table.toSqlCreate();
    }
    // write(sql, "sql");
    return (await this.dbPool).query(sql);
  }

  /**
   * Truncates all registered tables in db.
   * @returns Promise of db query.
   */
  static async truncateTables() {
    let sql = "";
    for (const { _Table } of Object.values(registry.registry)) {
      sql += _Table.toSqlTruncate();
    }
    // write(sql, "sql");
    return (await this.dbPool).query(sql);
  }

  /**
   * Returns a result set when given a sql query.
   * @param sql Sql query string.
   */
  static async select<T extends DomainObject>(sql: string): Promise<Array<T>> {
    const resultSet = await (await this.dbPool).query(sql);
    return this.resultSetToDomainObjects(resultSet);
  }

  /**
   * Converts db rows to domain objects.
   * @param resultSet
   */
  private static resultSetToDomainObjects<T extends DomainObject>(
    resultSet: ResultSet<any>
  ) {
    const domainObjects = resultSet.map((row) => {
      const tableColumnMap: Record<string, any> = {};
      let requestedDomainObj: T | null = null;
      for (const [column, value] of Object.entries(row)) {
        /**
         * A map of the form
         * [tableKey] {
         *  [columnKey]: [value]
         * }
         */
        const { tableName, dbColName } = splitResultSetColumnName(column);
        // here, we are aggregating all the properties related to a single table
        // before creating the domain object
        tableColumnMap[extractDomainKeyFromTable(tableName)] ||= {};
        tableColumnMap[extractDomainKeyFromTable(tableName)][
          dbColumnNameToColumnKey(dbColName)
        ] = value;
      }

      // create the domain objects
      for (const [domainKey, tableObj] of Object.entries(tableColumnMap)) {
        const Mapper = registry.getMapper(domainKey);
        const DomainObj = registry.getDomainObject<T>(domainKey);
        const Table = registry.getTable(domainKey);
        const domainObj: Record<string, any> = {};

        //// REVISED IMPLEMENTATION HERE
        Mapper.metadata.metadataFields.forEach((metadataField) => {
          switch (metadataField.variant) {
            case MetaDataObjectType.COLUMN_MAP: {
              const { tableColumnKey, domainFieldName } = metadataField;
              domainObj[domainFieldName] = tableObj[tableColumnKey];
              break;
            }
            case MetaDataObjectType.FOREIGN_KEY_MAP: {
              const { foreignKey, otherDomainKey, relationName, relationType } =
                metadataField;
              switch (relationType) {
                case RelationType.BELONGS_TO: {
                  domainObj[relationName] = getVirtualDomainObject({
                    domainKey: otherDomainKey,
                    knownId: tableObj[foreignKey],
                    isSingle: true,
                  });
                  break;
                }
                case RelationType.HAS_ONE: {
                  const query: Query = new Query(otherDomainKey);
                  query.where({
                    domainObjectField: foreignKey,
                    value: tableObj["id"],
                  });
                  domainObj[relationName] = getVirtualDomainObject({
                    domainKey: otherDomainKey,
                    loader: query,
                    isSingle: true,
                  });
                  break;
                }
                case RelationType.HAS_MANY: {
                  const query: Query = new Query(otherDomainKey);
                  query.where({
                    domainObjectField: foreignKey,
                    value: tableObj["id"],
                  });
                  domainObj[relationName] = getVirtualDomainObject({
                    domainKey: otherDomainKey,
                    loader: query,
                    isSingle: false,
                  });
                  break;
                }
                default: {
                  throw new Error("unexpected relation type");
                }
              }
              break;
            }
            default: {
              throw new Error("unexpected metadata object type");
            }
          }
        });

        //// NEED TO CHANGE THIS IMPLEMENTATION
        // the problem here is that we only add entries by the columns
        // however, it makes more sense to iterate through the metadata
        // because some fields like those due to a hasOne or hasMany associations
        // do not have tableColumns on the object itself
        // but rather on the associated object
        // for (const [tableColumnKey, value] of Object.entries(tableObj)) {
        //   // TODO: O(n^2) find here, kinda bad.
        //   let inMemoryValue = value;
        //   const metadataField = Mapper.metadata.findByTable(tableColumnKey);

        //   if (Table.isForeignKey(tableColumnKey)) {
        //     const foreignDomainKey = Table.foreignKeyDomain(tableColumnKey)!;
        //     inMemoryValue = getVirtualDomainObject(
        //       foreignDomainKey,
        //       value as number
        //     );
        //   }

        //   switch (metadataField?.variant) {
        //     case MetaDataObjectType.COLUMN_MAP: {
        //       domainObj[metadataField.domainFieldName] = inMemoryValue;
        //       break;
        //     }
        //     case MetaDataObjectType.FOREIGN_KEY_MAP: {
        //       // TODO

        //       break;
        //     }
        //     default: {
        //       throw new Error("invalid metadata object");
        //     }
        //   }
        // }
        //// NEED TO CHANGE THIS IMPLEMENTATION
        const actualDomainObj = new DomainObj(domainObj);
        registry.getIdentityMap().insert(domainKey, actualDomainObj);
        if (domainKey === this.domainKey) {
          requestedDomainObj = actualDomainObj;
        }
      }

      if (!requestedDomainObj) {
        // each row must produce instance of the domain object
        // Note: This may not be the case if right joins are used, so this may need to change in future.
        throw new Error("unexpected missing data from table row");
      }
      return requestedDomainObj;
    });
    return domainObjects;
  }
}

export namespace DataMapper {
  export var Test = {
    async testConn(): Promise<boolean> {
      const client = await (await DataMapper.dbPool).getClient();
      if (!client) {
        return false;
      }
      client.release();
      return true;
    },

    // from https://stackoverflow.com/questions/3327312/how-can-i-drop-all-the-tables-in-a-postgresql-database
    async dropAll() {
      const sql = `DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO postgres;
        GRANT ALL ON SCHEMA public TO public;`;
      return (await DataMapper.dbPool).query(sql);
    },
  };
}

interface CreateMapperOptions<T extends typeof Table> {
  domainKey: string;
  Table?: T;
  /**
   * A mapping of relationName to options
   */
  belongsTo?: Record<string, MetaData.RelationOptionsWithoutName>;
  hasOne?: Record<string, MetaData.RelationOptionsWithoutName>;
  hasMany?: Record<string, MetaData.RelationOptionsWithoutName>;
}

export function createMapper<T extends typeof Table>({
  domainKey,
  Table,
  belongsTo = {},
  hasOne = {},
  hasMany = {},
}: CreateMapperOptions<T>) {
  // Table takes priority
  const TableClass = Table || registry.getTable(domainKey!);
  const Mapper = class extends DataMapper {
    static domainKey = domainKey;
  };
  Mapper.metadata = MetaData.generateDefaultMetaData(domainKey, TableClass);
  // TODO: quite a lot of repetition here
  for (const [key, options] of Object.entries(belongsTo)) {
    Mapper.metadata.belongsTo({ relationName: key, ...options });
  }
  for (const [key, options] of Object.entries(hasOne)) {
    Mapper.metadata.hasOne({ relationName: key, ...options });
  }
  for (const [key, options] of Object.entries(hasMany)) {
    Mapper.metadata.hasMany({ relationName: key, ...options });
  }
  return Mapper;
}

export { createTable } from "./table";
