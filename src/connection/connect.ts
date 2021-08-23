import { Client, ClientConfig, Pool, PoolClient } from "pg";
import { write } from "../lib-test/tests/helpers";

export type ResultSet<T> = Array<T>;

interface Query {
  queryText: string;
  values: any[];
}

export class DbPool {
  config: ClientConfig;
  pool: Pool;

  constructor(clientConfig: ClientConfig) {
    this.config = clientConfig;
    this.pool = new Pool(clientConfig);
  }

  async getClient(): Promise<PoolClient | null> {
    try {
      const client = await this.pool.connect();
      console.log("connection success");
      return client;
    } catch (err) {
      console.log("connection error", err);
      return null;
    }
  }

  async end() {
    if (this.pool) {
      this.pool.end();
    }
  }

  async query(queryText: string, values?: any[]): Promise<ResultSet<any>> {
    // write({ sql: queryText });
    console.log({ sql: queryText, values });
    const result = await this.pool.query(queryText, values);
    return result.rows;
  }
}
