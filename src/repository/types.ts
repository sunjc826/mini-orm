import { Query } from "./query";
import { Criterion } from "./query/criterion";
import { Join } from "./query/join";

export const EMPTY = {} as const;
export type EMPTY = typeof EMPTY;

export type ArrayifyIfNotArray<T> = T extends Array<any>
  ? RepositoryStrategy<T>
  : RepositoryStrategy<Array<T>>;

export type GetArrayInner<T> = T extends Array<infer Inner>
  ? RepositoryStrategy<Inner>
  : RepositoryStrategy<T>;

export interface RepositoryStrategy<T> extends PromiseLike<T | null> {
  currentQuery: Query | null;
  newQuery(base: string): ArrayifyIfNotArray<T>;
  getQuery(): Query | null;
  setQuery(query: Query): RepositoryStrategy<T>;
  resetQuery(): void;
  isQueryExists(): boolean;
  where(criterion: Criterion.CriterionObject): RepositoryStrategy<T>;
  joins(domains: Join.JoinObject): RepositoryStrategy<T>;
  limit(count: number): RepositoryStrategy<T>;
  getSingle(): GetArrayInner<T>;
  find(criterion: Criterion.CriterionObject): GetArrayInner<T>;
  findById(id: number): GetArrayInner<T>;
  exec(): Promise<T | null>;
  cache(): RepositoryStrategy<T>;
  uncache(): RepositoryStrategy<T>;
}
