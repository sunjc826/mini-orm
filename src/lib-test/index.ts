import { registry } from "../registry";
import {
  AUTHOR,
  BOOK,
  FOOTBALLER,
  PERSON,
  PLAYER,
  PUBLISHER,
} from "./domainKeys";
import { AuthorMapper } from "./mappers/author";
import { BookMapper } from "./mappers/book";
import { PersonMapper } from "./mappers/person";
import { PublisherMapper } from "./mappers/publisher";
import { FootballerMapper } from "./mappers/single-table-inheritance/footballer";
import { PlayerMapper } from "./mappers/single-table-inheritance/player";
import { Author } from "./models/author";
import { Book } from "./models/book";
import { Person } from "./models/person";
import { Publisher } from "./models/publisher";
import { Footballer } from "./models/single-table-inheritance/footballer";
import { Player } from "./models/single-table-inheritance/player";
import { AuthorTable } from "./tables/author";
import { BookTable } from "./tables/book";
import { PersonTable } from "./tables/person";
import { PublisherTable } from "./tables/publisher";
import { PlayerTable } from "./tables/single-table-inheritance/player";

registry.register(AUTHOR, AuthorTable, Author, AuthorMapper);
registry.register(BOOK, BookTable, Book, BookMapper);
registry.register(PUBLISHER, PublisherTable, Publisher, PublisherMapper);
registry.register(PERSON, PersonTable, Person, PersonMapper);
registry.register(PLAYER, PlayerTable, Player, PlayerMapper);
registry.register(FOOTBALLER, PlayerTable, Footballer, FootballerMapper, true);
