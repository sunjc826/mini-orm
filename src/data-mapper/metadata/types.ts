export enum MetaDataObjectType {
  COLUMN_MAP,
  FOREIGN_KEY_MAP,
  EMBEDDED_OBJECT_MAP,
}

export abstract class AllMetadataField {
  abstract variant: MetaDataObjectType;
}
