# Microsoft SQL Server Database Schema Specification

## Database Overview
The application database stores users, roles, project configurations, source/target connections, metadata catalogs, profiling metrics, business rules, workflows, job execution history, and immutable audit logs.

## Entity Relationship Summary

```
+----------------+       +------------------+       +---------------------+
|     Users      |----<  |     Projects     |----<  |  SourceConnections  |
+----------------+       +------------------+       +---------------------+
                                  |
                                  |----<  |  MetadataCatalogs   |----<  |  ProfilingResults  |
                                  |       +---------------------+       +--------------------+
                                  |
                                  |----<  |    BusinessRules    |
                                  |       +---------------------+
                                  |
                                  |----<  |      Workflows      |----<  |   JobExecutions    |
                                          +---------------------+       +--------------------+
```

## Security & Encryption Standards
- **Password Storage**: Passwords are hashed using Argon2 / Bcrypt.
- **Connection Strings & Secrets**: Database passwords and credentials are encrypted using AES-256 GCM (`AESCipher` utility) before storage.
