import { AnyFunction, Promisify } from "../helpers/types";
import { getRepoProxy, Repo } from "../repository";

export abstract class DomainObject {
  static domainKey: string;
  id: number;

  constructor(obj: Record<string, any>) {
    for (const [key, value] of Object.entries(obj)) {
      (this as any)[key] = value;
    }
  }
}

interface CreateDomainObjectOptions {
  domainKey: string;
}

export function createDomainObject({
  domainKey,
}: CreateDomainObjectOptions): typeof DomainObject & Repo {
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
      const RepoProxy = getRepoProxy();
      if (!RepoProxy.isQueryExists()) {
        RepoProxy.newQuery(target.domainKey);
      }
      const value = Reflect.get(RepoProxy, prop);
      return typeof value === "function"
        ? (value as AnyFunction).bind(RepoProxy)
        : value;
    },
  }) as any as typeof DomainObject & Repo;
}

export type BelongsTo<T extends DomainObject> = Promisify<T>;
export type HasOne<T extends DomainObject> = Promisify<T>;
export type HasMany<T extends DomainObject> = Promisify<Array<T>>;
