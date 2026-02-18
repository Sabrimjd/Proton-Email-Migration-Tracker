'use client';

import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';
import {
  TrendingUp, Mail, Clock, CheckCircle, AlertCircle, Filter,
  Star, Briefcase, DollarSign, Heart, ShoppingBag, Plane,
  Newspaper, Building, Zap, Users, X, RefreshCw,
  Hash, Gamepad2, GraduationCap, Utensils, Code,
  Activity, Target, Radio, Inbox, Search, ArrowRight,
  Bug, Database, Settings, FileJson, FileSpreadsheet,
  CheckSquare, Square, Cpu, HardDrive, History, Info, Keyboard, Send, Eye, EyeOff
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { SchedulerStatus } from '@/components/SchedulerStatus';
import { ConfigManager } from '@/components/ConfigManager';
import { DatabaseManager } from '@/components/DatabaseManager';
import { OnboardingWizard } from '@/components/OnboardingWizard';

interface Service {
  id: number;
  name: string;
  domain: string;
  email_address: string;
  category: string;
  priority: string;
  status: string;
  emails_received: number;
  emails_sent: number;
  last_email_date: string;
  first_email_date: string;
  notes: string;
  old_email: string | null;
  new_email: string | null;
  migration_date: string | null;
}

interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  migrated: number;
  skipped: number;
  totalEmails: number;
  highPriority: number;
}

interface ChartData {
  categoryDistribution: any[];
  categoryProgress: any[];
  emailVolumeOverTime: any[];
  statusDistribution: any[];
}

interface DebugInfo {
  timestamp: string;
  database: {
    path: string;
    sizeBytes: number;
    sizeFormatted: string;
    lastModified: string;
    servicesCount: number;
    emailsCount: number;
    domainsCount: number;
  };
  scanHistory: any[];
  distribution: {
    status: any[];
    category: any[];
    priority: any[];
  };
  recentMigrated: any[];
  topSenders: any[];
  config: any;
}

interface CategoryDetail {
  name: string;
  count: number;
  pending: number;
  migrated: number;
  inProgress: number;
  skipped: number;
  totalEmails: number;
  services: any[];
}

const CATEGORY_ICONS: Record<string, any> = {
  social: Users,
  financial: DollarSign,
  work: Briefcase,
  shopping: ShoppingBag,
  health: Heart,
  travel: Plane,
  newsletters: Newspaper,
  government: Building,
  utilities: Zap,
  entertainment: Gamepad2,
  education: GraduationCap,
  food: Utensils,
  technology: Code,
  other: Mail,
};

const CATEGORY_COLORS: Record<string, string> = {
  social: '#8b5cf6',
  financial: '#ef4444',
  work: '#3b82f6',
  shopping: '#f59e0b',
  health: '#10b981',
  travel: '#06b6d4',
  newsletters: '#ec4899',
  government: '#6366f1',
  utilities: '#84cc16',
  entertainment: '#f97316',
  education: '#14b8a6',
  food: '#f43f5e',
  technology: '#7c3aed',
  other: '#52525b',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  social: 'Social media and communication platforms',
  financial: 'Banks, payments, investments, and insurance',
  work: 'Professional tools and job-related services',
  shopping: 'E-commerce and retail stores',
  health: 'Healthcare, medical, and wellness services',
  travel: 'Transportation, hotels, and travel booking',
  newsletters: 'Email subscriptions and updates',
  government: 'Government and official services',
  utilities: 'Internet, phone, electricity, and water',
  entertainment: 'Streaming, gaming, and media services',
  education: 'Learning platforms and educational services',
  food: 'Food delivery and restaurant services',
  technology: 'Developer tools and tech services',
  other: 'Uncategorized services',
};

const ALL_CATEGORIES = [
  'social', 'financial', 'work', 'shopping', 'health', 'travel',
  'newsletters', 'government', 'utilities', 'entertainment', 'education', 'food', 'technology', 'other'
];

