export type Constructor<T> = new (...args: any) => T;

type IntSize = "big" | "regular" | "small";

interface ColumnOptions {
  nullable: boolean;
  unique: boolean;
}

abstract class ColumnType {
  abstract type: string;
  nullable: boolean;
  unique: boolean;
  constructor(options: Partial<ColumnOptions> = {}) {
    const { nullable = true, unique = false } = options;
    this.nullable = nullable;
    this.unique = unique;
  }

  getType(): string {
    return this.type;
  }

  getOptions(): string {
    return `${this.nullable ? "" : "nullable"} ${this.unique ? "unique" : ""}`;
  }
}

export class Varchar extends ColumnType {
  type = "varchar";
  limit: number;

  constructor(limit: number, options: Partial<ColumnOptions>) {
    super(options);
    this.limit = limit;
  }

  getType() {
    return `${this.type}(${this.limit})`;
  }
}

export class Text extends ColumnType {
  type = "text";
}

export class Int extends ColumnType {
  type = "integer";
  variant: IntSize = "regular";

  constructor(variant: IntSize, options: Partial<ColumnOptions>) {
    super(options);
    this.variant = variant;
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
  type = "serial";
  variant: IntSize = "regular";
  autoGenerateExclusively: boolean = true;

  constructor(variant: IntSize, options: Partial<ColumnOptions>) {
    super(variant, options);
  }

  getType() {
    return `${super.getType()} generated ${
      this.autoGenerateExclusively ? "always" : "by default"
    } as identity`;
  }
}

export class Numeric extends ColumnType {
  type = "numeric";
}

export class Boolean extends ColumnType {
  type = "bool";
}
