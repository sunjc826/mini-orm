import _ from "lodash";
import { formatDbColumn } from "../../helpers/string";
import { Cacheable } from "../../helpers/types";
import { registry } from "../../registry";
import { EMPTY } from "../types";

// Note that the names here are names of the domain keys and not the underlying tables
export class Join implements Cacheable {
  private base: string;
  private domainKeys: Set<string> = new Set();
  private joinDomains: Join.ProcessedJoinObject = [];

  constructor(base: string) {
    this.base = base;
  }

  // In general, joinDomains can get arbitrarily complicated,
  // and the same joinDomains object can have different ordering of key value pairs
  // leading to different JSON strings. This may or may not be solvable efficiently.
  toCacheObject() {
    return {
      joinDomains: this.joinDomains,
    };
  }

  isEmpty() {
    return this.joinDomains.length === 0;
  }

  // appends EMPTY to any string that is not a key for an object
  private processDomains(domains: Join.JoinObject): Join.ProcessedJoinObject {
    if (typeof domains === "string") {
      if (!this.domainKeys.has(domains)) {
        this.domainKeys.add(domains);
      }
      return [{ [domains]: EMPTY }];
    } else if (Array.isArray(domains)) {
      return domains.flatMap((ele) => {
        if (Array.isArray(ele)) {
          throw new Error("invalid object");
        }
        return this.processDomains(ele);
      });
    } else {
      // table is an object
      const processed: Join.ProcessedJoinObject = {};
      for (const [domainKey, value] of Object.entries(domains)) {
        this.domainKeys.add(domainKey);
        processed[domainKey] = this.processDomains(value);
      }
      return [processed];
    }
  }

  merge(domains: Join.JoinObject): void {
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
    joinDomains: Join.ProcessedJoinObject | EMPTY
  ): string {
    // We cannot check for === here since operations like merge are highly likely to modify
    // underlying EMPTY object. An alternative would be to write our own implementation of functions like merge.
    if (_.isEqual(joinDomains, EMPTY)) {
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
              Table.getDbColumnName(reference.ownTableForeignKeys[i])
            )} = ${formatDbColumn(
              OtherTable.tableName,
              OtherTable.getDbColumnName(reference.otherTableCandidateKeys[i])
            )}`
          );
        }
      } else if (OtherTable.belongsTo(rootDomainKey)) {
        const reference = OtherTable.getReference(rootDomainKey);
        for (let i = 0; i < reference.ownTableForeignKeys.length; i++) {
          sqlArr.push(
            `${formatDbColumn(
              OtherTable.tableName,
              OtherTable.getDbColumnName(reference.ownTableForeignKeys[i])
            )} = ${formatDbColumn(
              Table.tableName,
              Table.getDbColumnName(reference.otherTableCandidateKeys[i])
            )}`
          );
        }
      } else {
        throw new Error("no relation found.");
      }
      const others = this.toSqlJoinHelper(
        otherDomainKey,
        (joinDomains as any)[otherDomainKey]
      );
      const sql = `INNER JOIN ${OtherTable.tableName} ON ${sqlArr.join(
        " AND "
      )} ${others}`;

      return sql;
    }
  }
}

export declare namespace Join {
  export type JoinObject =
    | string
    | {
        [key: string]: JoinObject;
      }
    | Array<JoinObject>;

  export type ProcessedJoinObject =
    | {
        [key: string]: ProcessedJoinObject | EMPTY;
      }
    | Array<ProcessedJoinObject>;
}
