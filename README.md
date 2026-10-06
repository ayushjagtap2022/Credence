# Credence — Verifiable Academic Assessment & Integrity Platform

A modern, decentralized examination operations and integrity verification platform powered by **Ethereum Sepolia**, **Neon PostgreSQL**, **React**, **TypeScript**, and **Tailwind CSS**.

---

## Features

- **Faculty Console**:
  - Exam creator with dynamic question builders and scoring thresholds.
  - Whitelist authorization for student IDs and wallet addresses.
  - Attempt monitor and exam schedule status tracking.
  - Append-only audit trail logging simulated blockchain events.
- **Student Portal**:
  - Live exam session with countdown timer, flag-for-review, and question palette.
  - Local cryptographic integrity digest generation (Web Crypto SHA-256).
  - Verifiable submission receipts with instant SHA-256 recalculation.
- **Design & Theme**:
  - Dark / Light mode toggle.
  - Polished responsive UI with Tailwind CSS and Radix UI primitives.
  - Simulated ledger state and network time controls.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

### Installation

Install dependencies using `npm`:

```bash
npm install
```

### Development Server

Start the local Vite development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Production Build

Typecheck and build the production bundle:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## Blockchain Layer (Solidity & Hardhat)

The project includes a Solidity smart contract (`BlockExam.sol`) compiled with Solidity `0.8.20` and tested with Hardhat.

### Commands

```bash
# Compile smart contracts
npm run compile

# Run Hardhat unit tests (14 test cases covering access control, timing, and hash verification)
npm test

# Run local Hardhat node
npm run chain

# Deploy contract locally (Hardhat network)
npm run deploy:hardhat

# Deploy contract to local running node
npm run deploy:local

# Deploy contract to Sepolia testnet
npm run deploy:sepolia
```

### Sepolia Configuration

Copy `.env.example` to `.env` and fill in your RPC URL and private key:

```env
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY"
DEPLOYER_PRIVATE_KEY="YOUR_WALLET_PRIVATE_KEY"
```

Deployed contract addresses and ABIs are exported to `config/contractData.json` and `src/config/contractData.json`.

---

## Database Layer (Prisma & Neon PostgreSQL)

The off-chain persistence layer uses **Prisma ORM** configured for **Neon Serverless PostgreSQL** with connection pooling (`pgbouncer=true`).

### Environment Variables

Configure your Neon connection strings in `.env`:

```env
# Neon Pooled connection (for app queries)
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"

# Neon Direct connection (for migrations and schema push)
DIRECT_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### Database Commands

```bash
# Generate Prisma Client
npm run db:generate

# Push schema directly to Neon database
npm run db:push

# Run database migrations
npm run db:migrate

# Seed database with faculty, students, and BT101 exam with questions
npm run db:seed

# Launch Prisma Studio web GUI
npm run db:studio
```

### Models

- **`User`**: Faculty and student credentials (bcrypt hashed passwords, role enum, Ethereum wallet addresses).
- **`Exam`**: Exam schedules, passing thresholds, questions relation, and on-chain creation tx hash.
- **`Question`**: Multiple choice questions (options A-D, correct option, marks) with cascade deletion.
- **`ExamAttempt`**: Student exam attempts with answer payload, score, calculated SHA-256 submission hash, blockchain tx hash, and on-chain verification status.

---

## Backend API Layer (Node.js & Express)

The backend in `backend/` bridges the React frontend, Neon PostgreSQL, and the Ethereum/Hardhat blockchain.

### Run Backend Server

```bash
# Start backend server on http://localhost:5000
npm run server

# Start backend in watch mode (auto-reload)
npm run server:dev
```

### Endpoints

| Category | Method | Endpoint | Description | Auth Required |
|---|---|---|---|---|
| **Health** | `GET` | `/api/health` | Service health check | No |
| **Auth** | `POST` | `/api/auth/register` | Register user (bcrypt & wallet) | No |
| **Auth** | `POST` | `/api/auth/login` | Login and receive JWT | No |
| **Auth** | `GET` | `/api/auth/me` | Current user profile | Bearer Token |
| **Faculty** | `POST` | `/api/exams/create` | Deploy exam on-chain & save in DB | Faculty |
| **Faculty** | `POST` | `/api/exams/:examCode/authorize` | Whitelist student wallets on-chain | Faculty |
| **Faculty** | `GET` | `/api/exams/faculty/all` | List created exams & attempt counts | Faculty |
| **Student** | `GET` | `/api/exams/student/available` | List available exams with timing state | Student |
| **Student** | `GET` | `/api/exams/:examCode/start` | On-chain access check & get questions | Student |
| **Student** | `POST` | `/api/exams/:examCode/submit` | Evaluate answers, hash & record on-chain | Student |
| **Audit** | `GET` | `/api/audit/verify/:examCode/:wallet` | Cryptographic hash & ledger verification | No |
| **Audit** | `GET` | `/api/audit/trail` | Recent audit events log | No |

---

## Project Structure

```text
BlockExam/
├── backend/                # Node.js / Express backend
│   ├── src/
│   │   ├── config/env.js   # Environment variables configuration
│   │   ├── lib/prisma.js   # Backend Prisma client
│   │   ├── middleware/     # JWT authentication & role middlewares
│   │   ├── services/       # Ethers v6 blockchain service integration
│   │   ├── controllers/    # Auth, exam, and audit controllers
│   │   ├── routes/         # Express API routers
│   │   └── app.js          # Express app with Helmet, CORS, json parser
│   ├── test/               # Backend integration verification tests
│   └── server.js           # Server entry point (port 5000)
├── config/                 # Contract deployment artifacts (address & ABI)
├── contracts/              # Solidity smart contracts
│   └── BlockExam.sol       # Core exam & submission integrity ledger contract
├── prisma/                 # Prisma database configuration
│   ├── schema.prisma       # PostgreSQL schema with connection pooling
│   └── seed.js             # Seeding script for faculty, students, and BT101 exam
├── scripts/                # Deployment and interaction scripts
│   └── deploy.js           # Contract deployment script
├── test/                   # Hardhat unit tests
│   └── BlockExam.test.js   # 14 test cases with hardhat-network-helpers
├── public/                 # Static assets (favicons, robots.txt)
├── src/
│   ├── components/         # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility helpers & Prisma client singleton
│   ├── services/           # Service layer & local state
│   ├── App.tsx             # Main routing and console views
│   ├── index.css           # Global Tailwind CSS and design tokens
│   ├── main.tsx            # React application entry point
│   └── mockData.ts         # Seed records
├── hardhat.config.js       # Hardhat configuration (Solidity 0.8.20, optimizer, networks)
├── index.html              # HTML entry point
├── package.json            # Dependencies and npm scripts
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite configuration
```

