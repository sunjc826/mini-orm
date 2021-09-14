import { createMapper } from "../../../data-mapper";
import { MetaData } from "../../../data-mapper/metadata";
import { PLAYER } from "../../domainKeys";
import { PlayerTable } from "../../tables/single-table-inheritance/player";

export const PlayerMapper = createMapper({
  domainKey: PLAYER,
  Table: PlayerTable,
  customInheritanceOptions: {
    variant: "singleTable",
    ParentMapper: null,
  },
  customColumnMap: {
    name: "name",
  },
});
