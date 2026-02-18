'use client';

import { useState, useEffect } from 'react';
import {
  Database, Table, RefreshCw, Download, Upload, Trash2,
  CheckCircle, AlertCircle, Info, Archive, Zap,
  TestTube, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DatabaseInfo {
  stats: {
    path: string;
    sizeBytes: number;
    sizeFormatted: string;
    created: string;
    modified: string;
  };
  integrity: {
    status: string;
    passed: boolean;
    error?: string;
  };
  pageCount: number;
  pageSize: number;
  totalPages: number;
  totalSize: number;
  totalSizeFormatted: string;
}

interface TableStats {
  name: string;
  rowCount: number;
}

interface BackupInfo {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  created: string;
  modified: string;
}

export function DatabaseManager() {
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [tables, setTables] = useState<TableStats[]>([]);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearConfirm, setClearConfirm] = useState('');
  const [clearTables, setClearTables] = useState<string[]>([]);

  useEffect(() => {
    fetchDatabaseInfo();
  }, []);

  const fetchDatabaseInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/database');
      const data = await res.json();
      if (data.success) {
        setDbInfo(data.database);
        setTables(data.tables);
        setBackups(data.backups.recent || []);
      }
    } catch (error) {
      console.error('Error fetching database info:', error);
      showMessage('error', 'Failed to load database information');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const performAction = async (action: string, data?: any) => {
    setActionLoading(action);
    try {
      const res = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data }),
      });
      const result = await res.json();
      
      if (result.success) {
        showMessage('success', result.message || 'Operation successful');
        await fetchDatabaseInfo();
      } else {
        showMessage('error', result.error || 'Operation failed');
      }
      
      return result;
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      showMessage('error', `Failed to ${action}`);
      return { success: false };
    } finally {
      setActionLoading(null);
    }
  };

  const handleBackup = () => performAction('backup');
  const handleVacuum = () => performAction('vacuum');
  const handleSeed = () => performAction('seed');

  const handleClear = async () => {
    if (clearConfirm !== 'CONFIRM') {
      showMessage('error', 'Please type CONFIRM to proceed');
      return;
    }
    
    const result = await performAction('clear', { 
      tables: clearTables.length > 0 ? clearTables : undefined,
      confirm: 'CONFIRM'
    });
    
    if (result.success) {
      setShowClearDialog(false);
      setClearConfirm('');
      setClearTables([]);
    }
  };

  const handleRestore = async (filename: string) => {
    if (!confirm(`Restore database from ${filename}? This will replace current data.`)) {
      return;
    }
    
    await performAction('restore', { filename });
  };

  const handleDownload = async () => {
    setActionLoading('download');
    try {
      const res = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download' }),
      });
      const result = await res.json();
      
      if (result.success) {
        // Convert base64 to blob and download
        const byteCharacters = atob(result.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: result.mimeType });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);
        
        showMessage('success', 'Database downloaded successfully');
      } else {
        showMessage('error', result.error || 'Download failed');
      }
    } catch (error) {
      console.error('Error downloading database:', error);
      showMessage('error', 'Failed to download database');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-8 h-8 mx-auto mb-3 text-[#00d4aa] animate-spin" />
        <p className="text-sm font-mono text-white/40">Loading database information...</p>
      </div>
    );
  }

  if (!dbInfo) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-400" />
          <p className="text-sm font-mono text-white/40">Failed to load database information</p>
          <Button onClick={fetchDatabaseInfo} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message banner */}
      {message && (
        <div className={`p-4 rounded-lg border flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : message.type === 'error'
            ? 'bg-red-500/10 border-red-500/30 text-red-300'
            : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : message.type === 'error' ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <Info className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-mono">{message.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold font-mono flex items-center gap-2">
            <Database className="w-5 h-5 text-[#00d4aa]" />
            Database Manager
          </h2>
          <p className="text-xs font-mono text-white/40 mt-1">
            Monitor, backup, and manage your database
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDatabaseInfo} disabled={loading}>
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-[#00d4aa]" />
            Database Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded bg-white/[0.03] border border-white/[0.06]">
              <div className="text-[10px] font-mono text-white/40 uppercase mb-1">Integrity Check</div>
              <div className="flex items-center gap-2">
                {dbInfo.integrity.passed ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-mono text-emerald-400">Passed</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-mono text-red-400">Failed</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="p-3 rounded bg-white/[0.03] border border-white/[0.06]">
              <div className="text-[10px] font-mono text-white/40 uppercase mb-1">File Size</div>
              <div className="text-lg font-mono text-white/90">{dbInfo.stats.sizeFormatted}</div>
            </div>
            
            <div className="p-3 rounded bg-white/[0.03] border border-white/[0.06]">
              <div className="text-[10px] font-mono text-white/40 uppercase mb-1">Pages</div>
              <div className="text-lg font-mono text-white/90">{dbInfo.pageCount.toLocaleString()}</div>
            </div>
            
            <div className="p-3 rounded bg-white/[0.03] border border-white/[0.06]">
              <div className="text-[10px] font-mono text-white/40 uppercase mb-1">Last Modified</div>
              <div className="text-xs font-mono text-white/70">
                {dbInfo.stats.modified ? new Date(dbInfo.stats.modified).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-[10px] font-mono text-white/30">
            Path: {dbInfo.stats.path}
          </div>
        </CardContent>
      </Card>

      {/* Table Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs flex items-center gap-2">
            <Table className="w-3.5 h-3.5 text-[#00d4aa]" />
            Table Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tables.map(table => (
              <div key={table.name} className="p-3 rounded bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[10px] font-mono text-white/40 uppercase mb-1">{table.name}</div>
                <div className="text-lg font-mono text-white/90 tabular-nums">
                  {table.rowCount.toLocaleString()}
                </div>
                <div className="text-[10px] font-mono text-white/30">rows</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#00d4aa]" />
            Database Actions
          </CardTitle>
          <CardDescription>Backup, restore, and manage your database</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <ActionButton
              icon={Download}
              label="Backup"
              description="Create backup"
              onClick={handleBackup}
              loading={actionLoading === 'backup'}
              variant="primary"
            />
            <ActionButton
              icon={Archive}
              label="Download DB"
              description="Export file"
              onClick={handleDownload}
              loading={actionLoading === 'download'}
              variant="outline"
            />
            <ActionButton
              icon={Zap}
              label="Vacuum"
              description="Optimize"
              onClick={handleVacuum}
              loading={actionLoading === 'vacuum'}
              variant="outline"
            />
            <ActionButton
              icon={TestTube}
              label="Seed Data"
              description="Add mock data"
              onClick={handleSeed}
              loading={actionLoading === 'seed'}
              variant="outline"
            />
            <ActionButton
              icon={Trash2}
              label="Clear Data"
              description="Delete records"
              onClick={() => setShowClearDialog(true)}
              loading={false}
              variant="danger"
            />
          </div>
        </CardContent>
      </Card>

      {/* Backups */}
      {backups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xs flex items-center gap-2">
              <Archive className="w-3.5 h-3.5 text-[#00d4aa]" />
              Backups ({backups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {backups.map((backup, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Archive className="w-4 h-4 text-white/40" />
                    <div>
                      <div className="text-xs font-mono text-white/70">{backup.filename}</div>
                      <div className="text-[10px] font-mono text-white/40">
                        {backup.sizeFormatted} • {new Date(backup.modified).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRestore(backup.filename)}
                    disabled={actionLoading === 'restore'}
                  >
                    <Upload className="w-3 h-3" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clear Dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Clear Database
              </CardTitle>
              <CardDescription>
                This action cannot be undone. A backup will be created automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-mono text-white/60 block mb-2">Select tables to clear:</label>
                <div className="space-y-2">
                  {['services', 'emails', 'scan_runs', 'migration_history'].map(table => (
                    <label key={table} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={clearTables.includes(table)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setClearTables([...clearTables, table]);
                          } else {
                            setClearTables(clearTables.filter(t => t !== table));
                          }
                        }}
                        className="w-4 h-4 rounded border-white/20"
                      />
                      <span className="text-sm font-mono text-white/70">{table}</span>
                    </label>
                  ))}
                </div>
                {clearTables.length === 0 && (
                  <p className="text-[10px] font-mono text-amber-400 mt-2">
                    No tables selected - all tables will be cleared
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-mono text-white/60 block mb-2">
                  Type <span className="text-red-400 font-bold">CONFIRM</span> to proceed:
                </label>
                <input
                  type="text"
                  value={clearConfirm}
                  onChange={(e) => setClearConfirm(e.target.value)}
                  className="w-full h-9 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/90"
                  placeholder="CONFIRM"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowClearDialog(false);
                    setClearConfirm('');
                    setClearTables([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleClear}
                  disabled={clearConfirm !== 'CONFIRM' || actionLoading === 'clear'}
                >
                  {actionLoading === 'clear' ? 'Clearing...' : 'Clear Data'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Action Button Component
function ActionButton({ icon: Icon, label, description, onClick, loading, variant }: any) {
  const variants: Record<string, string> = {
    primary: 'bg-[#00d4aa]/20 border-[#00d4aa]/40 text-[#00d4aa] hover:bg-[#00d4aa]/30',
    outline: 'bg-white/[0.03] border-white/[0.06] text-white/70 hover:bg-white/[0.06] hover:text-white/90',
    danger: 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30',
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`p-4 rounded-lg border text-left transition-all disabled:opacity-50 ${variants[variant] || variants.outline}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        <span className="text-sm font-mono font-semibold">{label}</span>
      </div>
      <div className="text-[10px] font-mono opacity-60">{description}</div>
    </button>
  );
}
