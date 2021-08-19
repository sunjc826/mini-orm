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
const id = "id" as const;
type id = typeof id;
const numeric = "numeric" as const;
type numeric = typeof numeric;
const bool = "bool" as const;
type bool = typeof bool;
export type DataTypes = varchar | text | int | id | numeric | bool;
export abstract class ColumnType {
  abstract type: DataTypes;
  name: string; // this may not be needed
  nullable: boolean;
  unique: boolean;
  constructor(name: string, options: Partial<ColumnOptions> = {}) {
    this.name = _.snakeCase(name);
    const { nullable = true, unique = false } = options;
    this.nullable = nullable;
    this.unique = unique;
  }

  getName(): string {
    return this.name;
  }

  getType(): string {
    return this.type;
  }

  getOptions(): string {
    return `${this.nullable ? "" : "nullable"} ${this.unique ? "unique" : ""}`;
  }

  getStringRep() {
    return `${this.getName()} ${this.getType().toUpperCase()} ${this.getOptions()}`;
  }
}

interface VarcharOptions extends ColumnOptions {
  limit: number;
}

export class Varchar extends ColumnType {
  type = varchar;
  limit: number = 256;

  constructor(name: string, options: Partial<VarcharOptions>) {
    super(name, options);
    if (options.limit) {
      this.limit = options.limit;
    }
  }

  getType() {
    return `${this.type}(${this.limit})`;
  }
}

export class Text extends ColumnType {
  type = text;
}

interface IntOptions extends ColumnOptions {
  variant: IntSize;
}
export class Int extends ColumnType {
  type = int;
  variant: IntSize = "regular";

  constructor(name: string, options: Partial<IntOptions>) {
    super(name, options);
    if (options.variant) {
      this.variant = options.variant;
    }
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

export class ID extends Int {
  type = int;
  variant: IntSize = "regular";
  autoGenerateExclusively: boolean = true;

  constructor(name: string, options: Partial<IntOptions>) {
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
}

export class Bool extends ColumnType {
  type = bool;
}

export type ColumnTypes = Varchar | Text | Int | ID | Numeric | Bool;
export type AllOptions = VarcharOptions | IntOptions;

export const COLUMN_TYPE_MAP: Record<DataTypes, Constructor<ColumnTypes>> = {
  varchar: Varchar,
  text: Text,
  int: Int,
  id: ID,
  numeric: Numeric,
  bool: Bool,
} as const;
