import { DataMapper } from "../data-mapper";
import { Table } from "../data-mapper/table";
import { UnitOfWork } from "../data-mapper/unitOfWork";
import { DomainObject } from "../domain";
import { Constructor } from "../types";

interface RegistryItem {
  _Table: typeof Table;
  _DomainObject: Constructor<DomainObject>;
  _DataMapper: typeof DataMapper;
}

/**
 * registry is a mapping of the following form
 * [domainKey] : {
 *  DomainObjectClass
 *  DataMapperClass
 *  TableClass
 * }
 *
 * As of now, for each db table there will be a corresponding domain object,
 * which makes things easier.
 * In future this may change.
 */
class Registry {
  registry: Record<string, RegistryItem> = {};
  unitOfWork: UnitOfWork = new UnitOfWork();

  register<
    T extends typeof Table,
    D extends DomainObject,
    M extends typeof DataMapper
  >(item: string, _Table: T, _DomainObject: Constructor<D>, _DataMapper: M) {
    this.registry[item] = {
      _Table,
      _DomainObject,
      _DataMapper,
    };
    this.unitOfWork.register(item);
  }

  getTable(key: string) {
    return this.registry[key]?._Table;
  }

  getDomainObject(key: string) {
    return this.registry[key]?._DomainObject;
  }

  getMapper(key: string) {
    return this.registry[key]?._DataMapper;
  }

  getIdentityMap() {
    return this.unitOfWork.identityMap;
  }
}

export const registry = new Registry();
