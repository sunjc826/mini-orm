import { createDomainObject, HasMany } from "../../domain";
import { Book } from "./book";

export class Author extends createDomainObject({ domainKey: "author" }) {
  name: string;
  age: number;
  books: HasMany<Book>; // has many
}

const author = new Author({});
author.books;
