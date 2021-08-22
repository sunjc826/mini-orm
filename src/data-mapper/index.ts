import _ from "lodash";
import { DbClient, ResultSet } from "../connect";
import { DomainObject } from "../domain";
import {
  dbColumnNameToColumnKey,
  extractDomainKeyFromTable,
  splitResultSetColumnName,
} from "../helpers";
import { Constructor } from "../helpers/types";
import { registry } from "../registry";
import { getVirtualDomainObject } from "./lazyLoad";
import { MetaDataObject, MetaData, MetaDataObjectTypes } from "./metadata";
import { Table } from "./table";

namespace DataMapper {
  export interface ConstructorParams {
    TableClass: Constructor<Table>;
    metadata?: Array<MetaDataObject>;
  }
}

export abstract class DataMapper {
  // TODO: config
  static domainKey: string;
  static dbClient: DbClient;
  static metadata: MetaData;

  // constructor({ TableClass, metadata }: DataMapper.ConstructorParams) {
  //   if (!metadata) {
  //     this.metadata = MetaData.generateDefaultMetaData(TableClass);
  //   }
  // }

  /**
   * Returns a result set when given a sql query.
   * @param sql Sql query string.
   */
  static async select(sql: string): Promise<Array<DomainObject>> {
    const resultSet = await this.dbClient.query(sql);
    return this.resultSetToDomainObjects(resultSet);
  }

  /**
   * Converts db rows to domain objects.
   * @param resultSet
   */
  private static resultSetToDomainObjects(resultSet: ResultSet<any>) {
    const domainObjects = resultSet.map((row) => {
      const tableColumnMap: Record<string, any> = {};
      let requestedDomainObj: DomainObject | null = null;
      for (const [column, value] of Object.entries(row)) {
        /**
         * A map of the form
         * [tableKey] {
         *  [columnKey]: [value]
         * }
         */
        const { tableName, dbColName } = splitResultSetColumnName(column);
        // here, we are aggregating all the properties related to a single table
        // before creating the domain object
        tableColumnMap[extractDomainKeyFromTable(tableName)] ||= {};
        tableColumnMap[extractDomainKeyFromTable(tableName)][
          dbColumnNameToColumnKey(dbColName)
        ] = value;
      }

      // create the domain objects
      for (const [domainKey, tableObj] of Object.entries(tableColumnMap)) {
        const Mapper = registry.getMapper(domainKey);
        const DomainObj = registry.getDomainObject(domainKey);
        const Table = registry.getTable(domainKey);
        const domainObj: Record<string, any> = {};
        for (const [tableColumnKey, value] of Object.entries(tableObj)) {
          // TODO: O(n^2) find here, kinda bad.
          let inMemoryValue = value;
          if (Table.isForeignKey(tableColumnKey)) {
            const foreignDomainKey = Table.foreignKeyDomain(tableColumnKey)!;
            inMemoryValue = getVirtualDomainObject(
              foreignDomainKey,
              value as number
            );
          }

          const metadataField = Mapper.metadata.findByTable(tableColumnKey);
          switch (metadataField?.variant) {
            case MetaDataObjectTypes.columnMap: {
              domainObj[metadataField.domainFieldName] = inMemoryValue;
              break;
            }
            default: {
              throw new Error("invalid metadata object");
            }
          }
        }

        const actualDomainObj = new DomainObj(domainObj);
        registry.getIdentityMap().insert(domainKey, actualDomainObj);
        if (domainKey === this.domainKey) {
          requestedDomainObj = actualDomainObj;
        }
      }

      if (!requestedDomainObj) {
        // each row must produce instance of the domain object
        // Note: This may not be the case if right joins are used, so this may need to change in future.
        throw new Error("unexpected missing data from table row");
      }

      return requestedDomainObj;
    });
    return domainObjects;
  }
}

interface CreateMapperOptions<T extends typeof Table> {
  domainKey?: string;
  Table?: T;
}

export function createMapper<T extends typeof Table>({
  domainKey,
  Table,
}: CreateMapperOptions<T>) {
  if (!domainKey && !Table) {
    throw new Error("at least one of domainKey or Table must be supplied");
  }
  // Table takes priority
  const TableClass = Table || registry.getTable(domainKey!);
  const Mapper = class extends DataMapper {};
  // TODO: we generate some default metadata first
  Mapper.metadata = MetaData.generateDefaultMetaData(TableClass);
  return Mapper;
}
export { createTable } from "./table";
