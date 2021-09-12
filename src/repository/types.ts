import { Query } from "./query";
import { Criterion } from "./query/criterion";
import { Join } from "./query/join";

export const EMPTY = {} as const;
export type EMPTY = typeof EMPTY;

export type WrapWithArray<T> = T extends Array<any> ? T : Array<T>;

export type ArrayifyRepositoryStrategy<T> = RepositoryStrategy<
  WrapWithArray<T>
>;

export type ExtractArray<T> = T extends Array<infer Inner> ? Inner : T;

export type UnarrayifyRepositoryStrategy<T> = RepositoryStrategy<
  ExtractArray<T>
>;

export interface RepositoryStrategy<T> extends PromiseLike<T | null> {
  currentQuery: Query | null;
  newQuery(base: string): ArrayifyRepositoryStrategy<T>;
  getQuery(): Query | null;
  setQuery(query: Query): RepositoryStrategy<T>;
  resetQuery(): void;
  isQueryExists(): boolean;
  count(): Promise<number>;
  max(domainObjectField: string): Promise<number>;
  min(domainObjectField: string): Promise<number>;
  average(domainObjectField: string): Promise<number>;
  sum(domainObjectField: string): Promise<number>;
  where(criterion: Criterion.CriterionObject): RepositoryStrategy<T>;
  joins(domains: Join.JoinObject): RepositoryStrategy<T>;
  limit(count: number): RepositoryStrategy<T>;
  getSingle(): UnarrayifyRepositoryStrategy<T>;
  find(criterion: Criterion.CriterionObject): UnarrayifyRepositoryStrategy<T>;
  findById(id: number): UnarrayifyRepositoryStrategy<T>;
  cache(): RepositoryStrategy<T>;
  uncache(): RepositoryStrategy<T>;
}
