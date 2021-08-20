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
}
