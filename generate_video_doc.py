import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

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

def create_video_script_doc():
    doc = docx.Document()

    # Set Margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Styles
    PRIMARY_COLOR = RGBColor(15, 23, 42)      # Deep Slate/Navy
    ACCENT_COLOR = RGBColor(79, 70, 229)     # Indigo/Violet
    TEXT_DARK = RGBColor(51, 65, 85)         # Slate text
    HIGHLIGHT_COLOR = RGBColor(14, 165, 233) # Cyan

    # Title Section
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = title_p.add_run("OntoForge")
    run_title.font.name = "Arial"
    run_title.font.size = Pt(28)
    run_title.font.bold = True
    run_title.font.color.rgb = ACCENT_COLOR

    subtitle_p = doc.add_paragraph()
    subtitle_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = subtitle_p.add_run("3-Minute High-Impact Product Video Script & Production Blueprint")
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(14)
    run_sub.font.bold = True
    run_sub.font.color.rgb = PRIMARY_COLOR

    doc.add_paragraph() # spacing

    # Overview Box / Callout
    table_meta = doc.add_table(rows=1, cols=1)
    table_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell_meta = table_meta.rows[0].cells[0]
    set_cell_background(cell_meta, "F1F5F9")
    set_cell_margins(cell_meta, top=140, bottom=140, left=180, right=180)
    
    p_meta = cell_meta.paragraphs[0]
    r_meta_head = p_meta.add_run("🎬 VIDEO PRODUCTION METADATA\n")
    r_meta_head.font.bold = True
    r_meta_head.font.size = Pt(11)
    r_meta_head.font.color.rgb = ACCENT_COLOR

    meta_text = (
        "• Target Duration: 3 Minutes (180 Seconds)\n"
        "• Tone & Style: High-energy, modern enterprise tech, sleek, cinematic, authoritative\n"
        "• Target Audience: CTOs, Enterprise Data Architects, AI Engineers, Hackathon Judges\n"
        "• Voiceover Style: Confident, engaging, articulate tech presenter (Paced at ~130-140 wpm)\n"
        "• Background Music (BGM): Modern synthwave / ambient tech beat (starts subtle, swells at product reveal, drives during demo)\n"
        "• Color Palette: Dark Slate (#0F172A), Electric Violet (#6366F1), Cyber Cyan (#06B6D4)"
    )
    r_meta_body = p_meta.add_run(meta_text)
    r_meta_body.font.size = Pt(10)
    r_meta_body.font.color.rgb = TEXT_DARK

    doc.add_paragraph()

    # Timeline Breakdown Section
    h1 = doc.add_heading("1. Timeline & Scene Breakdown Overview", level=1)
    h1.runs[0].font.color.rgb = PRIMARY_COLOR

    # Table for Overview
    scenes_summary = [
        ("Scene 1", "0:00 - 0:25", "25s", "The Enterprise Data Crisis", "Problem hook: Siloed data & LLM hallucinations"),
        ("Scene 2", "0:25 - 0:55", "30s", "Introducing OntoForge", "Solution reveal: Automated Ontology & Knowledge Graph Engine"),
        ("Scene 3", "0:55 - 1:45", "50s", "Live UI & Workflow Demo", "Deep-dive: Schema extraction, editor, 1-click class deletion"),
        ("Scene 4", "1:45 - 2:25", "40s", "Gemini AI & Cypher GraphRAG", "Natural language queries to live graph analytics & insights"),
        ("Scene 5", "2:25 - 2:50", "25s", "Enterprise ROI & Tech Stack", "10x speedup, Angular 19 + FastAPI + Neo4j architecture"),
        ("Scene 6", "2:50 - 3:00", "10s", "Call to Action & Outro", "Closing logo reveal & GitHub repository CTA")
    ]

    t_summary = doc.add_table(rows=1, cols=5)
    t_summary.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr_cells = t_summary.rows[0].cells
    headers = ["Scene #", "Timecode", "Duration", "Scene Title", "Key Focus"]
    for i, h_text in enumerate(headers):
        hdr_cells[i].text = h_text
        set_cell_background(hdr_cells[i], "1E293B")
        p = hdr_cells[i].paragraphs[0]
        p.runs[0].font.bold = True
        p.runs[0].font.color.rgb = RGBColor(255, 255, 255)
        p.runs[0].font.size = Pt(10)
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=100, right=100)

    for sc_num, tc, dur, title, focus in scenes_summary:
        row_cells = t_summary.add_row().cells
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

    # Detailed Scenes Section
    h2 = doc.add_heading("2. Full Scene-by-Scene Production Screenplay", level=1)
    h2.runs[0].font.color.rgb = PRIMARY_COLOR

    scenes_detail = [
        {
            "num": "SCENE 1: THE ENTERPRISE DATA CRISIS",
            "time": "0:00 - 0:25 (25 Seconds)",
            "visuals": (
                "[0:00 - 0:10] Fast-paced dramatic montage: A frustrated engineer staring at complex SQL schemas and fragmented PDF documents. "
                "Floating red node alerts display 'DATA SILO', 'SCHEMA BREAKAGE', 'HALLUCINATION'.\n"
                "[0:10 - 0:20] Close-up of a Chatbot UI returning a glaring wrong answer with a prompt warning: 'Error: Context Missing Relationship'.\n"
                "[0:20 - 0:25] Screen transitions to a dark void as a glitch effect clears away the chaotic documents."
            ),
            "text_overlay": "LOWER THIRD: '80% of Enterprise Data Lacks Semantic Structure'",
            "sfx": "Subtle deep bass swell, electronic glitch effect at 0:24.",
            "vo": (
                "In today’s data-driven world, enterprise organizations are sitting on goldmines of information. "
                "Yet, over eighty percent of it remains locked away in complex SQL tables, isolated PDFs, and fragmented schemas. "
                "When teams attempt to power modern AI and RAG applications without explicit semantic relationships, "
                "the result is predictable: constant hallucinations, broken queries, and months of manual ontology engineering. "
                "Until now."
            )
        },
        {
            "num": "SCENE 2: INTRODUCING ONTOFORGE",
            "time": "0:25 - 0:55 (30 Seconds)",
            "visuals": (
                "[0:25 - 0:35] High-tech logo reveal: Glowing electric violet light trails form the 'OntoForge' 3D logo. "
                "Tagline fades in beneath: 'AI-Powered Enterprise Knowledge Graph Engine'.\n"
                "[0:35 - 0:45] Smooth 3D animation showing raw unorganized data streams flowing into OntoForge's central engine, "
                "instantly turning into structured OWL/RDF ontology classes and interconnected graph nodes.\n"
                "[0:45 - 0:55] Wide screen shot of the sleek OntoForge dashboard running on localhost."
            ),
            "text_overlay": "TITLE CARD: 'OntoForge: From Raw Data to Graph Intelligence in Minutes'",
            "sfx": "Upbeat, energetic synth beat kicks in (120 BPM). Energetic swoosh effect.",
            "vo": (
                "Meet OntoForge—the next-generation AI-powered Knowledge Graph and Ontology Generation platform. "
                "OntoForge bridges the gap between raw, disconnected enterprise data and high-precision graph intelligence. "
                "By automating schema extraction, standardization, and knowledge graph mapping, OntoForge empowers enterprise teams "
                "to build, edit, and deploy production-ready W3C-compliant OWL ontologies and Neo4j graphs in minutes—not months."
            )
        },
        {
            "num": "SCENE 3: DEEP-DIVE PRODUCT DEMO & LIVE WORKFLOW",
            "time": "0:55 - 1:45 (50 Seconds)",
            "visuals": (
                "[0:55 - 1:10] Cursor clicks 'Extract Schema'. OntoForge automatically parses relational tables into ontology classes like 'Device', 'Sensor', and 'Measurement'.\n"
                "[1:10 - 1:25] Demonstration of the Interactive Ontology Editor in the Angular 19 UI. User clicks on a class card, opens the Inspector Drawer, updates class attributes, and modifies URI properties.\n"
                "[1:25 - 1:40] Highlight Feature: 1-Click Class Deletion. User clicks the red '🗑️ Delete Class' button on an obsolete class. "
                "An animated callout highlights OntoForge's intelligent cascade: orphan subclasses are automatically rebound to 'owl:Thing' and foreign keys are safely cleaned up with zero data loss.\n"
                "[1:40 - 1:45] Fast-forward zoom showing 1-click Export to RDF/OWL Turtle and direct sync to a live Neo4j instance."
            ),
            "text_overlay": "FEATURE OVERLAYS:\n• Automated OWL/RDF Extraction\n• Dynamic Schema Governance\n• Smart Subclass Rebinding to owl:Thing\n• Native Neo4j Integration",
            "sfx": "Soft UI click sounds, futuristic digital chime when class deletion and rebinding completes.",
            "vo": (
                "Let’s see OntoForge in action. With just one click, OntoForge inspects your target database schemas "
                "and automatically extracts structured ontology classes and relationships. "
                "Our full-lifecycle Ontology Editor gives domain experts complete control. Add properties, modify URIs, "
                "or manage complex class hierarchies effortlessly. "
                "Need to refactor your schema? OntoForge features smart cascading deletion. When you delete a class, "
                "child subclasses are automatically rebound to owl:Thing, maintaining graph integrity without breaking your downstream applications. "
                "Everything syncs instantly to standard RDF Turtle format and live Neo4j graph databases."
            )
        },
        {
            "num": "SCENE 4: GEMINI AI & NATURAL LANGUAGE GRAPHRAG",
            "time": "0:45 - 2:25 (40 Seconds)",
            "visuals": (
                "[1:45 - 2:00] Screen shifts to the OntoForge AI Insights view. The user types a natural language prompt: "
                "'Find all active temperature sensors reporting readings above threshold.'\n"
                "[2:00 - 2:15] Code block highlight: Gemini AI converts the request into a clean Cypher query live on screen. "
                "The target Neo4j graph highlights matching nodes in vibrant cyan.\n"
                "[2:15 - 2:25] The AI summary card displays a precise, structured natural language response grounded in the live graph data."
            ),
            "text_overlay": "CALLOUT GRAPHIC: 'Powered by Gemini AI + Cypher Graph Engine'",
            "sfx": "Subtle typing SFX, glowing shimmer sound as graph nodes light up.",
            "vo": (
                "OntoForge isn't just an editor—it’s an intelligent query engine. "
                "Integrated directly with Gemini AI, OntoForge turns natural language prompts into precise Cypher graph queries. "
                "Whether you're asking complex analytical questions or executing graph updates, "
                "our AI engine retrieves live graph records and delivers accurate, hallucination-free answers grounded in deterministic knowledge graphs."
            )
        },
        {
            "num": "SCENE 5: ENTERPRISE ARCHITECTURE & METRICS",
            "time": "2:25 - 2:50 (25 Seconds)",
            "visuals": (
                "[2:25 - 2:35] Animated metric counters spin up:\n"
                "  • '10x Faster Ontology Modeling'\n"
                "  • '100% W3C Standard Compliance'\n"
                "  • 'Zero Schema Breakage'\n"
                "[2:35 - 2:50] Architectural diagram overlay showcasing the full stack: FastAPI Backend + Angular 19 Reactive UI + Neo4j Graph DB + Gemini LLM Service."
            ),
            "text_overlay": "TECH STACK BADGES: Python | FastAPI | Angular 19 | Neo4j | Gemini AI | RDF/OWL",
            "sfx": "Upbeat audio riser building towards crescendo.",
            "vo": (
                "Built on an enterprise-grade stack featuring FastAPI, Angular 19, and Neo4j, "
                "OntoForge delivers ten times faster modeling speeds while guaranteeing full compliance with global W3C standards. "
                "It’s modular, scalable, and ready to plug into any enterprise data pipeline."
            )
        },
        {
            "num": "SCENE 6: CALL TO ACTION & OUTRO",
            "time": "2:50 - 3:00 (10 Seconds)",
            "visuals": (
                "[2:50 - 3:00] Full screen cinematic hero graphic of OntoForge. "
                "Text fades in with glowing button: 'Unlock Enterprise Graph Intelligence'. "
                "Displaying GitHub repo URL and project contact details."
            ),
            "text_overlay": "ON-SCREEN CTA: 'OntoForge | Enterprise Knowledge Graph Engine\nExplore on GitHub & Launch Today'",
            "sfx": "Final resonant musical chord fading out smoothly.",
            "vo": (
                "Stop struggling with unstructured data. Transform your enterprise knowledge into actionable intelligence today with OntoForge. "
                "Thank you!"
            )
        }
    ]

    for sc in scenes_detail:
        # Heading for Scene
        p_sc_head = doc.add_paragraph()
        r_head = p_sc_head.add_run(sc["num"])
        r_head.font.name = "Arial"
        r_head.font.size = Pt(13)
        r_head.font.bold = True
        r_head.font.color.rgb = ACCENT_COLOR

        # Table for Scene Detail
        t_sc = doc.add_table(rows=4, cols=2)
        t_sc.alignment = WD_TABLE_ALIGNMENT.CENTER
        
        # Col widths: 1.5 inch / 5.3 inch
        widths = [Inches(1.5), Inches(5.3)]
        
        rows_data = [
            ("Timecode & Duration", sc["time"]),
            ("Visuals & Screen Action", sc["visuals"]),
            ("On-Screen Text & SFX", f"{sc['text_overlay']}\n\nSFX: {sc['sfx']}"),
            ("Voiceover Script (Spoken)", sc["vo"])
        ]

        for idx, (label, content) in enumerate(rows_data):
            cell_lbl = t_sc.rows[idx].cells[0]
            cell_val = t_sc.rows[idx].cells[1]
            
            cell_lbl.text = label
            set_cell_background(cell_lbl, "F8FAFC")
            p_lbl = cell_lbl.paragraphs[0]
            p_lbl.runs[0].font.bold = True
            p_lbl.runs[0].font.size = Pt(9.5)
            p_lbl.runs[0].font.color.rgb = PRIMARY_COLOR

            cell_val.text = content
            p_val = cell_val.paragraphs[0]
            p_val.runs[0].font.size = Pt(9.5)
            p_val.runs[0].font.color.rgb = TEXT_DARK
            if idx == 3: # Voiceover script highlighted
                set_cell_background(cell_val, "FEF3C7") # Soft warm highlight
                p_val.runs[0].font.bold = True
                p_val.runs[0].font.color.rgb = RGBColor(146, 64, 14)

            set_cell_margins(cell_lbl, top=80, bottom=80, left=100, right=100)
            set_cell_margins(cell_val, top=80, bottom=80, left=100, right=100)

        doc.add_paragraph() # spacing

    # Production Tips Section
    doc.add_heading("3. Video Editing & Recording Instructions", level=1)
    tips_p = doc.add_paragraph()
    tips_p.paragraph_format.space_after = Pt(4)
    r_tips = tips_p.add_run(
        "1. Screen Recording: Capture the Angular UI at 1080p 60fps or 4K. Ensure crisp browser zooming during button clicks.\n"
        "2. Voiceover Pacing: Aim for ~400 total words across 180 seconds to leave room for pauses, visual transitions, and SFX.\n"
        "3. Interactive Simulator: You can launch `video_presentation.html` in your browser to record a real-time auto-advancing slide showcase with built-in voiceover audio synthesis!\n"
        "4. Key Highlights: Ensure the red '🗑️ Delete Class' button and smart subclass rebinding (`owl:Thing`) are clearly showcased during Scene 3."
    )
    r_tips.font.size = Pt(10)
    r_tips.font.color.rgb = TEXT_DARK

    out_path = r"c:\Users\TIJO\Documents\antigravity\quick-pasteur\OntoForge_3Min_Video_Script.docx"
    doc.save(out_path)
    print(f"Video script docx successfully saved to: {out_path}")

if __name__ == "__main__":
    create_video_script_doc()
