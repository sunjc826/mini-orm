import fs from "fs";
import path from "path";
import { ClientConfig } from "pg";
import { DbPool } from "./connect";
const { resolve } = path;
const { readFile } = fs.promises;
const PROJECT_ROOT = ".";
const CONFIG_FILENAME = "dbconfig.json";
const pathToConfig = resolve(PROJECT_ROOT, CONFIG_FILENAME);

export async function getPool() {
  const configFile = await readFile(pathToConfig, "utf-8");
  const dbConfig: ClientConfig = JSON.parse(configFile);
  return new DbPool(dbConfig);
}

export { DbPool, ResultSet } from "./connect";
