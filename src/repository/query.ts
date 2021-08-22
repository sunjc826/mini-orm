import _ from "lodash";
import { ColumnMap, DataMapper } from "../data-mapper";
import { Table } from "../data-mapper/table";
import { formatDbColumn } from "../helpers";
import { registry } from "../registry";
import { EMPTY, Operators } from "./types";

// NOTE: Query objects operate at the Repository layer, which sits on top of the DataMapper
// hence the object fields here belong to the domain objects and not the database tables
// the mapping from domain object to database tables will occur when the query is being generated

// query object with checks in place to prevent incorrect queries
// To consider: create another alternative "dumb" query object without checks
export class Query {
  // the base represents the base domain object using the query
  // whatever is returned will be mapped to the domain object
  base: string;
  private criteria: Record<string, Array<Criterion>> = {};
  private joinDomains: Join;
  private _limit: number;
  // to support includes functionality in future
  constructor(base: string) {
    this.base = base;
    this.criteria = { [base]: [] };
    this.joinDomains = new Join(base);
  }

  /**
   * Adds a criterion to the query object.
   * @param criterion Query criterion, to be converted to where clause.
   */
  where(criterion: CriterionObject) {
    criterion.domainObject ||= this.base;
    criterion.sqlOperator ||= Operators.EQ;
    this.criteria[criterion.domainObject].push(new Criterion(criterion));
  }

  /**
   * Joins base table with other tables
   * @param domainKeys Domain
   */
  joins(domainKeys: JoinObject) {
    this.joinDomains.merge(domainKeys);
  }

  limit(count: number) {
    if (!Number.isInteger(count)) {
      throw new Error("limit must be an integer");
    }
    if (count <= 0) {
      throw new Error("limit must be positive");
    }
    this._limit = count;
  }

  isCriteriaValid(): boolean {
    for (const domainName of Object.keys(this.criteria)) {
      if (!this.joinDomains.hasDomain(domainName)) {
        return false;
      }
    }
    return true;
  }

  // We assume a simple 1:1 column to field mapping for now
  // value objects or other non 1:1 mappings are a lot more complex
  // We also only allow AND condition chains for now
  /**
   * Returns a full fledged query string of the form SELECT ... FROM ... INNER JOIN ... WHERE ... AND ...;
   * @returns sql query string
   */
  toQueryString(): string {
    const sqlSelectPartArr = [];
    const sqlWherePartArr = [];

    for (const [key, criteriaArr] of Object.entries(this.criteria)) {
      const Table = registry.getTable(key);
      const Mapper = registry.getMapper(key);
      // probably should make DataMappers static, or use single instance pattern

      sqlSelectPartArr.push(Table.toSqlSelect());
      const whereStrings = criteriaArr.map((criterion) => {
        return criterion.toSqlWhere(Table, Mapper);
      });
      sqlWherePartArr.push(...whereStrings);
    }

    const sqlSelectPart = sqlSelectPartArr.join(", ");
    const sqlFromPart = this.joinDomains.toSqlJoin();
    const sqlWherePart = sqlWherePartArr.join(" AND ");
    const sqlLimitPart = this._limit ? `LIMIT ${this._limit}` : "";
    const sql = `SELECT ${sqlSelectPart} FROM ${sqlFromPart} WHERE ${sqlWherePart} ${sqlLimitPart};`;

    return sql;
  }

  unscope() {
    this.criteria = {};
    this.joinDomains = new Join(this.base);
  }
}

export interface CriterionObject {
  sqlOperator?: Operators;
  domainObject?: string;
  domainObjectField: string;
  value: any;
}

export type JoinObject =
  | string
  | {
      [key: string]: JoinObject;
    }
  | Array<JoinObject>;

type ProcessedJoinObject =
  | {
      [key: string]: ProcessedJoinObject | EMPTY;
    }
  | Array<ProcessedJoinObject>;

// where
class Criterion {
  private sqlOperator: string;
  private domainObject: string;
  private domainObjectField: string;
  private value: any;

  constructor({
    sqlOperator,
    domainObject,
    domainObjectField,
    value,
  }: CriterionObject) {
    if (!sqlOperator || !domainObject) {
      throw new Error("invalid creation of Criterion");
    }
    this.sqlOperator = sqlOperator;
    this.domainObject = domainObject;
    this.domainObjectField = domainObjectField;
    this.value = value;
  }

