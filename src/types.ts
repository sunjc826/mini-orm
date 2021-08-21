import _ from "lodash";

export type Constructor<T> = new (...args: any) => T;

type IntSize = "big" | "regular" | "small";

interface ColumnOptions {
  nullable: boolean;
  unique: boolean;
}

// due to my lack of experience in type reflection, I will stick to regular javascript objects instead

const varchar = "varchar" as const;
type varchar = typeof varchar;
const text = "text" as const;
type text = typeof text;
const int = "int" as const;
type int = typeof int;
const serial = "serial" as const;
type serial = typeof serial;
const numeric = "numeric" as const;
type numeric = typeof numeric;
const bool = "bool" as const;
type bool = typeof bool;
export type DataTypes = varchar | text | int | serial | numeric | bool;
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
  constructor(name: string, options: Partial<ColumnOptions> = {}) {
    this.name = _.snakeCase(name);
    const { nullable = true, unique = false } = options;
    this.nullable = nullable;
    this.unique = unique;
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
   * Returns sql of generic column constraints (other than primary key, foreign key).
   * @returns Sql string of generic column constraints.
   */
  getOptions(): string {
    return `${this.nullable ? "" : "nullable"} ${this.unique ? "unique" : ""}`;
  }

  /**
   * Returns full sql of column. e.g. for create table or alter table
   * @returns Sql string of column, including name, type, constraints.
   */
  getStringRep() {
    return `${this.getName()} ${this.getType().toUpperCase()} ${this.getOptions()}`;
  }
}

export namespace Varchar {
  export interface VarcharOptions extends ColumnOptions {
    limit: number;
  }
}

export class Varchar extends ColumnType {
  type = varchar;
  limit: number = 256;

  constructor(name: string, options: Partial<Varchar.VarcharOptions>) {
    super(name, options);
    if (options.limit) {
      this.limit = options.limit;
    }
  }

  getTypedValue(stringValue: string): string {
    return stringValue;
  }

  getType() {
    return `${this.type}(${this.limit})`;
  }
}

export class Text extends ColumnType {
  type = text;
}

export namespace Int {
  export interface References {
    tableName: string;
    tableColumnKey: string; // actually a key
  }
  export interface IntOptions extends ColumnOptions {
    variant: IntSize;
    primaryKey: boolean;
    references: References;
  }
}

export class Int extends ColumnType {
  type = int;
  variant: IntSize;
  primaryKey: boolean;
  foreignKey: boolean;
  references?: Int.References;

  constructor(name: string, options: Partial<Int.IntOptions>) {
    super(name, options);
    this.variant = options.variant ?? "regular";
    this.primaryKey = options.primaryKey ?? false;
    if (options.references) {
      this.foreignKey = true;
      this.references = options.references;
    } else {
      this.foreignKey = false;
    }
  }

  getTypedValue(stringValue: string): number {
    return Number.parseInt(stringValue);
  }

  getType(): string {
    switch (this.variant) {
      case "big": {
        return "bigint";
      }
      case "regular": {
        return "int";
      }
      case "small": {
        return "smallint";
      }
    }
  }
}

export class Serial extends Int {
  type = int;
  variant: IntSize = "regular";
  autoGenerateExclusively: boolean = true;

  constructor(name: string, options: Partial<Int.IntOptions>) {
    super(name, options);
  }

  getType() {
    return `${super.getType()} GENERATED ${
      this.autoGenerateExclusively ? "ALWAYS" : "BY DEFAULT"
    } AS IDENTITY`;
  }
}

export class Numeric extends ColumnType {
  type = numeric;

  getTypedValue(stringValue: string): number {
    return Number.parseFloat(stringValue);
  }
}

export class Bool extends ColumnType {
  type = bool;

  getTypedValue(stringValue: string): boolean {
    if (stringValue === "true") {
      return true;
    } else {
      return false;
    }
  }
}

export type ColumnTypes = Varchar | Text | Int | Serial | Numeric | Bool;
export type AllOptions = Varchar.VarcharOptions | Int.IntOptions;

export const COLUMN_TYPE_MAP: Record<DataTypes, Constructor<ColumnTypes>> = {
  varchar: Varchar,
  text: Text,
  int: Int,
  serial: Serial,
  numeric: Numeric,
  bool: Bool,
} as const;
