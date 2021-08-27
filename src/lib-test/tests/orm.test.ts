import { DataMapper } from "../../data-mapper";
import { AuthorTable, AuthorTest } from "../tables/author";
import { clear, sqlIsTableExists } from "./helpers";
import { BookTable, BookTest } from "../tables/book";

// register stuff to registry
import "..";
import { DbPool } from "../../connection/connect";
import { Author } from "../models/author";
import { PublisherTest } from "../tables/publisher";
import { registry } from "../../registry";
import { DomainObject } from "../../domain";

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
  registry.unitOfWork.resetIdentityMap();
});

interface CanCreateTableResult {
  table_exists: string;
}

/**
 * Tests whether ORM can create registered tables.
 */
test("create table", async () => {
  let result: Array<CanCreateTableResult> = await pool.query(
    sqlIsTableExists(AuthorTable.tableName)
  );
  expect(result[0].table_exists).toBeTruthy();
  result = await pool.query(sqlIsTableExists(BookTable.tableName));
  expect(result[0].table_exists).toBeTruthy();
});

/**
 * Tests whether selecting from a single table is working.
 */
test("select single table", async () => {
  // insert some data with raw sql
  await pool.query(AuthorTest.insertSql);
  const nullAuthor = await Author.findById(0);
  expect(nullAuthor).toBeNull();
  const author = await Author.findById<Author>(1);
  expect(author).toBeDefined();
  expect(author).not.toBeNull();
  expect(author!.name).toEqual("Sam");
});

/**
 * Tests whether belongs to, has one, has many associations are working.
 */
test("foreign key mapping", async () => {
  await pool.query(AuthorTest.insertSql);
  await pool.query(BookTest.insertSql);
  await pool.query(PublisherTest.insertSql);
  const dukeNukem = await Author.findById<Author>(4);
  // has many
  const books = dukeNukem?.books!;
  expect(books).toBeDefined();
  expect(await books.length).toEqual(1);
  const whyImSoGreatBook = await books[0];
  expect(whyImSoGreatBook.genre).toEqual("Autobiography");
  // belongs to
  expect(dukeNukem?.name).toEqual("Nukem");
  expect(await whyImSoGreatBook.author.name).toEqual(dukeNukem?.name);
  // has one
  const publisher = whyImSoGreatBook.publisher;
  console.log(publisher);
  expect(await publisher.region).toEqual("International");
});

test("topological sort", async () => {
  const sorted = registry.getCorrectInsertOrder();
  expect(sorted).toEqual(["author", "book", "publisher"]);
});

/**
 * Tests whether inserting rows into a single table of the db is working.
 */
test("insert into single table", async () => {
  Author.create<Author>({ name: "Tester", age: 30 });
  await DomainObject.commit();
  const author = (await Author.find({
    domainObjectField: "name",
    value: "Tester",
  }).exec()) as Author;
  expect(author).toBeDefined();
  expect(author.name).toEqual("Tester");
});

test("delete from single table", async () => {
  Author.create<Author>({ name: "Tester", age: 30 });
  await DomainObject.commit();
  let author = (await Author.find({
    domainObjectField: "name",
    value: "Tester",
  }).exec()) as Author;
  expect(author).toBeDefined();
  expect(author.name).toEqual("Tester");
  author.destroy();
  await DomainObject.commit();
  author = (await Author.find({
    domainObjectField: "name",
    value: "Tester",
  }).exec()) as Author;
  expect(author).toBeNull();
});

test("update single table", async () => {});
