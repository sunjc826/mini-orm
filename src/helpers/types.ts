// useful types
export type AnyFunction = (...args: any) => any;
export type FirstParam<T extends AnyFunction> = Parameters<T>[0];
export type SecondParam<T extends AnyFunction> = Parameters<T>[1];
export type Constructor<T> = new (...args: any) => T;
