# Classroom Blockchain Money Transfer System — Implementation Plan

## 1. Project Overview

A fullstack **Next.js** application demonstrating blockchain-based virtual money transfers in a classroom setting. The system features:

- **Authentication & RBAC** via NextAuth (2 standard users + 1 admin)
- **Hyperledger Fabric** as the permissioned blockchain layer for transaction processing
- **MongoDB Atlas** for persisting block hashes, transaction history, and user data
- **Differentiated dashboards** — standard users see their own balance & shared history; admin sees the full blockchain ledger with block metadata

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend & Backend | Next.js (App Router) | Fullstack framework, API routes, SSR |
| Authentication | NextAuth.js v5 | Session management, credential provider, role-based access |
| Blockchain | Hyperledger Fabric v2.x | Permissioned ledger, chaincode (smart contracts) |
| Database | MongoDB Atlas | Block records, transaction history, user metadata |
| Styling | Tailwind CSS / CSS Modules | UI components and responsive design |
| Language | TypeScript | Type safety across the stack |
| Containerization | Docker & Docker Compose | Fabric network, peer nodes, orderer, CA |

---

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js Application                      │
│                                                                 │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│   │  Auth Pages   │   │  User Dash   │   │   Admin Dash     │   │
│   │  (Login)      │   │  (Balance,   │   │   (Full Ledger,  │   │
│   │               │   │   Transfers, │   │    Block Meta,   │   │
│   │               │   │   History)   │   │    All Txns)     │   │
│   └──────┬───────┘   └──────┬───────┘   └────────┬─────────┘   │
│          │                  │                     │              │
│   ┌──────▼──────────────────▼─────────────────────▼─────────┐   │
│   │                   API Routes (Next.js)                   │   │
│   │   /api/auth/*    /api/transactions/*    /api/admin/*     │   │
│   └──────────────────────────┬──────────────────────────────┘   │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
   ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
   │   NextAuth   │   │  Hyperledger │   │   MongoDB Atlas   │
   │   Sessions   │   │    Fabric    │   │                   │
   │              │   │   Network    │   │  - users          │
   │  Credential  │   │              │   │  - blocks         │
   │  Provider    │   │  Chaincode:  │   │  - transactions   │
   │              │   │  - validate  │   │                   │
   │              │   │  - transfer  │   │                   │
   │              │   │  - query     │   │                   │
   └──────────────┘   └──────────────┘   └──────────────────┘
```

---

## 4. Step-by-Step Implementation Plan

---

### Phase 1: Project Scaffolding & Configuration

#### Step 1.1 — Initialize Next.js Project
- Run `npx -y create-next-app@latest ./` with TypeScript, App Router, Tailwind CSS, ESLint enabled
- Verify the project compiles and runs on `localhost:3000`

#### Step 1.2 — Install Dependencies
```bash
npm install next-auth@beta mongodb mongoose
npm install fabric-network fabric-ca-client
npm install bcryptjs
npm install -D @types/bcryptjs
```

#### Step 1.3 — Environment Configuration
Create `.env.local` with:
```env
NEXTAUTH_SECRET=<generated-secret>
NEXTAUTH_URL=http://localhost:3000
MONGODB_URI=<mongodb-atlas-connection-string>

# Hyperledger Fabric
FABRIC_CHANNEL_NAME=moneychannel
FABRIC_CHAINCODE_NAME=moneytransfer
FABRIC_MSP_ID=Org1MSP
FABRIC_PEER_ENDPOINT=localhost:7051
FABRIC_CA_ENDPOINT=localhost:7054
FABRIC_ORDERER_ENDPOINT=localhost:7050
FABRIC_WALLET_PATH=./wallet
FABRIC_CONNECTION_PROFILE_PATH=./fabric-config/connection-org1.json
```

#### Step 1.4 — Project Folder Structure
```
block-chain/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          # Landing / redirect to login
│   ├── login/
│   │   └── page.tsx                      # Login page
│   ├── dashboard/
│   │   ├── layout.tsx                    # Auth-protected layout
│   │   └── page.tsx                      # User dashboard
│   ├── admin/
│   │   ├── layout.tsx                    # Admin-protected layout
│   │   └── page.tsx                      # Admin ledger dashboard
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts              # NextAuth handler
│       ├── transactions/
│       │   ├── route.ts                  # GET history, POST new transfer
│       │   └── balance/
│       │       └── route.ts              # GET user balance
│       └── admin/
│           └── ledger/
│               └── route.ts              # GET full blockchain ledger
├── components/
│   ├── LoginForm.tsx
│   ├── TransferForm.tsx
│   ├── TransactionHistory.tsx
│   ├── BalanceCard.tsx
│   ├── BlockchainLedger.tsx
│   ├── BlockCard.tsx
│   ├── Navbar.tsx
│   └── SessionProvider.tsx
├── lib/
│   ├── auth.ts                           # NextAuth config
│   ├── db.ts                             # MongoDB connection
│   ├── fabric.ts                         # Fabric SDK gateway helpers
│   ├── blockchain.ts                     # Block hashing & chain logic
│   └── seed.ts                           # Seed script for users
├── models/
│   ├── User.ts                           # Mongoose user schema
│   ├── Transaction.ts                    # Mongoose transaction schema
│   └── Block.ts                          # Mongoose block schema
├── fabric-config/
│   ├── connection-org1.json              # Fabric connection profile
│   ├── docker-compose.yaml               # Fabric network containers
│   └── chaincode/
│       └── moneytransfer/
│           ├── index.js                  # Chaincode entry
│           └── lib/
│               └── moneyTransfer.js      # Smart contract logic
├── scripts/
│   ├── seed-users.ts                     # Seed the 3 accounts
│   ├── setup-fabric.sh                   # Bootstrap Fabric network
│   └── deploy-chaincode.sh              # Install & instantiate chaincode
├── middleware.ts                          # Route protection middleware
├── types/
│   └── index.ts                          # Shared TypeScript types
└── public/
    └── ...                               # Static assets
```

---

### Phase 2: Database Layer (MongoDB Atlas)

#### Step 2.1 — MongoDB Connection Utility
- Create `lib/db.ts` with a cached Mongoose connection using the Atlas connection string
- Handle connection pooling and error logging

#### Step 2.2 — Mongoose Schemas

**User Schema** (`models/User.ts`)
```
{
  _id: ObjectId,
  username: string,          // "alice" | "bob" | "admin"
  email: string,
  passwordHash: string,      // bcrypt hashed
  role: "user" | "admin",
  balance: number,           // Virtual currency amount (cents)
  createdAt: Date
}
```

**Transaction Schema** (`models/Transaction.ts`)
```
{
  _id: ObjectId,
  txId: string,              // Unique transaction ID (UUID)
  sender: ObjectId,          // ref → User
  receiver: ObjectId,        // ref → User
  amount: number,
  status: "pending" | "confirmed" | "failed",
  blockIndex: number,        // ref → Block
  timestamp: Date
}
```

**Block Schema** (`models/Block.ts`)
```
{
  _id: ObjectId,
  index: number,             // Block number in chain
  timestamp: Date,
  transactions: [ObjectId],  // ref → Transaction[]
  previousHash: string,      // Hash of the previous block
  hash: string,              // SHA-256 hash of this block
  nonce: number,             // For demonstration
  fabricTxId: string         // Hyperledger Fabric transaction ID
}
```

#### Step 2.3 — Seed Script
- Create `scripts/seed-users.ts`
- Seed 3 accounts:
  - **Alice** — `role: "user"`, initial balance: 1000
  - **Bob** — `role: "user"`, initial balance: 1000
  - **Admin** — `role: "admin"`, balance: 0 (admin does not transact)
- Passwords hashed with bcrypt
- Create the genesis block (index 0, previousHash = "0")

---

### Phase 3: Authentication (NextAuth.js)

#### Step 3.1 — NextAuth Configuration (`lib/auth.ts`)
- Use **CredentialsProvider** for username/password login
- Validate credentials against MongoDB user records
- Attach `role`, `userId`, and `username` to the JWT token and session object
- Configure session strategy as JWT

#### Step 3.2 — Auth API Route
- Create `app/api/auth/[...nextauth]/route.ts`
- Export GET and POST handlers from the NextAuth config

#### Step 3.3 — Session Provider Component
- Create `components/SessionProvider.tsx` wrapping `SessionProvider` from next-auth/react
- Wrap the app layout with this provider

#### Step 3.4 — Route Protection Middleware (`middleware.ts`)
```
Protect routes:
  /dashboard/*    → requires authenticated user with role "user"
  /admin/*        → requires authenticated user with role "admin"
  /api/admin/*    → requires role "admin"
  /api/transactions/* → requires authenticated user
Redirect unauthenticated users to /login
Redirect users accessing /admin to /dashboard (and vice versa for admin)
```

#### Step 3.5 — Login Page (`app/login/page.tsx`)
- Simple login form with username and password fields
- Call `signIn("credentials", { ... })` on submit
- Redirect to `/dashboard` or `/admin` based on role after successful auth

---

### Phase 4: Hyperledger Fabric Network Setup

#### Step 4.1 — Fabric Network Configuration
- Create `fabric-config/docker-compose.yaml` defining:
  - 1 Orderer node (orderer.example.com)
  - 1 Peer node (peer0.org1.example.com)
  - 1 Certificate Authority (ca.org1.example.com)
  - 1 CouchDB instance (for world state)
- Configure channel: `moneychannel`
- Configure organization: `Org1MSP`

#### Step 4.2 — Chaincode / Smart Contract Development
Create `fabric-config/chaincode/moneytransfer/lib/moneyTransfer.js`:

**Functions:**
| Function | Description |
|---|---|
| `initLedger(ctx)` | Initialize the ledger with Alice & Bob's starting balances |
| `getBalance(ctx, userId)` | Query balance of a specific user |
| `transfer(ctx, senderId, receiverId, amount)` | Execute a transfer between two users |
| `getTransactionHistory(ctx, userId)` | Get all transactions involving a user |
| `getAllTransactions(ctx)` | Admin-only: get all transactions |

**Validation Rules in `transfer()`:**
1. Sender must exist and be authorized (identity check via Fabric CA)
2. Receiver must exist
3. Amount must be a positive integer
4. Sender's balance must be ≥ transfer amount (prevent negative balances)
5. Sender and receiver must be different accounts
6. Only `role: "user"` accounts can send/receive

#### Step 4.3 — Network Bootstrap Script (`scripts/setup-fabric.sh`)
1. Pull Hyperledger Fabric Docker images
2. Generate crypto materials using `cryptogen`
3. Generate channel artifacts using `configtxgen`
4. Start the Docker containers
5. Create channel and join peers
6. Set anchor peers

#### Step 4.4 — Chaincode Deployment Script (`scripts/deploy-chaincode.sh`)
1. Package chaincode
2. Install chaincode on peers
3. Approve chaincode definition
4. Commit chaincode to channel
5. Invoke `initLedger` to set up initial state

#### Step 4.5 — Fabric SDK Gateway Utility (`lib/fabric.ts`)
- Connect to the Fabric gateway using a connection profile
- Manage wallet identities (user enrollment via Fabric CA)
- Export helper functions:
  - `connectGateway(userId)` — returns a contract instance
  - `submitTransaction(userId, func, ...args)` — submit a transaction
  - `evaluateTransaction(userId, func, ...args)` — query the ledger
  - `enrollAdmin()` — enroll the Fabric CA admin
  - `registerUser(userId)` — register a new Fabric identity

---

### Phase 5: Blockchain Logic Integration

#### Step 5.1 — Block Hashing Utility (`lib/blockchain.ts`)
```typescript
// Utility functions:
generateHash(index, timestamp, data, previousHash) → SHA-256 hash
createBlock(transactions, previousHash, fabricTxId) → Block object
getLatestBlock() → Block from MongoDB
validateChain() → boolean (verify hash integrity)
```

#### Step 5.2 — Transaction Flow (End-to-End)
```
User submits transfer via UI
        │
        ▼
POST /api/transactions
        │
        ▼
Validate request (auth, amount, recipient)
        │
        ▼
Submit to Hyperledger Fabric chaincode
  ├── Chaincode validates rules (balance, auth, etc.)
  ├── Updates world state (sender/receiver balances)
  └── Returns Fabric transaction ID
        │
        ▼
On Fabric success:
  ├── Create Transaction record in MongoDB
  ├── Create Block record in MongoDB
  │     ├── Link to transaction
  │     ├── Set previousHash from latest block
  │     └── Generate SHA-256 hash
  ├── Update user balances in MongoDB (mirror of Fabric state)
  └── Return success response to client
        │
        ▼
On Fabric failure:
  ├── Create Transaction with status "failed"
  └── Return error response with reason
```

---

### Phase 6: API Routes

#### Step 6.1 — Transaction API (`app/api/transactions/route.ts`)

**POST** — Create Transfer
```
Request:  { receiverId: string, amount: number }
Auth:     Required (role: "user")
Process:  Validate → Submit to Fabric → Create Block → Save to MongoDB
Response: { success: boolean, transaction: Transaction, block: Block }
```

**GET** — Get Transaction History
```
Auth:     Required (role: "user")
Process:  Query MongoDB for transactions where sender OR receiver = current user
Response: { transactions: Transaction[] }
```

#### Step 6.2 — Balance API (`app/api/transactions/balance/route.ts`)

**GET** — Get User Balance
```
Auth:     Required (role: "user")
Process:  Query Fabric world state for current user's balance
Response: { balance: number, username: string }
```

#### Step 6.3 — Admin Ledger API (`app/api/admin/ledger/route.ts`)

**GET** — Get Full Blockchain Ledger
```
Auth:     Required (role: "admin")
Process:  Query MongoDB for all blocks, ordered by index ASC, populated with transactions
Response: {
  blocks: [{
    index, timestamp, hash, previousHash, nonce, fabricTxId,
    transactions: [{ txId, sender, receiver, amount, status, timestamp }]
  }]
}
```

---

### Phase 7: Frontend — User Dashboard

#### Step 7.1 — Dashboard Layout (`app/dashboard/layout.tsx`)
- Auth-protected wrapper
- Navbar with username display, role badge, and logout button
- Sidebar or tab navigation

#### Step 7.2 — Balance Card (`components/BalanceCard.tsx`)
- Display current user's virtual balance
- Format as currency (e.g., §1,000.00 or VC 1,000)
- Auto-refresh after transactions

#### Step 7.3 — Transfer Form (`components/TransferForm.tsx`)
- Dropdown/selector showing the other user (e.g., if logged in as Alice, show Bob)
- Amount input (positive integers only, max = current balance)
- Submit button with loading state
- Success/error toast notifications
- Confirmation dialog before submitting

#### Step 7.4 — Transaction History (`components/TransactionHistory.tsx`)
- Table/list of all transactions involving the current user
- Columns: Date, Type (Sent/Received), Counterparty, Amount, Status
- Color-coded: green for received, red for sent
- Sorted newest-first
- Real-time or poll-refresh

---

### Phase 8: Frontend — Admin Dashboard

#### Step 8.1 — Admin Layout (`app/admin/layout.tsx`)
- Auth-protected wrapper (admin role only)
- Distinct styling to differentiate from user dashboard
- Admin navigation bar

#### Step 8.2 — Blockchain Ledger Viewer (`components/BlockchainLedger.tsx`)
- Visual chain of blocks displayed chronologically
- Each block rendered as a `BlockCard` component
- Connected by visual chain links (arrows or lines)

#### Step 8.3 — Block Card (`components/BlockCard.tsx`)
Display for each block:
| Field | Description |
|---|---|
| Block # | Block index |
| Timestamp | When the block was created |
| Previous Hash | Truncated hash of the preceding block |
| Block Hash | Truncated hash of this block (full on hover/click) |
| Fabric Tx ID | Hyperledger transaction reference |
| Transactions | List of transactions within the block |

Each transaction within a block shows:
- Transaction ID
- Sender → Receiver
- Amount
- Status
- Timestamp

#### Step 8.4 — Admin Summary Statistics
- Total number of blocks
- Total number of transactions
- Current balances of both users
- Chain integrity status (valid/invalid)

---

### Phase 9: UI/UX Polish

#### Step 9.1 — Visual Design
- Dark theme with blockchain-inspired aesthetics
- Glassmorphism cards for blocks and balances
- Animated hash values (typewriter effect on hover)
- Smooth page transitions
- Responsive design (desktop + tablet)

#### Step 9.2 — Loading & Error States
- Skeleton loaders for dashboard data
- Error boundaries with user-friendly messages
- Toast notifications for transaction results

#### Step 9.3 — Security UI Indicators
- Lock icons for protected routes
- Role badges (User / Admin)
- Session expiry warning

---

### Phase 10: Testing & Verification

#### Step 10.1 — Fabric Network Verification
```bash
# Start Fabric network
cd fabric-config && docker-compose up -d

# Run setup script
bash scripts/setup-fabric.sh

# Deploy chaincode
bash scripts/deploy-chaincode.sh

# Verify chaincode is installed
docker exec peer0.org1.example.com peer lifecycle chaincode queryinstalled
```

#### Step 10.2 — Seed Data Verification
```bash
# Run seed script
npx ts-node scripts/seed-users.ts

# Verify in MongoDB Atlas:
# - 3 user documents (alice, bob, admin)
# - 1 genesis block (index: 0)
```

#### Step 10.3 — Authentication Testing
| Test Case | Expected Result |
|---|---|
| Login as Alice (correct password) | Redirect to `/dashboard` |
| Login as Admin (correct password) | Redirect to `/admin` |
| Login with wrong password | Error message, stay on login |
| Access `/dashboard` without auth | Redirect to `/login` |
| Access `/admin` as Alice | Redirect to `/dashboard` (forbidden) |
| Access `/dashboard` as Admin | Redirect to `/admin` |

#### Step 10.4 — Transaction Testing
| Test Case | Expected Result |
|---|---|
| Alice sends 100 to Bob | Both balances update, transaction appears in history, new block created |
| Alice sends more than balance | Error: insufficient funds |
| Alice sends 0 or negative | Error: invalid amount |
| Bob sends 200 to Alice | Success, chain grows by 1 block |
| Check block hashes | Each block's previousHash = prior block's hash |

#### Step 10.5 — Admin Dashboard Verification
- Login as admin → see full ledger
- Verify all blocks appear in chronological order
- Verify block metadata (hash, previousHash, timestamp) is correct
- Verify chain integrity indicator shows "Valid"

#### Step 10.6 — Browser-Based E2E Testing
1. Open browser → Navigate to `localhost:3000`
2. Login as Alice → verify dashboard loads with balance 1000
3. Transfer 250 to Bob → verify success toast, balance updates to 750
4. Logout → Login as Bob → verify balance is 1250, transaction visible
5. Logout → Login as Admin → verify ledger shows 2 blocks (genesis + transfer)
6. Verify block #1 shows: Alice → Bob, 250, hash links correctly

---

## 5. Data Flow Summary

```
┌─────────┐      POST /api/transactions       ┌──────────────┐
│  Alice   │ ──────────────────────────────► │  Next.js API  │
│  (User)  │                                  │    Route      │
└─────────┘                                   └──────┬───────┘
                                                     │
                                              ┌──────▼───────┐
                                              │   Validate    │
                                              │   Request     │
                                              └──────┬───────┘
                                                     │
                                              ┌──────▼───────┐
                                              │  Hyperledger  │
                                              │    Fabric     │
                                              │  (Chaincode)  │
                                              │               │
                                              │  ✓ Balance OK │
                                              │  ✓ Auth OK    │
                                              │  ✓ Amount OK  │
                                              └──────┬───────┘
                                                     │
                                              ┌──────▼───────┐
                                              │   MongoDB     │
                                              │               │
                                              │  Save Tx      │
                                              │  Create Block │
                                              │  Update Bal   │
                                              └──────┬───────┘
                                                     │
┌─────────┐      GET /api/transactions        ┌──────▼───────┐
│   Bob    │ ◄─────────────────────────────── │   Response    │
│  (User)  │   (sees tx in history)           └──────────────┘
└─────────┘

┌─────────┐      GET /api/admin/ledger        ┌──────────────┐
│  Admin   │ ──────────────────────────────► │  Full Chain   │
│          │ ◄────────────────────────────── │  + Metadata   │
└─────────┘                                   └──────────────┘
```

---

## 6. Security Considerations

| Concern | Mitigation |
|---|---|
| Unauthorized access | NextAuth session + middleware route guards |
| Password storage | bcrypt hashing (12 salt rounds) |
| Admin endpoint access | Role check in middleware + API route handlers |
| Negative balance exploit | Chaincode validation + API-level check |
| Session hijacking | NEXTAUTH_SECRET, secure cookies, JWT rotation |
| Direct API abuse | Rate limiting, input validation, CSRF protection |
| Fabric identity spoofing | X.509 certificates via Fabric CA |
| Block tampering | SHA-256 hash chain, Fabric endorsement policy |

---

## 7. Deployment Checklist

- [ ] Hyperledger Fabric network running (Docker containers healthy)
- [ ] Chaincode deployed and initialized
- [ ] MongoDB Atlas connected and seeded
- [ ] NextAuth configured with secret and URL
- [ ] All 3 user accounts created and verified
- [ ] Genesis block created
- [ ] Environment variables set in `.env.local`
- [ ] `npm run dev` serves the application on `localhost:3000`
- [ ] Login flow works for all 3 accounts
- [ ] Transfer flow creates blocks and updates balances
- [ ] Admin ledger displays full chain with metadata
- [ ] Route protection prevents unauthorized access
