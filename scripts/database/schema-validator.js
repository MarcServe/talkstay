#!/usr/bin/env node

/**
 * Schema Validator
 * Validates database schema changes and generates migration impact reports
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oujqkygfmyapmrgxmhvt.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

class SchemaValidator {
  constructor() {
    if (!SUPABASE_SERVICE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    }
    
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }

  /**
   * Get current database schema
   */
  async getCurrentSchema() {
    try {
      // Get tables
      const { data: tables, error: tablesError } = await this.supabase
        .rpc('get_table_schema');

      if (tablesError) {
        console.warn('Could not fetch table schema:', tablesError);
      }

      // Get functions
      const { data: functions, error: functionsError } = await this.supabase
        .rpc('get_function_schema');

      if (functionsError) {
        console.warn('Could not fetch function schema:', functionsError);
      }

      // Get RLS policies
      const { data: policies, error: policiesError } = await this.supabase
        .rpc('get_rls_policies');

      if (policiesError) {
        console.warn('Could not fetch RLS policies:', policiesError);
      }

      return {
        tables: tables || [],
        functions: functions || [],
        policies: policies || [],
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get current schema:', error);
      return {
        tables: [],
        functions: [],
        policies: [],
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Compare two schemas and detect changes
   */
  compareSchemas(oldSchema, newSchema) {
    const changes = {
      tables: {
        added: [],
        removed: [],
        modified: []
      },
      functions: {
        added: [],
        removed: [],
        modified: []
      },
      policies: {
        added: [],
        removed: [],
        modified: []
      }
    };

    // Compare tables
    const oldTables = new Map(oldSchema.tables.map(t => [t.name, t]));
    const newTables = new Map(newSchema.tables.map(t => [t.name, t]));

    // Find added tables
    for (const [name, table] of newTables) {
      if (!oldTables.has(name)) {
        changes.tables.added.push(table);
      }
    }

    // Find removed tables
    for (const [name, table] of oldTables) {
      if (!newTables.has(name)) {
        changes.tables.removed.push(table);
      }
    }

    // Find modified tables
    for (const [name, newTable] of newTables) {
      const oldTable = oldTables.get(name);
      if (oldTable && JSON.stringify(oldTable) !== JSON.stringify(newTable)) {
        changes.tables.modified.push({
          name,
          old: oldTable,
          new: newTable
        });
      }
    }

    // Similar logic for functions and policies...
    this.compareFunctions(oldSchema.functions, newSchema.functions, changes.functions);
    this.comparePolicies(oldSchema.policies, newSchema.policies, changes.policies);

    return changes;
  }

  compareFunctions(oldFunctions, newFunctions, changes) {
    const oldFuncs = new Map(oldFunctions.map(f => [f.name, f]));
    const newFuncs = new Map(newFunctions.map(f => [f.name, f]));

    for (const [name, func] of newFuncs) {
      if (!oldFuncs.has(name)) {
        changes.added.push(func);
      }
    }

    for (const [name, func] of oldFuncs) {
      if (!newFuncs.has(name)) {
        changes.removed.push(func);
      }
    }

    for (const [name, newFunc] of newFuncs) {
      const oldFunc = oldFuncs.get(name);
      if (oldFunc && oldFunc.definition !== newFunc.definition) {
        changes.modified.push({
          name,
          old: oldFunc,
          new: newFunc
        });
      }
    }
  }

  comparePolicies(oldPolicies, newPolicies, changes) {
    const oldPols = new Map(oldPolicies.map(p => [`${p.table}_${p.name}`, p]));
    const newPols = new Map(newPolicies.map(p => [`${p.table}_${p.name}`, p]));

    for (const [key, policy] of newPols) {
      if (!oldPols.has(key)) {
        changes.added.push(policy);
      }
    }

    for (const [key, policy] of oldPols) {
      if (!newPols.has(key)) {
        changes.removed.push(policy);
      }
    }

    for (const [key, newPolicy] of newPols) {
      const oldPolicy = oldPols.get(key);
      if (oldPolicy && JSON.stringify(oldPolicy) !== JSON.stringify(newPolicy)) {
        changes.modified.push({
          key,
          old: oldPolicy,
          new: newPolicy
        });
      }
    }
  }

  /**
   * Validate migration SQL
   */
  async validateMigrationSQL(sqlContent) {
    const issues = [];
    const warnings = [];

    // Check for dangerous operations
    const dangerousPatterns = [
      { pattern: /DROP\s+TABLE/gi, severity: 'high', message: 'DROP TABLE detected - ensure you have backups' },
      { pattern: /DROP\s+COLUMN/gi, severity: 'medium', message: 'DROP COLUMN detected - this is irreversible' },
      { pattern: /ALTER\s+TABLE.*DROP/gi, severity: 'medium', message: 'ALTER TABLE DROP detected' },
      { pattern: /DELETE\s+FROM/gi, severity: 'high', message: 'DELETE FROM detected - ensure this is intentional' },
      { pattern: /TRUNCATE/gi, severity: 'high', message: 'TRUNCATE detected - this will remove all data' }
    ];

    // Check for auth schema modifications
    if (/auth\./gi.test(sqlContent)) {
      issues.push({
        severity: 'critical',
        message: 'Modifications to auth schema detected - this is not allowed',
        line: this.findLineNumber(sqlContent, /auth\./gi)
      });
    }

    // Check for dangerous patterns
    for (const { pattern, severity, message } of dangerousPatterns) {
      const matches = sqlContent.match(pattern);
      if (matches) {
        issues.push({
          severity,
          message: `${message} (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`,
          line: this.findLineNumber(sqlContent, pattern)
        });
      }
    }

    // Check for missing rollback considerations
    if (!sqlContent.includes('IF EXISTS') && /DROP/gi.test(sqlContent)) {
      warnings.push({
        severity: 'low',
        message: 'Consider using IF EXISTS for DROP statements',
        suggestion: 'Use DROP TABLE IF EXISTS or DROP FUNCTION IF EXISTS'
      });
    }

    return {
      valid: issues.filter(i => i.severity === 'critical').length === 0,
      issues,
      warnings
    };
  }

  findLineNumber(content, pattern) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        return i + 1;
      }
    }
    return null;
  }

  /**
   * Generate migration impact report
   */
  async generateImpactReport(migrationFile) {
    try {
      const sqlContent = await fs.readFile(migrationFile, 'utf8');
      const validation = await this.validateMigrationSQL(sqlContent);
      
      const report = {
        migration: path.basename(migrationFile),
        timestamp: new Date().toISOString(),
        validation,
        estimatedDuration: this.estimateMigrationDuration(sqlContent),
        affectedTables: this.extractAffectedTables(sqlContent),
        rollbackComplexity: this.assessRollbackComplexity(sqlContent),
        recommendations: this.generateRecommendations(sqlContent, validation)
      };

      return report;
    } catch (error) {
      console.error('Failed to generate impact report:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  estimateMigrationDuration(sqlContent) {
    // Simple heuristic based on operation types
    let duration = 0;
    
    const createTableCount = (sqlContent.match(/CREATE TABLE/gi) || []).length;
    const alterTableCount = (sqlContent.match(/ALTER TABLE/gi) || []).length;
    const createIndexCount = (sqlContent.match(/CREATE INDEX/gi) || []).length;
    const insertCount = (sqlContent.match(/INSERT INTO/gi) || []).length;

    duration += createTableCount * 5; // 5 seconds per table
    duration += alterTableCount * 10; // 10 seconds per alter
    duration += createIndexCount * 30; // 30 seconds per index
    duration += insertCount * 2; // 2 seconds per insert

    return {
      estimated: duration,
      unit: 'seconds',
      confidence: 'low' // This is a rough estimate
    };
  }

  extractAffectedTables(sqlContent) {
    const tablePattern = /(?:CREATE|ALTER|DROP)\s+TABLE\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?([^\s\(]+)/gi;
    const matches = [...sqlContent.matchAll(tablePattern)];
    return [...new Set(matches.map(match => match[1]))];
  }

  assessRollbackComplexity(sqlContent) {
    let complexity = 'low';
    
    if (/DROP\s+TABLE/gi.test(sqlContent)) complexity = 'high';
    if (/DROP\s+COLUMN/gi.test(sqlContent)) complexity = 'high';
    if (/ALTER\s+TABLE.*ADD/gi.test(sqlContent)) complexity = 'medium';
    if (/CREATE\s+TABLE/gi.test(sqlContent)) complexity = 'low';

    return complexity;
  }

  generateRecommendations(sqlContent, validation) {
    const recommendations = [];

    if (validation.issues.some(i => i.severity === 'high')) {
      recommendations.push('Consider running this migration during maintenance window');
    }

    if (/CREATE\s+INDEX/gi.test(sqlContent)) {
      recommendations.push('Consider using CONCURRENTLY for index creation in production');
    }

    if (validation.warnings.length > 0) {
      recommendations.push('Review warnings and consider suggested improvements');
    }

    if (!/ROLLBACK/gi.test(sqlContent)) {
      recommendations.push('Ensure rollback procedures are documented and tested');
    }

    return recommendations;
  }

  /**
   * Save schema snapshot
   */
  async saveSchemaSnapshot(name) {
    const schema = await this.getCurrentSchema();
    const filename = `schema_${name}_${Date.now()}.json`;
    const filepath = path.join(process.cwd(), 'database', 'snapshots', filename);
    
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(schema, null, 2));
    
    console.log(`✅ Schema snapshot saved: ${filepath}`);
    return filepath;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const validator = new SchemaValidator();

  try {
    switch (command) {
      case 'validate':
        const migrationFile = args[1];
        if (!migrationFile) {
          console.error('❌ Migration file path is required');
          process.exit(1);
        }
        
        const report = await validator.generateImpactReport(migrationFile);
        console.log(JSON.stringify(report, null, 2));
        break;

      case 'snapshot':
        const name = args[1] || 'manual';
        await validator.saveSchemaSnapshot(name);
        break;

      case 'current':
        const schema = await validator.getCurrentSchema();
        console.log(JSON.stringify(schema, null, 2));
        break;

      default:
        console.log(`
Schema Validator

Usage:
  node schema-validator.js validate <migration-file>
  node schema-validator.js snapshot [name]
  node schema-validator.js current

Examples:
  node schema-validator.js validate ./supabase/migrations/20240116_120000_add_users.sql
  node schema-validator.js snapshot "pre_deployment"
  node schema-validator.js current
        `);
    }
  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default SchemaValidator;