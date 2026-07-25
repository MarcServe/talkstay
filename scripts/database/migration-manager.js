#!/usr/bin/env node

/**
 * Database Migration Manager
 * Handles creation, validation, and rollback of Supabase migrations
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oujqkygfmyapmrgxmhvt.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MIGRATIONS_DIR = path.join(__dirname, '../../supabase/migrations');
const ROLLBACKS_DIR = path.join(__dirname, '../../database/rollbacks');

class MigrationManager {
  constructor() {
    if (!SUPABASE_SERVICE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    }
    
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(ROLLBACKS_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Generate timestamp for migration files
   */
  generateTimestamp() {
    const now = new Date();
    return now.toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z/, '')
      .replace('T', '_');
  }

  /**
   * Create a new migration pair (up and down)
   */
  async createMigration(name, upSql, downSql) {
    const timestamp = this.generateTimestamp();
    const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}`;
    
    const upFile = path.join(MIGRATIONS_DIR, `${filename}.sql`);
    const downFile = path.join(ROLLBACKS_DIR, `${filename}_rollback.sql`);

    // Create migration file
    const upContent = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- Type: UP

${upSql}
`;

    // Create rollback file
    const downContent = `-- Rollback: ${name}
-- Created: ${new Date().toISOString()}
-- Type: DOWN

${downSql}
`;

    try {
      await fs.writeFile(upFile, upContent);
      await fs.writeFile(downFile, downContent);
      
      console.log(`✅ Created migration: ${filename}`);
      console.log(`📁 Up: ${upFile}`);
      console.log(`📁 Down: ${downFile}`);
      
      return { upFile, downFile, filename };
    } catch (error) {
      console.error('❌ Failed to create migration files:', error);
      throw error;
    }
  }

  /**
   * Validate migration SQL before execution
   */
  async validateMigration(sqlContent) {
    try {
      // Basic SQL validation
      const forbiddenPatterns = [
        /DROP\s+DATABASE/i,
        /DELETE\s+FROM\s+auth\./i,
        /UPDATE\s+auth\./i,
        /INSERT\s+INTO\s+auth\./i,
      ];

      for (const pattern of forbiddenPatterns) {
        if (pattern.test(sqlContent)) {
          throw new Error(`Forbidden SQL pattern detected: ${pattern}`);
        }
      }

      // Test SQL syntax by preparing (but not executing) in a transaction
      const { error } = await this.supabase.rpc('validate_sql', {
        sql_query: sqlContent
      });

      if (error) {
        throw new Error(`SQL validation failed: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Migration validation failed:', error);
      return false;
    }
  }

  /**
   * Execute a rollback using the down migration
   */
  async executeRollback(migrationName) {
    const rollbackFile = path.join(ROLLBACKS_DIR, `${migrationName}_rollback.sql`);
    
    try {
      const rollbackSql = await fs.readFile(rollbackFile, 'utf8');
      
      // Validate rollback SQL
      const isValid = await this.validateMigration(rollbackSql);
      if (!isValid) {
        throw new Error('Rollback validation failed');
      }

      // Create backup before rollback
      await this.createBackup(`pre_rollback_${migrationName}`);

      // Execute rollback
      console.log(`🔄 Executing rollback for: ${migrationName}`);
      
      // Split SQL into individual statements
      const statements = rollbackSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        const { error } = await this.supabase.rpc('execute_sql', {
          sql_query: statement
        });

        if (error) {
          throw new Error(`Rollback execution failed: ${error.message}`);
        }
      }

      console.log(`✅ Rollback completed: ${migrationName}`);
      return true;
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Create database backup
   */
  async createBackup(backupName) {
    const timestamp = new Date().toISOString();
    console.log(`💾 Creating backup: ${backupName}_${timestamp}`);
    
    // This would typically involve pg_dump or Supabase backup API
    // For now, we'll log the backup creation
    const backupInfo = {
      name: backupName,
      timestamp,
      environment: process.env.NODE_ENV || 'development'
    };

    const backupFile = path.join(__dirname, '../../database/backups', `${backupName}_${timestamp}.json`);
    await fs.mkdir(path.dirname(backupFile), { recursive: true });
    await fs.writeFile(backupFile, JSON.stringify(backupInfo, null, 2));
    
    console.log(`✅ Backup metadata saved: ${backupFile}`);
    return backupInfo;
  }

  /**
   * Get migration status
   */
  async getMigrationStatus() {
    try {
      // Get applied migrations from Supabase
      const { data: appliedMigrations, error } = await this.supabase
        .from('schema_migrations')
        .select('version, created_at')
        .order('version', { ascending: false });

      if (error && error.code !== 'PGRST116') { // Table doesn't exist
        console.error('Failed to get migration status:', error);
        return [];
      }

      // Get available migrations from filesystem
      const migrationFiles = await fs.readdir(MIGRATIONS_DIR);
      const availableMigrations = migrationFiles
        .filter(file => file.endsWith('.sql'))
        .map(file => file.replace('.sql', ''));

      const status = availableMigrations.map(migration => {
        const applied = appliedMigrations?.find(m => m.version === migration);
        return {
          migration,
          applied: !!applied,
          appliedAt: applied?.created_at || null
        };
      });

      return status;
    } catch (error) {
      console.error('Failed to get migration status:', error);
      return [];
    }
  }

  /**
   * Generate rollback for existing migration
   */
  async generateRollback(migrationFile, tables, functions) {
    const migrationContent = await fs.readFile(migrationFile, 'utf8');
    let rollbackSql = '-- Auto-generated rollback\n\n';

    // Analyze migration and generate reverse operations
    if (migrationContent.includes('CREATE TABLE')) {
      for (const table of tables) {
        rollbackSql += `DROP TABLE IF EXISTS ${table} CASCADE;\n`;
      }
    }

    if (migrationContent.includes('CREATE FUNCTION')) {
      for (const func of functions) {
        rollbackSql += `DROP FUNCTION IF EXISTS ${func} CASCADE;\n`;
      }
    }

    if (migrationContent.includes('ALTER TABLE')) {
      // This would need more sophisticated parsing for column additions/removals
      rollbackSql += '-- Manual rollback required for ALTER TABLE statements\n';
    }

    return rollbackSql;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const manager = new MigrationManager();

  try {
    switch (command) {
      case 'create':
        const name = args[1];
        const upSql = args[2] || '-- Add your UP migration SQL here';
        const downSql = args[3] || '-- Add your DOWN migration SQL here';
        await manager.createMigration(name, upSql, downSql);
        break;

      case 'rollback':
        const migrationName = args[1];
        if (!migrationName) {
          console.error('❌ Migration name is required for rollback');
          process.exit(1);
        }
        await manager.executeRollback(migrationName);
        break;

      case 'status':
        const status = await manager.getMigrationStatus();
        console.log('\n📊 Migration Status:');
        status.forEach(m => {
          const icon = m.applied ? '✅' : '⏳';
          const appliedText = m.applied ? `(${m.appliedAt})` : '';
          console.log(`${icon} ${m.migration} ${appliedText}`);
        });
        break;

      case 'backup':
        const backupName = args[1] || 'manual_backup';
        await manager.createBackup(backupName);
        break;

      default:
        console.log(`
Database Migration Manager

Usage:
  node migration-manager.js create <name> [upSql] [downSql]
  node migration-manager.js rollback <migration-name>
  node migration-manager.js status
  node migration-manager.js backup [name]

Examples:
  node migration-manager.js create "add_user_roles"
  node migration-manager.js rollback "20240116_120000_add_user_roles"
  node migration-manager.js status
  node migration-manager.js backup "pre_deployment"
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

export default MigrationManager;