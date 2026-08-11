from app.ontology.parser import OntologyParser

sample = """@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix ex: <http://example.org/bio#> .

ex:BioOntology a owl:Ontology ; rdfs:label "Biological Knowledge Ontology" .
ex:Protein a owl:Class ; rdfs:label "Protein" ; rdfs:subClassOf owl:Thing ; rdfs:comment "Protein macromolecule" .
ex:Assay a owl:Class ; rdfs:label "Assay" ; rdfs:subClassOf owl:Thing .
ex:proteinId a owl:DatatypeProperty ; rdfs:domain ex:Protein ; rdfs:range xsd:string ; rdfs:label "proteinId" .
ex:targetsProtein a owl:ObjectProperty ; rdfs:domain ex:Assay ; rdfs:range ex:Protein ; owl:inverseOf ex:targetedByAssay ; rdfs:label "targetsProtein" .
"""

parser = OntologyParser()
res = parser.parse_ontology(sample, filename="sample.ttl")
print("Ontology Name:", res["ontology_name"])
print("Classes:", len(res["classes"]), [c["label"] for c in res["classes"]])
print("Properties:", len(res["properties"]), [p["label"] for p in res["properties"]])
print("Stats:", res["stats"])
