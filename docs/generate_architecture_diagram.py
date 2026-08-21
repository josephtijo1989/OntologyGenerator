import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.path import Path

def generate_architecture_diagram():
    # High resolution canvas
    fig, ax = plt.subplots(figsize=(16, 14), dpi=300)
    fig.patch.set_facecolor('#F8FAFC')
    ax.set_facecolor('#F8FAFC')
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 14)
    ax.axis('off')

    # Color Palette
    BG_SLATE_DARK = "#0F172A"
    BG_CARD = "#FFFFFF"
    BORDER_LIGHT = "#CBD5E1"
    
    PRIMARY_CYAN = "#0284C7"
    PRIMARY_BLUE = "#2563EB"
    ACCENT_INDIGO = "#4F46E5"
    ACCENT_VIOLET = "#7C3AED"
    ACCENT_EMERALD = "#059669"
    ACCENT_AMBER = "#D97706"
    ACCENT_ROSE = "#E11D48"
    TEXT_DARK = "#0F172A"
    TEXT_MUTED = "#64748B"

    # 1. Main Header Title Banner
    header_box = patches.FancyBboxPatch(
        (0.5, 12.8), 15.0, 0.95,
        boxstyle="round,pad=0.08,rounding_size=0.15",
        facecolor=BG_SLATE_DARK,
        edgecolor=PRIMARY_CYAN,
        linewidth=2.0
    )
    ax.add_patch(header_box)
    ax.text(8.0, 13.4, "OntoForge (Quick-Pasteur Enterprise)", 
            color="#FFFFFF", fontsize=18, fontweight='bold', ha='center', va='center', fontfamily='sans-serif')
    ax.text(8.0, 13.0, "Enterprise Relational-to-Graph & W3C OWL 2.0 Ontology Automated Transformation Engine", 
            color="#38BDF8", fontsize=11, fontweight='semibold', ha='center', va='center', fontfamily='sans-serif')

    def draw_layer_card(x, y, w, h, title, subtitle, header_color, border_color="#CBD5E1"):
        card = patches.FancyBboxPatch(
            (x, y), w, h,
            boxstyle="round,pad=0.05,rounding_size=0.12",
            facecolor="#FFFFFF",
            edgecolor=border_color,
            linewidth=1.5
        )
        ax.add_patch(card)
        
        # Header banner inside card
        card_header = patches.FancyBboxPatch(
            (x, y + h - 0.5), w, 0.5,
            boxstyle="round,pad=0.02,rounding_size=0.12",
            facecolor=header_color,
            edgecolor="none"
        )
        ax.add_patch(card_header)
        ax.text(x + 0.25, y + h - 0.25, title, color="#FFFFFF", fontsize=11, fontweight='bold', va='center', fontfamily='sans-serif')
        if subtitle:
            ax.text(x + w - 0.25, y + h - 0.25, subtitle, color="#F8FAFC", fontsize=9, fontweight='normal', ha='right', va='center', fontfamily='sans-serif')

    def draw_sub_box(x, y, w, h, title, desc, bg_color="#F0F9FF", border_color="#BAE6FD", title_color="#0369A1"):
        box = patches.FancyBboxPatch(
            (x, y), w, h,
            boxstyle="round,pad=0.04,rounding_size=0.08",
            facecolor=bg_color,
            edgecolor=border_color,
            linewidth=1.2
        )
        ax.add_patch(box)
        ax.text(x + 0.15, y + h - 0.22, title, color=title_color, fontsize=9.5, fontweight='bold', va='center', fontfamily='sans-serif')
        ax.text(x + 0.15, y + 0.25, desc, color="#475569", fontsize=8.2, va='center', fontfamily='sans-serif')

    def draw_arrow_down(x, y_start, y_end, label=""):
        ax.annotate(
            '', xy=(x, y_end), xytext=(x, y_start),
            arrowprops=dict(arrowstyle="simple,tail_width=0.12,head_width=0.45,head_length=0.45",
                            color="#0284C7", shrinkA=2, shrinkB=2)
        )
        if label:
            ax.text(x + 0.15, (y_start + y_end) / 2, label, color="#0369A1", fontsize=8.5, fontweight='bold', va='center', fontfamily='sans-serif',
                    bbox=dict(boxstyle="round,pad=0.2", facecolor="#E0F2FE", edgecolor="#38BDF8", linewidth=0.8))

    # ================= LAYER 1: DATA INGESTION & CONNECTORS =================
    draw_layer_card(0.5, 10.9, 15.0, 1.6, "LAYER 1: MULTI-SOURCE HETEROGENEOUS INGESTION & CONNECTOR POOL", "Project-Scoped Multi-Tenant Isolation", PRIMARY_CYAN, "#38BDF8")
    
    conns = [
        ("PostgreSQL", "v12-16 / Redshift / Timescale", 0.7, 11.1),
        ("MS SQL Server", "2016-2022 / Azure Synapse", 2.8, 11.1),
        ("MySQL & MariaDB", "InnoDB / UTF8MB4 Support", 4.9, 11.1),
        ("Oracle Database", "19c / 21c Enterprise", 7.0, 11.1),
        ("SQLite DB", "Local App DB / In-Memory", 9.1, 11.1),
        ("Snowflake", "Data Cloud Virtual Warehouse", 11.2, 11.1),
        ("Databricks", "Delta Lake / Unity Catalog", 13.3, 11.1),
    ]
    for name, desc, bx, by in conns:
        draw_sub_box(bx, by, 1.95, 0.9, name, desc, "#F0F9FF", "#7DD3FC", "#0369A1")

    draw_arrow_down(8.0, 10.9, 10.3, "Schema Introspection & Information Schema Harvest")

    # ================= LAYER 2: METADATA DISCOVERY & PROFILING =================
    draw_layer_card(0.5, 8.6, 15.0, 1.7, "LAYER 2: PHYSICAL METADATA DISCOVERY, STATISTICAL PROFILING & PII DETECTION", "Information Schema & Privacy Classifier", PRIMARY_BLUE, "#93C5FD")
    
    draw_sub_box(0.7, 8.8, 3.4, 0.95, "Physical Schema Harvester", "• Discovers Tables, Views & Columns\n• Primary & Foreign Key Cardinality", "#EFF6FF", "#BFDBFE", "#1D4ED8")
    draw_sub_box(4.3, 8.8, 3.4, 0.95, "SQL-to-XSD Type Engine", "• Maps SQL Types to W3C XSD\n• xsd:string, integer, decimal, dateTime", "#EFF6FF", "#BFDBFE", "#1D4ED8")
    draw_sub_box(7.9, 8.8, 3.4, 0.95, "Automated PII Privacy Tagger", "• Regex & Pattern Privacy Scanner\n• EMAIL, SSN, PHONE, CARD, NAME", "#FEF2F2", "#FECACA", "#B91C1C")
    draw_sub_box(11.5, 8.8, 3.8, 0.95, "Data Profiling & Quality Scoring", "• Row counts, distinct distributions\n• Null percentage ratios & Completeness", "#ECFDF5", "#A7F3D0", "#047857")

    draw_arrow_down(8.0, 8.6, 8.0, "Physical Catalogs ➔ Enterprise Governance Rule Binding")

    # ================= LAYER 3: BUSINESS RULES & GOVERNANCE =================
    draw_layer_card(0.5, 6.3, 15.0, 1.7, "LAYER 3: BUSINESS RULES & ENTERPRISE GOVERNANCE ENGINE", "Plain English Semantics & Ontological Policy Embedding", ACCENT_INDIGO, "#C7D2FE")
    
    draw_sub_box(0.7, 6.5, 3.4, 0.95, "Validation & Range Bounds", "• Min/Max value constraints\n• Regex pattern syntax rules", "#EEF2FF", "#C7D2FE", "#4338CA")
    draw_sub_box(4.3, 6.5, 3.4, 0.95, "Transformation & Masking", "• Unit conversions & derivations\n• Anonymization & masking policies", "#EEF2FF", "#C7D2FE", "#4338CA")
    draw_sub_box(7.9, 6.5, 3.4, 0.95, "Lookup & Reference Rules", "• Taxonomy reference constraints\n• Master data enum validation", "#EEF2FF", "#C7D2FE", "#4338CA")
    draw_sub_box(11.5, 6.5, 3.8, 0.95, "Ontology Rule Annotator", "• eonto:hasBusinessRule bindings\n• Embedded in OWL Class RDFS axioms", "#FFFBEB", "#FDE68A", "#B45309")

    draw_arrow_down(8.0, 6.3, 5.7, "Semantic Web Lifting: Axiomatization & Formal OWL 2.0 DL Generation")

    # ================= LAYER 4: SEMANTIC WEB & OWL 2.0 DL SYNTHESIS =================
    draw_layer_card(0.5, 4.0, 15.0, 1.7, "LAYER 4: SEMANTIC WEB & W3C OWL 2.0 DL SYNTHESIS ENGINE (RDFLib 7.0+)", "Standardized Semantic Model & Axiom Graph", ACCENT_VIOLET, "#DDD6FE")
    
    draw_sub_box(0.7, 4.2, 3.4, 0.95, "Top-Level Taxonomies", "• eonto:MasterEntity\n• eonto:TransactionalEntity\n• eonto:Reference & Associative", "#F5F3FF", "#DDD6FE", "#6D28D9")
    draw_sub_box(4.3, 4.2, 3.4, 0.95, "owl:Class & Datatypes", "• Singular PascalCase concepts\n• Typed owl:DatatypeProperty\n• Standard XSD range definitions", "#F5F3FF", "#DDD6FE", "#6D28D9")
    draw_sub_box(7.9, 4.2, 3.4, 0.95, "Functional Key Articulation", "• owl:FunctionalProperty\n• eonto:isPrimaryKey annotations\n• Valid W3C owl:hasKey RDF Lists", "#F5F3FF", "#DDD6FE", "#6D28D9")
    draw_sub_box(11.5, 4.2, 3.8, 0.95, "ObjectProperty & Inverses", "• Domain-specific relationship inferrer\n• Bidirectional owl:inverseOf pairs\n• Functional N:1 relationship edges", "#F5F3FF", "#DDD6FE", "#6D28D9")

    # Split Arrows to Layer 5 and Layer 6
    ax.annotate(
        '', xy=(4.25, 3.4), xytext=(6.5, 4.0),
        arrowprops=dict(arrowstyle="simple,tail_width=0.12,head_width=0.45,head_length=0.45",
                        color="#059669", shrinkA=2, shrinkB=2)
    )
    ax.text(4.2, 3.65, "Interactive Visualization", color="#065F46", fontsize=8.5, fontweight='bold', ha='center', va='center',
            bbox=dict(boxstyle="round,pad=0.2", facecolor="#ECFDF5", edgecolor="#A7F3D0", linewidth=0.8))

    ax.annotate(
        '', xy=(11.75, 3.4), xytext=(9.5, 4.0),
        arrowprops=dict(arrowstyle="simple,tail_width=0.12,head_width=0.45,head_length=0.45",
                        color="#D97706", shrinkA=2, shrinkB=2)
    )
    ax.text(11.8, 3.65, "Export & Target DB Sync", color="#92400E", fontsize=8.5, fontweight='bold', ha='center', va='center',
            bbox=dict(boxstyle="round,pad=0.2", facecolor="#FFFBEB", edgecolor="#FDE68A", linewidth=0.8))

    # ================= LAYER 5 (LEFT): INTERACTIVE VISUALIZATION =================
    draw_layer_card(0.5, 1.1, 7.2, 2.3, "LAYER 5: INTERACTIVE CYTOSCAPE VISUALIZATION", "Executive Light-Mode UI & Timbr.ai Design", ACCENT_EMERALD, "#A7F3D0")
    
    draw_sub_box(0.7, 2.0, 3.25, 0.8, "Multi-Mode Switcher", "• Semantic Concept Model\n• Source-to-Target Mapping Flow", "#ECFDF5", "#A7F3D0", "#047857")
    draw_sub_box(4.15, 2.0, 3.35, 0.8, "Taxonomy Path Filter", "• Multi-class root path isolation\n• Concept lineage up to owl:Thing", "#ECFDF5", "#A7F3D0", "#047857")
    draw_sub_box(0.7, 1.25, 3.25, 0.65, "Details Inspection Drawer", "Live attribute & subclass editor", "#ECFDF5", "#A7F3D0", "#047857")
    draw_sub_box(4.15, 1.25, 3.35, 0.65, "Stateless In-Memory Sandbox", "Upload .ttl, .owl, .rdf, .jsonld", "#ECFDF5", "#A7F3D0", "#047857")

    # ================= LAYER 6 (RIGHT): TARGET GRAPH SYNC & EXPORTERS =================
    draw_layer_card(8.3, 1.1, 7.2, 2.3, "LAYER 6: TARGET GRAPH SYNC & MULTI-EXPORTERS", "Direct Bolt Sync & Standard W3C Artifacts", ACCENT_AMBER, "#FDE68A")
    
    draw_sub_box(8.5, 2.0, 3.25, 0.8, "W3C Semantic Exporters", "• W3C Turtle Serialization (.ttl)\n• OWL/XML Specification (.owl)", "#FFFBEB", "#FDE68A", "#B45309")
    draw_sub_box(11.95, 2.0, 3.35, 0.8, "Neo4j Cypher Generator", "• Primary key constraint DDL\n• Node & Edge Cypher scripts (.cypher)", "#FFFBEB", "#FDE68A", "#B45309")
    draw_sub_box(8.5, 1.25, 3.25, 0.65, "GraphML XML Exporter", "NetworkX GraphML for Gephi", "#FFFBEB", "#FDE68A", "#B45309")
    draw_sub_box(11.95, 1.25, 3.35, 0.65, "Direct Target Graph Sync", "Live Bolt push to Neo4j / Memgraph", "#FFFBEB", "#FDE68A", "#B45309")

    # ================= CROSS-CUTTING INFRASTRUCTURE BANNER (BOTTOM) =================
    cross_box = patches.FancyBboxPatch(
        (0.5, 0.15), 15.0, 0.75,
        boxstyle="round,pad=0.05,rounding_size=0.1",
        facecolor="#1E293B",
        edgecolor="#475569",
        linewidth=1.2
    )
    ax.add_patch(cross_box)
    ax.text(0.8, 0.52, "CROSS-CUTTING PLATFORM SERVICES:", color="#38BDF8", fontsize=9.5, fontweight='bold', va='center', fontfamily='sans-serif')
    ax.text(4.7, 0.52, "• Async Workflow Engine & Cron Scheduling   • Immutable Audit Logging   • JWT Auth & RBAC Security   • RESTful OpenAPI 3.1", 
            color="#F1F5F9", fontsize=9, va='center', fontfamily='sans-serif')

    plt.tight_layout()
    output_img = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "architecture_diagram.png")
    plt.savefig(output_img, dpi=300, bbox_inches='tight', facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close()
    print(f"Architecture diagram generated successfully at: {output_img}")

if __name__ == "__main__":
    generate_architecture_diagram()
