import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

export interface Config {
  emails: {
    old_address: string;
    new_domains: string[];
    personal_domains: string[];
  };
  protonmail: {
    config_path: string;
    email_scan_limit: number;
  };
  database: {
    path: string;
  };
  server: {
    port: number;
  };
  categories: Record<string, {
    keywords: string[];
    color: string;
    icon: string;
    priority?: string;
  }>;
  priority: {
    high_domains: string[];
  };
  dashboard: {
    title: string;
    subtitle: string;
    theme: string;
    accent_color: string;
  };
}

let cachedConfig: Config | null = null;

export function loadConfig(): Config {
  if (cachedConfig) return cachedConfig;

  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    console.warn(`Config file not found at ${configPath}, using defaults`);
    return getDefaultConfig();
  }

  const configFile = fs.readFileSync(configPath, 'utf8');
  const config = yaml.parse(configFile) as Config;

  // Merge with defaults for any missing fields
  cachedConfig = { ...getDefaultConfig(), ...config };
  return cachedConfig;
}

function getConfigPath(): string {
  // Check for local config first, then fall back to default
  const baseDir = process.cwd();
  const localConfig = path.join(baseDir, 'config.local.yml');
  const defaultConfig = path.join(baseDir, 'config.yml');

  if (fs.existsSync(localConfig)) {
    return localConfig;
  }
  return defaultConfig;
}

function getDefaultConfig(): Config {
  return {
    emails: {
      old_address: 'yourname@gmail.com',
      new_domains: ['yourdomain.com'],
      personal_domains: ['gmail.com', 'protonmail.com', 'yourdomain.com'],
    },
    protonmail: {
      config_path: '~/.config/mcporter.json',
      email_scan_limit: 500,
    },
    database: {
      path: 'data/migration.db',
    },
    server: {
      port: 3000,
    },
    categories: {
      social: { keywords: ['linkedin', 'facebook', 'twitter', 'instagram'], color: '#8b5cf6', icon: 'Users' },
      financial: { keywords: ['paypal', 'bank', 'credit', 'finance'], color: '#ef4444', icon: 'DollarSign', priority: 'high' },
      shopping: { keywords: ['amazon', 'ebay', 'aliexpress'], color: '#f59e0b', icon: 'ShoppingBag' },
      work: { keywords: ['linkedin', 'github', 'jira', 'notion'], color: '#3b82f6', icon: 'Briefcase' },
      government: { keywords: ['gov', 'tax', 'irs'], color: '#6366f1', icon: 'Building', priority: 'high' },
      health: { keywords: ['health', 'medical', 'doctor'], color: '#10b981', icon: 'Heart' },
      travel: { keywords: ['airbnb', 'uber', 'booking'], color: '#06b6d4', icon: 'Plane' },
      entertainment: { keywords: ['netflix', 'spotify', 'youtube'], color: '#f97316', icon: 'Gamepad2' },
      education: { keywords: ['coursera', 'udemy', 'edx'], color: '#14b8a6', icon: 'GraduationCap' },
      food: { keywords: ['ubereats', 'deliveroo', 'doordash'], color: '#f43f5e', icon: 'Utensils' },
      technology: { keywords: ['github', 'stackoverflow', 'vercel'], color: '#7c3aed', icon: 'Code' },
      utilities: { keywords: ['electric', 'gas', 'water', 'internet'], color: '#84cc16', icon: 'Zap' },
      newsletters: { keywords: ['newsletter', 'substack', 'mailing'], color: '#ec4899', icon: 'Newspaper', priority: 'low' },
    },
    priority: {
      high_domains: ['paypal', 'bank', 'gov', 'tax', 'irs'],
    },
    dashboard: {
      title: 'Email Migration Tracker',
      subtitle: 'Track your email migration progress',
      theme: 'dark',
      accent_color: '#00d4aa',
    },
  };
}

export function getConfig(): Config {
  return loadConfig();
}

export function resetConfig() {
  cachedConfig = null;
}
