import { createDomainObject, DomainObject } from "../../domain";

export class Book extends createDomainObject({ domainKey: "book" }) {
  name: string;
  genre: string;
  authorId: string;
}
