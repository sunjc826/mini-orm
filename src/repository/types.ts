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
