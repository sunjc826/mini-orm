import { DomainObject } from ".";
import { Constructor } from "../helpers/types";

export type DomainObjectConstructor<
  T extends DomainObject,
  U extends typeof DomainObject
> = Constructor<T> & U;
