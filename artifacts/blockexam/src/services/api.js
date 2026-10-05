import { seedAudit, seedAttempts, seedExams } from '../mockData.js';

const keys = { exams: 'blockexam.exams', audit: 'blockexam.audit', attempts: 'blockexam.attempts', clock: 'blockexam.clock', role: 'blockexam.role', user: 'blockexam.user' };
const read = (key, seed) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    localStorage.setItem(key, JSON.stringify(seed));
  } catch { return seed; }
  return seed;
};
const write = (key, value) => { localStorage.setItem(key, JSON.stringify(value)); return value; };
const wait = () => new Promise((resolve) => setTimeout(resolve, 170));
const id = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const fakeTx = () => `0x${crypto.getRandomValues(new Uint8Array(16)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '')}`;
export const api = {
  async exams() { await wait(); return read(keys.exams, seedExams); },
  async audit() { await wait(); return read(keys.audit, seedAudit); },
  async attempts() { await wait(); return read(keys.attempts, seedAttempts); },
  async getClock() { return read(keys.clock, '10:15'); },
  async setClock(value) { write(keys.clock, value); return value; },
  async getRole() { return read(keys.role, 'faculty'); },
  async setRole(value) { write(keys.role, value); return value; },
  async user() { return read(keys.user, null); },
  async signIn(user) { write(keys.user, user); write(keys.role, user.role); return user; },
  async signOut() { localStorage.removeItem(keys.user); },
  async createExam(input) {
    await wait();
    const exam = { ...input, id: id('exam'), whitelist: input.whitelist || [], questions: input.questions || [], createdAt: new Date().toISOString() };
    const exams = [exam, ...read(keys.exams, seedExams)]; write(keys.exams, exams);
    const audit = read(keys.audit, seedAudit);
    write(keys.audit, [{ id: id('audit'), event: 'ExamCreated', subject: `${exam.name} · ${exam.code}`, block: 1848 + audit.length, tx: fakeTx(), time: new Date().toISOString(), simulated: true }, ...audit]);
    exam.whitelist.forEach((student) => api.addAuthorizationEvent(student, exam.code));
    return exam;
  },
  async addAuthorizationEvent(student, code) {
    const audit = read(keys.audit, seedAudit);
    write(keys.audit, [{ id: id('audit'), event: 'StudentAuthorized', subject: `${student} · ${code}`, block: 1848 + audit.length, tx: fakeTx(), time: new Date().toISOString(), simulated: true }, ...audit]);
  },
  async startAttempt(exam, student = { name: 'Rohan Mehta', id: 'STU-2048' }) {
    await wait();
    if (!(exam.whitelist || []).some((entry) => entry.toLowerCase() === student.id.toLowerCase() || entry.toLowerCase() === (student.email || '').toLowerCase())) {
      throw new Error('This student is not on the exam whitelist.');
    }
    const attempts = read(keys.attempts, seedAttempts);
    const existing = attempts.find((a) => a.examId === exam.id && a.studentId === student.id && a.status !== 'submitted');
    if (existing) return existing;
    const attempt = { id: id('attempt'), examId: exam.id, student: student.name, studentId: student.id, status: 'started', startedAt: new Date().toISOString(), answers: {}, flagged: [] };
    write(keys.attempts, [attempt, ...attempts]); return attempt;
  },
  async saveProgress(attemptId, progress) {
    const attempts = read(keys.attempts, seedAttempts);
    write(keys.attempts, attempts.map((attempt) => attempt.id === attemptId && attempt.status !== 'submitted' ? { ...attempt, ...progress } : attempt));
  },
  async submitAttempt(attemptId, payload) {
    await wait();
    const attempts = read(keys.attempts, seedAttempts);
    const completed = { ...payload, status: 'submitted', submittedAt: new Date().toISOString(), tx: fakeTx(), block: 1848 + attempts.length };
    write(keys.attempts, attempts.map((a) => a.id === attemptId ? completed : a));
    const exam = read(keys.exams, seedExams).find((e) => e.id === completed.examId);
    const audit = read(keys.audit, seedAudit);
    write(keys.audit, [{ id: id('audit'), event: 'ExamSubmitted', subject: `${completed.student} · ${exam?.code || completed.examId}`, block: completed.block, tx: completed.tx, time: completed.submittedAt, simulated: true }, ...audit]);
    return completed;
  },
};
