import { AnyFunction } from "../helpers/types";
import { getRepoProxy } from "../repository";

export abstract class DomainObject {
  static domainKey: string;
  id: number;
}

interface CreateDomainObjectOptions {
  domainKey: string;
}

export function createDomainObject({ domainKey }: CreateDomainObjectOptions) {
  const NewDomainObject = class extends DomainObject {};
  NewDomainObject.domainKey = domainKey;
  return new Proxy(NewDomainObject, {
    get(target, prop, receiver) {
      // check if found in domain object first
      if (Reflect.has(target, prop)) {
        const value = Reflect.get(target, prop);
        return typeof value === "function"
          ? (value as AnyFunction).bind(receiver)
          : value;
      }

      // otherwise, delegate to repo
      const Repo = getRepoProxy();
      const value = Reflect.get(Repo, prop);
      return typeof value === "function"
        ? (value as AnyFunction).bind(Repo)
        : value;
    },
  });
}
