const today = new Date().toISOString().slice(0, 10);
const at = (time: string) => `${today}T${time}:00`;

export interface Question {
  id: string;
  text: string;
  options: string[];
  answer: number;
}

export interface Exam {
  id: string;
  name: string;
  code: string;
  date: string;
  start: string;
  end: string;
  duration: number;
  passingMarks: number;
  totalMarks?: number;
  questions: Question[];
  whitelist: string[];
  createdAt?: string;
  txHash?: string;
  timingStatus?: string;
  hasSubmitted?: boolean;
  attempt?: any;
  attempts?: any[];
}

export interface AuditEvent {
  id: string;
  event: string;
  subject: string;
  block: number;
  tx: string;
  time: string;
  simulated?: boolean;
}

export interface Attempt {
  id: string;
  examId: string;
  student: string;
  studentId: string;
  status: string;
  startedAt: string;
  submittedAt?: string;
  digest?: string;
  tx?: string;
  block?: number;
  score?: number;
  total?: number;
  answered?: number;
  answers?: Record<string, number>;
  flagged?: string[];
}

export const seedExams: Exam[] = [
  {
    id: 'exam-systems-01',
    name: 'Distributed Systems — Midterm',
    code: 'CS-402-MT1',
    date: today,
    start: at('10:00'),
    end: at('11:30'),
    duration: 90,
    passingMarks: 40,
    questions: [
      {
        id: 'q1',
        text: 'Which property does a cryptographic hash function provide?',
        options: ['Reversibility', 'Deterministic fixed-length output', 'Data compression', 'Key exchange'],
        answer: 1,
      },
      {
        id: 'q2',
        text: 'In a permissioned blockchain, who may validate transactions?',
        options: ['Any anonymous participant', 'Authorized network members', 'Only the end user', 'A public exchange'],
        answer: 1,
      },
      {
        id: 'q3',
        text: 'What is the primary role of consensus in a distributed ledger?',
        options: ['Encrypting all files', 'Agreeing on the ledger state', 'Creating user accounts', 'Reducing network latency'],
        answer: 1,
      },
    ],
    whitelist: ['STU-2048', 'rohan.mehta@northstar.edu', '0x71C7...90a2'],
  },
  {
    id: 'exam-crypto-02',
    name: 'Applied Cryptography — Quiz 4',
    code: 'CS-318-Q4',
    date: today,
    start: at('11:00'),
    end: at('12:00'),
    duration: 45,
    passingMarks: 24,
    questions: [
      {
        id: 'q1',
        text: 'SHA-256 produces a digest of how many bits?',
        options: ['128', '160', '256', '512'],
        answer: 2,
      },
      {
        id: 'q2',
        text: 'A digital signature is created using the signer’s…',
        options: ['Public key', 'Private key', 'Hash digest only', 'Wallet address'],
        answer: 1,
      },
    ],
    whitelist: ['STU-2048', 'STU-2091'],
  },
  {
    id: 'exam-networks-03',
    name: 'Computer Networks — Final',
    code: 'CS-225-FN',
    date: today,
    start: at('08:30'),
    end: at('09:30'),
    duration: 60,
    passingMarks: 35,
    questions: [
      {
        id: 'q1',
        text: 'Which layer is responsible for end-to-end transport?',
        options: ['Network', 'Transport', 'Session', 'Physical'],
        answer: 1,
      },
    ],
    whitelist: ['STU-2048'],
  },
];

export const seedAudit: AuditEvent[] = [
  { id: 'a1', event: 'ExamCreated', subject: 'Distributed Systems — Midterm', block: 1842, tx: '0x8a42c10d7f51...d91c', time: at('09:12'), simulated: true },
  { id: 'a2', event: 'StudentAuthorized', subject: 'STU-2048 · CS-402-MT1', block: 1843, tx: '0x64fbe290a614...812a', time: at('09:16'), simulated: true },
  { id: 'a3', event: 'ExamSubmitted', subject: 'Rohan Mehta · CS-402-MT1', block: 1847, tx: '0xb13917f320cd...a4e0', time: at('09:42'), simulated: true },
];

export const seedAttempts: Attempt[] = [
  {
    id: 'attempt-seed-1',
    examId: 'exam-systems-01',
    student: 'Rohan Mehta',
    studentId: 'STU-2048',
    status: 'submitted',
    startedAt: at('09:28'),
    submittedAt: at('09:42'),
    digest: '807b25193d01841503e05916ba4acc9ea1cd3022d24969b5458cf17806991ee4',
    tx: '0xb13917f320cd...a4e0',
    block: 1847,
    score: 2,
    total: 2,
    answered: 2,
    answers: { q1: 1, q2: 1 },
  },
  {
    id: 'attempt-seed-2',
    examId: 'exam-systems-01',
    student: 'Aarav Nair',
    studentId: 'STU-2091',
    status: 'started',
    startedAt: at('09:48'),
  },
];
