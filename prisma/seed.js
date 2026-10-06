import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Prisma database seed for BlockExam...");

  const defaultPassword = "Password123";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // 0. Seed Super Admin account
  const admin = await prisma.user.upsert({
    where: { email: "admin@college.edu" },
    update: {
      password: hashedPassword,
      walletAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      fullName: "System Super Admin",
      role: "ADMIN",
    },
    create: {
      email: "admin@college.edu",
      password: hashedPassword,
      role: "ADMIN",
      walletAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      fullName: "System Super Admin",
    },
  });
  console.log(`✅ Super Admin created/updated: ${admin.email} (${admin.walletAddress})`);

  // 1. Seed Faculty account
  const faculty = await prisma.user.upsert({
    where: { email: "faculty@college.edu" },
    update: {
      password: hashedPassword,
      walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      fullName: "Dr. Ananya Sharma",
      role: "FACULTY",
    },
    create: {
      email: "faculty@college.edu",
      password: hashedPassword,
      role: "FACULTY",
      walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      fullName: "Dr. Ananya Sharma",
    },
  });
  console.log(`✅ Faculty created/updated: ${faculty.email} (${faculty.walletAddress})`);

  // 2. Seed 2 Student accounts
  const student1 = await prisma.user.upsert({
    where: { email: "student1@college.edu" },
    update: {
      password: hashedPassword,
      walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      fullName: "Rohan Mehta",
      role: "STUDENT",
    },
    create: {
      email: "student1@college.edu",
      password: hashedPassword,
      role: "STUDENT",
      walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      fullName: "Rohan Mehta",
    },
  });
  console.log(`✅ Student 1 created/updated: ${student1.email} (${student1.walletAddress})`);

  const student2 = await prisma.user.upsert({
    where: { email: "student2@college.edu" },
    update: {
      password: hashedPassword,
      walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      fullName: "Aarav Nair",
      role: "STUDENT",
    },
    create: {
      email: "student2@college.edu",
      password: hashedPassword,
      role: "STUDENT",
      walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      fullName: "Aarav Nair",
    },
  });
  console.log(`✅ Student 2 created/updated: ${student2.email} (${student2.walletAddress})`);

  // 3. Seed 1 complete Exam: "BT101: Blockchain Architecture"
  const now = new Date();
  const startTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
  const endTime = new Date(startTime.getTime() + 90 * 60 * 1000); // 90 minutes duration

  const exam = await prisma.exam.upsert({
    where: { examCode: "BT101" },
    update: {
      title: "BT101: Blockchain Architecture",
      description: "Comprehensive assessment evaluating cryptographic primitives, consensus mechanisms, smart contract execution, and decentralized ledger integrity.",
      startTime,
      endTime,
      durationMinutes: 90,
      totalMarks: 5,
      passingMarks: 3,
      txHash: "0x8a42c10d7f51950e41712a14b9c1d09e3a7584cd38e9a26315ef98711821d91c",
      createdById: faculty.id,
    },
    create: {
      examCode: "BT101",
      title: "BT101: Blockchain Architecture",
      description: "Comprehensive assessment evaluating cryptographic primitives, consensus mechanisms, smart contract execution, and decentralized ledger integrity.",
      startTime,
      endTime,
      durationMinutes: 90,
      totalMarks: 5,
      passingMarks: 3,
      txHash: "0x8a42c10d7f51950e41712a14b9c1d09e3a7584cd38e9a26315ef98711821d91c",
      createdById: faculty.id,
    },
  });
  console.log(`✅ Exam created/updated: ${exam.examCode} - ${exam.title}`);

  // 4. Seed 5 Multiple-Choice Questions for BT101
  const questionsData = [
    {
      questionText: "Which property does a cryptographic hash function (such as SHA-256) fundamentally provide?",
      optionA: "Reversibility of the original plaintext",
      optionB: "Deterministic fixed-length output from arbitrary input",
      optionC: "Lossless compression of large multimedia payloads",
      optionD: "Secret session key exchange without public key certificates",
      correctOption: "B",
      marks: 1,
    },
    {
      questionText: "In a permissioned blockchain, who is permitted to validate transactions and propose new blocks?",
      optionA: "Any anonymous participant connected via peer-to-peer gossip",
      optionB: "Authorized network entities approved by consortium governance",
      optionC: "Only centralized third-party exchange operators",
      optionD: "ASIC mining nodes running Proof-of-Work algorithms",
      correctOption: "B",
      marks: 1,
    },
    {
      questionText: "What is the primary role of a consensus mechanism in a distributed ledger network?",
      optionA: "To encrypt all state database tables on disk",
      optionB: "To reach verifiable agreement on state transitions and ledger order among peers",
      optionC: "To accelerate single-point SQL relational index lookups",
      optionD: "To eliminate the need for cryptographic signatures",
      correctOption: "B",
      marks: 1,
    },
    {
      questionText: "What is the primary advantage of executing smart contracts on an Ethereum Virtual Machine (EVM)?",
      optionA: "Zero transaction cost and unlimited free compute cycles",
      optionB: "Deterministic, trustless state transitions executed and verified by all consensus nodes",
      optionC: "Direct execution of arbitrary non-deterministic C++ system calls",
      optionD: "Native unencrypted cloud database storage",
      correctOption: "B",
      marks: 1,
    },
    {
      questionText: "How does a Merkle Tree optimize transaction verification in a blockchain block header?",
      optionA: "By compressing image attachments into block metadata",
      optionB: "By allowing logarithmic-time O(log n) cryptographic proof of transaction inclusion",
      optionC: "By replacing public-key cryptography with symmetric stream ciphers",
      optionD: "By disabling ledger append-only constraints",
      correctOption: "B",
      marks: 1,
    },
  ];

  // Remove existing questions for this exam and re-create to keep seed clean
  await prisma.question.deleteMany({
    where: { examId: exam.id },
  });

  for (let i = 0; i < questionsData.length; i++) {
    const q = questionsData[i];
    await prisma.question.create({
      data: {
        examId: exam.id,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        marks: q.marks,
      },
    });
  }
  console.log(`✅ Seeded 5 multiple-choice questions for ${exam.examCode}`);

  console.log("🎉 Database seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
