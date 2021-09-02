import { createMapper } from "../../data-mapper";
import { AUTHOR } from "../domainKeys";
import { AuthorTable } from "../tables/author";

export const AuthorMapper = createMapper({
  domainKey: AUTHOR,
  Table: AuthorTable,
  hasMany: {
    books: {},
  },
});
