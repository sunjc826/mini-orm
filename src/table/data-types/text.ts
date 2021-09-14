import { quote } from "../../helpers/string";
import { text } from ".";
import { ColumnType } from "./base";

export class Text extends ColumnType {
  type = text;
  toSqlString(data: string) {
    return quote(data, "field");
  }
}
