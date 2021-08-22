import { createDomainObject, DomainObject } from "../../domain";

export class Author extends createDomainObject({ domainKey: "author" }) {
  name: string;
  age: number;
}
