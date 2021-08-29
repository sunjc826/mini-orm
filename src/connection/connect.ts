import { ClientConfig, Pool, PoolClient } from "pg";
import { write } from "../lib-test/tests/helpers";

export type ResultSet<T> = Array<T>;

interface Query {
  queryText: string;
  values: any[];
}

export class DbPool {
  config: ClientConfig;
  pool: Pool;
  logGeneratedSql: boolean;

  constructor(clientConfig: ClientConfig, logGeneratedSql: boolean = false) {
    this.config = clientConfig;
    this.pool = new Pool(clientConfig);
    this.logGeneratedSql = logGeneratedSql;
  }

  async getClient(): Promise<PoolClient | null> {
    try {
      const client = await this.pool.connect();
      return client;
    } catch (err) {
      console.error("connection error", err);
      return null;
    }
  }

  async end() {
    if (this.pool) {
      this.pool.end();
    }
  }

  async query(queryText: string, values?: any[]): Promise<ResultSet<any>> {
    if (this.logGeneratedSql) {
      write(queryText, "sql", true);
    }
    write(queryText, "sql", false);
    const result = await this.pool.query(queryText, values);
    return result.rows;
  }
}
