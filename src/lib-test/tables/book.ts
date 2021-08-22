import { createTable, Table } from "../../data-mapper/table";

// export class BookTable extends Table {
//   name: string;
//   genre: string;
//   author_id: string;
// }

export const BookTable = createTable({
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
