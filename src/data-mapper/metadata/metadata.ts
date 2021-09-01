import { Table } from "../table";
import { ID_COLUMN_NAME } from "../types";
import { ColumnMap } from "./columnMap";
import { ManualObjectMap } from "./manualObjectMap";
import { ForeignKeyMap, RelationType } from "./foreignKeyMap";
import { ManualColumnMap } from "./manualColumnMap";
import { MetaDataObjectType } from "./types";
import { DataMapper } from "..";
import { SingleTableInheritanceMap } from "./singleTableInheritanceMap";

export class MetaData {
  domainKey: string;
  metadataFields: Array<AllMetadataFieldTypes> = [];

  generateMetaData<T extends typeof Table>(
    options: MetaData.GenerateMetaDataOptions<T>
  ) {
    const customInheritanceOptions =
      options.customInheritanceOptions || MetaData.TableInheritance.NONE;

    this.domainKey = options.domainKey;
    if (customInheritanceOptions === MetaData.TableInheritance.NONE) {
      this.generateRegularMetaData(options);
    } else if (
      customInheritanceOptions.variant ===
      MetaData.TableInheritance.SINGLE_TABLE
    ) {
      this.generateSingleTableInheritanceMetaData(options);
    }
  }

  private generateRegularMetaData<T extends typeof Table>({
    Table,
    customColumnMap = {},
    customObjectMap = {},
    belongsTo = {},
    hasOne = {},
    hasMany = {},
  }: MetaData.GenerateMetaDataOptions<T>) {
    const tableColumnsUsedByManualObjectMap = customObjectMap.domainObjectFields
      ? Object.values(customObjectMap.domainObjectFields)
          .flatMap((obj) => Object.values(obj))
          .flatMap((obj) =>
            typeof obj.tableColumns === "string"
              ? [obj.tableColumns]
              : obj.tableColumns
          )
      : [];

    const unneededColumns = new Set([
      ...Object.keys(customColumnMap),
      ...tableColumnsUsedByManualObjectMap,
    ]);

    this.setupImplicitColumnMap(Table, unneededColumns);

    this.setupColumnMap(customColumnMap);

    this.setupManualObjectMap(customObjectMap);

    this.setupRelations(belongsTo, hasOne, hasMany);
  }

  private setupImplicitColumnMap<T extends typeof Table>(
    Table: T,
    unneededColumns: Set<string>
  ) {
    for (const [columnName, _columnAttributes] of Object.entries(
      Table.columns
    )) {
      // ignore foreign keys when generating metadata
      // relationships are added manually at the metadata level
      if (Table.isForeignKey(columnName)) {
        continue;
      }

      // don't generate default column map if table column has its customized map
      if (unneededColumns.has(columnName)) {
        continue;
      }

      this.metadataFields.push(ColumnMap.usingColumn(columnName));
    }
    this.metadataFields.push(ColumnMap.usingColumn(ID_COLUMN_NAME));
  }

  private setupColumnMap(
    customColumnMap: Record<string, string | MetaData.FieldConversionOptions>
  ) {
    for (const [tableColumnKey, value] of Object.entries(customColumnMap)) {
      if (typeof value === "string") {
        this.metadataFields.push(
          new ColumnMap({ tableColumnKey, domainFieldName: value })
        );
      } else if (typeof value === "object") {
        this.metadataFields.push(
          new ManualColumnMap({
            tableColumnKey,
            domainObjectFields: value.domainObjectFields,
            fieldConversionFunction: value.fieldConversionFunction,
          })
        );
      } else {
        throw new Error(
          "expecting either a domain field name or a conversion function"
        );
      }
    }
  }

  private setupManualObjectMap(customObjectMap: MetaData.ManualObjectOptions) {
    if (customObjectMap.domainObjectFields) {
      for (const [domainFieldName, tableColumns] of Object.entries(
        customObjectMap.domainObjectFields
      )) {
        this.metadataFields.push(
          ManualObjectMap.generateUsingCollapseStrategy({
            domainField: domainFieldName,
            tableColumns,
          })
        );
      }
    }
  }

  private setupRelations(
    belongsTo: Record<string, MetaData.RelationOptionsWithoutName>,
    hasOne: Record<string, MetaData.RelationOptionsWithoutName>,
    hasMany: Record<string, MetaData.RelationOptionsWithoutName>
  ) {
    for (const [key, options] of Object.entries(belongsTo)) {
      this.belongsTo({ relationName: key, ...options });
    }
    for (const [key, options] of Object.entries(hasOne)) {
      this.hasOne({ relationName: key, ...options });
    }
    for (const [key, options] of Object.entries(hasMany)) {
      this.hasMany({ relationName: key, ...options });
    }
  }

  private setupSingleTableInheritanceMap({
    ParentMapper,
  }: MetaData.SingleTableInheritanceOptions) {
    if (ParentMapper) {
      this.metadataFields.push(new SingleTableInheritanceMap(ParentMapper));
    }
  }

