# W3C OWL/RDF Ontology Specification

## Overview
The Ontology Engine dynamically constructs W3C compliant Web Ontology Language (OWL) schemas from discovered relational metadata catalogs.

## Mapping Rules (Relational ➔ OWL)

1. **Table ➔ OWL Class**:
   - Each relational table (e.g. `Customers`) is mapped to an `owl:Class` (e.g. `eonto:Customers`).
   - Annotated with `rdfs:subClassOf owl:Thing`.

2. **Column ➔ Datatype Property**:
   - Columns are mapped to `owl:DatatypeProperty`.
   - `rdfs:domain` is set to the parent table's `owl:Class`.
   - `rdfs:range` is mapped to XSD datatypes (`xsd:string`, `xsd:integer`, `xsd:decimal`, `xsd:dateTime`).

3. **Foreign Key ➔ Object Property**:
   - Foreign key relationships are mapped to `owl:ObjectProperty` (e.g., `relatesToOrders`).
   - Domain is set to source table class, and Range is set to target referenced table class.
