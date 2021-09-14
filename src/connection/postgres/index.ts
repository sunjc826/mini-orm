import fs, { readFileSync } from "fs";
import path from "path";
import { ClientConfig } from "pg";
import { DbPool } from "./connect";
const { resolve } = path;
const PROJECT_ROOT = ".";
const CONFIG_FILENAME = "db.config.json";
const pathToConfig = resolve(PROJECT_ROOT, CONFIG_FILENAME);

export function getPool() {
  const configFile = readFileSync(pathToConfig, "utf-8");
  const dbConfig: ClientConfig = JSON.parse(configFile);
  return new DbPool(dbConfig);
}

export { DbPool, ResultSet } from "./connect";
