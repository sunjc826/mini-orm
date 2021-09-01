import _ from "lodash";
import { PoolClient } from "pg";
import { getPool } from "../connection";
import { DbPool, ResultSet } from "../connection";
import { DbClient } from "../connection/connect";
import { DomainObject } from "../domain";
import { MetaDataErrors } from "../errors";
import {
  brackets,
  dbColumnNameToColumnKey,
  extractDomainKeyFromTable,
  quote,
  splitResultSetColumnName,
} from "../helpers";
import { Promisify } from "../helpers/types";
import { log } from "../lib-test/tests/helpers";
import { registry } from "../registry";
import { RelationType } from "./metadata/foreignKeyMap";
import { AllMetadataFieldTypes, MetaData } from "./metadata/metadata";
import { MetaDataObjectType } from "./metadata/types";
import { Table } from "./table";
import { ID_COLUMN_NAME } from "./types";

export abstract class DataMapper {
  static domainKey: string;
  static dbPool: Promise<DbPool> = getPool(); // TODO: is it possible to not have the promise here?
  static metadata: MetaData;

  static generateMetaData<T extends typeof Table>(
    options: MetaData.GenerateMetaDataOptions<T>
  ) {
    this.metadata = new MetaData();
    this.metadata.generateMetaData(options);
  }

  /**
   * Creates all registered tables in db.
   * @returns Promise of db query.
   */
  static async createTables() {
    let sql = "";
    for (const Table of registry.getDbTables()) {
      sql += Table.toSqlCreate();
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
    client?: DbClient
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
    client?: DbClient
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
  static async delete(objectIds: Array<number>, client?: DbClient) {
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
        if (
          metadataField.variant === MetaDataObjectType.COLUMN_MAP &&
          metadataField.tableColumnKey === ID_COLUMN_NAME
        ) {
          continue outer;
        }
        await this.fillUpdateColumn(
          metadataField,
          domainObj,
          Table,
          sqlSetPartArr[i]
        );
      }
    }
    let sql = "";
    for (let i = 0; i < idArr.length; i++) {
      sql += `UPDATE ${tableName} SET ${sqlSetPartArr[i]} WHERE id=${idArr[i]};`;
    }
    return sql;
  }

  private static getDeleteSql(objectIds: Array<number>): string {
    const TableClass = registry.getTable(this.domainKey);
    const tableName = TableClass.tableName;
    const idString = brackets(objectIds.map((id) => id.toString()).join(","));
    const sql = `DELETE FROM ${tableName} WHERE id IN ${idString};`;
    return sql;
  }

  static async fillUpdateColumns(
    domainObject: Record<string, any>,
    TableClass: typeof Table,
    sqlArr: Array<string>
  ) {
    for (const metadataField of this.metadata.metadataFields) {
      await this.fillUpdateColumn(
        metadataField,
        domainObject,
        TableClass,
        sqlArr
      );
    }
  }

  static async fillUpdateColumn(
    metadataField: AllMetadataFieldTypes,
    domainObject: Record<string, any>,
    TableClass: typeof Table,
    sqlArr: Array<string>
  ) {
    if (
      metadataField.variant === MetaDataObjectType.COLUMN_MAP &&
      metadataField.tableColumnKey === ID_COLUMN_NAME
    ) {
      return;
    }
    switch (metadataField.variant) {
      case MetaDataObjectType.COLUMN_MAP:
      case MetaDataObjectType.MANUAL_COLUMN_MAP: {
        metadataField.processUpdateSql(domainObject, TableClass, sqlArr);
        break;
      }
      case MetaDataObjectType.FOREIGN_KEY_MAP:
      case MetaDataObjectType.SINGLE_TABLE_INHERITANCE_MAP: {
        await metadataField.processUpdateSql(domainObject, TableClass, sqlArr);
        break;
      }
      case MetaDataObjectType.MANUAL_OBJECT_MAP: {
        // not needed
        break;
      }
      default: {
        throw MetaDataErrors.UNEXPECTED_TYPE;
      }
    }
  }

