import {
  AnyFunction,
  OwnKeyValues,
  Promisify,
  PromisifyArray,
} from "../helpers/types";
import { registry } from "../registry";
import { getRepoProxy, Repo } from "../repository";

// unfortunately I can't keep the abstract keyword here since I would like to have factory methods
// another option is to define it on the NewDomainObject class defined below but that would mean having
// the same methods on different prototypes
export class DomainObject {
  static domainKey: string;
  id: number;

  constructor(obj: Record<string, any>) {
    for (const [key, value] of Object.entries(obj)) {
      (this as any)[key] = value;
    }
  }

  static create<T extends DomainObject>(ownKeyValues: OwnKeyValues<T>) {
    const instance = new this(ownKeyValues);
    registry.unitOfWork.registerNew({
      domainKey: this.domainKey,
      domainObject: instance,
    });
    return instance;
  }

  destroy() {
    registry.unitOfWork.registerRemove({
      domainKey: (this.constructor as typeof DomainObject).domainKey,
      domainObject: this,
    });
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
export type HasMany<T extends DomainObject> = PromisifyArray<Array<T>>;
