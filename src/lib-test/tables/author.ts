import { DataMapper } from "../../data-mapper";
import { createTable, Table } from "../../data-mapper/table";

// export class AuthorTable extends Table {
//   name: string;
//   age: number;
// }

export const AuthorTable = createTable({
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
