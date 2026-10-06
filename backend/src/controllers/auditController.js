import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import blockchainService from '../services/blockchainService.js';

/**
 * Verify student submission integrity against the on-chain ledger
 * Endpoint: GET /api/audit/verify/:examCode/:walletAddress
 */
export async function verifySubmission(req, res) {
  try {
    const { examCode, walletAddress } = req.params;

    if (!examCode || !walletAddress) {
      return res.status(400).json({ error: 'examCode and walletAddress parameters are required' });
    }

    const normalizedCode = examCode.trim().toUpperCase();
    const normalizedWallet = walletAddress.trim().toLowerCase();

    // 1. Retrieve stored attempt from Neon Database
    const attempt = await prisma.examAttempt.findFirst({
      where: {
        studentWallet: normalizedWallet,
        exam: {
          examCode: normalizedCode,
        },
      },
      include: {
        exam: true,
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            walletAddress: true,
          },
        },
      },
    });

    // 2. Call Smart Contract: contract.submissions(examCode, walletAddress)
    const onChainRecord = await blockchainService.getSubmissionRecord(normalizedCode, normalizedWallet);

    if (!attempt && (!onChainRecord || !onChainRecord.isSubmitted)) {
      return res.status(404).json({
        success: false,
        error: `No submission found for student ${normalizedWallet} on exam ${normalizedCode}`,
      });
    }

    // 3. Recalculate SHA-256 hash from stored answers & metadata
    let recalculatedHash = null;
    let hashesMatch = false;

    if (attempt) {
      const timestamp = Math.floor(new Date(attempt.submittedAt).getTime() / 1000);
      const answers = attempt.answersJson || {};

      const sortedAnswers = Object.keys(answers)
        .sort()
        .map((qid) => ({
          id: qid,
          answer: String(answers[qid]).trim().toUpperCase(),
        }));

      const hashPayload = `${normalizedWallet}${normalizedCode}${JSON.stringify(sortedAnswers)}${timestamp}`;
      recalculatedHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

      const onChainRaw = onChainRecord?.submissionHash
        ? onChainRecord.submissionHash.replace(/^0x/, '').toLowerCase()
        : '';
      const storedRaw = attempt.submissionHash.replace(/^0x/, '').toLowerCase();
      const recalculatedRaw = recalculatedHash.toLowerCase();

      // Check if recalculated hash matches stored and on-chain hashes
      hashesMatch =
        (onChainRaw && onChainRaw === recalculatedRaw) ||
        storedRaw === recalculatedRaw;
    }

    return res.status(200).json({
      success: true,
      verified: hashesMatch,
      examCode: normalizedCode,
      examTitle: attempt?.exam?.title || 'Unknown Exam',
      studentName: attempt?.student?.fullName || 'Registered Student',
      studentWallet: normalizedWallet,
      score: attempt?.score ?? null,
      totalMarks: attempt?.exam?.totalMarks ?? null,
      passingMarks: attempt?.exam?.passingMarks ?? null,
      passed: attempt ? (attempt.score || 0) >= (attempt.exam.passingMarks || 0) : null,
      integrityReport: {
        recalculatedHash,
        storedSubmissionHash: attempt?.submissionHash || null,
        onChainHash: onChainRecord?.submissionHash || null,
        onChainTimestamp: onChainRecord?.submittedAt
          ? new Date(onChainRecord.submittedAt * 1000).toISOString()
          : null,
        isSubmittedOnChain: Boolean(onChainRecord?.isSubmitted),
        blockchainTxHash: attempt?.blockchainTxHash || null,
        status: hashesMatch ? 'VERIFIED_TAMPER_EVIDENT' : 'INTEGRITY_CHECK_FAILED',
        verificationTimestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[auditController.verifySubmission] Error:', error);
    return res.status(500).json({ error: 'Failed to verify submission integrity', details: error.message });
  }
}

/**
 * Get recent audit log events across all exams
 * Endpoint: GET /api/audit/trail
 */
export async function getAuditTrail(req, res) {
  try {
    const attempts = await prisma.examAttempt.findMany({
      take: 50,
      orderBy: { submittedAt: 'desc' },
      include: {
        exam: {
          select: {
            examCode: true,
            title: true,
          },
        },
        student: {
          select: {
            fullName: true,
            walletAddress: true,
          },
        },
      },
    });

    const auditTrail = attempts.map((a) => ({
      id: a.id,
      event: 'ExamSubmitted',
      subject: `${a.student.fullName} · ${a.exam.examCode}`,
      examTitle: a.exam.title,
      walletAddress: a.studentWallet,
      submissionHash: a.submissionHash,
      txHash: a.blockchainTxHash,
      time: a.submittedAt,
      verified: a.onChainVerified,
    }));

    return res.status(200).json({
      success: true,
      events: auditTrail,
    });
  } catch (error) {
    console.error('[auditController.getAuditTrail] Error:', error);
    return res.status(500).json({ error: 'Failed to load audit trail', details: error.message });
  }
}
