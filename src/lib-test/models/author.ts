import { createDomainObject } from "../../domain";
import { Book } from "./book";

export class Author extends createDomainObject({ domainKey: "author" }) {
  name: string;
  age: number;
  books: Array<Book>; // has many
}
