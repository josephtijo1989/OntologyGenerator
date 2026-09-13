import os
import sys
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def build_word_doc():
    doc = Document()

    # Set Margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Styles & Colors
    PRIMARY_BLUE = RGBColor(37, 99, 235)  # Royal Blue
    CYAN_ACCENT = RGBColor(2, 132, 199)   # Cyan
    PURPLE_ACCENT = RGBColor(124, 58, 237)
    TEXT_DARK = RGBColor(30, 41, 59)
    TEXT_MUTED = RGBColor(100, 116, 139)

    # Title Banner
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(4)
    run_t = title_p.add_run("OntoForge (Quick-Pasteur Enterprise)")
    run_t.font.name = "Segoe UI"
    run_t.font.size = Pt(26)
    run_t.font.bold = True
    run_t.font.color.rgb = PRIMARY_BLUE

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_after = Pt(20)
    run_sub = sub_p.add_run("Hackathon Presentation Pitch Deck — Slide-by-Slide Content & Speaker Rationale")
    run_sub.font.name = "Segoe UI"
    run_sub.font.size = Pt(14)
    run_sub.font.italic = True
    run_sub.font.color.rgb = CYAN_ACCENT

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    slides_content = [
        {
            "num": 1,
            "title": "Slide 1: Title & Tagline (The Pitch)",
            "header": "ENTERPRISE AI & SEMANTIC ENGINEERING TRACK",
            "content": [
                ("Project Title", "OntoForge (Quick-Pasteur Enterprise Platform)"),
                ("Tagline", "Automated Relational-to-Graph & W3C OWL 2.0 Transformation Engine"),
                ("Track / Category", "Enterprise Data Engineering, GraphRAG, & Knowledge Graph Automation"),
                ("Core Pitch", "Eliminating months of manual ontology engineering by automatically transforming enterprise relational databases into standards-compliant W3C OWL 2.0 ontologies and physical Property Knowledge Graphs in seconds.")
            ],
            "notes": "Good morning judges and team. Today we are presenting OntoForge—an automated engine that solves one of the biggest bottlenecks in Enterprise AI: turning disconnected relational database tables into semantically rich, W3C-compliant Knowledge Graphs."
        },
        {
            "num": 2,
            "title": "Slide 2: The Problem: Data Silos & Loss of Semantics",
            "header": "ENTERPRISE PAIN POINT",
            "content": [
                ("Relational Traps", "90% of enterprise business data lives in relational database schemas (PostgreSQL, MS SQL, Oracle, MySQL). Information is trapped in isolated tables."),
                ("AI Context Gap", "LLMs, GraphRAG agents, and network analytics require connected graph context, not flat SQL tables."),
                ("Manual Engineering Bottleneck", "Building W3C-compliant ontologies manually takes 6+ months of specialized data engineering, brittle custom scripts, and endless subject-matter-expert interviews.")
            ],
            "notes": "Relational databases are great for transaction processing, but terrible for enterprise AI. When you want to feed data into LLMs or run multi-hop graph algorithms, flat tables force massive, slow SQL JOINs. Manual graph modeling takes over 6 months."
        },
        {
            "num": 3,
            "title": "Slide 3: The Solution: OntoForge Automated Semantic Lifting",
            "header": "OUR INNOVATION",
            "content": [
                ("Automated Schema Discovery", "Auto-inspects database topology, foreign key constraints, primary keys, and data distributions."),
                ("W3C OWL 2.0 Synthesis", "Generates formal PascalCase class taxonomies, Datatype Properties, owl:hasKey primary keys, and bidirectional owl:inverseOf relationships."),
                ("Active Business Rules Engine", "Data stewards write governance rules in plain English, which are compiled into eonto:hasBusinessRule axioms in the W3C ontology."),
                ("Physical Graph Synchronization", "Executes a 6-stage pipeline stepper that streams relational records directly into Neo4j, Memgraph, Apache AGE, or AWS Neptune.")
            ],
            "notes": "OntoForge automates the entire semantic lifting process. In one click, it inspects your database schema, identifies PII privacy tags, embeds corporate business governance rules, and generates a standards-compliant W3C OWL ontology and Neo4j knowledge graph."
        },
        {
            "num": 4,
            "title": "Slide 4: Platform Architecture: 6-Stage Execution Stepper",
            "header": "PIPELINE ENGINE",
            "content": [
                ("Stage 1: Extraction", "Introspects SQL connection and extracts relational record batches."),
                ("Stage 2: Ontology", "Synthesizes W3C OWL classes, properties, and business rule annotations."),
                ("Stage 3: Validation", "Applies PII masking checks and quality verification rules."),
                ("Stage 4: Node Generation", "Creates target graph node definitions and primary key propagation."),
                ("Stage 5: Edge Relationship Generation", "Creates graph relationships and inverse property links."),
                ("Stage 6: Target Commit", "Commits nodes and edges to physical target Graph DBs with real-time progress monitoring.")
            ],
            "notes": "Our architecture uses a visual 6-stage execution pipeline stepper. Each step validates schema integrity, enforces privacy tags, and builds the graph topology with full audit trail logging and microsecond execution metrics."
        },
        {
            "num": 5,
            "title": "Slide 5: Key Platform Features & Interactive Web Studio",
            "header": "PRODUCT CAPABILITIES",
            "content": [
                ("Multi-Connector Support", "Native drivers for PostgreSQL, MS SQL Server, Oracle, MySQL, and SQLite."),
                ("Automated PII Tagging", "Auto-detects Email, SSN, Credit Cards, Phone, and Names with quality scoring."),
                ("Graphical Studio (Timbr Design)", "Interactive Cytoscape canvas featuring multi-mode switcher (Semantic Ontology / Source Metadata / Lineage Mapping)."),
                ("Full Class Operations", "Complete CRUD support to Create, Quick-Edit, or Delete ontology classes with automatic subclass hierarchy re-parenting."),
                ("Stateless RDF Sandbox", "Zero-persistence in-memory drag-and-drop parser for external W3C Turtle (.ttl) and OWL/XML files.")
            ],
            "notes": "OntoForge features an executive studio with Cytoscape visualizer, class management operations including class creation and deletion, and a zero-persistence sandbox mode to inspect external W3C Turtle or OWL XML files without saving to a database."
        },
        {
            "num": 6,
            "title": "Slide 6: Enterprise AI & GraphRAG Acceleration",
            "header": "AI INTELLIGENCE LAYER",
            "content": [
                ("Natural Language to Cypher", "Translates plain English user questions directly into executable Cypher graph queries."),
                ("Approved Few-Shot Repository", "Caches verified Cypher query templates to eliminate AI hallucinations for enterprise reports."),
                ("Dynamic Prompt Pills", "Live suggestion pills synthesized automatically from active project W3C classes (:Vendor, :Invoice, etc.)."),
                ("Hallucination Prevention", "Grounds LLM prompts in strict W3C Description Logic definitions and schema metadata.")
            ],
            "notes": "For Enterprise AI, OntoForge includes an AI Cypher query synthesizer and Approved Few-Shot Repository. By grounding prompts in W3C ontology definitions, we prevent LLM hallucinations and allow non-technical business users to query knowledge graphs."
        },
        {
            "num": 7,
            "title": "Slide 7: Technology Stack & Technical Rigor",
            "header": "STACK ARCHITECTURE",
            "content": [
                ("Backend Engine", "FastAPI (Python 3.10+), Uvicorn ASGI daemon, SQLAlchemy ORM, Pydantic v2 validation."),
                ("Semantic Processing", "RDFLib 7.0+ W3C OWL DL engine, Neo4j Bolt Sync, Memgraph & Apache AGE drivers."),
                ("Frontend Studio", "Angular 19 Executive UI + Fast Light-Mode SPA, Cytoscape.js, Inter typography."),
                ("Serialization & Exporters", "One-click export to W3C Turtle (.ttl), OWL/XML (.owl), Cypher DDL (.cypher), GraphML (.graphml).")
            ],
            "notes": "Our stack is built for production enterprise workloads. We use FastAPI and RDFLib 7.0+ on the backend, coupled with Angular 19 and Cytoscape.js on the frontend, supporting full W3C open standards with zero vendor lock-in."
        },
        {
            "num": 8,
            "title": "Slide 8: Real-World Use Cases & Business Impact",
            "header": "INDUSTRY IMPACT",
            "content": [
                ("Financial Services", "Fraud ring detection, multi-account transaction lineage, and unified Customer 360."),
                ("Healthcare & Life Sciences", "Target-assay biochemical interaction graphs and disease taxonomy mapping."),
                ("Supply Chain Management", "Vendor contract propagation, bill-of-materials lineage, and risk tracking."),
                ("Enterprise GraphRAG", "Grounding AI agents and chat assistants with formal corporate domain ontologies.")
            ],
            "notes": "OntoForge delivers value across industries: in finance for fraud detection, in healthcare for drug-target discovery, in supply chain for multi-echelon risk modeling, and in enterprise IT for grounding AI agents."
        },
        {
            "num": 9,
            "title": "Slide 9: Competitive Advantage (OntoForge vs. Alternatives)",
            "header": "COMPETITIVE EDGE",
            "content": [
                ("600x Speed Advantage", "Reduces 6-month manual ontology projects to 6-second automated transformations."),
                ("W3C Open Standards", "Full W3C OWL 2.0 DL compliance ensures compatibility with Protégé, Apache Jena, GraphDB, and TopBraid."),
                ("Index-Free Traversal Speed", "Physical graph materialization enables microsecond 5+ hop traversals compared to slow virtual warehouse SQL JOINs."),
                ("Complete Sovereignty", "100% air-gapped or on-premises deployment capability with zero cloud vendor lock-in.")
            ],
            "notes": "Compared to proprietary virtual SQL engines like Timbr.ai or manual ontology tools, OntoForge provides true W3C compliance, physical graph execution speed for complex multi-hop queries, and full air-gapped data sovereignty."
        },
        {
            "num": 10,
            "title": "Slide 10: Conclusion & Call to Action",
            "header": "HACKATHON SUMMARY",
            "content": [
                ("Core Achievement", "Built an end-to-end automated platform that bridges relational enterprise databases with W3C OWL 2.0 Knowledge Graphs."),
                ("Production Ready", "Complete with multi-project isolation, automated discovery, profiling, business rules, visual graph studio, and AI Cypher repository."),
                ("Future Roadmap", "Real-time streaming CDC ingestion and vector graph embedding integration."),
                ("Thank You!", "Open for Questions & Live Demonstration.")
            ],
            "notes": "Thank you judges! OntoForge is fully functional, open-standards compliant, and ready to transform enterprise data into AI-ready Knowledge Graphs. We are excited to take your questions and run a live demonstration."
        }
    ]

    for slide in slides_content:
        # Heading
        h2 = doc.add_paragraph()
        h2.paragraph_format.space_before = Pt(14)
        h2.paragraph_format.space_after = Pt(2)
        run_h = h2.add_run(slide["title"])
        run_h.font.name = "Segoe UI"
        run_h.font.size = Pt(16)
        run_h.font.bold = True
        run_h.font.color.rgb = PRIMARY_BLUE

        # Tag
        tag_p = doc.add_paragraph()
        tag_p.paragraph_format.space_after = Pt(8)
        run_tag = tag_p.add_run(f"[{slide['header']}]")
        run_tag.font.name = "Segoe UI"
        run_tag.font.size = Pt(10)
        run_tag.font.bold = True
        run_tag.font.color.rgb = CYAN_ACCENT

        # Table
        tbl = doc.add_table(rows=len(slide["content"]) + 1, cols=2)
        tbl.autofit = False
        tbl.columns[0].width = Inches(2.2)
        tbl.columns[1].width = Inches(4.3)

        # Header Row
        hdr = tbl.cell(0, 0)
        hdr.merge(tbl.cell(0, 1))
        set_cell_background(hdr, "0F172A")
        hp = hdr.paragraphs[0]
        hrun = hp.add_run("Slide Bullet Points & Core Content")
        hrun.font.name = "Segoe UI"
        hrun.font.size = Pt(11)
        hrun.font.bold = True
        hrun.font.color.rgb = RGBColor(241, 245, 249)

        for row_i, (k, v) in enumerate(slide["content"]):
            row_cells = tbl.rows[row_i + 1].cells
            set_cell_background(row_cells[0], "F1F5F9")
            
            p_k = row_cells[0].paragraphs[0]
            r_k = p_k.add_run(k)
            r_k.font.name = "Segoe UI"
            r_k.font.size = Pt(10.5)
            r_k.font.bold = True
            r_k.font.color.rgb = TEXT_DARK

            p_v = row_cells[1].paragraphs[0]
            r_v = p_v.add_run(v)
            r_v.font.name = "Segoe UI"
            r_v.font.size = Pt(10.5)
            r_v.font.color.rgb = TEXT_DARK

        # Speaker Notes Box
        notes_p = doc.add_paragraph()
        notes_p.paragraph_format.space_before = Pt(8)
        notes_p.paragraph_format.space_after = Pt(18)
        r_n_title = notes_p.add_run("🎙️ Speaker Pitch & Rationale: ")
        r_n_title.font.name = "Segoe UI"
        r_n_title.font.size = Pt(10.5)
        r_n_title.font.bold = True
        r_n_title.font.color.rgb = PURPLE_ACCENT

        r_n_text = notes_p.add_run(f'"{slide["notes"]}"')
        r_n_text.font.name = "Segoe UI"
        r_n_text.font.size = Pt(10.5)
        r_n_text.font.italic = True
        r_n_text.font.color.rgb = TEXT_MUTED

    out_file = "OntoForge_Hackathon_Slide_Content.docx"
    doc.save(out_file)
    print(f"Word document created successfully at: {os.path.abspath(out_file)}")

if __name__ == "__main__":
    build_word_doc()
