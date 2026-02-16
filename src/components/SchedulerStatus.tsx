'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';

interface SchedulerStatus {
  enabled: boolean;
  schedule: string;
  isRunning: boolean;
  currentlyAnalyzing: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastRunResult: {
    emailsScanned?: number;
    servicesFound?: number;
    servicesMigrated?: number;
    status?: string;
    error?: string;
  } | null;
  lastError: string | null;
}

export function SchedulerStatus() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/scheduler/status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch scheduler status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const triggerAnalysis = async () => {
    setTriggering(true);
    try {
      const response = await fetch('/api/scheduler/trigger', { method: 'POST' });
      const data = await response.json();
      
      if (data.status === 'triggered') {
        // Refresh status after a moment
        setTimeout(fetchStatus, 1000);
      }
    } catch (error) {
      console.error('Failed to trigger analysis:', error);
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Automatic Scans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(Math.abs(diffMs) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) {
      // Past
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } else {
      // Future
      if (diffMins < 60) return `in ${diffMins}m`;
      if (diffHours < 24) return `in ${diffHours}h`;
      return `in ${diffDays}d`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <CardTitle>Automatic Scans</CardTitle>
          </div>
          <Badge variant={status.enabled ? 'default' : 'secondary'}>
            {status.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
        <CardDescription>
          Scheduled: {status.schedule}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status indicators */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Last Scan</p>
            <p className="text-lg font-semibold">
              {formatRelativeTime(status.lastRunAt)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Next Scan</p>
            <p className="text-lg font-semibold">
              {status.enabled ? formatRelativeTime(status.nextRunAt) : 'Disabled'}
            </p>
          </div>
        </div>

        {/* Last run result */}
        {status.lastRunResult && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2">
              {status.lastRunResult.status === 'completed' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : status.lastRunResult.status === 'failed' ? (
                <XCircle className="w-4 h-4 text-red-500" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              <span className="text-sm font-medium">
                Last run: {status.lastRunResult.status || 'Running'}
              </span>
            </div>
            
            {status.lastRunResult.emailsScanned !== undefined && (
              <div className="text-sm text-muted-foreground">
                Scanned {status.lastRunResult.emailsScanned} emails, 
                found {status.lastRunResult.servicesFound} services
                {status.lastRunResult.servicesMigrated ? `, ${status.lastRunResult.servicesMigrated} migrated` : ''}
              </div>
            )}

            {status.lastRunResult.error && (
              <div className="text-sm text-red-500">
                Error: {status.lastRunResult.error}
              </div>
            )}
          </div>
        )}

        {/* Manual trigger */}
        <Button
          onClick={triggerAnalysis}
          disabled={triggering || status.currentlyAnalyzing}
          className="w-full"
          variant="outline"
        >
          {triggering || status.currentlyAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run Scan Now
            </>
          )}
        </Button>

        {/* Refresh button */}
        <Button
          onClick={fetchStatus}
          variant="ghost"
          size="sm"
          className="w-full"
        >
          <RefreshCw className="w-3 h-3 mr-2" />
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  );
}
