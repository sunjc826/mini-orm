import { numeric } from ".";
import { ColumnType } from "./base";

export class Numeric extends ColumnType {
  type = numeric;

  getTypedValue(stringValue: string): number {
    return Number.parseFloat(stringValue);
  }
}
