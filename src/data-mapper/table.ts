import _ from "lodash";
import { formatDbColumn, formatResultSetColumnName } from "../helpers";
import { FirstParam } from "../helpers/types";
import { write } from "../lib-test/tests/helpers";
import {
  DataTypes,
  AllOptions,
  ColumnTypes,
  COLUMN_TYPE_MAP,
  Int,
} from "./types";

export abstract class Table {
  /**
   * The actual db table name, snakecased.
   */
  static tableName: string;
  /**
   * A map of the form
   * [tableColumnKey] : {
   *  name (which is the actual snakecased db column name)
   *  ...other properties
   * }
   * Note that [tableColumnKey] can still be camelcased
   */
  static columns: Record<string, ColumnTypes> = {};
  // TODO: supports single column references for now
  // can consider implementing composite keys in future
  // Note: We also assume that 2 distinct table can only have 1 reference, this is why
  // the table's domainKey itself is used as a key here
  /**
   * A map of the form
   * [otherDomainKey] : {
   *  ...other properties
   * }
   */
  static references: Record<string, Table.Reference> = {};
  static referencedBy: Record<string, Table.ReferencedBy> = {};

  /**
   * A map of the form
   * [ownTableColumnKey]: [otherDomainKey]
   */
  static foreignKeys: Record<string, string> = {};
  // TODO
  static referencedByKeys: {};

  // TODO: Can also implement table constraints in future

  // TODO
  static topoSort() {}

  /**
   * Adds a column to the table.
   * @param name Column name key. Will be converted to snakecase when entered into DB.
   * @param type DB type.
   * @param options DB column options.
   */
  static addColumn(
    name: string,
    type: DataTypes,
    options: Partial<AllOptions> = {}
  ): void {
    // write({ tableClassName: this.name });
    // write(Object.entries(this));
    // write(Object.entries(Object.getPrototypeOf(this)));
    // write({ column: name });
    if (this.columns[name]) {
      throw new Error("column already exists");
    }
    if (type === "int" && (options as Int.IntOptions).references) {
      const { domainKey, tableColumnKey } = (options as Int.IntOptions)
        .references;
      this.references[domainKey] = {
        ownTableForeignKeys: [name],
        otherTableCandidateKeys: [tableColumnKey],
      };
      this.foreignKeys[name] = domainKey;
    }
    this.columns[name] = new COLUMN_TYPE_MAP[type](name, options);
  }

  /**
   * Adds multiple columns to the table.
   * @param obj A hash of with keys as db column name and values as column options.
   */
  static addColumns(obj: Record<string, Table.AddColumnsOptions>): void {
    for (const [name, addColumnsOptions] of Object.entries(obj)) {
      this.addColumn(
        name,
        addColumnsOptions.type,
        addColumnsOptions.options || {}
      );
    }
  }

  /**
   * Returns the actual DB column name of a certain column.
   * @param tableColumnKey
   * @returns Actual DB column name.
   */
  static getDbColumnName(tableColumnKey: string): string {
    return this.columns[tableColumnKey].getName();
  }

  /**
   * Returns whether this table has a belongs to relation to another table.
   * @param domainKey Domain key is a string key in the registry that is linked to the associated table.
   * @returns Whether this table has a belongs to relation to another table.
   */
  static belongsTo(domainKey: string): boolean {
    return !!this.references[domainKey];
  }

  static getReference(domainKey: string): Table.Reference {
    return this.references[domainKey];
  }

  /**
   * Returns whether this table has a has one or has many relation with another table.
   * @param domainKey Domain key is a string key in the registry that is linked to the associated table.
   * @returns Whether this table has a has one or has many relation with another table.
   */
  static hasOneOrMany(domainKey: string): boolean {
    return !!this.referencedBy[domainKey];
  }

  static isForeignKey(tableColumnKey: string) {
    return tableColumnKey in this.foreignKeys;
  }

  // TODO: this only works for a single column acting as a foreign key column
  // table inheritance would not work
  /**
   * Returns the domainKey of the table that the foreignKey points to.
   * Returns null if tableColumn is not a foreign key.
   * @param tableColumnKey
   * @returns Domain key.
   */
  static foreignKeyDomain(tableColumnKey: string) {
    return this.foreignKeys[tableColumnKey] || null;
  }

