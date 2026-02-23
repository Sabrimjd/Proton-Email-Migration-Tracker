# Code Unslop Plan - Proton Email Migration Tracker

## Priority 1: Critical Security Fixes (Must Fix)

### 1. SQL Injection Vulnerability in Database Route
- **File**: `src/app/api/database/route.ts`
- **Issue**: Dynamic table names in DELETE statements without proper validation
- **Fix**: Implement strict allowlist validation for table names
- **Lines**: 67-70, 359

### 2. Sensitive Data Exposure
- **File**: `src/app/api/database/route.ts`, `src/app/api/config/route.ts`
- **Issue**: Database download and config endpoints expose sensitive data without authentication
- **Fix**: Add authentication middleware or remove these endpoints in production

### 3. Path Traversal in Backup/Restore
- **File**: `src/app/api/database/route.ts`
- **Issue**: Insufficient filename validation in backup/restore operations
- **Fix**: Implement stricter filename validation and path sanitization

## Priority 2: High Impact Code Quality Fixes

### 4. Eliminate `any` Types
- **Files**: Multiple files across codebase (104 instances)
- **Issue**: TypeScript anti-pattern reducing type safety
- **Fix**: Replace with proper types or generic types where appropriate

### 5. Remove Unused Variables and Imports
- **Files**: Multiple files (identified in lint output)
- **Issue**: Code clutter and potential confusion
- **Fix**: Remove unused declarations

### 6. Improve Error Handling
- **Files**: All API routes and lib files
- **Issue**: Generic error messages and poor error logging
- **Fix**: Implement structured error handling with proper logging

## Priority 3: Performance and Maintainability

### 7. Optimize Database Operations
- **Files**: `src/lib/email-analyzer.ts`, API routes
- **Issue**: Inefficient individual queries instead of batch operations
- **Fix**: Use batch operations and transactions where possible

### 8. Add Missing Database Indexes
- **File**: `src/lib/db.ts`
- **Issue**: Missing indexes on frequently queried columns
- **Fix**: Add indexes on `emails.received_at`, `services.updated_at`, etc.

### 9. Memory Optimization in Email Analyzer
- **File**: `src/lib/email-analyzer.ts`
- **Issue**: Loading all emails into memory at once
- **Fix**: Implement streaming or pagination for large email sets

## Implementation Strategy

1. **Create branch**: `chore/unslop-20260223-email-tracker`
2. **Fix Priority 1 issues first** (security critical)
3. **Run tests after each fix** to ensure no regressions
4. **Address Priority 2 and 3 issues** in subsequent commits
5. **Final validation** with `npm run build` and `npm run lint`

## Testing Requirements

- All security fixes must be tested with malicious inputs
- Performance improvements should be benchmarked
- Ensure all existing functionality continues to work
- Verify database integrity after changes