import { DomainObject } from "../../domain";

export class Book extends DomainObject {
  name: string;
  genre: string;
  authorId: string;
}
