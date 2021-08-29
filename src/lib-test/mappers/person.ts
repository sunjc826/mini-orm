import { createMapper } from "../../data-mapper";
import { MetaData } from "../../data-mapper/metadata/metadata";
import { PERSON } from "../domainKeys";
import { PersonTable } from "../tables/person";

export class PersonMapper extends createMapper({
  domainKey: PERSON,
  Table: PersonTable,
  embeddedObjectMap: {
    tableColumns: {
      locationDetails: {
        country: {
          tableColumns: "country",
          columnConversionFunction: MetaData.Identity,
        },
        town: {
          tableColumns: "town",
          columnConversionFunction: MetaData.Identity,
        },
        streetName: {
          tableColumns: "street",
          columnConversionFunction: (streetName: string) => streetName + " St",
        },
      },
    },
  },
}) {}
