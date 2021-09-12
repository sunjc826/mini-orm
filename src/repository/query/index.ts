import { DomainObject } from "../../domain";
import { isStringEmpty } from "../../helpers";
import { Cacheable } from "../../helpers/types";
import { registry } from "../../registry";
import { Aggregate } from "./aggregate";
import { Criterion } from "./criterion";
import { Join } from "./join";
import { Operators } from "./types";

// NOTE: Query objects operate at the Repository layer, which sits on top of the DataMapper
// hence the object fields here belong to the domain objects and not the database tables
// the mapping from domain object to database tables will occur when the query is being generated

// query object with checks in place to prevent incorrect queries
// To consider: create another alternative "dumb" query object without checks
export class Query implements Cacheable {
  // the base represents the base domain object using the query
  // whatever is returned will be mapped to the domain object
  base: string;
  private criteria: Record<string, Array<Criterion>> = {};
  private isUsingAggregates = false;
  private aggregates: Array<Aggregate> = [];
  private joinDomains: Join;
  private limitCount: number;
  // to support includes functionality in future
  constructor(base: string) {
    this.base = base;
    this.criteria = { [base]: [] };
    this.joinDomains = new Join(base);
  }

  toCacheObject() {
    const cacheObj: any = {};
    for (const [key, value] of Object.entries(this.criteria)) {
      cacheObj[key] = value.sort((a, b) => a.compareTo(b));
    }
    cacheObj.joinDomains = this.joinDomains;
    cacheObj.count = this.limitCount;
    return cacheObj;
  }

  /**
   * Adds a criterion to the query object.
   * @param criterion Query criterion, to be converted to where clause.
   */
  where(criterion: Criterion.CriterionObject) {
    criterion.domainKey ||= this.base;
    criterion.sqlOperator ||= Operators.EQ;
    this.criteria[criterion.domainKey] ||= [];
    this.criteria[criterion.domainKey].push(new Criterion(criterion));
  }

  // currently, aggregates are only implemented for the base domain
  aggregate(options: Aggregate.AggregateOptions) {
    this.isUsingAggregates = true;
    this.aggregates.push(new Aggregate(options));
  }

  /**
   * Returns if the current query is a simple one, that is, no cross table conditions are imposed.
   * @returns
   */
  isSimple() {
    return this.joinDomains.isEmpty();
  }

  /**
   * Returns if the domain object passes all of the queries conditions.
   * @param domainObject
   */
  matchObject<T extends DomainObject>(
    domainObject: T,
    domainKey: string = this.base
  ): boolean {
    return this.criteria[domainKey].every((criterion) =>
      criterion.matchObject(domainObject)
    );
  }

  /**
   * Joins base table with other tables.
   * @param domainKeys Domain key.
   */
  joins(domainKeys: Join.JoinObject) {
    this.joinDomains.merge(domainKeys);
  }

  limit(count: number) {
    if (!Number.isInteger(count)) {
      throw new Error("limit must be an integer");
    }
    if (count <= 0) {
      throw new Error("limit must be positive");
    }
    this.limitCount = count;
  }

  isCriteriaValid(): boolean {
    for (const domainName of Object.keys(this.criteria)) {
      if (!this.joinDomains.hasDomain(domainName)) {
        return false;
      }
    }
    return true;
  }

  // We also only allow AND condition chains for now
  /**
   * Returns a full fledged query string of the form SELECT ... FROM ... INNER JOIN ... WHERE ... AND ...;
   * @returns sql query string
   */
  toQueryString(): string {
    const sqlSelectPartArr = [];
    const sqlWherePartArr = [];

    if (this.isUsingAggregates) {
      const Table = registry.getTable(this.base);
      const Mapper = registry.getMapper(this.base);
      for (const aggregate of this.aggregates) {
        sqlSelectPartArr.push(aggregate.toSqlSelect(Table, Mapper));
      }
    }

    for (const [key, criteriaArr] of Object.entries(this.criteria)) {
      const Table = registry.getTable(key);
      const Mapper = registry.getMapper(key);

      if (!this.isUsingAggregates) {
        sqlSelectPartArr.push(Table.toSqlSelect());
      }

      const whereStrings = criteriaArr.map((criterion) => {
        return criterion.toSqlWhere(Table, Mapper);
      });
      sqlWherePartArr.push(...whereStrings);
    }

    const sqlSelectPart = sqlSelectPartArr.join(", ");
    const sqlFromPart = this.joinDomains.toSqlJoin();
    const sqlWherePart = sqlWherePartArr.join(" AND ");
    const sqlLimitPart = this.limitCount ? `LIMIT ${this.limitCount}` : "";
    const sql = `SELECT ${sqlSelectPart} ${
      isStringEmpty(sqlFromPart) ? "" : `FROM ${sqlFromPart}`
    } ${
      isStringEmpty(sqlWherePart) ? "" : `WHERE ${sqlWherePart}`
    } ${sqlLimitPart};`;

    return sql;
  }

  unscope() {
    this.criteria = {};
    this.joinDomains = new Join(this.base);
    this.isUsingAggregates = false;
  }
}
