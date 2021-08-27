import { BelongsTo, createDomainObject, HasOne } from "../../domain";
import { BOOK } from "../domainKeys";
import { Author } from "./author";
import { Publisher } from "./publisher";

export class Book extends createDomainObject({ domainKey: BOOK }) {
  name: string;
  genre: string;
  authorId: string;
  author: BelongsTo<Author>;
  publisher: HasOne<Publisher>;
}