export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0, pending: 0, inProgress: 0, migrated: 0, skipped: 0, totalEmails: 0, highPriority: 0
  });
  const [chartData, setChartData] = useState<ChartData>({
    categoryDistribution: [],
    categoryProgress: [],
    emailVolumeOverTime: [],
    statusDistribution: [],
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [recategorizing, setRecategorizing] = useState(false);

  // Bulk selection state
  const [selectedServices, setSelectedServices] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Debug state
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loadingDebug, setLoadingDebug] = useState(false);

  // Notes editing state
  const [editingNotes, setEditingNotes] = useState<string>('');

  // Scan state
  const [scanning, setScanning] = useState(false);

  // Dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryDetail | null>(null);
  const [categoryDetails, setCategoryDetails] = useState<CategoryDetail[]>([]);

  // Service detail dialog state
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceEmails, setServiceEmails] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  // Onboarding wizard state
  const [forceOpenWizard, setForceOpenWizard] = useState(false);

  useEffect(() => {
    fetchServices();
    fetchCategoryDetails();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      setServices(data.services);
      setStats(data.stats);
      setChartData({
        categoryDistribution: data.categoryDistribution || [],
        categoryProgress: data.categoryProgress || [],
        emailVolumeOverTime: data.emailVolumeOverTime || [],
        statusDistribution: data.statusDistribution || [],
      });
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryDetails = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategoryDetails(data.categories || []);
    } catch (error) {
      console.error('Error fetching category details:', error);
    }
  };

  const fetchDebugInfo = async () => {
    setLoadingDebug(true);
    try {
      const res = await fetch('/api/debug');
      const data = await res.json();
      setDebugInfo(data);
    } catch (error) {
      console.error('Error fetching debug info:', error);
    } finally {
      setLoadingDebug(false);
    }
  };

  const exportToJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      services: filteredServices,
      stats,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-migration-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Domain', 'Category', 'Priority', 'Status', 'Emails Received', 'Last Email'];
    const rows = filteredServices.map(s => [
      s.name,
      s.email_address,
      s.domain,
      s.category,
      s.priority,
      s.status,
      s.emails_received,
      s.last_email_date || '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-migration-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleServiceSelection = (id: number) => {
    const newSelected = new Set(selectedServices);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedServices(newSelected);
    setSelectAll(newSelected.size === filteredServices.length);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedServices(new Set());
      setSelectAll(false);
    } else {
      setSelectedServices(new Set(filteredServices.map(s => s.id)));
      setSelectAll(true);
    }
  };

  const bulkUpdateStatus = async (status: string) => {
    const updates = Array.from(selectedServices).map(id =>
      fetch(`/api/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    );
    await Promise.all(updates);
    setSelectedServices(new Set());
    setSelectAll(false);
    fetchServices();
    fetchCategoryDetails();
  };

  const bulkUpdateCategory = async (category: string) => {
    const updates = Array.from(selectedServices).map(id =>
      fetch('/api/recategorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recategorize_one', serviceId: id, newCategory: category }),
      })
    );
    await Promise.all(updates);
    setSelectedServices(new Set());
    setSelectAll(false);
    fetchServices();
    fetchCategoryDetails();
  };

  const updateNotes = async (id: number, notes: string) => {
    await fetch(`/api/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    fetchServices();
  };

  const triggerScan = async () => {
    const confirmed = confirm(
      'Start email scan now?\n\n' +
      'This will scan your inbox and update the database with new services and migration status.\n\n' +
      'The scan runs in the background and may take 1-2 minutes for large inboxes.'
    );
    
    if (!confirmed) return;

    setScanning(true);

    try {
      // Trigger the scan via API
      const response = await fetch('/api/scheduler/trigger', { method: 'POST' });
      const data = await response.json();

      if (data.status === 'triggered') {
        // Poll for completion
        let attempts = 0;
        const maxAttempts = 60; // 60 seconds max

        const pollInterval = setInterval(async () => {
          attempts++;
          
          // Check scheduler status
          const statusResponse = await fetch('/api/scheduler/status');
          const statusData = await statusResponse.json();

          if (!statusData.currentlyAnalyzing || attempts >= maxAttempts) {
            clearInterval(pollInterval);
            
            // Refresh data
            await Promise.all([fetchServices(), fetchCategoryDetails()]);
            if (activeTab === 'debug') {
              await fetchDebugInfo();
            }
            
            setScanning(false);

            if (attempts >= maxAttempts) {
              alert('⏱️ Scan is taking longer than expected.\n\nCheck the Automatic Scans card in the Debug tab for status.');
            } else if (statusData.lastRunResult?.errors?.length > 0) {
              // Show error details
              const errorMsg = statusData.lastRunResult.errors.join('\n');
              alert(
                '❌ Scan completed with errors:\n\n' +
                errorMsg +
                '\n\n' +
                (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('IMAP') 
                  ? 'Make sure Proton Bridge is running and accessible.' 
                  : 'Check the Debug tab for more details.')
              );
            } else if (statusData.lastRunResult?.status === 'failed') {
              alert(
                '❌ Scan failed.\n\n' +
                (statusData.lastError || 'Unknown error') +
                '\n\nCheck the Debug tab for more details.'
              );
            } else {
              const result = statusData.lastRunResult || {};
              alert(
                '✅ Scan complete!\n\n' +
                `📧 Emails scanned: ${result.emailsScanned || 0}\n` +
                `🏢 Services found: ${result.servicesFound || 0}\n` +
                `✔️ Migrated: ${result.servicesMigrated || 0}\n\n` +
                'Data has been refreshed.'
              );
            }
          }
        }, 1000); // Poll every second
      }
    } catch (error) {
      console.error('Failed to trigger scan:', error);
      alert('Failed to start scan. Check console for details.');
      setScanning(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      }
      if (e.key === '1' && e.altKey) { setActiveTab('overview'); }
      if (e.key === '2' && e.altKey) { setActiveTab('services'); }
      if (e.key === '3' && e.altKey) { setActiveTab('debug'); }
      if (e.key === '4' && e.altKey) { setActiveTab('help'); }
      if (e.key === 'Escape') {
        setServiceDialogOpen(false);
        setCategoryDialogOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch debug info when tab changes to debug
  useEffect(() => {
    if (activeTab === 'debug') {
      fetchDebugInfo();
    }
  }, [activeTab]);

  const updateService = async (id: number, updates: any) => {
    try {
      await fetch(`/api/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      fetchServices();
      fetchCategoryDetails();
    } catch (error) {
      console.error('Error updating service:', error);
    }
  };

  const recategorizeAll = async () => {
    setRecategorizing(true);
    try {
      const res = await fetch('/api/recategorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recategorize_all' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchServices();
        fetchCategoryDetails();
      }
    } catch (error) {
      console.error('Error re-categorizing:', error);
    } finally {
      setRecategorizing(false);
    }
  };

  const changeServiceCategory = async (serviceId: number, newCategory: string) => {
    try {
      await fetch('/api/recategorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recategorize_one', serviceId, newCategory }),
      });
      fetchServices();
      fetchCategoryDetails();
      if (selectedCategory) {
        const updatedDetails = categoryDetails.map(cat => {
          if (cat.name === selectedCategory.name) {
            return {
              ...cat,
              services: cat.services.filter((s: any) => s.id !== serviceId),
              count: cat.count - 1,
            };
          }
          return cat;
        });
        setCategoryDetails(updatedDetails);
        setSelectedCategory(updatedDetails.find(c => c.name === selectedCategory.name) || null);
      }
    } catch (error) {
      console.error('Error changing category:', error);
    }
  };

  const filteredServices = services.filter((service) => {
    if (statusFilter !== 'all' && service.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && service.category !== categoryFilter) return false;
    if (priorityFilter !== 'all' && service.priority !== priorityFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = service.name.toLowerCase().includes(query);
      const matchesEmail = service.email_address.toLowerCase().includes(query);
      const matchesDomain = service.domain.toLowerCase().includes(query);
      if (!matchesName && !matchesEmail && !matchesDomain) return false;
    }
    return true;
  });

  const categories = [...new Set(services.map(s => s.category))].filter(Boolean);
  const otherCount = services.filter(s => s.category === 'other').length;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const formatRelativeDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    // For older dates, show the actual date instead of vague "Xmo ago"
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "success" | "warning" | "info" | "danger" | "high" | "medium" | "low"> = {
      pending: 'warning',
      in_progress: 'info',
      migrated: 'success',
      skipped: 'secondary',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "high" | "medium" | "low"> = {
      high: 'high',
      medium: 'medium',
      low: 'low',
    };
    return (
      <Badge variant={variants[priority] || 'low'}>
        {priority === 'high' && <Star className="w-3 h-3" />}
        {priority}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    const Icon = CATEGORY_ICONS[category] || Mail;
    return <Icon className="w-3.5 h-3.5" style={{ color: CATEGORY_COLORS[category] || CATEGORY_COLORS.other }} />;
  };

  const openCategoryDialog = (categoryName: string) => {
    const detail = categoryDetails.find(c => c.name === categoryName);
    if (detail) {
      setSelectedCategory(detail);
      setCategoryDialogOpen(true);
    }
  };

  const openServiceDialog = async (service: Service) => {
    setSelectedService(service);
    setEditingNotes(service.notes || '');
    setServiceDialogOpen(true);
    setLoadingEmails(true);
    setServiceEmails([]);

    try {
      const res = await fetch(`/api/services/${service.id}/emails`);
      const data = await res.json();
      setServiceEmails(data.emails || []);
    } catch (error) {
      console.error('Error fetching service emails:', error);
    } finally {
      setLoadingEmails(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-[#00d4aa]/30 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-[#00d4aa]/50 animate-pulse" />
            <Activity className="absolute inset-4 w-8 h-8 text-[#00d4aa] animate-pulse" />
          </div>
          <p className="text-white/40 font-mono text-sm">INITIALIZING SYSTEM...</p>
        </div>
      </div>
    );
  }

  const progressPercentage = stats.total > 0 ? Math.round((stats.migrated / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen relative">
      <OnboardingWizard 
        forceOpen={forceOpenWizard}
        onDone={() => { 
          setForceOpenWizard(false);
          fetchServices(); 
          fetchCategoryDetails(); 
        }} 
      />
      {/* Top status bar */}
      <div className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0b0f]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00d4aa] animate-pulse" />
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">System Online</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-[10px] font-mono text-white/40">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-white/40">
              <span className="text-[#00d4aa]">{stats.migrated}</span>/{stats.total} migrated
            </span>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-[10px] font-mono">
              <span className="text-[#00d4aa]">{progressPercentage}%</span>
              <span className="text-white/40 ml-1">complete</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <Radio className="w-5 h-5 text-[#00d4aa]" />
                <div className="absolute inset-0 rounded-full bg-[#00d4aa]/20 animate-ping" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-mono">
                MIGRATION<span className="text-[#00d4aa]">_</span>CONTROL
              </h1>
            </div>
            <p className="text-white/40 text-sm font-mono">
              Gmail → ProtonMail Migration Tracking System
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="default"
              size="sm"
              onClick={triggerScan}
              disabled={scanning}
            >
              <RefreshCw className={`w-3 h-3 ${scanning ? 'animate-spin' : ''}`} />
              {scanning ? 'Scanning...' : 'Scan Emails'}
            </Button>
            {otherCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={recategorizeAll}
                disabled={recategorizing}
              >
                <RefreshCw className={`w-3 h-3 ${recategorizing ? 'animate-spin' : ''}`} />
                Re-categorize
                <span className="text-white/40">({otherCount})</span>
              </Button>
            )}
          </div>
        </div>

        {/* Main Progress */}
        <Card glow className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-[#00d4aa]" />
                  <div>
                    <h2 className="text-sm font-mono font-semibold uppercase text-white/90">Mission Progress</h2>
                    <p className="text-xs text-white/40 font-mono">{stats.migrated} of {stats.total} services migrated</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold font-mono text-[#00d4aa] tabular-nums">
                    {progressPercentage}<span className="text-lg text-white/40">%</span>
                  </div>
                </div>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill bg-gradient-to-r from-[#00d4aa] to-emerald-400"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[10px] font-mono text-white/30">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            icon={<Mail className="w-4 h-4" />}
            label="Total"
            value={stats.total}
            color="#00d4aa"
          />
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            label="Pending"
            value={stats.pending}
            color="#fbbf24"
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="In Progress"
            value={stats.inProgress}
            color="#3b82f6"
          />
          <StatCard
            icon={<CheckCircle className="w-4 h-4" />}
            label="Migrated"
            value={stats.migrated}
            color="#10b981"
          />
          <StatCard
            icon={<AlertCircle className="w-4 h-4" />}
            label="High Priority"
            value={stats.highPriority}
            color="#ef4444"
          />
          <StatCard
            icon={<Hash className="w-4 h-4" />}
            label="Total Emails"
            value={stats.totalEmails.toLocaleString()}
            color="#8b5cf6"
          />
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-[#00d4aa]" />
              Filter Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                id="search-input"
                type="text"
                placeholder="Search services by name, email, or domain... (/)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-10 pr-4 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/90 placeholder:text-white/30 focus:outline-none focus:border-[#00d4aa]/50 focus:bg-white/[0.05] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterChip active={priorityFilter === 'all'} onClick={() => setPriorityFilter('all')}>All Priority</FilterChip>
              <FilterChip active={priorityFilter === 'high'} onClick={() => setPriorityFilter('high')}>
                <Star className="w-3 h-3 text-red-400" /> Critical
              </FilterChip>
              <FilterChip active={priorityFilter === 'medium'} onClick={() => setPriorityFilter('medium')}>Medium</FilterChip>
              <FilterChip active={priorityFilter === 'low'} onClick={() => setPriorityFilter('low')}>Low</FilterChip>
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All Status</FilterChip>
              <FilterChip active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')}>Pending</FilterChip>
              <FilterChip active={statusFilter === 'in_progress'} onClick={() => setStatusFilter('in_progress')}>In Progress</FilterChip>
              <FilterChip active={statusFilter === 'migrated'} onClick={() => setStatusFilter('migrated')}>Migrated</FilterChip>
              <FilterChip active={statusFilter === 'skipped'} onClick={() => setStatusFilter('skipped')}>Skipped</FilterChip>
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterChip active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>All Categories</FilterChip>
              {categories.map(cat => (
                <FilterChip
                  key={cat}
                  active={categoryFilter === cat}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {getCategoryIcon(cat)}
                  <span className="capitalize">{cat}</span>
                </FilterChip>
              ))}
            </div>
            {(statusFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
              <div className="pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setCategoryFilter('all');
                    setPriorityFilter('all');
                    setSearchQuery('');
                  }}
                >
                  <X className="w-3 h-3" />
                  Clear All Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="services">Services ({filteredServices.length})</TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="w-3 h-3 mr-1" />
              Config
            </TabsTrigger>
            <TabsTrigger value="database">
              <Database className="w-3 h-3 mr-1" />
              Database
            </TabsTrigger>
            <TabsTrigger value="debug">
              <Bug className="w-3 h-3 mr-1" />
              Debug
            </TabsTrigger>
            <TabsTrigger value="help">Help</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Category Cards */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Hash className="w-4 h-4 text-[#00d4aa]" />
                <h3 className="text-sm font-mono font-semibold uppercase text-white/90">Categories</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {categoryDetails.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.name] || Mail;
                  const color = CATEGORY_COLORS[cat.name] || CATEGORY_COLORS.other;
                  const progress = cat.count > 0 ? Math.round((cat.migrated / cat.count) * 100) : 0;

                  return (
                    <button
                      key={cat.name}
                      onClick={() => openCategoryDialog(cat.name)}
                      className="group text-left p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4" style={{ color }} />
                        <span className="text-xs font-mono uppercase tracking-wide text-white/70 group-hover:text-white/90 transition-colors capitalize">{cat.name}</span>
                      </div>
                      <div className="text-2xl font-bold font-mono tabular-nums text-white/90">{cat.count}</div>
                      <div className="text-[10px] font-mono text-white/30 mb-2">{cat.totalEmails} emails</div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progress}%`, backgroundColor: color }} />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-white/30 mt-1">
                        <span>{cat.migrated} done</span>
                        <span>{cat.pending} pending</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Status Distribution" description="Migration status breakdown">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                        outerRadius={70}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111317', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Category Distribution" description="Services by category">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.categoryDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                        outerRadius={70}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.categoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name.toLowerCase()] || CATEGORY_COLORS.other} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111317', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Progress by Category" description="Migrated vs pending">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.categoryProgress} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                      <YAxis dataKey="name" type="category" width={80} stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#111317', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                      <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: 10 }} />
                      <Bar dataKey="migrated" name="Migrated" fill="#10b981" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="pending" name="Pending" fill="#fbbf24" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              <ChartCard title="Email Volume" description="Activity over time">
                <div className="h-[250px]">
                  {chartData.emailVolumeOverTime.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData.emailVolumeOverTime}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                        <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#111317', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                        <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: 10 }} />
                        <Line type="monotone" dataKey="emails" name="Emails" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="services" name="Services" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-white/30">
                      <div className="text-center">
                        <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs font-mono">No data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </ChartCard>
            </div>
          </TabsContent>

          <TabsContent value="services">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CardTitle>Services ({filteredServices.length})</CardTitle>
                    {selectedServices.size > 0 && (
                      <Badge variant="info">{selectedServices.size} selected</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Export buttons */}
                    <Button variant="outline" size="sm" onClick={exportToCSV}>
                      <FileSpreadsheet className="w-3 h-3" />
                      CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToJSON}>
                      <FileJson className="w-3 h-3" />
                      JSON
                    </Button>
                    {(statusFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all' || searchQuery) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStatusFilter('all');
                          setCategoryFilter('all');
                          setPriorityFilter('all');
                          setSearchQuery('');
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
                {/* Bulk actions bar */}
                {selectedServices.size > 0 && (
                  <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06] mt-3">
                    <span className="text-xs font-mono text-white/40">Bulk actions:</span>
                    <Button size="sm" variant="success" onClick={() => bulkUpdateStatus('migrated')}>
                      <CheckCircle className="w-3 h-3" />
                      Mark Migrated
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus('pending')}>
                      Mark Pending
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => bulkUpdateStatus('skipped')}>
                      Skip
                    </Button>
                    <select
                      className="h-7 text-[10px] font-mono bg-white/5 border border-white/10 rounded px-2 text-white/70"
                      onChange={(e) => e.target.value && bulkUpdateCategory(e.target.value)}
                      defaultValue=""
                    >
                      <option value="" className="bg-[#111317]">Change category...</option>
                      {ALL_CATEGORIES.map(cat => (
                        <option key={cat} value={cat} className="bg-[#111317]">{cat}</option>
                      ))}
                    </select>
                    <Button size="sm" variant="ghost" onClick={() => { setSelectedServices(new Set()); setSelectAll(false); }}>
                      <X className="w-3 h-3" />
                      Clear
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {filteredServices.length === 0 ? (
                  <div className="text-center py-12 text-white/40">
                    <Mail className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-mono">No services found</p>
                  </div>
                ) : (
                  <>
                    {/* Select all checkbox */}
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 text-[10px] font-mono text-white/40 hover:text-white/60"
                      >
                        {selectAll ? (
                          <CheckSquare className="w-4 h-4 text-[#00d4aa]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                        Select all ({filteredServices.length})
                      </button>
                    </div>
                    <div className="space-y-1">
                      {filteredServices.map((service) => (
                        <div
                          key={service.id}
                          className={`flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                            selectedServices.has(service.id)
                              ? 'border-[#00d4aa]/30 bg-[#00d4aa]/5'
                              : 'border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.08]'
                          }`}
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleServiceSelection(service.id); }}
                              className="mt-0.5 flex-shrink-0"
                            >
                              {selectedServices.has(service.id) ? (
                                <CheckSquare className="w-4 h-4 text-[#00d4aa]" />
                              ) : (
                                <Square className="w-4 h-4 text-white/30 hover:text-white/50" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0" onClick={() => openServiceDialog(service)}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm text-white/90">{service.name}</span>
                                {getStatusBadge(service.status)}
                                {getPriorityBadge(service.priority)}
                                <div className="flex items-center gap-1">
                                  {getCategoryIcon(service.category)}
                                  <Badge variant="outline">{service.category}</Badge>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 mt-1.5 text-[10px] font-mono text-white/40">
                                <span>{service.email_address}</span>
                                <span className="flex items-center gap-1">
                                  <Inbox className="w-3 h-3" />
                                  {service.emails_received} emails
                                </span>
                                <span>{formatRelativeDate(service.last_email_date)}</span>
                                {service.notes && (
                                  <span className="text-amber-400/60">Has notes</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            {service.status === 'pending' && (
                              <Button size="sm" onClick={() => updateService(service.id, { status: 'in_progress' })}>
                                Start
                              </Button>
                            )}
                            {service.status === 'in_progress' && (
                              <>
                                <Button size="sm" variant="success" onClick={() => updateService(service.id, { status: 'migrated' })}>
                                  Complete
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => updateService(service.id, { status: 'skipped' })}>
                                  Skip
                                </Button>
                              </>
                            )}
                            {(service.status === 'migrated' || service.status === 'skipped') && (
                              <Button size="sm" variant="ghost" onClick={() => updateService(service.id, { status: 'pending' })}>
                                Reset
                              </Button>
                            )}
                            <select
                              className="h-7 text-[10px] font-mono bg-white/5 border border-white/10 rounded px-2 text-white/70 focus:outline-none focus:border-[#00d4aa]/50"
                              value={service.category}
                              onChange={(e) => changeServiceCategory(service.id, e.target.value)}
                            >
                              {ALL_CATEGORIES.map(cat => (
                                <option key={cat} value={cat} className="bg-[#111317]">{cat}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config">
            <ConfigManager onRerunSetup={() => setForceOpenWizard(true)} />
          </TabsContent>

          <TabsContent value="database">
            <DatabaseManager />
          </TabsContent>

          <TabsContent value="debug">
            <div className="space-y-4">
              {/* Scheduler Status */}
              <SchedulerStatus />

              {loadingDebug ? (
                <div className="text-center py-12 text-white/40">
                  <div className="w-8 h-8 border-2 border-[#00d4aa]/30 border-t-[#00d4aa] rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm font-mono">Loading debug info...</p>
                </div>
              ) : debugInfo ? (
                <>
                  {/* System Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xs">
                        <Cpu className="w-3.5 h-3.5 text-[#00d4aa]" />
                        System Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 rounded bg-white/[0.03] border border-white/[0.06]">
                          <div className="text-[10px] font-mono text-white/40 uppercase mb-1">Database Size</div>
                          <div className="text-lg font-mono text-white/90">{debugInfo.database.sizeFormatted}</div>
                        </div>
                        <div className="p-3 rounded bg-white/[0.03] border border-white/[0.06]">
                          <div className="text-[10px] font-mono text-white/40 uppercase mb-1">Services</div>
                          <div className="text-lg font-mono text-white/90">{debugInfo.database.servicesCount}</div>
                        </div>
                        <div className="p-3 rounded bg-white/[0.03] border border-white/[0.06]">
                          <div className="text-[10px] font-mono text-white/40 uppercase mb-1">Emails</div>
                          <div className="text-lg font-mono text-white/90">{debugInfo.database.emailsCount}</div>
                        </div>
                        <div className="p-3 rounded bg-white/[0.03] border border-white/[0.06]">
                          <div className="text-[10px] font-mono text-white/40 uppercase mb-1">Unique Domains</div>
                          <div className="text-lg font-mono text-white/90">{debugInfo.database.domainsCount}</div>
                        </div>
                      </div>
                      <div className="mt-4 text-[10px] font-mono text-white/30">
                        <div>DB Path: {debugInfo.database.path}</div>
                        <div>Last Modified: {debugInfo.database.lastModified ? new Date(debugInfo.database.lastModified).toLocaleString() : 'N/A'}</div>
                        <div>Query Time: {debugInfo.timestamp}</div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Configuration */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xs">
                        <Settings className="w-3.5 h-3.5 text-[#00d4aa]" />
                        Configuration ({debugInfo.config.source})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-[11px] font-mono">
                        {debugInfo.config.emails && (
                          <div>
                            <div className="text-white/50 mb-1">Emails:</div>
                            <div className="bg-white/[0.02] p-2 rounded border border-white/[0.04] text-white/70 overflow-x-auto">
                              <pre>{JSON.stringify(debugInfo.config.emails, null, 2)}</pre>
                            </div>
                          </div>
                        )}
                        {debugInfo.config.dashboard && (
                          <div>
                            <div className="text-white/50 mb-1">Dashboard:</div>
                            <div className="bg-white/[0.02] p-2 rounded border border-white/[0.04] text-white/70 overflow-x-auto">
                              <pre>{JSON.stringify(debugInfo.config.dashboard, null, 2)}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Scan History */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xs">
                        <History className="w-3.5 h-3.5 text-[#00d4aa]" />
                        Scan History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {debugInfo.scanHistory.length === 0 ? (
                          <p className="text-xs font-mono text-white/40">No scan history</p>
                        ) : (
                          debugInfo.scanHistory.map((run: any) => (
                            <div key={run.id} className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                              <div className="text-[11px] font-mono text-white/70">
                                {new Date(run.run_at).toLocaleString()}
                              </div>
                              <div className="flex items-center gap-4 text-[10px] font-mono text-white/40">
                                <span>{run.emails_scanned} emails</span>
                                <span>{run.services_found} services</span>
                                <Badge variant={run.status === 'completed' ? 'success' : 'warning'}>
                                  {run.status}
                                </Badge>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Distribution Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs">Status Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          {debugInfo.distribution.status.map((s: any) => (
                            <div key={s.status} className="flex justify-between text-[11px] font-mono">
                              <span className="text-white/60 capitalize">{s.status.replace('_', ' ')}</span>
                              <span className="text-white/90">{s.count}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs">Priority Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          {debugInfo.distribution.priority.map((p: any) => (
                            <div key={p.priority} className="flex justify-between text-[11px] font-mono">
                              <span className="text-white/60 capitalize">{p.priority}</span>
                              <span className="text-white/90">{p.count}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs">Top Categories</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          {debugInfo.distribution.category.slice(0, 5).map((c: any) => (
                            <div key={c.category} className="flex justify-between text-[11px] font-mono">
                              <span className="text-white/60 capitalize">{c.category}</span>
                              <span className="text-white/90">{c.count}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Migrated */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xs">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        Recently Migrated
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {debugInfo.recentMigrated.length === 0 ? (
                          <p className="text-xs font-mono text-white/40">No migrated services yet</p>
                        ) : (
                          debugInfo.recentMigrated.map((s: any) => (
                            <div key={s.email_address} className="p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                              <div className="flex items-center justify-between">
                                <div className="text-[11px] font-mono text-white/90">{s.name}</div>
                                <div className="text-[10px] font-mono text-white/40">{s.migration_date ? new Date(s.migration_date).toLocaleDateString() : ''}</div>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 mt-1">
                                <span>{s.old_email}</span>
                                <ArrowRight className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">{s.new_email}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Senders */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xs">
                        <Mail className="w-3.5 h-3.5 text-[#00d4aa]" />
                        Top Email Senders
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {debugInfo.topSenders.slice(0, 10).map((s: any, i: number) => (
                          <div key={s.sender_email} className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-white/30 w-4">{i + 1}</span>
                              <span className="text-[11px] font-mono text-white/70">{s.sender_email}</span>
                            </div>
                            <span className="text-[10px] font-mono text-white/40">{s.count} emails</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Keyboard Shortcuts */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xs">
                        <Keyboard className="w-3.5 h-3.5 text-[#00d4aa]" />
                        Keyboard Shortcuts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] font-mono">
                        <div className="flex justify-between p-2 rounded bg-white/[0.02]">
                          <span className="text-white/60">Search</span>
                          <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80">/</kbd>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-white/[0.02]">
                          <span className="text-white/60">Overview</span>
                          <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80">Alt+1</kbd>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-white/[0.02]">
                          <span className="text-white/60">Services</span>
                          <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80">Alt+2</kbd>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-white/[0.02]">
                          <span className="text-white/60">Debug</span>
                          <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80">Alt+3</kbd>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-white/[0.02]">
                          <span className="text-white/60">Help</span>
                          <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80">Alt+4</kbd>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-white/[0.02]">
                          <span className="text-white/60">Close dialog</span>
                          <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80">Esc</kbd>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-12 text-white/40">
                  <Bug className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-mono">No debug info available</p>
                  <Button variant="outline" size="sm" onClick={fetchDebugInfo} className="mt-3">
                    Refresh
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="help">
            <Card>
              <CardHeader>
                <CardTitle>System Guide</CardTitle>
                <CardDescription>How to use the Migration Control system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { step: 1, title: 'Scan Emails', desc: 'Click "Scan Emails" button or use automatic scans to discover services' },
                    { step: 2, title: 'Review & Prioritize', desc: 'High priority services (banks, government) are auto-flagged' },
                    { step: 3, title: 'Re-categorize', desc: 'Use the button or dropdowns to fix category assignments' },
                    { step: 4, title: 'Migrate', desc: 'Click Start → Complete as you update each service' },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4 items-start">
                      <div className="w-6 h-6 rounded-full bg-[#00d4aa]/20 text-[#00d4aa] flex items-center justify-center text-xs font-mono font-bold flex-shrink-0">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="text-sm font-mono font-semibold text-white/90">{item.title}</h4>
                        <p className="text-xs text-white/40 font-mono">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/[0.06] pt-4 mt-4">
                  <h4 className="text-xs font-mono font-semibold text-white/90 uppercase mb-3">Category Reference</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(CATEGORY_DESCRIPTIONS).map(([cat, desc]) => {
                      const Icon = CATEGORY_ICONS[cat] || Mail;
                      const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS.other;
                      return (
                        <div key={cat} className="p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon className="w-3 h-3" style={{ color }} />
                            <span className="text-[10px] font-mono uppercase text-white/70 capitalize">{cat}</span>
                          </div>
                          <p className="text-[10px] text-white/30">{desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCategory && getCategoryIcon(selectedCategory.name)}
              <span className="capitalize">{selectedCategory?.name}</span>
              <Badge variant="outline">{selectedCategory?.count} services</Badge>
            </DialogTitle>
            <DialogDescription>
              {selectedCategory && CATEGORY_DESCRIPTIONS[selectedCategory.name]}
            </DialogDescription>
          </DialogHeader>

          {selectedCategory && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                <div className="p-3 rounded bg-white/[0.03] border border-white/[0.06] text-center">
                  <div className="text-xl font-bold font-mono text-amber-400">{selectedCategory.pending}</div>
                  <div className="text-[10px] font-mono text-white/40 uppercase">Pending</div>
                </div>
                <div className="p-3 rounded bg-white/[0.03] border border-white/[0.06] text-center">
                  <div className="text-xl font-bold font-mono text-blue-400">{selectedCategory.inProgress}</div>
                  <div className="text-[10px] font-mono text-white/40 uppercase">In Progress</div>
                </div>
                <div className="p-3 rounded bg-white/[0.03] border border-white/[0.06] text-center">
                  <div className="text-xl font-bold font-mono text-emerald-400">{selectedCategory.migrated}</div>
                  <div className="text-[10px] font-mono text-white/40 uppercase">Migrated</div>
                </div>
                <div className="p-3 rounded bg-white/[0.03] border border-white/[0.06] text-center">
                  <div className="text-xl font-bold font-mono text-white/70">{selectedCategory.totalEmails}</div>
                  <div className="text-[10px] font-mono text-white/40 uppercase">Emails</div>
                </div>
              </div>

              <div className="space-y-1">
                {selectedCategory.services.slice(0, 10).map((service: any) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-2 rounded bg-white/[0.02] border border-white/[0.04]"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-white/80 truncate">{service.name}</span>
                        {getStatusBadge(service.status)}
                        {service.priority === 'high' && <Badge variant="high">!</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[10px] font-mono text-white/30">
                        <span>{service.emails_received} emails</span>
                        <span>{formatRelativeDate(service.last_email_date)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {service.status === 'pending' && (
                        <Button size="sm" onClick={() => updateService(service.id, { status: 'in_progress' })}>Start</Button>
                      )}
                      {service.status === 'in_progress' && (
                        <Button size="sm" variant="success" onClick={() => updateService(service.id, { status: 'migrated' })}>Done</Button>
                      )}
                      <select
                        className="h-6 text-[10px] font-mono bg-white/5 border border-white/10 rounded px-1.5 text-white/60"
                        value={selectedCategory.name}
                        onChange={(e) => changeServiceCategory(service.id, e.target.value)}
                      >
                        {ALL_CATEGORIES.map(cat => (
                          <option key={cat} value={cat} className="bg-[#111317]">{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                {selectedCategory.services.length > 10 && (
                  <p className="text-[10px] font-mono text-white/30 text-center py-2">
                    +{selectedCategory.services.length - 10} more services
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Service Detail Dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="max-w-3xl w-full max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {selectedService && getCategoryIcon(selectedService.category)}
              <span className="truncate">{selectedService?.name}</span>
              {selectedService && getStatusBadge(selectedService.status)}
            </DialogTitle>
            <DialogDescription className="truncate">
              {selectedService?.email_address}
            </DialogDescription>
          </DialogHeader>

          {selectedService && (
            <div className="space-y-4 min-w-0">
              {/* Service Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded bg-white/[0.03] border border-white/[0.06] text-center">
                  <div className="text-xl font-bold font-mono text-[#00d4aa]">{selectedService.emails_received}</div>
                  <div className="text-[10px] font-mono text-white/40 uppercase">Received</div>
                </div>
                <div className="p-3 rounded bg-white/[0.03] border border-white/[0.06] text-center">
                  <div className="text-xl font-bold font-mono text-white/70">{selectedService.emails_sent || 0}</div>
                  <div className="text-[10px] font-mono text-white/40 uppercase">Sent</div>
                </div>
                <div className="p-3 rounded bg-white/[0.03] border border-white/[0.06] text-center">
                  <div className="text-xl font-bold font-mono text-white/70">{formatRelativeDate(selectedService.last_email_date)}</div>
                  <div className="text-[10px] font-mono text-white/40 uppercase">Last Active</div>
                </div>
              </div>

              {/* Service Info */}
              <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.03] border border-white/[0.06]">
                  {getCategoryIcon(selectedService.category)}
                  <span className="text-white/60 capitalize">{selectedService.category}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.03] border border-white/[0.06]">
                  <Star className="w-3 h-3" style={{ color: selectedService.priority === 'high' ? '#ef4444' : selectedService.priority === 'medium' ? '#f59e0b' : '#6b7280' }} />
                  <span className="text-white/60 capitalize">{selectedService.priority} priority</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.03] border border-white/[0.06]">
                  <span className="text-white/40">Domain:</span>
                  <span className="text-white/70">{selectedService.domain}</span>
                </div>
              </div>

              {/* Migration Info */}
              {selectedService.status === 'migrated' && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono font-semibold text-emerald-400 uppercase">Migrated</span>
                    {selectedService.migration_date && (
                      <span className="text-[10px] font-mono text-white/40">
                        {formatRelativeDate(selectedService.migration_date)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/40">From:</span>
                      <span className="text-white/70">{selectedService.old_email || 'unknown'}</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-emerald-400" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/40">To:</span>
                      <span className="text-emerald-400">{selectedService.new_email || 'unknown'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-[#00d4aa]" />
                  <h4 className="text-sm font-mono font-semibold uppercase text-white/90">Notes</h4>
                </div>
                <textarea
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  onBlur={() => updateNotes(selectedService.id, editingNotes)}
                  placeholder="Add notes about this service..."
                  className="w-full h-20 p-2 text-[11px] font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/90 placeholder:text-white/30 focus:outline-none focus:border-[#00d4aa]/50 resize-none"
                />
                <div className="text-[10px] font-mono text-white/30 mt-1">Changes saved automatically on blur</div>
              </div>

              {/* Recent Emails */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Inbox className="w-4 h-4 text-[#00d4aa]" />
                  <h4 className="text-sm font-mono font-semibold uppercase text-white/90">Recent Emails</h4>
                </div>

                {loadingEmails ? (
                  <div className="text-center py-8 text-white/40">
                    <div className="w-6 h-6 border-2 border-[#00d4aa]/30 border-t-[#00d4aa] rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs font-mono">Loading emails...</p>
                  </div>
                ) : serviceEmails.length === 0 ? (
                  <div className="text-center py-8 text-white/30 border border-dashed border-white/10 rounded-lg">
                    <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-mono">No email data available</p>
                    <p className="text-[10px] text-white/20 mt-1">Use "Scan Emails" button to fetch metadata</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {serviceEmails.map((email) => (
                      <div
                        key={email.id}
                        className="p-3 rounded bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors overflow-hidden"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-2 mb-1 min-w-0">
                              {email.is_read ? (
                                <EyeOff className="w-3 h-3 text-white/30 flex-shrink-0" />
                              ) : (
                                <Eye className="w-3 h-3 text-[#00d4aa] flex-shrink-0" />
                              )}
                              <span className="text-sm font-mono text-white/80 truncate">
                                {email.subject || '(No Subject)'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-white/40">
                              <span className="flex items-center gap-1 truncate max-w-[200px]">
                                <Send className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{email.sender || email.sender_email}</span>
                              </span>
                              <span className="flex items-center gap-1 truncate max-w-[200px]">
                                <Inbox className="w-3 h-3 flex-shrink-0" />
                                <span className="text-[#00d4aa]/70 truncate">{email.recipient_email || 'Unknown'}</span>
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[10px] font-mono text-white/50 whitespace-nowrap">
                              {email.received_at_relative}
                            </div>
                            <div className="text-[10px] font-mono text-white/30 whitespace-nowrap">
                              {email.received_at_formatted}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                {selectedService.status === 'pending' && (
                  <Button size="sm" onClick={() => {
                    updateService(selectedService.id, { status: 'in_progress' });
                  }}>
                    Start Migration
                  </Button>
                )}
                {selectedService.status === 'in_progress' && (
                  <>
                    <Button size="sm" variant="success" onClick={() => {
                      updateService(selectedService.id, { status: 'migrated' });
                      setServiceDialogOpen(false);
                    }}>
                      Mark Complete
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      updateService(selectedService.id, { status: 'skipped' });
                      setServiceDialogOpen(false);
                    }}>
                      Skip
                    </Button>
                  </>
                )}
                {(selectedService.status === 'migrated' || selectedService.status === 'skipped') && (
                  <Button size="sm" variant="ghost" onClick={() => {
                    updateService(selectedService.id, { status: 'pending' });
                  }}>
                    Reset
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper Components
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <Card className="group interactive-card">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2" style={{ color }}>
          {icon}
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">{label}</span>
        </div>
        <div className="text-2xl font-bold font-mono tabular-nums text-white/90">{value}</div>
      </CardContent>
    </Card>
  );
}

function FilterChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-all ${
        active
          ? 'bg-[#00d4aa]/20 text-[#00d4aa] border border-[#00d4aa]/30'
          : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70'
      }`}
    >
      {children}
    </button>
  );
}

function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
