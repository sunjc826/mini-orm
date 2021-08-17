import _ from "lodash";
import { DbClient } from "src/connect";

class DataMapper {
  // TODO: config
  dbClient = new DbClient({});
  // metadata: MetaData;
  constructor(metadata?: Array<MetaDataObject>) {

  }

}



type MetaDataObject = string | {
  variant: "column";
 tableColumnName: string;
 domainFieldName: string; 
};

// the most basic column mapping, 1:1
class ColumnMap {
  tableColumnName: string;
  domainFieldName: string;

  constructor(tableColumnName: string, domainFieldName: string) {
    this.tableColumnName = tableColumnName;
    this.domainFieldName = domainFieldName;
  }

  static columnFor(domainFieldName: string) {
    const tableColumnName = _.snakeCase(domainFieldName);
    return new ColumnMap(tableColumnName, domainFieldName);
  }

  static fieldFor(tableColumnName: string) {
    const domainFieldName = _.camelCase(tableColumnName);
    return new ColumnMap(tableColumnName, domainFieldName);
  }
}