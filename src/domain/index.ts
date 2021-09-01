import {
  AnyFunction,
  Constructor,
  OwnKeyValues,
  Promisify,
  PromisifyArray,
  RecursivePartial,
} from "../helpers/types";
import { registry } from "../registry";
import { getRepoProxy, Repo } from "../repository";
import { DomainObjectConstructor } from "./types";

// unfortunately I can't keep the abstract keyword here since I would like to have factory methods
// another option is to define it on the NewDomainObject class defined below but that would mean having
// the same methods on different prototypes
export class DomainObject {
  static domainKey: string;
  dirtied: Set<string> = new Set<string>();
  id: number;

  constructor(obj: Record<string, any>) {
    for (const [key, value] of Object.entries(obj)) {
      (this as any)[key] = value;
    }
    // return new Proxy(this, {
    //   set(target, prop, value, _receiver) {
    //     if (Reflect.has(target, prop)) {
    //       target.update({ [prop]: value });
    //       return true;
    //     }
    //     return false;
    //   },
    // });
  }

  static create<T extends DomainObject>(
    ownKeyValues: Partial<OwnKeyValues<T>>
  ) {
    const instance = new this(ownKeyValues);
    registry.unitOfWork.registerNew({
      domainKey: this.domainKey,
      domainObject: instance,
    });
    return instance;
  }

  static async commit() {
    return registry.unitOfWork.commit();
  }

  update<T extends DomainObject>(
    ownKeyValues: RecursivePartial<OwnKeyValues<T>>,
    merge: boolean = true
  ) {
    const dirtiedProps = Object.keys(ownKeyValues);
    const dirtiedPropsSet = new Set(dirtiedProps);
    registry.unitOfWork.registerDirty({
      domainKey: (this.constructor as typeof DomainObject).domainKey,
      domainObject: { ...this, ...ownKeyValues, dirtied: dirtiedPropsSet },
      merge,
    });
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

interface ExtendDomainObjectOptions<
  T extends DomainObject,
  U extends typeof DomainObject
> extends CreateDomainObjectOptions {
  ParentDomainObject: DomainObjectConstructor<T, U>;
}

export function createDomainObject({
  domainKey,
}: CreateDomainObjectOptions): typeof DomainObject & Repo {
  const NewDomainObject = class extends DomainObject {
    static domainKey = domainKey;
  };
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
        RepoProxy.newQuery(receiver.domainKey);
      }
      const value = Reflect.get(RepoProxy, prop);
      return typeof value === "function"
        ? (value as AnyFunction).bind(RepoProxy)
        : value;
    },
  }) as any as typeof DomainObject & Repo;
}

export function extendDomainObject<
  T extends DomainObject,
  U extends typeof DomainObject
>({ domainKey, ParentDomainObject }: ExtendDomainObjectOptions<T, U>) {
  const NewDomainObject = class extends ParentDomainObject {
    static domainKey = domainKey;
  };
  return NewDomainObject as typeof ParentDomainObject & Repo;
}

export type BelongsTo<T extends DomainObject> = Promisify<T>;
export type HasOne<T extends DomainObject> = Promisify<T>;
export type HasMany<T extends DomainObject> = PromisifyArray<Array<T>>;
