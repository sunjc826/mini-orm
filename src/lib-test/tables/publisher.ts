import { createTable } from "../../data-mapper";

export const PublisherTable = createTable({
  tableName: "publishers",
  columns: {
    id: {
      type: "serial",
      options: {
        primaryKey: true,
      },
    },
    region: {
      type: "text",
    },
    bookId: {
      type: "int",
      options: {
        references: {
          domainKey: "book",
          tableColumnKey: "id",
        },
      },
    },
  },
});

export namespace PublisherTest {
  export var insertSql = `INSERT INTO publishers (region, book_id) VALUES
    ('North America', 1),  
    ('International', 2),
    ('Europe', 3);`;
}
