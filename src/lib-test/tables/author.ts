import { createTable } from "../../table";

export const AuthorTable = createTable({
  tableName: "authors",
  columns: {
    id: {
      type: "serial",
      options: {
        primaryKey: true,
      },
    },
    name: {
      type: "text",
      options: {
        nullable: false,
      },
    },
    age: {
      type: "int",
    },
  },
});

export namespace AuthorTest {
  export var insertSql = `INSERT INTO authors (name, age) VALUES
    ('Sam', 15),
    ('Walton Simons', 21),
    ('Lo Wang', 12),
    ('Nukem', 20),
    ('Bitterman', 35);`;
}
