import { DomainObject } from "../../domain";
import { AnyFunction } from "../../helpers/types";
import { log } from "../../lib-test/tests/helpers";
import { registry } from "../../registry";
import { Query } from "../query";
import { Aggregate } from "../query/aggregate";
import { Criterion } from "../query/criterion";
import { Join } from "../query/join";
import {
  ArrayifyIfNotArray,
  GetArrayInner,
  RepositoryStrategy,
} from "../types";

export class RelationalStrategy<T> implements RepositoryStrategy<T> {
  currentQuery: Query | null = null;
  /**
   * Whether the query returns a single result or an array of results.
   */
  isSingle: boolean;
  /**
   * Whether the query's results are to be cached.
   */
  useCache: boolean = false;
  /**
   * Whether the query's results are to be converted to domain objects.
   */
  toDomainObject: boolean = true;

  cache() {
    this.useCache = true;
    return this;
  }

  uncache() {
    this.useCache = false;
    return this;
  }

  resultSetOnly() {
    this.toDomainObject = false;
    return this;
  }

  mapToDomainObjects() {
    this.toDomainObject = true;
    return this;
  }

  isQueryExists(): boolean {
    return !!this.currentQuery;
  }

  setQuery(query: Query) {
    this.currentQuery = query;
    return this;
  }

  newQuery(base: string) {
    this.currentQuery = new Query(base);
    this.isSingle = false;
    this.toDomainObject = true;
    return this as unknown as ArrayifyIfNotArray<T>;
  }

  getQuery() {
    return this.currentQuery;
  }

  resetQuery() {
    this.currentQuery = null;
  }

  /**
   * Adds a where condition to the current query, and restricts the number of results to one.
   * @param criterion Condition to be added.
   * @returns Self to be further chained.
   */
  find(criterion: Criterion.CriterionObject) {
    return this.where(criterion).getSingle();
  }

  /**
   * Returns a single domain object (or none) matching the given database id.
   * @param id Id of corresponding row in db.
   * @returns A single domain object or null if no row is found.
   */
  findById(id: number) {
    return this.find({
      domainObjectField: "id",
      value: id,
    });
  }

  /**
   * Add a where condition to the current query. Can be chained before or after,
   * as long as the final combination of joins and criteria is valid.
   * @param criterion Condition to be added.
   * @returns Self to be further chained.
   */
  where(criterion: Criterion.CriterionObject) {
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
  joins(domains: Join.JoinObject) {
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
    return this as unknown as GetArrayInner<T>;
  }

  count() {
    this.currentQuery!.aggregate(
      new Aggregate({ aggregateFunction: Aggregate.AggregateFunctions.COUNT })
    );
  }

  min(domainObjectField: string) {
    this.currentQuery!.aggregate(
      new Aggregate({
        aggregateFunction: Aggregate.AggregateFunctions.MIN,
        domainObjectField,
      })
    );
  }

  max(domainObjectField: string) {
    this.currentQuery!.aggregate(
      new Aggregate({
        aggregateFunction: Aggregate.AggregateFunctions.MAX,
        domainObjectField,
      })
    );
  }

  average(domainObjectField: string) {
    this.currentQuery!.aggregate(
      new Aggregate({
        aggregateFunction: Aggregate.AggregateFunctions.AVG,
        domainObjectField,
      })
    );
  }

  sum(domainObjectField: string) {
    this.currentQuery!.aggregate(
      new Aggregate({
        aggregateFunction: Aggregate.AggregateFunctions.SUM,
        domainObjectField,
      })
    );
  }

  private retrieveFromInMemoryData() {
    const query = this.currentQuery!;
    return registry
      .getIdentityMap()
      .getCachedObjectsByDomain(query.base)
      .filter((obj) => !!obj) // removed undefined or null objects
      .find((obj) => query.matchObject(obj));
  }

  private retrieveFromMapper() {
    const query = this.currentQuery!;
    const BaseMapper = registry.getMapper(query.base);

    return BaseMapper.select<T & DomainObject>(
      this.currentQuery!.toQueryString(),
      undefined,
      {
        cacheKey: this.useCache ? query.toCacheObject() : undefined,
        resultSetOnly: !this.toDomainObject,
      }
    );
  }

  /**
   * Executes the current query and returns the domain objects of base.
   * @returns An array of domain objects or a single domain object.
   */
  async exec() {
    if (!this.currentQuery) {
      throw new Error("no query defined");
    }
    const query = this.currentQuery;

    // for single results that don't have cross table conditions,
    // check identity map if object exists first,
    // otherwise, make a db query
    if (this.isSingle && query.isSimple()) {
      const inMemoryResult = this.retrieveFromInMemoryData();
      if (inMemoryResult) {
        return inMemoryResult;
      }
    }

    const domainObjects = await this.retrieveFromMapper();
    const queryResult = this.isSingle ? domainObjects[0] : domainObjects;
    return (queryResult || null) as T | null;
  }

  then(callback?: AnyFunction) {
    return this.exec().then(callback);
  }

  catch(callback: AnyFunction) {
    return this.then().catch(callback);
  }
}
