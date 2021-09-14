import { DataMapper } from "..";
import { Table } from "../../table";
import { AllMetadataField, MetaDataObjectType } from "./types";

export class SingleTableInheritanceMap extends AllMetadataField {
  variant = MetaDataObjectType.SINGLE_TABLE_INHERITANCE_MAP as const;

  ParentMapper: typeof DataMapper;

  constructor(ParentMapper: typeof DataMapper) {
    super();
    this.ParentMapper = ParentMapper;
  }

  processObject(tableObj: Record<string, any>, domainObj: Record<string, any>) {
    this.ParentMapper.mapColumnsToFields(tableObj, domainObj);
  }

  processInsertColumns(TableClass: typeof Table, columnArr: Array<string>) {
    this.ParentMapper.fillInsertColumns(columnArr, TableClass);
  }

  async processInsertSql(
    domainObj: Record<string, any>,
    TableClass: typeof Table,
    valueArr: Array<any>
  ) {
    return this.ParentMapper.mapFieldsToColumns(
      domainObj,
      valueArr,
      TableClass
    );
  }

  async processUpdateSql(
    domainObject: Record<string, any>,
    TableClass: typeof Table,
    sqlArr: Array<string>
  ) {
    return this.ParentMapper.fillUpdateColumns(
      domainObject,
      TableClass,
      sqlArr
    );
  }

  findByDomain(domainObjectField: string) {
    return this.ParentMapper.metadata.findByDomain(domainObjectField);
  }
}
