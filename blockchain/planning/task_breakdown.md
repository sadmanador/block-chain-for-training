# Blockchain Money Transfer System — Task Breakdown

> Granular checklist for implementation. Check items as you complete each step.

---

## Phase 1: Project Scaffolding & Configuration
- [ ] Initialize Next.js with TypeScript, App Router, Tailwind CSS
- [ ] Install all dependencies (next-auth, mongoose, fabric-network, bcryptjs etc.)
- [ ] Create `.env.local` with all environment variables
- [ ] Set up the full folder structure (app, components, lib, models, fabric-config, scripts, types)
- [ ] Verify `npm run dev` runs successfully

## Phase 2: Database Layer (MongoDB Atlas)
- [ ] Create `lib/db.ts` — cached Mongoose connection utility
- [ ] Create `models/User.ts` — User schema (username, email, passwordHash, role, balance)
- [ ] Create `models/Transaction.ts` — Transaction schema (txId, sender, receiver, amount, status, blockIndex)
- [ ] Create `models/Block.ts` — Block schema (index, timestamp, transactions, previousHash, hash, nonce, fabricTxId)
- [ ] Create `scripts/seed-users.ts` — Seed Alice, Bob, Admin + genesis block
- [ ] Run seed script and verify data in MongoDB Atlas

## Phase 3: Authentication (NextAuth.js)
- [ ] Create `lib/auth.ts` — NextAuth config with CredentialsProvider
- [ ] Implement JWT callback to attach role, userId, username to token
- [ ] Implement session callback to expose role, userId, username in session
- [ ] Create `app/api/auth/[...nextauth]/route.ts` — Auth API handler
- [ ] Create `components/SessionProvider.tsx` — Client-side session wrapper
- [ ] Wrap root layout with SessionProvider
- [ ] Create `middleware.ts` — Route protection logic
  - [ ] Protect `/dashboard/*` (role: user only)
  - [ ] Protect `/admin/*` (role: admin only)
  - [ ] Protect `/api/admin/*` (role: admin only)
  - [ ] Redirect unauthenticated users to `/login`
  - [ ] Redirect mismatched roles (user to /dashboard, admin to /admin)
- [ ] Create `app/login/page.tsx` — Login form UI
- [ ] Implement login submission with `signIn("credentials")`
- [ ] Test login for all 3 accounts
- [ ] Test route protection and redirects

## Phase 4: Hyperledger Fabric Network Setup
- [ ] Create `fabric-config/docker-compose.yaml` with orderer, peer, CA, CouchDB
- [ ] Create crypto-config and configtx configuration files
- [ ] Write `scripts/setup-fabric.sh`
  - [ ] Pull Fabric Docker images
  - [ ] Generate crypto materials
  - [ ] Generate channel artifacts
  - [ ] Start containers
  - [ ] Create channel and join peers
- [ ] Write chaincode `fabric-config/chaincode/moneytransfer/lib/moneyTransfer.js`
  - [ ] Implement `initLedger()` — initialize Alice & Bob balances
  - [ ] Implement `getBalance()` — query user balance
  - [ ] Implement `transfer()` — validate & execute transfer
    - [ ] Check sender exists & is authorized
    - [ ] Check receiver exists
    - [ ] Check amount > 0
    - [ ] Check sender balance ≥ amount
    - [ ] Check sender ≠ receiver
    - [ ] Update world state
  - [ ] Implement `getTransactionHistory()` — user-scoped history
  - [ ] Implement `getAllTransactions()` — admin-scoped full history
- [ ] Write `scripts/deploy-chaincode.sh`
  - [ ] Package, install, approve, commit chaincode
  - [ ] Invoke `initLedger`
- [ ] Create `lib/fabric.ts` — Fabric SDK helpers
  - [ ] `connectGateway(userId)` — open gateway connection
  - [ ] `submitTransaction()` — submit to Fabric
  - [ ] `evaluateTransaction()` — query Fabric
  - [ ] `enrollAdmin()` — CA admin enrollment
  - [ ] `registerUser()` — register Fabric identity
- [ ] Run setup and deploy scripts
- [ ] Verify Fabric network is operational

## Phase 5: Blockchain Logic Integration
- [ ] Create `lib/blockchain.ts`
  - [ ] `generateHash()` — SHA-256 block hashing
  - [ ] `createBlock()` — build block with transactions and hashes
  - [ ] `getLatestBlock()` — fetch most recent block from MongoDB
  - [ ] `validateChain()` — verify entire chain integrity
