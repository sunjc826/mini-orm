import _ from "lodash";
import { DataTypes, ColumnOptions } from "./index";

export abstract class ColumnType {
  abstract type: DataTypes;
  /**
   * The actual db column name, snakecased.
   */
  name: string;

  /**
   * Whether column is nullable.
   */
  nullable: boolean;

  /**
   * Whether column value is unique to table.
   */
  unique: boolean;

  /**
   * Default value of column.
   */
  defaultValue?: string;

  constructor(name: string, options: Partial<ColumnOptions> = {}) {
    this.name = _.snakeCase(name);
    const { nullable = true, unique = false, defaultValue } = options;
    this.nullable = nullable;
    this.unique = unique;
    this.defaultValue = defaultValue
      ? this.toSqlString(defaultValue)
      : undefined;
  }

  /**
   * Returns db column name.
   * @returns Sql string of column name.
   */
  getName(): string {
    return this.name;
  }

  /**
   * Returns sql of data type.
   * @returns Sql string of column type.
   */
  getType(): string {
    return this.type;
  }

  /**
   * Returns sql of default value.
   * @returns Sql string of default value.
   */
  getDefault(): string {
    return this.defaultValue ? `DEFAULT ${this.defaultValue}` : "";
  }

  /**
   * Returns sql of generic column constraints (other than primary key, foreign key).
   * @returns Sql string of generic column constraints.
   */
  getOptions(): string {
    return `${this.nullable ? "" : "NOT NULL"} ${this.unique ? "UNIQUE" : ""}`;
  }

  /**
   * Returns full sql of column. e.g. for create table or alter table
   * @returns Sql string of column, including name, type, constraints.
   */
  toSqlCreate() {
    return `${this.getName()} ${this.getType().toUpperCase()} ${this.getDefault()} ${this.getOptions()}`;
  }

  toSqlString(data: any) {
    return data.toString();
  }
}
