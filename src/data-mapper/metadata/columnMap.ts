import { Table } from "../../table";
import { AllMetadataField, MetaDataObjectType } from "./types";

/**
 * Encapsulates the most basic column mapping, 1 db table column : 1 domain object field
 */
export class ColumnMap extends AllMetadataField {
  variant = MetaDataObjectType.COLUMN_MAP as const;
  tableColumnKey: string;
  domainFieldName: string;

  constructor({
    tableColumnKey,
    domainFieldName,
  }: ColumnMap.ConstructorOptions) {
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
    return new ColumnMap({ tableColumnKey: domainFieldName, domainFieldName });
  }

  /**
   * Returns a ColumnMap with default domainFieldName inferred using given tableColumnKey.
   * @param tableColumnKey Key to table column.
   * @returns ColumnMap.
   */
  static usingColumn(tableColumnKey: string) {
    return new ColumnMap({ tableColumnKey, domainFieldName: tableColumnKey });
  }

  /**
   * Returns whether this metadatafield corresponds to the given field.
   * @param domainObjectField Name of a field on the domain object.
   */
  matchByDomain(domainObjectField: string): boolean {
    return this.domainFieldName == domainObjectField;
  }

  matchByTable(tableColumnKey: string): boolean {
    return this.tableColumnKey === tableColumnKey;
  }

  processObject(tableObj: Record<string, any>, domainObj: Record<string, any>) {
    domainObj[this.domainFieldName] = tableObj[this.tableColumnKey];
  }

  processInsertColumns(TableClass: typeof Table, columnArr: Array<string>) {
    const actualDbColumnName = TableClass.getDbColumnName(this.tableColumnKey);
    columnArr.push(actualDbColumnName);
  }

  processInsertSql(
    domainObj: Record<string, any>,
    TableClass: typeof Table,
    valueArr: Array<any>
  ) {
    valueArr.push(
      TableClass.convertColumnValueToSqlString(
        this.tableColumnKey,
        domainObj[this.domainFieldName]
      )
    );
  }

  processUpdateSql(
    domainObj: Record<string, any>,
    TableClass: typeof Table,
    sqlArr: Array<string>
  ) {
    if (!domainObj.dirtied.has(this.domainFieldName)) {
      return;
    }
    const actualDbColumnName = TableClass.getDbColumnName(this.tableColumnKey);
    sqlArr.push(`${actualDbColumnName}=
      ${TableClass.convertColumnValueToSqlString(
        this.tableColumnKey,
        domainObj[this.domainFieldName]
      )}`);
  }
}

export declare namespace ColumnMap {
  export interface ConstructorOptions {
    tableColumnKey: string;
    domainFieldName: string;
  }
}
