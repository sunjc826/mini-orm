import _ from "lodash";
import { DbClient } from "../connect";
import {
  AllOptions,
  ColumnType,
  ColumnTypes,
  COLUMN_TYPE_MAP,
  Constructor,
  DataTypes,
} from "../types";

interface ConstructorParams {
  TableClass: Constructor<Table>;
  metadata?: Array<MetaDataObject>;
}

export abstract class DataMapper {
  // TODO: config
  dbClient = new DbClient({});
  metadata: MetaData;

  constructor({ TableClass: tableClass, metadata }: ConstructorParams) {
    // strategy: use tableClass to generate default metadata, merge with given metadata
    if (!metadata) {
      this.metadata = MetaData.generateDefaultMetaData(tableClass);
    }
  }

  findObjectsWhere(query: string) {
    const resultSet = this.dbClient.query(query);
  }

  // static generateDefaultDomainObject(TableClass: Constructor<Table>) {
  //   const table = new TableClass();
  //   const DefaultDomainObj = class {
  //     [fieldName: string]: any;
  //   };
  //   for (const columnName of Object.keys(table)) {
  //     DefaultDomainObj[_.camelCase(columnName)];
  //   }
  // }
}

type MetaDataObject =
  | string
  | {
      variant: "column";
      tableColumnName: string;
      domainFieldName: string;
    };

class MetaData {
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
}

class MetaDataField {}

// the most basic column mapping, 1:1
class ColumnMap extends MetaDataField {
  tableColumnName: string;
  domainFieldName: string;

  constructor(tableColumnName: string, domainFieldName: string) {
    super();
    this.tableColumnName = tableColumnName;
    this.domainFieldName = domainFieldName;
  }

  static usingDomainField(domainFieldName: string) {
    const tableColumnName = _.snakeCase(domainFieldName);
    return new ColumnMap(tableColumnName, domainFieldName);
  }

  static usingColumn(tableColumnName: string) {
    const domainFieldName = _.camelCase(tableColumnName);
    return new ColumnMap(tableColumnName, domainFieldName);
  }
}

namespace Table {
  export interface AddColumnsOptions {
    type: DataTypes;
    options: Partial<AllOptions>;
  }
}

// methods should probably be converted to static ones
export abstract class Table {
  tableName: string;
  columns: Record<string, ColumnTypes> = {};

  /**
   * Adds a column to the table.
   * @param name Column name key. Will be converted to snakecase when entered into DB.
   * @param type DB type.
   * @param options DB column options.
   */
  addColumn(name: string, type: DataTypes, options: Partial<AllOptions>): void {
    if (this.columns[name]) {
      throw new Error("column already exists");
    }
    this.columns[name] = new COLUMN_TYPE_MAP[type](name, options);
  }

  /**
   * Adds multiple columns to the table.
   * @param obj A hash of with keys as db column name and values as column options.
   */
  addColumns(obj: Record<string, Table.AddColumnsOptions>): void {
    for (const [name, addColumnsOptions] of Object.entries(obj)) {
      this.addColumn(name, addColumnsOptions.type, addColumnsOptions.options);
    }
  }

  /**
   * Returns the actual DB column name of a certain column.
   * @param name
   * @returns Actual DB column name.
   */
  getDbColumnName(name: string): string {
    return this.columns[name].getName();
  }

  /**
   * Returns a sql string representing the select portion of the columns queried.
   * Defaults to all columns of the table. Does not include the SELECT keyword.
   * @param columnNames
   */
  getSelectColumnsString(...columnNames: Array<string>) {
    let sql = "";
    for (const column of columnNames) {
      const dbTableName = this.tableName;
      const dbColName = this.getDbColumnName(column);
      sql += `${dbTableName}.${dbColName} AS ${this.getTableColumnName(
        dbTableName,
        dbColName
      )}`;
    }
    return sql;
  }

  private getTableColumnName(dbTableName: string, dbColName: string) {
    return `${dbTableName}_${dbColName}`;
  }
}
