import { registry } from "../registry";
import { CriterionObject, JoinObject, Query } from "./query";

class Repository {
  private strategy: RepositoryStrategy;
}

interface RepositoryStrategy {
  currentQuery: Query;
  where(criterion: CriterionObject): void;
  joins(domains: JoinObject): void;
}

class RelationalStrategy implements RepositoryStrategy {
  currentQuery: Query;

  newQuery(base: string) {
    this.currentQuery = new Query(base);
  }

  /**
   * Add a where condition to the current query. Can be chained before or after,
   * as long as the final combination of joins and criteria is valid.
   * @param criterion Condition to be added.
   */
  where(criterion: CriterionObject): void {
    this.currentQuery.where(criterion);
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
   */
  joins(domains: JoinObject): void {
    this.currentQuery.joins(domains);
  }

  /**
   * Executes the current query.
   */
  executeQuery() {
    const base = this.currentQuery.base;
    const BaseMapper = registry.getMapper(base);
    const mapper = new BaseMapper();
    mapper.select(this.currentQuery.toQueryString());
  }
}
