import { createTable } from "../../table";

export const BookTable = createTable({
  tableName: "books",
  columns: {
    id: {
      type: "serial",
      options: {
        primaryKey: true,
      },
    },
    name: {
      type: "text",
    },
    genre: {
      type: "varchar",
      options: {
        limit: 20,
      },
    },
    authorId: {
      type: "int",
      options: {
        references: {
          domainKey: "author",
          tableColumnKey: "id",
        },
      },
    },
  },
});

export namespace BookTest {
  export var insertSql = `INSERT INTO books (name, genre, author_id) VALUES
    ('Memes', 'Memes', 2),  
    ('Why I''m so great', 'Autobiography', 4),
    ('Masters of Doom', 'History', 5);`;
}
