import { DomainObject } from "../domain";
import { MethodProxy, Promisify } from "../helpers/types";
import { registry } from "../registry";
import { getRepoProxy } from "../repository";
import { Query } from "../repository/query";

export class ValueHolder<T extends DomainObject> {
  value: T | Array<T> | null;
  isLoaded: boolean = false;
  domainKey: string;
  id?: number;
  loader?: Query;
  isSingle: boolean;

  constructor({
    domainKey,
    knownId,
    loader,
    isSingle,
  }: ValueHolder.ConstructorOptions) {
    this.domainKey = domainKey;
    this.id = knownId;
    this.loader = loader;
    this.isSingle = isSingle;
  }

  /**
   * First check identity map if object is loaded into memory
   * otherwise, load from database.
   */
  private async loadValue() {
    const idMap = registry.getIdentityMap();
    const Repo = getRepoProxy();
    if (this.id) {
      let obj = idMap.find(this.domainKey, this.id);
      if (obj === undefined) {
        obj = await Repo.strategy.findById(this.id);
      }
      this.value = obj;
    } else if (this.loader) {
      // use loader
      Repo.setQuery(this.loader);
      if (this.isSingle) {
        Repo.getSingle();
      }
      this.value = await Repo.exec();
    } else {
      throw new Error(
        "at least one of knownId, loader required to load an object"
      );
    }
    this.isLoaded = true;
  }

  /**
   * Retrieve property from object.
   * @param prop
   * @returns
   */
  async getProp(prop: string) {
    if (!this.isLoaded) {
      await this.loadValue();
    }

    return (this.value! as any)[prop];
  }
}

export declare namespace ValueHolder {
  export interface ConstructorOptions {
    domainKey: string;
    knownId?: number; // usually used by belongsTo associations, where it is easy to know the associated id
    loader?: Query; // used by hasOne associations
    isSingle: boolean; // whether the value holder holds an object or an array
  }
}

/**
 * Returns a virtual proxy when given a value holder.
 * Note: the returned value is typed to be the domain object that the value holder encapsulates.
 * @param valueHolder
 * @param permit
 * @returns Virtual proxy.
 */
export function createVirtualProxy<T extends DomainObject>(
  valueHolder: ValueHolder<T>,
  permit = ["id"]
): Promisify<T> {
  const handler = {
    async get(target: ValueHolder<T>, prop: string) {
      return target.getProp(prop);
    },
    set(target: ValueHolder<T>, prop: string, value: any) {
      if (!(prop in permit.values())) {
        return false;
      }
      Reflect.set(target, prop, value);
      return true;
    },
  };

  // force casting to a regular domain object
  return new Proxy(valueHolder, handler) as any as Promisify<T>;
}

type Options = ValueHolder.ConstructorOptions;
export function getVirtualDomainObject<T extends DomainObject>(
  options: Options
) {
  return createVirtualProxy(new ValueHolder<T>(options));
}
