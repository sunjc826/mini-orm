import _ from "lodash";
import { DataMapper } from "../data-mapper";
import { Table } from "../data-mapper/table";
import { registry } from "../registry";
import { Constructor } from "./types";

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

// separates table name and column name
// this is ultimately a heuristical approach since this is a valid column name
const SEPARATOR = "_____";

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
  return `${tableName}${SEPARATOR}${dbColName}`;
}

export function splitResultSetColumnName(rowString: string) {
  const [tableName, dbColName] = rowString.split(SEPARATOR);
  return { tableName, dbColName };
}

export function extractDomainKeyFromTable(tableName: string) {
  return registry.getDomainKeyFromTableName(tableName);
}

/**
 * Returns column key from the given db column name.
 * @param tableName Snakecased column name.
 * @returns Column key string.
 */
export function dbColumnNameToColumnKey(dbColName: string) {
  return _.camelCase(dbColName);
}

export function deepCopy(object: string) {
  return JSON.parse(JSON.stringify(object));
}

export function quote(str: string, comment: string = "") {
  return `$${comment}$${str}$${comment}$`;
}

export function brackets(str: string) {
  return `(${str})`;
}
