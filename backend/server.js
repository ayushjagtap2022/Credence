import app from './src/app.js';
import { env } from './src/config/env.js';
import prisma from './src/lib/prisma.js';

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 Credence Backend running on http://localhost:${PORT}`);
  console.log(`   - Environment: ${env.NODE_ENV}`);
  console.log(`   - Health check: http://localhost:${PORT}/api/health`);
  console.log(`   - Auth routes:  http://localhost:${PORT}/api/auth`);
  console.log(`   - Exam routes:  http://localhost:${PORT}/api/exams`);
  console.log(`   - Audit routes: http://localhost:${PORT}/api/audit`);
  console.log(`   - Admin routes: http://localhost:${PORT}/api/admin`);
  console.log('====================================================');
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down server gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Prisma disconnected. Server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