  private generateSingleTableInheritanceMetaData<T extends typeof Table>({
    Table,
    customColumnMap = {},
    customObjectMap = {},
    belongsTo = {},
    hasOne = {},
    hasMany = {},
    customInheritanceOptions,
  }: MetaData.GenerateMetaDataOptions<T>) {
    this.setupSingleTableInheritanceMap(
      customInheritanceOptions as MetaData.SingleTableInheritanceOptions
    );

    this.setupColumnMap(customColumnMap);
  }

  belongsTo(options: MetaData.RelationOptions) {
    this.metadataFields.push(
      new ForeignKeyMap({
        relationType: RelationType.BELONGS_TO,
        domainKey: this.domainKey,
        ...options,
      })
    );
  }

  hasOne(options: MetaData.RelationOptions) {
    this.metadataFields.push(
      new ForeignKeyMap({
        relationType: RelationType.HAS_ONE,
        domainKey: this.domainKey,
        ...options,
      })
    );
  }

  hasMany(options: MetaData.RelationOptions) {
    this.metadataFields.push(
      new ForeignKeyMap({
        relationType: RelationType.HAS_MANY,
        domainKey: this.domainKey,
        ...options,
      })
    );
  }

  addColumnMap(options: ColumnMap.ConstructorOptions) {
    this.metadataFields.push(new ColumnMap(options));
  }

  findByDomain(domainObjectField: string): AllMetadataFieldTypes | null {
    return (
      this.metadataFields
        .filter(
          (field) =>
            field.variant === MetaDataObjectType.COLUMN_MAP ||
            field.variant === MetaDataObjectType.FOREIGN_KEY_MAP
        )
        .find((field) =>
          (field as ColumnMap | ForeignKeyMap).matchByDomain(domainObjectField)
        ) || null
    );
  }

  findByTable(tableColumnKey: string): AllMetadataFieldTypes | null {
    return (
      this.metadataFields
        .filter(
          (field) =>
            field.variant === MetaDataObjectType.COLUMN_MAP ||
            field.variant === MetaDataObjectType.FOREIGN_KEY_MAP
        )
        .find((field) =>
          (field as ColumnMap | ForeignKeyMap).matchByTable(tableColumnKey)
        ) || null
    );
  }
}

export namespace MetaData {
  export enum TableInheritance {
    NONE,
    SINGLE_TABLE,
  }

  export interface SingleTableInheritanceOptions {
    variant: TableInheritance.SINGLE_TABLE;
    ParentMapper: typeof DataMapper | null; // null indicates root mapper
  }

  export interface GenerateMetaDataOptions<T extends typeof Table> {
    domainKey: string;
    Table: T;
    /**
     * A mapping of tableColumnName to domainFieldName
     */
    /**
     * tableColumns has the format:
     * tableColumnKey: {
     *  fieldConversionFunction: obj => value;
     * }
     */
    customColumnMap?: Record<string, string | FieldConversionOptions>;
    /**
     * A mapping of domainFieldName to multiple table columns
     */
    customObjectMap?: ManualObjectOptions;
    /**
     * A mapping of relationName to options
     */
    belongsTo?: Record<string, MetaData.RelationOptionsWithoutName>;
    hasOne?: Record<string, MetaData.RelationOptionsWithoutName>;
    hasMany?: Record<string, MetaData.RelationOptionsWithoutName>;
    customInheritanceOptions?:
      | TableInheritance.NONE
      | SingleTableInheritanceOptions;
  }

  export interface RelationOptionsWithoutName {
    foreignKey?: string; // tableColumnKey acting as the foreignKey
    otherDomainKey?: string;
  }

  export interface RelationOptions extends RelationOptionsWithoutName {
    relationName: string;
  }

  /**
   * A function that converts a bunch of table column values to a domain field value.
   */
  export type ColumnConversionFunction = (...columnValues: Array<any>) => any;
  export interface ColumnConversionOptions {
    tableColumns: string | Array<string>;
    columnConversionFunction: ColumnConversionFunction;
  }
  export interface FieldConversionOptions {
    domainObjectFields: string | Array<string>;
    fieldConversionFunction: (domainObj: any) => any;
  }
  export var Identity = (ele: any) => ele;
  export type ManualObjectOptions = {
    conversionFunction?: ManualObjectMap.ConversionFunction;
    /**
     * domainObjectFields has the format:
     * domainFieldName: {
     *  domainSubfield1: {
     *   tableColumns: [col1, col2],
     *   columnConversionFunction: ([col1, col2]) => value;
     *  }
     *  domainSubfield2: {
     *   tableColumns: col1
     *   columnConversionFunction: Metadata.Identity
     *  }
     * }
     */
    domainObjectFields?: Record<
      string,
      Record<string, ColumnConversionOptions>
    >;
  };
}
export type AllMetadataFieldTypes =
  | ColumnMap
  | ForeignKeyMap
  | ManualObjectMap
  | ManualColumnMap
  | SingleTableInheritanceMap;
