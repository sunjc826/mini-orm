import _ from "lodash";
import { formatDbColumn, formatResultSetVariable } from "../helpers";
import { DataTypes, AllOptions, ColumnTypes, COLUMN_TYPE_MAP } from "../types";

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

  constructor(tableName: string) {
    this.tableName = _.snakeCase(tableName);
  }

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
    return formatResultSetVariable(dbTableName, dbColName);
  }
}
