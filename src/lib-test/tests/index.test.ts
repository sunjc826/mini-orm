import { DataMapper } from "../../data-mapper";
import { AuthorTable, AuthorTest } from "../tables/author";
import { clear, sqlIsTableExists, write } from "./helpers";
import { BookTable, BookTest } from "../tables/book";

// register stuff to registry
import "..";
import { DbPool } from "../../connection/connect";
import { Author } from "../models/author";

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

afterEach(async () => {
  await DataMapper.truncateTables();
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

test("can select single table", async () => {
  // insert some data with raw sql
  await pool.query(AuthorTest.insertSql);
  const nullAuthor = await Author.findById(0);
  expect(nullAuthor).toBeNull();
  const author = await Author.findById<Author>(1);
  expect(author).toBeDefined();
  expect(author).not.toBeNull();
  expect(author!.name).toEqual("Sam");
});

test("can use foreign key mapping", async () => {
  await Promise.all([
    pool.query(AuthorTest.insertSql),
    pool.query(BookTest.insertSql),
  ]);
  const dukeNukem = await Author.findById<Author>(4);
  console.log("nukem", dukeNukem);
  const books = dukeNukem?.books!;
  expect(books).toBeDefined();
  console.log(books);
  console.log("length", await books.length);
  // expect(books.length).toEqual(1);
  // const whyImSoGreatBook = books[0];
  // More tests
});
