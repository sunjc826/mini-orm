import fs from "fs";
import path from "path";
import { ClientConfig } from "pg";
import { DbClient } from "./connect";
const { resolve } = path;
const { readFile } = fs.promises;
const PROJECT_ROOT = ".";
const CONFIG_FILENAME = "dbconfig.json";
const pathToConfig = resolve(PROJECT_ROOT, CONFIG_FILENAME);

export async function getClient() {
  const configFile = await readFile(pathToConfig, "utf-8");
  const dbConfig: ClientConfig = JSON.parse(configFile);
  console.log("config: ", dbConfig);
  return new DbClient(dbConfig);
}
