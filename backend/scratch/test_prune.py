import sys
sys.path.insert(0, '.')

from app.configuration.database import SessionLocal
from app.services.llm_insight_service import LLMInsightService

db = SessionLocal()
svc = LLMInsightService(db)

test_query = """MATCH (c:Contract)
OPTIONAL MATCH (c)-[r1]-(v:Vendor)
OPTIONAL MATCH (c)-[r2]-(i:Invoice)
WHERE (c.multipleJurisdictionIndicator = true OR c.multiple_jurisdiction_indicator = true) AND (i.dueDate IS NOT NULL OR i.due_date IS NOT NULL) AND (i.totalAmount > 0 OR i.total_amount > 0)
RETURN coalesce(c.bankruptcycondition, c.id) AS Contract_bankruptcycondition, coalesce(c.project_id, c.id) AS Contract_project_id, coalesce(c.contractperiodmonths, c.id) AS Contract_contractperiodmonths, coalesce(c.domain_type, c.id) AS Contract_domain_type, coalesce(c.contracturl, c.id) AS Contract_contracturl, coalesce(c.governingruleoflawjurisdictionid, c.id) AS Contract_governingruleoflawjurisdictionid, coalesce(c.contractdescription, c.id) AS Contract_contractdescription, coalesce(c.automaticrenewalnotificationperiod, c.id) AS Contract_automaticrenewalnotificationperiod, coalesce(c.primaryjurisdictionid, c.id) AS Contract_primaryjurisdictionid, coalesce(c.revocationofofferbysellercondition, c.id) AS Contract_revocationofofferbysellercondition, type(r1) AS Rel_Vendor, coalesce(v.vendorid, v.id) AS Vendor_vendorid, coalesce(v.naicsnationalindustrycode, v.id) AS Vendor_naicsnationalindustrycode, coalesce(v.project_id, v.id) AS Vendor_project_id, coalesce(v.updatedat, v.id) AS Vendor_updatedat, coalesce(v.stockexchangename, v.id) AS Vendor_stockexchangename, coalesce(v.domain_type, v.id) AS Vendor_domain_type, coalesce(v.foreignownedindicator, v.id) AS Vendor_foreignownedindicator, coalesce(v.bankruptcyindicator, v.id) AS Vendor_bankruptcyindicator, coalesce(v.compliancestatus, v.id) AS Vendor_compliancestatus, coalesce(v.vendortype, v.id) AS Vendor_vendortype, type(r2) AS Rel_Invoice, coalesce(i.totalinvoiceamount, i.id) AS Invoice_totalinvoiceamount, coalesce(i.status, i.id) AS Invoice_status, coalesce(i.totalinvoicechargesamount, i.id) AS Invoice_totalinvoicechargesamount, coalesce(i.vendorid, i.id) AS Invoice_vendorid, coalesce(i.totalinvoicetaxesamount, i.id) AS Invoice_totalinvoicetaxesamount, coalesce(i.projectid, i.id) AS Invoice_projectid, coalesce(i.updatedat, i.id) AS Invoice_updatedat, coalesce(i.domain_type, i.id) AS Invoice_domain_type, coalesce(i.invoicedate, i.id) AS Invoice_invoicedate, coalesce(i.totalamount, i.id) AS Invoice_totalamount
LIMIT 15;"""

pruned = svc.validate_and_prune_cypher_with_target_db("7f4c2e32-1b24-4e02-9d3e-1226b42484c0", test_query)
print("=== BEFORE ===")
print(test_query)
print("\n=== AFTER ===")
print(pruned)
