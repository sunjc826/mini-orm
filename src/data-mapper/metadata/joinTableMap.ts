import { Table } from "../table";
import { AllMetadataField, MetaDataObjectType } from "./types";

// TODO
export class JoinTableMap extends AllMetadataField {
  variant: MetaDataObjectType;
  domainKeyPair: [string, string];
  joinTable: typeof Table;
  constructor({ domainKeyPair, joinTable }: JoinTableMap.ConstructorOptions) {
    super();
    this.domainKeyPair = domainKeyPair;
    this.joinTable = joinTable;
  }
}

export declare namespace JoinTableMap {
  export interface ConstructorOptions {
    domainKeyPair: [string, string];
    joinTable: typeof Table;
  }
}
