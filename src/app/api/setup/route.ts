import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { Config, getConfig, resetConfig } from '@/lib/config';

function isPlaceholder(value?: string): boolean {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  return (
    v.includes('yourname@') ||
    v.includes('your-email@') ||
    v.includes('yourdomain.com') ||
    v.includes('your_proton_bridge_password')
  );
}

function isValidEmail(email?: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getActiveConfigPath(): string {
  const root = process.cwd();
  const local = path.join(root, 'config.local.yml');
  const base = path.join(root, 'config.yml');
  return fs.existsSync(local) ? local : base;
}

function getSetupState(config: Config) {
  const errors: string[] = [];

  if (!isValidEmail(config.emails?.old_address) || isPlaceholder(config.emails?.old_address)) {
    errors.push('Old email address is missing or still placeholder');
  }

  if (!Array.isArray(config.emails?.new_domains) || config.emails.new_domains.length === 0 || config.emails.new_domains.some(isPlaceholder)) {
    errors.push('New domains are missing or still placeholder');
  }

  if (!isValidEmail(config.protonmail?.imap_user) || isPlaceholder(config.protonmail?.imap_user)) {
    errors.push('IMAP user is missing or still placeholder');
  }

  if (!config.protonmail?.imap_password || isPlaceholder(config.protonmail?.imap_password)) {
    errors.push('IMAP password is missing or still placeholder');
  }

  return {
    configured: errors.length === 0,
    errors,
  };
}

export async function GET() {
  try {
    const config = getConfig();
    const setup = getSetupState(config);

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
      },
    });
  } catch (error) {
    console.error('Error reading setup state:', error);
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

    if (!imapPassword) {
      return NextResponse.json({ success: false, error: 'IMAP password is required' }, { status: 400 });
    }

    if (!Number.isFinite(imapPort) || imapPort < 1 || imapPort > 65535) {
      return NextResponse.json({ success: false, error: 'IMAP port must be between 1 and 65535' }, { status: 400 });
    }

    if (!Number.isFinite(serverPort) || serverPort < 1 || serverPort > 65535) {
      return NextResponse.json({ success: false, error: 'Server port must be between 1 and 65535' }, { status: 400 });
    }

    const activePath = getActiveConfigPath();
    const raw = fs.readFileSync(activePath, 'utf8');
    const existing = yaml.parse(raw) as Config;

    const nextConfig: Config = {
      ...existing,
      emails: {
        ...existing.emails,
        old_address: oldAddress,
        new_domains: newDomains,
        personal_domains: personalDomains.length > 0 ? personalDomains : ['gmail.com', 'protonmail.com', ...newDomains],
      },
      protonmail: {
        ...existing.protonmail,
        imap_host: imapHost,
        imap_port: imapPort,
        imap_user: imapUser,
        imap_password: imapPassword,
        email_scan_limit: emailScanLimit,
      },
      server: {
        ...existing.server,
        port: serverPort,
      },
      scheduler: {
        enabled: schedulerEnabled,
        cron: schedulerCron,
      },
    };

    const targetPath = path.join(process.cwd(), 'config.local.yml');
    fs.writeFileSync(targetPath, yaml.stringify(nextConfig), 'utf8');

    resetConfig();

    return NextResponse.json({
      success: true,
      message: 'Initial setup saved to config.local.yml',
      configured: true,
    });
  } catch (error) {
    console.error('Error applying setup:', error);
    return NextResponse.json({ success: false, error: 'Failed to save setup' }, { status: 500 });
  }
}
