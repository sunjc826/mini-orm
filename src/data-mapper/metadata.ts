import { Table } from "./table";
import { ID_COLUMN_NAME } from "./types";

export namespace MetaDataObjectTypes {
  export const columnMap = "columnMap" as const;
  export type columnMap = typeof columnMap;
  export type allTypes = columnMap;
}

export type MetaDataObject =
  | string
  | {
      variant: MetaDataObjectTypes.columnMap;
      tableColumnKey: string;
      domainFieldName: string;
    };

export class MetaData {
  metadataFields: Array<AllMetadataFieldTypes> = [];

  static generateDefaultMetaData<T extends typeof Table>(Table: T): MetaData {
    const metadata = new MetaData();
    for (const columnName of Object.keys(Table.columns)) {
      metadata.metadataFields.push(ColumnMap.usingColumn(columnName));
    }
    metadata.metadataFields.push(ColumnMap.usingColumn(ID_COLUMN_NAME));
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

export abstract class AllMetadataField {
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
