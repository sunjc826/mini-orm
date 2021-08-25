import { registry } from "../registry";
import { AUTHOR, BOOK, PUBLISHER } from "./domainKeys";
import { AuthorMapper } from "./mappers/author";
import { BookMapper } from "./mappers/book";
import { PublisherMapper } from "./mappers/publisher";
import { Author } from "./models/author";
import { Book } from "./models/book";
import { Publisher } from "./models/publisher";
import { AuthorTable } from "./tables/author";
import { BookTable } from "./tables/book";
import { PublisherTable } from "./tables/publisher";

registry.register(AUTHOR, AuthorTable, Author, AuthorMapper);
registry.register(BOOK, BookTable, Book, BookMapper);
registry.register(PUBLISHER, PublisherTable, Publisher, PublisherMapper);
