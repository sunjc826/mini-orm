import { createMapper, DataMapper } from "../../data-mapper";
import { BookTable } from "../tables/book";

export class BookMapper extends createMapper({
  domainKey: "book",
  Table: BookTable,
}) {}
