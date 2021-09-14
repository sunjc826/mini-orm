import { createMapper } from "../../../data-mapper";
import { MetaData } from "../../../data-mapper/metadata";
import { FOOTBALLER } from "../../domainKeys";
import { PersonTable } from "../../tables/person";
import { PlayerMapper } from "./player";

export const FootballerMapper = createMapper({
  domainKey: FOOTBALLER,
  Table: PersonTable,
  customInheritanceOptions: {
    variant: "singleTable",
    ParentMapper: PlayerMapper,
  },
  customColumnMap: {
    club: "club",
  },
});
