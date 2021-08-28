import { DomainObject } from "../domain";
import { Promisify } from "../helpers/types";
import { registry } from "../registry";
import { getRepoProxy } from "../repository";
import { Query } from "../repository";

export class ValueHolder<T extends DomainObject> {
  value: T | Array<T> | null;
  // isLoaded: boolean = false;
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
        obj = await Repo.findById(this.id);
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
    // this.isLoaded = true;
  }

  /**
   * Retrieve property from object.
   * @param prop
   * @returns
   */
  async getProp(prop: string) {
    // always load value, at least from identity map, such that it is up to date
    // in some sense this is no longer lazy loading
    // TODO: Is there a way to use actual lazy loading?
    await this.loadValue();
    const value = (this.value! as any)[prop];
    return typeof value === "function" ? value.bind(this.value) : value;
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
  valueHolder: ValueHolder<T>
): Promisify<T> {
  const handler = {
    async get(target: ValueHolder<T>, prop: string) {
      return target.getProp(prop);
    },
    /**
     * All setting of properties is to be done via DomainObject#update method.
     * @returns false.
     */
    set() {
      return false;
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
