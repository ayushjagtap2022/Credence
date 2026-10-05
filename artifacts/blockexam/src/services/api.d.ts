export const api: {
  exams(): Promise<any[]>;
  audit(): Promise<any[]>;
  attempts(): Promise<any[]>;
  getClock(): Promise<string>;
  setClock(value: string): Promise<string>;
  getRole(): Promise<string>;
  setRole(value: string): Promise<string>;
  user(): Promise<any>;
  signIn(user: any): Promise<any>;
  signOut(): Promise<void>;
  createExam(input: any): Promise<any>;
  startAttempt(exam: any, student?: any): Promise<any>;
  saveProgress(attemptId: string, progress: any): Promise<void>;
  submitAttempt(attemptId: string, payload: any): Promise<any>;
};
