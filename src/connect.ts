import { Client, ClientConfig, QueryResult, QueryResultRow } from "pg";

type ResultSet = Array<Record<string, string | number | boolean>>;

interface Query {
  queryText: string;
  values: any[];
}

export class DbClient {

  config: ClientConfig
  client: Client

  constructor(clientConfig: ClientConfig) {
    this.config = clientConfig;
    this.client = new Client(clientConfig);
  }

  async connect(): Promise<boolean> {
    try {
      await this.client.connect();
      console.log("connection success");
    } catch (err) {
      console.log("connection error", err);
      return false;
    }
    return true;
  }

  async close() {
    if (this.client) {
      this.client.end();
    }
  }

  async query(queryText: string, values: any[]): Promise<ResultSet | null> {
    const success = await this.connect();
    if (!success) {
      return null;
    }
    const result = await this.client.query(queryText, values);
    await this.close();
    return result.rows;
  }

  // TODO
  async queryMultiple(queries: Array<Query> | Record<string, Query>) {

  }
}


// const methodMissing = (obj: any) => {
//   new Proxy(obj, ())
// }
