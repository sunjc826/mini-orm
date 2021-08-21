import { DomainObject } from "../domain";
import { registry } from "../registry";
import { repository } from "../repository";

export class ValueHolder<T extends DomainObject> {
  value?: T | Array<T>;
  isLoaded: boolean = false;
  // TODO: we assume foreign keys are single numbers for now
  domainKey: string;
  id: number;

  constructor(domainKey: string, id: number) {
    this.domainKey = domainKey;
    this.id = id;
  }

  private async loadValue() {
    // need to do 2 things here
    // first check identity map if object is loaded into memory
    // otherwise load from database
    const idMap = registry.getIdentityMap();
    let obj = idMap.find(this.domainKey, this.id);
    if (obj === undefined) {
      obj = await repository.strategy.findById(this.id);
    }
    this.value = obj;
    this.isLoaded = true;
  }
  getProp(prop: string) {
    if (!this.isLoaded) {
      this.loadValue();
    }

    return (this.value! as any)[prop];
  }
}

export function createVirtualProxy<T extends DomainObject>(
  valueHolder: ValueHolder<T>,
  permit = ["id"]
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
