import { BelongsTo, createDomainObject, HasOne } from "../../domain";
import { Author } from "./author";
import { Publisher } from "./publisher";

export class Book extends createDomainObject({ domainKey: "book" }) {
  name: string;
  genre: string;
  authorId: string;
  author: BelongsTo<Author>;
  publisher: HasOne<Publisher>;
}
