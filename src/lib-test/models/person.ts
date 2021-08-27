import { createDomainObject } from "../../domain";
import { PERSON } from "../domainKeys";

export class Person extends createDomainObject({ domainKey: PERSON }) {
  name: string;
  age: number;
  favoriteFood: string;
}
