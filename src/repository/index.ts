import { DomainObject } from "../domain";
import { RelationalStrategy } from "./strategies/relational";
import { RepositoryStrategy } from "./types";

export const Strategies = {
  RELATIONAL: RelationalStrategy,
} as const;
export type Strategies = typeof Strategies;

class Repository<T extends DomainObject> {
  public strategy: RepositoryStrategy<T>;

  constructor(strategy: RepositoryStrategy<T>) {
    this.strategy = strategy;
  }
}

export type Repo<T extends DomainObject> = Repository<T> &
  RepositoryStrategy<Array<T>>;

function createRepoProxy<T extends DomainObject>(repo: Repository<T>): Repo<T> {
  return new Proxy(repo, {
    get(target, prop, _receiver) {
      let result;
      // strategy takes priority
      if (prop in target.strategy) {
        result = Reflect.get(target.strategy, prop);
        return typeof result === "function"
          ? result.bind(target.strategy)
          : result;
      } else {
        result = Reflect.get(target, prop);
        return typeof result === "function" ? result.bind(target) : result;
      }
    },
  }) as any as Repository<T> & RepositoryStrategy<Array<T>>; // by default an array of records is produced, therefore the type reflects this
}

/**
 * Creates and returns a new Repository proxy. This is useful as we may want to have multiple queries existing at one time.
 * @param strategy
 * @returns
 */
export function getRepoProxy<T extends DomainObject>(
  Strategy: Strategies[keyof Strategies] = Strategies.RELATIONAL
): Repo<T> {
  return createRepoProxy(new Repository(new Strategy()));
}
