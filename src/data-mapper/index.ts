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
import { getVirtualDomainObject } from "./lazyLoad";
import { MetaDataObject, MetaData, MetaDataObjectTypes } from "./metadata";
import { Table } from "./table";

export abstract class DataMapper {
  // TODO: config
  static domainKey: string;
  static dbPool: Promise<DbPool> = getPool(); // TODO: is it possible to not have the promise here?
  static metadata: MetaData;

  static async createTables() {
    let sql = "";
    for (const { _Table } of Object.values(registry.registry)) {
      sql += _Table.toSqlCreate();
    }
    write(sql, "sql");
    return (await this.dbPool).query(sql);
  }

  static async truncateTables() {
    let sql = "";
    for (const { _Table } of Object.values(registry.registry)) {
      sql += _Table.toSqlTruncate();
    }
    write(sql, "sql");
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
    write(resultSet);
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
      // write(tableColumnMap);

      // create the domain objects
      for (const [domainKey, tableObj] of Object.entries(tableColumnMap)) {
        const Mapper = registry.getMapper(domainKey);
        const DomainObj = registry.getDomainObject<T>(domainKey);
        const Table = registry.getTable(domainKey);
        const domainObj: Record<string, any> = {};
        for (const [tableColumnKey, value] of Object.entries(tableObj)) {
          // TODO: O(n^2) find here, kinda bad.
          let inMemoryValue = value;
          if (Table.isForeignKey(tableColumnKey)) {
            const foreignDomainKey = Table.foreignKeyDomain(tableColumnKey)!;
            inMemoryValue = getVirtualDomainObject(
              foreignDomainKey,
              value as number
            );
          }

          const metadataField = Mapper.metadata.findByTable(tableColumnKey);
          switch (metadataField?.variant) {
            case MetaDataObjectTypes.columnMap: {
              domainObj[metadataField.domainFieldName] = inMemoryValue;
              break;
            }
            default: {
              throw new Error("invalid metadata object");
            }
          }
        }
        // write(domainObj);
        const actualDomainObj = new DomainObj(domainObj);
        // write(actualDomainObj);
        // write(domainKey);
        // write(this.domainKey);
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
    write(domainObjects);
    return domainObjects;
  }
}

export namespace DataMapper {
  export interface ConstructorParams {
    TableClass: Constructor<Table>;
    metadata?: Array<MetaDataObject>;
  }

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
}

export function createMapper<T extends typeof Table>({
  domainKey,
  Table,
}: CreateMapperOptions<T>) {
  if (!domainKey && !Table) {
    throw new Error("at least one of domainKey or Table must be supplied");
  }
  // Table takes priority
  const TableClass = Table || registry.getTable(domainKey!);
  const Mapper = class extends DataMapper {
    static domainKey = domainKey;
  };
  // TODO: we generate some default metadata first
  Mapper.metadata = MetaData.generateDefaultMetaData(TableClass);
  return Mapper;
}
export { createTable } from "./table";
