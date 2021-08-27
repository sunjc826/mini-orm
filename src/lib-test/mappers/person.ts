import { createMapper } from "../../data-mapper";
import { ColumnMap } from "../../data-mapper/metadata";
import { PERSON } from "../domainKeys";
import { PersonTable } from "../tables/person";

export class PersonMapper extends createMapper({
  domainKey: PERSON,
  Table: PersonTable,
}) {}
