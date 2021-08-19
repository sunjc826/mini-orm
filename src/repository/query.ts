import _ from "lodash";
import { ColumnMap, DataMapper, MetaData } from "../data-mapper";
import { Table } from "../data-mapper/table";
import { formatDbColumn } from "../helpers";
import { registry } from "../registry";
import { EQUALS } from "./types";

export const EMPTY = {} as const;
export type EMPTY = typeof EMPTY;

// NOTE: Query objects operate at the Repository layer, which sits on top of the DataMapper
// hence the object fields here belong to the domain objects and not the database tables
// the mapping from domain object to database tables will occur when the query is being generated

// query object with checks in place to prevent incorrect queries
// To consider: create another alternative "dumb" query object without checks
export class Query {
  // the base represents the base domain object using the query
  // whatever is returned will be mapped to the domain object
  base: string;
  criteria: Record<string, Array<Criterion>> = {};
  joinDomains = new Join();
  // to support includes functionality in future
  constructor(base: string) {
    this.base = base;
    this.criteria = { [base]: [] };
  }

  where(criterion: CriterionObject) {
    criterion.domainObject ||= this.base;
    criterion.sqlOperator ||= EQUALS;
    this.criteria[criterion.domainObject].push(new Criterion(criterion));
  }

  joins(domains: JoinObject) {
    this.joinDomains.merge(domains);
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
    const sqlFromPartArr = [];
    const sqlWherePartArr = [];

    for (const [key, criteriaArr] of Object.entries(this.criteria)) {
      const Table = registry.getTable(key);
      const Mapper = registry.getMapper(key);
      // probably should make DataMappers static, or use single instance pattern
      const table = new Table();
      const mapper = new Mapper();
      sqlSelectPartArr.push(table.toSqlSelect());
      const whereStrings = criteriaArr.map((criterion) => {
        return criterion.toSqlWhere(table, mapper);
      });
      sqlFromPartArr.push(table.tableName);
      sqlWherePartArr.push(...whereStrings);
    }
    const sqlSelectPart = sqlSelectPartArr.join(", ");
    const sqlFromPart = sqlFromPartArr.join(", ");
    const sqlWherePart = sqlWherePartArr.join(" AND ");
    const sql = `SELECT ${sqlSelectPart} FROM ${sqlFromPart} WHERE ${sqlWherePart};`;

    return sql;
  }

  unscope() {
    this.criteria = {};
    this.joinDomains = new Join();
  }
}

export interface CriterionObject {
  sqlOperator?: string;
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
    this.sqlOperator = sqlOperator!;
    this.domainObject = domainObject!;
    this.domainObjectField = domainObjectField;
    this.value = value;
  }

  /**
   * Returns a single where clause corresponding to a criterion. Note that logical chaining
   * is done elsewhere.
   * @returns Sql where clause
   */
  toSqlWhere(table: Table, mapper: DataMapper): string {
    // match the right metadata
    // for now we assume TableColumn to domain object field 1:1 map
    // in future, we will work on value objects and other more complex mappings
    const field = mapper.metadata.findByDomain(this.domainObjectField);
    if (!field) {
      throw Error("no match for domain object field");
    }
    const tableKey = (field as ColumnMap).tableColumnName;
    const actualDbColumnName = table.getDbColumnName(tableKey);
    return `${formatDbColumn(table.tableName, actualDbColumnName)} ${
      this.sqlOperator
    } ${this.value}`;
  }
}

// allows chaining of joins
// Note that the names here are names of the domain objects and not the underlying tables
class Join {
  private base: string;
  private domainNames: Set<string> = new Set();
  private joinDomains: ProcessedJoinObject = [];

  constructor(base: string) {
    this.base = base;
  }

  // appends EMPTY to any string that is not a key for an object
  private processDomains(domains: JoinObject): ProcessedJoinObject {
    if (typeof domains === "string") {
      if (!this.domainNames.has(domains)) {
        this.domainNames.add(domains);
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
    return this.domainNames.has(domainObjectName);
  }

  // TODO
  toSqlJoin() {}
}
