import { Router } from 'express';
import { verifySubmission, getAuditTrail } from '../controllers/auditController.js';

const router = Router();

// Publicly verifiable audit report
router.get('/verify/:examCode/:walletAddress', verifySubmission);

// Recent audit event trail
router.get('/trail', getAuditTrail);

export default router;
