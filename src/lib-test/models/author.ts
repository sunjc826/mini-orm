import { createDomainObject, HasMany } from "../../domain";
import { AUTHOR } from "../domainKeys";
import { Book } from "./book";

export class Author extends createDomainObject({ domainKey: AUTHOR }) {
  name: string;
  age: number;
  books: HasMany<Book>; // has many
}
