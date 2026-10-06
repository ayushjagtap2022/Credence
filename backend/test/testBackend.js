import app from '../src/app.js';
import blockchainService from '../src/services/blockchainService.js';

async function runTests() {
  console.log('🧪 Starting backend endpoint & service verification tests...\n');

  const PORT = 5099;
  const server = app.listen(PORT);
  const baseUrl = `http://127.0.0.1:${PORT}`;

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check test
    console.log('Test 1: Health Check Endpoint');
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'GET /api/health returns HTTP 200');
    assert(healthData.status === 'HEALTHY', 'GET /api/health body contains status: HEALTHY');

    // 2. Auth input validation tests
    console.log('\nTest 2: Auth Input Validation');
    const invalidRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bad' }),
    });
    assert(invalidRegRes.status === 400, 'POST /api/auth/register rejects missing fields with 400');

    const invalidWalletRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        walletAddress: 'invalid-wallet',
      }),
    });
    assert(invalidWalletRes.status === 400, 'POST /api/auth/register rejects invalid Ethereum wallet with 400');

    // 3. Unauthorized access protection
    console.log('\nTest 3: Middleware Protected Endpoints');
    const unauthExamRes = await fetch(`${baseUrl}/api/exams/faculty/all`);
    assert(unauthExamRes.status === 401, 'GET /api/exams/faculty/all requires Bearer token (401)');

    const unauthStartRes = await fetch(`${baseUrl}/api/exams/BT101/start`);
    assert(unauthStartRes.status === 401, 'GET /api/exams/:examCode/start requires authentication (401)');

    // 4. BlockchainService verification
    console.log('\nTest 4: Blockchain Service Methods');
    const dummyHash = '0x' + 'a'.repeat(64);
    const createRes = await blockchainService.createExam('TEST-101', dummyHash, 1700000000, 1700005400, 90);
    assert(typeof createRes.txHash === 'string' && createRes.txHash.startsWith('0x'), 'createExam returns valid txHash');

    const accessCheck = await blockchainService.checkStudentAccess('TEST-101', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
    assert(typeof accessCheck.canAccess === 'boolean', 'checkStudentAccess returns boolean canAccess property');

    const submitRes = await blockchainService.recordSubmission('TEST-101', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', dummyHash);
    assert(typeof submitRes.txHash === 'string' && submitRes.txHash.startsWith('0x'), 'recordSubmission returns valid txHash');

    const verifyCheck = await blockchainService.verifySubmissionHash('TEST-101', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', dummyHash);
    assert(typeof verifyCheck === 'boolean', 'verifySubmissionHash returns boolean verification result');

    // 5. 404 Handler
    console.log('\nTest 5: 404 Handling');
    const notFoundRes = await fetch(`${baseUrl}/api/nonexistent`);
    assert(notFoundRes.status === 404, 'Unknown endpoint returns HTTP 404');
  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  } finally {
    server.close();
    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
