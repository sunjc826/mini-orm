import _ from "lodash";
import { PoolClient } from "pg";
import { getPool } from "../connection";
import { DbPool, ResultSet } from "../connection";
import { DomainObject } from "../domain";
import {
  brackets,
  dbColumnNameToColumnKey,
  extractDomainKeyFromTable,
  splitResultSetColumnName,
} from "../helpers";
import { Promisify } from "../helpers/types";
import { registry } from "../registry";
import { Query } from "../repository/query";
import { getVirtualDomainObject } from "./lazyLoad";
import { EmbeddedObjectMap } from "./metadata/embeddedObjectMap";
import { RelationType } from "./metadata/foreignKeyMap";
import { MetaData } from "./metadata/metadata";
import { MetaDataObjectType } from "./metadata/types";
import { Table } from "./table";
import { ID_COLUMN_NAME } from "./types";

export abstract class DataMapper {
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

    return (await this.dbPool).query(sql);
  }

  /**
   * Returns an array of domain objects when given a sql query.
   * @param sql Sql query string.
   */
  static async select<T extends DomainObject>(
    sql: string,
    client?: PoolClient
  ): Promise<Array<T>> {
    const resultSet = (await (client || (await this.dbPool)).query(
      sql
    )) as ResultSet<T>;
    return this.resultSetToDomainObjects(resultSet);
  }

  /**
   * Returns an array of object ids when given an array of domain objects of a specific type to insert into db.
   * @param objects
   */
  static async insert<T extends DomainObject>(
    objects: Array<T>,
    client?: PoolClient
  ): Promise<Array<T>> {
    if (objects.length === 0) {
      return [];
    }
    const sql = await this.domainObjectToSql(objects);
    const idArr = (await (client || (await this.dbPool)).query(
      sql
    )) as ResultSet<T>;
    return idArr;
  }

  static async update<T extends DomainObject>(
    objects: Array<T>,
    client?: PoolClient
  ) {
    if (objects.length === 0) {
      return;
    }
    const sql = await this.getUpdateSql(objects);
    await (client || (await this.dbPool)).query(sql);
  }

  /**
   * Deletes the rows corresponding to the provided objectIds.
   * @param objectIds
   * @param client
   * @returns
   */
  static async delete(objectIds: Array<number>, client?: PoolClient) {
    if (objectIds.length === 0) {
      return;
    }
    const sql = this.getDeleteSql(objectIds);
    await (client || (await this.dbPool)).query(sql);
  }

  // Note: update may be very slow since each updated record creates
  // a single UPDATE SET statement
  private static async getUpdateSql<T extends DomainObject>(
    domainObjects: Array<T>
  ) {
    const domainKey = this.domainKey;
    const Table = registry.getTable(domainKey);
    const tableName = Table.tableName;
    const idArr: Array<number> = domainObjects.map((obj) => obj.id);
    const sqlSetPartArr: Array<Array<any>> = new Array(domainObjects.length);
    for (let i = 0; i < domainObjects.length; i++) {
      sqlSetPartArr[i] = [];
    }

    outer: for (const metadataField of this.metadata.metadataFields) {
      // foreach doesn't work well with async logic that I want to run sequentially
      for (let i = 0; i < domainObjects.length; i++) {
        const domainObj = domainObjects[i] as Record<string, any>;
        switch (metadataField.variant) {
          case MetaDataObjectType.COLUMN_MAP: {
            const { domainFieldName, tableColumnKey } = metadataField;
            if (tableColumnKey === ID_COLUMN_NAME) {
              continue outer;
            }
            if (!domainObjects[i].dirtied.has(domainFieldName)) {
              continue;
            }
            const actualDbColumnName = Table.getDbColumnName(tableColumnKey);
            sqlSetPartArr[i].push(`${actualDbColumnName}=
              ${Table.convertColumnValueToSqlString(
                tableColumnKey,
                domainObj[domainFieldName]
              )}`);
            break;
          }
          case MetaDataObjectType.FOREIGN_KEY_MAP: {
            const { foreignKey, relationName, relationType } = metadataField;
            if (relationType === RelationType.BELONGS_TO) {
              if (!domainObjects[i].dirtied.has(relationName)) {
                continue;
              }
              const actualDbColumnName = Table.getDbColumnName(foreignKey);

              // the reason why we use await here is that the object
              // may be a virtual proxy (for which await is needed) or a regular object.
              sqlSetPartArr[i].push(`${actualDbColumnName}=
                ${await (domainObj[relationName] as Promisify<DomainObject>).id}
              `);
            }
            break;
          }
          default: {
            throw new Error("unexpected metadata object type");
          }
        }
      }
    }
    let sql = "";
    for (let i = 0; i < idArr.length; i++) {
      sql += `UPDATE ${tableName} SET ${sqlSetPartArr[i]} WHERE id=${idArr[i]};`;
    }
    return sql;
  }

  private static getDeleteSql(objectIds: Array<number>): string {
    const Table = registry.getTable(this.domainKey);
    const tableName = Table.tableName;
    const idString = brackets(objectIds.map((id) => id.toString()).join(","));
    const sql = `DELETE FROM ${tableName} WHERE id IN ${idString};`;
    return sql;
  }

  private static async domainObjectToSql<T extends DomainObject>(
    domainObjects: Array<T>
  ): Promise<string> {
    const domainKey = (domainObjects[0].constructor as typeof DomainObject)
      .domainKey;
    const Table = registry.getTable(domainKey);
    const tableName = Table.tableName;

    const sqlColumnNamesPartArr: Array<string> = [];
    const sqlValuesPartArr: Array<Array<any>> = new Array(domainObjects.length);
    for (let i = 0; i < domainObjects.length; i++) {
      sqlValuesPartArr[i] = [];
    }

    for (const metadataField of this.metadata.metadataFields) {
      switch (metadataField.variant) {
        case MetaDataObjectType.COLUMN_MAP: {
          const { tableColumnKey } = metadataField;
          if (tableColumnKey === ID_COLUMN_NAME) {
            continue;
          }
          const actualDbColumnName = Table.getDbColumnName(tableColumnKey);
          sqlColumnNamesPartArr.push(actualDbColumnName);
          break;
        }
        case MetaDataObjectType.FOREIGN_KEY_MAP: {
          const { foreignKey, relationType } = metadataField;
          if (relationType === RelationType.BELONGS_TO) {
            const actualDbColumnName = Table.getDbColumnName(foreignKey);
            sqlColumnNamesPartArr.push(actualDbColumnName);
          }
        }
      }
    }
    outer: for (const metadataField of this.metadata.metadataFields) {
      // foreach doesn't work well with async logic that I want to run sequentially
      for (let i = 0; i < domainObjects.length; i++) {
        const domainObj = domainObjects[i] as Record<string, any>;
        switch (metadataField.variant) {
          case MetaDataObjectType.COLUMN_MAP: {
            const { domainFieldName, tableColumnKey } = metadataField;
            if (tableColumnKey === ID_COLUMN_NAME) {
              continue outer;
            }

            sqlValuesPartArr[i].push(
              Table.convertColumnValueToSqlString(
                tableColumnKey,
                domainObj[domainFieldName]
              )
            );
            break;
          }
          case MetaDataObjectType.FOREIGN_KEY_MAP: {
            const { relationName, relationType } = metadataField;
            if (relationType === RelationType.BELONGS_TO) {
              // the reason why we use await here is that the object
              // may be a virtual proxy (for which await is needed) or a regular object.
              sqlValuesPartArr[i].push(
                await (domainObj[relationName] as Promisify<DomainObject>).id
              );
            }
            break;
          }
          default: {
            throw new Error("unexpected metadata object type");
          }
        }
      }
    }
    const sqlColumnNamesPart = brackets(sqlColumnNamesPartArr.join(","));
    const sqlValuesPart = sqlValuesPartArr
      .map((arr) => brackets(arr.join(", ")))
      .join(",");
    const sql = `INSERT INTO ${tableName} ${sqlColumnNamesPart}
    VALUES ${sqlValuesPart}
    RETURNING ${ID_COLUMN_NAME}
    ;`;
    return sql;
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
        const actualDomainObj = new DomainObj(domainObj);
        registry.unitOfWork.registerClean({
          domainKey,
          domainObject: actualDomainObj,
        });
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

interface CreateMapperOptions<T extends typeof Table>
  extends MetaData.GenerateMetaDataOptions<T> {
  domainKey: string;
  Table: T;
}

export function createMapper<T extends typeof Table>({
  domainKey,
  Table,
  ...metadataOptions
}: CreateMapperOptions<T>) {
  // Table takes priority
  const TableClass = Table || registry.getTable(domainKey!);
  const Mapper = class extends DataMapper {
    static domainKey = domainKey;
  };
  Mapper.metadata = MetaData.generateMetaData({
    domainKey,
    Table: TableClass,
    ...metadataOptions,
  });

  return Mapper;
}

// export { Table, createTable } from "./table";
// export { UnitOfWork } from "./unitOfWork";
// export {
//   AllMetadataField,
//   AllMetadataFieldTypes,
//   ColumnMap,
//   ForeignKeyMap,
//   JoinTableMap,
//   MetaData,
//   MetaDataObjectType,
//   RelationType,
// } from "./metadata";
