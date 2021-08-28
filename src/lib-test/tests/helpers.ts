import path from "path";
import util from "util";
import { appendFileSync, readdirSync, unlinkSync } from "fs";
import { quote } from "../../helpers";
const packageLogFileDir = path.resolve(__dirname, "../", "logs/");
const packageLogFilePath = path.resolve(packageLogFileDir, "log");
const rootLogFileDir = path.resolve(".", "logs/");
const rootLogFilePath = path.resolve(rootLogFileDir, "log");
export function sqlIsTableExists(
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

/**
 * Write some data to a file. If writeRoot is true, the file will be placed at [project_root]/logs/log.[fileType],
 * assuming the terminal running at project root,
 * otherwise it will be placed at ../logs/log.[extension]
 * @param writeData
 * @param fileType
 * @param writeRoot True for users of the package, false for developing the package.
 * @returns
 */
export function write(
  writeData: any,
  fileType: string = "txt",
  writeRoot: boolean = false
) {
  let data = writeData;
  if (fileType === "txt" || fileType === "json") {
    data = JSON.stringify(writeData) + "\n";
  }
  const path = writeRoot ? rootLogFilePath : packageLogFilePath;
  return appendFileSync(`${path}.${fileType}`, data);
}

export function log(...data: any) {
  console.log(util.inspect(data, { showHidden: false, depth: null }));
}

// https://stackoverflow.com/questions/14917757/delete-unlink-files-matching-a-regex/41571712
export function clear(writeRoot: boolean = false) {
  const p = writeRoot ? rootLogFileDir : packageLogFileDir;
  let regex = /^log.*/;
  readdirSync(p)
    .filter((f) => regex.test(f))
    .forEach((f) => unlinkSync(path.resolve(p, f)));
}
