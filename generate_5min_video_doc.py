import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def create_5min_video_script_doc():
    doc = docx.Document()

    # Set Margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    PRIMARY_COLOR = RGBColor(11, 15, 25)       # Deep slate
    ACCENT_COLOR = RGBColor(99, 102, 241)     # Indigo/Violet
    TEXT_DARK = RGBColor(51, 65, 85)          # Slate text
    CYAN_COLOR = RGBColor(6, 182, 212)        # Cyan accent

    # Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_t = p_title.add_run("OntoForge")
    r_t.font.name = "Arial"
    r_t.font.size = Pt(30)
    r_t.font.bold = True
    r_t.font.color.rgb = ACCENT_COLOR

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_s = p_sub.add_run("5-Minute Executive Product Video Script & Production Master Blueprint")
    r_s.font.name = "Arial"
    r_s.font.size = Pt(14)
    r_s.font.bold = True
    r_s.font.color.rgb = PRIMARY_COLOR

    doc.add_paragraph()

    # Metadata Box
    t_meta = doc.add_table(rows=1, cols=1)
    t_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_meta = t_meta.rows[0].cells[0]
    set_cell_background(c_meta, "F1F5F9")
    set_cell_margins(c_meta, top=140, bottom=140, left=180, right=180)

    p_m = c_meta.paragraphs[0]
    r_mh = p_m.add_run("🎬 5-MINUTE EXECUTIVE VIDEO PRODUCTION METADATA\n")
    r_mh.font.bold = True
    r_mh.font.size = Pt(11)
    r_mh.font.color.rgb = ACCENT_COLOR

    meta_text = (
        "• Total Duration: 5:00 Minutes (300 Seconds)\n"
        "• Target Audience: Enterprise CTOs, Chief Data Officers, AI Architects, Executive Leadership\n"
        "• Format: Continuous Animated Executive Showcase with High-Fidelity UI Screen Simulations\n"
        "• Pacing: Measured, authoritative executive delivery (~130 words per minute, ~650 total words)\n"
        "• Visual Style: Glassmorphic dark slate UI, electric violet & cyan accents, animated node graphs\n"
        "• Audio Track: Modern corporate synth ambient track with gentle risers at key feature transitions"
    )
    r_mb = p_m.add_run(meta_text)
    r_mb.font.size = Pt(10)
    r_mb.font.color.rgb = TEXT_DARK

    doc.add_paragraph()

    # Scene Overview Table
    h1 = doc.add_heading("1. Timeline & Scene Master Breakdown (300 Seconds)", level=1)
    h1.runs[0].font.color.rgb = PRIMARY_COLOR

    scenes_summary = [
        ("Scene 1", "0:00 - 0:35", "35s", "Executive Opening & Strategic Vision", "Macro enterprise context & AI data bottlenecks"),
        ("Scene 2", "0:35 - 1:10", "35s", "The Enterprise Data Dilemma", "Siloed SQL/PDFs & RAG hallucination risks"),
        ("Scene 3", "1:10 - 1:45", "35s", "Introducing OntoForge", "Core solution architecture & automated W3C compliance"),
        ("Scene 4", "1:45 - 2:30", "45s", "Application Screen: Class Matrix Workspace", "Live UI walkthrough: Class cards, properties, URIs"),
        ("Scene 5", "2:30 - 3:15", "45s", "Application Screen: Smart Governance & Deletion", "1-click class deletion & subclass rebinding to owl:Thing"),
        ("Scene 6", "3:15 - 4:00", "45s", "Application Screen: Gemini AI GraphRAG", "Natural language to Cypher query engine & Neo4j sync"),
        ("Scene 7", "4:00 - 4:25", "25s", "Multi-Database & Dual Frontend Stack", "FastAPI + Angular 19 + Relational & Neo4j Graph DBs"),
        ("Scene 8", "4:25 - 4:45", "20s", "Measurable Business Impact & ROI", "10x speed, 0% breakage, 100% W3C standard compliance"),
        ("Scene 9", "4:45 - 5:00", "15s", "Enterprise Deployment & Outro", "Docker, SaaS, microservices integration CTA")
    ]

    t_sum = doc.add_table(rows=1, cols=5)
    t_sum.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr_cells = t_sum.rows[0].cells
    headers = ["Scene #", "Timecode", "Duration", "Scene Title", "Key Focus"]
    for i, h_text in enumerate(headers):
        hdr_cells[i].text = h_text
        set_cell_background(hdr_cells[i], "0F172A")
        p = hdr_cells[i].paragraphs[0]
        p.runs[0].font.bold = True
        p.runs[0].font.color.rgb = RGBColor(255, 255, 255)
        p.runs[0].font.size = Pt(10)
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=100, right=100)

    for sc_num, tc, dur, title, focus in scenes_summary:
        row_cells = t_sum.add_row().cells
        vals = [sc_num, tc, dur, title, focus]
        for i, val in enumerate(vals):
            row_cells[i].text = val
            set_cell_margins(row_cells[i], top=80, bottom=80, left=100, right=100)
            p = row_cells[i].paragraphs[0]
            p.runs[0].font.size = Pt(9.5)
            p.runs[0].font.color.rgb = TEXT_DARK
            if i == 0 or i == 3:
                p.runs[0].font.bold = True

    doc.add_paragraph()

    # Detailed Production Screenplay
    h2 = doc.add_heading("2. Full 5-Minute Scene-by-Scene Production Screenplay", level=1)
    h2.runs[0].font.color.rgb = PRIMARY_COLOR

    scenes_detail = [
        {
            "num": "SCENE 1: EXECUTIVE OPENING & STRATEGIC VISION",
            "time": "0:00 - 0:35 (35 Seconds)",
            "visuals": (
                "[0:00 - 0:15] Cinematic dark slate opening with glowing gridlines. OntoForge 3D metallic logo materializes with electric cyan highlights.\n"
                "[0:15 - 0:35] Title graphic: 'Unlocking Enterprise Knowledge Graphs'. Animated node-edge graph connects floating enterprise icons (Finance, Supply Chain, IoT, Healthcare)."
            ),
            "overlay": "TITLE CARD: 'OntoForge: The Enterprise Knowledge Graph Engine'",
            "vo": (
                "Welcome to OntoForge—the automated enterprise Knowledge Graph and Ontology Generation engine. "
                "In the modern digital economy, enterprise success hinges on data clarity. "
                "Yet, organizations struggle to unify disconnected relational schemas, legacy databases, and unstructured documents into a cohesive semantic model. "
                "OntoForge solves this challenge by automating W3C-standard ontology construction and live graph synchronization."
            )
        },
        {
            "num": "SCENE 2: THE ENTERPRISE DATA DILEMMA",
            "time": "0:35 - 1:10 (35 Seconds)",
            "visuals": (
                "[0:35 - 0:50] Animated split screen showing complex SQL tables on the left and a frustrated engineering team on the right. Floating metric: '80% Siloed Data'.\n"
                "[0:50 - 1:10] Chatbot UI returning an incorrect answer with a red alert: 'Hallucination Detected: Missing Semantic Context'. Cost counter ticks up."
            ),
            "overlay": "CALLOUT: 'Over 80% of Enterprise Data Lacks Explicit Semantic Topology'",
            "vo": (
                "Today, over eighty percent of enterprise data remains trapped in isolated databases and documents lacking explicit relationships. "
                "Traditional ontology engineering requires specialized domain teams spending upwards of six months building custom models. "
                "Without explicit graph context, generative AI and Retrieval-Augmented Generation applications produce costly hallucinations and unreliable business insights."
            )
        },
        {
            "num": "SCENE 3: INTRODUCING ONTOFORGE",
            "time": "1:10 - 1:45 (35 Seconds)",
            "visuals": (
                "[1:10 - 1:25] High-tech 4-step pipeline graphic animating data moving from raw SQL into clean OWL/RDF classes and live Neo4j nodes.\n"
                "[1:25 - 1:45] Feature highlights pulsing on screen: 'Automated Schema Extraction', 'Dynamic Governance', 'Native Neo4j Sync'."
            ),
            "overlay": "FEATURE BADGES: Automated Extraction | W3C OWL/RDF | Neo4j Integration",
            "vo": (
                "OntoForge automates the entire knowledge graph lifecycle. "
                "By analyzing relational database schemas and unstructured text, OntoForge extracts W3C-standard OWL ontologies in seconds. "
                "It bridges legacy data infrastructure directly into live Neo4j knowledge graphs, enabling real-time graph analytics, automated schema governance, and hallucination-free enterprise AI."
            )
        },
        {
            "num": "SCENE 4: APPLICATION SCREEN — CLASS MATRIX DASHBOARD",
            "time": "1:45 - 2:30 (45 Seconds)",
            "visuals": (
                "[1:45 - 2:05] Live UI recording of the OntoForge Class Matrix workspace running in Angular 19 / FastAPI. Cursor inspects class cards like 'Device', 'TemperatureSensor', and 'Location'.\n"
                "[2:05 - 2:30] Cursor opens the Inspector Drawer, demonstrating real-time attribute editing (id: string, temperature: float, status: string) and URI property customization."
            ),
            "overlay": "APPLICATION SCREEN: 'OntoForge Class Matrix & Property Inspector Workspace'",
            "vo": (
                "Here is the live OntoForge Class Matrix workspace. "
                "Domain experts and data architects gain an intuitive, visual dashboard to manage enterprise ontologies. "
                "Each class card displays its full URI namespace, parent-child inheritance, and attribute definitions. "
                "With our interactive Inspector Drawer, teams can modify properties, adjust data types, and review RDF triple declarations in real time."
            )
        },
        {
            "num": "SCENE 5: APPLICATION SCREEN — SMART GOVERNANCE & DELETION",
            "time": "2:30 - 3:15 (45 Seconds)",
            "visuals": (
                "[2:30 - 2:50] Cursor clicks the red '🗑️ Delete Class' button on class 'Device'. A confirmation modal highlights cascading cleanup.\n"
                "[2:50 - 3:15] Animated diagram demonstrates 'TemperatureSensor' automatically rebinding to 'owl:Thing', while associated foreign keys are safely purged."
            ),
            "overlay": "APPLICATION SCREEN: 'Smart Subclass Rebinding to owl:Thing'",
            "vo": (
                "Maintaining schema integrity during refactoring is critical. OntoForge features smart cascading governance. "
                "When an obsolete class like 'Device' is deleted, OntoForge automatically rebinds all child subclasses—such as 'TemperatureSensor'—directly to owl:Thing. "
                "Foreign keys and orphan attributes are safely sanitized, guaranteeing zero broken dependencies across downstream applications."
            )
        },
        {
            "num": "SCENE 6: APPLICATION SCREEN — GEMINI AI GRAPHRAG",
            "time": "3:15 - 4:00 (45 Seconds)",
            "visuals": (
                "[3:15 - 3:35] Live screen view of the AI Insights console. User types: 'Find all active temperature sensors reporting readings above threshold.'\n"
                "[3:35 - 4:00] Gemini AI generates the exact Cypher query on screen. Target Neo4j nodes light up in cyan, returning live database records."
            ),
            "overlay": "APPLICATION SCREEN: 'Gemini 1.5 Pro Natural Language Cypher Engine'",
            "vo": (
                "OntoForge combines graph databases with advanced Generative AI. "
                "Integrated directly with Gemini AI, OntoForge converts natural language business prompts into precise Cypher graph queries. "
                "Instead of guessing, the AI queries the live Neo4j database, retrieving exact node records and delivering accurate, deterministic answers grounded in enterprise truth."
            )
        },
        {
            "num": "SCENE 7: MULTI-DATABASE & DUAL FRONTEND STACK",
            "time": "4:00 - 4:25 (25 Seconds)",
            "visuals": (
                "[4:00 - 4:25] Animated technology stack diagram highlighting FastAPI backend, SQLite/PostgreSQL relational storage, Neo4j Graph DB, and dual Angular 19 / FastAPI static web interfaces."
            ),
            "overlay": "TECH ARCHITECTURE: FastAPI | Angular 19 | Neo4j | Gemini AI | RDF Turtle",
            "vo": (
                "OntoForge is architected for enterprise flexibility. "
                "Built on FastAPI and Angular 19, it supports dual relational and graph database persistence. "
                "Whether you choose our rich Angular dashboard or lightweight embedded FastAPI interface, OntoForge exports standard RDF Turtle files for seamless interoperability."
            )
        },
        {
            "num": "SCENE 8: MEASURABLE BUSINESS IMPACT & ROI",
            "time": "4:25 - 4:45 (20 Seconds)",
            "visuals": (
                "[4:25 - 4:45] Animated stat counter grid displaying:\n"
                "  • '10x Faster Modeling Speed'\n"
                "  • '100% W3C Compliant'\n"
                "  • '0% Schema Breakage Risk'\n"
                "  • '100% Deterministic GraphRAG'"
            ),
            "overlay": "STAT COUNTERS: 10x Speed | 100% W3C | 0 Breakage | 100% Accuracy",
            "vo": (
                "OntoForge delivers tangible business return on investment. "
                "Organizations achieve ten times faster ontology modeling speeds, eliminate schema breakage risks, and ground enterprise AI applications in full W3C-compliant knowledge graph truth."
            )
        },
        {
            "num": "SCENE 9: ENTERPRISE DEPLOYMENT & OUTRO",
            "time": "4:45 - 5:00 (15 Seconds)",
            "visuals": (
                "[4:45 - 5:00] Hero graphic showing OntoForge deployment icons (Docker, Private Cloud, SaaS). Glowing button: 'Launch OntoForge Today' with GitHub link."
            ),
            "overlay": "OUTRO CTA: 'OntoForge | Enterprise Knowledge Graph Engine\nLaunch Today on Private Cloud or Microservices'",
            "vo": (
                "Ready to transform your enterprise data into actionable graph intelligence? "
                "Deploy OntoForge today across your private cloud or microservices architecture. Thank you!"
            )
        }
    ]

    for sc in scenes_detail:
        p_sc_head = doc.add_paragraph()
        r_head = p_sc_head.add_run(sc["num"])
        r_head.font.name = "Arial"
        r_head.font.size = Pt(12)
        r_head.font.bold = True
        r_head.font.color.rgb = ACCENT_COLOR

        t_sc = doc.add_table(rows=4, cols=2)
        t_sc.alignment = WD_TABLE_ALIGNMENT.CENTER
        
        rows_data = [
            ("Timecode & Duration", sc["time"]),
            ("Visuals & Screen Action", sc["visuals"]),
            ("On-Screen Text Overlay", sc["overlay"]),
            ("Executive Voiceover Script", sc["vo"])
        ]

        for idx, (label, content) in enumerate(rows_data):
            c_lbl = t_sc.rows[idx].cells[0]
            c_val = t_sc.rows[idx].cells[1]
            
            c_lbl.text = label
            set_cell_background(c_lbl, "F8FAFC")
            p_lbl = c_lbl.paragraphs[0]
            p_lbl.runs[0].font.bold = True
            p_lbl.runs[0].font.size = Pt(9.5)
            p_lbl.runs[0].font.color.rgb = PRIMARY_COLOR

            c_val.text = content
            p_val = c_val.paragraphs[0]
            p_val.runs[0].font.size = Pt(9.5)
            p_val.runs[0].font.color.rgb = TEXT_DARK
            if idx == 3:
                set_cell_background(c_val, "FEF3C7")
                p_val.runs[0].font.bold = True
                p_val.runs[0].font.color.rgb = RGBColor(146, 64, 14)

            set_cell_margins(c_lbl, top=80, bottom=80, left=100, right=100)
            set_cell_margins(c_val, top=80, bottom=80, left=100, right=100)

        doc.add_paragraph()

    out_path = r"c:\Users\TIJO\Documents\antigravity\quick-pasteur\OntoForge_5Min_Executive_Video_Script.docx"
    doc.save(out_path)
    print(f"5-Minute video script docx successfully saved to: {out_path}")

if __name__ == "__main__":
    create_5min_video_script_doc()
