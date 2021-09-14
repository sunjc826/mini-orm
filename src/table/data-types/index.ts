import { Constructor } from "../../helpers/types";
import { Bool } from "./bool";
import { TimeStamp } from "./timestamp";
import { Int } from "./int";
import { Numeric } from "./numeric";
import { Serial } from "./serial";
import { Text } from "./text";
import { Uuid } from "./uuid";
import { Varchar } from "./varchar";

export const ID_COLUMN_NAME = "id" as const;

export interface ColumnOptions {
  nullable: boolean;
  unique: boolean;
  defaultValue: any;
}

export const varchar = "varchar" as const;
export type varchar = typeof varchar;
export const text = "text" as const;
export type text = typeof text;
export const int = "int" as const;
export type int = typeof int;
const serial = "serial" as const;
type serial = typeof serial;
export const numeric = "numeric" as const;
export type numeric = typeof numeric;
export const bool = "bool" as const;
export type bool = typeof bool;
export const uuid = "uuid" as const;
export type uuid = typeof uuid;
export const timestamp = "timestamp" as const;
export type timestamp = typeof timestamp;
export type DataTypes =
  | varchar
  | text
  | int
  | serial
  | uuid
  | numeric
  | bool
  | timestamp;
export type ColumnTypes =
  | Varchar
  | Text
  | Int
  | Serial
  | Uuid
  | Numeric
  | Bool
  | TimeStamp;

export type AllOptions =
  | Varchar.VarcharOptions
  | Int.IntOptions
  | Serial.SerialOptions
  | Uuid.UuidOptions;

export const COLUMN_TYPE_MAP: Record<DataTypes, Constructor<ColumnTypes>> = {
  varchar: Varchar,
  text: Text,
  int: Int,
  serial: Serial,
  uuid: Uuid,
  numeric: Numeric,
  bool: Bool,
  timestamp: TimeStamp,
} as const;
