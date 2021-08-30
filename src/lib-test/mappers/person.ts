import { createMapper } from "../../data-mapper";
import { MetaData } from "../../data-mapper/metadata/metadata";
import { PERSON } from "../domainKeys";
import { Person } from "../models/person";
import { PersonTable } from "../tables/person";

export class PersonMapper extends createMapper({
  domainKey: PERSON,
  Table: PersonTable,
  customColumnMap: {
    country: {
      domainObjectFields: "locationDetails",
      fieldConversionFunction: (obj: Person) => obj.locationDetails.country,
    },
    town: {
      domainObjectFields: "locationDetails",
      fieldConversionFunction: (obj: Person) => obj.locationDetails.town,
    },
    street: {
      // TODO: possible improvement in the far future
      // parse something like locationDetails.streetName\
      // to allow for more fine-grained diffing and checking of dirtied states
      // A major flaw of this current approach is that this relies on the user
      // to declare dependencies.
      domainObjectFields: "locationDetails",
      fieldConversionFunction: (obj: Person) =>
        obj.locationDetails.streetName?.replace(" St", ""),
    },
  },
  customObjectMap: {
    domainObjectFields: {
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
          columnConversionFunction: (street: string) => street + " St",
        },
      },
    },
  },
}) {}
