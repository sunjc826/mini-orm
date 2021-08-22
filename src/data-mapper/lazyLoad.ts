import { DomainObject } from "../domain";
import { registry } from "../registry";
import { Repo } from "../repository";

export class ValueHolder<T extends DomainObject> {
  value?: T | Array<T>;
  isLoaded: boolean = false;
  domainKey: string;
  id: number;

  constructor(domainKey: string, id: number) {
    this.domainKey = domainKey;
    this.id = id;
  }

  /**
   * First check identity map if object is loaded into memory
   * otherwise, load from database.
   */
  private async loadValue() {
    const idMap = registry.getIdentityMap();
    let obj = idMap.find(this.domainKey, this.id);
    if (obj === undefined) {
      obj = await Repo.strategy.findById(this.id);
    }
    this.value = obj;
    this.isLoaded = true;
  }

  /**
   * Retrieve property from object.
   * @param prop
   * @returns
   */
  getProp(prop: string) {
    if (!this.isLoaded) {
      this.loadValue();
    }

    return (this.value! as any)[prop];
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
): T {
  const handler = {
    get(target: ValueHolder<T>, prop: string) {
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
  return new Proxy(valueHolder, handler) as any as T;
}

export function getVirtualDomainObject<T extends DomainObject>(
  domainKey: string,
  id: number
) {
  return createVirtualProxy(new ValueHolder<T>(domainKey, id));
}
