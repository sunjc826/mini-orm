import { createMapper, DataMapper } from "../../data-mapper";
import { PublisherTable } from "../tables/publisher";

export const PublisherMapper = createMapper({
  domainKey: "publisher",
  Table: PublisherTable,
  belongsTo: {
    book: {},
  },
});