  private static async domainObjectToSql<T extends DomainObject>(
    domainObjects: Array<T>
  ): Promise<string> {
    const domainKey = (domainObjects[0].constructor as typeof DomainObject)
      .domainKey;
    const TableClass = registry.getTable(domainKey);

    const tableName = TableClass.tableName;

    const sqlColumnNamesPartArr: Array<string> = [];
    const sqlValuesPartArr: Array<Array<any>> = new Array(domainObjects.length);
    for (let i = 0; i < domainObjects.length; i++) {
      sqlValuesPartArr[i] = [];
    }

    this.fillInsertColumns(sqlColumnNamesPartArr, TableClass);

    outer: for (const metadataField of this.metadata.metadataFields) {
      // foreach doesn't work well with async logic that I want to run sequentially
      for (let i = 0; i < domainObjects.length; i++) {
        const domainObj = domainObjects[i] as Record<string, any>;
        if (
          metadataField.variant === MetaDataObjectType.COLUMN_MAP &&
          metadataField.tableColumnKey === ID_COLUMN_NAME
        ) {
          continue outer;
        }
        await this.mapToColumn(
          metadataField,
          domainObj,
          sqlValuesPartArr[i],
          TableClass
        );
      }
    }

    if (TableClass.isUsingSingleTableInheritance) {
      sqlColumnNamesPartArr.push(TableClass.getSingleTableInheritanceColumn());
      sqlValuesPartArr.forEach((arr) => arr.push(quote(domainKey, "STI")));
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

  static fillInsertColumns(columnArr: Array<string>, TableClass: typeof Table) {
    for (const metadataField of this.metadata.metadataFields) {
      this.fillInsertColumn(metadataField, columnArr, TableClass);
    }
  }

  static fillInsertColumn(
    metadataField: AllMetadataFieldTypes,
    columnArr: Array<string>,
    TableClass: typeof Table
  ) {
    switch (metadataField.variant) {
      case MetaDataObjectType.COLUMN_MAP: {
        const { tableColumnKey } = metadataField;
        if (tableColumnKey === ID_COLUMN_NAME) {
          return;
        }
        metadataField.processInsertColumns(TableClass, columnArr);
        break;
      }
      case MetaDataObjectType.FOREIGN_KEY_MAP:
      case MetaDataObjectType.MANUAL_COLUMN_MAP:
      case MetaDataObjectType.SINGLE_TABLE_INHERITANCE_MAP: {
        metadataField.processInsertColumns(TableClass, columnArr);
        break;
      }
      case MetaDataObjectType.MANUAL_OBJECT_MAP: {
        // not needed
        break;
      }
      default: {
        throw MetaDataErrors.UNEXPECTED_TYPE;
      }
    }
  }

  static async mapFieldsToColumns(
    domainObj: Record<string, any>,
    valueArr: Array<any>,
    TableClass: typeof Table
  ) {
    for (const field of this.metadata.metadataFields) {
      await this.mapToColumn(field, domainObj, valueArr, TableClass);
    }
  }

  static async mapToColumn(
    metadataField: AllMetadataFieldTypes,
    domainObj: Record<string, any>,
    valueArr: Array<any>,
    TableClass: typeof Table
  ) {
    switch (metadataField.variant) {
      case MetaDataObjectType.COLUMN_MAP: {
        if (metadataField.tableColumnKey === ID_COLUMN_NAME) {
          return;
        }
        metadataField.processInsertSql(domainObj, TableClass, valueArr);
        break;
      }
      case MetaDataObjectType.FOREIGN_KEY_MAP: {
        await metadataField.processInsertSql(domainObj, valueArr);
        break;
      }

      case MetaDataObjectType.MANUAL_COLUMN_MAP: {
        metadataField.processInsertSql(domainObj, TableClass, valueArr);
        break;
      }
      case MetaDataObjectType.SINGLE_TABLE_INHERITANCE_MAP: {
        await metadataField.processInsertSql(domainObj, TableClass, valueArr);
        break;
      }
      case MetaDataObjectType.MANUAL_OBJECT_MAP: {
        // not needed
        break;
      }
      default: {
        throw new Error("unexpected metadata object type");
      }
    }
  }

  /**
   * Converts db rows to domain objects.
   * @param resultSet
   */
  private static resultSetToDomainObjects<T extends DomainObject>(
    resultSet: ResultSet<any>
  ) {
    const domainObjects = resultSet.map((row) => {
      const tableColumnMap: Record<string, Record<string, any>> = {};
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

        Mapper.mapColumnsToFields(tableObj, domainObj);
        const actualDomainObj = new DomainObj(domainObj);
        // log(actualDomainObj, domainKey, this.domainKey);
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

  // Note: domainObj is meant to be mutated.
  static mapColumnsToFields(
    tableObj: Record<string, any>,
    domainObj: Record<string, any>
  ) {
    this.metadata.metadataFields.forEach((metadataField) => {
      this.mapToField(metadataField, tableObj, domainObj);
    });
  }

  // Note: domainObj is meant to be mutated.
  static mapToField(
    metadataField: AllMetadataFieldTypes,
    tableObj: Record<string, any>,
    domainObj: Record<string, any>
  ) {
    switch (metadataField.variant) {
      case MetaDataObjectType.COLUMN_MAP:
      case MetaDataObjectType.FOREIGN_KEY_MAP:
      case MetaDataObjectType.MANUAL_OBJECT_MAP:
      case MetaDataObjectType.SINGLE_TABLE_INHERITANCE_MAP: {
        metadataField.processObject(tableObj, domainObj);
        break;
      }
      case MetaDataObjectType.MANUAL_COLUMN_MAP: {
        // not needed
        break;
      }
      default: {
        throw MetaDataErrors.UNEXPECTED_TYPE;
      }
    }
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
  customInheritanceOptions,
  ...metadataOptions
}: CreateMapperOptions<T>) {
  // Table takes priority
  const TableClass = Table || registry.getTable(domainKey!);
  const Mapper = class extends DataMapper {
    static domainKey = domainKey;
  };

  Mapper.generateMetaData({
    domainKey,
    Table: TableClass,
    ...metadataOptions,
    customInheritanceOptions,
  });

  return Mapper;
}
