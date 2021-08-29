import { registry } from "../registry";
import { AUTHOR, BOOK, PERSON, PUBLISHER } from "./domainKeys";
import { AuthorMapper } from "./mappers/author";
import { BookMapper } from "./mappers/book";
import { PersonMapper } from "./mappers/person";
import { PublisherMapper } from "./mappers/publisher";
import { Author } from "./models/author";
import { Book } from "./models/book";
import { Person } from "./models/person";
import { Publisher } from "./models/publisher";
import { AuthorTable } from "./tables/author";
import { BookTable } from "./tables/book";
import { PersonTable } from "./tables/person";
import { PublisherTable } from "./tables/publisher";

registry.register(AUTHOR, AuthorTable, Author, AuthorMapper);
registry.register(BOOK, BookTable, Book, BookMapper);
registry.register(PUBLISHER, PublisherTable, Publisher, PublisherMapper);
registry.register(PERSON, PersonTable, Person, PersonMapper);
