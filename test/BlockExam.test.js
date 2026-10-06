import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("BlockExam Smart Contract", function () {
  let blockExam;
  let owner;
  let faculty;
  let student1;
  let student2;
  let unauthorizedStudent;

  const examId = "CS-402-FINAL";
  const paperHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("exam-paper-v1"));
  const durationMinutes = 90;

  let startTime;
  let endTime;

  beforeEach(async function () {
    [owner, faculty, student1, student2, unauthorizedStudent] = await hre.ethers.getSigners();

    const BlockExamFactory = await hre.ethers.getContractFactory("BlockExam");
    blockExam = await BlockExamFactory.deploy();
    await blockExam.waitForDeployment();

    // Set future start and end time based on current block timestamp
    const now = await time.latest();
    startTime = now + 1000; // 1000 seconds in future
    endTime = startTime + 5400; // 90 minutes (5400 seconds) later

    // Create exam as faculty
    await blockExam.connect(faculty).createExam(
      examId,
      paperHash,
      startTime,
      endTime,
      durationMinutes
    );

    // Whitelist student1 and student2
    await blockExam.connect(faculty).authorizeStudents(examId, [student1.address, student2.address]);
  });

  describe("Exam Creation and Whitelisting", function () {
    it("Should correctly store exam details", async function () {
      const exam = await blockExam.exams(examId);
      expect(exam.examId).to.equal(examId);
      expect(exam.examPaperHash).to.equal(paperHash);
      expect(exam.startTime).to.equal(startTime);
      expect(exam.endTime).to.equal(endTime);
      expect(exam.durationMinutes).to.equal(durationMinutes);
      expect(exam.isCancelled).to.be.false;
      expect(exam.faculty).to.equal(faculty.address);
    });

    it("Should emit StudentAuthorized events", async function () {
      const newStudent = unauthorizedStudent.address;
      await expect(blockExam.connect(faculty).authorizeStudents(examId, [newStudent]))
        .to.emit(blockExam, "StudentAuthorized")
        .withArgs(examId, newStudent);

      expect(await blockExam.authorizedStudents(examId, newStudent)).to.be.true;
    });

    it("Should prevent non-faculty from authorizing students", async function () {
      await expect(
        blockExam.connect(student1).authorizeStudents(examId, [unauthorizedStudent.address])
      ).to.be.revertedWith("Only exam faculty can perform this action");
    });

    it("Should prevent duplicate exam IDs", async function () {
      await expect(
        blockExam.connect(faculty).createExam(
          examId,
          paperHash,
          startTime + 100,
          endTime + 100,
          durationMinutes
        )
      ).to.be.revertedWith("Exam already exists");
    });
  });

  describe("Timing & Access Control (checkStudentAccess & isExamActive)", function () {
    it("Rejects access before start time", async function () {
      // Current time is before startTime
      expect(await time.latest()).to.be.lessThan(startTime);

      // Verify isExamActive is false
      expect(await blockExam.isExamActive(examId)).to.be.false;

      // Verify checkStudentAccess
      const [canAccess, reason] = await blockExam.checkStudentAccess(examId, student1.address);
      expect(canAccess).to.be.false;
      expect(reason).to.equal("Exam has not started yet");
    });

    it("Permits access inside window", async function () {
      // Fast forward time to inside the active window
      await time.increaseTo(startTime + 300);

      // Verify isExamActive is true
      expect(await blockExam.isExamActive(examId)).to.be.true;

      // Verify checkStudentAccess returns true for authorized student
      const [canAccess, reason] = await blockExam.checkStudentAccess(examId, student1.address);
      expect(canAccess).to.be.true;
      expect(reason).to.equal("Access granted");
    });

    it("Rejects access after end time", async function () {
      // Fast forward time past endTime
      await time.increaseTo(endTime + 1);

      // Verify isExamActive is false
      expect(await blockExam.isExamActive(examId)).to.be.false;

      // Verify checkStudentAccess returns false
      const [canAccess, reason] = await blockExam.checkStudentAccess(examId, student1.address);
      expect(canAccess).to.be.false;
      expect(reason).to.equal("Exam has ended");
    });

    it("Rejects access for unauthorized student even inside window", async function () {
      await time.increaseTo(startTime + 300);

      const [canAccess, reason] = await blockExam.checkStudentAccess(examId, unauthorizedStudent.address);
      expect(canAccess).to.be.false;
      expect(reason).to.equal("Student not authorized");
    });

    it("Rejects access for cancelled exam", async function () {
      await time.increaseTo(startTime + 300);

      await blockExam.connect(faculty).cancelExam(examId);

      const [canAccess, reason] = await blockExam.checkStudentAccess(examId, student1.address);
      expect(canAccess).to.be.false;
      expect(reason).to.equal("Exam is cancelled");
      expect(await blockExam.isExamActive(examId)).to.be.false;
    });
  });

  describe("Submissions & Integrity Check", function () {
    const submissionHash = hre.ethers.sha256(hre.ethers.toUtf8Bytes("answers:Q1-B,Q2-C,Q3-A"));

    it("Allows student to record submission within window", async function () {
      await time.increaseTo(startTime + 600);

      await expect(blockExam.connect(student1).recordSubmission(examId, student1.address, submissionHash))
        .to.emit(blockExam, "ExamSubmitted");

      const record = await blockExam.submissions(examId, student1.address);
      expect(record.isSubmitted).to.be.true;
      expect(record.submissionHash).to.equal(submissionHash);
    });

    it("Allows submission within the 5-minute (300s) grace buffer after endTime", async function () {
      // Time between endTime and endTime + 300
      await time.increaseTo(endTime + 120);

      await expect(blockExam.connect(student1).recordSubmission(examId, student1.address, submissionHash))
        .to.emit(blockExam, "ExamSubmitted");

      const record = await blockExam.submissions(examId, student1.address);
      expect(record.isSubmitted).to.be.true;
    });

    it("Rejects submission beyond the 5-minute buffer", async function () {
      // Past endTime + 300
      await time.increaseTo(endTime + 301);

      await expect(
        blockExam.connect(student1).recordSubmission(examId, student1.address, submissionHash)
      ).to.be.revertedWith("Submission window closed");
    });

    it("Blocks duplicate attempts", async function () {
      await time.increaseTo(startTime + 600);

      // First submission succeeds
      await blockExam.connect(student1).recordSubmission(examId, student1.address, submissionHash);

      // Second submission attempt must fail
      const secondHash = hre.ethers.sha256(hre.ethers.toUtf8Bytes("different-answers"));
      await expect(
        blockExam.connect(student1).recordSubmission(examId, student1.address, secondHash)
      ).to.be.revertedWith("Duplicate submission not allowed");

      // Check student access also returns "Student already submitted"
      const [canAccess, reason] = await blockExam.checkStudentAccess(examId, student1.address);
      expect(canAccess).to.be.false;
      expect(reason).to.equal("Student already submitted");
    });

    it("Correctly verifies matching and mismatching submission hashes", async function () {
      await time.increaseTo(startTime + 600);
      await blockExam.connect(student1).recordSubmission(examId, student1.address, submissionHash);

      // Matching hash verification
      const isMatch = await blockExam.verifySubmissionHash(examId, student1.address, submissionHash);
      expect(isMatch).to.be.true;

      // Tampered / altered hash
      const fakeHash = hre.ethers.sha256(hre.ethers.toUtf8Bytes("altered-answers"));
      const isFakeMatch = await blockExam.verifySubmissionHash(examId, student1.address, fakeHash);
      expect(isFakeMatch).to.be.false;

      // Unsubmitted student
      const unsubmittedMatch = await blockExam.verifySubmissionHash(examId, student2.address, submissionHash);
      expect(unsubmittedMatch).to.be.false;
    });
  });
});
