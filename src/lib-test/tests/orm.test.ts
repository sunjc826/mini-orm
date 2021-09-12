import { DataMapper } from "../../data-mapper";
import { AuthorTable, AuthorTest } from "../tables/author";
import { clear, sqlIsTableExists } from "./helpers";
import { BookTable, BookTest } from "../tables/book";

// register stuff to registry
import "..";
import { DbPool } from "../../connection";
import { Author } from "../models/author";
import { PublisherTest } from "../tables/publisher";
import { registry } from "../../registry";
import { DomainObject } from "../../domain";
import { Book } from "../models/book";
import { Person } from "../models/person";
import { AUTHOR, BOOK, PUBLISHER } from "../domainKeys";
import { Publisher } from "../models/publisher";
import { PersonTest } from "../tables/person";
import { PlayerTest } from "../tables/single-table-inheritance/player";
import { Footballer } from "../models/single-table-inheritance/footballer";

let pool: DbPool;
beforeAll(async () => {
  clear();
  await DataMapper.Test.dropAll();
  await DataMapper.createTables();
  pool = DataMapper.dbPool;
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
  const author = await Author.findById(1);
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
  const dukeNukem = await Author.findById(4);
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
  expect(await publisher.region).toEqual("International");
});

async function createTestAuthor() {
  Author.create({ name: "TestAuthor", age: 30 });
  await DomainObject.commit();
  const author = (await Author.find({
    domainObjectField: "name",
    value: "TestAuthor",
  }))!;
  expect(author).toBeDefined();

  expect(author.name).toEqual("TestAuthor");

  return author;
}

async function findTestAuthor() {
  return (await Author.find({
    domainObjectField: "name",
    value: "TestAuthor",
  }))!;
}

async function createTestPerson() {
  Person.create({
    name: "TestPerson",
    age: 30,
    favoriteFood: "salad",
    locationDetails: {
      country: "TestCountry",
      town: "TestTown",
      streetName: "TestStreet St",
    },
  });
  await DomainObject.commit();
  const person = (await Person.find({
    domainObjectField: "name",
    value: "TestPerson",
  }))!;
  expect(person).toBeDefined();
  expect(person.name).toEqual("TestPerson");
  return person;
}

async function createTestBook(author: Author) {
  Book.create({ name: "TestBook", genre: "TestGenre", author });
  await DomainObject.commit();
  const book = (await Book.find({
    domainObjectField: "name",
    value: "TestBook",
  }))!;
  expect(book).toBeDefined();
  expect(book.name).toEqual("TestBook");
  return book;
}

async function createTestPublisher(book: Book) {
  Publisher.create({ book, region: "TestRegion" });
  await DomainObject.commit();
  const publisher = (await Publisher.find({
    domainObjectField: "region",
    value: "TestRegion",
  }))!;
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
  author.update({ age: 55 });
  await DomainObject.commit();
  const updatedAuthor = await findTestAuthor();
  expect(updatedAuthor).toBeDefined();
  expect(updatedAuthor.age).toEqual(55);
});

test("joining tables manually", async () => {
  const author = await createTestAuthor();
  await createTestBook(author);
  const findAuthorViaJoiningBook = (await Author.joins(BOOK).find({
    domainKey: BOOK,
    domainObjectField: "name",
    value: "TestBook",
  }))!;
  expect(findAuthorViaJoiningBook).toBeDefined();
  expect(findAuthorViaJoiningBook.name).toEqual("TestAuthor");

  const findBookViaJoiningAuthor = (await Book.joins(AUTHOR).find({
    domainKey: AUTHOR,
    domainObjectField: "name",
    value: "TestAuthor",
  }))!;
  expect(findBookViaJoiningAuthor).toBeDefined();
  expect(findBookViaJoiningAuthor.name).toEqual("TestBook");
});

