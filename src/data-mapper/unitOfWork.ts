import { PoolClient } from "pg";
import { DataMapper } from ".";
import { DomainObject } from "../domain";
import { registry } from "../registry";

export class UnitOfWork {
  identityMap: IdentityMap;
  /**
   * Newly created objects, not present in db.
   */
  newObjects: UnitOfWork.RegistrationRecord = {};
  /**
   * Objects in a modified state, not updated in db.
   */
  dirtyObjects: UnitOfWork.RegistrationRecord = {};
  /**
   * Objects to delete, not removed in db.
   */
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

  registerRemove<T extends DomainObject>({
    domainKey,
    domainObject,
    domainObjectId,
  }: UnitOfWork.RegisterObjectOptions<T>) {
    this.removedObjects[domainKey].push(
      domainObject ? domainObject.id : domainObjectId
    );
  }

  /**
   * Clears all newly created, updated, or removed objects before changes are persisted to db.
   */
  reset() {
    [this.newObjects, this.dirtyObjects, this.removedObjects].forEach((ele) => {
      for (const key of Object.keys(ele)) {
        ele[key] = [];
      }
    });
  }

  private async insertNew(client: PoolClient) {
    const sorted = registry.getCorrectInsertOrder();
    for (const domainKey of sorted) {
      const idArr = await registry
        .getMapper(domainKey)
        .insert(this.newObjects[domainKey], client);
      this.newObjects[domainKey].forEach((obj, index) => {
        obj.id = idArr[index];
      });
    }
  }

  // TODO
  private async updateDirty(client: PoolClient) {}

  private async deleteRemoved(client: PoolClient) {
    const sorted = registry.getCorrectDeleteOrder();
    for (const domainKey of sorted) {
      await registry
        .getMapper(domainKey)
        .delete(this.removedObjects[domainKey], client);
    }
  }

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

  /**
   * Commits all registered changes to database.
   * @returns
   */
  async commit() {
    const client = await (await DataMapper.dbPool).getClient();
    if (!client) {
      return null;
    }
    await client.query("BEGIN;");
    await this.insertNew(client);
    await this.updateDirty(client);
    await this.deleteRemoved(client);
    this.updateIdentityMap();
    await client.query("COMMIT;");
    this.reset();
    return client.release();
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
