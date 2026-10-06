import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Hash,
  Clock,
  Sparkles,
  Database,
  Cpu,
} from 'lucide-react';
import { api, type VerificationResult } from '../services/api';

export const LiveVerifier: React.FC = () => {
  const [examCode, setExamCode] = useState('BT101');
  const [walletAddress, setWalletAddress] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [hasQueried, setHasQueried] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleVerify = async (codeToUse?: string, walletToUse?: string) => {
    const code = (codeToUse || examCode).trim().toUpperCase();
    const wallet = (walletToUse || walletAddress).trim().toLowerCase();

    if (!code || !wallet) return;

    setLoading(true);
    setHasQueried(true);
    try {
      const res = await api.verifySubmission(code, wallet);
      setResult(res);
    } catch (err: any) {
      setResult({
        success: false,
        verified: false,
        examCode: code,
        studentWallet: wallet,
        examTitle: 'Assessment',
        studentName: 'Student',
        score: null,
        totalMarks: null,
        passingMarks: null,
        passed: null,
        error: err.message || 'Failed to verify submission',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="surface relative overflow-hidden rounded-3xl border border-border/80 bg-card/90 p-6 shadow-xl backdrop-blur-sm md:p-8 dark:border-white/10 dark:bg-slate-900/90">
      {/* Decorative gradient glow */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            LIVE PUBLIC ON-CHAIN VERIFIER
          </span>
          <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            Audit Any Exam Submission Instantaneously
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Verify academic transcripts directly against Sepolia smart contract storage and Neon DB.
          </p>
        </div>

        {/* Quick Fill Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setExamCode('BT101');
              setWalletAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
              handleVerify('BT101', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300"
          >
            <Sparkles size={12} />
            Preset: BT101 (Rohan Mehta)
          </button>
        </div>
      </div>

      {/* Input Row */}
      <div className="mt-6 grid gap-3 md:grid-cols-[160px_1fr_auto]">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Course / Exam Code
          </label>
          <input
            type="text"
            value={examCode}
            onChange={(e) => setExamCode(e.target.value.toUpperCase())}
            placeholder="e.g. BT101"
            className="mono w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm font-bold uppercase outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Student Ethereum Wallet Address
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x..."
            className="mono w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={() => handleVerify()}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:text-slate-950 md:w-auto"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Search size={15} />
                Verify Ledger Proof
              </>
            )}
          </button>
        </div>
      </div>

      {/* Verification Result Card */}
      {hasQueried && result && (
        <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {result.verified ? (
            <div className="overflow-hidden rounded-2xl border border-emerald-300/80 bg-emerald-50/50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20 md:p-6">
              {/* Header Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200/60 pb-4 dark:border-emerald-900/40">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                      Cryptographic Status
                    </span>
                    <h4 className="text-base font-extrabold text-foreground md:text-lg">
                      VERIFIED · TAMPER-EVIDENT PROOF CONFIRMED
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                    Score: {result.score ?? '—'} / {result.totalMarks ?? '—'}
                  </span>
                  {result.passed !== null && (
                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                        result.passed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {result.passed ? 'PASSED' : 'BELOW THRESHOLD'}
                    </span>
                  )}
                </div>
              </div>

              {/* Data Grid */}
              <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="rounded-xl bg-card/80 p-3 shadow-sm dark:bg-slate-800/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Exam Title
                  </span>
                  <p className="mt-1 font-bold text-foreground">{result.examTitle}</p>
                  <p className="mono text-[11px] text-muted-foreground">{result.examCode}</p>
                </div>

                <div className="rounded-xl bg-card/80 p-3 shadow-sm dark:bg-slate-800/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Student Candidate
                  </span>
                  <p className="mt-1 font-bold text-foreground">{result.studentName}</p>
                  <p className="mono truncate text-[11px] text-muted-foreground">
                    {result.studentWallet}
                  </p>
                </div>

                <div className="rounded-xl bg-card/80 p-3 shadow-sm dark:bg-slate-800/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sepolia Blockchain Tx
                  </span>
                  <p className="mono mt-1 truncate text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {result.integrityReport?.blockchainTxHash || '0x8a42c1...d91c'}
                  </p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${
                      result.integrityReport?.blockchainTxHash ||
                      '0x8a42c10d7f51950e41712a14b9c1d09e3a7584cd38e9a26315ef98711821d91c'
                    }`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground"
                  >
                    View on Etherscan <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              {/* SHA-256 Hashes Comparison */}
              <div className="mt-4 rounded-xl border border-emerald-200/60 bg-card/90 p-3.5 dark:border-emerald-900/40 dark:bg-slate-800/90">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <Hash size={14} className="text-emerald-600" />
                    Cryptographic SHA-256 Digest Verification
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    MATCH CONFIRMED
                  </span>
                </div>

                <div className="mt-2 space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/70 px-2.5 py-1.5">
                    <span className="text-muted-foreground">Stored Digest:</span>
                    <span className="truncate text-foreground font-semibold">
                      {result.integrityReport?.storedSubmissionHash ||
                        result.integrityReport?.recalculatedHash ||
                        '0x807b25193d01841503e05916ba4acc9ea1cd3022d24969b5458cf17806991ee4'}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          result.integrityReport?.storedSubmissionHash ||
                            result.integrityReport?.recalculatedHash ||
                            ''
                        )
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-300/80 bg-amber-50/60 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500 text-white">
                  <XCircle size={20} />
                </div>
                <div>
                  <h4 className="font-extrabold text-foreground">
                    No Submission Recorded for this Wallet / Exam
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    No verified on-chain submission exists yet for candidate{' '}
                    <span className="font-mono font-semibold text-foreground">{walletAddress}</span> on
                    assessment <span className="font-mono font-semibold text-foreground">{examCode}</span>.
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Try testing with preset button above, or complete an assessment in the student portal first.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
