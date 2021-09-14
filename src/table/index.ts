import _ from "lodash";

import { ResultSet } from "../connection/postgres";
import {
  brackets,
  formatDbColumn,
  formatResultSetColumnName,
  generateSingleTableInheritanceColumn,
  isArrayEmpty,
} from "../helpers/string";
import { FirstParam } from "../helpers/types";
import { log, write } from "../lib-test/tests/helpers";
import {
  DataTypes,
  AllOptions,
  ColumnTypes,
  COLUMN_TYPE_MAP,
} from "./data-types";
import { Keyable } from "./data-types/mixins/keyable";
import { registry } from "../registry";
import { InformationSchema } from "./types";

export class Table {
  /**
   * The actual db table name, snakecased.
   */
  declare static tableName: string;
  /**
   * A map of the form
   * [tableColumnKey] : {
   *  name (which is the actual snakecased db column name)
   *  ...other properties
   * }
   * Note that [tableColumnKey] can still be camelcased
   */
  declare static columns: Record<string, ColumnTypes>;

  declare static primaryKey: Array<string>;

  // TODO: supports single column references for now
  // can consider implementing composite keys in future
  // Note: We also assume that 2 distinct table can only have 1 reference, this is why
  // the table's domainKey itself is used as a key here
  /**
   * A map of the form
   * [otherDomainKey] : {
   *  ...other properties
   * }
   */
  declare static references: Record<string, Table.Reference>;
  declare static referencedBy: Record<string, Table.ReferencedBy>;

  /**
   * A map of the form
   * [ownTableColumnKey]: [otherDomainKey]
   */
  declare static foreignKeys: Record<string, string>;

  // TODO: This field is unused so far and is unimplemented.
  declare static referencedByKeys: any;

  declare static isUsingSingleTableInheritance: boolean;

  // TODO: Can also implement table constraints in future

  /**
   * Adds a column to the table.
   * @param name Column name key. Will be converted to snakecase when entered into DB.
   * @param type DB type.
   * @param options DB column options.
   */
  static addColumn(
    name: string,
    type: DataTypes,
    options: Partial<AllOptions> = {}
  ): void {
    if (this.columns[name]) {
      throw new Error("column already exists");
    }

    if (
      (type === "int" || type === "uuid") &&
      (options as Keyable.ForeignKeyableConstructorOptions).references
    ) {
      const { domainKey, tableColumnKey } = (
        options as Keyable.ForeignKeyableConstructorOptions
      ).references;
      this.references[domainKey] = {
        ownTableForeignKeys: [name],
        otherTableCandidateKeys: [tableColumnKey],
      };
      this.foreignKeys[name] = domainKey;
    }

    if (
      (type === "int" || type === "serial" || type === "uuid") &&
      (options as Keyable.PrimaryKeyableConstructorOptions).primaryKey
    ) {
      this.setPrimaryKey([name]);
    }

    this.columns[name] = new COLUMN_TYPE_MAP[type](name, options);
  }

  /**
   * Adds multiple columns to the table.
   * @param obj A hash of with keys as db column name and values as column options.
   */
  static addColumns(obj: Record<string, Table.AddColumnsOptions>): void {
    for (const [name, addColumnsOptions] of Object.entries(obj)) {
      this.addColumn(
        name,
        addColumnsOptions.type,
        addColumnsOptions.options || {}
      );
    }
  }

  static setPrimaryKey(primaryKey: Array<string>) {
    if (!isArrayEmpty(this.primaryKey)) {
      throw new Error("multiple primary keys specified");
    }
    primaryKey.forEach((ele) => this.primaryKey.push(ele));
  }

  /**
   * Returns the column type object of the given column key.
   * @param tableColumnKey
   * @returns ColumnType object.
   */
  static getColumnType(tableColumnKey: string) {
    return this.columns[tableColumnKey];
  }

  /**
   * Returns the sql string representation of a column value. Particularly useful for string values.
   * @param tableColumnKey
   * @param value
   * @returns Sql string representation of a column value
   */
  static convertColumnValueToSqlString(tableColumnKey: string, value: any) {
    return this.columns[tableColumnKey].toSqlString(value);
  }

  /**
   * Returns the actual DB column name of a certain column.
   * @param tableColumnKey
   * @returns Actual DB column name.
   */
  static getDbColumnName(tableColumnKey: string): string {
    return this.columns[tableColumnKey].getName();
  }

  /**
   * Returns whether this table has a belongs to relation to another table.
   * @param domainKey Domain key is a string key in the registry that is linked to the associated table.
   * @returns Whether this table has a belongs to relation to another table.
   */
  static belongsTo(domainKey: string): boolean {
    return !!this.references[domainKey];
  }

  static getReference(domainKey: string): Table.Reference {
    return this.references[domainKey];
  }

  /**
   * Returns whether this table has a has one or has many relation with another table.
   * @param domainKey Domain key is a string key in the registry that is linked to the associated table.
   * @returns Whether this table has a has one or has many relation with another table.
   */
  static hasOneOrMany(domainKey: string): boolean {
    return !!this.referencedBy[domainKey];
  }

  static isForeignKey(tableColumnKey: string) {
    return tableColumnKey in this.foreignKeys;
  }

