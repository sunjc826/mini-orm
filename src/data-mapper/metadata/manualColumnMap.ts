import { Table } from "../../table";
import { AllMetadataField, MetaDataObjectType } from "./types";

/**
 * This mapping is purely for mapping domain fields to a single table column value.
 */
export class ManualColumnMap extends AllMetadataField {
  variant = MetaDataObjectType.MANUAL_COLUMN_MAP as const;
  tableColumnKey: string;
  domainObjectFields: string | Array<string>; // a list of dependencies
  fieldConversionFunction: ManualColumnMap.ConversionFunction;

  constructor({
    tableColumnKey,
    domainObjectFields,
    fieldConversionFunction,
  }: ManualColumnMap.ConstructorOptions) {
    super();
    this.tableColumnKey = tableColumnKey;
    this.domainObjectFields = domainObjectFields;
    this.fieldConversionFunction = fieldConversionFunction;
  }

  matchByTable(tableColumnKey: string): boolean {
    return this.tableColumnKey === tableColumnKey;
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
        this.fieldConversionFunction(domainObj)
      )
    );
  }

  processUpdateSql(
    domainObject: Record<string, any>,
    TableClass: typeof Table,
    sqlArr: Array<string>
  ) {
    const actualDbColumnName = TableClass.getDbColumnName(this.tableColumnKey);
    const dependencies =
      typeof this.domainObjectFields === "string"
        ? [this.domainObjectFields]
        : this.domainObjectFields;
    let requiresUpdate = false;
    for (const dependency of dependencies) {
      if (domainObject.dirtied.has(dependency)) {
        requiresUpdate = true;
        break;
      }
    }
    if (!requiresUpdate) {
      return;
    }
    sqlArr.push(`${actualDbColumnName}=
              ${TableClass.convertColumnValueToSqlString(
                this.tableColumnKey,
                this.fieldConversionFunction(domainObject)
              )}`);
  }
}

export declare namespace ManualColumnMap {
  export type ConversionFunction = (domainObject: any) => any;
  export interface ConstructorOptions {
    tableColumnKey: string;
    domainObjectFields: string | Array<string>;
    fieldConversionFunction: ConversionFunction;
  }
}
