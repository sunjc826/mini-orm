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

### Model
In the data mapper pattern, we do not work directly with database rows, but rather domain objects that are more decoupled from the database table structures. Here, you can use the `createDomainObject` function to create a domain object class to inherit from.

The fields that you want your domain object to have are defined as instance attributes of your domain object class.

Instances created from the below `Author` class will have the attributes `name`, `age` and `books`.

```typescript
class Author extends createDomainObject({ domainKey: "author" }) {
  name: string;
  age: number;
  books: HasMany<Book>;
}
```

For the basic usecase, it is very easy to use the `createDomainObject` helper. Simply pass a string, which we will refer to as the `domainKey` as an option to the `createDomainObject` helper.

A quick explanation on what is the `domainKey`
- In a data mapper pattern, domain objects are decoupled from the underlying tables that are persisted on disk, however, there must still be some ways for the user to indicate which tables are associated with which domain object.
- The `domainKey` is a key that makes this link.

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


## Documentation

### Column options
| Column Type | Description                                                | Options                                                                                                                                                         |
| ----------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| varchar     | A varying length string possibly with length restrictions. | `limit` maximum number of characters allowed in a string                                                                                                        |
| text        | A varying length string without length restrictions.       | None                                                                                                                                                            |
| int         | Integer.                                                   | `primaryKey` whether column serves as primary key of table<br>`foreignKey` whether column is a foreign key to another table<br>`references` foreign key options |
| serial      | Integer with unique index on column.                       | all options of `int`<br> `autoGenerateExclusively` whether database allows you to manually set ids for example when inserting rows into a table                 |
| numeric     | Precise floating point type.                               | None                                                                                                                                                            |
| bool        | Boolean.                                                   | None                                                                                                                                                            |

