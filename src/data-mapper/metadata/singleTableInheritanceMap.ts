import { DataMapper } from "..";
import { AllMetadataField, MetaDataObjectType } from "./types";

export class SingleTableInheritanceMap extends AllMetadataField {
  variant = MetaDataObjectType.SINGLE_TABLE_INHERITANCE_MAP as const;

  ParentMapper: typeof DataMapper;

  constructor(ParentMapper: typeof DataMapper) {
    super();
    this.ParentMapper = ParentMapper;
  }

  processObject(
    tableObj: Record<string, any>,
    domainObj: Record<string, any>
  ) {}
}
