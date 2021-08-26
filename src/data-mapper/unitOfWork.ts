import { DataMapper } from ".";
import { DomainObject } from "../domain";
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
    this.newObjects[domainKey] = [];
    this.dirtyObjects[domainKey] = [];
    this.removedObjects[domainKey] = [];
  }

  registerClean<T extends DomainObject>(
    options: UnitOfWork.RegisterObjectOptions<T>
  ) {
    this.identityMap.insert(options);
  }

  registerNew<T extends DomainObject>({
    domainKey,
    domainObject,
  }: UnitOfWork.RegisterNewObjectOptions<T>) {
    this.newObjects[domainKey].push(domainObject);
  }

  // TODO: can consider using domainObjectId to index each object instead
  registerDirty<T extends DomainObject>({
    domainKey,
    domainObject,
    domainObjectId,
  }: UnitOfWork.RegisterObjectOptions<T>) {
    this.dirtyObjects[domainKey].push(domainObject);
  }

  // TODO: can consider using domainObjectId to index each object instead
  registerRemove<T extends DomainObject>({
    domainKey,
    domainObject,
    domainObjectId,
  }: UnitOfWork.RegisterObjectOptions<T>) {
    this.removedObjects[domainKey].push(domainObject);
  }

  forceClear() {
    this.newObjects = {};
    this.dirtyObjects = {};
    this.removedObjects = {};
  }

  private async insertNew() {
    const sorted = registry.topoSort();
    for (const domainKey of sorted) {
      const idArr = await registry
        .getMapper(domainKey)
        .insert(this.newObjects[domainKey]);
      this.newObjects[domainKey].forEach((obj, index) => {
        obj.id = idArr[index];
      });
    }
  }

  // TODO
  private async updateDirty() {}

  // TODO
  private async deleteRemoved() {}

  /**
   * Move new and updated objects to identity map. Remove deleted objects from identity map.
   */
  private updateIdentityMap() {
    // update new objects
    for (const [domainKey, objArr] of Object.entries(this.newObjects)) {
      for (const obj of objArr) {
        this.identityMap.insert({
          domainKey,
          domainObject: obj,
        });
      }
    }

    for (const [domainKey, objArr] of Object.entries(this.dirtyObjects)) {
      for (const obj of objArr) {
        this.identityMap.insert({
          domainKey,
          domainObject: obj,
        });
      }
    }
  }

  async commit() {
    const client = await (await DataMapper.dbPool).getClient();
    await client?.query("BEGIN;");
    await this.insertNew();
    this.updateDirty();
    this.deleteRemoved();
    this.updateIdentityMap();
    await client?.query("END");
    this.forceClear();
    return client?.release();
  }
}

export declare namespace UnitOfWork {
  export type RegistrationRecord = Record<string, Array<any>>;

  export interface RegisterNewObjectOptions<T extends DomainObject> {
    domainKey: string;
    domainObject: T;
  }

  export interface RegisterObjectOptions<T extends DomainObject> {
    domainKey: string;
    domainObject: T;
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

  insert<T extends DomainObject>({
    domainKey,
    domainObject,
    domainObjectId,
  }: UnitOfWork.RegisterObjectOptions<T>) {
    const id = domainObjectId || domainObject.id;
    this.map[domainKey][id] = domainObject;
  }
}
