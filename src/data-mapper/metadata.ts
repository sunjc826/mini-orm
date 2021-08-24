import { addIdToName, stripHasManyRelation } from "../helpers";
import { registry } from "../registry";
import { Table } from "./table";
import { ID_COLUMN_NAME } from "./types";

export enum MetaDataObjectType {
  COLUMN_MAP,
  FOREIGN_KEY_MAP,
}

export class MetaData {
  domainKey: string;
  metadataFields: Array<AllMetadataFieldTypes> = [];

  static generateDefaultMetaData<T extends typeof Table>(
    domainKey: string,
    Table: T
  ): MetaData {
    const metadata = new MetaData();
    metadata.domainKey = domainKey;
    for (const [columnName, columnAttributes] of Object.entries(
      Table.columns
    )) {
      // ignore foreign keys when generating metadata
      // relationships are added manually at the metadata level
      if (!Table.isForeignKey(columnName)) {
        metadata.metadataFields.push(ColumnMap.usingColumn(columnName));
      }
    }
    metadata.metadataFields.push(ColumnMap.usingColumn(ID_COLUMN_NAME));

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

export declare namespace MetaData {
  export interface RelationOptionsWithoutName {
    foreignKey?: string; // tableColumnKey acting as the foreignKey
    otherDomainKey?: string;
  }

  export interface RelationOptions extends RelationOptionsWithoutName {
    relationName: string;
  }
}

export abstract class AllMetadataField {
  abstract variant: MetaDataObjectType;
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
  variant = MetaDataObjectType.COLUMN_MAP as const;
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

export enum RelationType {
  BELONGS_TO,
  HAS_ONE,
  HAS_MANY,
}

export class ForeignKeyMap extends AllMetadataField {
  variant = MetaDataObjectType.FOREIGN_KEY_MAP as const;
  foreignKey: string; // tableColumnKey acting as the foreignKey
  relationName: string;
  relationType: RelationType;
  domainKey: string; // own domainKey
  otherDomainKey: string;

  constructor({
    relationType,
    relationName,
    domainKey,
    otherDomainKey,
    foreignKey,
  }: ForeignKeyMap.ConstructorOptions) {
    super();
    this.relationType = relationType;
    this.relationName = relationName;
    this.domainKey = domainKey;
    this.otherDomainKey = otherDomainKey || this.guessOtherDomainKey();
    this.foreignKey = foreignKey || this.guessForeignKey();
  }

  /**
   * Checks if the foreignKey is valid, i.e. whether it actually belongs on a domain object.
   * @returns Whether foreignKey field is valid.
   */
  isValid(): boolean {
    const Table = registry.getTable(this.domainKey);
    const OtherTable = registry.getTable(this.otherDomainKey);
    switch (this.relationType) {
      case RelationType.BELONGS_TO: {
        return Table.isForeignKey(this.foreignKey);
      }
      case RelationType.HAS_ONE:
      case RelationType.HAS_MANY: {
        return OtherTable.isForeignKey(this.foreignKey);
      }
      default: {
        throw new Error("unexpected relation type");
      }
    }
  }

  private guessOtherDomainKey(): string {
    switch (this.relationType) {
      case RelationType.BELONGS_TO:
      case RelationType.HAS_ONE: {
        return this.relationName;
      }
      case RelationType.HAS_MANY: {
        return stripHasManyRelation(this.relationName);
      }
      default: {
        throw new Error("unexpected relation type");
      }
    }
  }

  private guessForeignKey(): string {
    let foreignKey: string;
    switch (this.relationType) {
      case RelationType.BELONGS_TO: {
        // assume relationName is foreignKey without the trailing "Id"
        foreignKey = addIdToName(this.relationName);
        break;
      }
      case RelationType.HAS_ONE:
      case RelationType.HAS_MANY: {
        foreignKey = addIdToName(this.domainKey);
        break;
      }
      default: {
        throw new Error("unexpected relation type");
      }
    }
    return foreignKey;
  }

  matchByDomain(domainObjectField: string): boolean {
    return false;
  }
  matchByTable(tableColumnKey: string): boolean {
    return false;
  }
}

export declare namespace ForeignKeyMap {
  export interface ConstructorOptions extends MetaData.RelationOptions {
    relationType: RelationType;
    domainKey: string; // own domainKey
  }
}

export type AllMetadataFieldTypes = ColumnMap | ForeignKeyMap;
