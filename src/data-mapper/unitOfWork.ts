import { DomainObject } from "../domain";
import { Graph } from "../helpers/graph";
import { registry } from "../registry";

export class UnitOfWork {
  identityMap: IdentityMap;
  newObjects: UnitOfWork.RegistrationRecord = {};
  dirtyObjects: UnitOfWork.RegistrationRecord = {};
  removedObjects: UnitOfWork.RegistrationRecord = {};
  constructor() {
    this.identityMap = new IdentityMap();
  }

  register(domainKey: string) {
    this.identityMap.register(domainKey);
  }

  registerClean(options: UnitOfWork.RegisterObjectOptions) {
    this.identityMap.insert(options);
  }

  registerNew({
    domainKey,
    domainObject,
  }: UnitOfWork.RegisterNewObjectOptions) {
    this.newObjects[domainKey].push(domainObject);
  }

  // TODO: can consider using domainObjectId to index each object instead
  registerDirty({
    domainKey,
    domainObject,
    domainObjectId,
  }: UnitOfWork.RegisterObjectOptions) {
    this.dirtyObjects[domainKey].push(domainObject);
  }

  // TODO: can consider using domainObjectId to index each object instead
  registerRemove({
    domainKey,
    domainObject,
    domainObjectId,
  }: UnitOfWork.RegisterObjectOptions) {
    this.removedObjects[domainKey].push(domainObject);
  }

  // TODO
  insertNew() {}

  // TODO
  updateDirty() {}

  // TODO
  deleteRemoved() {}

  commit() {
    this.insertNew();
    this.updateDirty();
    this.deleteRemoved();
  }
}

export declare namespace UnitOfWork {
  export type RegistrationRecord = Record<string, Array<any>>;

  export interface RegisterNewObjectOptions {
    domainKey: string;
    domainObject: DomainObject;
  }

  export interface RegisterObjectOptions {
    domainKey: string;
    domainObject: DomainObject;
    domainObjectId?: number;
  }
}

class IdentityMap {
  map: UnitOfWork.RegistrationRecord = {};

  register(domainKey: string) {
    this.map[domainKey] = [];
  }

  find(domainKey: string, id: number) {
    if (!this.map[domainKey]) {
      throw new Error("domainKey not registered");
    }
    return this.map[domainKey][id];
  }

  insert({
    domainKey,
    domainObject,
    domainObjectId,
  }: UnitOfWork.RegisterObjectOptions) {
    const id = domainObjectId || domainObject.id;
    this.map[domainKey][id] = domainObject;
  }
}
