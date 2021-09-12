import { DataMapper } from "../../data-mapper";
import { MetaDataObjectType } from "../../data-mapper/metadata/types";
import { Table } from "../../data-mapper/table";
import { DomainObject } from "../../domain";
import { formatDbColumn } from "../../helpers";
import { CompositeComparator } from "../../helpers/sorting";
import { Cacheable, Comparable } from "../../helpers/types";
import { Operators } from "./types";

export class Criterion implements Cacheable, Comparable<Criterion> {
  sqlOperator: string;
  domainObjectField: string;
  value: any;

  constructor({
    sqlOperator,
    domainKey, // unused within Criterion
    domainObjectField,
    value,
  }: Criterion.CriterionObject) {
    if (!sqlOperator) {
      throw new Error("invalid creation of Criterion");
    }
    this.sqlOperator = sqlOperator;
    this.domainObjectField = domainObjectField;
    this.value = value;
  }

  declare compareTo: Comparable<Criterion>["compareTo"];

  toCacheObject() {
    return {
      sqlOperator: this.sqlOperator,
      domainObjectField: this.domainObjectField,
      value: this.value,
    };
  }

  /**
   * Returns if domain object matches this criterion.
   * @param domainObject
   */
  matchObject<T extends DomainObject>(domainObject: T): boolean {
    const obj = domainObject as any;
    switch (this.sqlOperator) {
      case Operators.EQ: {
        return obj[this.domainObjectField] === this.value;
      }
      case Operators.GEQ: {
        return obj[this.domainObjectField] >= this.value;
      }
      case Operators.GT: {
        return obj[this.domainObjectField] > this.value;
      }
      case Operators.IN: {
        return obj[this.domainObjectField] in this.value;
      }
      case Operators.LEQ: {
        return obj[this.domainObjectField] <= this.value;
      }
      case Operators.LT: {
        return obj[this.domainObjectField] < this.value;
      }
      case Operators.NEQ: {
        return obj[this.domainObjectField] != this.value;
      }
      default: {
        throw new Error("unrecognised operator");
      }
    }
  }

  /**
   * Returns a single where clause corresponding to a criterion. Note that logical chaining
   * is done elsewhere.
   * @returns Sql where clause
   */
  toSqlWhere<T extends typeof Table, M extends typeof DataMapper>(
    Table: T,
    Mapper: M
  ): string {
    // match the right metadata
    // for now we assume TableColumn to domain object field 1:1 map
    // in future, we will work on value objects and other more complex mappings
    const metadataField = Mapper.metadata.findByDomain(this.domainObjectField);
    if (!metadataField) {
      throw Error(
        `no match for domain object field: ${this.domainObjectField}`
      );
    }
    let tableColumnKey;
    switch (metadataField.variant) {
      case MetaDataObjectType.COLUMN_MAP: {
        tableColumnKey = metadataField.tableColumnKey;
        break;
      }
      case MetaDataObjectType.FOREIGN_KEY_MAP: {
        tableColumnKey = metadataField.foreignKey;
        break;
      }
      default: {
        throw new Error("unexpected metadata type");
      }
    }
    const actualDbColumnName = Table.getDbColumnName(tableColumnKey);
    return `${formatDbColumn(Table.tableName, actualDbColumnName)} ${
      this.sqlOperator
    } ${Table.convertColumnValueToSqlString(tableColumnKey, this.value)}`;
  }
}
Criterion.prototype.compareTo = function (other) {
  return new CompositeComparator<Criterion>()
    .compareWith((obj, other) =>
      obj.sqlOperator.localeCompare(other.sqlOperator)
    )
    .compareWith((obj, other) =>
      obj.domainObjectField.localeCompare(other.sqlOperator)
    )
    .compare(this, other);
};

export declare namespace Criterion {
  export interface CriterionObject {
    sqlOperator?: Operators;
    domainKey?: string;
    domainObjectField: string;
    value: any;
  }
}
