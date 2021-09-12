import { DataMapper, Table } from "../..";
import { MetaDataObjectType } from "../../data-mapper/metadata/types";

export class Aggregate {
  aggregateFunction: Aggregate.AggregateFunctions;
  domainObjectField?: string;

  constructor({
    aggregateFunction,
    domainObjectField,
  }: Aggregate.AggregateOptions) {
    this.aggregateFunction = aggregateFunction;
    this.domainObjectField = domainObjectField;
  }

  toSqlSelect<T extends typeof Table, M extends typeof DataMapper>(
    Table: T,
    Mapper: M
  ) {
    switch (this.aggregateFunction) {
      case Aggregate.AggregateFunctions.COUNT: {
        return "COUNT(*)";
      }
      case Aggregate.AggregateFunctions.MAX:
      case Aggregate.AggregateFunctions.MIN:
      case Aggregate.AggregateFunctions.AVG:
      case Aggregate.AggregateFunctions.SUM: {
        // TODO: extract out this logic as it is common to aggregate and criterion
        const metadataField = Mapper.metadata.findByDomain(
          this.domainObjectField!
        );
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
        return `${this.aggregateFunction}(${actualDbColumnName})`;
      }
      default: {
        throw new Error("unexpected aggregate function type");
      }
    }
  }
}

export namespace Aggregate {
  export interface AggregateOptions {
    aggregateFunction: AggregateFunctions;
    domainObjectField?: string;
  }

  export enum AggregateFunctions {
    COUNT = "COUNT",
    MAX = "MAX",
    MIN = "MIN",
    AVG = "AVG",
    SUM = "SUM",
  }
}
