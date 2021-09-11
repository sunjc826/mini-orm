import { quote } from "../../helpers";
import { ColumnOptions, varchar } from ".";
import { ColumnType } from "./base";

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

  toSqlString(data: any) {
    return quote(data, "field");
  }
}

export declare namespace Varchar {
  export interface VarcharOptions extends ColumnOptions {
    limit: number;
  }
}
