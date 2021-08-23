import { createTable } from "../../data-mapper/table";

// export class BookTable extends Table {
//   name: string;
//   genre: string;
//   author_id: string;
// }

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
        limit: 10,
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
    ('Memes', 2),  
    ('Why I'm so great', 4),
    ('Masters of Doom', 5);`;
}
