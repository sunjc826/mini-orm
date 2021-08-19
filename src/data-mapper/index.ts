import _ from "lodash";
import { DbClient } from "../connect";
import { DomainObject } from "../domain";
import { splitResultSetColumnName } from "../helpers";
import { Constructor } from "../types";
import { Table } from "./table";

namespace DataMapper {
  export interface ConstructorParams {
    TableClass: Constructor<Table>;
    metadata?: Array<MetaDataObject>;
  }
}

export abstract class DataMapper {
  // TODO: config
  dbClient = new DbClient({});
  metadata: MetaData;

  constructor({
    TableClass: tableClass,
    metadata,
  }: DataMapper.ConstructorParams) {
    // strategy: use tableClass to generate default metadata, merge with given metadata
    if (!metadata) {
      this.metadata = MetaData.generateDefaultMetaData(tableClass);
    }
  }

  /**
   * Returns a result set when given a sql query.
   * @param sql Sql query string.
   */
  async select(sql: string) {
    const resultSet = await this.dbClient.query(sql);
    resultSet.forEach((rowObject) => {
      for (const [column, value] of Object.entries(rowObject)) {
        /**
         * A map of the form
         * [tableName] {
         *  [dbColName]: [value]
         * }
         */
        const tableColumnMap: Record<string, any> = {};
        const { tableName, dbColName } = splitResultSetColumnName(column);
        tableColumnMap[tableName] ||= {};
        tableColumnMap[tableName][dbColName] = value;
      }
    });
    // TODO: map these rows to objects
  }

  dbToDomainObject(row: Array<any>) {
    return;
  }
}

type MetaDataObject =
  | string
  | {
      variant: "column";
      tableColumnName: string;
      domainFieldName: string;
    };

export class MetaData {
  static ID_COLUMN_NAME = "id";

  metadataFields: Array<MetaDataField> = [];

  // active-record like, maps columns by camelCasing
  static generateDefaultMetaData(TableClass: Constructor<Table>): MetaData {
    const metadata = new MetaData();
    const table = new TableClass();
    for (const columnName of Object.keys(table)) {
      metadata.metadataFields.push(ColumnMap.usingColumn(columnName));
    }
    metadata.metadataFields.push(
      ColumnMap.usingColumn(MetaData.ID_COLUMN_NAME)
    );
    return metadata;
  }

  findByDomain(domainObjectField: string): MetaDataField | null {
    return (
      this.metadataFields.find((field) =>
        field.matchByDomain(domainObjectField)
      ) || null
    );
  }

  findByTable(tableColumnName: string): MetaDataField | null {
    return (
      this.metadataFields.find((field) =>
        field.matchByTable(tableColumnName)
      ) || null
    );
  }
}

abstract class MetaDataField {
  /**
   * Returns whether this metadatafield corresponds to the given field.
   * @param domainObjectField Name of a field on the domain object.
   */
  abstract matchByDomain(domainObjectField: string): boolean;
  abstract matchByTable(tableColumnKey: string): boolean;
}

/**
 * Encapsulates the most basic column mapping, 1 db table column : 1 domain object field
 */
export class ColumnMap extends MetaDataField {
  tableColumnKey: string;
  domainFieldName: string;

  constructor(tableColumnKey: string, domainFieldName: string) {
    super();
    this.tableColumnKey = tableColumnKey;
    this.domainFieldName = domainFieldName;
  }

  /**
   * Returns a ColumnMap with default tableColumnKey inferred using given domainFieldName.
   * @param domainFieldName Name of field on domain object.
   * @returns ColumnMap.
   */
  static usingDomainField(domainFieldName: string) {
    // there is no need to snakecase here since tableColumnKey isn't the actual db column name.
    // const tableColumnName = _.snakeCase(domainFieldName);
    return new ColumnMap(domainFieldName, domainFieldName);
  }

  /**
   * Returns a ColumnMap with default domainFieldName inferred using given tableColumnKey.
   * @param tableColumnKey Key to table column.
   * @returns ColumnMap.
   */
  static usingColumn(tableColumnKey: string) {
    return new ColumnMap(tableColumnKey, tableColumnKey);
  }

  matchByDomain(domainObjectField: string): boolean {
    return this.domainFieldName == domainObjectField;
  }

  matchByTable(tableColumnKey: string): boolean {
    return this.tableColumnKey === tableColumnKey;
  }
}
