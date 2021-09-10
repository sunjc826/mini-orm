import { createDomainObject } from "../../domain";
import { PERSON } from "../domainKeys";

export class Person extends createDomainObject<Person>({ domainKey: PERSON }) {
  name: string;
  age: number;
  favoriteFood: string;
  locationDetails: {
    country: string;
    town: string;
    streetName: string;
  };
}
