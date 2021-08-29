import { Table } from "../table";
import { ID_COLUMN_NAME } from "../types";
import { ColumnMap } from "./columnMap";
import { EmbeddedObjectMap } from "./embeddedObjectMap";
import { ForeignKeyMap, RelationType } from "./foreignKeyMap";
import { MetaDataObjectType } from "./types";

export class MetaData {
  domainKey: string;
  metadataFields: Array<AllMetadataFieldTypes> = [];

  static generateMetaData<T extends typeof Table>({
    domainKey,
    Table,
    customColumnMap: columnMap = {},
    embeddedObjectMap = {},
    belongsTo = {},
    hasOne = {},
    hasMany = {},
  }: MetaData.GenerateMetaDataOptions<T>): MetaData {
    const metadata = new MetaData();

    metadata.domainKey = domainKey;

    const tableColumnsUsedByEmbeddedObject = embeddedObjectMap.tableColumns
      ? Object.values(embeddedObjectMap.tableColumns).flatMap((obj) =>
          typeof obj.tableColumns === "string"
            ? [obj.tableColumns]
            : obj.tableColumns
        )
      : [];

    for (const [columnName, _columnAttributes] of Object.entries(
      Table.columns
    )) {
      // ignore foreign keys when generating metadata
      // relationships are added manually at the metadata level
      if (Table.isForeignKey(columnName)) {
        continue;
      }

      // don't generate default column map if table column has its customized map
      if (
        columnName in columnMap ||
        columnName in tableColumnsUsedByEmbeddedObject
      ) {
        continue;
      }

      metadata.metadataFields.push(ColumnMap.usingColumn(columnName));
    }
    metadata.metadataFields.push(ColumnMap.usingColumn(ID_COLUMN_NAME));

    for (const [tableColumnKey, domainFieldName] of Object.entries(columnMap)) {
      metadata.metadataFields.push(
        new ColumnMap({ tableColumnKey, domainFieldName })
      );
    }

    if (embeddedObjectMap.conversionFunction) {
      metadata.metadataFields.push(
        new EmbeddedObjectMap(embeddedObjectMap.conversionFunction)
      );
    }

    if (embeddedObjectMap.tableColumns) {
      for (const [domainFieldName, tableColumns] of Object.entries(
        embeddedObjectMap.tableColumns
      )) {
        metadata.metadataFields.push(
          EmbeddedObjectMap.generateUsingCollapseStrategy({
            domainField: domainFieldName,
            tableColumns,
          })
        );
      }
    }

    for (const [key, options] of Object.entries(belongsTo)) {
      metadata.belongsTo({ relationName: key, ...options });
    }
    for (const [key, options] of Object.entries(hasOne)) {
      metadata.hasOne({ relationName: key, ...options });
    }
    for (const [key, options] of Object.entries(hasMany)) {
      metadata.hasMany({ relationName: key, ...options });
    }

    return metadata;
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
  export interface GenerateMetaDataOptions<T extends typeof Table> {
    domainKey: string;
    Table: T;
    /**
     * A mapping of tableColumnName to domainFieldName
     */
    customColumnMap?: Record<string, string>;
    /**
     * A mapping of domainFieldName to multiple table columns
     */
    embeddedObjectMap?: EmbeddedObjectOptions;
    /**
     * A mapping of relationName to options
     */
    belongsTo?: Record<string, MetaData.RelationOptionsWithoutName>;
    hasOne?: Record<string, MetaData.RelationOptionsWithoutName>;
    hasMany?: Record<string, MetaData.RelationOptionsWithoutName>;
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
  export var Identity = (ele: any) => ele;
  export type EmbeddedObjectOptions = {
    conversionFunction?: EmbeddedObjectMap.ConversionFunction;
    /**
     * tableColumns has the format:
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
    tableColumns?: Record<string, Record<string, ColumnConversionOptions>>;
  };
}
export type AllMetadataFieldTypes =
  | ColumnMap
  | ForeignKeyMap
  | EmbeddedObjectMap;
