import { registry } from "../..";
import { stripHasManyRelation, addIdToName } from "../../helpers";
import { MetaData } from "./metadata";
import { AllMetadataField, MetaDataObjectType } from "./types";

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
    return domainObjectField === this.foreignKey;
  }
  matchByTable(tableColumnKey: string): boolean {
    return tableColumnKey === this.foreignKey;
  }
}

export declare namespace ForeignKeyMap {
  export interface ConstructorOptions extends MetaData.RelationOptions {
    relationType: RelationType;
    domainKey: string; // own domainKey
  }
}
