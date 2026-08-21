from rdflib import Graph
from app.utilities.logger import logger


class OntologyExporter:
    """
    Exports RDFLib Ontology graph into multi-format representations (OWL/XML, Turtle, RDF/XML, JSON-LD, RDFS, XML).
    """
    def export(self, rdf_graph: Graph, format_str: str = "turtle") -> str:
        logger.info(f"Exporting ontology graph to format: {format_str}")
        fmt_map = {
            "turtle": "turtle",
            "ttl": "turtle",
            "owl/xml": "xml",
            "owl": "xml",
            "rdf": "xml",
            "rdf/xml": "xml",
            "xml": "xml",
            "json-ld": "json-ld",
            "jsonld": "json-ld",
            "n3": "n3"
        }
        target_fmt = fmt_map.get(format_str.lower())
        if not target_fmt:
            raise ValueError(f"Unsupported export format: '{format_str}'. Supported formats: Turtle, OWL/XML, RDF/XML, JSON-LD, N3.")
        try:
            serialized_data = rdf_graph.serialize(format=target_fmt)
            return serialized_data
        except Exception as e:
            logger.error(f"Failed to serialize ontology in format {format_str}: {e}")
            raise ValueError(f"Failed to serialize ontology in format {format_str}: {str(e)}")
