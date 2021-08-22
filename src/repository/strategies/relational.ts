import { DomainObject } from "../../domain";
import { registry } from "../../registry";
import { CriterionObject, JoinObject, Query } from "../query";
import { RepositoryStrategy } from "../types";

export class RelationalStrategy implements RepositoryStrategy {
  currentQuery: Query;
  isSingle: boolean;

  newQuery(base: string): RelationalStrategy {
    this.currentQuery = new Query(base);
    this.isSingle = false;
    return this;
  }

  find(criterion: CriterionObject): RelationalStrategy {
    return this.where(criterion).getSingle();
  }

  async findById(id: number): Promise<DomainObject> {
    return (await this.find({
      domainObjectField: "id",
      value: id,
    }).exec()) as DomainObject;
  }

  /**
   * Add a where condition to the current query. Can be chained before or after,
   * as long as the final combination of joins and criteria is valid.
   * @param criterion Condition to be added.
   * @returns Self to be further chained.
   */
  where(criterion: CriterionObject): RelationalStrategy {
    this.currentQuery.where(criterion);
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
  joins(domains: JoinObject): RelationalStrategy {
    this.currentQuery.joins(domains);
    return this;
  }

  /**
   * Limit the query to the given number of rows.
   * @param count Maximum number of rows to be returned.
   * @returns Self to be further chained.
   */
  limit(count: number): RelationalStrategy {
    this.currentQuery.limit(count);
    return this;
  }

  /**
   * Specifies that the query has at most 1 result, and the result is to be returned
   * as a single object instead of an array.
   */
  getSingle(): RelationalStrategy {
    this.currentQuery.limit(1);
    this.isSingle = true;
    return this;
  }

  /**
   * Executes the current query and returns the domain objects of base.
   * @returns An array of domain objects or a single domain object.
   */
  async exec(): Promise<Array<DomainObject> | DomainObject> {
    const base = this.currentQuery.base;
    const BaseMapper = registry.getMapper(base);
    let domainObjects = await BaseMapper.select(
      this.currentQuery.toQueryString()
    );
    const queryResult = this.isSingle ? domainObjects[0] : domainObjects;

    return queryResult;
  }
}