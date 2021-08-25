import { createMapper } from "../../data-mapper";
import { BOOK } from "../domainKeys";
import { BookTable } from "../tables/book";

export class BookMapper extends createMapper({
  domainKey: BOOK,
  Table: BookTable,
  belongsTo: {
    author: {},
  },
  hasOne: {
    publisher: {},
  },
}) {}
