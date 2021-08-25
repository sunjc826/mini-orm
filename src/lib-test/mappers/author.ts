import { createMapper } from "../../data-mapper";
import { AUTHOR } from "../domainKeys";
import { AuthorTable } from "../tables/author";

export class AuthorMapper extends createMapper({
  domainKey: AUTHOR,
  Table: AuthorTable,
  hasMany: {
    books: {},
  },
}) {}
