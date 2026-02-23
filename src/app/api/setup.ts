import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { Config, getConfig, resetConfig, getDefaultConfig } from '@/lib/config';
import { Logger } from '@/lib/logger';

function isValidEmail(email?: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getActiveConfigPath(): string {
  // Check for custom config directory from environment variable (Docker)
  const configDir = process.env.CONFIG_DIR;
  if (configDir) {
    const local = path.join(configDir, 'config.local.yml');
    const base = path.join(configDir, 'config.yml');
    return fs.existsSync(local) ? local : base;
  }

  const root = process.cwd();
  const local = path.join(root, 'config.local.yml');
  const base = path.join(root, 'config.yml');
  return fs.existsSync(local) ? local : base;
}

function getSetupState(config: Config, forceCheck: boolean = false) {
  const errors: string[] = [];

  // If forceCheck is true, always show wizard
  if (forceCheck) {
    return { configured: false, errors: [] };
  }

  // Check for missing values
  if (!isValidEmail(config.emails?.old_address)) {
    errors.push('Old email address is missing');
  }

  if (!Array.isArray(config.emails?.new_domains) || config.emails.new_domains.length === 0) {
    errors.push('New domains are missing');
  }

  if (!isValidEmail(config.protonmail?.imap_user)) {
    errors.push('IMAP user is missing');
  }

  if (!config.protonmail?.imap_password) {
    errors.push('IMAP password is missing');
  }

  return {
    configured: errors.length === 0,
    errors,
  };
}

export async function GET(req: NextRequest) {
  try {
    const config = getConfig();

    // Check for force parameter to re-run setup
    const searchParams = req.nextUrl.searchParams;
    const forceCheck = searchParams.get('force') === 'true';

    const setup = getSetupState(config, forceCheck);

    return NextResponse.json({
      success: true,
      ...setup,
      defaults: {
        oldAddress: config.emails?.old_address || '',
        newDomains: (config.emails?.new_domains || []).join(', '),
        personalDomains: (config.emails?.personal_domains || []).join(', '),
        imapHost: config.protonmail?.imap_host || '127.0.0.1',
        imapPort: config.protonmail?.imap_port || 1143,
        imapUser: config.protonmail?.imap_user || '',
        emailScanLimit: config.protonmail?.email_scan_limit || 5000,
        schedulerEnabled: config.scheduler?.enabled ?? true,
        schedulerCron: config.scheduler?.cron || '0 6 * * *',
        serverPort: config.server?.port || 3200,
      },
      meta: {
        activeFile: path.basename(getActiveConfigPath()),
        hasLocalConfig: fs.existsSync(path.join(process.cwd(), 'config.local.yml')),
        forcedCheck: forceCheck,
      },
    });
  } catch (error) {
    Logger.error('Error reading setup state: ' + String(error));
    return NextResponse.json({ success: false, error: 'Failed to read setup state' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const oldAddress = String(body.oldAddress || '').trim();
    const newDomains = String(body.newDomains || '')
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const personalDomains = String(body.personalDomains || '')
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const imapHost = String(body.imapHost || '127.0.0.1').trim();
    const imapPort = Number(body.imapPort || 1143);
    const imapUser = String(body.imapUser || '').trim();
    const imapPassword = String(body.imapPassword || '').trim();
    const emailScanLimit = Number(body.emailScanLimit || 5000);
    const schedulerEnabled = Boolean(body.schedulerEnabled ?? true);
    const schedulerCron = String(body.schedulerCron || '0 6 * * *').trim();
    const serverPort = Number(body.serverPort || 3200);

    if (!isValidEmail(oldAddress)) {
      return NextResponse.json({ success: false, error: 'Old email address is invalid' }, { status: 400 });
    }

    if (!isValidEmail(imapUser)) {
      return NextResponse.json({ success: false, error: 'IMAP user must be a valid email address' }, { status: 400 });
    }

    if (newDomains.length === 0) {
      return NextResponse.json({ success: false, error: 'Add at least one new domain' }, { status: 400 });
    }

    // Load existing config
    const configPath = getActiveConfigPath();
    const activePath = getActiveConfigPath();

    let existing: any = {};
    if (fs.existsSync(configPath)) {
      existing = yaml.parse(fs.readFileSync(configPath, 'utf8'));
    }

    const nextConfig: Config = {
      ...existing,
      emails: {
        ...existing.emails,
        old_address: oldAddress,
        new_domains: newDomains,
        personal_domains: personalDomains,
      },
      protonmail: {
        ...existing.protonmail,
        imap_host: imapHost,
        imap_port: imapPort,
        imap_user: imapUser,
        imap_password: imapPassword,
        email_scan_limit: emailScanLimit,
      },
      scheduler: {
        enabled: schedulerEnabled,
        cron: schedulerCron,
      },
      server: {
        port: serverPort,
      },
    };

    // Ensure directory exists
    const configDir = process.env.CONFIG_DIR || process.cwd();
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(configPath, yaml.stringify(nextConfig), 'utf8');

    resetConfig();

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      configured: true,
    });
  } catch (error) {
    Logger.error('Error applying setup: ' + String(error));
    return NextResponse.json({ success: false, error: 'Failed to save setup' }, { status: 500 });
  }
}
