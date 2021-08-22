import { Repo } from "../repository";

export abstract class DomainObject {
  static repo: Repo;
  id: number;
}
