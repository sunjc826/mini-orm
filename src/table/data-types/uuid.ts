import { uuid } from ".";
import { ColumnType } from "./base";
import { PrimaryKeyMixin, ForeignKeyMixin, Keyable } from "./mixins/keyable";

export class Uuid extends PrimaryKeyMixin(ForeignKeyMixin(ColumnType)) {
  type = uuid;
  version: Uuid.Version;

  constructor(name: string, options: Partial<Uuid.UuidOptions>) {
    super(name, options);
    this.version = options.version ?? "v4";
  }

  getDefault() {
    if (this.defaultValue) {
      throw new Error("default uuid not supported");
    }
    return `DEFAULT uuid_generate_${this.version}()`;
  }
}

export declare namespace Uuid {
  export type Version = "v1" | "v2" | "v3" | "v4";

  export interface UuidOptions
    extends Keyable.PrimaryKeyableConstructorOptions,
      Keyable.ForeignKeyableConstructorOptions {
    version: Version;
  }
}
