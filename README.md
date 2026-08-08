# Quick-Pasteur Enterprise

> **Enterprise Relational-to-Graph & W3C OWL 2.0 Ontology Automated Transformation Engine**

Quick-Pasteur Enterprise is a data modeling and ontology governance platform that automates the transformation of enterprise relational databases into semantically enriched **W3C OWL 2.0 Ontologies** and **Property Knowledge Graphs**.

---

## 🌟 Key Features & Capabilities

- **📁 Multi-Project & Source Connector Isolation**:
  - Connect to PostgreSQL, MS SQL Server, Oracle, and MySQL databases.
  - Complete project-level isolation; switching active projects dynamically updates all tabs and clears state.

- **🔍 Automated Metadata Discovery & Profiling**:
  - Automatically inspects relational schemas, tables, primary keys, and foreign key relationships.
  - Automated PII tag detection (Email, SSN, Phone, Credit Card, Name) and quality scoring.
  - Inline attribute editing and primary key propagation across ontology layers.

- **⚙️ Business Rules Engine**:
  - Plain English governance rule definitions with entity and attribute tagging.
  - In-app rule creation, editing, and real-time reflection inside the OWL ontology.

- **🦉 W3C OWL 2.0 Ontology Engine & Export**:
  - Standardized W3C OWL 2.0 ontology generator (`owl:Class`, `rdfs:subClassOf`, `owl:DatatypeProperty`, `owl:ObjectProperty`).
  - One-click export to **W3C Turtle (`.ttl`)** and **OWL/XML (`.owl`)**.

- **🎨 Graphical Ontology Visualizer (Timbr.ai Design System)**:
  - Interactive Cytoscape graph canvas featuring Timbr.ai dot-matrix grid styling.
  - Single taxonomy root node (`thing`), color-coded concept circles, teal property squares, and emerald relationship diamonds.
  - Multi-class root path filter (`🧠 Select Classes to Root`) to isolate specific taxonomy branches up to `owl:Thing`.
  - Independent, persistent node drag engine with Euclidean distance hit testing.

- **🕸️ Knowledge Graph Lineage & Target DB Sync**:
  - Lineage visualization with CoSE force-directed layout.
  - Export lineage to **Neo4j Cypher (`.cypher`)** and **GraphML (`.graphml`)**.
  - Direct target database synchronization.

---

## 🏗️ Architecture & Technology Stack

### Backend Stack
- **Framework**: FastAPI (Python 3.10+)
- **ASGI Server**: Uvicorn
- **ORM & Database**: SQLAlchemy (SQLite application DB / PostgreSQL target DB)
- **OWL Processing**: RDFLib 7.0+
- **Validation**: Pydantic v2

### Frontend Stack
- **Core Logic**: HTML5, Vanilla JavaScript (ES6+ Modules)
- **Styling**: Executive Light-Mode CSS Design System (Inter / Google Fonts, Glassmorphism)
- **Graph Visualization**: Cytoscape.js

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.10 or higher
- Git

### 2. Installation
Clone the repository and create a virtual environment:

```bash
# Navigate to project root
cd quick-pasteur

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Running the Server

Start the Uvicorn daemon server from the `backend` directory:

```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 4. Accessing the Application

- **Web Application UI**: [http://127.0.0.1:8000/app](http://127.0.0.1:8000/app)
- **Interactive Swagger API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc API Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 📁 Repository Structure

```
quick-pasteur/
├── README.md                          # Enterprise Documentation
├── requirements.txt                   # Root Python Package Dependencies
└── backend/
    ├── requirements.txt               # Backend Python Package Dependencies
    └── app/
        ├── main.py                    # FastAPI App Entrypoint & Database Seeder
        ├── configuration/             # Settings, Database Engine & Security Config
        ├── models/                    # SQLAlchemy Application Data Models
        ├── schemas/                   # Pydantic Schemas for API Requests & Responses
        ├── api/                       # API v1 Routers & Endpoints
        │   └── endpoints/
        │       ├── projects.py        # Projects API
        │       ├── connectors.py      # Database Connectors API
        │       ├── discovery.py       # Metadata Discovery API
        │       ├── profiling.py       # Data Profiling & Quality API
        │       ├── rules.py           # Business Rules Engine API
        │       ├── ontology.py        # OWL Ontology Editor API
        │       └── graph.py           # Knowledge Graph Lineage API
        ├── services/                  # Business Logic Engines
        │   ├── owl_generator.py       # W3C OWL 2.0 Turtle/XML Service
        │   └── graph_service.py       # Knowledge Graph Cypher/GraphML Service
        └── static/                    # Frontend Web Assets
            ├── index.html             # Single-Page UI App Shell
            ├── css/
            │   └── styles.css         # Executive Light-Mode Styling Tokens
            └── js/                    # Modular Frontend Javascript
                ├── app.js             # State Manager & Navigation
                ├── connectors.js      # Connectors View Controller
                ├── discovery.js       # Metadata Discovery View Controller
                ├── profiling.js       # Data Profiling View Controller
                ├── rules.js           # Business Rules Engine Controller
                ├── ontology.js        # OWL Ontology Editor Controller
                ├── ontology_graph.js  # Graphical Ontology Visualizer (Timbr Engine)
                └── graph.js           # Knowledge Graph Lineage Controller
```

---

## 🧪 Testing & Verification

Run the automated test suite to verify UI rendering and graph interaction:

```bash
# Run Selenium & Pytest Test Suites
python -m pytest backend/app/tests/
```

---

## 📄 License
Enterprise Commercial License - Quick-Pasteur Platform.
