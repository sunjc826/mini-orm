import { int } from ".";
import { ColumnType } from "./base";
import { PrimaryKeyMixin, ForeignKeyMixin, Keyable } from "./mixins/keyable";

export class Int extends PrimaryKeyMixin(ForeignKeyMixin(ColumnType)) {
  type = int;
  variant: Int.IntSize;

  constructor(name: string, options: Partial<Int.IntOptions>) {
    super(name, options);
    this.variant = options.variant ?? "regular";
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
}

export declare namespace Int {
  export type IntSize = "big" | "regular" | "small";

  export interface IntOptions
    extends Keyable.PrimaryKeyableConstructorOptions,
      Keyable.ForeignKeyableConstructorOptions {
    variant: IntSize;
  }
}
