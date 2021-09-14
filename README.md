# mini-orm

A PostgreSQL data mapper based object relational mapper supporting features like batched CRUD, lazy loading and single table inheritance.

## Getting started
You only need to create 3 categories of objects before starting to manipulate database rows using objects.

The code snippets used here are taken from library tests.

### Table
The table represents the state of your table in the database.
There should be 1 `XXXTable` object per database table. You can create this object using the `createTable` function. The options of the arguments passed to `createTable` is as follows:

- `tableName` The `snakecasedTableName` or `camel_cased_table_name`, either is fine.
- `columns` A hash of `snakecasedColumnName` to column options, which vary depending on the type of columns. See below for the full list of column options supported. In general, the user can expect universal options like `nullable` to be on all column types.

```typescript
const AuthorTable = createTable({
  tableName: "authors",
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
```

### Model/Domain Object
In the data mapper pattern, we do not work directly with database rows, but rather domain objects that are more decoupled from the database table structures. Here, you can use the `createDomainObject` function to create a domain object class to inherit from.

The fields that you want your domain object to have are defined as instance attributes of your domain object class.

Instances created from the below `Author` class will have the attributes `name`, `age` and `books`.

```typescript
class Author extends createDomainObject<Author>({ domainKey: "author" }) {
  name: string;
  age: number;
  books: HasMany<Book>;
}
```

For the basic usecase, it is very easy to use the `createDomainObject` helper. Simply pass a string, which we will refer to as the `domainKey` as an option to the `createDomainObject` helper.

A quick explanation on what is the `domainKey`
- In a data mapper pattern, domain objects are decoupled from the underlying tables that are persisted on disk, however, there must still be some ways for the user to indicate which tables are associated with which domain object.
- The `domainKey` is a key that makes this link.

#### Single Table Inheritance
Example:
```typescript
class Footballer extends extendDomainObject<Footballer>()({
  domainKey: FOOTBALLER,
  ParentDomainObject: Player,
}) {
  club: string;
}
```


### Data Mapper
Now that we have the table and the model, we need some way to translate the a table row to a model object, and vice versa. You can use the `createMapper` function to create a mapper class.

```typescript
const AuthorMapper = createMapper({
  domainKey: "author",
  Table: AuthorTable,
  hasMany: {
    books: {},
  },
});
```

### Registry
Finally, now we have a **table**, **data mapper** and **domain object**. Recall the above section where it is mentioned that `domainKey` associates a triplet of these together.

In our example, this would be `AuthorTable`, `AuthorMapper` and `Author`.

We will declare this association to the registry and register this triplet by the following command.

```typescript
registry.register("author", AuthorTable, Author, AuthorMapper);
```

### Using the models
After defining the **table**, **data mapper** and **domain object**, you can generally forget about the former two. Most interactions should only involve the **domain object**.

The basic CRUD operations are as follows.

#### Query
Queries are done in an ActiveRecord sort of manner, though the underlying pattern is that of a datamapper. 

```typescript
/**
 * Search by id
 */
let author = await Author.findById(1);

/**
 * Search by other sql conditions
 */
// if you do not specify an operator, it will default to equals
author = await Author.find({
    domainObjectField: "name",
    value: "TestAuthor",
});
```

#### Insert
Inserts are done using a `create` method available on every domain object class.

```typescript
/**
 * Creates an author with name 'TestAuthor' and age 30
 */
Author.create({ name: "TestAuthor", age: 30 });

/**
 * This is needed to save your newly created object to the database.
 */
await DomainObject.commit();
// You can do this.
await Author.commit();
// or this.
await AnyOtherClassInheritingFromDomainObject.commit();
```

#### Update

```typescript
/**
 * Updates author's age attribute to 55.
 */
author.update({ age: 55 });

/**
 * Like insert, this is needed for database persistence.
 */
await DomainObject.commit();
```

#### Delete

```typescript
/**
 * Deletes author.
 */
author.destroy();

/**
 * Like insert and update, this is needed for database persistence.
 */
await DomainObject.commit();
```

#### Commit
You can chain a bunch of inserts, updates and deletes before calling `commit`, which will notify the database of these changes in a single transaction.

## Full code snippet

### No inheritance
```typescript
const AUTHOR = "author";
const BOOK = "book";
const PUBLISHER = "publisher";

// tables
const AuthorTable = createTable({
  tableName: "authors",
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

const BookTable = createTable({
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
        limit: 20,
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

const PublisherTable = createTable({
  tableName: "publishers",
  columns: {
    id: {
      type: "serial",
      options: {
        primaryKey: true,
      },
    },
    region: {
      type: "text",
    },
    bookId: {
      type: "int",
      options: {
        references: {
          domainKey: "book",
          tableColumnKey: "id",
        },
      },
    },
  },
});

// mappers
const AuthorMapper = createMapper({
  domainKey: AUTHOR,
  Table: AuthorTable,
  hasMany: {
    books: {},
  },
});

const BookMapper = createMapper({
  domainKey: BOOK,
  Table: BookTable,
  belongsTo: {
    author: {},
  },
  hasOne: {
    publisher: {},
  },
});

const PublisherMapper = createMapper({
  domainKey: "publisher",
  Table: PublisherTable,
  belongsTo: {
    book: {},
  },
});

// models
class Author extends createDomainObject<Author>({ domainKey: AUTHOR }) {
  name: string;
  age: number;
  books: HasMany<Book>;
}

class Book extends createDomainObject<Book>({ domainKey: BOOK }) {
  name: string;
  genre: string;
  authorId: string;
  author: BelongsTo<Author>;
  publisher: HasOne<Publisher>;
}

class Publisher extends createDomainObject<Publisher>({
  domainKey: PUBLISHER,
}) {
  region: string;
  // this is only for testing purposes, of course in an actual db
  // it makes no sense for a publisher to belong to a book
  book: BelongsTo<Book>;
}
```

