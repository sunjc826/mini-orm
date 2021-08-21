import { RelationalStrategy } from "./strategies/relational";
import { RepositoryStrategy } from "./types";

class Repository {
  public strategy: RepositoryStrategy;

  constructor(strategy: RepositoryStrategy) {
    this.strategy = strategy;
  }
}

function createRepoProxy(repo: Repository): Repository & RelationalStrategy {
  return new Proxy(repo, {
    get(target, prop, _receiver) {
      let result;
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
  }) as any as Repository & RelationalStrategy;
}

export const repository = createRepoProxy(
  new Repository(new RelationalStrategy())
);
