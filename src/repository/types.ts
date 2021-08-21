import { DomainObject } from "../domain";
import { CriterionObject, JoinObject, Query } from "./query";

export const EMPTY = {} as const;
export type EMPTY = typeof EMPTY;

export enum Operators {
  EQ = "=", // equals
  NEQ = "!=", // not equals
  LT = "<", // less than
  LEQ = "<=", // less than or equals
  GT = ">", // greater than
  GEQ = ">=", // greater than or equals
  IN = "IN",
}

export interface RepositoryStrategy {
  currentQuery: Query;
  where(criterion: CriterionObject): RepositoryStrategy;
  joins(domains: JoinObject): RepositoryStrategy;
  limit(count: number): RepositoryStrategy;
  getSingle(): RepositoryStrategy;
  find(criterion: CriterionObject): RepositoryStrategy;
  findById(id: number): Promise<DomainObject>;
  exec(): Promise<Array<DomainObject> | DomainObject>;
}
