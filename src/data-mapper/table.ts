import { table } from "console";
import _ from "lodash";
import { formatDbColumn, formatResultSetColumnName } from "../helpers";
import {
  DataTypes,
  AllOptions,
  ColumnTypes,
  COLUMN_TYPE_MAP,
  Int,
} from "../types";

namespace Table {
  export interface AddColumnsOptions {
    type: DataTypes;
    options: Partial<AllOptions>;
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

// TODO: methods should probably be converted to static ones
export abstract class Table {
  /**
   * The actual db table name, snakecased.
   */
  tableName: string;
  /**
   * A map of the form
   * [tableColumnKey] : {
   *  name (which is the actual snakecased db column name)
   *  ...other properties
   * }
   * Note that [tableColumnKey] can still be camelcased
   */
  columns: Record<string, ColumnTypes> = {};
  // TODO: supports single column references for now
  // can consider implementing composite keys in future
  // Note: We also assume that 2 distinct table can only have 1 reference, this is why
  // the table name itself is used as a key here
  /**
   * A map of the form
   * [otherTableName] : {
   *  ...other properties
   * }
   */
  references: Record<string, Table.Reference> = {};
  referencedBy: Record<string, Table.ReferencedBy> = {};

  foreignKeys: Record<string, string> = {};

  // TODO: Can also implement table constraints in future

  constructor(tableName: string) {
    this.tableName = _.snakeCase(tableName);
  }

  // TODO
  static topoSort() {}

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
    if (
      (type === "int" || type === "serial") &&
      (options as Int.IntOptions).references
    ) {
      const { tableName, tableColumnKey } = (options as Int.IntOptions)
        .references;
      this.references[tableName] = {
        ownTableForeignKeys: [name],
        otherTableCandidateKeys: [tableColumnKey],
      };
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
   * @param tableColumnKey
   * @returns Actual DB column name.
   */
  getDbColumnName(tableColumnKey: string): string {
    return this.columns[tableColumnKey].getName();
  }

  /**
   * Returns whether this table has a belongs to relation to another table.
   * @param domainKey Domain key is a string key in the registry that is linked to the associated table.
   * @returns Whether this table has a belongs to relation to another table.
   */
  belongsTo(domainKey: string): boolean {
    return !!this.references[domainKey];
  }

  getReference(domainKey: string): Table.Reference {
    return this.references[domainKey];
  }

  /**
   * Returns whether this table has a has one or has many relation with another table.
   * @param domainKey Domain key is a string key in the registry that is linked to the associated table.
   * @returns Whether this table has a has one or has many relation with another table.
   */
  hasOneOrMany(domainKey: string): boolean {
    return !!this.referencedBy[domainKey];
  }

  isForeignKey(tableColumnKey: string) {
    return tableColumnKey in this.foreignKeys;
  }

  // TODO: this only works for a single column acting as a foriegn key column
  // table inheritance would not work
  /**
   * Returns the table key that the foreignKey points to. Returns null if tableColumn is not a foreign key.
   * @param tableColumnKey
   * @returns
   */
  foreignKeyDomain(tableColumnKey: string) {
    return this.foreignKeys[tableColumnKey] || null;
  }

  /**
   * Returns a sql string representing the select portion of the columns queried.
   * Defaults to all columns of the table. Does not include the SELECT keyword.
   * @param columnNames
   */
  toSqlSelect(...columnNames: Array<string>): string {
    const sqlArr = [];
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

    // join is actually slower than concat, but it's more convenient here
    const sql = sqlArr.join(", ");
    return sql;
  }

  private getTableColumnKey(dbTableName: string, dbColName: string): string {
    return formatResultSetColumnName(dbTableName, dbColName);
  }
}
