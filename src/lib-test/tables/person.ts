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
    country: {
      type: "text",
    },
    town: {
      type: "text",
    },
    street: {
      type: "text",
    },
  },
});

export namespace PersonTest {
  export var insertSql = `INSERT INTO persons (name, age, food, country, town, street) VALUES
  ('Bob Page', 45, 'Nanomachines', 'USA', 'Area 51', 'Sector 4');
  `;
}
