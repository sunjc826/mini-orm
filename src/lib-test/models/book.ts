import { createDomainObject, HasOne } from "../../domain";
import { Author } from "./author";

export class Book extends createDomainObject({ domainKey: "book" }) {
  name: string;
  genre: string;
  authorId: string;
  author: HasOne<Author>
}
