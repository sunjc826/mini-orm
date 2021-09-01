import { Table } from "../table";
import { MetaData } from "./metadata";
import { AllMetadataField, MetaDataObjectType } from "./types";
// TODO: Another possible extension to embedded object map is serialized large object.
// This can be another default strategy.
// TODO: A further improvement to the embedded object map is to allow arbitrary levels of nesting.
/**
 * Encapsulates a mapping in the form of many db table columns : one/many domain object fields.
 */
export class ManualObjectMap extends AllMetadataField {
  variant = MetaDataObjectType.MANUAL_OBJECT_MAP as const;
  conversionFunction: ManualObjectMap.ConversionFunction;

  /**
   * Probably the most general form of column to field mapping. Conversion function allows
   * for a very high level of user customization. Effectively, using this constructor allows
   * the user to directly determine how to map the table row into a domain object.
   * @param conversionFunction A function that takes in a tableObject and domainObject,
   *  and maps fields from tableObject to domainObject.
   */
  constructor({ conversionFunction }: ManualObjectMap.ConstructorOptions) {
    super();
    this.conversionFunction = conversionFunction;
  }

  /**
   * Collapses or aggregates the given table columns into a single domain field.
   * @param tableColumns A collection of table columns.
   * @param domainField Domain field the table columns are to be grouped in.
   */
  static generateUsingCollapseStrategy({
    tableColumns,
    domainField,
  }: ManualObjectMap.GenerateUsingCollapseStrategyOptions) {
    const conversionFunction = (
      tableObject: Record<string, any>,
      domainObject: Record<string, any>
    ) => {
      domainObject[domainField] = {};
      for (const [
        domainSubfield,
        { tableColumns: columnKeys, columnConversionFunction },
      ] of Object.entries(tableColumns)) {
        if (typeof columnKeys === "string") {
          domainObject[domainField][domainSubfield] = columnConversionFunction(
            tableObject[columnKeys]
          );
        } else {
          const args = columnKeys.map((key) => tableObject[key]);
          domainObject[domainField][domainSubfield] =
            columnConversionFunction(args);
        }
      }
    };

    return new ManualObjectMap({
      conversionFunction,
    });
  }

  processObject(tableObj: Record<string, any>, domainObj: Record<string, any>) {
    this.conversionFunction(tableObj, domainObj);
  }

  // TODO
  /**
   * Converts the serialized data referenced by the given table column to a domain field.
   * Serialization methods include hstore and json.
   * @param tableColumn
   * @param domainField
   */
  static generateUsingSerializedObject({
    tableColumn,
    domainField,
  }: ManualObjectMap.GenerateUsingSerializedObjectOptions) {}
}

export namespace ManualObjectMap {
  export type ConversionFunction = (
    tableObject: Record<string, string>,
    domainObject: Record<string, any>
  ) => void;

  export type ConstructorOptions = {
    conversionFunction: ConversionFunction;
  };

  export interface GenerateUsingCollapseStrategyOptions {
    tableColumns: Record<string, MetaData.ColumnConversionOptions>;
    domainField: string;
  }

  export interface GenerateUsingSerializedObjectOptions {
    tableColumn: string;
    domainField: string;
  }
}
