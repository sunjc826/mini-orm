import { createDomainObject } from "../../../domain";
import { PLAYER } from "../../domainKeys";

export class Player extends createDomainObject({ domainKey: PLAYER }) {
  name: string;
}
