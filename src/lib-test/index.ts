import { registry } from "../registry";
import { AuthorMapper } from "./mappers/author";
import { BookMapper } from "./mappers/book";
import { Author } from "./models/author";
import { Book } from "./models/book";
import { AuthorTable } from "./tables/author";
import { BookTable } from "./tables/book";

registry.register("author", AuthorTable, Author, AuthorMapper);
registry.register("book", BookTable, Book, BookMapper);