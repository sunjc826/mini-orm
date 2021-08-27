import { createTable } from "../../data-mapper/table";

export const PersonTable = createTable({
  tableName: "persons",
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
    food: {
      type: "text",
    },
  },
});
