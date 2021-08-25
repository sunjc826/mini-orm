import { BelongsTo, createDomainObject } from "../../domain";
import { PUBLISHER } from "../domainKeys";
import { Book } from "./book";

export class Publisher extends createDomainObject({ domainKey: PUBLISHER }) {
  region: string;
  // this is only for testing purposes, of course in an actual db
  // it makes no sense for a publisher to belong to a book
  book: BelongsTo<Book>;
}
