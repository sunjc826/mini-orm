import { RelationalStrategy } from "./strategies/relational";
import { RepositoryStrategy } from "./types";

export const Strategies = {
  RELATIONAL: RelationalStrategy,
} as const;
export type Strategies = typeof Strategies;

class Repository {
  public strategy: RepositoryStrategy;

  constructor(strategy: RepositoryStrategy) {
    this.strategy = strategy;
  }
}

export type Repo = Repository & RepositoryStrategy;
function createRepoProxy(repo: Repository): Repo {
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
  }) as any as Repository & RepositoryStrategy;
}

/**
 * Creates and returns a new Repository proxy. This is useful as we may want to have multiple queries existing at one time.
 * @param strategy
 * @returns
 */
export function getRepoProxy(
  Strategy: Strategies[keyof Strategies] = Strategies.RELATIONAL
): Repo {
  return createRepoProxy(new Repository(new Strategy()));
}

export * from "./query";
export * from "./types";
