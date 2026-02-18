'use client';

import { useEffect, useState, type ReactNode, type FormEvent } from 'react';
import {
  CheckCircle, Loader2, Settings2, Mail, Server, Clock,
  ChevronRight, ChevronLeft, AlertCircle, Eye, EyeOff,
  Info, Zap, Shield, ArrowRight, RotateCcw
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Types
interface FormData {
  // Step 1: Identity
  oldAddress: string;
  newDomains: string;
  personalDomains: string;
  // Step 2: Connectivity
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  emailScanLimit: number;
  schedulerEnabled: boolean;
  schedulerCron: string;
  serverPort: number;
}

interface ValidationErrors {
  [key: string]: string;
}

interface ToastState {
  type: 'success' | 'error' | 'info';
  message: string;
  action?: { label: string; onClick: () => void };
}

const STEPS = [
  { id: 1, title: 'Identity', description: 'Email addresses and domains', icon: Mail },
  { id: 2, title: 'Connectivity', description: 'IMAP and automation', icon: Server },
];

const DEFAULT_FORM: FormData = {
  oldAddress: '',
  newDomains: '',
  personalDomains: '',
  imapHost: '127.0.0.1',
  imapPort: 1143,
  imapUser: '',
  imapPassword: '',
  emailScanLimit: 5000,
  schedulerEnabled: true,
  schedulerCron: '0 6 * * *',
  serverPort: 3200,
};

export function OnboardingWizard({ onDone, forceOpen = false }: { 
  onDone?: () => void; 
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<ToastState | null>(null);
  const [testingIMAP, setTestingIMAP] = useState(false);
  const [imapTestResult, setImapTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  // Load initial state
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/setup');
        const data = await res.json();

        if (!data.success) {
          showToast('error', 'Failed to load configuration');
          return;
        }

        setIsConfigured(data.configured);
        setForm({
          ...DEFAULT_FORM,
          oldAddress: data.defaults?.oldAddress || '',
          newDomains: data.defaults?.newDomains || '',
          personalDomains: data.defaults?.personalDomains || '',
          imapHost: data.defaults?.imapHost || '127.0.0.1',
          imapPort: data.defaults?.imapPort || 1143,
          imapUser: data.defaults?.imapUser || '',
          imapPassword: '', // Never pre-fill password
          emailScanLimit: data.defaults?.emailScanLimit || 5000,
          schedulerEnabled: data.defaults?.schedulerEnabled ?? true,
          schedulerCron: data.defaults?.schedulerCron || '0 6 * * *',
          serverPort: data.defaults?.serverPort || 3200,
        });

        // Open wizard if not configured or forced
        if (!data.configured || forceOpen) {
          setOpen(true);
        }
      } catch {
        showToast('error', 'Failed to load configuration');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [forceOpen]);

  // Toast helper
  const showToast = (type: ToastState['type'], message: string, action?: ToastState['action']) => {
    setToast({ type, message, action });
    setTimeout(() => setToast(null), 5000);
  };

  // Validation helpers
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isPlaceholder = (value: string): boolean => {
    const v = value.toLowerCase();
    return (
      v.includes('yourname@') ||
      v.includes('your-email@') ||
      v.includes('yourdomain.com') ||
      v.includes('your_proton_bridge_password')
    );
  };

  const validateField = (name: string, value: any): string => {
    switch (name) {
      case 'oldAddress':
        if (!value) return 'Old email address is required';
        if (!isValidEmail(value)) return 'Please enter a valid email address';
        if (isPlaceholder(value)) return 'Please replace the placeholder with your actual email';
        return '';

      case 'newDomains':
        if (!value || !value.trim()) return 'At least one new domain is required';
        const domains = value.split(/[\n,]/).map((s: string) => s.trim()).filter(Boolean);
        if (domains.length === 0) return 'At least one new domain is required';
        if (domains.some((d: string) => isPlaceholder(d))) return 'Please replace placeholder domains';
        return '';

      case 'imapHost':
        if (!value) return 'IMAP host is required';
        return '';

      case 'imapPort':
        if (!value || isNaN(value) || value < 1 || value > 65535) {
          return 'Port must be between 1 and 65535';
        }
        return '';

      case 'imapUser':
        if (!value) return 'IMAP username is required';
        if (!isValidEmail(value)) return 'Please enter a valid email address';
        if (isPlaceholder(value)) return 'Please replace the placeholder';
        return '';

      case 'imapPassword':
        if (!value) return 'IMAP password is required';
        if (isPlaceholder(value)) return 'Please enter your bridge password';
        return '';

      case 'serverPort':
        if (!value || isNaN(value) || value < 1 || value > 65535) {
          return 'Port must be between 1 and 65535';
        }
        return '';

      default:
        return '';
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    if (step === 1) {
      ['oldAddress', 'newDomains'].forEach(field => {
        const error = validateField(field, (form as any)[field]);
        if (error) {
          newErrors[field] = error;
          isValid = false;
        }
      });
    } else if (step === 2) {
      ['imapHost', 'imapPort', 'imapUser', 'imapPassword', 'serverPort'].forEach(field => {
        const error = validateField(field, (form as any)[field]);
        if (error) {
          newErrors[field] = error;
          isValid = false;
        }
      });
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleBlur = (name: string) => {
    setTouched(prev => new Set(prev).add(name));
    const error = validateField(name, (form as any)[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleChange = (name: string, value: any) => {
    setForm(prev => ({ ...prev, [name]: value }));
    if (touched.has(name)) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
    // Clear IMAP test result when credentials change
    if (['imapHost', 'imapPort', 'imapUser', 'imapPassword'].includes(name)) {
      setImapTestResult(null);
    }
  };

  // IMAP connection test
  const testIMAPConnection = async () => {
    // Validate IMAP fields first
    const imapFields = ['imapHost', 'imapPort', 'imapUser', 'imapPassword'];
    let hasErrors = false;
    const newErrors: ValidationErrors = {};

    imapFields.forEach(field => {
      const error = validateField(field, (form as any)[field]);
      if (error) {
        newErrors[field] = error;
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    setTestingIMAP(true);
    setImapTestResult(null);

    try {
      const res = await fetch('/api/imap-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: form.imapHost,
          port: form.imapPort,
          user: form.imapUser,
          password: form.imapPassword,
        }),
      });

      const data = await res.json();
      setImapTestResult({
        success: data.success,
        message: data.message,
      });
    } catch {
      setImapTestResult({
        success: false,
        message: 'Connection test failed. Please check your settings.',
      });
    } finally {
      setTestingIMAP(false);
    }
  };

  // Navigation
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 2));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateStep(currentStep)) {
      return;
    }

    // Validate all fields before final submission
    if (!validateStep(1) || !validateStep(2)) {
      showToast('error', 'Please fix all errors before submitting');
      return;
    }

    setSaving(true);
    setToast(null);

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!data.success) {
        showToast('error', data.error || 'Failed to save configuration');
        return;
      }

      showToast('success', 'Setup complete! Your configuration has been saved.');
      setIsConfigured(true);

      setTimeout(() => {
        setOpen(false);
        setCurrentStep(1);
        onDone?.();
      }, 1500);
    } catch {
      showToast('error', 'Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <>
      {/* Toast Banner */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] max-w-md p-4 rounded-lg border shadow-lg animate-in slide-in-from-top ${
          toast.type === 'success' 
            ? 'bg-emerald-950/95 border-emerald-500/30 text-emerald-100'
            : toast.type === 'error'
            ? 'bg-red-950/95 border-red-500/30 text-red-100'
            : 'bg-blue-950/95 border-blue-500/30 text-blue-100'
        }`}>
          <div className="flex items-start gap-3">
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className="text-sm font-mono">{toast.message}</p>
              {toast.action && (
                <button
                  onClick={toast.action.onClick}
                  className="mt-2 text-xs font-mono underline hover:no-underline"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button onClick={() => setToast(null)} className="text-white/40 hover:text-white/60">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Re-run Setup Button (shown when configured and wizard closed) */}
      {isConfigured && !open && (
        <button
          onClick={() => {
            setCurrentStep(1);
            setOpen(true);
          }}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-white/60 hover:text-white/90 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Re-run Setup Wizard
        </button>
      )}

      {/* Wizard Dialog */}
      <Dialog open={open} onOpenChange={(isOpen) => {
        // Prevent closing via overlay click during initial setup
        if (!isConfigured) return;
        setOpen(isOpen);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-[#00d4aa]" />
              {isConfigured ? 'Setup Wizard' : 'First-Time Setup'}
            </DialogTitle>
            <DialogDescription>
              {isConfigured 
                ? 'Update your email migration configuration.'
                : 'Complete this setup to start tracking your email migration.'
              }
            </DialogDescription>
          </DialogHeader>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 px-1 py-3">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => currentStep > step.id && setCurrentStep(step.id)}
                    disabled={currentStep <= step.id}
                    className={`flex items-center gap-2 flex-1 text-left transition-colors ${
                      isCompleted ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isCompleted 
                        ? 'bg-[#00d4aa] text-[#0a0b0f]' 
                        : isActive 
                        ? 'bg-[#00d4aa]/20 border-2 border-[#00d4aa] text-[#00d4aa]'
                        : 'bg-white/[0.05] border border-white/10 text-white/40'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <div className={`text-xs font-mono font-medium ${
                        isActive || isCompleted ? 'text-white/90' : 'text-white/40'
                      }`}>
                        Step {step.id}: {step.title}
                      </div>
                      <div className={`text-[10px] font-mono ${
                        isActive || isCompleted ? 'text-white/50' : 'text-white/30'
                      }`}>
                        {step.description}
                      </div>
                    </div>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-2 transition-colors ${
                      isCompleted ? 'bg-[#00d4aa]/50' : 'bg-white/10'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#00d4aa] transition-all duration-300"
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            />
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 -mr-1">
            {currentStep === 1 && (
              <Step1Form
                form={form}
                errors={errors}
                touched={touched}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            )}
            {currentStep === 2 && (
              <Step2Form
                form={form}
                errors={errors}
                touched={touched}
                showPassword={showPassword}
                imapTestResult={imapTestResult}
                testingIMAP={testingIMAP}
                onChange={handleChange}
                onBlur={handleBlur}
                onTogglePassword={() => setShowPassword(!showPassword)}
                onTestIMAP={testIMAPConnection}
              />
            )}
          </form>

          {/* Navigation Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
            <div>
              {currentStep > 1 && (
                <Button type="button" variant="ghost" onClick={prevStep}>
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentStep < STEPS.length ? (
                <Button type="button" onClick={nextStep}>
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button 
                  type="button" 
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <CheckCircle className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Step 1: Identity Form
function Step1Form({ 
  form, errors, touched, onChange, onBlur 
}: {
  form: FormData;
  errors: ValidationErrors;
  touched: Set<string>;
  onChange: (name: string, value: any) => void;
  onBlur: (name: string) => void;
}) {
  return (
    <div className="space-y-5 py-4">
      {/* Introduction */}
      <div className="p-4 rounded-lg bg-[#00d4aa]/5 border border-[#00d4aa]/20">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-[#00d4aa] mt-0.5" />
          <div>
            <p className="text-sm font-mono text-white/90">Let&apos;s set up your migration identity</p>
            <p className="text-xs font-mono text-white/50 mt-1">
              Tell us which email address you&apos;re migrating from and where you want services to send emails to.
            </p>
          </div>
        </div>
      </div>

      {/* Old Email Address */}
      <Field 
        label="Old Email Address" 
        error={touched.has('oldAddress') ? errors.oldAddress : undefined}
        required
        help="The Gmail (or other) address you're migrating away from"
      >
        <input
          type="email"
          value={form.oldAddress}
          onChange={(e) => onChange('oldAddress', e.target.value)}
          onBlur={() => onBlur('oldAddress')}
          placeholder="you@gmail.com"
          className={`w-full h-10 px-3 text-sm font-mono bg-white/[0.03] border rounded-lg text-white/90 placeholder:text-white/30 focus:outline-none focus:bg-white/[0.05] transition-colors ${
            touched.has('oldAddress') && errors.oldAddress 
              ? 'border-red-500/50 focus:border-red-500' 
              : 'border-white/[0.08] focus:border-[#00d4aa]/50'
          }`}
        />
      </Field>

      {/* New Domains */}
      <Field 
        label="New Domains" 
        error={touched.has('newDomains') ? errors.newDomains : undefined}
        required
        help="Domains that will receive migrated service emails (e.g., yourdomain.com)"
      >
        <textarea
          value={form.newDomains}
          onChange={(e) => onChange('newDomains', e.target.value)}
          onBlur={() => onBlur('newDomains')}
          placeholder="yourdomain.com&#10;anotherdomain.com"
          rows={3}
          className={`w-full px-3 py-2 text-sm font-mono bg-white/[0.03] border rounded-lg text-white/90 placeholder:text-white/30 focus:outline-none focus:bg-white/[0.05] transition-colors resize-none ${
            touched.has('newDomains') && errors.newDomains 
              ? 'border-red-500/50 focus:border-red-500' 
              : 'border-white/[0.08] focus:border-[#00d4aa]/50'
          }`}
        />
        <p className="text-[10px] font-mono text-white/40 mt-1">
          Enter one domain per line or comma-separated
        </p>
      </Field>

      {/* Personal Domains */}
      <Field 
        label="Personal Domains" 
        error={touched.has('personalDomains') ? errors.personalDomains : undefined}
        help="Your own domains that should be excluded from tracking"
      >
        <input
          type="text"
          value={form.personalDomains}
          onChange={(e) => onChange('personalDomains', e.target.value)}
          onBlur={() => onBlur('personalDomains')}
          placeholder="gmail.com, protonmail.com"
          className={`w-full h-10 px-3 text-sm font-mono bg-white/[0.03] border rounded-lg text-white/90 placeholder:text-white/30 focus:outline-none focus:bg-white/[0.05] transition-colors ${
            touched.has('personalDomains') && errors.personalDomains 
              ? 'border-red-500/50 focus:border-red-500' 
              : 'border-white/[0.08] focus:border-[#00d4aa]/50'
          }`}
        />
        <p className="text-[10px] font-mono text-white/40 mt-1">
          Optional: These won&apos;t be tracked as services to migrate
        </p>
      </Field>

      {/* Info Box */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
        <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs font-mono text-white/60">
          <strong className="text-white/80">How it works:</strong> The tracker scans your inbox for services 
          still using your old email. When a service starts sending to your new domains, 
          it&apos;s automatically marked as migrated.
        </p>
      </div>
    </div>
  );
}

// Step 2: Connectivity Form
function Step2Form({ 
  form, errors, touched, showPassword, imapTestResult, testingIMAP,
  onChange, onBlur, onTogglePassword, onTestIMAP
}: {
  form: FormData;
  errors: ValidationErrors;
  touched: Set<string>;
  showPassword: boolean;
  imapTestResult: { success: boolean; message: string } | null;
  testingIMAP: boolean;
  onChange: (name: string, value: any) => void;
  onBlur: (name: string) => void;
  onTogglePassword: () => void;
  onTestIMAP: () => void;
}) {
  return (
    <div className="space-y-5 py-4">
      {/* Introduction */}
      <div className="p-4 rounded-lg bg-[#00d4aa]/5 border border-[#00d4aa]/20">
        <div className="flex items-start gap-3">
          <Server className="w-5 h-5 text-[#00d4aa] mt-0.5" />
          <div>
            <p className="text-sm font-mono text-white/90">Connect to your mailbox</p>
            <p className="text-xs font-mono text-white/50 mt-1">
              Configure IMAP settings to scan your inbox. Proton Bridge must be running.
            </p>
          </div>
        </div>
      </div>

      {/* IMAP Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-mono text-white/60 uppercase tracking-wider">
          <Shield className="w-3 h-3" />
          IMAP Connection
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Host" error={touched.has('imapHost') ? errors.imapHost : undefined} required>
            <input
              type="text"
              value={form.imapHost}
              onChange={(e) => onChange('imapHost', e.target.value)}
              onBlur={() => onBlur('imapHost')}
              placeholder="127.0.0.1"
              className={`w-full h-10 px-3 text-sm font-mono bg-white/[0.03] border rounded-lg text-white/90 placeholder:text-white/30 focus:outline-none focus:bg-white/[0.05] transition-colors ${
                touched.has('imapHost') && errors.imapHost 
                  ? 'border-red-500/50' 
                  : 'border-white/[0.08] focus:border-[#00d4aa]/50'
              }`}
            />
          </Field>
          <Field label="Port" error={touched.has('imapPort') ? errors.imapPort : undefined} required>
            <input
              type="number"
              value={form.imapPort}
              onChange={(e) => onChange('imapPort', parseInt(e.target.value) || 0)}
              onBlur={() => onBlur('imapPort')}
              placeholder="1143"
              className={`w-full h-10 px-3 text-sm font-mono bg-white/[0.03] border rounded-lg text-white/90 placeholder:text-white/30 focus:outline-none focus:bg-white/[0.05] transition-colors ${
                touched.has('imapPort') && errors.imapPort 
                  ? 'border-red-500/50' 
                  : 'border-white/[0.08] focus:border-[#00d4aa]/50'
              }`}
            />
          </Field>
        </div>

        <Field label="Username" error={touched.has('imapUser') ? errors.imapUser : undefined} required>
          <input
            type="email"
            value={form.imapUser}
            onChange={(e) => onChange('imapUser', e.target.value)}
            onBlur={() => onBlur('imapUser')}
            placeholder="contact@yourdomain.com"
            className={`w-full h-10 px-3 text-sm font-mono bg-white/[0.03] border rounded-lg text-white/90 placeholder:text-white/30 focus:outline-none focus:bg-white/[0.05] transition-colors ${
              touched.has('imapUser') && errors.imapUser 
                ? 'border-red-500/50' 
                : 'border-white/[0.08] focus:border-[#00d4aa]/50'
            }`}
          />
        </Field>

        <Field 
          label="Password" 
          error={touched.has('imapPassword') ? errors.imapPassword : undefined}
          required
          help="Your Proton Bridge password (not your Proton account password)"
        >
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.imapPassword}
              onChange={(e) => onChange('imapPassword', e.target.value)}
              onBlur={() => onBlur('imapPassword')}
              placeholder="••••••••••••"
              className={`w-full h-10 px-3 pr-10 text-sm font-mono bg-white/[0.03] border rounded-lg text-white/90 placeholder:text-white/30 focus:outline-none focus:bg-white/[0.05] transition-colors ${
                touched.has('imapPassword') && errors.imapPassword 
                  ? 'border-red-500/50' 
                  : 'border-white/[0.08] focus:border-[#00d4aa]/50'
              }`}
            />
            <button
              type="button"
              onClick={onTogglePassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>

        {/* IMAP Test Button & Result */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onTestIMAP}
            disabled={testingIMAP}
          >
            {testingIMAP ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Zap className="w-3 h-3" />
                Test Connection
              </>
            )}
          </Button>
          {imapTestResult && (
            <div className={`flex items-center gap-2 text-xs font-mono ${
              imapTestResult.success ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {imapTestResult.success ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {imapTestResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="space-y-4 pt-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 text-xs font-mono text-white/60 uppercase tracking-wider">
          <Clock className="w-3 h-3" />
          Automation Settings
        </div>

        <Field label="Email Scan Limit" help="Maximum number of recent emails to scan per run">
          <input
            type="number"
            value={form.emailScanLimit}
            onChange={(e) => onChange('emailScanLimit', parseInt(e.target.value) || 5000)}
            className="w-full h-10 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/90 focus:outline-none focus:border-[#00d4aa]/50 focus:bg-white/[0.05] transition-colors"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Cron Schedule" help="When to run automatic scans">
            <input
              type="text"
              value={form.schedulerCron}
              onChange={(e) => onChange('schedulerCron', e.target.value)}
              placeholder="0 6 * * *"
              className="w-full h-10 px-3 text-sm font-mono bg-white/[0.03] border border-white/[0.08] rounded-lg text-white/90 placeholder:text-white/30 focus:outline-none focus:border-[#00d4aa]/50 focus:bg-white/[0.05] transition-colors"
            />
            <p className="text-[10px] font-mono text-white/30 mt-1">
              Default: Daily at 6 AM
            </p>
          </Field>

          <Field label="Scheduler">
            <label className="flex items-center gap-3 h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.08] cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={form.schedulerEnabled}
                  onChange={(e) => onChange('schedulerEnabled', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-5 rounded-full transition-colors ${
                  form.schedulerEnabled ? 'bg-[#00d4aa]' : 'bg-white/20'
                }`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    form.schedulerEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </div>
              <span className="text-sm font-mono text-white/70">
                {form.schedulerEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </Field>
        </div>

        <Field label="Server Port" help="Port for the web dashboard">
          <input
            type="number"
            value={form.serverPort}
            onChange={(e) => onChange('serverPort', parseInt(e.target.value) || 3200)}
            onBlur={() => onBlur('serverPort')}
            placeholder="3200"
            className={`w-full h-10 px-3 text-sm font-mono bg-white/[0.03] border rounded-lg text-white/90 placeholder:text-white/30 focus:outline-none focus:bg-white/[0.05] transition-colors ${
              touched.has('serverPort') && errors.serverPort 
                ? 'border-red-500/50' 
                : 'border-white/[0.08] focus:border-[#00d4aa]/50'
            }`}
          />
        </Field>
      </div>

      {/* Help Box */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
        <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs font-mono text-white/60">
          <strong className="text-white/80">Need help?</strong> Make sure Proton Bridge is running 
          before testing the connection. Get your bridge password from the Proton Bridge app, 
          not your Proton account.
        </div>
      </div>
    </div>
  );
}

// Field Component
function Field({ 
  label, 
  error, 
  required, 
  help, 
  children 
}: { 
  label: string; 
  error?: string; 
  required?: boolean;
  help?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-xs font-mono text-white/70">
          {label}
        </label>
        {required && (
          <Badge variant="outline" className="text-[9px] h-4 px-1.5">Required</Badge>
        )}
      </div>
      {children}
      {error && (
        <p className="text-xs font-mono text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
      {!error && help && (
        <p className="text-[10px] font-mono text-white/40">{help}</p>
      )}
    </div>
  );
}
