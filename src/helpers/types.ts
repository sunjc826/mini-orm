// useful types
export type AnyFunction = (...args: any) => any;
export type FirstParam<T extends AnyFunction> = Parameters<T>[0];
export type SecondParam<T extends AnyFunction> = Parameters<T>[1];
export type Constructor<T> = new (...args: any) => T;
export type MethodProxy<T> = {
  [idx in keyof T]: T[idx] extends () => infer U ? Promise<U> : never;
};
export type Promisify<T> = {
  [idx in keyof T]: Promise<T[idx]> | T[idx];
};

export type PromisifyArray<T> = Promisify<T> & {
  length: Promise<number>;
};

export type OwnKeyValues<T> = {
  [idx in keyof T]: T[idx];
};

export type RecursivePartial<T> = {
  [idx in keyof T]?: RecursivePartial<T[idx]>;
};

export interface Cacheable {
  /**
   * Returns a plain javascript object or primitive that is easily serialized.
   */
  toCacheObject: () => any;
}

export type Comparator<T> = (obj: T, other: T) => number;
export interface WithComparator<T> {
  compare: Comparator<T>;
}

export interface Comparable<T> {
  compareTo: (other: T) => number;
}
