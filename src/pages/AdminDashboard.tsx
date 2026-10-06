import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  History,
  Activity,
  Search,
  Filter,
  UserPlus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Download,
  Laptop,
  Clock,
  ArrowUpDown,
  GraduationCap,
  User,
  Shield,
  FileCheck2,
  AlertCircle,
  ExternalLink,
  Calendar,
  Lock,
  Mail,
  Wallet,
  X,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  api,
  type AuthUser,
  type AdminStats,
  type ManagedUser,
  type UserLoginLog,
  type SecurityAuditLog,
} from '../services/api';

interface AdminDashboardProps {
  currentUser: AuthUser;
}

// Generate valid EVM wallet address for test creation
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

// Format relative time helper
function timeAgo(dateString: string): string {
  try {
    const diff = (Date.now() - new Date(dateString).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return 'Recently';
  }
}

// Format readable date and time
function formatDateTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateString;
  }
}

// Clean User Agent formatter
function parseUserAgent(ua: string): { browser: string; os: string } {
  if (!ua || ua === 'Unknown Browser') return { browser: 'Web Browser', os: 'Desktop' };
  let browser = 'Browser';
  let os = 'OS';

  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/')) browser = 'Safari';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Macintosh')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return { browser, os };
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'logins' | 'audit'>('users');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loginLogs, setLoginLogs] = useState<UserLoginLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STUDENT' | 'FACULTY' | 'ADMIN'>('ALL');

  // Modals & Actions
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roleChangeUser, setRoleChangeUser] = useState<ManagedUser | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<'STUDENT' | 'FACULTY' | 'ADMIN'>('STUDENT');
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<ManagedUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusNotification, setStatusNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New User Form State
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'STUDENT' as 'STUDENT' | 'FACULTY' | 'ADMIN',
    walletAddress: '',
  });

  // Load all admin data
  const loadDashboardData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [fetchedStats, fetchedUsers, fetchedLogins, fetchedAudit] = await Promise.all([
        api.admin.getStats().catch(() => null),
        api.admin.getUsers().catch(() => []),
        api.admin.getLoginLogs(150).catch(() => []),
        api.admin.getAuditLogs(150).catch(() => []),
      ]);

      if (fetchedStats) setStats(fetchedStats);
      if (fetchedUsers) setUsers(fetchedUsers);
      if (fetchedLogins) setLoginLogs(fetchedLogins);
      if (fetchedAudit) setAuditLogs(fetchedAudit);
    } catch (err) {
      console.error('[AdminDashboard] Failed to fetch data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.walletAddress.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchQuery]);

  // Filtered Login Logs
  const filteredLoginLogs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return loginLogs;
    return loginLogs.filter(
      (l) =>
        l.user?.fullName?.toLowerCase().includes(q) ||
        l.user?.email?.toLowerCase().includes(q) ||
        l.ipAddress?.toLowerCase().includes(q) ||
        l.userAgent?.toLowerCase().includes(q)
    );
  }, [loginLogs, searchQuery]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return auditLogs;
    return auditLogs.filter(
      (a) =>
        a.action.toLowerCase().includes(q) ||
        a.user?.fullName?.toLowerCase().includes(q) ||
        a.user?.email?.toLowerCase().includes(q) ||
        JSON.stringify(a.details || {}).toLowerCase().includes(q)
    );
  }, [auditLogs, searchQuery]);

  // Copy to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Change Role Handler
  const handleUpdateRole = async () => {
    if (!roleChangeUser) return;
    setActionLoading(true);
    setStatusNotification(null);

    try {
      const res = await api.admin.updateUserRole(roleChangeUser.id, selectedNewRole);
      setStatusNotification({ type: 'success', message: res.message || 'Role successfully updated' });
      setRoleChangeUser(null);
      await loadDashboardData(true);
    } catch (err: any) {
      setStatusNotification({ type: 'error', message: err.message || 'Failed to update user role' });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete User Handler
  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setActionLoading(true);
    setStatusNotification(null);

    try {
      const res = await api.admin.deleteUser(deleteConfirmUser.id);
      setStatusNotification({ type: 'success', message: res.message || 'User deleted successfully' });
      setDeleteConfirmUser(null);
      await loadDashboardData(true);
    } catch (err: any) {
      setStatusNotification({ type: 'error', message: err.message || 'Failed to delete user' });
    } finally {
      setActionLoading(false);
    }
  };

  // Create User Handler
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setStatusNotification(null);

    try {
      const res = await api.admin.createUser(newUser);
      setStatusNotification({ type: 'success', message: res.message || 'User created successfully' });
      setShowCreateModal(false);
      setNewUser({
        fullName: '',
        email: '',
        password: '',
        role: 'STUDENT',
        walletAddress: '',
      });
      await loadDashboardData(true);
    } catch (err: any) {
      setStatusNotification({ type: 'error', message: err.message || 'Failed to create user' });
    } finally {
      setActionLoading(false);
    }
  };

  // Export logs to JSON
  const handleExportLogs = (type: 'logins' | 'audit') => {
    const dataToExport = type === 'logins' ? loginLogs : auditLogs;
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credence-${type}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Control Center Header */}
      <div className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-950/40 via-card to-background p-6 shadow-xl md:p-8 dark:border-purple-500/30">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-purple-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-indigo-600/15 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400">
                <ShieldCheck size={14} />
                Super Admin Console
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Audit Stream
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-foreground md:text-3xl">
              Platform Administration & Audit Intelligence
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor active sessions, inspect student/faculty login timestamps, manage permissions, and inspect tamper-evident audit logs.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => loadDashboardData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Syncing...' : 'Refresh Feed'}
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/25 transition hover:bg-purple-700"
            >
              <UserPlus size={15} />
              Provision User
            </button>
          </div>
        </div>
      </div>

      {/* Global Status Notification */}
      {statusNotification && (
        <div
          className={`flex items-center justify-between rounded-2xl border p-4 text-xs font-semibold ${
            statusNotification.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusNotification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusNotification.message}</span>
          </div>
          <button
            onClick={() => setStatusNotification(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total Users */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Total Accounts</span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-foreground">
            {stats?.totalUsers ?? users.length}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              {stats?.breakdown.admins ?? 1} Admins
            </span>
            <span>·</span>
            <span>{stats?.breakdown.faculty ?? 0} Faculty</span>
            <span>·</span>
            <span>{stats?.breakdown.students ?? 0} Students</span>
          </div>
        </div>

        {/* Total Login Sessions */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Login Activity Logs</span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <History size={18} />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-foreground">
            {stats?.totalLogins ?? loginLogs.length}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Logged across all IP addresses & devices
          </div>
        </div>

        {/* Exams & Tests */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Assessments Created</span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <FileCheck2 size={18} />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-foreground">
            {stats?.totalExams ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Anchored on Sepolia Testnet
          </div>
        </div>

        {/* Security Audit Trail */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Security Audit Events</span>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Activity size={18} />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-foreground">
            {stats?.totalAuditLogs ?? auditLogs.length}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Immutable operation trace
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2 rounded-2xl bg-muted/60 p-1.5">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'users'
                ? 'bg-card text-foreground shadow-sm dark:bg-slate-800'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users size={15} />
            User Management ({users.length})
          </button>

          <button
            onClick={() => setActiveTab('logins')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'logins'
                ? 'bg-card text-foreground shadow-sm dark:bg-slate-800'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock size={15} />
            User Login Activity ({loginLogs.length})
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'audit'
                ? 'bg-card text-foreground shadow-sm dark:bg-slate-800'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck size={15} />
            Security Audit Trail ({auditLogs.length})
          </button>
        </div>

        {/* Global Search Filter */}
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search size={15} className="absolute left-3.5 top-3 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full rounded-xl border border-input bg-card py-2 pl-9 pr-3 text-xs outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {activeTab === 'users' && (
            <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 text-xs">
              {(['ALL', 'ADMIN', 'FACULTY', 'STUDENT'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                    roleFilter === r
                      ? 'bg-purple-600 text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {(activeTab === 'logins' || activeTab === 'audit') && (
            <button
              onClick={() => handleExportLogs(activeTab === 'logins' ? 'logins' : 'audit')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground transition hover:bg-muted"
            >
              <Download size={14} />
              Export JSON
            </button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: User Management Table                        */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'users' && (
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-bold text-muted-foreground">
                <tr>
                  <th className="py-3.5 pl-6 pr-4">User</th>
                  <th className="px-4 py-3.5">Assigned Role</th>
                  <th className="px-4 py-3.5">Ethereum Wallet</th>
                  <th className="px-4 py-3.5">Last Login Activity</th>
                  <th className="px-4 py-3.5">Activity Stats</th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No users found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.id === currentUser.id;
                    const roleBadge =
                      u.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                        : u.role === 'FACULTY'
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';

                    return (
                      <tr key={u.id} className="transition hover:bg-muted/30">
                        {/* User Identity */}
                        <td className="py-4 pl-6 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white shadow-sm">
                              {u.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 font-bold text-foreground">
                                <span className="truncate">{u.fullName}</span>
                                {isSelf && (
                                  <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${roleBadge}`}
                          >
                            {u.role === 'ADMIN' && <Shield size={11} />}
                            {u.role === 'FACULTY' && <GraduationCap size={11} />}
                            {u.role === 'STUDENT' && <User size={11} />}
                            {u.role}
                          </span>
                        </td>

                        {/* Ethereum Wallet */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                            <span>
                              {u.walletAddress.slice(0, 6)}...{u.walletAddress.slice(-4)}
                            </span>
                            <button
                              onClick={() => handleCopy(u.walletAddress, `w-${u.id}`)}
                              className="rounded p-1 hover:bg-muted hover:text-foreground"
                              title="Copy full wallet address"
                            >
                              {copiedId === `w-${u.id}` ? (
                                <Check size={12} className="text-emerald-500" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Last Login Activity ("when user have logged in") */}
                        <td className="px-4 py-4">
                          {u.lastLogin ? (
                            <div>
                              <div className="font-semibold text-foreground">
                                {timeAgo(u.lastLogin.loginAt)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {formatDateTime(u.lastLogin.loginAt)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                IP: {u.lastLogin.ipAddress || '127.0.0.1'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] italic text-muted-foreground">
                              No recorded sessions yet
                            </span>
                          )}
                        </td>

                        {/* Activity Stats */}
                        <td className="px-4 py-4">
                          <div className="text-[11px] space-y-0.5 text-muted-foreground">
                            <div>Total Logins: <span className="font-bold text-foreground">{u.totalLogins}</span></div>
                            {u.role === 'STUDENT' && (
                              <div>Exam Submissions: <span className="font-bold text-foreground">{u.attemptCount}</span></div>
                            )}
                            {u.role === 'FACULTY' && (
                              <div>Exams Created: <span className="font-bold text-foreground">{u.createdExamCount}</span></div>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 pl-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setRoleChangeUser(u);
                                setSelectedNewRole(u.role);
                              }}
                              className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-bold text-foreground transition hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-950/40"
                              title="Change Role"
                            >
                              Edit Role
                            </button>

                            {!isSelf && (
                              <button
                                onClick={() => setDeleteConfirmUser(u)}
                                className="rounded-lg border border-border bg-card p-1.5 text-muted-foreground transition hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                                title="Delete User"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: User Login Activity ("when user have logged in")*/}
      {/* ---------------------------------------------------- */}
      {activeTab === 'logins' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing recent authentication sessions across all accounts. Every timestamp is recorded in the Neon database.
            </p>
            <span className="text-xs font-semibold text-muted-foreground">
              Total Logged Sessions: {filteredLoginLogs.length}
            </span>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 font-bold text-muted-foreground">
                  <tr>
                    <th className="py-3.5 pl-6 pr-4">User Details</th>
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-4 py-3.5">Login Timestamp</th>
                    <th className="px-4 py-3.5">IP Address</th>
                    <th className="px-4 py-3.5">Client Device & Browser</th>
                    <th className="py-3.5 pl-4 pr-6 text-right">Session Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredLoginLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        No login activity records found.
                      </td>
                    </tr>
                  ) : (
                    filteredLoginLogs.map((log) => {
                      const ua = parseUserAgent(log.userAgent);
                      const isRecent = (Date.now() - new Date(log.loginAt).getTime()) < 3600000;

                      return (
                        <tr key={log.id} className="transition hover:bg-muted/30">
                          {/* User */}
                          <td className="py-3.5 pl-6 pr-4">
                            <div className="flex items-center gap-2.5">
                              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-100 font-bold">
                                {log.user?.fullName?.charAt(0) || 'U'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-foreground truncate">
                                  {log.user?.fullName || 'Unknown User'}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {log.user?.email || log.userId}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-4 py-3.5">
                            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                              {log.user?.role || 'USER'}
                            </span>
                          </td>

                          {/* Login Timestamp */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 font-bold text-foreground">
                              <Clock size={13} className="text-purple-500" />
                              <span>{timeAgo(log.loginAt)}</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {formatDateTime(log.loginAt)}
                            </div>
                          </td>

                          {/* IP Address */}
                          <td className="px-4 py-3.5">
                            <span className="mono rounded bg-muted/60 px-2 py-1 text-[11px] text-foreground">
                              {log.ipAddress}
                            </span>
                          </td>

                          {/* Device / Client */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 text-foreground font-semibold">
                              <Laptop size={14} className="text-muted-foreground" />
                              <span>{ua.browser} on {ua.os}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-xs" title={log.userAgent}>
                              {log.userAgent}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 pl-4 pr-6 text-right">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                isRecent
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              <CheckCircle2 size={11} />
                              {isRecent ? 'Active Session' : 'Authorized'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: Security & System Audit Trail                 */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              System event stream tracking logins, role modifications, assessments created, and student submissions.
            </p>
            <span className="text-xs font-semibold text-muted-foreground">
              Total Recorded Events: {filteredAuditLogs.length}
            </span>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 font-bold text-muted-foreground">
                  <tr>
                    <th className="py-3.5 pl-6 pr-4">Event Action</th>
                    <th className="px-4 py-3.5">Actor / Operator</th>
                    <th className="px-4 py-3.5">Event Details & Metadata</th>
                    <th className="px-4 py-3.5">Timestamp</th>
                    <th className="py-3.5 pl-4 pr-6 text-right">Network IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">
                        No audit log events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => {
                      const actionBadge =
                        log.action === 'USER_ROLE_CHANGED'
                          ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300'
                          : log.action === 'ADMIN_CREATED_USER'
                          ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300'
                          : log.action === 'EXAM_CREATED'
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300'
                          : log.action === 'EXAM_SUBMITTED'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : log.action === 'USER_LOGIN'
                          ? 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                          : 'bg-muted text-muted-foreground border-border';

                      return (
                        <tr key={log.id} className="transition hover:bg-muted/30">
                          {/* Action */}
                          <td className="py-3.5 pl-6 pr-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${actionBadge}`}
                            >
                              <Activity size={10} />
                              {log.action}
                            </span>
                          </td>

                          {/* Actor */}
                          <td className="px-4 py-3.5">
                            {log.user ? (
                              <div>
                                <div className="font-bold text-foreground">{log.user.fullName}</div>
                                <div className="text-[10px] text-muted-foreground">{log.user.email}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">System Service</span>
                            )}
                          </td>

                          {/* Details */}
                          <td className="px-4 py-3.5">
                            <div className="max-w-md overflow-hidden text-ellipsis font-mono text-[11px] text-muted-foreground">
                              {log.details ? (
                                typeof log.details === 'object' ? (
                                  <pre className="rounded bg-muted/60 p-2 text-[10px] overflow-x-auto">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                ) : (
                                  <span>{String(log.details)}</span>
                                )
                              ) : (
                                <span>No payload</span>
                              )}
                            </div>
                          </td>

                          {/* Timestamp */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-bold text-foreground">{timeAgo(log.timestamp)}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {formatDateTime(log.timestamp)}
                            </div>
                          </td>

                          {/* IP Address */}
                          <td className="py-3.5 pl-4 pr-6 text-right whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                            {log.ipAddress}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: Provision New User                            */}
      {/* ---------------------------------------------------- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/70 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl md:p-8 dark:border-white/10 dark:bg-slate-900">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-purple-600 text-white shadow-md">
                <UserPlus size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Provision User Account</h3>
                <p className="text-xs text-muted-foreground">Admin-level registration into Neon Database</p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-foreground">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  placeholder="e.g. Professor Sarah Connor"
                  className="mt-1 w-full rounded-xl border border-input bg-background py-2.5 px-3 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@college.edu"
                  className="mt-1 w-full rounded-xl border border-input bg-background py-2.5 px-3 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="mt-1 w-full rounded-xl border border-input bg-background py-2.5 px-3 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground">Role Privilege</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {(['STUDENT', 'FACULTY', 'ADMIN'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewUser({ ...newUser, role: r })}
                      className={`rounded-xl border py-2 text-xs font-bold transition ${
                        newUser.role === r
                          ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                          : 'border-border bg-background text-muted-foreground'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Ethereum Wallet (0x...)</label>
                  <button
                    type="button"
                    onClick={() => setNewUser({ ...newUser, walletAddress: generateRandomWallet() })}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:underline dark:text-purple-400"
                  >
                    <Sparkles size={11} /> Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newUser.walletAddress}
                  onChange={(e) => setNewUser({ ...newUser, walletAddress: e.target.value })}
                  placeholder="0x..."
                  className="mono mt-1 w-full rounded-xl border border-input bg-background py-2.5 px-3 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="mt-2 w-full rounded-xl bg-purple-600 py-3 text-xs font-bold text-white shadow-lg shadow-purple-600/25 transition hover:bg-purple-700 disabled:opacity-50"
              >
                {actionLoading ? 'Creating User...' : 'Provision User Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: Change Role Confirmation                      */}
      {/* ---------------------------------------------------- */}
      {roleChangeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/70 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <h3 className="text-base font-bold text-foreground">Change User Role</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Modify permissions for <span className="font-bold text-foreground">{roleChangeUser.fullName}</span> ({roleChangeUser.email})
            </p>

            <div className="mt-4 space-y-2">
              {(['STUDENT', 'FACULTY', 'ADMIN'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedNewRole(r)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-xs font-bold transition ${
                    selectedNewRole === r
                      ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                      : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  <span>{r}</span>
                  {selectedNewRole === r && <Check size={14} />}
                </button>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setRoleChangeUser(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-xs font-bold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-600/25 hover:bg-purple-700 disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Apply Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: Delete User Confirmation                      */}
      {/* ---------------------------------------------------- */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/70 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertCircle size={22} />
            </div>
            <h3 className="mt-3 text-base font-bold text-foreground">Delete Account?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Are you sure you want to delete <span className="font-bold text-foreground">{deleteConfirmUser.fullName}</span> ({deleteConfirmUser.email})? This action cannot be undone.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-xs font-bold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/25 hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
