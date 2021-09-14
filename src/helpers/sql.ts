import { quote } from "./string";

export function toSqlIsTableExists(
  tableName: string,
  schema: string = "public"
): string {
  return `SELECT EXISTS (
    SELECT 1
    FROM   information_schema.tables 
    WHERE  table_schema = ${quote(schema, "schema")}
    AND    table_name = ${quote(tableName, "table")}
    ) AS table_exists;`;
}

export function toSqlGetTableColumns(
  tableName: string,
  schema: string = "public"
): string {
  return `SELECT *
  FROM information_schema.columns
  WHERE table_schema = ${quote(schema, "schema")}
  AND table_name = ${quote(tableName, "table")};`;
}
