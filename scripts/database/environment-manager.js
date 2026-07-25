#!/usr/bin/env node

/**
 * Database Environment Manager
 * Manages database environments for different branches and stages
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

// Environment configurations
const ENVIRONMENTS = {
  production: {
    url: process.env.SUPABASE_URL_PRODUCTION || process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_KEY_PRODUCTION || process.env.SUPABASE_SERVICE_ROLE_KEY,
    branch: 'main'
  },
  staging: {
    url: process.env.SUPABASE_URL_STAGING || process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_KEY_STAGING || process.env.SUPABASE_SERVICE_ROLE_KEY,
    branch: 'develop'
  },
  development: {
    url: process.env.SUPABASE_URL || 'http://localhost:54321',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-local-service-key',
    branch: 'develop'
  }
};

class EnvironmentManager {
  constructor(environment = 'development') {
    this.environment = environment;
    this.config = ENVIRONMENTS[environment];
    
    if (!this.config) {
      throw new Error(`Unknown environment: ${environment}`);
    }

    this.supabase = createClient(this.config.url, this.config.key);
  }

  /**
   * Get current Git branch
   */
  getCurrentBranch() {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
      console.warn('Could not determine Git branch:', error.message);
      return 'unknown';
    }
  }

  /**
   * Get current Git commit hash
   */
  getCurrentCommit() {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
      console.warn('Could not determine Git commit:', error.message);
      return 'unknown';
    }
  }

  /**
   * Validate environment configuration
   */
  async validateEnvironment() {
    const issues = [];

    // Check database connectivity
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        issues.push(`Database connectivity: ${error.message}`);
      }
    } catch (error) {
      issues.push(`Database connection failed: ${error.message}`);
    }

    // Check required environment variables
    const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        issues.push(`Missing environment variable: ${varName}`);
      }
    }

    // Check Git status
    const currentBranch = this.getCurrentBranch();
    if (this.environment === 'production' && currentBranch !== 'main') {
      issues.push(`Production deployment from non-main branch: ${currentBranch}`);
    }

    return {
      valid: issues.length === 0,
      issues,
      environment: this.environment,
      branch: currentBranch,
      commit: this.getCurrentCommit()
    };
  }

  /**
   * Create environment metadata
   */
  async createEnvironmentMetadata() {
    const metadata = {
      environment: this.environment,
      branch: this.getCurrentBranch(),
      commit: this.getCurrentCommit(),
      timestamp: new Date().toISOString(),
      config: {
        url: this.config.url,
        branch: this.config.branch
      }
    };

    const metadataDir = path.join(process.cwd(), 'database', 'environments');
    await fs.mkdir(metadataDir, { recursive: true });

    const metadataFile = path.join(metadataDir, `${this.environment}_metadata.json`);
    await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));

    console.log(`✅ Environment metadata saved: ${metadataFile}`);
    return metadata;
  }

  /**
   * Sync migrations to environment
   */
  async syncMigrations() {
    console.log(`🔄 Syncing migrations to ${this.environment} environment...`);

    try {
      // Get list of migration files
      const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
      const migrationFiles = await fs.readdir(migrationsDir);
      const sqlFiles = migrationFiles
        .filter(file => file.endsWith('.sql'))
        .sort();

      console.log(`Found ${sqlFiles.length} migration files`);

      // Track migration status
      const migrationStatus = [];

      for (const migrationFile of sqlFiles) {
        const migrationPath = path.join(migrationsDir, migrationFile);
        const migrationContent = await fs.readFile(migrationPath, 'utf8');

        console.log(`📁 Processing: ${migrationFile}`);

        // Here we would typically apply the migration
        // For now, we'll validate and log
        const validation = await this.validateMigrationForEnvironment(migrationContent);
        
        migrationStatus.push({
          file: migrationFile,
          status: validation.valid ? 'valid' : 'invalid',
          issues: validation.issues || []
        });

        if (!validation.valid) {
          console.warn(`⚠️  Issues found in ${migrationFile}:`, validation.issues);
        }
      }

      // Save migration sync log
      const syncLog = {
        environment: this.environment,
        timestamp: new Date().toISOString(),
        branch: this.getCurrentBranch(),
        commit: this.getCurrentCommit(),
        migrations: migrationStatus
      };

      const logFile = path.join(process.cwd(), 'database', 'sync-logs', 
        `sync_${this.environment}_${Date.now()}.json`);
      await fs.mkdir(path.dirname(logFile), { recursive: true });
      await fs.writeFile(logFile, JSON.stringify(syncLog, null, 2));

      console.log(`✅ Migration sync completed: ${logFile}`);
      return syncLog;

    } catch (error) {
      console.error(`❌ Migration sync failed:`, error);
      throw error;
    }
  }

  /**
   * Validate migration for specific environment
   */
  async validateMigrationForEnvironment(migrationContent) {
    const issues = [];

    // Environment-specific validations
    if (this.environment === 'production') {
      // Stricter validation for production
      if (/DROP\s+TABLE/gi.test(migrationContent)) {
        issues.push('DROP TABLE operations not allowed in production without approval');
      }

      if (/TRUNCATE/gi.test(migrationContent)) {
        issues.push('TRUNCATE operations not allowed in production');
      }

      if (/DELETE\s+FROM/gi.test(migrationContent)) {
        issues.push('DELETE operations require explicit approval for production');
      }
    }

    // Check for environment-specific configurations
    if (migrationContent.includes('localhost') && this.environment === 'production') {
      issues.push('Migration contains localhost references not suitable for production');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Create database snapshot for environment
   */
  async createEnvironmentSnapshot(name) {
    console.log(`📸 Creating snapshot for ${this.environment}: ${name}`);

    try {
      // Get environment state
      const metadata = await this.createEnvironmentMetadata();
      
      // Get database schema info
      const { data: tables, error: tablesError } = await this.supabase
        .rpc('get_table_info');

      if (tablesError) {
        console.warn('Could not fetch table info:', tablesError);
      }

      const snapshot = {
        name,
        environment: this.environment,
        timestamp: new Date().toISOString(),
        metadata,
        schema: {
          tables: tables || [],
          // Add more schema info as needed
        }
      };

      const snapshotDir = path.join(process.cwd(), 'database', 'snapshots', this.environment);
      await fs.mkdir(snapshotDir, { recursive: true });

      const snapshotFile = path.join(snapshotDir, `${name}_${Date.now()}.json`);
      await fs.writeFile(snapshotFile, JSON.stringify(snapshot, null, 2));

      console.log(`✅ Snapshot created: ${snapshotFile}`);
      return snapshot;

    } catch (error) {
      console.error(`❌ Snapshot creation failed:`, error);
      throw error;
    }
  }

  /**
   * Compare environments
   */
  async compareEnvironments(targetEnvironment) {
    console.log(`🔍 Comparing ${this.environment} with ${targetEnvironment}`);

    const targetManager = new EnvironmentManager(targetEnvironment);
    
    try {
      // Create snapshots of both environments
      const sourceSnapshot = await this.createEnvironmentSnapshot('comparison_source');
      const targetSnapshot = await targetManager.createEnvironmentSnapshot('comparison_target');

      const differences = {
        timestamp: new Date().toISOString(),
        source: this.environment,
        target: targetEnvironment,
        schema: {
          differences: this.compareSchemas(
            sourceSnapshot.schema,
            targetSnapshot.schema
          )
        },
        metadata: {
          source: sourceSnapshot.metadata,
          target: targetSnapshot.metadata
        }
      };

      // Save comparison report
      const reportFile = path.join(process.cwd(), 'database', 'comparisons',
        `${this.environment}_vs_${targetEnvironment}_${Date.now()}.json`);
      await fs.mkdir(path.dirname(reportFile), { recursive: true });
      await fs.writeFile(reportFile, JSON.stringify(differences, null, 2));

      console.log(`✅ Environment comparison completed: ${reportFile}`);
      return differences;

    } catch (error) {
      console.error(`❌ Environment comparison failed:`, error);
      throw error;
    }
  }

  /**
   * Compare schemas between environments
   */
  compareSchemas(sourceSchema, targetSchema) {
    const differences = {
      tables: {
        onlyInSource: [],
        onlyInTarget: [],
        different: []
      }
    };

    const sourceTables = new Set(sourceSchema.tables?.map(t => t.name) || []);
    const targetTables = new Set(targetSchema.tables?.map(t => t.name) || []);

    // Find tables only in source
    for (const table of sourceTables) {
      if (!targetTables.has(table)) {
        differences.tables.onlyInSource.push(table);
      }
    }

    // Find tables only in target
    for (const table of targetTables) {
      if (!sourceTables.has(table)) {
        differences.tables.onlyInTarget.push(table);
      }
    }

    return differences;
  }

  /**
   * Initialize environment for branch
   */
  async initializeBranchEnvironment(branchName) {
    console.log(`🚀 Initializing environment for branch: ${branchName}`);

    try {
      // Create branch-specific configuration
      const branchConfig = {
        branch: branchName,
        environment: this.environment,
        initialized: new Date().toISOString(),
        baseCommit: this.getCurrentCommit(),
        parentBranch: this.config.branch
      };

      // Save branch configuration
      const configDir = path.join(process.cwd(), 'database', 'branches');
      await fs.mkdir(configDir, { recursive: true });

      const configFile = path.join(configDir, `${branchName}_config.json`);
      await fs.writeFile(configFile, JSON.stringify(branchConfig, null, 2));

      // Create initial snapshot
      await this.createEnvironmentSnapshot(`branch_init_${branchName}`);

      console.log(`✅ Branch environment initialized: ${configFile}`);
      return branchConfig;

    } catch (error) {
      console.error(`❌ Branch environment initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Cleanup branch environment
   */
  async cleanupBranchEnvironment(branchName) {
    console.log(`🧹 Cleaning up environment for branch: ${branchName}`);

    try {
      // Create final snapshot before cleanup
      await this.createEnvironmentSnapshot(`branch_cleanup_${branchName}`);

      // Archive branch configuration
      const configFile = path.join(process.cwd(), 'database', 'branches', `${branchName}_config.json`);
      const archiveFile = path.join(process.cwd(), 'database', 'archives', `${branchName}_config_${Date.now()}.json`);
      
      await fs.mkdir(path.dirname(archiveFile), { recursive: true });
      
      try {
        await fs.rename(configFile, archiveFile);
        console.log(`📦 Branch configuration archived: ${archiveFile}`);
      } catch (error) {
        console.warn(`Could not archive branch config: ${error.message}`);
      }

      console.log(`✅ Branch environment cleanup completed`);

    } catch (error) {
      console.error(`❌ Branch environment cleanup failed:`, error);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const environment = args[1] || 'development';

  try {
    const manager = new EnvironmentManager(environment);

    switch (command) {
      case 'validate':
        const validation = await manager.validateEnvironment();
        console.log(JSON.stringify(validation, null, 2));
        if (!validation.valid) process.exit(1);
        break;

      case 'sync':
        await manager.syncMigrations();
        break;

      case 'snapshot':
        const name = args[2] || `manual_${Date.now()}`;
        await manager.createEnvironmentSnapshot(name);
        break;

      case 'compare':
        const targetEnv = args[2];
        if (!targetEnv) {
          console.error('❌ Target environment is required for comparison');
          process.exit(1);
        }
        await manager.compareEnvironments(targetEnv);
        break;

      case 'init-branch':
        const branchName = args[2] || manager.getCurrentBranch();
        await manager.initializeBranchEnvironment(branchName);
        break;

      case 'cleanup-branch':
        const cleanupBranch = args[2] || manager.getCurrentBranch();
        await manager.cleanupBranchEnvironment(cleanupBranch);
        break;

      case 'metadata':
        await manager.createEnvironmentMetadata();
        break;

      default:
        console.log(`
Database Environment Manager

Usage:
  node environment-manager.js <command> [environment] [options]

Commands:
  validate [env]              - Validate environment configuration
  sync [env]                  - Sync migrations to environment
  snapshot [env] [name]       - Create environment snapshot
  compare [env] [target-env]  - Compare two environments
  init-branch [env] [branch]  - Initialize branch environment
  cleanup-branch [env] [branch] - Cleanup branch environment
  metadata [env]              - Create environment metadata

Environments:
  production, staging, development

Examples:
  node environment-manager.js validate staging
  node environment-manager.js sync production
  node environment-manager.js snapshot development "pre_feature"
  node environment-manager.js compare staging production
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

export default EnvironmentManager;