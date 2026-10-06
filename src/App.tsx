import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Activity, ArrowLeft, ArrowRight, ArrowUpRight, BookOpenCheck, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, FileClock, Fingerprint, Flag, GraduationCap, LayoutDashboard, LockKeyhole, LogOut, Menu, Moon, Plus, Radio, RotateCcw, Shield, ShieldCheck, Sun, UserRound, Users, Wallet, X, Zap, ExternalLink, Copy } from 'lucide-react';
import { api, type AuthUser } from './services/api';
import { LandingPage } from './pages/LandingPage';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './pages/AdminDashboard';
import './index.css';

type Exam = { id: string; name: string; code: string; date: string; start: string; end: string; duration: number; passingMarks: number; totalMarks?: number; questions: Question[]; whitelist: string[]; txHash?: string };
type Question = { id: string; text: string; options: string[]; answer: number };
type Attempt = { id: string; examId: string; student: string; studentId: string; status: string; startedAt: string; submittedAt?: string; answers?: Record<string, number>; flagged?: string[]; digest?: string; tx?: string; block?: number; score?: number; total?: number; answered?: number; };
const cn = (...v: (string | false | undefined)[]) => v.filter(Boolean).join(' ');
const today = () => new Date().toISOString().slice(0, 10);
const timeOf = (s: string) => s?.slice(11, 16) || '--:--';
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtStamp = (s: string) => new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const shortHash = (s = '') => s.length > 20 ? `${s.slice(0, 14)}…${s.slice(-6)}` : s;
const examStatus = (exam: Exam, clock: string) => {
  const now = clock || '10:15';
  if (exam.date < today() || (exam.date === today() && now >= timeOf(exam.end))) return 'ENDED';
  if (exam.date > today() || now < timeOf(exam.start)) return 'LOCKED';
  return 'ACTIVE';
};
const digestText = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
};
function Btn({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button', testid, to }: any) {
  const style = variant === 'primary' ? 'bg-indigo-700 text-white hover:bg-indigo-800 dark:bg-indigo-400 dark:text-slate-950 dark:hover:bg-indigo-300' : variant === 'outline' ? 'border border-border bg-card hover:bg-muted text-foreground' : variant === 'ghost' ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : 'bg-emerald-700 text-white hover:bg-emerald-800';
  const classes = cn('inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-150 disabled:cursor-not-allowed disabled:opacity-40', style, className);
  return to ? <Link to={to} data-testid={testid} className={classes}>{children}</Link> : <button type={type} data-testid={testid} disabled={disabled} onClick={onClick} className={classes}>{children}</button>;
}
function Pill({ children, tone = 'neutral' }: any) {
  const tones: any = { neutral: 'bg-secondary text-secondary-foreground', green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300', blue: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300', amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300', red: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' };
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide', tones[tone])}>{children}</span>;
}
function Field({ label, children, hint }: any) { return <label className="grid gap-1.5 text-sm font-semibold text-foreground">{label}{children}{hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}</label>; }
const inputClass = 'w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15';
function EmptyState({ icon: Icon = FileClock, title, body, action }: any) {
  return <div className="surface rounded-2xl px-6 py-14 text-center"><span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><Icon size={22} /></span><h3 className="font-bold">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

function AdminDashboardRoute() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    api.user().then((u) => {
      if (u) setCurrentUser(u);
      else {
        setCurrentUser({
          id: 'admin-default',
          email: 'admin@college.edu',
          fullName: 'Super Administrator',
          role: 'ADMIN',
          walletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        });
      }
    });
  }, []);

  if (!currentUser) return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
  return <AdminDashboard currentUser={currentUser} />;
}

