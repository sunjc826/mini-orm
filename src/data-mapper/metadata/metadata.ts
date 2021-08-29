import { Table } from "../table";
import { ID_COLUMN_NAME } from "../types";
import { ColumnMap } from "./columnMap";
import { ForeignKeyMap, RelationType } from "./foreignKeyMap";
import { MetaDataObjectType } from "./types";

export class MetaData {
  domainKey: string;
  metadataFields: Array<AllMetadataFieldTypes> = [];

  static generateDefaultMetaData<T extends typeof Table>({
    domainKey,
    Table,
    customColumnMap,
  }: MetaData.GenerateDefaultMetaDataOptions<T>): MetaData {
    const metadata = new MetaData();
    metadata.domainKey = domainKey;
    for (const [columnName, _columnAttributes] of Object.entries(
      Table.columns
    )) {
      // ignore foreign keys when generating metadata
      // relationships are added manually at the metadata level
      if (Table.isForeignKey(columnName)) {
        continue;
      }

      // don't generate default column map is table column has its customized map
      if (columnName in customColumnMap) {
        continue;
      }

      metadata.metadataFields.push(ColumnMap.usingColumn(columnName));
    }
    metadata.metadataFields.push(ColumnMap.usingColumn(ID_COLUMN_NAME));

    for (const [tableColumnKey, domainFieldName] of Object.entries(
      customColumnMap
    )) {
      metadata.metadataFields.push(
        new ColumnMap({ tableColumnKey, domainFieldName })
      );
    }

    return metadata;
  }

  belongsTo({
    relationName,
    foreignKey,
    otherDomainKey,
  }: MetaData.RelationOptions) {
    this.metadataFields.push(
      new ForeignKeyMap({
        relationType: RelationType.BELONGS_TO,
        relationName,
        foreignKey,
        domainKey: this.domainKey,
        otherDomainKey,
      })
    );
  }

  hasOne({
    relationName,
    foreignKey,
    otherDomainKey,
  }: MetaData.RelationOptions) {
    this.metadataFields.push(
      new ForeignKeyMap({
        relationType: RelationType.HAS_ONE,
        relationName,
        foreignKey,
        domainKey: this.domainKey,
        otherDomainKey,
      })
    );
  }

  hasMany({
    relationName,
    foreignKey,
    otherDomainKey,
  }: MetaData.RelationOptions) {
    this.metadataFields.push(
      new ForeignKeyMap({
        relationType: RelationType.HAS_MANY,
        relationName,
        foreignKey,
        domainKey: this.domainKey,
        otherDomainKey,
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

export declare namespace MetaData {
  export interface GenerateDefaultMetaDataOptions<T extends typeof Table> {
    domainKey: string;
    Table: T;
    /**
     * A mapping of tableColumnName to domainFieldName
     */
    customColumnMap: Record<string, string>;
  }

  export interface RelationOptionsWithoutName {
    foreignKey?: string; // tableColumnKey acting as the foreignKey
    otherDomainKey?: string;
  }

  export interface RelationOptions extends RelationOptionsWithoutName {
    relationName: string;
  }
}
export type AllMetadataFieldTypes = ColumnMap | ForeignKeyMap;
