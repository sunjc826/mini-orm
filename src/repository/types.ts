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
  currentQuery: Query | null;
  newQuery(base: string): RepositoryStrategy;
  getQuery(): Query | null;
  setQuery(query: Query): void;
  resetQuery(): void;
  isQueryExists(): boolean;
  where(criterion: CriterionObject): RepositoryStrategy;
  joins(domains: JoinObject): RepositoryStrategy;
  limit(count: number): RepositoryStrategy;
  getSingle(): RepositoryStrategy;
  find(criterion: CriterionObject): RepositoryStrategy;
  findById<T extends DomainObject>(id: number): Promise<T | null>;
  exec<T extends DomainObject>(): Promise<Array<T> | T | null>;
}
