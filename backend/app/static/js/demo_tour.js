/* ==========================================================================
   OntoForge Complete 13-Step Live Presentation Demo Tour Engine
   Allows live executive/client demonstrations directly on the real app.
   ========================================================================== */

(function () {
  console.log("Initializing OntoForge Complete 13-Step Live Presentation Demo Tour Engine...");

  const demoSteps = [
    {
      tab: "connectors",
      title: "Step 1: Multi-Source Data Ingestion & Target Graph Topology",
      badge: "1. CONNECTORS",
      description: "Connect multiple relational source databases (PostgreSQL, SQL Server, MySQL, Oracle) and target Neo4j Knowledge Graph instances via high-speed Bolt protocol.",
      voText: "Step 1: Database Connectors. OntoForge ingests schema metadata from multiple relational databases and connects directly to target Neo4j Knowledge Graph instances."
    },
    {
      tab: "metadata",
      title: "Step 2: Relational Database Metadata Catalog & Auto Discovery",
      badge: "2. METADATA DISCOVERY",
      description: "Automatically inspect primary keys, foreign keys, table definitions, and data types across all connected databases to build the raw structural metadata catalog.",
      voText: "Step 2: Metadata Discovery. OntoForge automatically scans connected database catalogs, extracting tables, primary keys, and foreign key relationships to prepare for ontology mapping."
    },
    {
      tab: "profiling",
      title: "Step 3: Data Profiling & Quality Analysis Engine",
      badge: "3. DATA PROFILING",
      description: "Analyze column nullability, unique constraint ratios, data distributions, and completeness scores across source tables before semantic transformation.",
      voText: "Step 3: Data Profiling. Inspect data quality metrics, nullability ratios, and distribution scores to ensure clean semantic modeling."
    },
    {
      tab: "rules",
      title: "Step 4: Business Rules Engine & Constraint Logic",
      badge: "4. BUSINESS RULES",
      description: "Define custom enterprise validation rules, data transformation logic, and domain constraint policies governing knowledge graph generation.",
      voText: "Step 4: Business Rules Engine. Apply domain policies, validation constraints, and business logic to steer automated ontology generation."
    },
    {
      tab: "ontology",
      title: "Step 5: OWL Ontology Editor & Smart Class Governance Workspace",
      badge: "5. OWL ONTOLOGY WORKSPACE",
      description: "Manage enterprise ontology classes as visual matrix cards. Inspect class URIs, properties, parent-child inheritance (subClassOf), and perform 1-click class deletions with automatic subclass rebinding to owl:Thing.",
      voText: "Step 5: OWL Ontology Editor. Here, domain experts inspect extracted classes like Device, TemperatureSensor, and Location. You can edit properties or click Delete Class to trigger automatic subclass rebinding to owl:Thing with zero data loss."
    },
    {
      tab: "ontology-graph",
      title: "Step 6: Graphical Ontology & Class Hierarchy Visualizer",
      badge: "6. GRAPHICAL ONTOLOGY",
      description: "Interactive visual tree and network rendering of class relationships, domain-range properties, and inheritance hierarchies.",
      voText: "Step 6: Graphical Ontology. View the visual class hierarchy and property connections rendered in an interactive tree view."
    },
    {
      tab: "ontology-viewer",
      title: "Step 7: W3C RDF/OWL Turtle Export & Model Inspection",
      badge: "7. RDF / OWL EXPORTER",
      description: "Export the full enterprise ontology into standard W3C Turtle (.ttl) or RDF/XML syntax with 1-click file download or direct graph repository synchronization.",
      voText: "Step 7: W3C RDF and OWL Exporter. OntoForge serializes refined ontology classes into standard W3C Turtle syntax with one-click download and live repository sync."
    },
    {
      tab: "graph",
      title: "Step 8: Interactive Knowledge Graph Visualizer & Node Explorer",
      badge: "8. KNOWLEDGE GRAPH",
      description: "Explore the live projected graph network in Cytoscape/Neo4j. Node types and relationship edges represent real business entities and ontology hierarchy.",
      voText: "Step 8: Knowledge Graph Visualizer. This view projects RDF triples directly into live graph nodes and edges, allowing visual graph exploration and topology inspection."
    },
    {
      tab: "data-movement",
      title: "Step 9: Data Movement Engine & Batch Graph ETL Execution",
      badge: "9. DATA MOVEMENT",
      description: "Execute high-throughput data pipelines converting relational row records into graph nodes and relationship triples in the target Neo4j instance.",
      voText: "Step 9: Data Movement Engine. Trigger automated ETL pipelines migrating relational data records directly into Neo4j graph nodes and edges."
    },
    {
      tab: "graph-profiler",
      title: "Step 10: Graph Topology Profiler & Density Metrics",
      badge: "10. GRAPH PROFILER",
      description: "Analyze node degree distributions, graph density, clustering coefficients, and hub centrality across the knowledge graph topology.",
      voText: "Step 10: Graph Topology Profiler. Measure graph density, node degree distribution, and structural connectivity metrics."
    },
    {
      tab: "schema-matrix",
      title: "Step 11: Schema Lineage Matrix & Source-to-Target Mapping",
      badge: "11. SCHEMA LINEAGE MATRIX",
      description: "Full end-to-end lineage tracing mapping relational source columns directly to target knowledge graph entity properties.",
      voText: "Step 11: Schema Lineage Matrix. Trace complete data lineage from source relational columns to target graph node properties."
    },
    {
      tab: "llm-insights",
      title: "Step 12: Gemini AI GraphRAG & Natural Language Query Assistant",
      badge: "12. GEMINI AI GRAPHRAG",
      description: "Ask natural language business questions. Gemini AI converts prompts into precise Cypher graph queries, executing against Neo4j to deliver 100% deterministic, hallucination-free graph answers.",
      voText: "Step 12: Gemini AI GraphRAG Engine. Users ask natural language prompts. Gemini AI generates Cypher queries against Neo4j, returning accurate, deterministic answers grounded in live graph truth."
    },
    {
      tab: "saved-cyphers",
      title: "Step 13: Approved Cypher Query Templates Library",
      badge: "13. SAVED CYPHER QUERIES",
      description: "Manage a library of pre-approved, audited Cypher queries for recurring executive reporting and enterprise AI prompt templates.",
      voText: "Step 13: Saved Cypher Queries Library. Manage a library of pre-approved, audited Cypher queries for enterprise reporting and AI prompt templates."
    }
  ];

  let currentStepIdx = 0;
  let isTourRunning = false;
  let isAutoPlay = false;
  let isVoiceover = true;
  let autoTimer = null;
  let synth = window.speechSynthesis;

  function injectTourUI() {
    if (document.getElementById("demo-tour-box")) return;

    const tourBoxHTML = `
      <div id="demo-tour-box" style="display: none; position: fixed; bottom: 24px; right: 24px; width: 460px; max-width: 92vw; background: #FFFFFF; border: 2px solid #4F46E5; border-radius: 16px; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.22); z-index: 999999; padding: 20px; font-family: 'Plus Jakarta Sans', sans-serif;">
        
        <!-- Top Header with Logo -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 12px; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="/static/img/ontoforge_logo.png" alt="OntoForge" style="height: 28px; width: auto;">
            <span style="background: #EEF2FF; color: #4F46E5; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 12px; text-transform: uppercase;" id="tour-badge-el">1. CONNECTORS</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 12px; font-weight: 800; color: #64748B; font-family: monospace;" id="tour-step-counter">Step 1 of 13</span>
            <button onclick="stopDemoTour()" style="background: transparent; border: none; font-size: 20px; cursor: pointer; color: #94A3B8; font-weight: 700; line-height: 1;">&times;</button>
          </div>
        </div>

        <!-- Content -->
        <h4 id="tour-title-el" style="font-size: 14.5px; font-weight: 800; color: #0F172A; margin: 0 0 6px 0; line-height: 1.3;">
          Step 1: Multi-Source Data Ingestion
        </h4>
        <p id="tour-desc-el" style="font-size: 12px; color: #334155; line-height: 1.5; margin: 0 0 14px 0;">
          Connect multiple relational source databases into a unified target Knowledge Graph.
        </p>

        <!-- Controls -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E2E8F0; padding-top: 12px;">
          <div style="display: flex; gap: 6px;">
            <button onclick="prevDemoStep()" style="background: #F1F5F9; border: 1px solid #CBD5E1; color: #0F172A; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">‹ Prev</button>
            <button onclick="nextDemoStep()" style="background: #4F46E5; border: 1px solid #4F46E5; color: white; padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">Next ›</button>
          </div>

          <div style="display: flex; gap: 6px;">
            <button id="btn-tour-auto" onclick="toggleTourAutoplay()" style="background: #EEF2FF; border: 1px solid #C7D2FE; color: #4F46E5; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">▶ Auto Tour</button>
            <button id="btn-tour-vo" onclick="toggleTourVoiceover()" style="background: #F8FAFC; border: 1px solid #E2E8F0; color: #0F172A; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">🔊 Voiceover: ON</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", tourBoxHTML);
  }

  function ensureSampleDataForTab(tabName) {
    if (tabName === "ontology") {
      if (typeof window.renderOntologyMatrix === "function") {
        const classes = [
          {
            name: "Device",
            uri: "http://onto.org/Device",
            subclass_of: "owl:Thing",
            attributes: [{ attribute_name: "id", data_type: "string" }, { attribute_name: "status", data_type: "string" }]
          },
          {
            name: "TemperatureSensor",
            uri: "http://onto.org/TemperatureSensor",
            subclass_of: "Device",
            attributes: [{ attribute_name: "temperature", data_type: "float" }, { attribute_name: "unit", data_type: "string" }]
          },
          {
            name: "Location",
            uri: "http://onto.org/Location",
            subclass_of: "owl:Thing",
            attributes: [{ attribute_name: "facility", data_type: "string" }, { attribute_name: "room", data_type: "string" }]
          }
        ];
        window.renderOntologyMatrix(classes);
      }
    } else if (tabName === "llm-insights") {
      const promptEl = document.getElementById("cypher-prompt-input");
      if (promptEl && !promptEl.value) {
        promptEl.value = "Find all temperature sensors reporting values above 85 degrees and return their facility location.";
      }
    }
  }

  window.startDemoTour = function () {
    injectTourUI();
    isTourRunning = true;
    currentStepIdx = 0;
    document.getElementById("demo-tour-box").style.display = "block";
    showStep(currentStepIdx);
  };

  window.stopDemoTour = function () {
    isTourRunning = false;
    isAutoPlay = false;
    if (autoTimer) clearTimeout(autoTimer);
    if (synth) synth.cancel();
    const box = document.getElementById("demo-tour-box");
    if (box) box.style.display = "none";
  };

  function showStep(idx) {
    const step = demoSteps[idx];
    if (!step) return;

    if (typeof window.switchToTab === "function") {
      window.switchToTab(step.tab);
    }

    ensureSampleDataForTab(step.tab);

    document.getElementById("tour-badge-el").innerText = step.badge;
    document.getElementById("tour-step-counter").innerText = `Step ${idx + 1} of ${demoSteps.length}`;
    document.getElementById("tour-title-el").innerText = step.title;
    document.getElementById("tour-desc-el").innerText = step.description;

    if (isVoiceover && synth) {
      synth.cancel();
      const ut = new SpeechSynthesisUtterance(step.voText);
      ut.rate = 1.0;
      synth.speak(ut);
    }

    if (isAutoPlay) {
      if (autoTimer) clearTimeout(autoTimer);
      autoTimer = setTimeout(() => {
        nextDemoStep();
      }, 10000);
    }
  }

  window.nextDemoStep = function () {
    currentStepIdx = (currentStepIdx + 1) % demoSteps.length;
    showStep(currentStepIdx);
  };

  window.prevDemoStep = function () {
    currentStepIdx = (currentStepIdx - 1 + demoSteps.length) % demoSteps.length;
    showStep(currentStepIdx);
  };

  window.toggleTourAutoplay = function () {
    isAutoPlay = !isAutoPlay;
    const btn = document.getElementById("btn-tour-auto");
    if (isAutoPlay) {
      btn.innerText = "⏸ Pause Tour";
      btn.style.background = "#4F46E5";
      btn.style.color = "white";
      showStep(currentStepIdx);
    } else {
      btn.innerText = "▶ Auto Tour";
      btn.style.background = "#EEF2FF";
      btn.style.color = "#4F46E5";
      if (autoTimer) clearTimeout(autoTimer);
    }
  };

  window.toggleTourVoiceover = function () {
    isVoiceover = !isVoiceover;
    const btn = document.getElementById("btn-tour-vo");
    if (isVoiceover) {
      btn.innerText = "🔊 Voiceover: ON";
      showStep(currentStepIdx);
    } else {
      btn.innerText = "🔇 Voiceover: OFF";
      if (synth) synth.cancel();
    }
  };

  window.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("demo") === "true") {
      setTimeout(() => {
        window.startDemoTour();
      }, 1000);
    }
  });
})();
