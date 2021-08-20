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
export function formatResultSetColumnName(
  tableName: string,
  dbColName: string
) {
  return `${tableName}-${dbColName}`;
}

export function splitResultSetColumnName(rowString: string) {
  const [tableName, dbColName] = rowString.split("-");
  return { tableName, dbColName };
}

/**
 * Returns domain key from the given db table name.
 * @param tableName Snakecased table name.
 * @returns Domain key string.
 */
export function extractDomainKeyFromTable(tableName: string) {
  return _.camelCase(tableName);
}

export function dbColumnNameToColumnKey(dbColName: string) {
  return _.camelCase(dbColName);
}
