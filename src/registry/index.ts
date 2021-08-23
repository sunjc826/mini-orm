import { DataMapper } from "../data-mapper";
import { Table } from "../data-mapper/table";
import { UnitOfWork } from "../data-mapper/unitOfWork";
import { DomainObject } from "../domain";
import { Constructor } from "../helpers/types";

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
  tableNameToDomainKey: Record<string, string> = {};
  register<
    T extends typeof Table,
    D extends DomainObject,
    M extends typeof DataMapper
  >(
    domainKey: string,
    _Table: T,
    _DomainObject: Constructor<D>,
    _DataMapper: M
  ) {
    this.registry[domainKey] = {
      _Table,
      _DomainObject,
      _DataMapper,
    };
    this.tableNameToDomainKey[_Table.tableName] = domainKey;
    this.unitOfWork.register(domainKey);
  }

  registerTable<T extends typeof Table>(domainKey: string, _Table: T) {
    this.registry[domainKey]._Table = _Table;
    this.tableNameToDomainKey[_Table.tableName] = domainKey;
    this.unitOfWork.register(domainKey);
  }

  registerDomainObject<D extends DomainObject>(
    domainKey: string,
    _DomainObject: Constructor<D>
  ) {
    this.registry[domainKey]._DomainObject = _DomainObject;
    this.unitOfWork.register(domainKey);
  }

  registerDataMapper<M extends typeof DataMapper>(
    domainKey: string,
    _DataMapper: M
  ) {
    this.registry[domainKey]._DataMapper = _DataMapper;
    this.unitOfWork.register(domainKey);
  }

  getTable<T extends typeof Table>(domainKey: string) {
    return this.registry[domainKey]?._Table as T;
  }

  getDomainKeyFromTableName(dbTableName: string) {
    return this.tableNameToDomainKey[dbTableName];
  }

  getDomainObject<D extends DomainObject>(domainKey: string) {
    return this.registry[domainKey]?._DomainObject as Constructor<D>;
  }

  getMapper<M extends typeof DataMapper>(domainKey: string) {
    return this.registry[domainKey]?._DataMapper as M;
  }

  getIdentityMap() {
    return this.unitOfWork.identityMap;
  }
}

export const registry = new Registry();
