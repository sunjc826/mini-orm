import _ from "lodash";
import { DbClient } from "../connect";
import { Constructor } from "../types";

interface ConstructorParams {
  TableClass: Constructor<Table>;
  metadata?: Array<MetaDataObject>;
}

export abstract class DataMapper {
  // TODO: config
  dbClient = new DbClient({});
  metadata: MetaData;

  constructor({ TableClass: tableClass, metadata }: ConstructorParams) {
    // strategy: use tableClass to generate default metadata, merge with given metadata
    if (!metadata) {
      this.metadata = MetaData.generateDefaultMetaData(tableClass);
    }
  }

  findObjectsWhere(query: string) {
    const resultSet = this.dbClient.query(query);
  }

  // static generateDefaultDomainObject(TableClass: Constructor<Table>) {
  //   const table = new TableClass();
  //   const DefaultDomainObj = class {
  //     [fieldName: string]: any;
  //   };
  //   for (const columnName of Object.keys(table)) {
  //     DefaultDomainObj[_.camelCase(columnName)];
  //   }
  // }
}

type MetaDataObject =
  | string
  | {
      variant: "column";
      tableColumnName: string;
      domainFieldName: string;
    };

class MetaData {
  static ID_COLUMN_NAME = "id";

  metadataFields: Array<MetaDataField> = [];

  // active-record like, maps columns by camelCasing
  static generateDefaultMetaData(TableClass: Constructor<Table>): MetaData {
    const metadata = new MetaData();
    const table = new TableClass();
    for (const columnName of Object.keys(table)) {
      metadata.metadataFields.push(ColumnMap.usingColumn(columnName));
    }
    metadata.metadataFields.push(
      ColumnMap.usingColumn(MetaData.ID_COLUMN_NAME)
    );
    return metadata;
  }
}

class MetaDataField {}

// the most basic column mapping, 1:1
class ColumnMap extends MetaDataField {
  tableColumnName: string;
  domainFieldName: string;

  constructor(tableColumnName: string, domainFieldName: string) {
    super();
    this.tableColumnName = tableColumnName;
    this.domainFieldName = domainFieldName;
  }

  static usingDomainField(domainFieldName: string) {
    const tableColumnName = _.snakeCase(domainFieldName);
    return new ColumnMap(tableColumnName, domainFieldName);
  }

  static usingColumn(tableColumnName: string) {
    const domainFieldName = _.camelCase(tableColumnName);
    return new ColumnMap(tableColumnName, domainFieldName);
  }
}

export abstract class Table {
  tableName: string;
}
