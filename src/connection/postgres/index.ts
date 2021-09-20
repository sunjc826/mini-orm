import { ClientConfig } from "pg";
import { getConfig } from "../../config";
import { DbPool } from "./connect";

const CONFIG_FILENAME = "db.config.json";

export function getPool() {
  const dbConfig: ClientConfig = getConfig(CONFIG_FILENAME);
  return new DbPool(dbConfig);
}

export { DbPool, ResultSet } from "./connect";
