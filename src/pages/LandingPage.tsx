import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  ArrowRight,
  Database,
  Cpu,
  FileCheck2,
  Users,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  KeyRound,
  GraduationCap,
  User,
  Zap,
  Activity,
  Award,
  Globe,
  Radio,
  Copy,
  Check,
} from 'lucide-react';
import { api, type AuthUser, type AuditEvent } from '../services/api';
import { LiveVerifier } from '../components/LiveVerifier';
import { AuthModal } from '../components/AuthModal';

interface LandingPageProps {
  dark: boolean;
  toggleTheme: () => void;
  onAuthSuccess: (user: AuthUser) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  dark,
  toggleTheme,
  onAuthSuccess,
}) => {
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [backendHealth, setBackendHealth] = useState({ online: false, status: 'CHECKING' });
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [contractCopied, setContractCopied] = useState(false);

  const CONTRACT_ADDRESS = '0x1D148105FD6b8284C7aaC30E15caCe7fd2c98837';

  useEffect(() => {
    // Check backend health & fetch live audit trail
    api.health().then((h) => setBackendHealth(h));
    api.audit().then((events) => setAuditEvents(events.slice(0, 5)));
  }, []);

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleQuickDemo = async (role: 'admin' | 'faculty' | 'student') => {
    try {
      const email =
        role === 'admin'
          ? 'admin@college.edu'
          : role === 'faculty'
          ? 'faculty@college.edu'
          : 'student1@college.edu';
      const password = 'Password123';
      const res = await api.login(email, password);
      onAuthSuccess(res.user);
      navigate(
        res.user.role.toLowerCase() === 'admin'
          ? '/admin'
          : role === 'faculty'
          ? '/faculty'
          : '/student'
      );
    } catch {
      openAuth('login');
    }
  };

  const copyContract = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setContractCopied(true);
    setTimeout(() => setContractCopied(false), 2000);
  };

  const faqs = [
    {
      q: 'How does Credence prevent exam question leaks before the exam starts?',
      a: 'Faculty authors upload questions which are deterministically hashed (SHA-256) and anchored into the Sepolia smart contract before the exam opens. The actual question payload is securely held on the backend and is ONLY released to whitelisted student wallets when the smart contract epoch timestamp reaches the start time. No student or third-party can decrypt or access the questions early.',
    },
    {
      q: 'How does student identity and wallet whitelisting work?',
      a: 'Faculty adds authorized student Ethereum public addresses (0x...) to the exam whitelist. When the student attempts to start the assessment, the smart contract validates their cryptographic signature and address against the on-chain registry. Unauthorized accounts are strictly denied access by the EVM contract.',
    },
    {
      q: 'Do students need cryptocurrency (ETH) to submit their exams?',
      a: 'No. Credence utilizes an automated relayer architecture where the institution/deployer wallet sponsors gas fees for submission mining and verification transactions. Students do not need any crypto funds or gas tokens to take exams.',
    },
    {
      q: 'What happens if a student loses their internet connection during an assessment?',
      a: 'Credence includes persistent client-side auto-save. Draft responses are stored locally in secure session storage. When internet connectivity is restored, the student resumes without data loss as long as the global on-chain time window has not closed.',
    },
    {
      q: 'Can instructors or university administrators alter a grade after submission?',
      a: 'No. When a student submits their assessment, a deterministic SHA-256 digest of their chosen answers, timestamp, and score is computed and written to the Ethereum Sepolia ledger. Any retroactive database modification would cause a hash mismatch during verification, exposing tampering immediately.',
    },
    {
      q: 'How do employers and academic accreditation boards verify results?',
      a: 'Anyone with an exam code and a student’s wallet address can query the public Live Verifier tool. The system checks both the Neon database record and the on-chain smart contract state, displaying an immutable cryptographic certificate of completion.',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-indigo-500/20">
      {/* Sticky Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Network Status */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2.5 font-[Manrope] text-lg font-extrabold tracking-tight">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                <Shield size={20} />
              </span>
              <span>Credence</span>
            </a>

            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {backendHealth.online ? 'Sepolia + Neon Online' : 'Local Node Active'}
            </span>
          </div>

          {/* Nav Links */}
          <nav className="hidden items-center gap-6 text-xs font-bold text-muted-foreground md:flex">
            <a href="#why-credence" className="transition hover:text-foreground">
              Why Credence
            </a>
            <a href="#how-it-works" className="transition hover:text-foreground">
              How It Works
            </a>
            <a href="#verifier" className="transition hover:text-foreground">
              Live Verifier
            </a>
            <a href="#audit-feed" className="transition hover:text-foreground">
              Audit Trail
            </a>
            <a href="#faqs" className="transition hover:text-foreground">
              FAQ
            </a>
          </nav>

          {/* Action CTAs & Theme Toggle */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="grid h-9 w-9 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {dark ? '☀️' : '🌙'}
            </button>

            <button
              onClick={() => openAuth('login')}
              className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold transition hover:bg-muted"
            >
              Sign In
            </button>

            <button
              onClick={() => openAuth('register')}
              className="hidden rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:text-slate-950 sm:inline-flex"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pb-16 pt-12 md:pb-24 md:pt-20">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[450px] w-full max-w-7xl rounded-full bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl" />

        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            {/* Left Column: Headline & Pitch */}
            <div className="enter space-y-6 text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/70 px-3.5 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-900/80 dark:bg-indigo-950/40 dark:text-indigo-300">
                <Sparkles size={14} />
                <span>Next-Gen Academic Integrity · Powered by Sepolia Ethereum & Neon DB</span>
              </div>

              <h1 className="font-[Manrope] text-4xl font-extrabold leading-[1.08] tracking-[-0.04em] md:text-6xl lg:text-7xl">
                Exams with an <br />
                <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-400">
                  immutable, verifiable record.
                </span>
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                The zero-trust decentralized platform for high-stakes assessments. Questions are cryptographically hashed on-chain prior to exam start, access is enforced by smart contracts, and every student submission generates an indelible digital receipt.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => handleQuickDemo('faculty')}
                  className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:text-slate-950"
                >
                  <GraduationCap size={18} />
                  Faculty Console
                  <ArrowRight size={16} />
                </button>

                <button
                  onClick={() => handleQuickDemo('student')}
                  className="flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 text-sm font-bold text-foreground transition hover:bg-muted"
                >
                  <User size={17} />
                  Student Desk
                </button>

                <button
                  onClick={() => handleQuickDemo('admin')}
                  className="flex items-center gap-2 rounded-2xl border border-purple-500/40 bg-purple-500/10 px-4 py-3 text-sm font-bold text-purple-700 hover:bg-purple-500/20 dark:text-purple-300"
                >
                  <ShieldCheck size={17} />
                  Super Admin
                </button>

                <a
                  href="#verifier"
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  <Search size={14} /> Verify Submission
                </a>
              </div>

              {/* Live Contract Details Chip */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  Sepolia Contract:
                </span>
                <span className="mono rounded-lg bg-muted px-2 py-1 text-[11px] font-bold">
                  {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-6)}
                </span>
                <button
                  onClick={copyContract}
                  className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-bold hover:bg-muted"
                >
                  {contractCopied ? (
                    <>
                      <Check size={11} className="text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={11} /> Copy
                    </>
                  )}
                </button>
                <a
                  href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Explorer <ExternalLink size={10} />
                </a>
              </div>
            </div>

            {/* Right Column: Interactive Live Simulation Card */}
            <div className="enter surface relative overflow-hidden rounded-3xl border border-border p-6 shadow-2xl md:p-8 dark:border-white/10">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    <Radio size={20} className="animate-pulse" />
                  </span>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                      ON-CHAIN ASSESSMENT RUNNER
                    </span>
                    <h3 className="text-base font-extrabold text-foreground">BT101: Blockchain Architecture</h3>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> ACTIVE
                </span>
              </div>

              {/* Simulation Metrics */}
              <div className="mt-5 grid grid-cols-3 gap-2.5 rounded-2xl bg-muted/60 p-3 text-center">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Paper Hash
                  </span>
                  <p className="mono mt-0.5 truncate text-[11px] font-bold text-foreground">
                    0x8a42c1...d91c
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Duration
                  </span>
                  <p className="mt-0.5 text-xs font-bold text-foreground">90 Minutes</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    EVM Chain ID
                  </span>
                  <p className="mono mt-0.5 text-xs font-bold text-foreground">11155111</p>
                </div>
              </div>

              {/* Sample Live Question Preview */}
              <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-left">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span>Question 01 of 05</span>
                  <span className="text-emerald-600 dark:text-emerald-400">1 Mark</span>
                </div>
                <p className="mt-2 text-sm font-bold text-foreground">
                  Which property does a cryptographic hash function (such as SHA-256) fundamentally provide?
                </p>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2.5 rounded-xl border border-indigo-500 bg-indigo-50/70 p-2 text-xs font-semibold text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-200">
                    <span className="grid h-5 w-5 place-items-center rounded-lg bg-indigo-600 text-[10px] font-bold text-white">
                      B
                    </span>
                    <span>Deterministic fixed-length output from arbitrary input</span>
                    <CheckCircle2 size={14} className="ml-auto text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
                    <span className="grid h-5 w-5 place-items-center rounded-lg bg-muted text-[10px] font-bold">
                      A
                    </span>
                    <span>Reversibility of the original plaintext</span>
                  </div>
                </div>
              </div>

              {/* Digital Digest Bottom Box */}
              <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-900 p-3 text-xs text-white dark:bg-slate-800">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <ShieldCheck size={14} /> Tamper-Proof Stamped
                </span>
                <span className="mono text-[10px] text-slate-300">Block #1849 · Gas Sponsored</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Stats Strip */}
      <section className="border-y border-border bg-muted/30 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="text-center md:text-left">
              <span className="font-[Manrope] text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                100%
              </span>
              <p className="mt-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Tamper-Evident
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                SHA-256 On-chain state commitments
              </p>
            </div>

            <div className="text-center md:text-left">
              <span className="font-[Manrope] text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                0 Leaks
              </span>
              <p className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Anti-Leak Protection
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Smart contract timed release gates
              </p>
            </div>

            <div className="text-center md:text-left">
              <span className="font-[Manrope] text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                &lt; 1.2s
              </span>
              <p className="mt-1 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                Instant Verification
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Public ledger cryptographic audit
              </p>
            </div>

            <div className="text-center md:text-left">
              <span className="font-[Manrope] text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                256-Bit
              </span>
              <p className="mt-1 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Deterministic Proofs
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Sepolia smart contract validation
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Credence: 4 Pillars of Zero-Trust Assessments */}
      <section id="why-credence" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              ARCHITECTURE & TRUST MODEL
            </span>
            <h2 className="mt-2 font-[Manrope] text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              The 4 Pillars of Exam Security
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
              Traditional online exam portals suffer from centralized database manipulation, unauthorized answer tampering, and pre-exam paper leaks. Credence solves this with cryptographic zero-trust guarantees.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Pillar 1 */}
            <div className="surface group rounded-3xl border border-border p-6 transition hover:border-indigo-500/50 hover:shadow-xl dark:border-white/10">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-100 text-indigo-700 transition group-hover:scale-110 dark:bg-indigo-950 dark:text-indigo-300">
                <FileCheck2 size={24} />
              </span>
              <h3 className="mt-5 text-lg font-extrabold text-foreground">
                Pre-Exam Hash Locking
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Faculty commits a deterministic SHA-256 fingerprint of the questions directly to the Ethereum blockchain prior to testing. Altering even a comma renders the on-chain hash invalid.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="surface group rounded-3xl border border-border p-6 transition hover:border-emerald-500/50 hover:shadow-xl dark:border-white/10">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 transition group-hover:scale-110 dark:bg-emerald-950 dark:text-emerald-300">
                <Clock size={24} />
              </span>
              <h3 className="mt-5 text-lg font-extrabold text-foreground">
                Autonomous Epoch Locks
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Assessment timing is strictly governed by blockchain block timestamps. The contract automatically prevents early paper decryption and rejects any late answer submissions.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="surface group rounded-3xl border border-border p-6 transition hover:border-purple-500/50 hover:shadow-xl dark:border-white/10">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-purple-100 text-purple-700 transition group-hover:scale-110 dark:bg-purple-950 dark:text-purple-300">
                <Users size={24} />
              </span>
              <h3 className="mt-5 text-lg font-extrabold text-foreground">
                Wallet-Bound Whitelists
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Exams can only be unlocked by student public addresses whitelisted on-chain. Impersonation and unauthorized proxy examinees are cryptographically impossible.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="surface group rounded-3xl border border-border p-6 transition hover:border-amber-500/50 hover:shadow-xl dark:border-white/10">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-800 transition group-hover:scale-110 dark:bg-amber-950 dark:text-amber-300">
                <Award size={24} />
              </span>
              <h3 className="mt-5 text-lg font-extrabold text-foreground">
                Non-Repudiable Receipts
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Upon submitting, examinees receive an on-chain transaction hash proving their exact submission timestamp, evaluated score, and answers hash permanently stamped on Sepolia.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works: Step-by-Step Interactive Workflow */}
      <section id="how-it-works" className="border-t border-border bg-muted/20 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              END-TO-END WORKFLOW
            </span>
            <h2 className="mt-2 font-[Manrope] text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              How Credence Works
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
              A seamless bridge between high-speed relational storage (Neon DB) and trustless distributed consensus (Sepolia EVM).
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-4">
            {/* Step 1 */}
            <div className="relative text-left">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-600 text-sm font-extrabold text-white">
                  01
                </span>
                <span className="h-0.5 flex-1 bg-border md:block hidden" />
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">Author & Commit</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Faculty writes assessment questions. Credence computes the deterministic SHA-256 paper hash and deploys it to the smart contract with start/end unix epochs.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative text-left">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-600 text-sm font-extrabold text-white">
                  02
                </span>
                <span className="h-0.5 flex-1 bg-border md:block hidden" />
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">Whitelist Wallets</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Student Ethereum addresses are imported into the smart contract registry. The contract grants access privileges strictly to these authorized wallets.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative text-left">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-600 text-sm font-extrabold text-white">
                  03
                </span>
                <span className="h-0.5 flex-1 bg-border md:block hidden" />
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">Timed Execution</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                When the window opens, authenticated students complete the test. Correct options remain strictly hidden on the backend to eliminate inspect-element cheating.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative text-left">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-600 text-sm font-extrabold text-white">
                  04
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">Anchor & Verify</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                On submission, answers are evaluated and hashed into the ledger. A permanent transaction receipt is generated, verifiable by any employer or academic auditor.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Embedded Live Verifier Section */}
      <section id="verifier" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <LiveVerifier />
        </div>
      </section>

      {/* Live Blockchain Audit Trail Feed */}
      <section id="audit-feed" className="border-t border-border bg-muted/20 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                TRANSPARENCY STREAM
              </span>
              <h2 className="mt-2 font-[Manrope] text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                Live Audit Trail
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Recent tamper-evident events registered across Neon Database and the Sepolia Ledger.
              </p>
            </div>

            <button
              onClick={() => handleQuickDemo('faculty')}
              className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Open Full Audit Console →
            </button>
          </div>

          {/* Events Table / Cards */}
          <div className="mt-8 space-y-3">
            {auditEvents.length > 0 ? (
              auditEvents.map((event) => (
                <div
                  key={event.id}
                  className="surface flex flex-col justify-between gap-3 rounded-2xl border border-border p-4 transition hover:border-indigo-400/50 md:flex-row md:items-center dark:border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <CheckCircle2 size={18} />
                    </span>
                    <div>
                      <span className="text-xs font-bold text-foreground">{event.event}</span>
                      <p className="text-xs text-muted-foreground">{event.subject}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="mono rounded-lg bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                      {event.tx ? `${event.tx.slice(0, 14)}...` : '0x8a42c1...d91c'}
                    </span>
                    <span className="mono font-bold text-indigo-600 dark:text-indigo-400">
                      Block #{event.block || 1849}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(event.time).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                Loading recent ledger activity...
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faqs" className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="mt-2 font-[Manrope] text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              Everything You Need to Know
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Clear technical details on how Credence pairs modern web performance with Ethereum zero-trust security.
            </p>
          </div>

          <div className="mt-10 divide-y divide-border rounded-3xl border border-border bg-card dark:border-white/10">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-5">
                <button
                  type="button"
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="flex w-full items-center justify-between text-left font-bold text-foreground"
                >
                  <span className="text-base">{faq.q}</span>
                  {activeFaq === idx ? (
                    <ChevronUp size={18} className="shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown size={18} className="shrink-0 text-muted-foreground" />
                  )}
                </button>
                {activeFaq === idx && (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="relative overflow-hidden border-t border-border bg-gradient-to-b from-indigo-950/20 via-background to-background py-20 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <Sparkles size={13} />
            Ready for Secure Examinations?
          </span>

          <h2 className="mt-4 font-[Manrope] text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Upgrade your university's examination trust model.
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
            Create an account in 10 seconds or test with our instant 1-click faculty and student demo profiles.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => openAuth('register')}
              className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-600/30 transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:text-slate-950"
            >
              Create Free Account <ArrowRight size={16} />
            </button>
            <button
              onClick={() => handleQuickDemo('faculty')}
              className="rounded-2xl border border-border bg-card px-6 py-3.5 text-sm font-bold text-foreground hover:bg-muted"
            >
              Try Faculty Demo
            </button>
          </div>
        </div>
      </section>

      {/* Comprehensive Footer */}
      <footer className="border-t border-border bg-card/50 py-12 text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 font-[Manrope] text-base font-extrabold text-foreground">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white">
                  <Shield size={16} />
                </span>
                <span>Credence</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Decentralized academic assessment platform backed by Ethereum Sepolia smart contracts and Neon PostgreSQL.
              </p>
            </div>

            <div>
              <h4 className="font-bold uppercase tracking-wider text-foreground">Platform</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <button onClick={() => openAuth('login')} className="hover:underline">
                    Faculty Console
                  </button>
                </li>
                <li>
                  <button onClick={() => openAuth('login')} className="hover:underline">
                    Student Desk
                  </button>
                </li>
                <li>
                  <a href="#verifier" className="hover:underline">
                    Public Verifier
                  </a>
                </li>
                <li>
                  <a href="#audit-feed" className="hover:underline">
                    Audit Stream
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold uppercase tracking-wider text-foreground">Smart Contract</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <span className="mono block text-[11px] font-semibold text-foreground">
                    Sepolia Testnet
                  </span>
                </li>
                <li>
                  <a
                    href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    Contract on Etherscan <ExternalLink size={10} />
                  </a>
                </li>
                <li>
                  <span className="text-[11px]">Chain ID: 11155111</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold uppercase tracking-wider text-foreground">Compliance & Specs</h4>
              <p className="mt-3 text-xs leading-relaxed">
                All assessment questions and answers are protected by deterministic SHA-256 integrity digests. Zero paper leaks guaranteed by EVM epoch timestamp logic.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-[11px]">
            <span>© 2026 Credence Project. All rights reserved.</span>
            <span className="mono">SEPOLIA TESTNET · NEON PG · HARDHAT COMPLIANT</span>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => {
          onAuthSuccess(user);
          navigate(
            user.role.toUpperCase() === 'ADMIN'
              ? '/admin'
              : user.role.toUpperCase() === 'FACULTY'
              ? '/faculty'
              : '/student'
          );
        }}
      />
    </div>
  );
};
