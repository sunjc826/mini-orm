import { ColumnOptions } from "..";
import { ColumnType } from "../base";

export declare namespace Keyable {
  export interface PrimaryKeyableConstructorOptions extends ColumnOptions {
    primaryKey: boolean;
  }

  export interface ForeignKeyableConstructorOptions extends ColumnOptions {
    references: References;
  }

  export interface References {
    domainKey: string;
    tableColumnKey: string;
  }
}

export function PrimaryKeyMixin<T extends typeof ColumnType>(Klass: T) {
  // idk why this Typescript error is still here
  // the constructor already has ...args of type any[]
  abstract class Temp extends Klass {
    primaryKey: boolean;
    // Typescript limitation: Mixins currently have limited viability due to inability
    // to customize constructors.
    // https://github.com/microsoft/TypeScript/issues/37142
    constructor(...args: Array<any>) {
      super(args[0], args[1]);
      const options = args[1];
      this.primaryKey = options.primaryKey ?? false;
    }
  }
  return Temp;
}

export function ForeignKeyMixin<T extends typeof ColumnType>(Klass: T) {
  abstract class Temp extends Klass {
    foreignKey: boolean;
    references?: Keyable.References;
    constructor(...args: Array<any>) {
      super(args[0], args[1]);
      const options = args[1];
      if (options.references) {
        this.foreignKey = true;
        this.references = options.references;
      } else {
        this.foreignKey = false;
      }
    }
    getDomainKey(): string | null {
      if (!this.foreignKey) {
        return null;
      }
      return this.references!.domainKey;
    }
  }

  return Temp;
}
