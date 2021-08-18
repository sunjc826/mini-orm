import { Table } from "../../data-mapper";

export class BookTable extends Table {
  name: string;
  genre: string;
  author_id: string;
}