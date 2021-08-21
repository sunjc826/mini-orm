import { DataMapper } from "../data-mapper";
import { Table } from "../data-mapper/table";
import { UnitOfWork } from "../data-mapper/unitOfWork";
import { DomainObject } from "../domain";
import { Constructor } from "../types";

interface RegistryItem {
  Table: Constructor<Table>;
  DomainObject: Constructor<DomainObject>;
  DataMapper: Constructor<DataMapper>;
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
  unitOfWork: UnitOfWork;
  constructor() {
    this.unitOfWork = new UnitOfWork();
  }
  register(
    item: string,
    Table: Constructor<Table>,
    DomainObject: Constructor<DomainObject>,
    DataMapper: Constructor<DataMapper>
  ) {
    this.registry[item] = {
      Table,
      DomainObject,
      DataMapper,
    };
    this.unitOfWork.register(item);
  }

  getTable(key: string) {
    return this.registry[key]?.Table;
  }

  getDomainObject(key: string) {
    return this.registry[key]?.DomainObject;
  }

  getMapper(key: string) {
    return this.registry[key]?.DataMapper;
  }

  getIdentityMap() {
    return this.unitOfWork.identityMap;
  }
}

export const registry = new Registry();
