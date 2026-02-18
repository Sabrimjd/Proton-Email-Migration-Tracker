import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { resetConfig, Config } from '@/lib/config';

// GET /api/config - Load current configuration
export async function GET() {
  try {
    const configPath = path.join(process.cwd(), 'config.yml');
    const localConfigPath = path.join(process.cwd(), 'config.local.yml');
    
    const activeConfigPath = fs.existsSync(localConfigPath) ? localConfigPath : configPath;
    const configFile = fs.readFileSync(activeConfigPath, 'utf8');
    const config = yaml.parse(configFile) as Config;
    
    // Get available backup files
    const backupsDir = path.join(process.cwd(), 'data', 'config-backups');
    const backups: string[] = [];
    if (fs.existsSync(backupsDir)) {
      const files = fs.readdirSync(backupsDir)
        .filter(f => f.endsWith('.yml'))
        .sort()
        .reverse();
      backups.push(...files);
    }
    
    return NextResponse.json({
      success: true,
      config,
      meta: {
        activeFile: path.basename(activeConfigPath),
        hasLocalConfig: fs.existsSync(localConfigPath),
        backupsCount: backups.length,
        recentBackups: backups.slice(0, 5),
      },
    });
  } catch (error) {
    console.error('Error loading config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load configuration' },
      { status: 500 }
    );
  }
}

// PATCH /api/config - Update configuration
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { section, data } = body;
    
    // Load current config
    const configPath = path.join(process.cwd(), 'config.yml');
    const localConfigPath = path.join(process.cwd(), 'config.local.yml');
    const activeConfigPath = fs.existsSync(localConfigPath) ? localConfigPath : configPath;
    
    const configFile = fs.readFileSync(activeConfigPath, 'utf8');
    const config = yaml.parse(configFile) as Config;
    
    // Validate section
    const validSections = ['emails', 'protonmail', 'database', 'server', 'scheduler', 'categories', 'priority', 'dashboard'];
    if (!validSections.includes(section)) {
      return NextResponse.json(
        { success: false, error: `Invalid section: ${section}` },
        { status: 400 }
      );
    }

    if (typeof data === 'undefined' || data === null || (typeof data !== 'object' && !Array.isArray(data))) {
      return NextResponse.json(
        { success: false, error: 'Invalid section payload' },
        { status: 400 }
      );
    }
    
    // Create backup before modifying
    await createConfigBackup(activeConfigPath);
    
    // Update the section
    (config as any)[section] = data;
    
    // Write to config.local.yml (always use local for user changes)
    const targetPath = localConfigPath;
    const yamlContent = yaml.stringify(config);
    fs.writeFileSync(targetPath, yamlContent, 'utf8');
    
    // Reset cached config
    resetConfig();
    
    return NextResponse.json({
      success: true,
      message: `Configuration section '${section}' updated successfully`,
      config,
    });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}

// POST /api/config - Restore or validate configuration
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, data } = body;
    
    switch (action) {
      case 'validate': {
        // Validate a configuration object
        const validation = validateConfig(data);
        return NextResponse.json({
          success: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
        });
      }
      
      case 'restore-backup': {
        // Restore from a backup file
        const { filename } = data;
        const backupsDir = path.join(process.cwd(), 'data', 'config-backups');
        const backupPath = path.join(backupsDir, filename);
        
        if (!fs.existsSync(backupPath)) {
          return NextResponse.json(
            { success: false, error: 'Backup file not found' },
            { status: 404 }
          );
        }
        
        // Create backup of current config before restore
        const localConfigPath = path.join(process.cwd(), 'config.local.yml');
        if (fs.existsSync(localConfigPath)) {
          await createConfigBackup(localConfigPath);
        }
        
        // Restore
        const backupContent = fs.readFileSync(backupPath, 'utf8');
        fs.writeFileSync(localConfigPath, backupContent, 'utf8');
        
        // Reset cached config
        resetConfig();
        
        return NextResponse.json({
          success: true,
          message: `Configuration restored from ${filename}`,
        });
      }
      
      case 'create-backup': {
        // Create a manual backup
        const localConfigPath = path.join(process.cwd(), 'config.local.yml');
        const configPath = path.join(process.cwd(), 'config.yml');
        const activeConfigPath = fs.existsSync(localConfigPath) ? localConfigPath : configPath;
        
        const backupFile = await createConfigBackup(activeConfigPath, true);
        
        return NextResponse.json({
          success: true,
          message: 'Configuration backup created',
          backupFile,
        });
      }
      
      case 'reset-to-defaults': {
        // Reset to default config.yml
        const localConfigPath = path.join(process.cwd(), 'config.local.yml');
        
        if (fs.existsSync(localConfigPath)) {
          // Backup before removing
          await createConfigBackup(localConfigPath);
          fs.unlinkSync(localConfigPath);
        }
        
        resetConfig();
        
        return NextResponse.json({
          success: true,
          message: 'Configuration reset to defaults (config.yml)',
        });
      }
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in config action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform config action' },
      { status: 500 }
    );
  }
}