  // TODO: this only works for a single column acting as a foreign key column
  // table inheritance would not work
  /**
   * Returns the domainKey of the table that the foreignKey points to.
   * Returns null if tableColumn is not a foreign key.
   * @param tableColumnKey
   * @returns Domain key.
   */
  static foreignKeyDomain(tableColumnKey: string) {
    return this.foreignKeys[tableColumnKey] || null;
  }

  static enableSingleTableInheritance() {
    this.isUsingSingleTableInheritance = true;
    this.addColumns({
      [generateSingleTableInheritanceColumn(this.tableName)]: {
        type: "text",
        options: {
          nullable: false,
        },
      },
    });
  }

  static getSingleTableInheritanceColumn() {
    return this.getDbColumnName(
      generateSingleTableInheritanceColumn(this.tableName)
    );
  }

  static toSqlCreate(): string {
    const innerSqlArr = [];
    for (const [_columnKey, column] of Object.entries(this.columns)) {
      innerSqlArr.push(column.toSqlCreate());
    }

    innerSqlArr.push(`PRIMARY KEY ${brackets(this.primaryKey.join(","))}`);

    for (const [
      domainKey,
      { ownTableForeignKeys, otherTableCandidateKeys },
    ] of Object.entries(this.references)) {
      const OtherTable = registry.getTable(domainKey);
      const otherTableName = OtherTable.tableName;
      innerSqlArr.push(
        `FOREIGN KEY ${brackets(
          ownTableForeignKeys.map((key) => this.getDbColumnName(key)).join(",")
        )} REFERENCES ${otherTableName}${brackets(
          otherTableCandidateKeys
            .map((key) => OtherTable.getDbColumnName(key))
            .join(",")
        )}`
      );
    }

    const innerSql = innerSqlArr.join(",");

    const sql = `CREATE TABLE IF NOT EXISTS ${this.tableName} (${innerSql});`;

    return sql;
  }

  /**
   * Alters db table to fit in-memory representation of table.
   * @param currentDbColumns
   */
  static toSqlAlterDynamically(
    currentDbColumns: ResultSet<InformationSchema.Columns>
  ) {
    // Basic algorithm only checks for column names. Does not ensure column type or option integrity.
    const dbColumnNames = new Set(
      currentDbColumns.map((ele) => ele.column_name)
    );
    const inMemoryColumnNames = new Set(
      Object.values(this.columns).map((ele) => ele.getName())
    );
    let alterSql = "";
    for (const [_columnKey, column] of Object.entries(this.columns)) {
      const dbColumnName = column.getName();
      if (dbColumnNames.has(dbColumnName)) {
        continue;
      }

      alterSql += `ALTER TABLE ${
        this.tableName
      } ADD COLUMN ${column.toSqlCreate()};`;
    }

    for (const { column_name } of currentDbColumns) {
      if (inMemoryColumnNames.has(column_name)) {
        continue;
      }
      alterSql += `ALTER TABLE ${this.tableName} DROP COLUMN ${column_name};`;
    }
    return alterSql;
  }

  static toSqlTruncate(): string {
    return `TRUNCATE TABLE ${this.tableName} RESTART IDENTITY CASCADE;`;
  }

  /**
   * Returns a sql string representing the select portion of the columns queried.
   * Defaults to all columns of the table. Does not include the SELECT keyword.
   * @param columnNames
   */
  static toSqlSelect(columnNames?: Array<string>): string {
    const sqlArr = [];
    columnNames ||= Object.keys(this.columns);

    for (const column of columnNames) {
      const dbTableName = this.tableName;
      const dbColName = this.getDbColumnName(column);
      sqlArr.push(
        `${formatDbColumn(dbTableName, dbColName)} AS ${this.getTableColumnKey(
          dbTableName,
          dbColName
        )}`
      );
    }
    const sql = sqlArr.join(", ");
    return sql;
  }

  private static getTableColumnKey(
    dbTableName: string,
    dbColName: string
  ): string {
    return formatResultSetColumnName(dbTableName, dbColName);
  }
}

declare namespace Table {
  export interface AddColumnsOptions {
    type: DataTypes;
    options?: Partial<AllOptions>;
  }

  // TODO: this interface can be used for composite keys, which aren't implemented for now
  // i.e. for now, treat the arrays as length 1
  /**
   * Represents a belongs to relation. OwnTable belongs to OtherTable.
   */
  export interface Reference {
    ownTableForeignKeys: Array<string>;
    otherTableCandidateKeys: Array<string>;
  }

  /**
   * Represents a has one/many relation. OwnTable has one/many OtherTable.
   */
  export interface ReferencedBy {
    otherTableForeignKeys: Array<string>;
    ownTableCandidateKeys: Array<string>;
  }
}

interface CreateTableOptions {
  tableName: string;
  columns: FirstParam<typeof Table["addColumns"]>;
  singleTableInheritance?: boolean;
}

export function createTable({
  tableName: dbTableName,
  columns,
  singleTableInheritance = false,
}: CreateTableOptions) {
  const NewTable = class extends Table {
    static tableName = _.snakeCase(dbTableName);
    static columns = {};
    static primaryKey = [];
    static references = {};
    static referencedBy = {};
    static foreignKeys = {};
    static referencedByKeys = {};
    static isUsingSingleTableInheritance = false;
  };
  NewTable.addColumns(columns);
  if (singleTableInheritance) {
    NewTable.enableSingleTableInheritance();
  }
  return NewTable;
}