test("multiple joins", async () => {
  const author = await createTestAuthor();
  await createTestBook(author);
  await createTestPublisher(await author.books[0]);

  const findPublisher = (await Publisher.joins({ [BOOK]: AUTHOR }).find({
    domainKey: AUTHOR,
    domainObjectField: "name",
    value: "TestAuthor",
  }))!;
  expect(findPublisher).toBeDefined();
  expect(findPublisher.region).toEqual("TestRegion");

  const findAuthor = (await Author.joins({ [BOOK]: PUBLISHER }).find({
    domainKey: PUBLISHER,
    domainObjectField: "region",
    value: "TestRegion",
  }))!;
  expect(findAuthor).toBeDefined();
  expect(findAuthor.name).toEqual("TestAuthor");
});

test("update proxied object", async () => {
  const author = await createTestAuthor();
  await createTestBook(author);
  await createTestPublisher(await author.books[0]);

  (await (await author.books[0]).publisher.update)({
    region: "UpdatedTestRegion",
  });
  await DomainObject.commit();
  const updatedRegion = await (await author.books[0]).publisher.region;
  expect(updatedRegion).toEqual("UpdatedTestRegion");
});

test("manual object mapping select", async () => {
  await pool.query(PersonTest.insertSql);
  const person = await Person.findById(1);
  expect(person).toBeDefined();
  expect(person?.locationDetails.country).toEqual("USA");
  expect(person?.locationDetails.town).toEqual("Area 51");
});

test("manual table column mapping insert", async () => {
  const person = await createTestPerson();
  expect(person.locationDetails.country).toEqual("TestCountry");
  expect(person.locationDetails.streetName).toEqual("TestStreet St");
});

test("manual table column mapping update", async () => {
  const person = await createTestPerson();
  expect(person.locationDetails.country).toEqual("TestCountry");
  person.update({
    locationDetails: {
      ...person.locationDetails, // TODO: Manual merging is needed when doing updates due to limitations of dependency tracking
      // without the above line, the sql generated will set street to undefined.
      country: "TestCountry2",
      town: "TestTown2",
    },
  });
  await DomainObject.commit();
  const updatedPerson = await Person.findById(1);
  expect(updatedPerson).toBeDefined();
  expect(updatedPerson?.locationDetails.country).toEqual("TestCountry2");
  expect(updatedPerson?.locationDetails.town).toEqual("TestTown2");
  expect(updatedPerson?.locationDetails.streetName).toEqual("TestStreet St");
});

test("single table inheritance select", async () => {
  await pool.query(PlayerTest.insertSql);
  const footballer = await Footballer.findById(1);
  expect(footballer).toBeDefined();
  expect(footballer?.name).toEqual("Johnson");
  expect(footballer?.club).toEqual("ClubX");
});

async function createFootballer() {
  Footballer.create({ name: "TestFootballer", club: "TestClub" });
  await DomainObject.commit();
  const footballer = await Footballer.findById(1);
  expect(footballer).toBeDefined();
  return footballer;
}

test("single table inheritance insert", async () => {
  const footballer = await createFootballer();
  expect(footballer?.name).toEqual("TestFootballer");
  expect(footballer?.club).toEqual("TestClub");
});

test("single table inheritance update", async () => {
  await createFootballer();
  const footballer = await Footballer.findById(1);
  footballer?.update({
    name: "TestFootballer2",
    club: "TestClub2",
  });
  await DomainObject.commit();
  const updatedFootballer = await Footballer.findById(1);
  expect(updatedFootballer).toBeDefined();
  expect(updatedFootballer?.name).toEqual("TestFootballer2");
  expect(updatedFootballer?.club).toEqual("TestClub2");
});

test("single table inheritance delete", async () => {
  const footballer = await createFootballer();
  footballer?.destroy();
  await DomainObject.commit();
  const nullFootballer = await Footballer.findById(1);
  expect(nullFootballer).toBeNull();
});

test("aggregate function: count", async () => {
  await pool.query(AuthorTest.insertSql);
  const authorCount = await Author.count();
  expect(authorCount).toEqual(5);
});
