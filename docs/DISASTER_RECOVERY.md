# Disaster Recovery & Operational Handbook

## Backup Strategy
1. **MS SQL Server Application Database**:
   - Perform automated daily differential backups and weekly full backups of `QuickPasteurDB`.
   - Command: `BACKUP DATABASE [QuickPasteurDB] TO DISK = '/var/opt/mssql/data/QuickPasteurDB.bak'`

2. **Generated Ontology Storage**:
   - Sync `./storage/ontologies/` directory to encrypted cloud object storage (S3 / Azure Blob) daily.

## Incident Recovery Procedures
1. **RTO (Recovery Time Objective)**: < 1 hour.
2. **RPO (Recovery Point Objective)**: < 15 minutes.
