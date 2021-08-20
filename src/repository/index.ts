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

  where(criterion: CriterionObject): void {
    this.currentQuery.where(criterion);
  }
  joins(domains: JoinObject): void {
    this.currentQuery.joins(domains);
  }
}
