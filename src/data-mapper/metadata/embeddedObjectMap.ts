import { AllMetadataField, MetaDataObjectType } from "./types";
// TODO: Another possible extension to embedded object map is serialized large object.
// This can be another default strategy.
/**
 * Encapsulates a mapping in the form of many db table columns : one/many domain object fields.
 */
export class EmbeddedObjectMap extends AllMetadataField {
  variant = MetaDataObjectType.EMBEDDED_OBJECT_MAP;
  conversionFunction: EmbeddedObjectMap.ConversionFunction;

  /**
   * Probably the most general form of column to field mapping. Conversion function allows
   * for a very high level of user customization.
   * @param conversionFunction A function that takes in a tableObject and domainObject,
   *  and maps fields from tableObject to domainObject.
   */
  constructor(conversionFunction: EmbeddedObjectMap.ConstructorOptions) {
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
  }: EmbeddedObjectMap.GenerateUsingCollapseStrategyOptions) {
    const conversionFunction = (
      tableObject: Record<string, string>,
      domainObject: Record<string, any>
    ) => {
      domainObject[domainField] = {};
      for (const column of tableColumns) {
        domainObject[domainField][column] = tableObject[column];
      }
    };

    return new EmbeddedObjectMap(conversionFunction);
  }
}

export namespace EmbeddedObjectMap {
  export declare type ConversionFunction = (
    tableObject: Record<string, string>,
    domainObject: Record<string, any>
  ) => void;
  export declare type ConstructorOptions = ConversionFunction;

  export declare interface GenerateUsingCollapseStrategyOptions {
    tableColumns: Array<string>;
    domainField: string;
  }
}
