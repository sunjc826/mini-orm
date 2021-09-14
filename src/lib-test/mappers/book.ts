import { createMapper } from "../../data-mapper";
import { BOOK } from "../domainKeys";
import { BookTable } from "../tables/book";

export const BookMapper = createMapper({
  domainKey: BOOK,
  Table: BookTable,
  belongsTo: {
    author: {},
  },
  hasOne: {
    publisher: {},
  },
});
