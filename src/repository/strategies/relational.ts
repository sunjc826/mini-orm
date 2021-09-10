import { DomainObject } from "../../domain";
import { AnyFunction } from "../../helpers/types";
import { log } from "../../lib-test/tests/helpers";
import { registry } from "../../registry";
import { CriterionObject, JoinObject, Query } from "../query";
import { RepositoryStrategy } from "../types";

export class RelationalStrategy<T extends DomainObject>
  implements RepositoryStrategy<T>
{
  currentQuery: Query | null = null;
  isSingle: boolean;
  isSavedToCache: boolean = false;

  cache() {
    this.isSavedToCache = true;
    return this;
  }

  uncache() {
    this.isSavedToCache = false;
    return this;
  }

  isQueryExists(): boolean {
    return !!this.currentQuery;
  }

  newQuery(base: string) {
    this.currentQuery = new Query(base);
    this.isSingle = false;
    return this;
  }

  getQuery() {
    return this.currentQuery;
  }

  setQuery(query: Query) {
    this.currentQuery = query;
  }

  resetQuery() {
    this.currentQuery = null;
  }

  /**
   * Adds a where condition to the current query, and restricts the number of results to one.
   * @param criterion Condition to be added.
   * @returns Self to be further chained.
   */
  find(criterion: CriterionObject) {
    return this.where(criterion).getSingle();
  }

  /**
   * Returns a single domain object (or none) matching the given database id.
   * @param id Id of corresponding row in db.
   * @returns A single domain object or null if no row is found.
   */
  async findById(id: number): Promise<T | null> {
    return (await this.find({
      domainObjectField: "id",
      value: id,
    }).exec()) as T;
  }

  /**
   * Add a where condition to the current query. Can be chained before or after,
   * as long as the final combination of joins and criteria is valid.
   * @param criterion Condition to be added.
   * @returns Self to be further chained.
   */
  where(criterion: CriterionObject) {
    this.currentQuery!.where(criterion);
    return this;
  }

  /**
   * Adds a join clause to the current query. Can be chained before or after,
   * as long as the final combination of joins and criteria is valid.
   *
   * The domains object can be structured as follows:
   * [{
   *  "domainA": {
   *   "domainB": ["domainC", "domainD", {"domainE": "domainF"}]
   *  }
   * }, "domainG"]
   *
   * Suppose the base domain is domainZ. Then this object represents joining (the tables representing)
   * domainZ with domainA,
   * domainZ with domainG,
   * domainA with domainB,
   * domainB with domainC,
   * domainB with domainD,
   * domainB with domainE,
   * domainE with domainF
   *
   * These domains are the domainKeys, the actual tables can be accessible via registry.getTable(domainKey).
   *
   * Heavily inspired by Ruby on Rails.
   *
   * @param domains Hash of domain keys to perform the joins on.
   * @returns Self to be further chained.
   */
  joins(domains: JoinObject) {
    this.currentQuery!.joins(domains);
    return this;
  }

  /**
   * Limit the query to the given number of rows.
   * @param count Maximum number of rows to be returned.
   * @returns Self to be further chained.
   */
  limit(count: number) {
    this.currentQuery!.limit(count);
    return this;
  }

  /**
   * Specifies that the query has at most 1 result, and the result is to be returned
   * as a single object instead of an array.
   */
  getSingle() {
    this.currentQuery!.limit(1);
    this.isSingle = true;
    return this;
  }

  /**
   * Executes the current query and returns the domain objects of base.
   * @returns An array of domain objects or a single domain object.
   */
  async exec(): Promise<Array<T> | T | null> {
    if (!this.currentQuery) {
      throw new Error("no query defined");
    }
    const query = this.currentQuery;
    const base = query.base;
    const BaseMapper = registry.getMapper(base);

    // for single results that don't have cross table conditions,
    // check identity map if object exists first,
    // otherwise, make a db query
    if (this.isSingle && query.isSimple()) {
      const inMemoryResult = registry
        .getIdentityMap()
        .getCachedObjectsByDomain(base)
        .filter((obj) => !!obj) // removed undefined or null objects
        .find((obj) => query.matchObject(obj));
      if (inMemoryResult) {
        return inMemoryResult;
      }
    }

    const cacheOptions = this.isSavedToCache
      ? { key: query.toCacheObject() }
      : undefined;

    let domainObjects = await BaseMapper.select<T & DomainObject>(
      this.currentQuery!.toQueryString(),
      undefined,
      cacheOptions
    );
    const queryResult = this.isSingle ? domainObjects[0] : domainObjects;

    return queryResult || null;
  }

  then(callback?: AnyFunction) {
    return this.exec().then(callback);
  }

  catch(callback: AnyFunction) {
    return this.then().catch(callback);
  }
}
