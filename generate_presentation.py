import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def build_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Blank layout
    blank_layout = prs.slide_layouts[6]

    # Theme Colors
    DARK_BG = RGBColor(15, 23, 42)       # Slate 900
    LIGHT_BG = RGBColor(248, 250, 252)   # Slate 50
    CARD_BG = RGBColor(255, 255, 255)    # Pure White
    DARK_CARD = RGBColor(30, 41, 59)     # Slate 800
    
    PRIMARY_BLUE = RGBColor(37, 99, 235)  # Royal Blue
    CYAN_ACCENT = RGBColor(2, 132, 199)   # Cyan 600
    TEAL_ACCENT = RGBColor(13, 148, 136)  # Teal 600
    PURPLE_ACCENT = RGBColor(124, 58, 237) # Purple 600
    AMBER_ACCENT = RGBColor(217, 119, 6) # Amber 600
    RED_ACCENT = RGBColor(225, 29, 72)   # Rose 600
    GREEN_ACCENT = RGBColor(16, 185, 129) # Emerald 500

    TEXT_DARK = RGBColor(30, 41, 59)      # Slate 800
    TEXT_MUTED = RGBColor(100, 116, 139)  # Slate 500
    TEXT_LIGHT = RGBColor(241, 245, 249)  # Slate 100
    BORDER_COLOR = RGBColor(226, 232, 240) # Slate 200

    FONT_FAMILY = "Segoe UI"

    def set_slide_background(slide, color):
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = color

    def add_header(slide, title_text, category_text="QUICK-PASTEUR vs TIMBR.AI", dark_mode=False):
        # Category Tag
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.4))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        tf_cat.margin_left = tf_cat.margin_top = tf_cat.margin_right = tf_cat.margin_bottom = 0
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category_text.upper()
        p_cat.font.name = FONT_FAMILY
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = CYAN_ACCENT if dark_mode else PRIMARY_BLUE

        # Main Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.7), Inches(0.7))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        tf_title.margin_left = tf_title.margin_top = tf_title.margin_right = tf_title.margin_bottom = 0
        p_title = tf_title.paragraphs[0]
        p_title.text = title_text
        p_title.font.name = FONT_FAMILY
        p_title.font.size = Pt(24)
        p_title.font.bold = True
        p_title.font.color.rgb = TEXT_LIGHT if dark_mode else TEXT_DARK

    def create_card(slide, left, top, width, height, bg_color=CARD_BG, border_color=BORDER_COLOR):
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        shape.fill.solid()
        shape.fill.fore_color.rgb = bg_color
        if border_color:
            shape.line.color.rgb = border_color
            shape.line.width = Pt(1)
        else:
            shape.line.fill.background()
        return shape

    # ==========================================
    # SLIDE 1: Title Slide (Dark Theme)
    # ==========================================
    slide1 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide1, DARK_BG)

    # Accent pill tag
    tag_card = create_card(slide1, Inches(1.0), Inches(1.5), Inches(4.5), Inches(0.45), bg_color=DARK_CARD, border_color=CYAN_ACCENT)
    tf = tag_card.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "⚡ ENTERPRISE PLATFORM COMPARISON"
    p.alignment = PP_ALIGN.CENTER
    p.font.name = FONT_FAMILY
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = CYAN_ACCENT

    # Main Title
    t_box = slide1.shapes.add_textbox(Inches(1.0), Inches(2.2), Inches(11.3), Inches(2.0))
    tf = t_box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "Quick-Pasteur Enterprise vs. Timbr.AI"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(40)
    p.font.bold = True
    p.font.color.rgb = TEXT_LIGHT

    p2 = tf.add_paragraph()
    p2.text = "Architectural Analysis, Feature Comparison, & Strategic Trade-offs"
    p2.font.name = FONT_FAMILY
    p2.font.size = Pt(22)
    p2.font.color.rgb = RGBColor(148, 163, 184) # Slate 400
    p2.space_before = Pt(12)

    # Bullet points / Summary highlights box
    sub_card = create_card(slide1, Inches(1.0), Inches(4.5), Inches(11.333), Inches(2.2), bg_color=DARK_CARD, border_color=RGBColor(51, 65, 85))
    tf_sub = sub_card.text_frame
    tf_sub.word_wrap = True
    tf_sub.margin_left = Inches(0.3)
    tf_sub.margin_top = Inches(0.25)
    
    bullets = [
        ("Physical Materialization vs. Virtual SQL Fabric", "Comparing complete W3C OWL graph transformation against zero-copy in-warehouse semantic virtualization."),
        ("Performance & Traversal Dynamics", "Evaluating microsecond graph algorithm execution vs. warehouse SQL JOIN scan efficiency."),
        ("Strategic Decision Matrix", "Determining optimal enterprise deployment scenarios for Master Data, GraphRAG, and BI reporting.")
    ]
    for i, (title, desc) in enumerate(bullets):
        p = tf_sub.paragraphs[0] if i == 0 else tf_sub.add_paragraph()
        p.space_after = Pt(8)
        run1 = p.add_run()
        run1.text = f"•  {title}: "
        run1.font.bold = True
        run1.font.size = Pt(13)
        run1.font.color.rgb = CYAN_ACCENT
        run1.font.name = FONT_FAMILY

        run2 = p.add_run()
        run2.text = desc
        run2.font.size = Pt(13)
        run2.font.color.rgb = RGBColor(203, 213, 225) # Slate 300
        run2.font.name = FONT_FAMILY

    # ==========================================
    # SLIDE 2: Executive Summary (Core Paradigm Shift)
    # ==========================================
    slide2 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide2, LIGHT_BG)
    add_header(slide2, "Executive Summary: Paradigm & Architectural Contrast")

    # Card 1: Quick-Pasteur
    c1 = create_card(slide2, Inches(0.8), Inches(1.6), Inches(5.6), Inches(5.3), bg_color=CARD_BG)
    tf1 = c1.text_frame
    tf1.word_wrap = True
    tf1.margin_left = Inches(0.3)
    tf1.margin_top = Inches(0.3)
    tf1.margin_right = Inches(0.3)

    p = tf1.paragraphs[0]
    p.text = "Quick-Pasteur Enterprise (OntoForge)"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = PRIMARY_BLUE
    p.space_after = Pt(4)

    p_sub = tf1.add_paragraph()
    p_sub.text = "Physical Relational-to-Graph & W3C OWL Engine"
    p_sub.font.name = FONT_FAMILY
    p_sub.font.size = Pt(12)
    p_sub.font.bold = True
    p_sub.font.color.rgb = TEXT_MUTED
    p_sub.space_after = Pt(16)

    qp_points = [
        ("Core Paradigm", "Extracts relational records and physically transforms them into target Property Knowledge Graphs."),
        ("Standardization", "Full W3C OWL 2.0 ontology engine (`owl:Class`, `owl:ObjectProperty`, Turtle `.ttl`, OWL/XML `.owl`)."),
        ("Target Stores", "Direct physical sync to Neo4j, Memgraph, Apache AGE, and AWS Neptune."),
        ("Execution Engine", "6-stage execution pipeline stepper (Extraction ➔ Ontology ➔ Validation ➔ Nodes ➔ Edges ➔ Commit)."),
        ("Unique Value", "Ultra-low latency recursive graph traversals, native graph algorithms (PageRank, Louvain), offline operation.")
    ]
    for label, text in qp_points:
        p = tf1.add_paragraph()
        p.space_after = Pt(10)
        r1 = p.add_run()
        r1.text = f"• {label}: "
        r1.font.bold = True
        r1.font.size = Pt(12)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = text
        r2.font.size = Pt(12)
        r2.font.color.rgb = TEXT_MUTED

    # Card 2: Timbr.AI
    c2 = create_card(slide2, Inches(6.9), Inches(1.6), Inches(5.6), Inches(5.3), bg_color=CARD_BG)
    tf2 = c2.text_frame
    tf2.word_wrap = True
    tf2.margin_left = Inches(0.3)
    tf2.margin_top = Inches(0.3)
    tf2.margin_right = Inches(0.3)

    p = tf2.paragraphs[0]
    p.text = "Timbr.AI Semantic Platform"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(18)
    p.font.bold = True
    p.font.color.rgb = TEAL_ACCENT
    p.space_after = Pt(4)

    p_sub = tf2.add_paragraph()
    p_sub.text = "Virtual SQL Knowledge Graph & Semantic Data Fabric"
    p_sub.font.name = FONT_FAMILY
    p_sub.font.size = Pt(12)
    p_sub.font.bold = True
    p_sub.font.color.rgb = TEXT_MUTED
    p_sub.space_after = Pt(16)

    timbr_points = [
        ("Core Paradigm", "Zero-copy virtual abstraction layer mapped directly onto cloud data warehouses."),
        ("Standardization", "SQL-native ontology definitions exposing virtual graph concepts via standard SQL views."),
        ("Target Stores", "Runs inside existing warehouses (Snowflake, BigQuery, Databricks, PostgreSQL)."),
        ("Execution Engine", "Dynamic SQL query rewrite engine translating graph queries into target SQL dialects."),
        ("Unique Value", "Zero ETL maintenance, zero data duplication, instant BI tool compatibility (Power BI, Tableau).")
    ]
    for label, text in timbr_points:
        p = tf2.add_paragraph()
        p.space_after = Pt(10)
        r1 = p.add_run()
        r1.text = f"• {label}: "
        r1.font.bold = True
        r1.font.size = Pt(12)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = text
        r2.font.size = Pt(12)
        r2.font.color.rgb = TEXT_MUTED

    # ==========================================
    # SLIDE 3: Quick-Pasteur Architecture Deep Dive
    # ==========================================
    slide3 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide3, LIGHT_BG)
    add_header(slide3, "Quick-Pasteur Enterprise: Core Modular Architecture")

    cards_data = [
        ("1. Discovery & Profiling", PRIMARY_BLUE, [
            "Automated schema inspection across PostgreSQL, MS SQL, Oracle, MySQL, SQLite.",
            "Built-in PII detection engine (Email, SSN, Phone, Credit Card, Name).",
            "Data quality scoring & column stat profiling before ontology mapping."
        ]),
        ("2. W3C OWL 2.0 Engine", PURPLE_ACCENT, [
            "Formal ontology modeling (`owl:Class`, `rdfs:subClassOf`, `owl:ObjectProperty`).",
            "Plain-English business rules engine tagging entities and attributes.",
            "One-click export to W3C Turtle (`.ttl`) and OWL/XML (`.owl`)."
        ]),
        ("3. Pipeline Stepper Engine", TEAL_ACCENT, [
            "Automated extraction of relational database records.",
            "6-stage pipeline stepper (Extraction ➔ Ontology ➔ Validation ➔ Nodes ➔ Edges ➔ Commit).",
            "Real-time terminal execution logging & duration metrics audit trail."
        ]),
        ("4. Graph Sync & AI Insights", CYAN_ACCENT, [
            "Target Graph DB sync for Neo4j, Memgraph, Apache AGE, and AWS Neptune.",
            "Lineage visualization with CoSE force-directed layout (`.cypher` & `.graphml`).",
            "AI Cypher query synthesizer & Approved Few-Shot Query Repository."
        ])
    ]

    coords = [
        (Inches(0.8), Inches(1.6)),
        (Inches(6.8), Inches(1.6)),
        (Inches(0.8), Inches(4.4)),
        (Inches(6.8), Inches(4.4))
    ]

    for (left, top), (title, color, items) in zip(coords, cards_data):
        card = create_card(slide3, left, top, Inches(5.7), Inches(2.5), bg_color=CARD_BG)
        tf = card.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = Inches(0.25)

        p = tf.paragraphs[0]
        p.text = title
        p.font.name = FONT_FAMILY
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = color
        p.space_after = Pt(8)

        for item in items:
            p_item = tf.add_paragraph()
            p_item.space_after = Pt(4)
            r = p_item.add_run()
            r.text = f"• {item}"
            r.font.name = FONT_FAMILY
            r.font.size = Pt(11)
            r.font.color.rgb = TEXT_DARK

    # ==========================================
    # SLIDE 4: Timbr.AI Architecture Deep Dive
    # ==========================================
    slide4 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide4, LIGHT_BG)
    add_header(slide4, "Timbr.AI: Virtual Architecture & Zero-ETL Layer")

    timbr_cards_data = [
        ("1. Virtual Semantic Modeling", TEAL_ACCENT, [
            "Maps business concepts and relationships directly to SQL database tables.",
            "Concept inheritance and relationship definitions without changing physical schemas.",
            "Centralized data modeling interface accessible via standard SQL."
        ]),
        ("2. SQL Query Rewrite Engine", AMBER_ACCENT, [
            "Intercepts incoming graph SQL queries and rewrites them into target warehouse SQL.",
            "Eliminates manual `JOIN` and `UNION` complexity for data consumers.",
            "Optimizes queries using underlying warehouse query planners."
        ]),
        ("3. In-Database Virtual Execution", CYAN_ACCENT, [
            "No data movement — data stays in Snowflake, BigQuery, Databricks, or Postgres.",
            "Zero storage overhead; no secondary graph database hardware required.",
            "Real-time query execution reflects live source warehouse changes immediately."
        ]),
        ("4. Universal BI & LLM Integration", PRIMARY_BLUE, [
            "Exposes virtual graphs via standard JDBC/ODBC endpoints.",
            "Seamless connection to Power BI, Tableau, Looker, and Python notebooks.",
            "GraphRAG contextual grounding for LLM agents using governed business definitions."
        ])
    ]

    for (left, top), (title, color, items) in zip(coords, timbr_cards_data):
        card = create_card(slide4, left, top, Inches(5.7), Inches(2.5), bg_color=CARD_BG)
        tf = card.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = Inches(0.25)

        p = tf.paragraphs[0]
        p.text = title
        p.font.name = FONT_FAMILY
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = color
        p.space_after = Pt(8)

        for item in items:
            p_item = tf.add_paragraph()
            p_item.space_after = Pt(4)
            r = p_item.add_run()
            r.text = f"• {item}"
            r.font.name = FONT_FAMILY
            r.font.size = Pt(11)
            r.font.color.rgb = TEXT_DARK

    # ==========================================
    # SLIDE 5: Architectural Comparison Matrix
    # ==========================================
    slide5 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide5, LIGHT_BG)
    add_header(slide5, "Architectural Comparison Matrix")

    # Add Table
    rows, cols = 7, 3
    left, top, width, height = Inches(0.8), Inches(1.6), Inches(11.7), Inches(5.2)
    table_shape = slide5.shapes.add_table(rows, cols, left, top, width, height)
    table = table_shape.table

    table.columns[0].width = Inches(2.5)
    table.columns[1].width = Inches(4.6)
    table.columns[2].width = Inches(4.6)

    headers = ["Dimension / Feature", "Quick-Pasteur Enterprise", "Timbr.AI Semantic Layer"]
    for j, h in enumerate(headers):
        cell = table.cell(0, j)
        cell.fill.solid()
        cell.fill.fore_color.rgb = DARK_BG
        p = cell.text_frame.paragraphs[0]
        p.text = h
        p.font.name = FONT_FAMILY
        p.font.size = Pt(13)
        p.font.bold = True
        p.font.color.rgb = TEXT_LIGHT
        p.alignment = PP_ALIGN.CENTER

    matrix_data = [
        ("Architecture Paradigm", "Physical Materialization (ETL Pipeline)", "Virtual Semantic Layer (Zero-ETL)"),
        ("Data Placement", "Target Physical Graph DB (Neo4j, Neptune)", "Stays in Source DW (Snowflake, BigQuery)"),
        ("Primary Query Interface", "Cypher, SPARQL, GraphML, W3C OWL", "Standard SQL via JDBC / ODBC"),
        ("Deep Traversal Performance", "Microsecond speed via index-free adjacency", "SQL JOIN scan latency bound to warehouse"),
        ("Data Freshness", "Pipeline Sync Latency (Scheduled/Triggered)", "Instant Real-Time (Live warehouse state)"),
        ("Ontology Standards", "Native W3C OWL 2.0 (Turtle .ttl / OWL XML)", "Proprietary SQL-based Ontology Mapping")
    ]

    for i, row in enumerate(matrix_data):
        row_idx = i + 1
        bg = CARD_BG if i % 2 == 0 else RGBColor(241, 245, 249)
        for j, val in enumerate(row):
            cell = table.cell(row_idx, j)
            cell.fill.solid()
            cell.fill.fore_color.rgb = bg
            p = cell.text_frame.paragraphs[0]
            p.text = val
            p.font.name = FONT_FAMILY
            p.font.size = Pt(11)
            p.font.color.rgb = PRIMARY_BLUE if j == 1 else (TEAL_ACCENT if j == 2 else TEXT_DARK)
            if j == 0:
                p.font.bold = True
                p.font.color.rgb = TEXT_DARK
            p.alignment = PP_ALIGN.LEFT if j > 0 else PP_ALIGN.CENTER

    # ==========================================
    # SLIDE 6: Quick-Pasteur Key Capabilities & Strengths
    # ==========================================
    slide6 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide6, LIGHT_BG)
    add_header(slide6, "Quick-Pasteur: Key Capabilities & Core Strengths")

    qp_strengths = [
        ("W3C OWL 2.0 Compliance", PRIMARY_BLUE, [
            "Formal Semantic Web standard compatibility.",
            "Direct Turtle (.ttl) & OWL/XML exports for enterprise registries.",
            "Subclass taxonomies & strict object/datatype property mapping."
        ]),
        ("Physical Graph Performance", PURPLE_ACCENT, [
            "Native graph database target sync (Neo4j, Memgraph, Neptune).",
            "Index-free adjacency enables microsecond multi-hop traversals.",
            "High performance for Graph Neural Networks & pathfinding."
        ]),
        ("Automated Data Profiling", TEAL_ACCENT, [
            "Pre-transformation data quality scoring & anomaly check.",
            "Automated PII identification (SSN, Credit Card, Email, Phone).",
            "Primary key & Foreign key propagation across ontology layers."
        ]),
        ("AI Insight & Approved Cypher Repo", CYAN_ACCENT, [
            "Natural language to Cypher synthesis engine.",
            "Approved Few-Shot Cypher repository for precise query execution.",
            "Dynamic prompt pills based on project OWL classes."
        ])
    ]

    for (left, top), (title, color, items) in zip(coords, qp_strengths):
        card = create_card(slide6, left, top, Inches(5.7), Inches(2.5), bg_color=CARD_BG)
        tf = card.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = Inches(0.25)

        p = tf.paragraphs[0]
        p.text = title
        p.font.name = FONT_FAMILY
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = color
        p.space_after = Pt(8)

        for item in items:
            p_item = tf.add_paragraph()
            p_item.space_after = Pt(4)
            r = p_item.add_run()
            r.text = f"✔ {item}"
            r.font.name = FONT_FAMILY
            r.font.size = Pt(11)
            r.font.color.rgb = TEXT_DARK

    # ==========================================
    # SLIDE 7: Timbr.AI Key Capabilities & Strengths
    # ==========================================
    slide7 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide7, LIGHT_BG)
    add_header(slide7, "Timbr.AI: Key Capabilities & Core Strengths")

    timbr_strengths = [
        ("Zero Data Movement (Zero-ETL)", TEAL_ACCENT, [
            "Eliminates complex ETL pipeline engineering and maintenance.",
            "Zero data duplication; no storage footprint overhead.",
            "Maintains central data warehouse security and governance policies."
        ]),
        ("Native SQL Interface & BI Plug-in", AMBER_ACCENT, [
            "Queries written in standard SQL; no Cypher/SPARQL required.",
            "Seamless connection to Power BI, Tableau, Looker via JDBC/ODBC.",
            "Empowers traditional SQL analysts and business users instantly."
        ]),
        ("Real-Time Data Freshness", CYAN_ACCENT, [
            "Queries execute against live source tables inside the warehouse.",
            "Immediate reflection of data updates without sync pipeline lag.",
            "Ideal for operational dashboards requiring fresh analytics."
        ]),
        ("GraphRAG for LLM Grounding", PRIMARY_BLUE, [
            "Provides semantic context views to LLM agents and RAG systems.",
            "Standardizes business logic (e.g. 'Active Customer') across prompts.",
            "Reduces LLM hallucinations by mapping SQL entities accurately."
        ])
    ]

    for (left, top), (title, color, items) in zip(coords, timbr_strengths):
        card = create_card(slide7, left, top, Inches(5.7), Inches(2.5), bg_color=CARD_BG)
        tf = card.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = Inches(0.25)

        p = tf.paragraphs[0]
        p.text = title
        p.font.name = FONT_FAMILY
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = color
        p.space_after = Pt(8)

        for item in items:
            p_item = tf.add_paragraph()
            p_item.space_after = Pt(4)
            r = p_item.add_run()
            r.text = f"✔ {item}"
            r.font.name = FONT_FAMILY
            r.font.size = Pt(11)
            r.font.color.rgb = TEXT_DARK

    # ==========================================
    # SLIDE 8: Advantages of Quick-Pasteur over Timbr.AI
    # ==========================================
    slide8 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide8, LIGHT_BG)
    add_header(slide8, "Advantages of Quick-Pasteur over Timbr.AI")

    adv_cards = [
        ("1. Superior Deep Graph Performance", PRIMARY_BLUE, 
         "Quick-Pasteur materializes data into native Graph DBs (Neo4j, Memgraph). Index-free adjacency allows 5-10+ hop recursive traversals in milliseconds, whereas Timbr's SQL translation generates heavy warehouse JOINs that slow down at scale."),
        ("2. W3C OWL 2.0 Open Standard Interoperability", PURPLE_ACCENT, 
         "Exports clean W3C Turtle (.ttl) and OWL/XML (.owl) files compatible with Protege, TopBraid, and enterprise RDF stores. Timbr uses a proprietary SQL-based ontology format that creates vendor lock-in."),
        ("3. Built-in Data Quality & PII Governance", TEAL_ACCENT, 
         "Includes native data profiling, quality scoring, and automatic PII detection (SSN, CC, Email) before graph creation. Timbr relies on underlying data warehouses for data cleaning and PII tagging."),
        ("4. Air-Gapped & Self-Contained Deployment", GREEN_ACCENT, 
         "Can be deployed entirely on-premises or air-gapped without relying on cloud data warehouse infrastructure or external SaaS control planes. Provides complete sovereignty over data and pipelines.")
    ]

    for (left, top), (title, color, desc) in zip(coords, adv_cards):
        card = create_card(slide8, left, top, Inches(5.7), Inches(2.5), bg_color=CARD_BG)
        tf = card.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = Inches(0.25)

        p = tf.paragraphs[0]
        p.text = title
        p.font.name = FONT_FAMILY
        p.font.size = Pt(15)
        p.font.bold = True
        p.font.color.rgb = color
        p.space_after = Pt(8)

        p_desc = tf.add_paragraph()
        p_desc.text = desc
        p_desc.font.name = FONT_FAMILY
        p_desc.font.size = Pt(11)
        p_desc.font.color.rgb = TEXT_DARK

    # ==========================================
    # SLIDE 9: Disadvantages of Quick-Pasteur compared to Timbr.AI
    # ==========================================
    slide9 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide9, LIGHT_BG)
    add_header(slide9, "Disadvantages of Quick-Pasteur compared to Timbr.AI")

    disadv_cards = [
        ("1. Data Duplication & Storage Cost", RED_ACCENT, 
         "Because Quick-Pasteur extracts records into a physical graph database, data is duplicated across relational and graph storage. This increases cloud storage footprint and database licensing costs."),
        ("2. Pipeline Maintenance & Operational Complexity", AMBER_ACCENT, 
         "Requires building, executing, and monitoring 6-stage ETL pipelines. Pipeline failures, schema drifts, and sync errors require active data engineering maintenance compared to Timbr's zero-ETL approach."),
        ("3. Data Sync Latency", RED_ACCENT, 
         "Graph data is only as fresh as the latest pipeline execution. Unlike Timbr's live in-warehouse execution, Quick-Pasteur introduces data latency between source updates and graph materialization."),
        ("4. Learning Curve for Graph Query Languages", AMBER_ACCENT, 
         "Analysts must learn Cypher or SPARQL to query target graph databases. Timbr allows business users and BI tools to query the graph using familiar, standard SQL syntax.")
    ]

    for (left, top), (title, color, desc) in zip(coords, disadv_cards):
        card = create_card(slide9, left, top, Inches(5.7), Inches(2.5), bg_color=CARD_BG)
        tf = card.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = Inches(0.25)

        p = tf.paragraphs[0]
        p.text = title
        p.font.name = FONT_FAMILY
        p.font.size = Pt(15)
        p.font.bold = True
        p.font.color.rgb = color
        p.space_after = Pt(8)

        p_desc = tf.add_paragraph()
        p_desc.text = desc
        p_desc.font.name = FONT_FAMILY
        p_desc.font.size = Pt(11)
        p_desc.font.color.rgb = TEXT_DARK

    # ==========================================
    # SLIDE 10: Timbr.AI Advantages & Disadvantages Summary
    # ==========================================
    slide10 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide10, LIGHT_BG)
    add_header(slide10, "Timbr.AI: Advantages & Disadvantages Overview")

    # Left Column: Advantages
    c_adv = create_card(slide10, Inches(0.8), Inches(1.6), Inches(5.6), Inches(5.3), bg_color=CARD_BG)
    tf_adv = c_adv.text_frame
    tf_adv.word_wrap = True
    tf_adv.margin_left = tf_adv.margin_top = tf_adv.margin_right = Inches(0.3)

    p = tf_adv.paragraphs[0]
    p.text = "PROS / ADVANTAGES OF TIMBR.AI"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = GREEN_ACCENT
    p.space_after = Pt(12)

    t_pros = [
        ("Zero-ETL Overhead", "No physical data movement or complex pipeline orchestration."),
        ("Universal BI Compatibility", "Exposes graph views via standard SQL (JDBC/ODBC) to Power BI/Tableau."),
        ("Real-Time Data Freshness", "Queries always run against live warehouse tables."),
        ("Zero Storage Footprint", "No extra database hardware or graph licensing required."),
        ("Ease of Adoption", "Leverages existing enterprise SQL skills without Cypher training.")
    ]
    for label, desc in t_pros:
        p = tf_adv.add_paragraph()
        p.space_after = Pt(8)
        r1 = p.add_run()
        r1.text = f"✔ {label}: "
        r1.font.bold = True
        r1.font.size = Pt(11)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = desc
        r2.font.size = Pt(11)
        r2.font.color.rgb = TEXT_MUTED

    # Right Column: Disadvantages
    c_dis = create_card(slide10, Inches(6.9), Inches(1.6), Inches(5.6), Inches(5.3), bg_color=CARD_BG)
    tf_dis = c_dis.text_frame
    tf_dis.word_wrap = True
    tf_dis.margin_left = tf_dis.margin_top = tf_dis.margin_right = Inches(0.3)

    p = tf_dis.paragraphs[0]
    p.text = "CONS / DISADVANTAGES OF TIMBR.AI"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = RED_ACCENT
    p.space_after = Pt(12)

    t_cons = [
        ("SQL Traversal Performance Bottleneck", "Complex multi-hop graph queries convert to expensive SQL JOINs."),
        ("High Warehouse Compute Cost", "Heavy graph-style queries increase Snowflake/BigQuery query consumption charges."),
        ("Lack of Native Graph Algorithms", "Cannot run PageRank, community detection, or Graph Neural Networks efficiently."),
        ("Proprietary Ontology Format", "Does not natively export standard W3C OWL 2.0 Turtle/RDF files."),
        ("Vendor & Warehouse Dependency", "Query execution performance is strictly bound to underlying DW capabilities.")
    ]
    for label, desc in t_cons:
        p = tf_dis.add_paragraph()
        p.space_after = Pt(8)
        r1 = p.add_run()
        r1.text = f"✖ {label}: "
        r1.font.bold = True
        r1.font.size = Pt(11)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = desc
        r2.font.size = Pt(11)
        r2.font.color.rgb = TEXT_MUTED

    # ==========================================
    # SLIDE 11: Enterprise Decision Matrix & Target Use Cases
    # ==========================================
    slide11 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide11, LIGHT_BG)
    add_header(slide11, "Enterprise Decision Matrix & Ideal Use Cases")

    c_use1 = create_card(slide11, Inches(0.8), Inches(1.6), Inches(5.6), Inches(5.3), bg_color=CARD_BG)
    tf_u1 = c_use1.text_frame
    tf_u1.word_wrap = True
    tf_u1.margin_left = tf_u1.margin_top = tf_u1.margin_right = Inches(0.3)

    p = tf_u1.paragraphs[0]
    p.text = "Choose Quick-Pasteur Enterprise When:"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = PRIMARY_BLUE
    p.space_after = Pt(12)

    qp_scenarios = [
        ("Deep Graph Traversal & Analytics", "Use cases requiring 5+ hop relationships, fraud detection rings, and identity resolution."),
        ("W3C Compliance Mandates", "Organizations requiring strict W3C OWL 2.0 Turtle/XML standards for ontology governance."),
        ("Native Graph Database Deployments", "Projects standardizing on Neo4j, Memgraph, or AWS Neptune graph stores."),
        ("Data Quality & PII Sanitization", "Need automated PII profiling and data quality scoring prior to knowledge graph generation."),
        ("Air-Gapped / On-Prem Operations", "Environments requiring fully self-contained processing without cloud data warehouse lock-in.")
    ]
    for title, desc in qp_scenarios:
        p = tf_u1.add_paragraph()
        p.space_after = Pt(8)
        r1 = p.add_run()
        r1.text = f"🎯 {title}: "
        r1.font.bold = True
        r1.font.size = Pt(11)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = desc
        r2.font.size = Pt(11)
        r2.font.color.rgb = TEXT_MUTED

    c_use2 = create_card(slide11, Inches(6.9), Inches(1.6), Inches(5.6), Inches(5.3), bg_color=CARD_BG)
    tf_u2 = c_use2.text_frame
    tf_u2.word_wrap = True
    tf_u2.margin_left = tf_u2.margin_top = tf_u2.margin_right = Inches(0.3)

    p = tf_u2.paragraphs[0]
    p.text = "Choose Timbr.AI When:"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = TEAL_ACCENT
    p.space_after = Pt(12)

    timbr_scenarios = [
        ("Cloud Warehouse Centric Stack", "Data architecture built around Snowflake, BigQuery, or Databricks without graph DBs."),
        ("BI & SQL-Centric Data Teams", "Reporting requirements served via Power BI, Tableau, or Looker using standard SQL."),
        ("Zero ETL Budget & Maintenance", "Organizations lacking data engineering resources to maintain graph ETL pipelines."),
        ("Real-Time Operational Dashboards", "Analytics requiring instant visibility into live relational database transactions."),
        ("High-Level Business Semantic Layer", "Creating unified metrics catalogs (e.g. 'Customer 360') without moving underlying tables.")
    ]
    for title, desc in timbr_scenarios:
        p = tf_u2.add_paragraph()
        p.space_after = Pt(8)
        r1 = p.add_run()
        r1.text = f"🎯 {title}: "
        r1.font.bold = True
        r1.font.size = Pt(11)
        r1.font.color.rgb = TEXT_DARK
        r2 = p.add_run()
        r2.text = desc
        r2.font.size = Pt(11)
        r2.font.color.rgb = TEXT_MUTED

    # ==========================================
    # SLIDE 12: Conclusion & Strategic Recommendations (Dark Theme)
    # ==========================================
    slide12 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide12, DARK_BG)
    add_header(slide12, "Conclusion & Strategic Architecture Roadmap", dark_mode=True)

    c_summary = create_card(slide12, Inches(0.8), Inches(1.6), Inches(11.7), Inches(5.2), bg_color=DARK_CARD, border_color=CYAN_ACCENT)
    tf_sum = c_summary.text_frame
    tf_sum.word_wrap = True
    tf_sum.margin_left = tf_sum.margin_top = tf_sum.margin_right = Inches(0.4)

    p = tf_sum.paragraphs[0]
    p.text = "Strategic Summary & Recommendations"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = CYAN_ACCENT
    p.space_after = Pt(14)

    rec_points = [
        ("1. Distinct Enterprise Roles", "Quick-Pasteur Enterprise is a high-performance **Physical Graph Transformation Engine**, whereas Timbr.AI is a **Virtual Semantic Data Fabric**. They solve fundamentally different operational problems."),
        ("2. Performance vs. Agility Trade-off", "Choose Quick-Pasteur when graph traversal speed, deep pathfinding algorithms, and W3C OWL standards are critical. Choose Timbr.AI when zero-ETL agility, data warehouse virtualization, and standard SQL BI tools are paramount."),
        ("3. Potential Hybrid Architecture", "Enterprises can combine both: Use **Timbr.AI** as a virtual semantic layer for operational warehouse BI reporting, and use **Quick-Pasteur** to extract, profile, and materialize high-value subnetworks into **Neo4j** for deep graph AI & network analytics."),
        ("4. Final Recommendation", "Evaluate your workload requirements: If your primary goal is Graph AI / GraphRAG with complex multi-hop Cypher queries, **Quick-Pasteur Enterprise** delivers unmatched physical graph execution and governance.")
    ]

    for title, desc in rec_points:
        p = tf_sum.add_paragraph()
        p.space_after = Pt(12)
        r1 = p.add_run()
        r1.text = f"{title}: "
        r1.font.bold = True
        r1.font.size = Pt(13)
        r1.font.color.rgb = TEXT_LIGHT
        r1.font.name = FONT_FAMILY

        r2 = p.add_run()
        r2.text = desc
        r2.font.size = Pt(13)
        r2.font.color.rgb = RGBColor(203, 213, 225) # Slate 300
        r2.font.name = FONT_FAMILY

    output_path = "Quick_Pasteur_vs_TimbrAI_Comparison.pptx"
    prs.save(output_path)
    print(f"Presentation successfully created at: {os.path.abspath(output_path)}")

if __name__ == "__main__":
    build_presentation()