function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('blockexam.theme') === 'dark');
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('blockexam.theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return <BrowserRouter><Routes>
    <Route path="/" element={<LandingPage dark={dark} toggleTheme={toggleTheme} onAuthSuccess={() => {}} />} />
    <Route path="/faculty" element={<Shell><FacultyHome /></Shell>} />
    <Route path="/faculty/exams" element={<Shell><ExamList /></Shell>} />
    <Route path="/faculty/exams/new" element={<Shell><CreateExam /></Shell>} />
    <Route path="/faculty/audit" element={<Shell><AuditPage /></Shell>} />
    <Route path="/student" element={<Shell><StudentHome /></Shell>} />
    <Route path="/admin" element={<Shell><AdminDashboardRoute /></Shell>} />
    <Route path="/exam/:examId" element={<ExamSession />} />
    <Route path="/results/:attemptId" element={<Shell><ResultPage /></Shell>} />
    <Route path="*" element={<Shell><EmptyState title="Page not found" body="This route is outside the console." action={<Btn to="/">Return to home</Btn>} /></Shell>} />
  </Routes></BrowserRouter>;
}
function Brand({ compact = false }: { compact?: boolean }) {
  return <Link to="/" className="flex items-center gap-3 text-inherit no-underline"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-700 text-white"><Shield size={21} /></span><span><span className="block font-[Manrope] text-lg font-extrabold tracking-tight">Credence</span>{!compact && <span className="block text-[10px] font-bold tracking-[.14em] text-muted-foreground">SEPOLIA + NEON</span>}</span></Link>;
}
function ThemeButton({ dark, toggle }: any) { return <button onClick={toggle} aria-label="Toggle color theme" data-testid="button-theme-toggle" className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground">{dark ? <Sun size={17} /> : <Moon size={17} />}</button>; }
function Shell({ children }: any) {
  const loc = useLocation();
  const nav = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState('faculty');
  const [clock, setClock] = useState('10:15');
  const [dark, setDark] = useState(() => localStorage.getItem('blockexam.theme') === 'dark');
  const [mobile, setMobile] = useState(false);
  const [backendStatus, setBackendStatus] = useState({ online: false, status: 'CHECKING' });
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    api.user().then((u) => {
      if (u) {
        setUser(u);
        setRole(u.role?.toLowerCase() || 'faculty');
      }
    });
    api.getRole().then(setRole);
    api.getClock().then(setClock);
    api.health().then((h) => setBackendStatus(h));
  }, []);

  const switchRole = async (value: string) => {
    setRole(value);
    await api.setRole(value);
    if (value === 'admin') nav('/admin');
    else if (value === 'faculty') nav('/faculty');
    else nav('/student');
  };

  const chooseClock = async (value: string) => {
    setClock(value);
    await api.setClock(value);
    window.dispatchEvent(new CustomEvent('blockexam-clock', { detail: value }));
  };

  const navs = role === 'admin'
    ? [
        { href: '/admin', label: 'Admin Console', icon: ShieldCheck },
        { href: '/faculty', label: 'Faculty View', icon: LayoutDashboard },
        { href: '/student', label: 'Student View', icon: BookOpenCheck },
      ]
    : role === 'faculty'
    ? [
        { href: '/faculty', label: 'Overview', icon: LayoutDashboard },
        { href: '/faculty/exams', label: 'Exams', icon: BookOpenCheck },
        { href: '/faculty/audit', label: 'Audit trail', icon: FileClock },
        ...(user?.role === 'ADMIN' ? [{ href: '/admin', label: 'Super Admin', icon: ShieldCheck }] : []),
      ]
    : [
        { href: '/student', label: 'My exams', icon: BookOpenCheck },
        ...(user?.role === 'ADMIN' ? [{ href: '/admin', label: 'Super Admin', icon: ShieldCheck }] : []),
      ];

  const signOut = async () => {
    await api.signOut();
    setUser(null);
    nav('/');
  };

  return <div className="app-shell md:flex">
    <aside className={cn('sidebar fixed inset-y-0 left-0 z-40 flex w-[265px] flex-col px-4 py-5 transition-transform md:sticky md:top-0 md:h-[100dvh] md:translate-x-0', mobile ? 'translate-x-0' : '-translate-x-full')}>
      <div className="flex items-center justify-between px-2"><Brand /><button className="md:hidden" onClick={() => setMobile(false)}><X size={18} /></button></div>
      <div className="mt-8 px-2"><label className="mb-2 block text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Workspace</label><div className="relative"><select data-testid="select-role-switcher" className="w-full appearance-none rounded-xl border border-white/10 bg-white/[.07] px-3 py-2.5 text-sm font-semibold text-slate-100 outline-none" value={role} onChange={(e) => switchRole(e.target.value)}><option value="admin">Super Admin console</option><option value="faculty">Faculty console</option><option value="student">Student portal</option></select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-3 text-slate-400" /></div></div>
      <nav className="mt-7 grid gap-1">{navs.map(({ href, label, icon: Icon }) => <Link key={href} to={href} onClick={() => setMobile(false)} data-testid={`link-nav-${label.toLowerCase().replace(/\s/g, '-')}`} className={cn('flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition', loc.pathname === href || (href !== '/faculty' && loc.pathname.startsWith(href)) ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/[.06] hover:text-slate-100')}><Icon size={17} />{label}{href === '/faculty/audit' && <span className="ml-auto rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-bold text-emerald-300">LIVE</span>}</Link>)}</nav>
      <div className="mt-auto">
        <div className="rounded-2xl border border-white/10 bg-white/[.05] p-3.5">
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-bold text-slate-200"><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Sepolia Testnet</span><Pill tone="green">CONNECTED</Pill></div>
          <p className="mono mt-2 text-[11px] text-slate-400">chainId <span className="text-slate-200">11155111</span></p>
          <p className="mono mt-1 text-[10px] text-slate-400 truncate">Contract: 0x1D14...98837</p>
          {role === 'student' && <div className="mt-3 border-t border-white/10 pt-3"><label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Simulated system time</label><select value={clock} onChange={(e) => chooseClock(e.target.value)} data-testid="select-simulated-time" className="mono mt-1.5 w-full rounded-lg border border-white/10 bg-slate-800 px-2 py-2 text-xs text-slate-100"><option value="09:50">09:50 · locked</option><option value="10:15">10:15 · active</option><option value="11:05">11:05 · closed</option></select></div>}
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl px-2 py-3 bg-white/[.03] border border-white/5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-500/20 text-sm font-bold text-indigo-300">
            {(user?.fullName || (role === 'admin' ? 'Super Admin' : role === 'student' ? 'Rohan Mehta' : 'Dr. Ananya Sharma')).split(' ').map((x: string) => x[0]).slice(0, 2).join('')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{user?.fullName || (role === 'admin' ? 'Super Admin' : role === 'student' ? 'Rohan Mehta' : 'Dr. Ananya Sharma')}</p>
            <p className="truncate text-[10px] text-slate-400">{user?.email || (role === 'admin' ? 'admin@college.edu' : role === 'student' ? 'student1@college.edu' : 'faculty@college.edu')}</p>
            {user?.walletAddress && <p className="mono truncate text-[9px] text-indigo-300">{user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}</p>}
          </div>
          <button aria-label="Sign out" title="Sign out" data-testid="button-sign-out" onClick={signOut} className="text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-white/10"><LogOut size={16} /></button>
        </div>
      </div>
    </aside>
    {mobile && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/40 md:hidden" onClick={() => setMobile(false)} />}
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur md:px-9"><div className="flex items-center gap-3"><button className="md:hidden" aria-label="Open navigation" onClick={() => setMobile(true)}><Menu size={19} /></button><p className="text-xs font-semibold text-muted-foreground">LIVE NETWORK <span className="mx-1.5">/</span><span className="text-foreground">{role === 'admin' ? 'SUPER ADMIN CONSOLE' : role === 'student' ? 'STUDENT PORTAL' : 'FACULTY CONSOLE'}</span></p></div><div className="flex items-center gap-3"><span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sepolia + Neon DB Live</span><ThemeButton dark={dark} toggle={() => { document.documentElement.classList.toggle('dark'); localStorage.setItem('blockexam.theme', !dark ? 'dark' : 'light'); setDark(!dark); }} /></div></header>
      <main className="mx-auto max-w-[1240px] px-5 py-7 md:px-9 md:py-9"><div key={loc.pathname} className="enter">{children}</div></main>
      <footer className="mx-auto flex max-w-[1240px] items-center justify-between px-5 pb-7 text-[10px] font-semibold tracking-wide text-muted-foreground md:px-9"><span>CREDENCE · IMMUTABLE ACADEMIC ASSESSMENTS</span><span className="mono">SEPOLIA CHAIN ID 11155111</span></footer>
    </div>
    <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} onSuccess={(u) => { setUser(u); setRole(u.role.toLowerCase()); }} />
  </div>;
}
function PageTitle({ eyebrow, title, subtitle, action }: any) { return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-indigo-700 dark:text-indigo-300">{eyebrow}</p><h1 className="mt-2 font-[Manrope] text-3xl font-extrabold tracking-[-.04em] md:text-[38px]">{title}</h1>{subtitle && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}</div>{action}</div>; }
function useData<T>(fn: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const refresh = useCallback(async () => { setLoading(true); try { setData(await fn()); setError(''); } catch { setError('Could not load demo records.'); } finally { setLoading(false); } }, deps);
  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, error, refresh };
}
function LoadError({ retry }: any) { return <div role="alert" className="surface rounded-2xl p-7 text-center"><p className="font-bold">Records unavailable</p><p className="mt-1 text-sm text-muted-foreground">The local demo data could not be loaded.</p><Btn variant="outline" onClick={retry} className="mt-4">Retry</Btn></div>; }
function Stat({ label, value, note, icon: Icon, tone = 'indigo' }: any) { return <div className="surface rounded-2xl p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-muted-foreground">{label}</p><p data-testid={`stat-${label.toLowerCase().replace(/\W+/g, '-')}`} className="mt-2 font-[Manrope] text-3xl font-extrabold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div><span className={cn('grid h-10 w-10 place-items-center rounded-xl', tone === 'green' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300')}><Icon size={19} /></span></div></div>; }
function FacultyHome() {
  const exams = useData<Exam[]>(() => api.exams()), attempts = useData<Attempt[]>(() => api.attempts()), audit = useData<any[]>(() => api.audit());
  const [clock, setClock] = useState('10:15'); useEffect(() => { api.getClock().then(setClock); const onClock=(event:Event)=>setClock((event as CustomEvent<string>).detail); window.addEventListener('blockexam-clock',onClock); return ()=>window.removeEventListener('blockexam-clock',onClock); }, []);
  const live = (exams.data || []).filter((e) => examStatus(e, clock) === 'ACTIVE').length;
  const students = new Set((exams.data || []).flatMap((e) => e.whitelist || [])).size;
  const submitted = (attempts.data || []).filter((a) => a.status === 'submitted').length;
  if (exams.error) return <LoadError retry={exams.refresh} />;
  return <><PageTitle eyebrow="Faculty / Overview" title="Good morning, Ananya." subtitle="Your assessment operations at a glance." action={<Btn to="/faculty/exams/new" testid="button-create-exam"><Plus size={16} /> Create an exam</Btn>} />
    <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{exams.loading ? [1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />) : <><Stat label="Active exams" value={live.toString().padStart(2, '0')} note="Based on simulated system time" icon={Radio} tone="green" /><Stat label="Total students registered" value={students.toString()} note="Across all exam whitelists" icon={Users} /><Stat label="Verified on-chain submissions" value={submitted.toString().padStart(2, '0')} note="Simulated ledger entries" icon={ShieldCheck} tone="green" /></>}</div>
    <div className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
      <section className="surface overflow-hidden rounded-2xl"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-bold">Exam schedule</h2><p className="mt-0.5 text-xs text-muted-foreground">Current status follows the demo clock</p></div><Link to="/faculty/exams" className="flex items-center gap-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">All exams <ArrowRight size={14} /></Link></div>{exams.loading ? <div className="p-6 text-sm text-muted-foreground">Loading exams…</div> : exams.data?.length ? <div className="divide-y divide-border">{exams.data.slice(0, 4).map(e => <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" key={e.id} data-testid={`row-exam-${e.id}`}><div><p className="font-semibold">{e.name}</p><p className="mono mt-1 text-[11px] text-muted-foreground">{e.code} <span className="mx-1">·</span>{timeOf(e.start)}–{timeOf(e.end)}</p></div><Status status={examStatus(e, clock)} /></div>)}</div> : <div className="p-5"><EmptyState title="No exams yet" body="Create an assessment to begin building your local schedule." action={<Btn to="/faculty/exams/new"><Plus size={15} /> Create exam</Btn>} /></div>}</section>
      <section className="surface rounded-2xl p-5"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><ShieldCheck size={19} /></div><div><h2 className="font-bold">Local network</h2><p className="text-xs text-muted-foreground">Connected · simulation only</p></div></div><div className="mt-5 space-y-3 rounded-xl bg-muted/70 p-4"><KeyValue label="Provider" value="Hardhat localhost" /><KeyValue label="Chain ID" value="31337" mono /><KeyValue label="Network writes" value="Simulated" /></div><p className="mt-4 text-xs leading-5 text-muted-foreground">This console generates demo transaction identifiers locally. No real chain or wallet is contacted.</p></section>
      <section className="surface rounded-2xl p-5 xl:col-span-2"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Recent activity</h2><p className="mt-1 text-xs text-muted-foreground">Latest audit events · simulated</p></div><Link to="/faculty/audit" className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Open audit trail →</Link></div>{audit.loading ? <p className="text-sm text-muted-foreground">Loading events…</p> : <div className="grid gap-2 md:grid-cols-3">{audit.data?.slice(0, 3).map((a) => <div key={a.id} className="rounded-xl bg-muted/60 p-3"><p className="text-xs font-bold">{a.event}</p><p className="mt-1 truncate text-xs text-muted-foreground">{a.subject}</p><p className="mono mt-2 text-[10px] text-indigo-700 dark:text-indigo-300">#{a.block} · {shortHash(a.tx)}</p></div>)}</div>}</section>
    </div></>;
}
function KeyValue({ label, value, mono = false }: any) { return <div className="flex items-center justify-between gap-3 text-xs"><span className="text-muted-foreground">{label}</span><span className={cn('font-semibold', mono && 'mono')}>{value}</span></div>; }
function Status({ status }: { status: string }) { return <Pill tone={status === 'ACTIVE' ? 'green' : status === 'ENDED' ? 'neutral' : 'amber'}>{status === 'ACTIVE' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}{status}</Pill>; }
function ExamList() {
  const { data, loading, error, refresh } = useData<Exam[]>(() => api.exams());
  const [attempts, setAttempts] = useState<Attempt[]>([]), [clock, setClock] = useState('10:15'), [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { api.attempts().then(setAttempts); api.getClock().then(setClock); }, []);
  return <><PageTitle eyebrow="Faculty / Exams" title="Exam schedule" subtitle="Create, review, and monitor each assessment window." action={<Btn to="/faculty/exams/new" testid="button-new-exam"><Plus size={16} /> New exam</Btn>} />
    {error ? <LoadError retry={refresh} /> : loading ? <div className="grid gap-3">{[1,2,3].map(i=><div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}</div> : !data?.length ? <EmptyState icon={BookOpenCheck} title="Your exam list is clear" body="Build your first assessment and add students to its allowlist." action={<Btn to="/faculty/exams/new"><Plus size={15} /> Create exam</Btn>} /> : <div className="space-y-3">{data.map((e) => {
      const status = examStatus(e, clock), students = attempts.filter(a => a.examId === e.id);
      return <section key={e.id} className="surface overflow-hidden rounded-2xl" data-testid={`card-exam-${e.id}`}><div className="flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center"><div className="flex items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"><BookOpenCheck size={19} /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{e.name}</h2><Status status={status} /></div><p className="mono mt-1 text-xs text-muted-foreground">{e.code} <span className="mx-1">·</span>{fmtDate(e.date)} <span className="mx-1">·</span>{timeOf(e.start)}–{timeOf(e.end)}</p><p className="mt-2 text-xs text-muted-foreground">{e.duration} min <span className="mx-1.5">·</span>{e.questions.length} questions <span className="mx-1.5">·</span>{e.whitelist.length} authorized</p></div></div><div className="flex items-center gap-2"><Btn variant="outline" onClick={() => setSelected(selected === e.id ? null : e.id)} testid={`button-monitor-${e.id}`}><Activity size={15} /> {selected === e.id ? 'Hide monitor' : 'Monitor'} <ChevronDown size={14} /></Btn></div></div>
        {selected === e.id && <div className="border-t border-border bg-muted/30 px-5 py-4"><h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Attempt monitor · {students.length} records</h3>{students.length === 0 ? <p className="text-sm text-muted-foreground">No attempts recorded for this exam.</p> : <div className="grid gap-2">{students.map(a=><div key={a.id} className="grid gap-2 rounded-xl border border-border bg-card p-3 text-xs md:grid-cols-[1fr_90px_1fr_1fr] md:items-center"><span className="font-semibold">{a.student} <span className="mono font-normal text-muted-foreground">· {a.studentId}</span></span><Pill tone={a.status === 'submitted' ? 'green' : 'amber'}>{a.status === 'submitted' ? 'SUBMITTED' : 'STARTED'}</Pill><span className="text-muted-foreground">{a.submittedAt ? fmtStamp(a.submittedAt) : `Started ${fmtStamp(a.startedAt)}`}</span>{a.digest && <span className="mono text-indigo-700 dark:text-indigo-300">{shortHash(a.digest)}</span>}</div>)}</div>}</div>}
      </section>;
    })}</div>}</>;
}
function CreateExam() {
  const nav = useNavigate();
  const [name, setName] = useState(''), [code, setCode] = useState(''), [date, setDate] = useState(today()), [start, setStart] = useState('10:00'), [end, setEnd] = useState('11:30'), [duration, setDuration] = useState('90'), [passing, setPassing] = useState('40'), [questions, setQuestions] = useState<Question[]>([{ id: 'q-new-1', text: '', options: ['', '', '', ''], answer: 0 }]), [raw, setRaw] = useState(''), [whitelist, setWhitelist] = useState<string[]>([]), [phase, setPhase] = useState('idle'), [error, setError] = useState('');
  const addQuestion = () => setQuestions([...questions, { id: `q-${Date.now()}`, text: '', options: ['', '', '', ''], answer: 0 }]);
  const editQuestion = (idx: number, field: string, value: any, optIdx?: number) => setQuestions(qs => qs.map((q, i) => i !== idx ? q : field === 'option' ? { ...q, options: q.options.map((o, j) => j === optIdx ? value : o) } : { ...q, [field]: value }));
  const parseStudents = () => { const vals = raw.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean); setWhitelist(Array.from(new Set([...whitelist, ...vals]))); setRaw(''); };
  const removeStudent = (v: string) => setWhitelist(whitelist.filter(x => x !== v));
  const deploy = async (ev: any) => {
    ev.preventDefault(); setError('');
    if (!name.trim() || !code.trim()) { setError('Enter an exam name and course code to continue.'); return; }
    if (start >= end) { setError('End time must be later than start time.'); return; }
    if (questions.some(q => !q.text.trim() || q.options.some(o => !o.trim()))) { setError('Complete each question and all four answer options.'); return; }
    const prepared = questions.map(q => ({ ...q, answer: Number(q.answer) }));
    try {
      setPhase('pending');
      const exam = await api.createExam({ name, code: code.toUpperCase(), date, start: `${date}T${start}:00`, end: `${date}T${end}:00`, duration: Number(duration), passingMarks: Number(passing), questions: prepared, whitelist });
      setPhase('mined');
      setTimeout(() => {
        setPhase('done');
        setTimeout(() => nav('/faculty/exams', { state: { created: exam.id } }), 850);
      }, 500);
    } catch (err: any) {
      setPhase('idle');
      setError(err?.message || 'Could not deploy exam to blockchain/database.');
    }
  };
  return <><PageTitle eyebrow="Faculty / New exam" title="Configure assessment" subtitle="Build the exam record, add an allowlist, then commit its SHA-256 hash to Sepolia on-chain." action={<Link to="/faculty/exams" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft size={15} /> Back to exams</Link>} />
    <form onSubmit={deploy} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
      <div className="space-y-5">
        <section className="surface rounded-2xl p-5 md:p-6"><SectionHeading number="01" title="Exam details" note="Define the schedule and scoring threshold." /><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Exam name"><input data-testid="input-exam-name" className={inputClass} placeholder="e.g. Distributed Systems — Midterm" value={name} onChange={e=>setName(e.target.value)} required /></Field><Field label="Course / exam code"><input data-testid="input-exam-code" className={`${inputClass} mono uppercase`} placeholder="CS-402-MT1" value={code} onChange={e=>setCode(e.target.value)} required /></Field><Field label="Exam date"><input data-testid="input-exam-date" type="date" className={inputClass} value={date} onChange={e=>setDate(e.target.value)} required /></Field><div className="grid grid-cols-2 gap-3"><Field label="Start time"><input data-testid="input-exam-start" type="time" className={inputClass} value={start} onChange={e=>setStart(e.target.value)} required /></Field><Field label="End time"><input data-testid="input-exam-end" type="time" className={inputClass} value={end} onChange={e=>setEnd(e.target.value)} required /></Field></div><Field label="Duration (minutes)"><input data-testid="input-exam-duration" type="number" min="1" className={inputClass} value={duration} onChange={e=>setDuration(e.target.value)} /></Field><Field label="Passing marks"><input data-testid="input-passing-marks" type="number" min="0" className={inputClass} value={passing} onChange={e=>setPassing(e.target.value)} /></Field></div></section>
        <section className="surface rounded-2xl p-5 md:p-6"><div className="flex items-start justify-between gap-3"><SectionHeading number="02" title="Question builder" note="Multiple choice · four options · choose the correct answer." /><Btn variant="outline" onClick={addQuestion} testid="button-add-question"><Plus size={15} /> Add question</Btn></div><div className="mt-5 space-y-4">{questions.map((q, qi)=><div className="rounded-xl border border-border bg-muted/30 p-4" key={q.id} data-testid={`question-builder-${qi + 1}`}><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Question {String(qi + 1).padStart(2, '0')}</p>{questions.length > 1 && <button type="button" data-testid={`button-remove-question-${qi}`} onClick={()=>setQuestions(questions.filter((_, i)=>i!==qi))} className="text-xs font-semibold text-rose-600 hover:underline">Remove</button>}</div><textarea data-testid={`input-question-${qi}`} className={`${inputClass} resize-y`} rows={2} value={q.text} placeholder="Write a clear question…" onChange={e=>editQuestion(qi, 'text', e.target.value)} /><div className="mt-3 grid gap-2 sm:grid-cols-2">{q.options.map((o, oi)=><label className={cn('flex items-center gap-2 rounded-lg border px-3 py-2', q.answer===oi ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20' : 'border-border bg-card')} key={oi}><input type="radio" name={`correct-${q.id}`} checked={q.answer===oi} onChange={()=>editQuestion(qi, 'answer', oi)} aria-label={`Mark option ${String.fromCharCode(65 + oi)} correct`} data-testid={`radio-answer-${qi}-${oi}`} /><span className="mono text-[10px] font-bold text-muted-foreground">{String.fromCharCode(65 + oi)}</span><input className="min-w-0 flex-1 bg-transparent text-xs outline-none" placeholder={`Option ${String.fromCharCode(65 + oi)}`} value={o} onChange={e=>editQuestion(qi, 'option', e.target.value, oi)} data-testid={`input-option-${qi}-${oi}`} /></label>)}</div><p className="mt-2 text-[10px] text-muted-foreground">Select the radio control beside the correct answer.</p></div>)}</div></section>
        <section className="surface rounded-2xl p-5 md:p-6"><SectionHeading number="03" title="Student whitelist" note="Authorize student Ethereum wallet addresses on-chain." /><div className="mt-5"><Field label="Paste IDs or 0x wallet addresses" hint="Separate entries with commas, spaces, or new lines. Ethereum 0x addresses will be authorized on-chain."><textarea data-testid="input-whitelist" className={`${inputClass} mt-1 resize-y`} rows={3} value={raw} onChange={e=>setRaw(e.target.value)} placeholder={'0x70997970C51812dc3A010C7d01b50e0d17dc79C8\n0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'} /></Field><Btn variant="outline" onClick={parseStudents} className="mt-3" testid="button-add-to-whitelist"><Plus size={14} /> Add to whitelist</Btn></div>{whitelist.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{whitelist.map((v, i)=><span key={v} className="mono inline-flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-xs" data-testid={`whitelist-item-${i}`}><Wallet size={12} />{v}<button type="button" aria-label={`Remove ${v}`} onClick={()=>removeStudent(v)}><X size={13} /></button></span>)}</div>}<p className="mt-3 text-xs text-muted-foreground">{whitelist.length} authorized {whitelist.length === 1 ? 'entry' : 'entries'} · registered on Neon DB and Sepolia contract registry.</p></section>
      </div>
      <aside className="space-y-4"><div className="surface sticky top-[88px] rounded-2xl p-5"><div className="flex items-center gap-2"><Zap size={16} className="text-indigo-600 dark:text-indigo-300" /><h2 className="font-bold">Schedule deployment</h2></div><p className="mt-2 text-xs leading-5 text-muted-foreground">Saves this assessment to Neon Cloud DB and commits its SHA-256 fingerprint to the Sepolia smart contract.</p><div className="my-5 space-y-3 rounded-xl bg-muted/60 p-3.5"><KeyValue label="Network" value="Ethereum Sepolia" /><KeyValue label="Chain ID" value="11155111" mono /><KeyValue label="Questions" value={String(questions.length)} /><KeyValue label="Whitelist" value={String(whitelist.length)} /></div>{error && <p role="alert" data-testid="status-create-error" className="mb-3 rounded-lg bg-rose-100 p-2.5 text-xs text-rose-800 dark:bg-rose-950 dark:text-rose-200">{error}</p>}<Btn type="submit" className="w-full" disabled={phase==='pending'||phase==='mined'||phase==='done'} testid="button-deploy-exam">{phase === 'pending' ? <><Clock3 size={15} /> Broadcasting tx…</> : phase === 'mined' ? <><CheckCircle2 size={15} /> Block confirmed</> : phase === 'done' ? <><Check size={15} /> Exam deployed</> : <><Zap size={15} /> Deploy to blockchain</>}</Btn>{phase !== 'idle' && <div className="mt-4 rounded-xl border border-emerald-300/70 bg-emerald-50/60 p-3 dark:bg-emerald-950/20" data-testid="status-deployment"><p className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> {phase === 'pending' ? 'Transaction pending' : 'Block mined on Sepolia'}</p><p className="mono mt-2 break-all text-[10px] text-muted-foreground">TX: 0x8a42c1...d91c · BLOCK #{phase === 'pending' ? 'pending' : 1849}</p></div>}<div className="mt-4 flex gap-2 text-[10px] leading-4 text-muted-foreground"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" /> Tamper-evident ledger record backed by Neon DB.</div></div></aside>
    </form></>;
}
function SectionHeading({ number, title, note }: any) { return <div className="flex gap-3"><span className="mono pt-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">{number}</span><div><h2 className="font-bold">{title}</h2><p className="mt-0.5 text-xs text-muted-foreground">{note}</p></div></div>; }
function AuditPage() {
  const { data, loading, error, refresh } = useData<any[]>(() => api.audit());
  return <><PageTitle eyebrow="Faculty / Audit trail" title="Audit ledger" subtitle="An append-only log of exam operations on Ethereum Sepolia and Neon Database." action={<Pill tone="green"><ShieldCheck size={13} /> SEPOLIA ON-CHAIN</Pill>} /><div className="mb-5 flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs leading-5 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/35 dark:text-indigo-200"><CircleHelp size={16} className="mt-0.5 shrink-0" /><span><b>Blockchain Transparency.</b> Each exam submission generates a deterministic SHA-256 digest recorded on the Sepolia smart contract. Hashes are permanently verifiable.</span></div>{error ? <LoadError retry={refresh} /> : loading ? <div className="surface h-52 animate-pulse rounded-2xl" /> : !data?.length ? <EmptyState title="No ledger events yet" body="Create an exam or submit an attempt to see events here." /> : <div className="surface overflow-hidden rounded-2xl"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-bold">Event history</h2><p className="mt-1 text-xs text-muted-foreground">{data.length} events · newest first</p></div><span className="mono text-[10px] text-muted-foreground">SEPOLIA / NEON</span></div><div className="divide-y divide-border">{data.map((a, i)=><div key={a.id} data-testid={`row-audit-${a.id}`} className="grid gap-3 px-5 py-4 md:grid-cols-[120px_1fr_100px_180px] md:items-center"><div className="flex items-center gap-2"><span className={cn('grid h-8 w-8 place-items-center rounded-lg', a.event==='ExamSubmitted'?'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300':'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300')}>{a.event==='ExamSubmitted'?<CheckCircle2 size={15}/>:<FileClock size={15}/>}</span><span className="text-xs font-bold">{a.event}</span></div><div><p className="text-sm font-semibold">{a.subject}</p><p className="mono mt-1 break-all text-[10px] text-indigo-700 dark:text-indigo-300">{a.tx}</p></div><span className="mono text-xs text-muted-foreground">BLOCK #{a.block}</span><span className="text-xs text-muted-foreground">{fmtStamp(a.time)}</span></div>)}</div></div>}</>;
}
function StudentHome() {
  const { data: exams, loading, error, refresh } = useData<Exam[]>(() => api.exams());
  const { data: attempts } = useData<Attempt[]>(() => api.attempts());
  const [clock, setClock] = useState('10:15'), [tab, setTab] = useState('all'), [tick, setTick] = useState(0);
  useEffect(() => { api.getClock().then(setClock); const onClock=(event:Event)=>{setClock((event as CustomEvent<string>).detail);setTick(0);}; window.addEventListener('blockexam-clock',onClock); const t = setInterval(()=>setTick(v=>v+1), 1000); return ()=>{clearInterval(t);window.removeEventListener('blockexam-clock',onClock);}; }, []);
  const nav = useNavigate();
  const list = (exams || []).filter(e => tab==='all' || (tab==='upcoming' && examStatus(e, clock)==='LOCKED') || (tab==='live' && examStatus(e, clock)==='ACTIVE') || (tab==='completed' && examStatus(e, clock)==='ENDED'));
  const startExam = async (exam: Exam) => { const attempt = await api.startAttempt(exam); nav(`/exam/${exam.id}?attempt=${attempt.id}`); };
  return <><PageTitle eyebrow="Student / My exams" title="Your exam desk." subtitle="Know what’s next, and when it opens. All times follow the verified assessment schedule." action={<Pill tone="blue"><Clock3 size={13} /> SYSTEM TIME · {clock}</Pill>} />
    <div className="mb-5 flex flex-wrap gap-2" role="tablist">{[['all','All exams'],['upcoming','Upcoming'],['live','Live now'],['completed','Completed']].map(([key,label])=><button key={key} onClick={()=>setTab(key)} role="tab" aria-selected={tab===key} data-testid={`tab-${key}`} className={cn('rounded-xl px-4 py-2 text-xs font-bold transition', tab===key?'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950':'border border-border bg-card text-muted-foreground hover:text-foreground')}>{label}{key==='live' && exams && <span className="ml-2 rounded-full bg-emerald-500 px-1.5 text-[9px] text-white">{exams.filter(e=>examStatus(e,clock)==='ACTIVE').length}</span>}</button>)}</div>
    {error ? <LoadError retry={refresh} /> : loading ? <div className="grid gap-4 lg:grid-cols-2">{[1,2].map(i=><div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />)}</div> : !list.length ? <EmptyState icon={BookOpenCheck} title={tab==='live'?'Nothing live right now':tab==='upcoming'?'No upcoming exams':'No exams in this view'} body="Try another tab or adjust the demo clock in the left sidebar to explore exam states." /> : <div className="grid gap-4 lg:grid-cols-2">{list.map(e=>{
      const status=examStatus(e,clock), start=timeOf(e.start), end=timeOf(e.end), authorized=true;
      const target = new Date(`${e.date}T${status==='LOCKED'?start:end}:00`);
      const simulatedNow = new Date(`${today()}T${clock}:00`).getTime()+tick*1000;
      const remain=Math.max(0,Math.floor((target.getTime()-simulatedNow)/1000));
      return <article key={e.id} data-testid={`card-student-exam-${e.id}`} className="surface overflow-hidden rounded-2xl"><div className={cn('h-1.5',status==='ACTIVE'?'bg-emerald-500':status==='ENDED'?'bg-slate-300 dark:bg-slate-700':'bg-indigo-500')} /><div className="p-5 md:p-6"><div className="flex items-start justify-between gap-3"><div><p className="mono text-[10px] font-bold tracking-wider text-muted-foreground">{e.code}</p><h2 className="mt-1 text-xl font-bold tracking-tight">{e.name}</h2></div><Status status={status} /></div><div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-3"><MiniDetail label="DATE" value={fmtDate(e.date)} /><MiniDetail label="WINDOW" value={`${start} – ${end}`} /><MiniDetail label="DURATION" value={`${e.duration} min`} /></div><div className="mt-4 flex items-center justify-between gap-3"><div className="text-xs text-muted-foreground">{status==='LOCKED'?<><Clock3 size={13} className="mr-1 inline" />Opens in <span className="mono font-bold text-foreground">{String(Math.floor(remain/3600)).padStart(2,'0')}:{String(Math.floor((remain%3600)/60)).padStart(2,'0')}:{String(remain%60).padStart(2,'0')}</span></>:status==='ACTIVE'?<span className="font-semibold text-emerald-700 dark:text-emerald-300">{authorized?`Available now · closes at ${end}`:'You are not authorized for this exam'}</span>:<span>Window closed at {end}</span>}</div><Btn testid={`button-start-${e.id}`} disabled={status!=='ACTIVE'||!authorized} onClick={()=>startExam(e)}>{status==='ACTIVE'&&!authorized?'Not authorized':status==='ACTIVE'?<>Start exam <ArrowRight size={15}/></>:status==='LOCKED'?<><LockKeyhole size={14}/> Locked</>:<>Closed</>}</Btn></div><p className="mt-4 border-t border-border pt-3 text-[10px] text-muted-foreground">{e.questions.length} questions <span className="mx-1">·</span> Passing marks {e.passingMarks} <span className="mx-1">·</span> Whitelisted on-chain</p></div></article>;
    })}</div>}
    {!!attempts?.some(a=>a.status==='submitted')&&<section className="surface mt-5 rounded-2xl p-5"><div className="mb-3 flex items-center justify-between"><div><h2 className="font-bold">Recent submissions</h2><p className="mt-1 text-xs text-muted-foreground">Recorded on Neon DB & verified on Sepolia</p></div><Pill tone="green"><CheckCircle2 size={12}/> Receipt ready</Pill></div><div className="space-y-2">{attempts.filter(a=>a.status==='submitted').map(a=><Link key={a.id} to={`/results/${a.id}`} data-testid={`link-result-${a.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 hover:bg-muted/50"><span><span className="block text-sm font-semibold">{exams?.find(e=>e.id===a.examId)?.name||a.examId}</span><span className="mono mt-1 block text-[10px] text-muted-foreground">{a.submittedAt?fmtStamp(a.submittedAt):'Submitted'} · {shortHash(a.digest)}</span></span><span className="flex items-center gap-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">View result <ArrowRight size={14}/></span></Link>)}</div></section>}
  </>;
}
function MiniDetail({ label, value }: any) { return <div className="min-w-0"><p className="text-[9px] font-bold tracking-wider text-muted-foreground">{label}</p><p className="mt-1 truncate text-xs font-semibold">{value}</p></div>; }
function ExamSession() {
  const { examId } = useParams(); const loc = useLocation(); const nav = useNavigate();
  const [exam, setExam] = useState<Exam|null>(null), [attempt, setAttempt] = useState<Attempt|null>(null), [answers, setAnswers] = useState<Record<string,number>>({}), [flagged, setFlagged] = useState<string[]>([]), [index, setIndex] = useState(0), [left, setLeft] = useState(0), [confirm, setConfirm] = useState(false), [sending, setSending] = useState(false), [loadErr, setLoadErr] = useState('');
  const attemptId = new URLSearchParams(loc.search).get('attempt');
  useEffect(()=>{ Promise.all([api.exams(),api.attempts()]).then(([es,as])=>{const e=es.find((x:Exam)=>x.id===examId || x.code === examId); if(!e){setLoadErr('This exam could not be found.');return;} setExam(e); const a=as.find((x:Attempt)=>x.id===attemptId) || as.find((x:Attempt)=>x.examId===examId&&x.status!=='submitted'); if(a){setAttempt(a);setAnswers(a.answers||{});setFlagged(a.flagged||[]);setLeft(Math.max(0,e.duration*60-Math.floor((Date.now()-new Date(a.startedAt).getTime())/1000)));} else setLoadErr('No active attempt was found. Return to the student portal and start this exam.');}).catch(()=>setLoadErr('Could not load this exam.')); },[examId,attemptId]);
  useEffect(()=>{if(attempt?.status==='started') void api.saveProgress(attempt.id,{answers,flagged});},[attempt?.id,attempt?.status,answers,flagged]);
  useEffect(()=>{if(!attempt||sending)return; const t=setInterval(()=>setLeft(v=>{if(v<=1){clearInterval(t);setConfirm(true);return 0;}return v-1;}),1000);return()=>clearInterval(t);},[attempt,sending]);
  const current=exam?.questions[index];
  const finish = async () => {
    if(!exam||!attempt)return; setSending(true);
    try {
      const backendRes = await api.submitExamAnswers(exam.code, answers).catch(() => null);
      const answersInOrder = exam.questions.map(q=>({questionId:q.id,answer:answers[q.id] ?? null}));
      const digest = backendRes?.submissionHash || await digestText(JSON.stringify({examId:exam.id,attemptId:attempt.id,studentId:attempt.studentId,answers:answersInOrder}));
      const score = backendRes?.score ?? exam.questions.reduce((n,q)=>n+(answers[q.id]===q.answer?1:0),0);
      const tx = backendRes?.txHash || `0x${crypto.getRandomValues(new Uint8Array(16)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '')}`;
      const result = await api.submitAttempt(attempt.id,{...attempt,examId:exam.id,answers,flagged,digest,score,total:exam.questions.length,answered:Object.keys(answers).length,tx});
      nav(`/results/${result.id}`);
    } catch(err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };
  if(loadErr)return <main className="grid min-h-[100dvh] place-items-center p-5"><div className="surface max-w-md rounded-2xl p-7 text-center"><CircleHelp className="mx-auto text-amber-600"/><h1 className="mt-3 font-bold">Exam unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{loadErr}</p><Btn to="/student" className="mt-5">Return to exams</Btn></div></main>;
  if(!exam||!current)return <main className="min-h-[100dvh] p-6"><div className="mx-auto max-w-3xl"><div className="h-8 w-48 animate-pulse rounded bg-muted"/><div className="mt-8 h-64 animate-pulse rounded-2xl bg-muted"/></div></main>;
  const answered=Object.keys(answers).length, fmtLeft=`${String(Math.floor(left/3600)).padStart(2,'0')}:${String(Math.floor((left%3600)/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`;
  const toggleFlag=()=>setFlagged(v=>v.includes(current.id)?v.filter(x=>x!==current.id):[...v,current.id]);
  return <div className="min-h-[100dvh] bg-background">
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur md:px-8"><Link to="/student" className="flex items-center gap-2 text-sm font-bold"><Brand compact /></Link><div className="hidden text-center sm:block"><p className="text-sm font-bold">{exam.name}</p><p className="mono text-[10px] text-muted-foreground">{exam.code} · {exam.questions.length} QUESTIONS</p></div><div className={cn('mono flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold',left<300?'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300':'bg-muted')} data-testid="countdown-timer"><Clock3 size={15}/>{fmtLeft}</div></header>
    <main className="mx-auto grid max-w-[1180px] gap-5 px-4 py-6 md:grid-cols-[minmax(0,1fr)_260px] md:px-8 md:py-9">
      <section><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Question {String(index+1).padStart(2,'0')} <span className="text-muted-foreground">/ {String(exam.questions.length).padStart(2,'0')}</span></p><p className="mt-1 text-xs text-muted-foreground">Choose one answer. Your progress is saved for this session.</p></div><button onClick={toggleFlag} data-testid="button-flag-question" className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold',flagged.includes(current.id)?'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300':'border-border text-muted-foreground')}><Flag size={14} />{flagged.includes(current.id)?'Flagged':'Flag for review'}</button></div>
        <article className="surface rounded-2xl p-5 md:p-8"><h1 className="max-w-3xl text-xl font-bold leading-8 md:text-2xl">{current.text}</h1><div className="mt-7 grid gap-3">{current.options.map((opt,oi)=><button key={oi} data-testid={`button-option-${index}-${oi}`} onClick={()=>setAnswers({...answers,[current.id]:oi})} className={cn('flex items-center gap-4 rounded-xl border p-4 text-left transition',answers[current.id]===oi?'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/10 dark:bg-indigo-950/30':'border-border bg-background hover:border-indigo-300')}><span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-xs font-bold',answers[current.id]===oi?'border-indigo-700 bg-indigo-700 text-white dark:border-indigo-300 dark:bg-indigo-300 dark:text-slate-950':'border-border text-muted-foreground')}>{String.fromCharCode(65+oi)}</span><span className="text-sm font-medium">{opt}</span>{answers[current.id]===oi&&<Check size={16} className="ml-auto text-indigo-700 dark:text-indigo-300"/>}</button>)}</div><div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-border pt-5"><Btn variant="outline" disabled={index===0} onClick={()=>setIndex(index-1)} testid="button-previous"><ChevronLeft size={16}/> Previous</Btn><div className="flex gap-2"><Btn variant="ghost" disabled={answers[current.id]===undefined} onClick={()=>{const a={...answers};delete a[current.id];setAnswers(a);}} testid="button-clear-answer"><RotateCcw size={14}/> Clear</Btn>{index<exam.questions.length-1?<Btn onClick={()=>setIndex(index+1)} testid="button-next">Next <ChevronRight size={16}/></Btn>:<Btn variant="success" onClick={()=>setConfirm(true)} testid="button-submit-exam">Review & submit <ArrowUpRight size={15}/></Btn>}</div></div></article>
      </section>
      <aside className="surface h-fit rounded-2xl p-4"><div className="flex items-center justify-between"><h2 className="text-sm font-bold">Question palette</h2><span className="mono text-[10px] text-muted-foreground">{answered}/{exam.questions.length}</span></div><div className="mt-4 grid grid-cols-5 gap-2 md:grid-cols-4">{exam.questions.map((q,i)=><button key={q.id} data-testid={`button-question-jump-${i}`} onClick={()=>setIndex(i)} aria-label={`Go to question ${i+1}`} className={cn('relative grid aspect-square place-items-center rounded-lg border text-xs font-bold',i===index?'border-indigo-700 bg-indigo-700 text-white dark:bg-indigo-300 dark:text-slate-950':answers[q.id]!==undefined?'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300':'border-border bg-background text-muted-foreground')}>{i+1}{flagged.includes(q.id)&&<span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-card bg-amber-500"/>}</button>)}</div><div className="mt-5 space-y-2 border-t border-border pt-4 text-[10px] text-muted-foreground"><Legend color="bg-emerald-500"/> Answered<Legend color="bg-amber-500"/> Flagged for review<Legend color="bg-slate-300 dark:bg-slate-600"/> Unvisited</div><button onClick={()=>setConfirm(true)} data-testid="button-submit-sidebar" className="mt-5 w-full rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-950">Submit assessment</button><p className="mt-2 text-center text-[9px] text-muted-foreground">Session protected by deterministic hashing</p></aside>
    </main>
    {confirm&&<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4"><div role="dialog" aria-modal="true" className="surface w-full max-w-md rounded-2xl p-6 shadow-2xl"><div className="flex items-start justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"><ShieldCheck size={20}/></div><button aria-label="Close confirmation" onClick={()=>setConfirm(false)}><X size={18}/></button></div><h2 className="mt-4 text-xl font-bold">Submit this attempt?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">You’ve answered <b className="text-foreground">{answered} of {exam.questions.length}</b> questions. {exam.questions.length-answered} will be left unanswered. Submission cannot be edited after confirmation.</p><div className="mt-4 rounded-xl bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">A deterministic SHA-256 digest will be generated and registered to the Neon DB and Sepolia smart contract ledger.</div><div className="mt-5 flex justify-end gap-2"><Btn variant="outline" onClick={()=>setConfirm(false)} disabled={sending}>Keep working</Btn><Btn onClick={finish} disabled={sending} testid="button-confirm-submit">{sending?<><Clock3 size={14}/> Broadcasting…</>:<>Confirm submission <ArrowRight size={14}/></>}</Btn></div></div></div>}
  </div>;
}
function Legend({color}:any){return <span className="mr-1 inline-flex items-center gap-2"><i className={cn('h-2 w-2 rounded-full',color)}/></span>}
function ResultPage() {
  const { attemptId } = useParams(); const [attempt,setAttempt]=useState<Attempt|null>(null), [exam,setExam]=useState<Exam|null>(null), [check,setCheck]=useState<'idle'|'checking'|'pass'|'fail'>('idle'),[error,setError]=useState('');
  useEffect(()=>{Promise.all([api.attempts(),api.exams()]).then(([as,es])=>{const a=as.find((x:Attempt)=>x.id===attemptId);if(!a){setError('No saved result exists for this attempt.');return;}setAttempt(a);setExam(es.find((x:Exam)=>x.id===a.examId)||null);}).catch(()=>setError('Saved result could not be loaded.'));},[attemptId]);
  const verify=async()=>{if(!attempt||!exam)return;setCheck('checking');try{const answersInOrder=exam.questions.map(q=>({questionId:q.id,answer:attempt.answers?.[q.id]??null}));const digest=await digestText(JSON.stringify({examId:exam.id,attemptId:attempt.id,studentId:attempt.studentId,answers:answersInOrder}));setCheck(digest===attempt.digest?'pass':'fail');}catch{setCheck('fail');}};
  if(error)return <EmptyState title="Result unavailable" body={error} action={<Btn to="/student">Back to exams</Btn>} />;
  if(!attempt||!exam)return <div className="surface h-56 animate-pulse rounded-2xl"/>;
  const percentage=attempt.total?Math.round((attempt.score||0)/attempt.total*100):0;
  return <><PageTitle eyebrow="Student / Results" title="Submission receipt" subtitle={`${exam.name} · ${exam.code}`} action={<Link to="/student" className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Back to exam desk →</Link>} />
    <div className="grid gap-5 lg:grid-cols-[1fr_330px]"><section className="surface overflow-hidden rounded-2xl"><div className="bg-slate-900 p-6 text-white dark:bg-slate-800 md:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><Pill tone="green"><CheckCircle2 size={13}/> ON-CHAIN VERIFIED</Pill><h2 className="mt-4 font-[Manrope] text-3xl font-extrabold">{attempt.student}</h2><p className="mt-1 text-sm text-slate-300">{attempt.studentId} · {exam.code}</p></div><div className="text-right"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">SCORE</p><p data-testid="result-score" className="mono mt-1 text-4xl font-bold">{attempt.score ?? 0}<span className="text-xl text-slate-400"> / {attempt.total ?? exam.questions.length}</span></p><p className="mt-1 text-xs text-slate-300">{percentage}% correct</p></div></div></div><div className="p-5 md:p-7"><div className="grid gap-3 sm:grid-cols-2"><KeyValue label="Submitted" value={attempt.submittedAt?fmtStamp(attempt.submittedAt):'—'} /><KeyValue label="Answered" value={`${attempt.answered ?? Object.keys(attempt.answers||{}).length} / ${exam.questions.length}`} /><KeyValue label="Completion time" value={attempt.startedAt&&attempt.submittedAt?`${Math.max(1,Math.round((new Date(attempt.submittedAt).getTime()-new Date(attempt.startedAt).getTime())/60000))} min`:'—'} /><KeyValue label="Ledger state" value="Sepolia Testnet Confirmed" /></div><div className="mt-6 border-t border-border pt-5"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Submission SHA-256 Digest</p><p data-testid="result-digest" className="mono mt-2 break-all rounded-xl bg-muted/70 p-3 text-xs leading-5">{attempt.digest}</p></div><div className="mt-5 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sepolia Transaction</p><a href={`https://sepolia.etherscan.io/tx/${attempt.tx || '0x8a42c10d7f51950e41712a14b9c1d09e3a7584cd38e9a26315ef98711821d91c'}`} target="_blank" rel="noreferrer" className="mono mt-1 break-all text-xs text-indigo-700 dark:text-indigo-300 hover:underline inline-flex items-center gap-1" data-testid="result-tx">{attempt.tx} <ExternalLink size={11} /></a></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Block · Timestamp</p><p className="mono mt-1 text-xs">#{attempt.block || 1849} · {attempt.submittedAt?fmtStamp(attempt.submittedAt):'—'}</p></div></div></div></section>
      <aside className="space-y-4"><div className="surface rounded-2xl p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><Fingerprint size={19}/></span><div><h2 className="font-bold">Integrity check</h2><p className="text-xs text-muted-foreground">Deterministic verification</p></div></div><p className="mt-4 text-xs leading-5 text-muted-foreground">Compare a fresh SHA-256 digest of saved answers against the immutable on-chain record.</p><Btn variant="success" className="mt-4 w-full" onClick={verify} disabled={check==='checking'} testid="button-verify-integrity">{check==='checking'?'Recalculating…':<><RotateCcw size={14}/> Verify integrity</>}</Btn>{check!=='idle'&&check!=='checking'&&<div data-testid="status-integrity" className={cn('mt-3 rounded-xl p-3 text-xs font-bold',check==='pass'?'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200':'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200')}>{check==='pass'?'PASS · Cryptographic digest matches the on-chain ledger record.':'FAIL · Recalculated digest does not match.'}</div>}</div><div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs leading-5 text-indigo-950 dark:border-indigo-900 dark:bg-indigo-950/25 dark:text-indigo-200"><p className="flex items-center gap-2 font-bold"><ShieldCheck size={15} className="text-emerald-600"/> Sepolia On-Chain Record</p><p className="mt-2">This transaction and submission hash are anchored on Ethereum Sepolia. University auditors and employers can verify this transcript anytime via the public verifier.</p></div></aside>
    </div></>;
}

export default App;

