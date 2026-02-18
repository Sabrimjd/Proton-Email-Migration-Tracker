'use client';

import { useState, useEffect } from 'react';
import {
  Settings, Mail, Server, Clock, Tag, Zap, Monitor,
  Save, RefreshCw, AlertCircle, CheckCircle, Download,
  RotateCcw, Eye, EyeOff, TestTube, Settings2, Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Config {
  emails: {
    old_address: string;
    new_domains: string[];
    personal_domains: string[];
  };
  protonmail: {
    imap_host: string;
    imap_port: number;
    imap_user: string;
    imap_password: string;
    email_scan_limit: number;
  };
  database: {
    path: string;
  };
  server: {
    port: number;
  };
  scheduler: {
    enabled: boolean;
    cron: string;
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

interface ConfigMeta {
  activeFile: string;
  hasLocalConfig: boolean;
  backupsCount: number;
  recentBackups: string[];
}

interface ConfigManagerProps {
  onRerunSetup?: () => void;
}

export function ConfigManager({ onRerunSetup }: ConfigManagerProps) {
  const [config, setConfig] = useState<Config | null>(null);
  const [meta, setMeta] = useState<ConfigMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [activeSection, setActiveSection] = useState('emails');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setMeta(data.meta);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      showMessage('error', 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const startEditing = (section: string) => {
    setEditingSection(section);
    setEditedData(JSON.parse(JSON.stringify((config as any)[section])));
    setValidationErrors([]);
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditedData(null);
    setValidationErrors([]);
  };

  const saveSection = async (section: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, data: editedData }),
      });
      const data = await res.json();
      
      if (data.success) {
        setConfig(data.config);
        setEditingSection(null);
        setEditedData(null);
        showMessage('success', `Configuration section '${section}' updated successfully`);
      } else {
        showMessage('error', data.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      showMessage('error', 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const createBackup = async () => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-backup' }),
      });
      const data = await res.json();
      
      if (data.success) {
        showMessage('success', `Backup created: ${data.backupFile}`);
        fetchConfig();
      } else {
        showMessage('error', data.error || 'Failed to create backup');
      }
    } catch (error) {
      showMessage('error', 'Failed to create backup');
    }
  };

  const resetToDefaults = async () => {
    if (!confirm('Reset configuration to defaults? This will remove your local config file.')) {
      return;
    }
    
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-to-defaults' }),
      });
      const data = await res.json();
      
      if (data.success) {
        showMessage('success', 'Configuration reset to defaults');
        fetchConfig();
      } else {
        showMessage('error', data.error || 'Failed to reset configuration');
      }
    } catch (error) {
      showMessage('error', 'Failed to reset configuration');
    }
  };

  const testIMAPConnection = async () => {
    if (!config) return;
    
    setTesting(true);
    setTestResult(null);
    
    try {
      // Real IMAP test via API endpoint
      const res = await fetch('/api/imap-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: config.protonmail.imap_host,
          port: config.protonmail.imap_port,
          user: config.protonmail.imap_user,
          password: config.protonmail.imap_password,
        }),
      });
      
      const data = await res.json();
      
      setTestResult({
        success: data.success,
        message: data.message || (data.success
          ? 'Connection successful! IMAP server is reachable.'
          : 'Connection failed. Check your credentials and ensure Proton Bridge is running.'),
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Connection test failed. Check your settings and try again.',
      });
    } finally {
      setTesting(false);
    }
  };

  const downloadConfig = () => {
    if (!config) return;
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-migration-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-8 h-8 mx-auto mb-3 text-[#00d4aa] animate-spin" />
        <p className="text-sm font-mono text-white/40">Loading configuration...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-400" />
          <p className="text-sm font-mono text-white/40">Failed to load configuration</p>
          <Button onClick={fetchConfig} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const sections = [
    { id: 'emails', label: 'Email Addresses', icon: Mail },
    { id: 'protonmail', label: 'IMAP Settings', icon: Server },
    { id: 'scheduler', label: 'Scheduler', icon: Clock },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'priority', label: 'Priority Domains', icon: Zap },
    { id: 'dashboard', label: 'Dashboard', icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      {/* Message banner */}
      {message && (
        <div className={`p-4 rounded-lg border flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-mono">{message.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold font-mono flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#00d4aa]" />
            Configuration Manager
          </h2>
          {meta && (
            <p className="text-xs font-mono text-white/40 mt-1">
              Active: <span className="text-[#00d4aa]">{meta.activeFile}</span>
              {meta.hasLocalConfig && <Badge variant="outline" className="ml-2">Local Override</Badge>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onRerunSetup && (
            <Button variant="default" size="sm" onClick={onRerunSetup}>
              <Settings2 className="w-3 h-3" />
              Setup Wizard
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={downloadConfig}>
            <Download className="w-3 h-3" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={createBackup}>
            <Save className="w-3 h-3" />
            Backup
          </Button>
          <Button variant="ghost" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2">
        {sections.map(section => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          const isEditing = editingSection === section.id;
          
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 rounded-lg text-sm font-mono flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-[#00d4aa]/20 border border-[#00d4aa]/40 text-[#00d4aa]'
                  : 'bg-white/[0.03] border border-white/[0.06] text-white/60 hover:bg-white/[0.06] hover:text-white/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {section.label}
              {isEditing && <Badge variant="warning" className="ml-1">Editing</Badge>}
            </button>
          );
        })}
      </div>

      {/* Configuration sections */}
      <div className="space-y-4">
        {activeSection === 'emails' && (
          <EmailsSection
            config={config.emails}
            editing={editingSection === 'emails'}
            editedData={editedData}
            onStartEdit={() => startEditing('emails')}
            onCancelEdit={cancelEditing}
            onSave={() => saveSection('emails')}
            onUpdateData={setEditedData}
            saving={saving}
          />
        )}

        {activeSection === 'protonmail' && (
          <IMAPSection
            config={config.protonmail}
            editing={editingSection === 'protonmail'}
            editedData={editedData}
            onStartEdit={() => startEditing('protonmail')}
            onCancelEdit={cancelEditing}
            onSave={() => saveSection('protonmail')}
            onUpdateData={setEditedData}
            onTest={testIMAPConnection}
            testing={testing}
            testResult={testResult}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
            saving={saving}
          />
        )}

        {activeSection === 'scheduler' && (
          <SchedulerSection
            config={config.scheduler}
            editing={editingSection === 'scheduler'}
            editedData={editedData}
            onStartEdit={() => startEditing('scheduler')}
            onCancelEdit={cancelEditing}
            onSave={() => saveSection('scheduler')}
            onUpdateData={setEditedData}
            saving={saving}
          />
        )}

        {activeSection === 'categories' && (
          <CategoriesSection
            config={config.categories}
            editing={editingSection === 'categories'}
            editedData={editedData}
            onStartEdit={() => startEditing('categories')}
            onCancelEdit={cancelEditing}
            onSave={() => saveSection('categories')}
            onUpdateData={setEditedData}
            saving={saving}
          />
        )}

        {activeSection === 'priority' && (
          <PrioritySection
            config={config.priority}
            editing={editingSection === 'priority'}
            editedData={editedData}
            onStartEdit={() => startEditing('priority')}
            onCancelEdit={cancelEditing}
            onSave={() => saveSection('priority')}
            onUpdateData={setEditedData}
            saving={saving}
          />
        )}

        {activeSection === 'dashboard' && (
          <DashboardSection
            config={config.dashboard}
            editing={editingSection === 'dashboard'}
            editedData={editedData}
            onStartEdit={() => startEditing('dashboard')}
            onCancelEdit={cancelEditing}
            onSave={() => saveSection('dashboard')}
            onUpdateData={setEditedData}
            saving={saving}
          />
        )}
      </div>

      {/* Backups info */}
      {meta && meta.backupsCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xs flex items-center gap-2">
              <Save className="w-3.5 h-3.5 text-[#00d4aa]" />
              Configuration Backups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs font-mono text-white/40">
              {meta.backupsCount} backup(s) available
            </div>
            <div className="mt-2 space-y-1">
              {meta.recentBackups.slice(0, 5).map((backup, i) => (
                <div key={i} className="text-[10px] font-mono text-white/30">
                  {backup}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Individual section components

function EmailsSection({ config, editing, editedData, onStartEdit, onCancelEdit, onSave, onUpdateData, saving }: any) {
  const data = editing ? editedData : config;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-[#00d4aa]" />
            Email Addresses
          </CardTitle>
          {!editing ? (
            <Button size="sm" onClick={onStartEdit}>Edit</Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={onCancelEdit}>Cancel</Button>
              <Button size="sm" onClick={onSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
        <CardDescription>
          Configure your old and new email addresses for migration tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs font-mono text-white/60 block mb-1">Old Email Address</label>
          {editing ? (
            <input
              type="email"
              value={editedData.old_address || ''}
              onChange={(e) => onUpdateData({ ...editedData, old_address: e.target.value })}
              className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/90 focus:outline-none focus:border-[#00d4aa]/50"
              placeholder="yourname@gmail.com"
            />
          ) : (
            <div className="text-sm font-mono text-white/90">{data.old_address}</div>
          )}
        </div>

        <div>
          <label className="text-xs font-mono text-white/60 block mb-1">New Domains (Migration Targets)</label>
          {editing ? (
            <textarea
              value={(editedData.new_domains || []).join('\n')}
              onChange={(e) => onUpdateData({ ...editedData, new_domains: e.target.value.split('\n').filter(Boolean) })}
              className="w-full h-24 px-3 py-2 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/90 focus:outline-none focus:border-[#00d4aa]/50"
              placeholder="yourdomain.com&#10;anotherdomain.com"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.new_domains.map((domain: string, i: number) => (
                <Badge key={i} variant="outline">{domain}</Badge>
              ))}
            </div>
          )}
          <p className="text-[10px] font-mono text-white/40 mt-1">Services sending to these domains will be auto-marked as migrated</p>
        </div>

        <div>
          <label className="text-xs font-mono text-white/60 block mb-1">Personal Domains (Excluded)</label>
          {editing ? (
            <textarea
              value={(editedData.personal_domains || []).join('\n')}
              onChange={(e) => onUpdateData({ ...editedData, personal_domains: e.target.value.split('\n').filter(Boolean) })}
              className="w-full h-20 px-3 py-2 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/90 focus:outline-none focus:border-[#00d4aa]/50"
              placeholder="gmail.com&#10;protonmail.com"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.personal_domains.map((domain: string, i: number) => (
                <Badge key={i} variant="secondary">{domain}</Badge>
              ))}
            </div>
          )}
          <p className="text-[10px] font-mono text-white/40 mt-1">These are YOUR domains, not services to migrate</p>
        </div>
      </CardContent>
    </Card>
  );
}

function IMAPSection({ config, editing, editedData, onStartEdit, onCancelEdit, onSave, onUpdateData, onTest, testing, testResult, showPassword, onTogglePassword, saving }: any) {
  const data = editing ? editedData : config;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-[#00d4aa]" />
            IMAP Settings
          </CardTitle>
          <div className="flex gap-2">
            {!editing ? (
              <>
                <Button size="sm" variant="outline" onClick={onTest} disabled={testing}>
                  {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
                  {testing ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button size="sm" onClick={onStartEdit}>Edit</Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={onCancelEdit}>Cancel</Button>
                <Button size="sm" onClick={onSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </>
            )}
          </div>
        </div>
        <CardDescription>
          ProtonMail Bridge IMAP connection settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {testResult && (
          <div className={`p-3 rounded-lg border flex items-center gap-2 ${
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            {testResult.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span className="text-xs font-mono">{testResult.message}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-mono text-white/60 block mb-1">IMAP Host</label>
            {editing ? (
              <input
                type="text"
                value={editedData.imap_host || ''}
                onChange={(e) => onUpdateData({ ...editedData, imap_host: e.target.value })}
                className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/90"
              />
            ) : (
              <div className="text-sm font-mono text-white/90">{data.imap_host}</div>
            )}
          </div>
          <div>
            <label className="text-xs font-mono text-white/60 block mb-1">Port</label>
            {editing ? (
              <input
                type="number"
                value={editedData.imap_port || ''}
                onChange={(e) => onUpdateData({ ...editedData, imap_port: parseInt(e.target.value) })}
                className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/90"
              />
            ) : (
              <div className="text-sm font-mono text-white/90">{data.imap_port}</div>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs font-mono text-white/60 block mb-1">Username</label>
          {editing ? (
            <input
              type="email"
              value={editedData.imap_user || ''}
              onChange={(e) => onUpdateData({ ...editedData, imap_user: e.target.value })}
              className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/90"
            />
          ) : (
            <div className="text-sm font-mono text-white/90">{data.imap_user}</div>
          )}
        </div>

        <div>
          <label className="text-xs font-mono text-white/60 block mb-1">Password</label>
          {editing ? (
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={editedData.imap_password || ''}
                onChange={(e) => onUpdateData({ ...editedData, imap_password: e.target.value })}
                className="w-full h-9 px-3 pr-10 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/90"
              />
              <button
                type="button"
                onClick={onTogglePassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <div className="text-sm font-mono text-white/40">••••••••</div>
          )}
          <p className="text-[10px] font-mono text-white/40 mt-1">
            Use the bridge password from Proton Mail Bridge, not your Proton account password
          </p>
        </div>

        <div>
          <label className="text-xs font-mono text-white/60 block mb-1">Email Scan Limit</label>
          {editing ? (
            <input
              type="number"
              value={editedData.email_scan_limit || ''}
              onChange={(e) => onUpdateData({ ...editedData, email_scan_limit: parseInt(e.target.value) })}
              className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/90"
            />
          ) : (
            <div className="text-sm font-mono text-white/90">{data.email_scan_limit?.toLocaleString()} emails</div>
          )}
          <p className="text-[10px] font-mono text-white/40 mt-1">Maximum number of recent emails to scan per run</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SchedulerSection({ config, editing, editedData, onStartEdit, onCancelEdit, onSave, onUpdateData, saving }: any) {
  const data = editing ? editedData : config;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#00d4aa]" />
            Scheduler
          </CardTitle>
          {!editing ? (
            <Button size="sm" onClick={onStartEdit}>Edit</Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={onCancelEdit}>Cancel</Button>
              <Button size="sm" onClick={onSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
        <CardDescription>
          Configure automatic email scanning schedule
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-mono text-white/90">Enable Scheduler</div>
            <div className="text-[10px] font-mono text-white/40">Run automatic scans</div>
          </div>
          {editing ? (
            <button
              onClick={() => onUpdateData({ ...editedData, enabled: !editedData.enabled })}
              className={`w-12 h-6 rounded-full transition-all ${
                editedData.enabled ? 'bg-[#00d4aa]' : 'bg-white/20'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                editedData.enabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          ) : (
            <Badge variant={data.enabled ? 'success' : 'secondary'}>
              {data.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          )}
        </div>

        <div>
          <label className="text-xs font-mono text-white/60 block mb-1">Cron Schedule</label>
          {editing ? (
            <input
              type="text"
              value={editedData.cron || ''}
              onChange={(e) => onUpdateData({ ...editedData, cron: e.target.value })}
              className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/90"
              placeholder="0 6 * * *"
            />
          ) : (
            <div className="text-sm font-mono text-white/90 font-bold">{data.cron}</div>
          )}
          <p className="text-[10px] font-mono text-white/40 mt-1">
            Example: "0 6 * * *" = Every day at 6:00 AM
          </p>
        </div>

        {!editing && (
          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="text-[10px] font-mono text-white/40 mb-1">Schedule description:</div>
            <div className="text-xs font-mono text-white/70">
              {describeCron(data.cron)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CategoriesSection({ config, editing, editedData, onStartEdit, onCancelEdit, onSave, onUpdateData, saving }: any) {
  const data = editing ? editedData : config;
  const categoryNames = Object.keys(data || {});
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-[#00d4aa]" />
            Categories
          </CardTitle>
          {!editing ? (
            <Button size="sm" onClick={onStartEdit}>Edit</Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={onCancelEdit}>Cancel</Button>
              <Button size="sm" onClick={onSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
        <CardDescription>
          Customize category keywords and colors
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {categoryNames.map(catName => {
            const cat = data[catName];
            return (
              <div key={catName} className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm font-mono capitalize">{catName}</span>
                  {cat.priority && (
                    <Badge variant="outline" className="text-[10px]">{cat.priority} priority</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {cat.keywords.slice(0, 10).map((kw: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{kw}</Badge>
                  ))}
                  {cat.keywords.length > 10 && (
                    <span className="text-[10px] text-white/40">+{cat.keywords.length - 10} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {editing && (
          <p className="text-[10px] font-mono text-amber-400/70 mt-4">
            ⚠️ Category editing is complex. Consider editing config.yml directly for full control.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PrioritySection({ config, editing, editedData, onStartEdit, onCancelEdit, onSave, onUpdateData, saving }: any) {
  const data = editing ? editedData : config;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#00d4aa]" />
            Priority Domains
          </CardTitle>
          {!editing ? (
            <Button size="sm" onClick={onStartEdit}>Edit</Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={onCancelEdit}>Cancel</Button>
              <Button size="sm" onClick={onSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
        <CardDescription>
          Domains that will always be marked as high priority
        </CardDescription>
      </CardHeader>
      <CardContent>
        {editing ? (
          <textarea
            value={(editedData.high_domains || []).join('\n')}
            onChange={(e) => onUpdateData({ ...editedData, high_domains: e.target.value.split('\n').filter(Boolean) })}
            className="w-full h-32 px-3 py-2 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/90 focus:outline-none focus:border-[#00d4aa]/50"
            placeholder="paypal&#10;bank&#10;gov"
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.high_domains.map((domain: string, i: number) => (
              <Badge key={i} variant="danger">{domain}</Badge>
            ))}
          </div>
        )}
        <p className="text-[10px] font-mono text-white/40 mt-2">
          Services from these domains will always be marked as high priority
        </p>
      </CardContent>
    </Card>
  );
}

function DashboardSection({ config, editing, editedData, onStartEdit, onCancelEdit, onSave, onUpdateData, saving }: any) {
  const data = editing ? editedData : config;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs flex items-center gap-2">
            <Monitor className="w-3.5 h-3.5 text-[#00d4aa]" />
            Dashboard
          </CardTitle>
          {!editing ? (
            <Button size="sm" onClick={onStartEdit}>Edit</Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={onCancelEdit}>Cancel</Button>
              <Button size="sm" onClick={onSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
        <CardDescription>
          Customize dashboard appearance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs font-mono text-white/60 block mb-1">Title</label>
          {editing ? (
            <input
              type="text"
              value={editedData.title || ''}
              onChange={(e) => onUpdateData({ ...editedData, title: e.target.value })}
              className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/90"
            />
          ) : (
            <div className="text-sm font-mono text-white/90">{data.title}</div>
          )}
        </div>

        <div>
          <label className="text-xs font-mono text-white/60 block mb-1">Subtitle</label>
          {editing ? (
            <input
              type="text"
              value={editedData.subtitle || ''}
              onChange={(e) => onUpdateData({ ...editedData, subtitle: e.target.value })}
              className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/90"
            />
          ) : (
            <div className="text-sm font-mono text-white/90">{data.subtitle}</div>
          )}
        </div>

        <div>
          <label className="text-xs font-mono text-white/60 block mb-1">Accent Color</label>
          {editing ? (
            <div className="flex gap-2">
              <input
                type="color"
                value={editedData.accent_color || '#00d4aa'}
                onChange={(e) => onUpdateData({ ...editedData, accent_color: e.target.value })}
                className="w-12 h-9 rounded border border-white/[0.08] cursor-pointer"
              />
              <input
                type="text"
                value={editedData.accent_color || ''}
                onChange={(e) => onUpdateData({ ...editedData, accent_color: e.target.value })}
                className="flex-1 h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/90"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: data.accent_color }} />
              <div className="text-sm font-mono text-white/90">{data.accent_color}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper: Describe cron expression (simplified)
function describeCron(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return 'Invalid cron expression';
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  if (minute === '0' && hour !== '*') {
    return `Every day at ${hour}:00`;
  }
  
  if (minute === '0' && hour === '*/6') {
    return 'Every 6 hours';
  }
  
  if (minute === '0' && hour === '0') {
    return 'Every day at midnight';
  }
  
  return `Custom schedule: ${cron}`;
}
