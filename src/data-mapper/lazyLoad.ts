import { DomainObject } from "../domain";
import { registry } from "../registry";

export class ValueHolder<T extends DomainObject> {
  value?: T;
  isLoaded: boolean = false;
  // TODO: we assume foreign keys are single numbers for now
  domainKey: string;
  foreignKey: number;

  constructor(domainKey: string, foreignKey: number) {
    this.domainKey = domainKey;
    this.foreignKey = foreignKey;
  }

  private loadValue() {
    // need to do 2 things here
    // first check identity map if object is loaded into memory
    // otherwise load from database
    const idMap = registry.getIdentityMap();
    const obj = idMap.find(this.domainKey, this.foreignKey);
    if (obj === undefined) {
      // TODO: load from db
    }
    this.isLoaded = true;
  }
  getProp(prop: string) {
    if (!this.isLoaded) {
      this.loadValue();
    }

    return (this.value! as any)[prop];
  }
}

export function createVirtualProxy<T>(
  valueHolder: ValueHolder<T>,
  permit = ["foreignKey"]
) {
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
  return new Proxy(valueHolder, handler);
}
