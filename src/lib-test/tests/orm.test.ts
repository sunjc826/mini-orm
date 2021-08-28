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
import { Book } from "../models/book";
import { Person } from "../models/person";
import { AUTHOR, BOOK, PERSON, PUBLISHER } from "../domainKeys";
import { Publisher } from "../models/publisher";

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

async function createTestAuthor() {
  Author.create<Author>({ name: "TestAuthor", age: 30 });
  await DomainObject.commit();
  const author = (await Author.find({
    domainObjectField: "name",
    value: "TestAuthor",
  }).exec()) as Author;
  expect(author).toBeDefined();
  expect(author.name).toEqual("TestAuthor");
  return author;
}

async function findTestAuthor() {
  return (await Author.find({
    domainObjectField: "name",
    value: "TestAuthor",
  }).exec()) as Author;
}

async function createTestPerson() {
  Person.create<Person>({ name: "TestPerson", age: 30, favoriteFood: "salad" });
  await DomainObject.commit();
  const person = (await Person.find({
    domainObjectField: "name",
    value: "TestPerson",
  }).exec()) as Author;
  expect(person).toBeDefined();
  expect(person.name).toEqual("TestPerson");
  return person;
}

async function createTestBook(author: Author) {
  Book.create<Book>({ name: "TestBook", genre: "TestGenre", author });
  await DomainObject.commit();
  const book = (await Book.find({
    domainObjectField: "name",
    value: "TestBook",
  }).exec()) as Book;
  expect(book).toBeDefined();
  expect(book.name).toEqual("TestBook");
  return book;
}

async function createTestPublisher(book: Book) {
  Publisher.create<Publisher>({ book, region: "TestRegion" });
  await DomainObject.commit();
  const publisher = (await Publisher.find({
    domainObjectField: "region",
    value: "TestRegion",
  }).exec()) as Publisher;
  expect(publisher).toBeDefined();
  expect(publisher.region).toEqual("TestRegion");
  return publisher;
}

/**
 * Tests whether inserting rows into a single table of the db is working.
 */
test("insert into single table", async () => {
  await createTestAuthor();
});

test("delete from single table", async () => {
  const author = await createTestAuthor();
  author.destroy();
  await DomainObject.commit();
  const nullAuthor = await findTestAuthor();
  expect(nullAuthor).toBeNull();
});

test("update single table", async () => {
  const author = await createTestAuthor();
  author.update<Author>({ age: 55 });
  await DomainObject.commit();
  const updatedAuthor = await findTestAuthor();
  expect(updatedAuthor).toBeDefined();
  expect(updatedAuthor.age).toEqual(55);
});

test("joining tables manually", async () => {
  const author = await createTestAuthor();
  await createTestBook(author);
  const findAuthorViaJoiningBook = (await Author.joins(BOOK)
    .find({ domainObject: BOOK, domainObjectField: "name", value: "TestBook" })
    .exec()) as Author;
  expect(findAuthorViaJoiningBook).toBeDefined();
  expect(findAuthorViaJoiningBook.name).toEqual("TestAuthor");

  const findBookViaJoiningAuthor = (await Book.joins(AUTHOR)
    .find({
      domainObject: AUTHOR,
      domainObjectField: "name",
      value: "TestAuthor",
    })
    .exec()) as Book;
  expect(findBookViaJoiningAuthor).toBeDefined();
  expect(findBookViaJoiningAuthor.name).toEqual("TestBook");
});

test("multiple joins", async () => {
  const author = await createTestAuthor();
  await createTestBook(author);
  await createTestPublisher(await author.books[0]);

  const findPublisher = (await Publisher.joins({ [BOOK]: AUTHOR })
    .find({
      domainObject: AUTHOR,
      domainObjectField: "name",
      value: "TestAuthor",
    })
    .exec()) as Publisher;
  expect(findPublisher).toBeDefined();
  expect(findPublisher.region).toEqual("TestRegion");

  const findAuthor = (await Author.joins({ [BOOK]: PUBLISHER })
    .find({
      domainObject: PUBLISHER,
      domainObjectField: "region",
      value: "TestRegion",
    })
    .exec()) as Author;
  expect(findAuthor).toBeDefined();
  expect(findAuthor.name).toEqual("TestAuthor");
});

test("update proxied object", async () => {
  const author = await createTestAuthor();
  await createTestBook(author);
  await createTestPublisher(await author.books[0]);

  (await (await author.books[0]).publisher.update)<Publisher>({
    region: "UpdatedTestRegion",
  });
  await DomainObject.commit();
  const updatedRegion = await (await author.books[0]).publisher.region;
  expect(updatedRegion).toEqual("UpdatedTestRegion");
});
