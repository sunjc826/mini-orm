import _ from "lodash";
import { DataMapper } from ".";
import { DbClient } from "../connection/connect";
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
  dirtyObjects: UnitOfWork.UpdateRecord = {};
  /**
   * Objects to delete, not removed in db.
   */
  toDeleteObjectIds: UnitOfWork.RegistrationRecord = {};
  constructor() {
    this.identityMap = new IdentityMap();
  }

  register(domainKey: string) {
    this.identityMap.register(domainKey);
    this.newObjects[domainKey] = [];
    this.dirtyObjects[domainKey] = {};
    this.toDeleteObjectIds[domainKey] = [];
  }

  registerClean<T extends DomainObject>(
    options: UnitOfWork.RegisterObjectOptions<T>
  ) {
    this.identityMap.insertOrUpdate(options);
  }

  registerNew<T extends DomainObject>({
    domainKey,
    domainObject,
  }: UnitOfWork.RegisterNewObjectOptions<T>) {
    this.newObjects[domainKey].push(domainObject);
  }

  registerDirty<T extends DomainObject>({
    domainKey,
    domainObject,
    domainObjectId,
    merge, // whether the changes are to be merged with the currently stored dirtyObjects
  }: UnitOfWork.RegisterDirtyObjectOptions<T>) {
    const id = domainObjectId || domainObject.id;
    if (merge && this.dirtyObjects[domainKey][id]) {
      const storedObj = this.dirtyObjects[domainKey][id];
      const dirtied = storedObj.dirtied;
      for (const ele of domainObject.dirtied) {
        dirtied.add(ele);
      }
      // this.dirtyObjects[domainKey][id] = {
      //   ...storedObj,
      //   ...domainObject,
      //   dirtied,
      // };
      this.dirtyObjects[domainKey][id] = _.merge(storedObj, domainObject, {
        dirtied,
      });
    } else {
      this.dirtyObjects[domainKey][id] = domainObject;
    }
  }

  registerRemove<T extends DomainObject>({
    domainKey,
    domainObject,
    domainObjectId,
  }: UnitOfWork.RegisterObjectOptions<T>) {
    this.toDeleteObjectIds[domainKey].push(
      domainObject ? domainObject.id : domainObjectId
    );
  }

  /**
   * Clears in memory cache of objects.
   */
  resetIdentityMap() {
    this.identityMap.reset();
  }

  /**
   * Clears all newly created, updated, or removed objects before changes are persisted to db.
   */
  resetUncommitted() {
    [this.newObjects, this.toDeleteObjectIds].forEach((ele) => {
      for (const key of Object.keys(ele)) {
        ele[key] = [];
      }
    });
    for (const key of Object.keys(this.dirtyObjects)) {
      this.dirtyObjects[key] = {};
    }
  }

  private async insertNew(client: DbClient) {
    const sorted = registry.getCorrectCreateOrInsertOrder();
    for (const domainKey of sorted) {
      const idArr = await registry
        .getMapper(domainKey)
        .insert(this.newObjects[domainKey], client);
      this.newObjects[domainKey].forEach((obj, index) => {
        obj.id = idArr[index];
      });
    }
  }

  private async updateDirty(client: DbClient) {
    for (const domainKey of Object.keys(this.dirtyObjects)) {
      await registry
        .getMapper(domainKey)
        .update(Object.values(this.dirtyObjects[domainKey])),
        client;
    }
  }

  private async deleteRemoved(client: DbClient) {
    const sorted = registry.getCorrectDeleteOrder();
    for (const domainKey of sorted) {
      await registry
        .getMapper(domainKey)
        .delete(this.toDeleteObjectIds[domainKey], client);
    }
  }

  /**
   * Move new and updated objects to identity map. Remove deleted objects from identity map.
   */
  private updateIdentityMap() {
    // update new objects
    for (const [domainKey, objArr] of Object.entries(this.newObjects)) {
      for (const obj of objArr) {
        this.identityMap.insertOrUpdate({
          domainKey,
          domainObject: obj,
        });
      }
    }

    for (const [domainKey, objMap] of Object.entries(this.dirtyObjects)) {
      for (const obj of Object.values(objMap)) {
        this.identityMap.insertOrUpdate({
          domainKey,
          domainObject: obj,
        });
      }
    }

    for (const [domainKey, objIdArr] of Object.entries(
      this.toDeleteObjectIds
    )) {
      for (const id of objIdArr) {
        this.identityMap.delete(domainKey, id);
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
    this.resetUncommitted();
    return client.release();
  }
}

export declare namespace UnitOfWork {
  export type RegistrationRecord = Record<string, Array<any>>;
  export type UpdateRecord = Record<string, Record<string, DomainObject>>;
  export interface RegisterNewObjectOptions<T extends DomainObject> {
    domainKey: string;
    domainObject: T;
  }

  export interface RegisterObjectOptions<T extends DomainObject> {
    domainKey: string;
    domainObject: T;
    domainObjectId?: number;
  }

  export interface RegisterDirtyObjectOptions<T extends DomainObject>
    extends RegisterObjectOptions<T> {
    merge: boolean;
  }
}

class IdentityMap {
  map: UnitOfWork.RegistrationRecord = {};

  register(domainKey: string) {
    this.map[domainKey] = [];
  }

  reset() {
    for (const key in this.map) {
      this.map[key] = [];
    }
  }

  find(domainKey: string, id: number) {
    if (!this.map[domainKey]) {
      throw new Error("domainKey not registered");
    }
    return this.map[domainKey][id];
  }

  getCachedObjectsByDomain(domainKey: string) {
    return this.map[domainKey];
  }

  insertOrUpdate<T extends DomainObject>({
    domainKey,
    domainObject,
    domainObjectId,
  }: UnitOfWork.RegisterObjectOptions<T>) {
    const id = domainObjectId || domainObject.id;
    this.map[domainKey][id] = domainObject;
  }

  delete(domainKey: string, domainObjectId: number) {
    delete this.map[domainKey][domainObjectId];
  }
}
