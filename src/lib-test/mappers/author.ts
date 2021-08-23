import { createMapper } from "../../data-mapper";
import { AuthorTable } from "../tables/author";

export class AuthorMapper extends createMapper({
  domainKey: "author",
  Table: AuthorTable,
}) {}
