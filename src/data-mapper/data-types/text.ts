import { quote } from "../../helpers";
import { text } from ".";
import { ColumnType } from "./base";

export class Text extends ColumnType {
  type = text;
  toSqlString(data: any) {
    return quote(data, "field");
  }
}
