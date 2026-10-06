// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BlockExam
 * @dev Verifiable, tamper-evident exam operations and submission integrity ledger.
 */
contract BlockExam {
    struct Exam {
        string examId;
        bytes32 examPaperHash;
        uint256 startTime;
        uint256 endTime;
        uint256 durationMinutes;
        bool isCancelled;
        address faculty;
    }

    struct SubmissionRecord {
        bytes32 submissionHash;
        uint256 submittedAt;
        bool isSubmitted;
    }

    // Mappings as specified
    mapping(string => Exam) public exams;
    mapping(string => mapping(address => bool)) public authorizedStudents;
    mapping(string => mapping(address => SubmissionRecord)) public submissions;

    // Events as specified
    event ExamCreated(
        string examId,
        uint256 startTime,
        uint256 endTime,
        address indexed faculty
    );

    event StudentAuthorized(
        string examId,
        address indexed student
    );

    event ExamSubmitted(
        string examId,
        address indexed student,
        bytes32 submissionHash,
        uint256 submittedAt
    );

    event ExamCancelled(
        string examId,
        address indexed faculty
    );

    modifier onlyFaculty(string memory _examId) {
        require(exams[_examId].faculty != address(0), "Exam does not exist");
        require(exams[_examId].faculty == msg.sender, "Only exam faculty can perform this action");
        _;
    }

    /**
     * @notice Creates a new exam entry with schedule and paper hash
     * @param _examId Unique exam identifier
     * @param _paperHash Cryptographic hash (SHA-256/Keccak) of the exam paper
     * @param _startTime Unix timestamp of exam start time
     * @param _endTime Unix timestamp of exam end time
     * @param _durationMinutes Allowed duration for an active session
     */
    function createExam(
        string memory _examId,
        bytes32 _paperHash,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _durationMinutes
    ) external {
        require(bytes(_examId).length > 0, "Exam ID cannot be empty");
        require(exams[_examId].faculty == address(0), "Exam already exists");
        require(_startTime >= block.timestamp, "Start time must be in future");
        require(_startTime < _endTime, "Start time must be before end time");
        require(_durationMinutes > 0, "Duration must be greater than zero");

        exams[_examId] = Exam({
            examId: _examId,
            examPaperHash: _paperHash,
            startTime: _startTime,
            endTime: _endTime,
            durationMinutes: _durationMinutes,
            isCancelled: false,
            faculty: msg.sender
        });

        emit ExamCreated(_examId, _startTime, _endTime, msg.sender);
    }

    /**
     * @notice Whitelists student wallet addresses in batch for an exam
     * @param _examId Unique exam identifier
     * @param _students Array of student addresses to authorize
     */
    function authorizeStudents(
        string memory _examId,
        address[] memory _students
    ) external onlyFaculty(_examId) {
        require(!exams[_examId].isCancelled, "Exam is cancelled");

        for (uint256 i = 0; i < _students.length; i++) {
            address student = _students[i];
            require(student != address(0), "Invalid student address");
            if (!authorizedStudents[_examId][student]) {
                authorizedStudents[_examId][student] = true;
                emit StudentAuthorized(_examId, student);
            }
        }
    }

    /**
     * @notice Cancels an existing exam
     * @param _examId Unique exam identifier
     */
    function cancelExam(string memory _examId) external onlyFaculty(_examId) {
        require(!exams[_examId].isCancelled, "Exam already cancelled");
        exams[_examId].isCancelled = true;
        emit ExamCancelled(_examId, msg.sender);
    }

    /**
     * @notice Checks if an exam is currently active based on block time and state
     * @param _examId Unique exam identifier
     * @return bool True if current block time is strictly within [startTime, endTime) and not cancelled
     */
    function isExamActive(string memory _examId) public view returns (bool) {
        Exam memory exam = exams[_examId];
        if (exam.faculty == address(0)) {
            return false;
        }

        return (
            block.timestamp >= exam.startTime &&
            block.timestamp < exam.endTime &&
            !exam.isCancelled
        );
    }

    /**
     * @notice Checks whether a student has valid access to start/take the exam
     * @param _examId Unique exam identifier
     * @param _student Address of the student
     * @return canAccess True if student is authorized, window is active, and no prior submission exists
     * @return reason Detailed description of validation state
     */
    function checkStudentAccess(
        string memory _examId,
        address _student
    ) public view returns (bool canAccess, string memory reason) {
        Exam memory exam = exams[_examId];

        if (exam.faculty == address(0)) {
            return (false, "Exam does not exist");
        }

        if (exam.isCancelled) {
            return (false, "Exam is cancelled");
        }

        if (submissions[_examId][_student].isSubmitted) {
            return (false, "Student already submitted");
        }

        if (!authorizedStudents[_examId][_student]) {
            return (false, "Student not authorized");
        }

        if (block.timestamp < exam.startTime) {
            return (false, "Exam has not started yet");
        }

        if (block.timestamp >= exam.endTime) {
            return (false, "Exam has ended");
        }

        return (true, "Access granted");
    }

    /**
     * @notice Records an immutable submission digest for a student
     * @param _examId Unique exam identifier
     * @param _student Address of the student who completed the attempt
     * @param _submissionHash SHA-256 or cryptographic hash of answers & metadata
     */
    function recordSubmission(
        string memory _examId,
        address _student,
        bytes32 _submissionHash
    ) external {
        Exam memory exam = exams[_examId];
        require(exam.faculty != address(0), "Exam does not exist");
        require(!exam.isCancelled, "Exam is cancelled");
        require(
            msg.sender == _student || msg.sender == exam.faculty,
            "Caller not authorized to submit"
        );
        require(authorizedStudents[_examId][_student], "Student not authorized");
        require(!submissions[_examId][_student].isSubmitted, "Duplicate submission not allowed");
        require(block.timestamp >= exam.startTime, "Exam has not started yet");
        require(
            block.timestamp <= exam.endTime + 300,
            "Submission window closed"
        );
        require(_submissionHash != bytes32(0), "Invalid submission hash");

        submissions[_examId][_student] = SubmissionRecord({
            submissionHash: _submissionHash,
            submittedAt: block.timestamp,
            isSubmitted: true
        });

        emit ExamSubmitted(_examId, _student, _submissionHash, block.timestamp);
    }

    /**
     * @notice Verifies whether a given calculated hash matches the on-chain submission record
     * @param _examId Unique exam identifier
     * @param _student Address of the student
     * @param _calculatedHash Hash calculated locally from response data
     * @return bool True if record exists and hash matches exactly
     */
    function verifySubmissionHash(
        string memory _examId,
        address _student,
        bytes32 _calculatedHash
    ) public view returns (bool) {
        SubmissionRecord memory record = submissions[_examId][_student];
        if (!record.isSubmitted) {
            return false;
        }

        return record.submissionHash == _calculatedHash;
    }
}