  /**
   * Returns a single where clause corresponding to a criterion. Note that logical chaining
   * is done elsewhere.
   * @returns Sql where clause
   */
  toSqlWhere<T extends typeof Table, M extends typeof DataMapper>(
    Table: T,
    Mapper: M
  ): string {
    // match the right metadata
    // for now we assume TableColumn to domain object field 1:1 map
    // in future, we will work on value objects and other more complex mappings
    const field = Mapper.metadata.findByDomain(this.domainObjectField);
    if (!field) {
      throw Error("no match for domain object field");
    }
    const tableKey = (field as ColumnMap).tableColumnKey;
    const actualDbColumnName = Table.getDbColumnName(tableKey);
    return `${formatDbColumn(Table.tableName, actualDbColumnName)} ${
      this.sqlOperator
    } ${this.value}`;
  }
}

// Note that the names here are names of the domain keys and not the underlying tables
class Join {
  private base: string;
  private domainKeys: Set<string> = new Set();
  private joinDomains: ProcessedJoinObject = [];

  constructor(base: string) {
    this.base = base;
  }

  // appends EMPTY to any string that is not a key for an object
  private processDomains(domains: JoinObject): ProcessedJoinObject {
    if (typeof domains === "string") {
      if (!this.domainKeys.has(domains)) {
        this.domainKeys.add(domains);
      }
      return { [domains]: EMPTY };
    } else if (Array.isArray(domains)) {
      return domains.map((ele) => {
        if (Array.isArray(ele)) {
          throw new Error("invalid object");
        }
        return this.processDomains(ele);
      });
    } else {
      // table is an object
      const processed: ProcessedJoinObject = {};
      for (const [tableName, value] of Object.entries(domains)) {
        processed[tableName] = this.processDomains(value);
      }
      return processed;
    }
  }

  merge(domains: JoinObject): void {
    const processedDomains = this.processDomains(domains);
    _.merge(this.joinDomains, processedDomains);
  }

  hasDomain(domainObjectName: string): boolean {
    return this.domainKeys.has(domainObjectName);
  }

  toSqlJoin(): string {
    const BaseTable = registry.getTable(this.base);
    const baseTableName = BaseTable.tableName;
    const sqlJoinPart = `${baseTableName} ${Join.toSqlJoinHelper(
      this.base,
      this.joinDomains
    )}`;
    return sqlJoinPart;
  }

  // each non-EMPTY object in processedDomains should only have 1 key
  static firstKey(obj: Record<string, any>) {
    if (Object.keys.length !== 1) {
      throw new Error("object must have precisely 1 key");
    }
    return Object.keys(obj)[0];
  }

  static toSqlJoinHelper(
    rootDomainKey: string,
    joinDomains: ProcessedJoinObject | EMPTY
  ): string {
    if (joinDomains === EMPTY) {
      return "";
    } else if (Array.isArray(joinDomains)) {
      return joinDomains
        .map((ele) => Join.toSqlJoinHelper(rootDomainKey, ele))
        .join(" ");
    } else {
      // joinDomins is an object that isn't EMPTY
      const Table = registry.getTable(rootDomainKey);
      const otherDomainKey = Join.firstKey(joinDomains);
      const OtherTable = registry.getTable(otherDomainKey);

      const sqlArr = [];
      if (Table.belongsTo(otherDomainKey)) {
        const reference = Table.getReference(otherDomainKey);
        for (let i = 0; i < reference.ownTableForeignKeys.length; i++) {
          sqlArr.push(
            `${formatDbColumn(
              Table.tableName,
              reference.ownTableForeignKeys[i]
            )} = ${formatDbColumn(
              OtherTable.tableName,
              reference.otherTableCandidateKeys[i]
            )}`
          );
        }
      } else if (OtherTable.belongsTo(rootDomainKey)) {
        const reference = OtherTable.getReference(rootDomainKey);
        const sqlArr = [];
        for (let i = 0; i < reference.ownTableForeignKeys.length; i++) {
          sqlArr.push(
            `${formatDbColumn(
              OtherTable.tableName,
              reference.ownTableForeignKeys[i]
            )} = ${formatDbColumn(
              Table.tableName,
              reference.otherTableCandidateKeys[i]
            )}`
          );
        }
      } else {
        throw new Error("no relation found.");
      }
      const sql = `INNER JOIN ${OtherTable.tableName} ON ${sqlArr.join(
        " AND "
      )}`;
      return sql;
    }
  }
}
