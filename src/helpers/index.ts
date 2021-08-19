import _ from "lodash";
import { DataMapper } from "../data-mapper";
import { Table } from "../data-mapper/table";
import { Constructor } from "../types";

// various string manipulation helpers

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
/**
 * Returns a sql string in the form of table_name.col_name
 * @param tableName
 * @param dbColName
 * @returns sql string
 */
export function formatDbColumn(tableName: string, dbColName: string) {
  return `${tableName}.${dbColName}`;
}

/**
 * Returns a string in the form of table_name-col_name. Used for naming columns selected from db.
 * @param tableName
 * @param dbColName
 * @returns
 */
export function formatResultSetVariable(tableName: string, dbColName: string) {
  return `${tableName}-${dbColName}`;
}
