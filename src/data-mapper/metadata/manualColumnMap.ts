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
}

export declare namespace ManualColumnMap {
  export type ConversionFunction = (domainObject: any) => any;
  export interface ConstructorOptions {
    tableColumnKey: string;
    domainObjectFields: string | Array<string>;
    fieldConversionFunction: ConversionFunction;
  }
}
