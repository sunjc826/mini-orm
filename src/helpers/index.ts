import _ from "lodash";
import { DataMapper, Table } from "../data-mapper";
import { Constructor } from "../types";

// functions that can be used for reflection

export function titleCase(base: string) {
  return _.startCase(base).replace(" ", "");
}

export function getTableClassName(base: string) {
  return titleCase(base) + "Table";
}

export function getMapperClassName(base: string) {
  return titleCase(base) + "Mapper";
}

// this may not work if the class names are minified
export function getBaseNameSpace(Klass: Constructor<Table | DataMapper>) {
  return _.camelCase(Klass.name.replace(new RegExp("(Table|Mapper)"), ""));
}
