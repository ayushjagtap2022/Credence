import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Wallet,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { api, type AuthUser } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess: (user: AuthUser) => void;
}

// Generate a random valid 40-character hex EVM address (e.g. 0x...)
function generateRandomWallet(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return (
    '0x' +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'FACULTY' | 'ADMIN'>('STUDENT');

  if (!isOpen) return null;

  // 1-Click quick fill demo accounts
  const quickFill = (demoRole: 'admin' | 'faculty' | 'student1' | 'student2') => {
    setError('');
    setMode('login');
    if (demoRole === 'admin') {
      setEmail('admin@college.edu');
      setPassword('Password123');
    } else if (demoRole === 'faculty') {
      setEmail('faculty@college.edu');
      setPassword('Password123');
    } else if (demoRole === 'student1') {
      setEmail('student1@college.edu');
      setPassword('Password123');
    } else {
      setEmail('student2@college.edu');
      setPassword('Password123');
    }
  };

  const handleGenerateWallet = () => {
    const randomWallet = generateRandomWallet();
    setWalletAddress(randomWallet);
  };

  const handleConnectMetaMask = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        });
        if (accounts && accounts[0]) {
          setWalletAddress(accounts[0]);
        }
      } catch (err: any) {
        setError(err.message || 'MetaMask connection rejected');
      }
    } else {
      setError('MetaMask not detected in browser. Click "Generate EVM Wallet" instead.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          setError('Please provide both email and password.');
          setLoading(false);
          return;
        }

        const res = await api.login(email.trim(), password);
        setSuccessMsg(`Welcome back, ${res.user.fullName}!`);
        setTimeout(() => {
          onSuccess(res.user);
          onClose();
        }, 500);
      } else {
        // Registration
        if (!fullName.trim() || !email.trim() || !password || !walletAddress.trim()) {
          setError('All fields are required to register.');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }

        const ethRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!ethRegex.test(walletAddress.trim())) {
          setError('Invalid Ethereum wallet format. Must start with 0x followed by 40 hex characters.');
          setLoading(false);
          return;
        }

        const res = await api.register({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          walletAddress: walletAddress.trim(),
          role,
        });

        setSuccessMsg(`Account created! Logged in as ${res.user.fullName}.`);
        setTimeout(() => {
          onSuccess(res.user);
          onClose();
        }, 500);
      }
    } catch (err: any) {
      console.error('[AuthModal] Error:', err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/70 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-2xl shadow-indigo-950/20 md:p-8 dark:border-white/10 dark:bg-slate-900">
        {/* Glow Accent */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close auth dialog"
          className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
            <KeyRound size={22} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
              {mode === 'login' ? 'Sign in to Credence' : 'Create a Credence Account'}
            </h2>
            <p className="text-xs text-muted-foreground">
              Connected to Neon Cloud DB & Sepolia Smart Contract
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex rounded-xl bg-muted/70 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
              mode === 'login'
                ? 'bg-card text-foreground shadow-sm dark:bg-slate-800'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
              mode === 'register'
                ? 'bg-card text-foreground shadow-sm dark:bg-slate-800'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* 1-Click Demo Logins for Quick Testing */}
        {mode === 'login' && (
          <div className="mt-4 rounded-2xl border border-indigo-200/60 bg-indigo-50/50 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/20">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-900 dark:text-indigo-300">
                <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400" />
                Quick 1-Click Demo Logins
              </span>
              <span className="text-[10px] text-muted-foreground">Instant credential fill</span>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => quickFill('admin')}
                className="flex items-center gap-2 rounded-xl border border-purple-200 bg-card p-2 text-left text-xs transition hover:border-purple-500 hover:bg-purple-50/80 dark:border-purple-900 dark:bg-slate-800/80 dark:hover:bg-purple-950/40"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                  <ShieldCheck size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold text-foreground">Super Admin</span>
                  <span className="block text-[9px] font-semibold text-purple-600 dark:text-purple-400">ADMIN</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => quickFill('faculty')}
                className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-card p-2 text-left text-xs transition hover:border-indigo-500 hover:bg-indigo-50/80 dark:border-indigo-900 dark:bg-slate-800/80 dark:hover:bg-indigo-950/40"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  <GraduationCap size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold text-foreground">Faculty</span>
                  <span className="block text-[9px] text-muted-foreground">Dr. Ananya</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => quickFill('student1')}
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-card p-2 text-left text-xs transition hover:border-emerald-500 hover:bg-emerald-50/80 dark:border-emerald-900 dark:bg-slate-800/80 dark:hover:bg-emerald-950/40"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                  <User size={15} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold text-foreground">Student</span>
                  <span className="block text-[9px] text-muted-foreground">Rohan Mehta</span>
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-300/60 bg-rose-50/80 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-300/60 bg-emerald-50/80 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {mode === 'register' && (
            <>
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-foreground">Full Name</label>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute left-3.5 top-3 text-muted-foreground">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Maya Chen"
                    className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-3.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Role Select */}
              <div>
                <label className="block text-xs font-bold text-foreground">Role</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('STUDENT')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition ${
                      role === 'STUDENT'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'border-border bg-background text-muted-foreground'
                    }`}
                  >
                    <User size={14} /> Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('FACULTY')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition ${
                      role === 'FACULTY'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                        : 'border-border bg-background text-muted-foreground'
                    }`}
                  >
                    <GraduationCap size={14} /> Faculty
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('ADMIN')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition ${
                      role === 'ADMIN'
                        ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                        : 'border-border bg-background text-muted-foreground'
                    }`}
                  >
                    <ShieldCheck size={14} /> Admin
                  </button>
                </div>
              </div>

              {/* Ethereum Wallet Address */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Ethereum Wallet (0x...)</label>
                  <button
                    type="button"
                    onClick={handleGenerateWallet}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    <Sparkles size={11} /> Auto-Generate
                  </button>
                </div>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute left-3.5 top-3 text-muted-foreground">
                    <Wallet size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                    className="mono w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-24 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleConnectMetaMask}
                    className="absolute right-2 top-2 rounded-lg bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground hover:bg-indigo-100 hover:text-indigo-700 dark:hover:bg-indigo-950 dark:hover:text-indigo-300"
                  >
                    MetaMask
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-foreground">Email Address</label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3.5 top-3 text-muted-foreground">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@college.edu"
                className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-3.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-foreground">Password</label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3.5 top-3 text-muted-foreground">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-input bg-background py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition duration-150 hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:text-slate-950"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                {mode === 'login' ? 'Sign in to Credence' : 'Complete Registration'}
                <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
            JWT Auth · bcrypt Hashed
          </span>
          <span>Sepolia Contract Verified</span>
        </div>
      </div>
    </div>
  );
};
