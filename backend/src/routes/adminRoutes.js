import { Router } from 'express';
import {
  getAdminStats,
  getUsers,
  createUser,
  updateUserRole,
  deleteUser,
  getLoginLogs,
  getAuditLogs,
} from '../controllers/adminController.js';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js';

const router = Router();

// Protect all admin endpoints with JWT authentication and ADMIN role requirement
router.use(authMiddleware);
router.use(adminOnly);

// System statistics
router.get('/stats', getAdminStats);

// User Management
router.get('/users', getUsers);
router.post('/users', createUser);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Login Activity Logs ("when user have logged in")
router.get('/login-logs', getLoginLogs);

// System & Security Audit Logs
router.get('/audit-logs', getAuditLogs);

export default router;
