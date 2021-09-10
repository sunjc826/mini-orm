import { RelationalStrategy } from "..";
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

export type GetInner<T> = T extends Array<infer Inner>
  ? RepositoryStrategy<Inner>
  : RepositoryStrategy<T>;

export interface RepositoryStrategy<T> extends PromiseLike<T | null> {
  currentQuery: Query | null;
  newQuery(base: string): RepositoryStrategy<T>;
  getQuery(): Query | null;
  setQuery(query: Query): void;
  resetQuery(): void;
  isQueryExists(): boolean;
  where(criterion: CriterionObject): RepositoryStrategy<T>;
  joins(domains: JoinObject): RepositoryStrategy<T>;
  limit(count: number): RepositoryStrategy<T>;
  getSingle(): GetInner<T>;
  find(criterion: CriterionObject): GetInner<T>;
  findById(id: number): GetInner<T>;
  exec(): Promise<T | null>;
  cache(): RepositoryStrategy<T>;
  uncache(): RepositoryStrategy<T>;
}
