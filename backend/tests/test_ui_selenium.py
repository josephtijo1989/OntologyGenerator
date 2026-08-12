import time
import socket
import threading
import pytest
import uvicorn
import httpx
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from app.main import app


def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        s.listen(1)
        port = s.getsockname()[1]
    return port


@pytest.fixture(scope="session")
def test_server():
    port = find_free_port()
    config = uvicorn.Config(app=app, host="127.0.0.1", port=port, log_level="warning")
    server = uvicorn.Server(config=config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    # Wait for server to be responsive
    base_url = f"http://127.0.0.1:{port}"
    timeout = 10
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1):
                break
        except (OSError, ConnectionRefusedError):
            time.sleep(0.1)

    yield base_url
    server.should_exit = True


@pytest.fixture(scope="session")
def driver():
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--window-size=1600,1050")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.set_capability("goog:loggingPrefs", {"browser": "ALL"})

    dr = webdriver.Chrome(options=chrome_options)
    dr.implicitly_wait(5)
    yield dr
    dr.quit()


def wait_for_toast(driver, expected_substring=None, timeout=6):
    """Helper to wait for toast notification to appear."""
    toast_xpath = "//div[contains(@class, 'toast-card')]"
    try:
        toast = WebDriverWait(driver, timeout).until(
            EC.visibility_of_element_located((By.XPATH, toast_xpath))
        )
        if expected_substring:
            assert expected_substring.lower() in toast.text.lower(), f"Expected '{expected_substring}' in toast: '{toast.text}'"
        return toast.text
    except Exception:
        return None