### Single Table Inheritance
```typescript
// Domain Keys
const PLAYER = "player";
const FOOTBALLER = "footballer";

// Table
const PlayerTable = createTable({
  tableName: "players",
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
    club: {
      // footballer
      type: "text",
    },
    battingAverage: {
      // cricketer, bowler
      type: "numeric",
    },
    bowlingAverage: {
      // bowler
      type: "numeric",
    },
  },
  singleTableInheritance: true,
});

// Data Mapper
const PlayerMapper = createMapper({
  domainKey: PLAYER,
  Table: PlayerTable,
  customInheritanceOptions: {
    variant: "singleTable",
    ParentMapper: null,
  },
  customColumnMap: {
    name: "name",
  },
});

const FootballerMapper = createMapper({
  domainKey: FOOTBALLER,
  Table: PersonTable,
  customInheritanceOptions: {
    variant: "singleTable",
    ParentMapper: PlayerMapper,
  },
  customColumnMap: {
    club: "club",
  },
});

// Models
class Player extends createDomainObject({ domainKey: PLAYER }) {
  name: string;
}

class Footballer extends extendDomainObject<Footballer>()({
  domainKey: FOOTBALLER,
  ParentDomainObject: Player,
}) {
  club: string;
}

// registry
registry.register(PLAYER, PlayerTable, Player, PlayerMapper);
registry.register(FOOTBALLER, PlayerTable, Footballer, FootballerMapper, true);
```



## Documentation

Notation adopted (outside of Typescript code blocks):
* `a: b` means that the variable name is `a` and its type is `b`.
  * `a: b, c` means that the variable type is `b` or `c`
* `a` means that the variable name is `a` and its type is a Javascript object.
* `[a]` means, in the context of a key of a Javascript object, that it is a key with any name. 

### Column options
| Column Type | Description                                                | Options                                                                                                                                                                                                                                                      |
| ----------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| varchar     | A varying length string possibly with length restrictions. | `limit` maximum number of characters allowed in a string                                                                                                                                                                                                     |
| text        | A varying length string without length restrictions.       | None                                                                                                                                                                                                                                                         |
| int         | Integer.                                                   | `primaryKey: boolean` whether column serves as primary key of table<br>`foreignKey: boolean` whether column is a foreign key to another table<br>`references` foreign key options<br> `variant: "small", "regular", "big"` Size of int stored in PostgreSQL. |
| serial      | Integer with unique index on column.                       | all options of `int`<br> `autoGenerateExclusively` whether database allows you to manually set ids for example when inserting rows into a table                                                                                                              |
| uuid        | UUID.                                                      | `version: "v1", "v2", "v3", "v4"` Version of uuid.                                                                                                                                                                                                           |
| numeric     | Precise floating point type.                               | None                                                                                                                                                                                                                                                         |
| bool        | Boolean.                                                   | None                                                                                                                                                                                                                                                         |
| timestamp   | Timestamp/Timestamptz.                                     | `timezone: boolean` true for timestamptz, false for timestamp without timezone                                                                                                                                                                               |


### Create Table options
Format: `createTable(options)`

Arguments:

`options` A Javascript object taking the following keys  
* `tableName: string` Snakecased or camelcased name of db table
* `columns` A Javascript object with keys of the form `[columnName]: columnOptions`

### Create Data Mapper options
Format: `createMapper(options)`

Arguments:

`options` A Javascript object taking the following keys
* `domainKey: string` Domain Key associated with the data mapper
* `Table: typeof Table` Table associated with the data mapper
* `customColumnMap` A Javascript object of the form
  ```typescript
  {
    [tableColumnKey]: {
      fieldConversionFunction: obj => value;
    }
  }
  ```
* `customObjectMap` A Javascript object of the form
  ```typescript
  {
    domainObjectFields: {
      [domainFieldName]: {
        [domainSubfieldName]: {
          tableColumns: [col1, col2],
          columnConversionFunction: ([col1, col2]) => value;
      }
    }
  }
  ```
  Currently, customObjectMap only supports 1 level of nesting.
* `belongsTo` A Javascript object of the form
  ```typescript
  {
    [tableColumnKey]: {
      foreignKey: string;
      otherDomainKey: string;
    }
  }
  ```
* `hasOne` See `belongsTo`.
* `hasMany` See `belongsTo`.
* `customInheritanceOptions` Currently, there is only the option to choose Single Table Inheritance.


### Create Domain Object options
Format: `createDomainObject<T>(options)`
* `T`: Classname of domain object.

Arguments:

`options` A Javascript object taking the following keys
* `domainKey: string` Domain key associated with the domain object.

### Extend Domain Object options
Format: `extendDomainObject<T>()(options)`
* `T`: Classname of domain object

Note: The double parentheses here is not a typo. Function currying is needed here due to Typescript limitations.

Arguments:

`options` A Javascript object taking the following keys
* `domainKey: string` Domain key associated with the domain object.
* `ParentDomainObject: typeof DomainObject` The DomainObject class that the current domain object inherits from.
