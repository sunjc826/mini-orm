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
  }

  static create<
    T extends DomainObjectConstructor<DomainObject, typeof DomainObject>
  >(this: T, ownKeyValues: Partial<OwnKeyValues<InstanceType<T>>>) {
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

  // update<T extends DomainObject>(
  // this: T,
  // ownKeyValues: RecursivePartial<OwnKeyValues<T>>,
  // merge: boolean = true
  update(
    ownKeyValues: RecursivePartial<OwnKeyValues<typeof this>>,
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

export function createDomainObject<T>({
  domainKey,
}: CreateDomainObjectOptions) {
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
  }) as any as Repo<T & DomainObject> & typeof DomainObject;
}

// currying due to Typescript limitations
// see: https://github.com/microsoft/TypeScript/issues/26242
export function extendDomainObject<R>() {
  return function <T extends DomainObject, U extends typeof DomainObject>({
    domainKey,
    ParentDomainObject,
  }: ExtendDomainObjectOptions<T, U>) {
    const NewDomainObject = class extends ParentDomainObject {
      static domainKey = domainKey;
    };
    return NewDomainObject as any as Repo<T & R & DomainObject> &
      typeof ParentDomainObject;
  };
}

export type BelongsTo<T extends DomainObject> = Promisify<T>;
export type HasOne<T extends DomainObject> = Promisify<T>;
export type HasMany<T extends DomainObject> = PromisifyArray<Array<T>>;
