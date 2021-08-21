import _ from "lodash";
import { DbClient, ResultSet } from "../connect";
import { DomainObject } from "../domain";
import {
  dbColumnNameToColumnKey,
  extractDomainKeyFromTable,
  splitResultSetColumnName,
} from "../helpers";
import { registry } from "../registry";
import { Constructor } from "../types";
import { Table } from "./table";

namespace DataMapper {
  export interface ConstructorParams {
    TableClass: Constructor<Table>;
    metadata?: Array<MetaDataObject>;
  }
}

namespace MetaDataObjectTypes {
  export const columnMap = "columnMap" as const;
  export type columnMap = typeof columnMap;
  export type allTypes = columnMap;
}

export abstract class DataMapper {
  // TODO: config
  domainKey: string;
  dbClient = new DbClient({});
  metadata: MetaData;

  constructor({ TableClass, metadata }: DataMapper.ConstructorParams) {
    // strategy: use tableClass to generate default metadata, merge with given metadata
    if (!metadata) {
      this.metadata = MetaData.generateDefaultMetaData(TableClass);
    }
  }

  // TODO: This method looks like it should be static (in fact the whole data mapper shld be static)
  /**
   * Returns a result set when given a sql query.
   * @param sql Sql query string.
   */
  async select(sql: string): Promise<Array<DomainObject>> {
    const resultSet = await this.dbClient.query(sql);
    return this.resultSetToDomainObjects(resultSet);
  }

  /**
   * Converts db rows to domain objects.
   * @param resultSet
   */
  private resultSetToDomainObjects(resultSet: ResultSet<any>) {
    const domainObjects = resultSet.map((row) => {
      const tableColumnMap: Record<string, any> = {};
      let requestedDomainObj: DomainObject | null = null;
      for (const [column, value] of Object.entries(row)) {
        /**
         * A map of the form
         * [tableKey] {
         *  [columnKey]: [value]
         * }
         */
        const { tableName, dbColName } = splitResultSetColumnName(column);
        // here, we are aggregating all the properties related to a single table
        // before creating the domain object
        tableColumnMap[extractDomainKeyFromTable(tableName)] ||= {};
        tableColumnMap[extractDomainKeyFromTable(tableName)][
          dbColumnNameToColumnKey(dbColName)
        ] = value;
      }

      // actually create the domain objects
      for (const [domainKey, tableObj] of Object.entries(tableColumnMap)) {
        const Mapper = registry.getMapper(domainKey);
        const DomainObj = registry.getDomainObject(domainKey);
        const mapper = new Mapper();
        const domainObj: Record<string, any> = {};
        for (const [tableColumnKey, value] of Object.entries(tableObj)) {
          // TODO: O(n^2) find here, kinda bad.
          const metadataField = mapper.metadata.findByTable(tableColumnKey);
          switch (metadataField?.variant) {
            case MetaDataObjectTypes.columnMap: {
              domainObj[metadataField.domainFieldName] = value;
              break;
            }
            default: {
              throw new Error("invalid metadata object");
            }
          }
        }
        const actualDomainObj = new DomainObj(domainObj);
        // TODO: Data mapper is responsible for saving to Identity map

        if (domainKey === this.domainKey) {
          requestedDomainObj = actualDomainObj;
        }
      }

      if (!requestedDomainObj) {
        throw new Error("unexpected missing data from table row");
      }

      return requestedDomainObj;
    });
    return domainObjects;
  }
}

type MetaDataObject =
  | string
  | {
      variant: MetaDataObjectTypes.columnMap;
      tableColumnKey: string;
      domainFieldName: string;
    };

export class MetaData {
  static ID_COLUMN_NAME = "id";

  metadataFields: Array<AllMetadataFieldTypes> = [];

  static generateDefaultMetaData(TableClass: Constructor<Table>): MetaData {
    const metadata = new MetaData();
    const table = new TableClass();
    for (const columnName of Object.keys(table)) {
      metadata.metadataFields.push(ColumnMap.usingColumn(columnName));
    }
    metadata.metadataFields.push(
      ColumnMap.usingColumn(MetaData.ID_COLUMN_NAME)
    );
    return metadata;
  }

  findByDomain(domainObjectField: string): AllMetadataFieldTypes | null {
    return (
      this.metadataFields.find((field) =>
        field.matchByDomain(domainObjectField)
      ) || null
    );
  }

  findByTable(tableColumnKey: string): AllMetadataFieldTypes | null {
    return (
      this.metadataFields.find((field) => field.matchByTable(tableColumnKey)) ||
      null
    );
  }
}

abstract class AllMetadataField {
  abstract variant: MetaDataObjectTypes.allTypes;
  /**
   * Returns whether this metadatafield corresponds to the given field.
   * @param domainObjectField Name of a field on the domain object.
   */
  abstract matchByDomain(domainObjectField: string): boolean;
  abstract matchByTable(tableColumnKey: string): boolean;
}

/**
 * Encapsulates the most basic column mapping, 1 db table column : 1 domain object field
 */
export class ColumnMap extends AllMetadataField {
  variant = MetaDataObjectTypes.columnMap;
  tableColumnKey: string;
  domainFieldName: string;

  constructor(tableColumnKey: string, domainFieldName: string) {
    super();
    this.tableColumnKey = tableColumnKey;
    this.domainFieldName = domainFieldName;
  }

  /**
   * Returns a ColumnMap with default tableColumnKey inferred using given domainFieldName.
   * @param domainFieldName Name of field on domain object.
   * @returns ColumnMap.
   */
  static usingDomainField(domainFieldName: string) {
    // there is no need to snakecase here since tableColumnKey isn't the actual db column name.
    // const tableColumnName = _.snakeCase(domainFieldName);
    return new ColumnMap(domainFieldName, domainFieldName);
  }

  /**
   * Returns a ColumnMap with default domainFieldName inferred using given tableColumnKey.
   * @param tableColumnKey Key to table column.
   * @returns ColumnMap.
   */
  static usingColumn(tableColumnKey: string) {
    return new ColumnMap(tableColumnKey, tableColumnKey);
  }

  matchByDomain(domainObjectField: string): boolean {
    return this.domainFieldName == domainObjectField;
  }

  matchByTable(tableColumnKey: string): boolean {
    return this.tableColumnKey === tableColumnKey;
  }
}

export type AllMetadataFieldTypes = ColumnMap;