- [ ] Implement end-to-end transaction flow:
  - [ ] API receives transfer request
  - [ ] Submit to Fabric chaincode
  - [ ] On success: create Transaction, create Block, update balances in MongoDB
  - [ ] On failure: save failed Transaction, return error
- [ ] Test block creation and hash linking

## Phase 6: API Routes
- [ ] Create `app/api/transactions/route.ts`
  - [ ] POST handler — create transfer (validate → Fabric → Block → MongoDB)
  - [ ] GET handler — fetch user's transaction history
- [ ] Create `app/api/transactions/balance/route.ts`
  - [ ] GET handler — fetch current user's balance
- [ ] Create `app/api/admin/ledger/route.ts`
  - [ ] GET handler — fetch full blockchain ledger with block metadata
- [ ] Add input validation and error handling to all routes
- [ ] Add role checks to admin routes
- [ ] Test all API endpoints with different auth contexts

## Phase 7: Frontend — User Dashboard
- [ ] Create `app/dashboard/layout.tsx` — auth-protected wrapper with Navbar
- [ ] Create `components/Navbar.tsx` — navigation with username, role badge, logout
- [ ] Create `components/BalanceCard.tsx` — display current balance with auto-refresh
- [ ] Create `components/TransferForm.tsx`
  - [ ] Recipient selector (shows the other user)
  - [ ] Amount input with validation (positive integer, ≤ balance)
  - [ ] Confirmation dialog
  - [ ] Submit with loading state
  - [ ] Success/error notifications
- [ ] Create `components/TransactionHistory.tsx`
  - [ ] Table with columns: Date, Type (Sent/Received), Counterparty, Amount, Status
  - [ ] Color-coded rows (green = received, red = sent)
  - [ ] Sorted newest-first
- [ ] Create `app/dashboard/page.tsx` — compose all components
- [ ] Test full user flow (view balance → transfer → see updated history)

## Phase 8: Frontend — Admin Dashboard
- [ ] Create `app/admin/layout.tsx` — admin-protected wrapper with distinct styling
- [ ] Create `components/BlockCard.tsx`
  - [ ] Display: block index, timestamp, previousHash, hash, fabricTxId
  - [ ] Expandable transaction list within each block
  - [ ] Full hash display on hover/click
- [ ] Create `components/BlockchainLedger.tsx`
  - [ ] Visual chain of BlockCards connected by lines/arrows
  - [ ] Chronological order
- [ ] Create `app/admin/page.tsx`
  - [ ] Compose ledger viewer
  - [ ] Summary stats: total blocks, total txns, user balances, chain validity
- [ ] Test admin dashboard with multiple transactions

## Phase 9: UI/UX Polish
- [ ] Implement dark theme with blockchain-inspired aesthetics
- [ ] Add glassmorphism effects to cards and panels
- [ ] Add animated hash values (typewriter/reveal effects)
- [ ] Implement smooth page transitions and micro-animations
- [ ] Add skeleton loaders for all data-fetching states
- [ ] Add error boundaries with user-friendly messages
- [ ] Add toast notification system for transaction results
- [ ] Add security indicators (lock icons, role badges, session info)
- [ ] Ensure responsive design (desktop + tablet breakpoints)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

## Phase 10: Testing & Verification
- [ ] Verify Fabric network containers are healthy
- [ ] Verify chaincode is installed and initialized
- [ ] Verify MongoDB Atlas has seeded data (3 users + genesis block)
- [ ] Test all authentication flows (login, logout, invalid credentials)
- [ ] Test route protection (all combinations of role × route)
- [ ] Test transfer: Alice → Bob (success case)
- [ ] Test transfer: insufficient funds (failure case)
- [ ] Test transfer: invalid amount (0, negative)
- [ ] Test transfer: Bob → Alice (reverse direction)
- [ ] Verify block hashes link correctly (previousHash chain)
- [ ] Verify admin ledger shows all blocks with full metadata
- [ ] Verify standard users cannot access admin routes
- [ ] Verify chain integrity validator reports correct status
- [ ] E2E browser test: login → transfer → verify → admin check
- [ ] Document any known limitations or classroom-specific notes
