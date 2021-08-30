export enum MetaDataObjectType {
  COLUMN_MAP,
  FOREIGN_KEY_MAP,
  MANUAL_OBJECT_MAP,
  MANUAL_COLUMN_MAP,
}

export abstract class AllMetadataField {
  abstract variant: MetaDataObjectType;
}
