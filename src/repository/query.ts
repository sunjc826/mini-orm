import _ from "lodash";


export const EMPTY = {} as const;
export type EMPTY = typeof EMPTY;

// NOTE: Query objects operate at the Repository layer, which sits on top of the DataMapper
// hence the object fields here belong to the domain objects and not the database tables
// the mapping from domain object to database tables will occur when the query is being generated

// query object with checks in place to prevent incorrect queries
// To consider: create another alternative "dumb" query object without checks
export class Query {
    criteria: Record<string, Array<Criterion>> = {};
    joinDomains = new Join();
    constructor() {
    }

    where(criterion: CriterionObject) {
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

    unscope() {
        this.criteria = {};
        this.joinDomains = new Join();
    }
}

export interface CriterionObject {
    sqlOperator: string;
    domainObject: string;
    domainObjectField: string;
    value: any;
}

export type JoinObject = string | {
    [key: string]: JoinObject
} | Array<JoinObject>;

type ProcessedJoinObject = {
    [key: string]: ProcessedJoinObject | EMPTY;
} | Array<ProcessedJoinObject>;

// where
class Criterion {
    private sqlOperator: string;
    private domainObjectField: string;
    private value: any;

    constructor({ sqlOperator, domainObjectField, value }: CriterionObject) {
        this.sqlOperator = sqlOperator;
        this.domainObjectField = domainObjectField;
        this.value = value;
    }
}

// allows chaining of joins
// Note that the names here are names of the domain objects and not the underlying tables
class Join {
    private domainNames: Set<string> = new Set();
    private joinDomains: ProcessedJoinObject = [];

    constructor() {

    }

    // appends EMPTY to any string that is not a key for an object
    private processDomains(domains: JoinObject): ProcessedJoinObject {
        if (typeof domains === "string") {
            if (!this.domainNames.has(domains)) {
                this.domainNames.add(domains);
            }
            return { [domains]: EMPTY };
        } else if (Array.isArray(domains)) {
            return domains.map(ele => {
                if (Array.isArray(ele)) {
                    throw new Error("invalid object");
                }
                return this.processDomains(ele)
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
}