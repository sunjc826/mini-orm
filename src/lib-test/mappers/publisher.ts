import { createMapper, DataMapper } from "../../data-mapper";
import { PublisherTable } from "../tables/publisher";

export class PublisherMapper extends createMapper({
  domainKey: "publisher",
  Table: PublisherTable,
  belongsTo: {
    book: {},
  },
}) {}
