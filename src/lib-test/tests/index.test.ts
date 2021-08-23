import { DataMapper } from "../../data-mapper";
import { AuthorTable } from "../tables/author";
import { clear, sqlIsTableExists, write } from "./helpers";
import { BookTable } from "../tables/book";

// register stuff to registry
import "..";
import { DbPool } from "../../connection/connect";

// test create table

let pool: DbPool;
beforeAll(async () => {
  clear();
  await DataMapper.Test.dropAll();
  await DataMapper.createTables();
  pool = await DataMapper.dbPool;
});

afterAll(async () => {
  const promises = [];
  promises.push(DataMapper.Test.dropAll());
  await Promise.all(promises);
  await pool.end();
});

interface CanCreateTableResult {
  table_exists: string;
}
test("can create table", async () => {
  let result: Array<CanCreateTableResult> = await pool.query(
    sqlIsTableExists(AuthorTable.tableName)
  );
  expect(result[0].table_exists).toBeTruthy();
  result = await pool.query(sqlIsTableExists(BookTable.tableName));
  expect(result[0].table_exists).toBeTruthy();
});
