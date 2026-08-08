# Enterprise Knowledge Graph Model Specification

## Overview
The platform automatically translates relational metadata structures into property graph models compatible with Neo4j, Memgraph, and Apache AGE.

## Graph Schema Definition

### Node Types
- **Table Node**: Represents a relational database table or view.
  - Properties: `id`, `label`, `schema`, `domain_type` (Fact, Dimension, Lookup, Bridge, SCD).
- **Column Node**: Represents a column within a table.
  - Properties: `id`, `label`, `data_type`, `nullable`, `primary_key`.

### Relationship Types
- **`HAS_COLUMN`**: Directed edge from `Table` node to `Column` node.
- **`REFERENCES`**: Directed edge representing Foreign Key relationship between tables.
  - Properties: `constraint_name`, `column`, `target_column`.
- **`INFERRED_RELATIONSHIP`**: Directed edge inferred by the domain analysis engine matching fuzzy column names (e.g., `customer_id` matching `Customers` table).