  static toSqlCreate(): string {
    const innerSqlArr = [];
    for (const [_columnKey, column] of Object.entries(this.columns)) {
      innerSqlArr.push(column.toSqlCreate());
    }
    const innerSql = innerSqlArr.join(",");

    const sql = `CREATE TABLE ${this.tableName} (${innerSql});`;
    // write(sql, "sql");
    return sql;
  }

  static toSqlTruncate(): string {
    return `TRUNCATE TABLE ${this.tableName} RESTART IDENTITY CASCADE;`;
  }

  /**
   * Returns a sql string representing the select portion of the columns queried.
   * Defaults to all columns of the table. Does not include the SELECT keyword.
   * @param columnNames
   */
  static toSqlSelect(columnNames?: Array<string>): string {
    const sqlArr = [];
    columnNames ||= Object.keys(this.columns);

    for (const column of columnNames) {
      const dbTableName = this.tableName;
      const dbColName = this.getDbColumnName(column);
      sqlArr.push(
        `${formatDbColumn(dbTableName, dbColName)} AS ${this.getTableColumnKey(
          dbTableName,
          dbColName
        )}`
      );
    }
    const sql = sqlArr.join(", ");
    write({ tosqlselect: sql });
    return sql;
  }

  private static getTableColumnKey(
    dbTableName: string,
    dbColName: string
  ): string {
    return formatResultSetColumnName(dbTableName, dbColName);
  }
}

declare namespace Table {
  export interface AddColumnsOptions {
    type: DataTypes;
    options?: Partial<AllOptions>;
  }

  // TODO: this interface can be used for composite keys, which aren't implemented for now
  // i.e. for now, treat the arrays as length 1
  /**
   * Represents a belongs to relation. OwnTable belongs to OtherTable.
   */
  export interface Reference {
    ownTableForeignKeys: Array<string>;
    otherTableCandidateKeys: Array<string>;
  }

  /**
   * Represents a has one/many relation. OwnTable has one/many OtherTable.
   */
  export interface ReferencedBy {
    otherTableForeignKeys: Array<string>;
    ownTableCandidateKeys: Array<string>;
  }
}

interface CreateTableOptions {
  tableName: string;
  columns: FirstParam<typeof Table["addColumns"]>;
}

export function createTable({
  tableName: dbTableName,
  columns,
}: CreateTableOptions) {
  const NewTable = class extends Table {
    /**
     * The actual db table name, snakecased.
     */
    static tableName: string = _.snakeCase(dbTableName);
    /**
     * A map of the form
     * [tableColumnKey] : {
     *  name (which is the actual snakecased db column name)
     *  ...other properties
     * }
     * Note that [tableColumnKey] can still be camelcased
     */
    static columns: Record<string, ColumnTypes> = {};
    // TODO: supports single column references for now
    // can consider implementing composite keys in future
    // Note: We also assume that 2 distinct table can only have 1 reference, this is why
    // the table's domainKey itself is used as a key here
    /**
     * A map of the form
     * [otherDomainKey] : {
     *  ...other properties
     * }
     */
    static references: Record<string, Table.Reference> = {};
    static referencedBy: Record<string, Table.ReferencedBy> = {};

    static foreignKeys: Record<string, string> = {};
  };
  // const NewTableProxy = new Proxy(NewTable, {
  //   get(target, prop, _receiver) {
  //     if (prop in Object.getOwnPropertyNames(target)) {
  //       write("already have it");
  //       return Reflect.get(target, prop);
  //     }
  //     const value = Reflect.get(target, prop);
  //     if (typeof value === "function") {
  //       write("its an inherited function");
  //       return value.bind(target);
  //     }
  //     // typeof value is not a function
  //     // we also assume that the target value is an object (for now)
  //     Reflect.set(target, prop, {});
  //     write("setting and getting prop");
  //     return Reflect.get(target, prop);
  //   },
  // });
  NewTable.addColumns(columns);
  return NewTable;
}
