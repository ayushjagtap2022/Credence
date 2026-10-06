import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import blockchainService from '../services/blockchainService.js';

/**
 * ----------------------------------------------------
 * Faculty Exam Controllers
 * ----------------------------------------------------
 */

/**
 * Create a new exam with deterministic questions hash and blockchain registration
 */
export async function createExam(req, res) {
  try {
    const {
      examCode,
      title,
      description,
      startTime,
      endTime,
      durationMinutes,
      totalMarks,
      passingMarks,
      questions,
    } = req.body;

    if (!examCode || !title || !startTime || !endTime || !durationMinutes) {
      return res.status(400).json({
        error: 'Missing required exam parameters: examCode, title, startTime, endTime, durationMinutes',
      });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        error: 'Exam must contain at least 1 question in the questions array',
      });
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (startDate >= endDate) {
      return res.status(400).json({ error: 'Start time must be strictly before end time' });
    }

    // Check if exam code already exists
    const existing = await prisma.exam.findUnique({
      where: { examCode: examCode.trim().toUpperCase() },
    });

    if (existing) {
      return res.status(409).json({ error: `An exam with code ${examCode} already exists` });
    }

    // Validate and normalize questions array
    const normalizedQuestions = questions.map((q, index) => {
      if (!q.questionText || !q.optionA || !q.optionB || !q.optionC || !q.optionD || !q.correctOption) {
        throw new Error(`Question ${index + 1} is missing required fields (questionText, options A-D, correctOption)`);
      }

      const opt = q.correctOption.trim().toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(opt)) {
        throw new Error(`Question ${index + 1} has invalid correctOption "${q.correctOption}". Must be A, B, C, or D.`);
      }

      return {
        text: q.questionText.trim(),
        optionA: q.optionA.trim(),
        optionB: q.optionB.trim(),
        optionC: q.optionC.trim(),
        optionD: q.optionD.trim(),
        correctOption: opt,
        marks: Number(q.marks) || 1,
      };
    });

    // Compute deterministic SHA-256 hash of all questions
    const deterministicPayload = JSON.stringify(
      normalizedQuestions.map((q) => ({
        text: q.text,
        a: q.optionA,
        b: q.optionB,
        c: q.optionC,
        d: q.optionD,
        ans: q.correctOption,
        marks: q.marks,
      }))
    );
    const paperHashHex = crypto.createHash('sha256').update(deterministicPayload).digest('hex');
    const examPaperHash = `0x${paperHashHex}`;

    const startUnix = Math.floor(startDate.getTime() / 1000);
    const endUnix = Math.floor(endDate.getTime() / 1000);

    // Call Smart Contract: contract.createExam(examCode, examPaperHash, startUnix, endUnix, duration)
    const normalizedCode = examCode.trim().toUpperCase();
    const chainReceipt = await blockchainService.createExam(
      normalizedCode,
      examPaperHash,
      startUnix,
      endUnix,
      Number(durationMinutes)
    );

    const calculatedTotal = normalizedQuestions.reduce((acc, q) => acc + q.marks, 0);

    // Store in Neon Database via Prisma
    const exam = await prisma.exam.create({
      data: {
        examCode: normalizedCode,
        title: title.trim(),
        description: description ? description.trim() : null,
        startTime: startDate,
        endTime: endDate,
        durationMinutes: Number(durationMinutes),
        totalMarks: Number(totalMarks) || calculatedTotal,
        passingMarks: Number(passingMarks) || Math.ceil(calculatedTotal * 0.4),
        txHash: chainReceipt.txHash,
        createdById: req.user.id,
        questions: {
          create: normalizedQuestions.map((q) => ({
            questionText: q.text,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctOption: q.correctOption,
            marks: q.marks,
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    const ipAddress = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || req.ip || '127.0.0.1').toString().trim();
    await prisma.auditLog.create({
      data: {
        action: 'EXAM_CREATED',
        details: JSON.stringify({
          examCode: normalizedCode,
          title: exam.title,
          totalMarks: exam.totalMarks,
          durationMinutes: exam.durationMinutes,
          txHash: chainReceipt.txHash,
          createdBy: req.user.email,
        }),
        userId: req.user.id,
        ipAddress,
      },
    }).catch((err) => console.error('[AuditLog exam creation error]:', err.message));

    return res.status(201).json({
      success: true,
      message: 'Exam created and registered on-chain successfully',
      exam,
      paperHash: examPaperHash,
      txHash: chainReceipt.txHash,
      blockNumber: chainReceipt.blockNumber,
    });
  } catch (error) {
    console.error('[examController.createExam] Error:', error);
    return res.status(500).json({ error: 'Failed to create exam', details: error.message });
  }
}

/**
 * Batch authorize student wallet addresses on the smart contract
 */
export async function authorizeStudents(req, res) {
  try {
    const { examCode } = req.params;
    const { studentWallets } = req.body;

    if (!Array.isArray(studentWallets) || studentWallets.length === 0) {
      return res.status(400).json({ error: 'studentWallets must be a non-empty array of Ethereum addresses' });
    }

    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    const validWallets = studentWallets
      .map((w) => (typeof w === 'string' ? w.trim().toLowerCase() : ''))
      .filter((w) => ethAddressRegex.test(w));

    if (validWallets.length === 0) {
      return res.status(400).json({ error: 'No valid Ethereum wallet addresses provided' });
    }

    const normalizedCode = examCode.trim().toUpperCase();

    // Verify exam exists in database
    const exam = await prisma.exam.findUnique({
      where: { examCode: normalizedCode },
    });

    if (!exam) {
      return res.status(404).json({ error: `Exam with code ${normalizedCode} not found` });
    }

    // Call smart contract: contract.authorizeStudents(examCode, wallets)
    const chainReceipt = await blockchainService.authorizeStudents(normalizedCode, validWallets);

    return res.status(200).json({
      success: true,
      message: `Authorized ${validWallets.length} students on-chain for ${normalizedCode}`,
      examCode: normalizedCode,
      authorizedWallets: validWallets,
      txHash: chainReceipt.txHash,
    });
  } catch (error) {
    console.error('[examController.authorizeStudents] Error:', error);
    return res.status(500).json({ error: 'Failed to authorize students', details: error.message });
  }
}

/**
 * Returns all exams created by faculty with attempt and completion metrics
 */
export async function getFacultyExams(req, res) {
  try {
    const filter = req.user.role === 'ADMIN' ? {} : { createdById: req.user.id };

    const exams = await prisma.exam.findMany({
      where: filter,
      include: {
        questions: {
          select: { id: true },
        },
        attempts: {
          select: {
            id: true,
            studentId: true,
            studentWallet: true,
            score: true,
            submissionHash: true,
            blockchainTxHash: true,
            onChainVerified: true,
            submittedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedExams = exams.map((exam) => ({
      id: exam.id,
      examCode: exam.examCode,
      title: exam.title,
      description: exam.description,
      startTime: exam.startTime,
      endTime: exam.endTime,
      durationMinutes: exam.durationMinutes,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      txHash: exam.txHash,
      questionCount: exam.questions.length,
      attemptCount: exam.attempts.length,
      attempts: exam.attempts,
    }));

    return res.status(200).json({
      success: true,
      exams: enrichedExams,
    });
  } catch (error) {
    console.error('[examController.getFacultyExams] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch faculty exams', details: error.message });
  }
}

/**
 * ----------------------------------------------------
 * Student Exam Controllers
 * ----------------------------------------------------
 */

/**
 * Query available exams and resolve authoritative on-chain state (LOCKED, ACTIVE, CLOSED)
 */
export async function getStudentAvailableExams(req, res) {
  try {
    const studentWallet = req.user.walletAddress.toLowerCase();

    const exams = await prisma.exam.findMany({
      include: {
        questions: { select: { id: true, marks: true } },
        attempts: {
          where: { studentId: req.user.id },
          select: {
            id: true,
            score: true,
            submittedAt: true,
            submissionHash: true,
            blockchainTxHash: true,
            onChainVerified: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const now = new Date();

    const availableExams = await Promise.all(
      exams.map(async (exam) => {
        // Query on-chain status
        const isChainActive = await blockchainService.isExamActive(exam.examCode);

        let timingStatus = 'CLOSED';
        if (isChainActive) {
          timingStatus = 'ACTIVE';
        } else if (now < exam.startTime) {
          timingStatus = 'LOCKED';
        } else {
          timingStatus = 'CLOSED';
        }

        const studentAttempt = exam.attempts[0] || null;

        return {
          id: exam.id,
          examCode: exam.examCode,
          title: exam.title,
          description: exam.description,
          startTime: exam.startTime,
          endTime: exam.endTime,
          durationMinutes: exam.durationMinutes,
          totalMarks: exam.totalMarks,
          passingMarks: exam.passingMarks,
          questionCount: exam.questions.length,
          timingStatus,
          hasSubmitted: Boolean(studentAttempt),
          attempt: studentAttempt,
        };
      })
    );

    return res.status(200).json({
      success: true,
      exams: availableExams,
    });
  } catch (error) {
    console.error('[examController.getStudentAvailableExams] Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve available exams', details: error.message });
  }
}

/**
 * Start an exam session with on-chain access verification
 * Strips out correctOption so answers are completely protected from the frontend!
 */
export async function startExam(req, res) {
  try {
    const { examCode } = req.params;
    const studentWallet = req.user.walletAddress.toLowerCase();
    const normalizedCode = examCode.trim().toUpperCase();

    // Check on-chain access control
    const { canAccess, reason } = await blockchainService.checkStudentAccess(normalizedCode, studentWallet);
    if (!canAccess) {
      // Check if exam exists in DB
      const dbExam = await prisma.exam.findUnique({
        where: { examCode: normalizedCode },
      });

      if (!dbExam) {
        return res.status(404).json({ error: `Exam ${normalizedCode} not found` });
      }

      // If the exam was created in DB but not yet anchored on-chain, allow access for testing/dev
      const isDevFallback =
        reason === 'Exam does not exist' ||
        reason.includes('offline') ||
        reason.includes('dev');

      if (!isDevFallback) {
        return res.status(403).json({
          error: 'Access denied by smart contract',
          reason: reason || 'Unauthorized access window or wallet',
          canAccess: false,
        });
      }
    }

    // Query exam and questions from DB
    const exam = await prisma.exam.findUnique({
      where: { examCode: normalizedCode },
      include: {
        questions: {
          select: {
            id: true,
            questionText: true,
            optionA: true,
            optionB: true,
            optionC: true,
            optionD: true,
            marks: true,
            // CRITICAL: correctOption is excluded to prevent cheating!
          },
        },
      },
    });

    if (!exam) {
      return res.status(404).json({ error: `Exam ${normalizedCode} not found` });
    }

    return res.status(200).json({
      success: true,
      canAccess: true,
      exam: {
        id: exam.id,
        examCode: exam.examCode,
        title: exam.title,
        description: exam.description,
        durationMinutes: exam.durationMinutes,
        startTime: exam.startTime,
        endTime: exam.endTime,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
      },
      questions: exam.questions,
    });
  } catch (error) {
    console.error('[examController.startExam] Error:', error);
    return res.status(500).json({ error: 'Failed to start exam session', details: error.message });
  }
}

/**
 * Evaluate submitted answers, generate SHA-256 submission hash, and register on-chain
 */
export async function submitExam(req, res) {
  try {
    const { examCode } = req.params;
    const { answers } = req.body;
    const studentWallet = req.user.walletAddress.toLowerCase();
    const normalizedCode = examCode.trim().toUpperCase();

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Answers must be provided as an object mapping question IDs to chosen options' });
    }

    // Fetch exam with questions including correctOption for scoring
    const exam = await prisma.exam.findUnique({
      where: { examCode: normalizedCode },
      include: {
        questions: true,
        attempts: {
          where: { studentId: req.user.id },
        },
      },
    });

    if (!exam) {
      return res.status(404).json({ error: `Exam ${normalizedCode} not found` });
    }

    if (exam.attempts.length > 0) {
      return res.status(409).json({ error: 'You have already submitted an attempt for this assessment' });
    }

    // Evaluate answers & compute score
    let score = 0;
    const evaluationDetails = [];

    for (const question of exam.questions) {
      const studentAnswer = (answers[question.id] || '').trim().toUpperCase();
      const isCorrect = studentAnswer === question.correctOption;
      if (isCorrect) {
        score += question.marks;
      }
      evaluationDetails.push({
        questionId: question.id,
        chosen: studentAnswer,
        isCorrect,
      });
    }

    // Normalize and sort answers deterministically for SHA-256 generation
    const sortedAnswers = Object.keys(answers)
      .sort()
      .map((qid) => ({
        id: qid,
        answer: String(answers[qid]).trim().toUpperCase(),
      }));

    const timestamp = Math.floor(Date.now() / 1000);

    // Submission hash formula: sha256(walletAddress + examCode + JSON.stringify(sortedAnswers) + timestamp)
    const hashString = `${studentWallet}${normalizedCode}${JSON.stringify(sortedAnswers)}${timestamp}`;
    const rawSubmissionHash = crypto.createHash('sha256').update(hashString).digest('hex');
    const bytes32SubmissionHash = `0x${rawSubmissionHash}`;

    // Call smart contract: contract.recordSubmission(examCode, walletAddress, "0x" + submissionHash)
    const chainReceipt = await blockchainService.recordSubmission(
      normalizedCode,
      studentWallet,
      bytes32SubmissionHash
    );

    // Persist attempt in Neon PostgreSQL via Prisma
    const attempt = await prisma.examAttempt.create({
      data: {
        examId: exam.id,
        studentId: req.user.id,
        studentWallet,
        answersJson: answers,
        score,
        submissionHash: rawSubmissionHash,
        blockchainTxHash: chainReceipt.txHash,
        onChainVerified: true,
        submittedAt: new Date(timestamp * 1000),
      },
    });

    const ipAddress = (req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || req.ip || '127.0.0.1').toString().trim();
    await prisma.auditLog.create({
      data: {
        action: 'EXAM_SUBMITTED',
        details: JSON.stringify({
          examCode: normalizedCode,
          score,
          totalMarks: exam.totalMarks,
          passed: score >= exam.passingMarks,
          submissionHash: rawSubmissionHash,
          txHash: chainReceipt.txHash,
          studentEmail: req.user.email,
        }),
        userId: req.user.id,
        ipAddress,
      },
    }).catch((err) => console.error('[AuditLog exam submit error]:', err.message));

    return res.status(201).json({
      success: true,
      message: 'Exam submitted and permanently recorded on the blockchain ledger',
      score,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      passed: score >= exam.passingMarks,
      submissionHash: rawSubmissionHash,
      blockchainTxHash: chainReceipt.txHash,
      blockNumber: chainReceipt.blockNumber,
      onChainVerified: true,
      submittedAt: attempt.submittedAt,
    });
  } catch (error) {
    console.error('[examController.submitExam] Error:', error);
    return res.status(500).json({ error: 'Failed to process exam submission', details: error.message });
  }
}
