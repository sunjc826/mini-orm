import { stripHasManyRelation, addIdToName } from "../../helpers/string";
import { Promisify } from "../../helpers/types";
import { Query } from "../../repository/query";
import { getVirtualDomainObject } from "../lazyLoad";
import { Table } from "../../table";
import { MetaData } from ".";
import { AllMetadataField, MetaDataObjectType } from "./types";
import { registry } from "../../registry";
import { DomainObject } from "../../domain";

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

  processObject(tableObj: Record<string, any>, domainObj: Record<string, any>) {
    switch (this.relationType) {
      case RelationType.BELONGS_TO: {
        domainObj[this.relationName] = getVirtualDomainObject({
          domainKey: this.otherDomainKey,
          knownId: tableObj[this.foreignKey],
          isSingle: true,
        });
        break;
      }
      case RelationType.HAS_ONE: {
        const query: Query = new Query(this.otherDomainKey);
        query.where({
          domainObjectField: this.foreignKey,
          value: tableObj["id"],
        });
        domainObj[this.relationName] = getVirtualDomainObject({
          domainKey: this.otherDomainKey,
          loader: query,
          isSingle: true,
        });
        break;
      }
      case RelationType.HAS_MANY: {
        const query: Query = new Query(this.otherDomainKey);
        query.where({
          domainObjectField: this.foreignKey,
          value: tableObj["id"],
        });
        domainObj[this.relationName] = getVirtualDomainObject({
          domainKey: this.otherDomainKey,
          loader: query,
          isSingle: false,
        });
        break;
      }

      default: {
        throw new Error("unexpected metadata object type");
      }
    }
  }

  processInsertColumns(TableClass: typeof Table, columnArr: Array<string>) {
    if (this.relationType === RelationType.BELONGS_TO) {
      const actualDbColumnName = TableClass.getDbColumnName(this.foreignKey);
      columnArr.push(actualDbColumnName);
    }
  }

  async processInsertSql(domainObj: Record<string, any>, valueArr: Array<any>) {
    if (this.relationType === RelationType.BELONGS_TO) {
      // the reason why we use await here is that the object
      // may be a virtual proxy (for which await is needed) or a regular object.
      valueArr.push(
        await (domainObj[this.relationName] as Promisify<DomainObject>).id
      );
    }
  }

  async processUpdateSql(
    domainObject: Record<string, any>,
    TableClass: typeof Table,
    sqlArr: Array<string>
  ) {
    if (this.relationType === RelationType.BELONGS_TO) {
      if (!domainObject.dirtied.has(this.relationName)) {
        return;
      }
      const actualDbColumnName = TableClass.getDbColumnName(this.foreignKey);

      // the reason why we use await here is that the object
      // may be a virtual proxy (for which await is needed) or a regular object.
      sqlArr.push(`${actualDbColumnName}=
        ${await (domainObject[this.relationName] as Promisify<DomainObject>).id}
      `);
    }
  }
}

export declare namespace ForeignKeyMap {
  export interface ConstructorOptions extends MetaData.RelationOptions {
    relationType: RelationType;
    domainKey: string; // own domainKey
  }
}
