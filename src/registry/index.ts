import { DataMapper } from "../data-mapper";
import { Table } from "../data-mapper/table";
import { DomainObject } from "../domain";
import { Constructor } from "../types";

interface RegistryItem {
  Table: Constructor<Table>;
  DomainObject: Constructor<DomainObject>;
  DataMapper: Constructor<DataMapper>;
}

class Registry {
  registry: Record<string, RegistryItem> = {};

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
}

export const registry = new Registry();
