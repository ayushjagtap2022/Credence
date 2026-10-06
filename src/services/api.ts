import { seedAudit, seedAttempts, seedExams, type Exam, type AuditEvent, type Attempt, type Question } from '../mockData';
export type { Exam, AuditEvent, Attempt, Question };

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const keys = {
  token: 'blockexam.jwt_token',
  user: 'blockexam.user',
  role: 'blockexam.role',
  clock: 'blockexam.clock',
  cachedExams: 'blockexam.exams.cache',
  cachedAudit: 'blockexam.audit.cache',
  cachedAttempts: 'blockexam.attempts.cache',
};

// Helpers for localStorage
const read = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const write = <T>(key: string, value: T): T => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to write to localStorage for key ${key}:`, err);
  }
  return value;
};

// Format options index 0..3 to 'A'..'D' and vice-versa
export const indexToOption = (idx: number): 'A' | 'B' | 'C' | 'D' => {
  return (['A', 'B', 'C', 'D'][idx] || 'A') as 'A' | 'B' | 'C' | 'D';
};

export const optionToIndex = (opt: string): number => {
  const map: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
  return map[opt.toUpperCase()] ?? 0;
};

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'FACULTY' | 'STUDENT' | 'ADMIN' | string;
  walletAddress: string;
  createdAt?: string;
}

export interface VerificationResult {
  success: boolean;
  verified: boolean;
  examCode: string;
  examTitle: string;
  studentName: string;
  studentWallet: string;
  score: number | null;
  totalMarks: number | null;
  passingMarks: number | null;
  passed: boolean | null;
  integrityReport?: {
    recalculatedHash: string | null;
    storedSubmissionHash: string | null;
    onChainHash: string | null;
    onChainTimestamp: string | null;
    isSubmittedOnChain: boolean;
    blockchainTxHash: string | null;
    status: string;
    verificationTimestamp: string;
  };
  error?: string;
}

// Low-level fetch wrapper with Auth Bearer token injection
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(keys.token);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    (err as any).status = response.status;
    (err as any).data = data;
    throw err;
  }

  return data;
}

export const api = {
  // ----------------------------------------------------
  // Backend Connectivity & Health
  // ----------------------------------------------------
  async health(): Promise<{ status: string; service: string; timestamp: string; online: boolean }> {
    try {
      const res = await request<{ status: string; service: string; timestamp: string }>('/health');
      return { ...res, online: res.status === 'HEALTHY' };
    } catch {
      return { status: 'OFFLINE', service: 'Credence API', timestamp: new Date().toISOString(), online: false };
    }
  },

  // ----------------------------------------------------
  // Authentication & Session
  // ----------------------------------------------------
  getToken(): string | null {
    return localStorage.getItem(keys.token);
  },

  async login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
    const data = await request<{ success: boolean; token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem(keys.token, data.token);
    write(keys.user, data.user);
    write(keys.role, data.user.role.toLowerCase());

    return { user: data.user, token: data.token };
  },

  async register(params: {
    email: string;
    password: string;
    fullName: string;
    walletAddress?: string;
    role?: string;
  }): Promise<{ user: AuthUser; token: string }> {
    const data = await request<{ success: boolean; token: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(params),
    });

    localStorage.setItem(keys.token, data.token);
    write(keys.user, data.user);
    write(keys.role, data.user.role.toLowerCase());

    return { user: data.user, token: data.token };
  },

  async getProfile(): Promise<AuthUser | null> {
    const token = localStorage.getItem(keys.token);
    if (!token) return null;

    try {
      const data = await request<{ success: boolean; user: AuthUser }>('/auth/me');
      if (data?.user) {
        write(keys.user, data.user);
        write(keys.role, data.user.role.toLowerCase());
        return data.user;
      }
      return null;
    } catch {
      return read<AuthUser | null>(keys.user, null);
    }
  },

  async user(): Promise<AuthUser | null> {
    const cached = read<AuthUser | null>(keys.user, null);
    if (cached) return cached;
    return this.getProfile();
  },

  async signIn(user: any) {
    write(keys.user, user);
    write(keys.role, user.role.toLowerCase());
    return user;
  },

  async signOut(): Promise<void> {
    localStorage.removeItem(keys.token);
    localStorage.removeItem(keys.user);
  },

  // Role and Clock settings
  async getRole(): Promise<string> {
    const user = read<AuthUser | null>(keys.user, null);
    if (user?.role) return user.role.toLowerCase();
    return read(keys.role, 'faculty');
  },

  async setRole(value: string): Promise<string> {
    write(keys.role, value.toLowerCase());
    return value.toLowerCase();
  },

  async getClock(): Promise<string> {
    return read(keys.clock, '10:15');
  },

  async setClock(value: string): Promise<string> {
    write(keys.clock, value);
    return value;
  },

  // ----------------------------------------------------
  // Exams
  // ----------------------------------------------------
  async exams(): Promise<Exam[]> {
    const user = read<AuthUser | null>(keys.user, null);
    const role = (user?.role || read(keys.role, 'faculty')).toUpperCase();

    try {
      if (role === 'FACULTY' || role === 'ADMIN') {
        const data = await request<{ success: boolean; exams: any[] }>('/exams/faculty/all');
        if (data?.exams) {
          const mapped: Exam[] = data.exams.map((e) => {
            const startDate = e.startTime ? e.startTime.slice(0, 10) : new Date().toISOString().slice(0, 10);
            return {
              id: e.id,
              name: e.title,
              code: e.examCode,
              date: startDate,
              start: e.startTime,
              end: e.endTime,
              duration: e.durationMinutes,
              passingMarks: e.passingMarks,
              totalMarks: e.totalMarks,
              questions: (e.questions || []).map((q: any) => ({
                id: q.id,
                text: q.questionText || '',
                options: [q.optionA || '', q.optionB || '', q.optionC || '', q.optionD || ''],
                answer: optionToIndex(q.correctOption || 'A'),
              })),
              whitelist: (e.authorizedWallets || e.whitelist || []),
              attempts: e.attempts || [],
              txHash: e.txHash,
            };
          });
          write(keys.cachedExams, mapped);
          return mapped;
        }
      } else {
        // Student view
        const data = await request<{ success: boolean; exams: any[] }>('/exams/student/available');
        if (data?.exams) {
          const mapped: Exam[] = data.exams.map((e) => {
            const startDate = e.startTime ? e.startTime.slice(0, 10) : new Date().toISOString().slice(0, 10);
            return {
              id: e.id,
              name: e.title,
              code: e.examCode,
              date: startDate,
              start: e.startTime,
              end: e.endTime,
              duration: e.durationMinutes,
              passingMarks: e.passingMarks,
              totalMarks: e.totalMarks,
              timingStatus: e.timingStatus,
              hasSubmitted: e.hasSubmitted,
              attempt: e.attempt,
              questions: Array(e.questionCount || 5).fill(null).map((_, i) => ({
                id: `q-${i}`,
                text: `Question ${i + 1}`,
                options: ['A', 'B', 'C', 'D'],
                answer: 0,
              })),
              whitelist: [user?.walletAddress || '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'],
            };
          });
          write(keys.cachedExams, mapped);
          return mapped;
        }
      }
    } catch (err) {
      console.warn('[api.exams] Live API request failed, falling back to cached/seed exams:', err);
    }

    return read(keys.cachedExams, seedExams);
  },

  async createExam(input: Omit<Exam, 'id'>): Promise<Exam> {
    try {
      const questionsPayload = (input.questions || []).map((q) => ({
        questionText: q.text,
        optionA: q.options[0] || 'Option A',
        optionB: q.options[1] || 'Option B',
        optionC: q.options[2] || 'Option C',
        optionD: q.options[3] || 'Option D',
        correctOption: indexToOption(q.answer),
        marks: 1,
      }));

      const payload = {
        examCode: input.code.toUpperCase(),
        title: input.name,
        description: `${input.name} (${input.code})`,
        startTime: input.start,
        endTime: input.end,
        durationMinutes: Number(input.duration) || 60,
        totalMarks: questionsPayload.length,
        passingMarks: Number(input.passingMarks) || Math.ceil(questionsPayload.length * 0.4),
        questions: questionsPayload,
      };

      const res = await request<{ success: boolean; exam: any; txHash: string }>('/exams/create', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // If student wallets are provided in whitelist, authorize them on-chain
      const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/i;
      const validWallets = (input.whitelist || []).filter((w) => ethAddressRegex.test(w));
      if (validWallets.length > 0) {
        try {
          await request(`/exams/${payload.examCode}/authorize`, {
            method: 'POST',
            body: JSON.stringify({ studentWallets: validWallets }),
          });
        } catch (authErr) {
          console.warn('[api.createExam] Whitelist authorization warning:', authErr);
        }
      }

      const created: Exam = {
        ...input,
        id: res.exam?.id || `exam-${Date.now()}`,
        txHash: res.txHash,
        whitelist: input.whitelist || [],
        questions: input.questions || [],
      };

      const cached = read<Exam[]>(keys.cachedExams, seedExams);
      write(keys.cachedExams, [created, ...cached]);

      return created;
    } catch (err) {
      console.error('[api.createExam] Error creating exam on backend:', err);
      // Fallback local creation
      const localExam: Exam = {
        ...input,
        id: `exam-${Date.now().toString(36)}`,
        whitelist: input.whitelist || [],
        questions: input.questions || [],
      };
      const cached = read<Exam[]>(keys.cachedExams, seedExams);
      write(keys.cachedExams, [localExam, ...cached]);
      return localExam;
    }
  },

  // Start exam session - fetches protected question payload from backend
  async startExamSession(examCode: string): Promise<{ exam: any; questions: Question[] }> {
    try {
      const data = await request<{
        success: boolean;
        exam: any;
        questions: any[];
      }>(`/exams/${examCode}/start`);

      const questions: Question[] = data.questions.map((q) => ({
        id: q.id,
        text: q.questionText,
        options: [q.optionA, q.optionB, q.optionC, q.optionD],
        answer: -1, // Hidden on student side!
      }));

      return {
        exam: {
          id: data.exam.id,
          name: data.exam.title,
          code: data.exam.examCode,
          duration: data.exam.durationMinutes,
          passingMarks: data.exam.passingMarks,
          totalMarks: data.exam.totalMarks,
          start: data.exam.startTime,
          end: data.exam.endTime,
          questions,
          whitelist: [],
          date: data.exam.startTime?.slice(0, 10),
        },
        questions,
      };
    } catch (err) {
      console.warn('[api.startExamSession] Backend error, falling back to local dataset:', err);
      const allExams = await this.exams();
      const found = allExams.find((e) => e.code.toUpperCase() === examCode.toUpperCase() || e.id === examCode);
      if (!found) throw err;
      return { exam: found, questions: found.questions };
    }
  },

  // Submit student answers to backend for deterministic grading & blockchain hashing
  async submitExamAnswers(
    examCode: string,
    answers: Record<string, number>
  ): Promise<{
    success: boolean;
    attempt: any;
    score: number;
    totalMarks: number;
    passed: boolean;
    txHash: string;
    submissionHash: string;
  }> {
    const formattedAnswers: Record<string, string> = {};
    for (const [qid, optIdx] of Object.entries(answers)) {
      formattedAnswers[qid] = indexToOption(optIdx);
    }

    try {
      const res = await request<{
        success: boolean;
        attempt: any;
        score: number;
        totalMarks: number;
        passed: boolean;
        txHash: string;
      }>(`/exams/${examCode}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: formattedAnswers }),
      });

      return {
        success: true,
        attempt: res.attempt,
        score: res.score,
        totalMarks: res.totalMarks,
        passed: res.passed,
        txHash: res.txHash || res.attempt?.blockchainTxHash || '',
        submissionHash: res.attempt?.submissionHash || '',
      };
    } catch (err) {
      console.warn('[api.submitExamAnswers] Error submitting to backend, evaluating locally:', err);
      throw err;
    }
  },

  // ----------------------------------------------------
  // Attempts & Local Storage Persistence
  // ----------------------------------------------------
  async attempts(): Promise<Attempt[]> {
    try {
      const user = read<AuthUser | null>(keys.user, null);
      if (user?.role === 'STUDENT') {
        const available = await request<{ success: boolean; exams: any[] }>('/exams/student/available');
        const attempts: Attempt[] = (available.exams || [])
          .filter((e) => e.attempt)
          .map((e) => ({
            id: e.attempt.id,
            examId: e.id,
            student: user.fullName,
            studentId: user.email,
            status: 'submitted',
            startedAt: e.attempt.submittedAt,
            submittedAt: e.attempt.submittedAt,
            digest: e.attempt.submissionHash,
            tx: e.attempt.blockchainTxHash,
            score: e.attempt.score,
            total: e.totalMarks,
            answered: e.questionCount,
          }));

        if (attempts.length > 0) {
          write(keys.cachedAttempts, attempts);
          return attempts;
        }
      }
    } catch (err) {
      console.warn('[api.attempts] Error loading live attempts:', err);
    }

    return read(keys.cachedAttempts, seedAttempts);
  },

  async startAttempt(exam: Exam): Promise<Attempt> {
    const user = read<AuthUser | null>(keys.user, null);
    const attempt: Attempt = {
      id: `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      examId: exam.id,
      student: user?.fullName || 'Rohan Mehta',
      studentId: user?.email || 'STU-2048',
      status: 'started',
      startedAt: new Date().toISOString(),
      answers: {},
      flagged: [],
    };
    const attempts = [attempt, ...read<Attempt[]>(keys.cachedAttempts, seedAttempts)];
    write(keys.cachedAttempts, attempts);
    return attempt;
  },

  async saveProgress(id: string, progress: { answers?: Record<string, number>; flagged?: string[] }): Promise<void> {
    const attempts = read<Attempt[]>(keys.cachedAttempts, seedAttempts);
    const updated = attempts.map((a) => (a.id === id ? { ...a, ...progress } : a));
    write(keys.cachedAttempts, updated);
  },

  async submitAttempt(id: string, result: Partial<Attempt>): Promise<Attempt> {
    const attempts = read<Attempt[]>(keys.cachedAttempts, seedAttempts);
    const user = read<AuthUser | null>(keys.user, null);
    const completed: Attempt = {
      id,
      examId: result.examId || '',
      student: user?.fullName || 'Rohan Mehta',
      studentId: user?.email || 'STU-2048',
      status: 'submitted',
      startedAt: result.startedAt || new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      digest: result.digest || '',
      tx: result.tx || `0x${crypto.getRandomValues(new Uint8Array(16)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '')}`,
      block: 1850,
      score: result.score ?? 0,
      total: result.total ?? 0,
      answered: result.answered ?? 0,
      answers: result.answers || {},
      flagged: result.flagged || [],
    };

    const next = attempts.map((a) => (a.id === id ? completed : a));
    write(keys.cachedAttempts, next);
    return completed;
  },

  // ----------------------------------------------------
  // Audit Trail & Verification
  // ----------------------------------------------------
  async audit(): Promise<AuditEvent[]> {
    try {
      const res = await request<{ success: boolean; events: any[] }>('/audit/trail');
      if (res?.events) {
        const mapped: AuditEvent[] = res.events.map((evt) => ({
          id: evt.id,
          event: evt.event || 'ExamSubmitted',
          subject: evt.subject || `${evt.examTitle || 'Exam'}`,
          block: 1850,
          tx: evt.txHash || evt.submissionHash || '0x...',
          time: evt.time || new Date().toISOString(),
          simulated: false,
        }));
        write(keys.cachedAudit, mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[api.audit] Error fetching live audit trail:', err);
    }

    return read(keys.cachedAudit, seedAudit);
  },

  async verifySubmission(examCode: string, walletAddress: string): Promise<VerificationResult> {
    try {
      const res = await request<VerificationResult>(
        `/audit/verify/${encodeURIComponent(examCode)}/${encodeURIComponent(walletAddress)}`
      );
      return res;
    } catch (err: any) {
      console.error('[api.verifySubmission] Verification error:', err);
      return {
        success: false,
        verified: false,
        examCode,
        studentWallet: walletAddress,
        examTitle: 'Assessment',
        studentName: 'Student',
        score: null,
        totalMarks: null,
        passingMarks: null,
        passed: null,
        error: err.message || 'Verification failed',
      };
    }
  },

  // ----------------------------------------------------
  // Super Admin Console APIs
  // ----------------------------------------------------
  admin: {
    async getStats(): Promise<AdminStats> {
      const res = await request<{ success: boolean; stats: AdminStats }>('/admin/stats');
      return res.stats;
    },

    async getUsers(): Promise<ManagedUser[]> {
      const res = await request<{ success: boolean; users: ManagedUser[] }>('/admin/users');
      return res.users;
    },

    async createUser(userData: {
      email: string;
      fullName: string;
      password: string;
      walletAddress?: string;
      role: 'STUDENT' | 'FACULTY' | 'ADMIN';
    }): Promise<{ success: boolean; user: any; message: string }> {
      return request('/admin/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },

    async updateUserRole(
      userId: string,
      role: 'STUDENT' | 'FACULTY' | 'ADMIN'
    ): Promise<{ success: boolean; user: any; message: string }> {
      return request(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
    },

    async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
      return request(`/admin/users/${userId}`, {
        method: 'DELETE',
      });
    },

    async getLoginLogs(limit = 100): Promise<UserLoginLog[]> {
      const res = await request<{ success: boolean; logs: UserLoginLog[] }>(`/admin/login-logs?limit=${limit}`);
      return res.logs;
    },

    async getAuditLogs(limit = 100): Promise<SecurityAuditLog[]> {
      const res = await request<{ success: boolean; logs: SecurityAuditLog[] }>(`/admin/audit-logs?limit=${limit}`);
      return res.logs;
    },
  },
};

export interface AdminStats {
  totalUsers: number;
  breakdown: {
    students: number;
    faculty: number;
    admins: number;
  };
  totalExams: number;
  totalAttempts: number;
  totalLogins: number;
  totalAuditLogs: number;
}

export interface ManagedUser {
  id: string;
  email: string;
  fullName: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN';
  walletAddress: string;
  createdAt: string;
  attemptCount: number;
  createdExamCount: number;
  totalLogins: number;
  lastLogin: {
    loginAt: string;
    ipAddress: string | null;
    userAgent: string | null;
  } | null;
}

export interface UserLoginLog {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    walletAddress: string;
  };
  ipAddress: string;
  userAgent: string;
  loginAt: string;
}

export interface SecurityAuditLog {
  id: string;
  action: string;
  details: any;
  userId: string | null;
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  } | null;
  ipAddress: string;
  timestamp: string;
}
