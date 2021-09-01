import { extendDomainObject } from "../../../domain";
import { FOOTBALLER } from "../../domainKeys";
import { Player } from "./player";

export class Footballer extends extendDomainObject({
  domainKey: FOOTBALLER,
  ParentDomainObject: Player,
}) {
  club: string;
}
