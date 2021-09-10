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

export interface RepositoryStrategy<T extends DomainObject>
  extends PromiseLike<Array<T> | T | null> {
  currentQuery: Query | null;
  newQuery(base: string): RepositoryStrategy<T>;
  getQuery(): Query | null;
  setQuery(query: Query): void;
  resetQuery(): void;
  isQueryExists(): boolean;
  where(criterion: CriterionObject): RepositoryStrategy<T>;
  joins(domains: JoinObject): RepositoryStrategy<T>;
  limit(count: number): RepositoryStrategy<T>;
  getSingle(): RepositoryStrategy<T>;
  find(criterion: CriterionObject): RepositoryStrategy<T>;
  findById(id: number): Promise<T | null>;
  exec(): Promise<Array<T> | T | null>;
  cache(): RepositoryStrategy<T>;
  uncache(): RepositoryStrategy<T>;
}
