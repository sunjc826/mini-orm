import { bool } from ".";
import { ColumnType } from "./base";

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
