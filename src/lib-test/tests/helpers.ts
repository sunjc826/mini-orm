import path from "path";
import { appendFileSync, readdirSync, unlinkSync } from "fs";
import { quote } from "../../helpers";
const logFileDir = path.resolve(__dirname, "../", "logs/");
const logFilePath = path.resolve(logFileDir, "log");

export function sqlIsTableExists(
  tableName: string,
  schema: string = "public"
): string {
  return `SELECT EXISTS (
    SELECT 1
    FROM   information_schema.tables 
    WHERE  table_schema = ${quote(schema)}
    AND    table_name = ${quote(tableName)}
    ) AS table_exists;`;
}

// TODO: add namespacing functionality
export function write(writeData: any, fileType: string = "txt") {
  let data = writeData;
  if (fileType === "txt" || fileType === "json") {
    data = JSON.stringify(writeData) + "\n";
  }
  return appendFileSync(`${logFilePath}.${fileType}`, data);
}

// https://stackoverflow.com/questions/14917757/delete-unlink-files-matching-a-regex/41571712
export function clear() {
  let regex = /^log.*/;
  readdirSync(logFileDir)
    .filter((f) => regex.test(f))
    .forEach((f) => unlinkSync(path.resolve(logFileDir, f)));
}