// Helper: Create a backup of the config file
async function createConfigBackup(configPath: string, manual = false): Promise<string> {
  const backupsDir = path.join(process.cwd(), 'data', 'config-backups');
  
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const prefix = manual ? 'manual-' : 'auto-';
  const backupFilename = `${prefix}config-${timestamp}.yml`;
  const backupPath = path.join(backupsDir, backupFilename);
  
  fs.copyFileSync(configPath, backupPath);
  
  // Keep only last 20 auto-backups and 10 manual backups
  const files = fs.readdirSync(backupsDir);
  const autoBackups = files.filter(f => f.startsWith('auto-')).sort();
  const manualBackups = files.filter(f => f.startsWith('manual-')).sort();
  
  // Remove old auto backups
  while (autoBackups.length > 20) {
    const toRemove = autoBackups.shift()!;
    fs.unlinkSync(path.join(backupsDir, toRemove));
  }
  
  // Remove old manual backups
  while (manualBackups.length > 10) {
    const toRemove = manualBackups.shift()!;
    fs.unlinkSync(path.join(backupsDir, toRemove));
  }
  
  return backupFilename;
}

// Helper: Validate configuration
function validateConfig(config: any): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check required fields
  if (!config.emails?.old_address) {
    errors.push('emails.old_address is required');
  }
  
  if (!config.emails?.new_domains || config.emails.new_domains.length === 0) {
    errors.push('emails.new_domains must have at least one domain');
  }
  
  if (!config.protonmail?.imap_host) {
    errors.push('protonmail.imap_host is required');
  }
  
  if (!config.protonmail?.imap_port) {
    errors.push('protonmail.imap_port is required');
  }
  
  if (!config.protonmail?.imap_user) {
    errors.push('protonmail.imap_user is required');
  }
  
  if (!config.protonmail?.imap_password) {
    warnings.push('protonmail.imap_password is empty - IMAP connection will fail');
  }
  
  // Validate email format
  if (config.emails?.old_address && !isValidEmail(config.emails.old_address)) {
    errors.push('emails.old_address is not a valid email address');
  }
  
  if (config.protonmail?.imap_user && !isValidEmail(config.protonmail.imap_user)) {
    errors.push('protonmail.imap_user is not a valid email address');
  }
  
  // Validate port number
  if (config.protonmail?.imap_port && (config.protonmail.imap_port < 1 || config.protonmail.imap_port > 65535)) {
    errors.push('protonmail.imap_port must be between 1 and 65535');
  }
  
  // Validate cron schedule
  if (config.scheduler?.enabled && config.scheduler?.cron) {
    if (!isValidCron(config.scheduler.cron)) {
      warnings.push('scheduler.cron may not be a valid cron expression');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Helper: Check if string is valid email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper: Basic cron validation (very simple)
function isValidCron(cron: string): boolean {
  const parts = cron.trim().split(/\s+/);
  return parts.length >= 5 && parts.length <= 6;
}
