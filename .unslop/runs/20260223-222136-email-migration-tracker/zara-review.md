# Security Review: Email Migration Tracker

**Reviewer**: Zara (Security-focused reviewer)  
**Date**: February 23, 2026  
**Project**: Email Migration Tracker  

## Executive Summary

The Email Migration Tracker application has several **critical security vulnerabilities** that require immediate attention, particularly around credential storage and lack of authentication. While the application demonstrates good practices in some areas (like using parameterized queries to prevent SQL injection), the overall security posture is **HIGH RISK** due to hardcoded credentials and absence of access controls.

## Critical Findings

### 1. Hardcoded Credentials in Configuration Files ⚠️ **CRITICAL**

**Location**: `config.local.yml`, `config.yml.example`

**Issue**: The application stores IMAP credentials (including passwords) in plaintext YAML configuration files. The example shows:

```yaml
protonmail:
  imap_user: contact@sabrimjahed.com
  imap_password: 0PZdm5cadXF3uhSGAiI7uQ
```

**Risk**: 
- Credentials are stored in plaintext on disk
- Configuration files may be accidentally committed to version control
- No encryption or secure credential management
- Anyone with file system access can read these credentials

**Recommendation**:
- Use environment variables for sensitive credentials (`PROTONMAIL_IMAP_PASSWORD`)
- Implement a secure credential store or use system keychain/keyring APIs
- Add `.env` support with proper `.gitignore` rules
- Never include example credentials with real-looking passwords in examples

### 2. No Authentication or Authorization ⚠️ **CRITICAL**

**Location**: All API endpoints (`src/app/api/*`)

**Issue**: The application has **zero authentication mechanisms**. All API endpoints are publicly accessible without any form of authentication, authorization, or session management.

**Risk**:
- Anyone who can reach the web interface can:
  - View all email migration data
  - Modify service statuses and categories
  - Access database backups and configuration
  - Delete the entire database
  - Trigger email scans with stored credentials
  - Access system logs and debug information

**Recommendation**:
- Implement basic HTTP authentication at minimum
- Add proper session management with secure cookies
- Implement role-based access control (RBAC)
- Consider this application should only run on localhost or behind a reverse proxy with authentication

### 3. Environment Variable Handling Issues ⚠️ **HIGH**

**Location**: `src/lib/config.ts`, `.env.docker.example`

**Issue**: The application uses a mix of configuration approaches:
- YAML config files (with hardcoded credentials)
- Environment variables (limited usage)
- No validation or sanitization of environment variable values

**Risk**:
- Inconsistent configuration management
- Potential for configuration injection if environment variables are not properly validated
- Docker deployment exposes additional attack surface

**Recommendation**:
- Standardize on environment variables for all sensitive configuration
- Validate and sanitize all environment variable inputs
- Implement secure defaults that fail safely

## Medium Severity Findings

### 4. Database Backup Exposure ⚠️ **MEDIUM**

**Location**: `/api/database` endpoint

**Issue**: The database backup functionality creates backup files in the `data/backups/` directory, which may be accessible via the web server if directory listing is enabled or if backup filenames are guessable.

**Risk**: 
- Database backups contain all email metadata and service information
- Backups could be downloaded by unauthorized users
- No access controls on backup files

**Recommendation**:
- Store backups outside the web root directory
- Implement proper access controls for backup operations
- Encrypt database backups

### 5. Excessive Information Disclosure in Debug Endpoints ⚠️ **MEDIUM**

**Location**: `/api/debug`, `/api/logs`

**Issue**: Debug endpoints expose extensive system information including:
- Database schema and statistics
- Configuration details
- System logs with potential sensitive information
- File system paths and structure

**Risk**:
- Attackers can gather intelligence about the system
- Logs may contain sensitive information from email processing
- Configuration details reveal internal structure

**Recommendation**:
- Disable debug endpoints in production
- Implement authentication for debug functionality
- Sanitize logs to remove sensitive information
- Add environment-based feature flags

## Low Severity Findings

### 6. Missing Input Validation in Some API Routes ⚠️ **LOW**

**Location**: Various API endpoints

**Issue**: While most database queries use parameterized statements (good!), some API routes could benefit from additional input validation and sanitization.

**Examples**:
- Category names in recategorization endpoints
- Search queries in service filtering
- Configuration section names

**Recommendation**:
- Add input validation and sanitization for all user inputs
- Implement allowlists for valid category names and configuration sections
- Use proper validation libraries

### 7. Insecure Direct Object Reference (IDOR) Potential ⚠️ **LOW**

**Location**: Service detail endpoints (`/api/services/[id]`)

**Issue**: Service IDs are sequential integers, making it easy to enumerate all services by incrementing IDs.

**Risk**: 
- Easy enumeration of all tracked services
- Potential information disclosure through ID enumeration

**Recommendation**:
- Use UUIDs instead of sequential integers for service IDs
- Implement proper authorization checks (though authentication is the bigger issue)

## Positive Security Practices ✅

### 1. SQL Injection Prevention
- **Excellent**: All database queries use parameterized statements with `better-sqlite3`
- No dynamic SQL concatenation found
- Proper use of prepared statements throughout

### 2. Safe File Operations
- Proper path sanitization using `path.basename()` in backup restore functionality
- Directory traversal attempts are mitigated
- File extension validation (.db, .yml)

### 3. Input Validation in Setup
- Basic email format validation in setup wizard
- Port number validation and bounds checking
- Required field validation

## Overall Assessment

**Risk Level**: **HIGH**  
**Primary Concerns**: Hardcoded credentials + No authentication = Complete compromise possible

This application appears designed for **local-only use** but lacks appropriate safeguards to ensure it remains local-only. The combination of stored credentials and public API access creates a significant security risk.

## Immediate Action Items

1. **Remove hardcoded credentials** from all configuration files immediately
2. **Implement basic authentication** (even simple HTTP auth would help significantly)
3. **Add environment variable support** for all sensitive configuration
4. **Restrict network binding** to localhost only by default
5. **Review and sanitize all debug/logging output**

## Long-term Recommendations

1. Implement proper session management and user authentication
2. Add HTTPS/TLS support for secure credential transmission
3. Implement secure credential storage (system keychain integration)
4. Add comprehensive input validation and output encoding
5. Conduct regular security testing and code reviews

---
*This review focused on the specified areas: SQL injection, API security, environment handling, authentication gaps, and data validation. Additional security testing (penetration testing, dependency scanning, etc.) is recommended before any production deployment.*