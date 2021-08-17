# Features plan

## Design patterns

### Lazy Load

- Virtual Proxy (using reflection)

### Identity Map

- placed within unit of work
- identity field
- foreign key mapping
- association table mapping
- single table inheritance

Potentially
- multi-table inheritance

### Unit of Work

- has identity map

When flushing/committing, orders domain model changes in the correct order (topological sort)
These changes are sent to data mapper, which converts the domain model changes to database table changes and generates the actual sql 

NOTE! We are not use a table data/row data gateway, so the database table rows are not initialized as objects.

### Query Object

### Respository

### Data Mapper

- implement layer supertype
- embedded value
- use metadata mapping

Responsible for communicating with database. Hence place client here.
Opens a new connection each time a series of queries is to be made.

### Metadata Mapping

For an initial implementation, use a simple column to column map.
Value objects come later.

### Domain Model

- implement layer supertype

When object changes, update unit of work