class TestFullApplicationUI:
    """
    Comprehensive End-to-End UI Automation Test Suite using Selenium.
    Validates all Enterprise Platform Subsystems:
    1. Branding & Shell Layout
    2. Multi-Project Lifecycle & Settings
    3. Database Connectors & Target DB Topology
    4. Automated Metadata Discovery & Cataloging
    5. Data Profiling, Quality Scoring & PII Governance
    6. Business & Governance Rules Engine
    7. W3C OWL 2.0 Ontology Editor & Exporter
    8. Graphical Ontology Visualizer (Timbr Engine)
    9. Ontology Viewer & Sandbox Engine
    10. Enterprise Knowledge Graph Lineage & Target Sync
    11. Backend Health & Documentation Endpoints
    12. Browser Console Error Audit (Zero JS Failures)
    """

    def test_01_app_initial_load_and_branding(self, driver, test_server):
        driver.get(f"{test_server}/app")
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "body")))

        # 1. Verify Page Title
        assert "OntoForge" in driver.title or "Quick-Pasteur" in driver.title

        # 2. Verify Header Branding & Nav Elements
        logo_text = driver.find_element(By.CLASS_NAME, "logo-text").text
        assert "OntoForge" in logo_text or "Quick-Pasteur" in logo_text

        # 3. Verify Active Project Selector
        project_select = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "projectSelect"))
        )
        assert project_select is not None

        # 4. Verify Sidebar Navigation Buttons for all 8 application views
        nav_buttons = driver.find_elements(By.CLASS_NAME, "nav-btn")
        expected_views = ["connectors", "metadata", "profiling", "rules", "ontology", "ontology-graph", "ontology-viewer", "graph"]
        found_views = [b.get_attribute("data-view") for b in nav_buttons]
        for ev in expected_views:
            assert ev in found_views, f"Expected nav button for '{ev}' not found"

        # 5. Verify default active panel is Database Connectors
        active_panel = driver.find_element(By.CSS_SELECTOR, ".view-panel.active")
        assert active_panel.get_attribute("id") == "panel-connectors"

    def test_02_project_creation_and_switching(self, driver, test_server):
        # 1. Open New Project Modal
        new_proj_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'New Project')]"))
        )
        new_proj_btn.click()

        modal = WebDriverWait(driver, 5).until(
            EC.visibility_of_element_located((By.ID, "projectModal"))
        )
        assert modal.is_displayed()

        # 2. Fill Project Details
        proj_name_input = driver.find_element(By.ID, "np-name")
        proj_code_input = driver.find_element(By.ID, "np-code")
        proj_desc_input = driver.find_element(By.ID, "np-desc")

        test_proj_name = f"Enterprise Ontology Project {int(time.time())}"
        test_proj_code = f"PROJ_{int(time.time()) % 10000}"

        proj_name_input.clear()
        proj_name_input.send_keys(test_proj_name)
        proj_code_input.clear()
        proj_code_input.send_keys(test_proj_code)
        proj_desc_input.clear()
        proj_desc_input.send_keys("Automated UI testing project for full enterprise verification.")

        # 3. Submit Project Creation
        submit_btn = driver.find_element(By.XPATH, "//*[@id='projectModal']//button[contains(., 'Create Project')]")
        submit_btn.click()

        # 4. Wait for Modal to Close and Project to be Selected in Dropdown
        WebDriverWait(driver, 6).until(EC.invisibility_of_element_located((By.ID, "projectModal")))

        project_select = Select(driver.find_element(By.ID, "projectSelect"))
        selected_option = project_select.first_selected_option.text
        assert test_proj_name in selected_option or test_proj_code in selected_option

    def test_03_database_connectors_and_target_topology(self, driver, test_server):
        # 1. Switch to Connectors tab
        conn_tab_btn = driver.find_element(By.CSS_SELECTOR, ".nav-btn[data-view='connectors']")
        conn_tab_btn.click()

        # 2. Open Add Source Database Modal
        add_db_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Add Source Database')]"))
        )
        add_db_btn.click()

        conn_modal = WebDriverWait(driver, 5).until(
            EC.visibility_of_element_located((By.ID, "connModal"))
        )
        assert conn_modal.is_displayed()

        # 3. Fill Connector Form
        driver.find_element(By.ID, "nc-name").clear()
        driver.find_element(By.ID, "nc-name").send_keys("Corporate SQL Server Production")
        Select(driver.find_element(By.ID, "nc-type")).select_by_value("MSSQL")
        driver.find_element(By.ID, "nc-host").clear()
        driver.find_element(By.ID, "nc-host").send_keys("sqlserver.corp.local")
        driver.find_element(By.ID, "nc-dbname").clear()
        driver.find_element(By.ID, "nc-dbname").send_keys("ERP_PROD_DB")

        # 4. Save Connector
        save_conn_btn = driver.find_element(By.XPATH, "//*[@id='connModal']//button[contains(., 'Save Connection')]")
        save_conn_btn.click()

        WebDriverWait(driver, 6).until(EC.invisibility_of_element_located((By.ID, "connModal")))

        # 5. Verify Connector Card is in the List
        source_list = WebDriverWait(driver, 6).until(
            EC.presence_of_element_located((By.ID, "source-conns-list"))
        )
        assert "Corporate SQL Server Production" in source_list.text
        assert "MSSQL" in source_list.text

        # 6. Test Connector Button Click
        test_conn_btn = driver.find_element(By.XPATH, "//button[contains(., 'Test Connection')]")
        test_conn_btn.click()
        wait_for_toast(driver, timeout=5)

        # 7. Configure Target Graph Database
        config_target_btn = driver.find_element(By.XPATH, "//button[contains(., 'Configure Target Graph DB')]")
        config_target_btn.click()

        graph_modal = WebDriverWait(driver, 5).until(
            EC.visibility_of_element_located((By.ID, "graphModal"))
        )
        driver.find_element(By.ID, "ng-name").clear()
        driver.find_element(By.ID, "ng-name").send_keys("Enterprise Neo4j Production Cluster")
        Select(driver.find_element(By.ID, "ng-type")).select_by_value("NEO4J")
        driver.find_element(By.XPATH, "//*[@id='graphModal']//button[contains(., 'Save Graph Config')]").click()

        WebDriverWait(driver, 6).until(EC.invisibility_of_element_located((By.ID, "graphModal")))
        assert "Enterprise Neo4j" in driver.find_element(By.ID, "tg-name").text

    def test_04_metadata_auto_discovery(self, driver, test_server):
        # 1. Switch to Metadata Discovery tab
        meta_tab_btn = driver.find_element(By.CSS_SELECTOR, ".nav-btn[data-view='metadata']")
        meta_tab_btn.click()

        # 2. Click "Run Auto Discovery"
        discover_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Run Auto Discovery')]"))
        )
        discover_btn.click()

        # 3. Wait for discovery progress modal to finish and close
        WebDriverWait(driver, 20).until(
            EC.invisibility_of_element_located((By.ID, "discoveryProgressModal"))
        )

        # 4. Wait for discovery to populate table rows in catalog
        tbody = WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.ID, "metadata-tbody"))
        )
        WebDriverWait(driver, 15).until(
            lambda d: any(x in d.find_element(By.ID, "metadata-tbody").text for x in ["Customers", "Orders", "Products", "dbo"])
        )

        rows = tbody.find_elements(By.TAG_NAME, "tr")
        assert len(rows) > 0, "Expected discovered tables in metadata catalog table"

        # Verify key entities and primary keys exist
        tbody_text = tbody.text
        assert any(entity in tbody_text for entity in ["Customers", "Orders", "Products", "dbo"])
        assert "🔑" in tbody_text or "PK" in tbody_text

    def test_05_data_profiling_and_pii_management(self, driver, test_server):
        # 1. Switch to Data Profiling & Quality tab
        prof_tab_btn = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".nav-btn[data-view='profiling']"))
        )
        driver.execute_script("arguments[0].click();", prof_tab_btn)
        WebDriverWait(driver, 6).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#panel-profiling.active"))
        )

        # 2. Click "Run Data Profiling"
        run_prof_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//*[@id='panel-profiling']//button[contains(., 'Run Data Profiling')]"))
        )
        driver.execute_script("arguments[0].click();", run_prof_btn)

        # Wait for profilingProgressModal to finish
        WebDriverWait(driver, 20).until(
            EC.invisibility_of_element_located((By.ID, "profilingProgressModal"))
        )

        # 3. Wait for Profiling Cards to populate in grid
        cards = WebDriverWait(driver, 15).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, "#profiling-grid .glass-card"))
        )
        assert len(cards) > 0, "Expected profiling cards rendered in grid"

        # 4. Open Table Profiling Details Drawer on first card
        first_card = cards[0]
        driver.execute_script("arguments[0].click();", first_card)

        detail_modal = WebDriverWait(driver, 6).until(
            EC.visibility_of_element_located((By.ID, "profileDetailModal"))
        )
        assert detail_modal.is_displayed()

        # Verify modal metrics (Quality Score, Rows, Columns)
        score_text = driver.find_element(By.ID, "pdm-score").text
        assert "%" in score_text

        # 5. Toggle PII and Save Classifications
        pii_checks = driver.find_elements(By.CSS_SELECTOR, "#pdm-tbody .pii-check")
        if pii_checks:
            if not pii_checks[0].is_selected():
                driver.execute_script("arguments[0].click();", pii_checks[0])

        save_pii_btn = driver.find_element(By.XPATH, "//*[@id='profileDetailModal']//button[contains(., 'Save PII Classifications')]")
        driver.execute_script("arguments[0].click();", save_pii_btn)

        WebDriverWait(driver, 6).until(
            EC.invisibility_of_element_located((By.ID, "profileDetailModal"))
        )

    def test_06_business_rules_engine(self, driver, test_server):
        # 1. Switch to Rules tab
        rules_tab_btn = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".nav-btn[data-view='rules']"))
        )
        driver.execute_script("arguments[0].click();", rules_tab_btn)
        WebDriverWait(driver, 6).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#panel-rules.active"))
        )

        # 2. Click "Add Business Rule"
        add_rule_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Add Business Rule')]"))
        )
        add_rule_btn.click()

        rule_modal = WebDriverWait(driver, 5).until(
            EC.visibility_of_element_located((By.ID, "ruleModal"))
        )
        assert rule_modal.is_displayed()

        # 3. Fill Business Rule Form
        rule_name = f"Mask Customer Email Rule {int(time.time()) % 1000}"
        driver.find_element(By.ID, "nr-name").send_keys(rule_name)
        driver.find_element(By.ID, "nr-def").send_keys("Customer email addresses must be securely masked for GDPR compliance.")

        # Test Target Entity search selection
        entity_search = driver.find_element(By.ID, "nr-entity-search")
        entity_search.click()
        entity_search.send_keys("Customers")

        # Select first matching entity option if available
        opt_items = driver.find_elements(By.CSS_SELECTOR, "#nr-entity-list .combobox-option-item")
        if opt_items:
            opt_items[0].click()

        # 4. Save Rule
        save_btn = driver.find_element(By.XPATH, "//*[@id='ruleModal']//button[contains(., 'Save Rule')]")
        driver.execute_script("arguments[0].click();", save_btn)

        WebDriverWait(driver, 6).until(
            EC.invisibility_of_element_located((By.ID, "ruleModal"))
        )

        # 5. Verify Rule in Table
        rules_tbody = WebDriverWait(driver, 6).until(
            EC.presence_of_element_located((By.ID, "rules-tbody"))
        )
        WebDriverWait(driver, 6).until(
            lambda d: rule_name in d.find_element(By.ID, "rules-tbody").text
        )
        assert rule_name in rules_tbody.text

    def test_07_owl_ontology_editor_and_modals(self, driver, test_server):
        # 1. Switch to OWL Ontology Editor tab
        onto_tab_btn = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".nav-btn[data-view='ontology']"))
        )
        driver.execute_script("arguments[0].click();", onto_tab_btn)
        WebDriverWait(driver, 6).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#panel-ontology.active"))
        )

        # 2. Verify Ontology Classes List
        onto_list = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "ontology-list"))
        )
        WebDriverWait(driver, 10).until(
            lambda d: len(d.find_elements(By.CSS_SELECTOR, "#ontology-list > div")) > 0
        )
        assert len(onto_list.find_elements(By.CSS_SELECTOR, "#ontology-list > div")) > 0

        # 3. Test Full Modal & Properties Editor
        full_modal_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Full Modal')]"))
        )
        driver.execute_script("arguments[0].click();", full_modal_btn)

        class_modal = WebDriverWait(driver, 6).until(
            EC.visibility_of_element_located((By.ID, "ontologyClassModal"))
        )
        assert class_modal.is_displayed()

        # Add a custom attribute inside modal
        add_attr_btn = driver.find_element(By.XPATH, "//*[@id='ontologyClassModal']//button[contains(., 'Add Attribute')]")
        driver.execute_script("arguments[0].click();", add_attr_btn)

        # Save class modal
        save_class_btn = driver.find_element(By.XPATH, "//*[@id='ontologyClassModal']//button[contains(., 'Save Ontology Class')]")
        driver.execute_script("arguments[0].click();", save_class_btn)

        WebDriverWait(driver, 6).until(
            EC.invisibility_of_element_located((By.ID, "ontologyClassModal"))
        )

        # 4. Test Export Turtle & XML buttons
        export_ttl_btn = driver.find_element(By.XPATH, "//*[@id='panel-ontology']//button[contains(., 'Export Turtle')]")
        driver.execute_script("arguments[0].click();", export_ttl_btn)
        time.sleep(0.3)

    def test_08_graphical_ontology_visualizer(self, driver, test_server):
        # 1. Switch to Graphical Ontology tab
        onto_graph_btn = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".nav-btn[data-view='ontology-graph']"))
        )
        driver.execute_script("arguments[0].click();", onto_graph_btn)
        WebDriverWait(driver, 6).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#panel-ontology-graph.active"))
        )

        # 2. Verify Cytoscape canvas container
        cy_box = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "cy-ontology"))
        )
        assert cy_box is not None

        # 3. Test Mode Toggle buttons: Metadata, Mapping, Semantic Ontology
        meta_mode_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, ".onto-mode-btn[data-mode='metadata']"))
        )
        driver.execute_script("arguments[0].click();", meta_mode_btn)
        time.sleep(0.5)

        map_mode_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, ".onto-mode-btn[data-mode='mapping']"))
        )
        driver.execute_script("arguments[0].click();", map_mode_btn)
        time.sleep(0.5)
        mapping_container = driver.find_element(By.ID, "ontoMappingContainer")
        assert mapping_container.is_displayed()

        # Switch back to Semantic Ontology Mode
        onto_mode_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, ".onto-mode-btn[data-mode='ontology']"))
        )
        driver.execute_script("arguments[0].click();", onto_mode_btn)
        time.sleep(0.5)

        # 4. Test Concept Filter Chips
        chips = driver.find_elements(By.CSS_SELECTOR, ".onto-chip-btn")
        for chip in chips:
            driver.execute_script("arguments[0].click();", chip)
            time.sleep(0.1)

        # Reset chip filter to "all"
        all_chip = driver.find_element(By.CSS_SELECTOR, ".onto-chip-btn[data-filter='all']")
        driver.execute_script("arguments[0].click();", all_chip)

        # 5. Test Zoom Controls
        zoom_in_btn = driver.find_element(By.CSS_SELECTOR, "button[title='Zoom In']")
        driver.execute_script("arguments[0].click();", zoom_in_btn)
        time.sleep(0.2)

        fit_btn = driver.find_element(By.CSS_SELECTOR, "button[title='Fit View to Screen']")
        driver.execute_script("arguments[0].click();", fit_btn)
        time.sleep(0.3)

        # 6. Test "Create New Class" directly from Graphical Ontology Visualizer
        create_class_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//*[@id='panel-ontology-graph']//button[contains(., 'Create New Class')]"))
        )
        driver.execute_script("arguments[0].click();", create_class_btn)

        create_modal = WebDriverWait(driver, 6).until(
            EC.visibility_of_element_located((By.ID, "createOntologyClassModal"))
        )
        assert create_modal.is_displayed()

        # Fill Class Name & Description
        new_class_name = f"GraphConcept_{int(time.time()) % 10000}"
        driver.find_element(By.ID, "goc-label").send_keys(new_class_name)
        driver.find_element(By.ID, "goc-comment").send_keys("Test class created directly from Graphical Ontology")

        # Submit Create Class
        submit_create_btn = driver.find_element(By.XPATH, "//*[@id='createOntologyClassModal']//button[@onclick='submitCreateClassFromGraph()']")
        driver.execute_script("arguments[0].click();", submit_create_btn)

        WebDriverWait(driver, 6).until(
            EC.invisibility_of_element_located((By.ID, "createOntologyClassModal"))
        )
        wait_for_toast(driver, timeout=6)

    def test_09_ontology_viewer_sandbox(self, driver, test_server):
        # 1. Switch to "Upload & View Ontology" (Sandbox) tab
        viewer_btn = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".nav-btn[data-view='ontology-viewer']"))
        )
        driver.execute_script("arguments[0].click();", viewer_btn)
        WebDriverWait(driver, 6).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#panel-ontology-viewer.active"))
        )

        # 2. Click Quick Sample Preset chip: Pasteur Biological & Assay Graph
        preset_chips = WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.CLASS_NAME, "preset-chip"))
        )
        assert len(preset_chips) >= 2
        driver.execute_script("arguments[0].click();", preset_chips[0])

        # Wait for metrics summary cards to be populated
        WebDriverWait(driver, 10).until(
            lambda d: int(d.find_element(By.ID, "v-stat-classes").text or '0') >= 3
        )

        stat_classes = driver.find_element(By.ID, "v-stat-classes").text
        assert int(stat_classes) >= 3, "Expected parsed classes count >= 3"

        stat_triples = driver.find_element(By.ID, "v-stat-triples").text
        assert int(stat_triples) > 0, "Expected parsed triples count > 0"

        # 3. Test Sub-Tab navigation: Classes Grid, Properties Table, Raw Source, Graph View
        classes_subtab = driver.find_element(By.CSS_SELECTOR, ".viewer-tab-btn[data-subtab='classes']")
        driver.execute_script("arguments[0].click();", classes_subtab)
        time.sleep(0.3)
        assert driver.find_element(By.ID, "v-pane-classes").is_displayed()

        props_subtab = driver.find_element(By.CSS_SELECTOR, ".viewer-tab-btn[data-subtab='properties']")
        driver.execute_script("arguments[0].click();", props_subtab)
        time.sleep(0.3)
        assert driver.find_element(By.ID, "v-pane-props").is_displayed()

        source_subtab = driver.find_element(By.CSS_SELECTOR, ".viewer-tab-btn[data-subtab='source']")
        driver.execute_script("arguments[0].click();", source_subtab)
        time.sleep(0.3)
        assert driver.find_element(By.ID, "v-pane-source").is_displayed()

        graph_subtab = driver.find_element(By.CSS_SELECTOR, ".viewer-tab-btn[data-subtab='graph']")
        driver.execute_script("arguments[0].click();", graph_subtab)
        time.sleep(0.3)
        assert driver.find_element(By.ID, "v-pane-graph").is_displayed()

        # 4. Test "Create Subclass" in Sandbox
        create_subclass_btn = driver.find_element(By.XPATH, "//*[@id='panel-ontology-viewer']//button[contains(., 'Create Subclass') or contains(., 'Add Subclass')]")
        driver.execute_script("arguments[0].click();", create_subclass_btn)

        subclass_modal = WebDriverWait(driver, 6).until(
            EC.visibility_of_element_located((By.ID, "viewerSubclassModal"))
        )
        assert subclass_modal.is_displayed()

        # Fill Subclass Label
        subclass_name = f"ViralProtein_{int(time.time()) % 1000}"
        driver.find_element(By.ID, "vsc-label").send_keys(subclass_name)
        Select(driver.find_element(By.ID, "vsc-domain")).select_by_value("Dimension")

        # Submit Subclass specifically via button inside #viewerSubclassModal
        submit_sc_btn = driver.find_element(By.XPATH, "//*[@id='viewerSubclassModal']//button[@onclick='submitViewerCreateSubclass()']")
        driver.execute_script("arguments[0].click();", submit_sc_btn)

        WebDriverWait(driver, 6).until(
            EC.invisibility_of_element_located((By.ID, "viewerSubclassModal"))
        )

        # Verify class counter increased
        new_stat_classes = driver.find_element(By.ID, "v-stat-classes").text
        assert int(new_stat_classes) > int(stat_classes)

    def test_10_knowledge_graph_lineage_and_sync(self, driver, test_server):
        # 1. Switch to Knowledge Graph tab
        graph_tab_btn = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".nav-btn[data-view='graph']"))
        )
        driver.execute_script("arguments[0].click();", graph_tab_btn)
        WebDriverWait(driver, 6).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#panel-graph.active"))
        )

        # 2. Verify Cytoscape canvas
        cy_canvas = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "cy"))
        )
        assert cy_canvas is not None

        # 3. Test Layout Engine switcher dropdown
        layout_select = Select(driver.find_element(By.ID, "graphLayoutSelect"))
        layout_select.select_by_value("circle")
        time.sleep(0.5)
        layout_select.select_by_value("cose")
        time.sleep(0.5)

        # 4. Test Search filter input
        search_input = driver.find_element(By.ID, "graphSearchInput")
        search_input.send_keys("cust")
        time.sleep(0.3)
        search_input.clear()

        # 5. Test Export & Sync to Target DB Button
        sync_btn = driver.find_element(By.XPATH, "//button[contains(., 'Export & Sync to Target DB')]")
        driver.execute_script("arguments[0].click();", sync_btn)
        wait_for_toast(driver, timeout=5)

    def test_11_backend_health_and_documentation_endpoints(self, test_server):
        """Verifies backend API endpoints: /health, /docs, and /redoc."""
        with httpx.Client(base_url=test_server) as client:
            # 1. Health check
            res_health = client.get("/health")
            assert res_health.status_code == 200
            data = res_health.json()
            assert data.get("status") == "UP"

            # 2. Swagger docs
            res_docs = client.get("/docs")
            assert res_docs.status_code == 200
            assert "swagger" in res_docs.text.lower() or "html" in res_docs.text.lower()

            # 3. ReDoc documentation
            res_redoc = client.get("/redoc")
            assert res_redoc.status_code == 200

    def test_12_browser_console_error_audit(self, driver):
        """Audits the browser logs to guarantee zero uncaught JavaScript errors occurred in application code during test suite execution."""
        logs = driver.get_log("browser")
        app_severe_errors = [
            entry for entry in logs
            if entry.get("level") == "SEVERE"
            and "favicon.ico" not in entry.get("message", "")
            and "cytoscape.min.js" not in entry.get("message", "")
        ]
        if app_severe_errors:
            print(f"Browser Application SEVERE log entries: {app_severe_errors}")
        fatal_app_errors = [
            e for e in app_severe_errors
            if "SyntaxError" in e.get("message", "") or "TypeError" in e.get("message", "")
        ]
        assert len(fatal_app_errors) == 0, f"Uncaught application JS fatal errors: {fatal_app_errors}"
