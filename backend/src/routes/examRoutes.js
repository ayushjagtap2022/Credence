import { Router } from 'express';
import {
  createExam,
  authorizeStudents,
  getFacultyExams,
  getStudentAvailableExams,
  startExam,
  submitExam,
} from '../controllers/examController.js';
import { authMiddleware, facultyOnly, studentOnly } from '../middleware/authMiddleware.js';

const router = Router();

// Faculty Routes
router.post('/create', authMiddleware, facultyOnly, createExam);
router.post('/:examCode/authorize', authMiddleware, facultyOnly, authorizeStudents);
router.get('/faculty/all', authMiddleware, facultyOnly, getFacultyExams);

// Student Routes
router.get('/student/available', authMiddleware, getStudentAvailableExams);
router.get('/:examCode/start', authMiddleware, startExam);
router.post('/:examCode/submit', authMiddleware, studentOnly, submitExam);

export default router;
