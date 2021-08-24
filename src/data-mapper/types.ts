import _ from "lodash";
import { Constructor } from "../helpers/types";

export const ID_COLUMN_NAME = "id" as const;

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
    return `${this.nullable ? "" : "NOT NULL"} ${this.unique ? "UNIQUE" : ""}`;
  }

  /**
   * Returns full sql of column. e.g. for create table or alter table
   * @returns Sql string of column, including name, type, constraints.
   */
  toSqlCreate() {
    return `${this.getName()} ${this.getType().toUpperCase()} ${this.getOptions()}`;
  }
}

export declare namespace Varchar {
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

export declare namespace Int {
  export interface IntOptions extends ColumnOptions {
    variant: IntSize;
    primaryKey: boolean;
    references: References;
  }
  export interface References {
    domainKey: string;
    tableColumnKey: string;
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
        return "BIGINT";
      }
      case "regular": {
        return "INT";
      }
      case "small": {
        return "SMALLINT";
      }
    }
  }

  getDomainKey(): string | null {
    if (!this.foreignKey) {
      return null;
    }
    return this.references!.domainKey;
  }
}

export declare namespace Serial {
  export interface SerialOptions extends Int.IntOptions {
    autoGenerateExlusively: boolean;
  }
}

export class Serial extends Int {
  type = int;
  variant: IntSize = "regular";
  // TODO: add an option for this field
  autoGenerateExclusively: boolean = true;

  constructor(name: string, options: Partial<Serial.SerialOptions>) {
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
export type AllOptions =
  | Varchar.VarcharOptions
  | Int.IntOptions
  | Serial.SerialOptions;

export const COLUMN_TYPE_MAP: Record<DataTypes, Constructor<ColumnTypes>> = {
  varchar: Varchar,
  text: Text,
  int: Int,
  serial: Serial,
  numeric: Numeric,
  bool: Bool,
} as const;
