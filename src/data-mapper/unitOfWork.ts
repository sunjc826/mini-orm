import { DomainObject } from "../domain";

export class UnitOfWork {
  identityMap: IdentityMap;

  constructor() {
    this.identityMap = new IdentityMap();
  }

  register(domainKey: string) {
    this.identityMap.register(domainKey);
  }
}

class IdentityMap {
  map: Record<string, Array<any>> = {};

  register(domainKey: string) {
    this.map[domainKey] = [];
  }

  find(domainKey: string, id: number) {
    if (!this.map[domainKey]) {
      throw new Error("domainKey not registered");
    }
    return this.map[domainKey][id];
  }

  insert(
    domainKey: string,
    domainObject: DomainObject,
    domainObjectId?: number
  ) {
    const id = domainObjectId || domainObject.id;
    this.map[domainKey][id] = domainObject;
  }
}
