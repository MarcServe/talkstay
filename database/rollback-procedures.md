# Database Rollback Procedures

## Overview

This document outlines the procedures for safely rolling back database changes in TalkWeb.ai's hybrid development workflow. These procedures ensure data integrity and minimize downtime during rollback operations.

## Table of Contents

1. [Emergency Rollback Protocol](#emergency-rollback-protocol)
2. [Planned Rollback Procedures](#planned-rollback-procedures)
3. [Rollback Types](#rollback-types)
4. [Tools and Scripts](#tools-and-scripts)
5. [Environment-Specific Procedures](#environment-specific-procedures)
6. [Post-Rollback Validation](#post-rollback-validation)
7. [Communication Protocol](#communication-protocol)

## Emergency Rollback Protocol

### Immediate Actions (0-5 minutes)

1. **Stop all deployments**
   ```bash
   # Cancel any running GitHub Actions
   gh run cancel <run-id>
   ```

2. **Assess the situation**
   ```bash
   # Check system health
   node scripts/database/schema-validator.js current
   ```

3. **Create emergency backup**
   ```bash
   # Create immediate backup before rollback
   node scripts/database/migration-manager.js backup "emergency_$(date +%Y%m%d_%H%M%S)"
   ```

4. **Execute rollback**
   ```bash
   # Rollback the problematic migration
   node scripts/database/migration-manager.js rollback <migration-name>
   ```

### Communication (5-10 minutes)

1. **Notify stakeholders**
   - Post in #incidents Slack channel
   - Update status page if customer-facing
   - Inform development team

2. **Document the incident**
   - Record start time and symptoms
   - Log actions taken
   - Track resolution progress

## Planned Rollback Procedures

### Pre-Rollback Checklist

- [ ] Verify rollback script exists and is tested
- [ ] Create full database backup
- [ ] Notify team of planned rollback
- [ ] Prepare rollback communication
- [ ] Verify rollback window availability

### Rollback Execution Steps

1. **Enter maintenance mode** (if applicable)
   ```bash
   # Set maintenance mode
   echo "MAINTENANCE_MODE=true" >> .env.production
   ```

2. **Create backup**
   ```bash
   # Create timestamped backup
   node scripts/database/migration-manager.js backup "planned_rollback_$(date +%Y%m%d_%H%M%S)"
   ```

3. **Execute rollback**
   ```bash
   # Run the rollback
   node scripts/database/migration-manager.js rollback <migration-name>
   ```

4. **Validate rollback**
   ```bash
   # Verify schema state
   node scripts/database/schema-validator.js current
   ```

5. **Exit maintenance mode**
   ```bash
   # Remove maintenance mode
   sed -i '/MAINTENANCE_MODE=true/d' .env.production
   ```

## Rollback Types

### Type 1: Schema Rollback
- **Description**: Reverting table structure changes
- **Risk Level**: Medium to High
- **Requires**: Data migration consideration

```sql
-- Example: Rolling back table creation
DROP TABLE IF EXISTS new_feature_table CASCADE;

-- Example: Rolling back column addition
ALTER TABLE users DROP COLUMN IF EXISTS new_column;
```

### Type 2: Data Rollback
- **Description**: Reverting data changes
- **Risk Level**: High
- **Requires**: Point-in-time recovery

```sql
-- Example: Rolling back data updates
UPDATE users 
SET status = 'active' 
WHERE id IN (SELECT id FROM rollback_user_list);
```

### Type 3: Function/Trigger Rollback
- **Description**: Reverting stored procedures and triggers
- **Risk Level**: Low to Medium
- **Requires**: Function dependency checking

```sql
-- Example: Rolling back function changes
DROP FUNCTION IF EXISTS new_business_logic() CASCADE;
CREATE OR REPLACE FUNCTION old_business_logic() -- restore old version
```

### Type 4: RLS Policy Rollback
- **Description**: Reverting Row Level Security changes
- **Risk Level**: Critical (Security implications)
- **Requires**: Immediate testing

```sql
-- Example: Rolling back RLS policy changes
DROP POLICY IF EXISTS "new_security_policy" ON users;
CREATE POLICY "old_security_policy" ON users -- restore old policy
```

## Tools and Scripts

### Migration Manager
```bash
# Create new migration with rollback
node scripts/database/migration-manager.js create "feature_name" "UP SQL" "DOWN SQL"

# Execute rollback
node scripts/database/migration-manager.js rollback "migration_name"

# Check migration status
node scripts/database/migration-manager.js status
```

### Schema Validator
```bash
# Validate migration before deployment
node scripts/database/schema-validator.js validate migration.sql

# Create schema snapshot
node scripts/database/schema-validator.js snapshot "pre_rollback"

# Compare current schema
node scripts/database/schema-validator.js current
```

### Backup Manager
```bash
# Create manual backup
node scripts/database/migration-manager.js backup "backup_name"

# List available backups
ls -la database/backups/
```

## Environment-Specific Procedures

### Production Environment

**Prerequisites:**
- Service role key access
- Maintenance window approval
- Team notification

**Additional Steps:**
- Customer communication
- Extended validation period
- Performance monitoring post-rollback

### Staging Environment

**Prerequisites:**
- Development team notification
- CI/CD pipeline pause

**Additional Steps:**
- Smoke test execution
- Integration test validation

### Development Environment

**Prerequisites:**
- Local environment backup

**Additional Steps:**
- Developer workspace sync
- Local testing validation

## Post-Rollback Validation

### Database Integrity Checks

1. **Schema validation**
   ```sql
   -- Check table existence and structure
   SELECT table_name, column_name, data_type 
   FROM information_schema.columns 
   WHERE table_schema = 'public'
   ORDER BY table_name, ordinal_position;
   ```

2. **Data consistency checks**
   ```sql
   -- Verify critical data relationships
   SELECT COUNT(*) FROM users WHERE email IS NULL;
   SELECT COUNT(*) FROM orders WHERE user_id NOT IN (SELECT id FROM users);
   ```

3. **Function validation**
   ```sql
   -- Test critical functions
   SELECT public.check_user_permissions('test_user_id');
   ```

### Application Testing

1. **Smoke tests**
   - User authentication
   - Core functionality
   - Critical API endpoints

2. **Integration tests**
   - Database connectivity
   - External service integration
   - User workflows

### Performance Monitoring

1. **Query performance**
   ```sql
   -- Check for query performance issues
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   ```

2. **Connection monitoring**
   ```sql
   -- Monitor connection usage
   SELECT count(*), state 
   FROM pg_stat_activity 
   GROUP BY state;
   ```

## Communication Protocol

### Internal Communication

1. **Slack Notifications**
   ```
   🚨 ROLLBACK INITIATED
   Migration: <migration-name>
   Environment: <production/staging>
   ETA: <estimated-completion>
   Contact: <responsible-engineer>
   ```

2. **Email Alerts**
   - Sent to engineering team
   - Include rollback reason
   - Provide timeline updates

### External Communication

1. **Status Page Updates**
   ```
   Investigating: Database maintenance in progress
   Update: Rolling back recent changes
   Resolved: Service fully restored
   ```

2. **Customer Notifications**
   - Only for customer-facing issues
   - Include estimated resolution time
   - Provide alternative solutions if applicable

## Rollback Decision Matrix

| Issue Severity | Rollback Timeline | Approval Required | Communication Level |
|---------------|------------------|-------------------|-------------------|
| Critical (Data Loss) | Immediate | Engineering Lead | All stakeholders |
| High (Service Down) | < 15 minutes | Senior Engineer | Engineering + Operations |
| Medium (Feature Issue) | < 1 hour | Team Lead | Engineering team |
| Low (Minor Bug) | Next maintenance window | Self-approved | Team notification |

## Best Practices

### Before Rollback

1. **Document the issue**
   - Symptoms observed
   - Impact assessment
   - Root cause analysis

2. **Verify rollback safety**
   - Check data dependencies
   - Validate rollback script
   - Confirm backup availability

3. **Prepare communication**
   - Draft notifications
   - Identify stakeholders
   - Plan status updates

### During Rollback

1. **Monitor progress**
   - Watch for errors
   - Track completion status
   - Validate each step

2. **Maintain communication**
   - Provide regular updates
   - Document actions taken
   - Escalate if needed

### After Rollback

1. **Validate restoration**
   - Run integrity checks
   - Test core functionality
   - Monitor performance

2. **Conduct retrospective**
   - Analyze root cause
   - Identify improvements
   - Update procedures

3. **Update documentation**
   - Record lessons learned
   - Improve rollback scripts
   - Enhance monitoring

## Emergency Contacts

| Role | Primary | Secondary | Escalation |
|------|---------|-----------|------------|
| Database Engineer | [Contact] | [Contact] | [Contact] |
| DevOps Lead | [Contact] | [Contact] | [Contact] |
| Engineering Manager | [Contact] | [Contact] | [Contact] |
| On-call Engineer | [Contact] | [Contact] | [Contact] |

## Troubleshooting Common Issues

### Rollback Script Fails

1. **Check syntax**
   ```bash
   # Validate SQL syntax
   node scripts/database/schema-validator.js validate rollback.sql
   ```

2. **Review dependencies**
   ```sql
   -- Check for dependent objects
   SELECT * FROM pg_depend WHERE refobjid = 'table_name'::regclass;
   ```

3. **Manual intervention**
   - Connect directly to database
   - Execute rollback steps manually
   - Document manual changes

### Partial Rollback Success

1. **Identify completed steps**
   ```bash
   # Check migration status
   node scripts/database/migration-manager.js status
   ```

2. **Continue from failure point**
   ```bash
   # Resume rollback from specific step
   node scripts/database/migration-manager.js rollback --resume <step>
   ```

3. **Validate partial state**
   ```bash
   # Verify current schema state
   node scripts/database/schema-validator.js current
   ```

## Version Control Integration

### Git Branch Strategy for Rollbacks

1. **Create rollback branch**
   ```bash
   git checkout -b rollback/migration-name
   ```

2. **Commit rollback changes**
   ```bash
   git add database/rollbacks/
   git commit -m "Add rollback for migration: migration-name"
   ```

3. **Merge to appropriate branches**
   ```bash
   git checkout main
   git merge rollback/migration-name
   ```

### Documentation Updates

1. **Update migration log**
   - Record rollback execution
   - Note any manual steps
   - Update migration status

2. **Update deployment notes**
   - Add rollback procedures to deployment docs
   - Include lessons learned
   - Update risk assessments

This comprehensive rollback procedure ensures that database changes can be safely reverted while maintaining data integrity and system availability.