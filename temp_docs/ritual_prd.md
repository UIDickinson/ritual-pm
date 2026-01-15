# Ritual Community Prediction Market
## Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** January 12, 2026  
**Product:** Community-Based Prediction Market (MVP)  
**Community:** Ritual Network Discord Community

---

## 1. Executive Summary

This product is a private, community-based prediction market that allows Ritual Network community members to propose, approve, and participate in prediction markets using play money (points). Outcomes are resolved by admins or community voting. The platform is off-chain, centralized, and designed for simplicity and learning.

---

## 2. Product Goals

### Primary Goals
- Enable fast, low-friction predictions inside the Ritual Network community
- Avoid complex UX and financial risk
- Provide a stable base for future scaling
- Act as a learning and experimentation platform

### Non-Goals
- Real money handling
- Blockchain settlement
- Automated oracle resolution
- Public speculation at scale
- Advanced financial mechanisms (AMM, order books)

---

## 3. Target Users

**Primary Audience:** Ritual Network Discord community members

### User Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **Admin** | Platform administrator | Full access: create markets, resolve outcomes, manage disputes, adjust user balances, view all logs |
| **Member** | Active community participant | Can propose markets, vote on approvals, place predictions, initiate disputes |
| **Viewer** | Read-only observer (optional) | Can view markets and outcomes only |

---

## 4. Core Concepts

### 4.1 Community
- **Definition:** A gated group of users (Ritual Network) sharing markets and balances
- **Scope:** Single community for MVP
- **Access:** Open registration for Discord community members

### 4.2 Points System
- **Currency:** Play money (points) - non-transferable internal currency
- **Starting Balance:** 10 points per new user
- **Point Flow:** 
  - Users stake points on predictions
  - Winners receive proportional payouts from losing stakes
  - 1% fee taken on each stake placement
- **Admin Controls:** Admins can manually adjust user balances

### 4.3 Market
- **Definition:** A question with predefined outcomes and a deadline
- **Components:**
  - Market question (text)
  - Outcome options (2-5 choices)
  - Close time (deadline for predictions)
  - Community visibility (private within Ritual community)
  - Creator information
  - Current stakes per outcome

### 4.4 Prediction
- **Definition:** A user's stake of points on a specific outcome
- **Mechanics:**
  - Points lock until market resolution
  - 1% fee deducted at placement
  - Stakes are pooled per outcome
  - Proportional payout based on stake size

### 4.5 Approval Vote
- **Purpose:** Community validation before market goes live
- **Requirements:**
  - Minimum 10 member votes required
  - 15-hour voting window
  - Admin veto capability
- **Outcomes:**
  - Approved → Market goes Live
  - Rejected/Timeout → Market dissolved

### 4.6 Resolution
- **Definition:** The act of selecting the final outcome
- **Methods:**
  - Admin manual selection
  - Community voting (triggered by admin)
- **Data Stored:**
  - Winning outcome
  - Resolution reason
  - Resolution timestamp
  - Resolver identity

### 4.7 Dispute
- **Definition:** A challenge to a resolved outcome
- **Window:** 24 hours after resolution
- **Process:**
  - Any member can initiate with reason
  - Admin reviews evidence
  - Admin makes final decision
  - Decision is logged permanently

---

## 5. Market Lifecycle

```
1. PROPOSED → Market submitted, awaiting approval votes
2. APPROVED → Passed approval threshold, now accepting predictions
3. LIVE → Active prediction period
4. CLOSED → Deadline passed, no more predictions
5. RESOLVED → Outcome determined
6. FINAL → Payouts distributed (or dispute resolved)
```

**Optional State:** DISPUTED (between RESOLVED and FINAL)

**State Transition Rules:**
- PROPOSED → APPROVED (10+ votes within 15 hours)
- PROPOSED → DISSOLVED (timeout or rejection)
- APPROVED → LIVE (admin activation)
- LIVE → CLOSED (deadline reached)
- CLOSED → RESOLVED (admin/community decision)
- RESOLVED → DISPUTED (member challenges within 24h)
- RESOLVED → FINAL (no disputes or dispute resolved)

---

## 6. Core Features

### 6.1 Market Creation Flow

**Step 1: Proposal**
- Member submits market with:
  - Question text (required)
  - 2-5 outcome options (required)
  - Close time/deadline (required)
  - Optional description/context

**Step 2: Approval Voting**
- Market enters approval phase
- All members can vote (approve/reject)
- Requires minimum 10 approval votes
- 15-hour voting window
- Admin can veto at any time
- Status visible to all members

**Step 3: Activation**
- Upon approval, admin activates market
- Market moves to LIVE state
- Predictions now accepted

**Edge Cases:**
- Insufficient votes after 15 hours → Market dissolved
- Admin veto → Market dissolved with reason logged
- Duplicate markets → Admin reviews and may dissolve

### 6.2 Trading Mechanics

**Stake Placement:**
1. User selects outcome
2. User enters point amount
3. System validates:
   - User has sufficient balance
   - Market is in LIVE state
   - Stake meets minimum (if applicable)
4. 1% fee calculated and deducted
5. Remaining 99% added to outcome pool
6. Points locked in prediction

**Pool Visualization:**
- Show total points per outcome
- Display implied probability (pool size ÷ total)
- Show user's current stakes
- Real-time updates when stakes are placed

**Constraints:**
- No stake editing or cancellation
- Points locked until resolution
- Minimum stake: 1 point
- Maximum stake: user's available balance

### 6.3 Resolution System

**Method A: Admin Resolution**
1. Admin views closed market
2. Admin selects winning outcome
3. Admin provides resolution reason (required)
4. System records timestamp and resolver
5. Market enters RESOLVED state
6. 24-hour dispute window begins

**Method B: Community Voting Resolution**
1. Admin triggers community vote
2. All members can vote for correct outcome
3. Voting window: 24 hours
4. Simple majority wins
5. Ties broken by admin
6. Resolution recorded with vote tallies

**Resolution Requirements:**
- Must occur within reasonable time after close (suggested: 48 hours)
- Reason must be substantive and verifiable
- Admin override available for emergencies

### 6.4 Dispute Process

**Initiation (within 24 hours of resolution):**
1. Member clicks "Dispute Resolution"
2. Member provides detailed reason
3. Dispute logged with timestamp
4. Market state: RESOLVED → DISPUTED
5. Payouts paused

**Admin Review:**
1. Admin reviews dispute reason
2. Admin examines original resolution evidence
3. Admin can:
   - Uphold original resolution
   - Change to different outcome
   - Invalidate market (refund all stakes)
4. Admin decision is FINAL
5. Decision reason logged

**Post-Dispute:**
- Market moves to FINAL state
- Payouts processed based on final decision
- No further disputes allowed

### 6.5 Payout Distribution

**Calculation:**
1. Identify winning outcome pool
2. Calculate total losing stakes (all non-winning pools)
3. Distribute losing stakes proportionally to winners

**Formula:**
```
Winner Payout = (Winner's Stake ÷ Total Winning Pool) × Total Losing Stakes + Winner's Original Stake
```

**Example:**
- Market: "Will ETH reach $5000 in Jan?"
- Outcomes: Yes (100 pts staked), No (200 pts staked)
- Resolution: No
- Winner A staked 50 pts on No
- Winner A receives: (50 ÷ 200) × 100 + 50 = 75 points

**Platform Fees:**
- 1% fee retained from each stake placement
- Fees accumulate in platform balance
- Used for future features/incentives (out of MVP scope)

**Edge Cases:**
- No stakes on winning outcome → All stakes refunded
- Market invalidated → All stakes refunded
- Ties in voting → Admin breaks tie

---

## 7. User Interface Requirements

### 7.1 Priority User Flows

**Critical Path 1: Market Creation Flow**
1. Dashboard → "Create Market" button
2. Market creation form with validation
3. Preview before submission
4. Confirmation of proposal submission
5. View approval voting status

**Critical Path 2: Prediction/Trading Flow**
1. Browse live markets
2. View market details (question, outcomes, current pools)
3. Select outcome and enter stake amount
4. Confirm prediction with fee display
5. View confirmation and updated balance

### 7.2 Required Pages/Views

**For All Users:**
- Homepage/Dashboard (active markets)
- Market Detail Page
- Market History/Archive
- User Profile (balance, prediction history)
- Leaderboard (optional for MVP)

**For Members:**
- Market Creation Form
- My Predictions
- Approval Voting Interface

**For Admins:**
- Admin Dashboard
- Market Management Panel
- Resolution Interface
- Dispute Review Panel
- User Management
- Activity Logs

### 7.3 UI Components

**Market Card:**
- Question text
- Outcome options with current odds
- Time remaining/status
- Total pool size
- Creator info
- Action buttons (predict, view details)

**Prediction Form:**
- Outcome selector (radio/buttons)
- Point input with balance display
- Fee calculation preview
- Confirm/Cancel buttons

**Market Detail View:**
- Full question and description
- Outcome breakdown with probabilities
- User's current stakes (if any)
- Timeline/countdown
- Activity feed (stakes placed)

---

## 8. Technical Specifications

### 8.1 Technology Stack (Recommended)

**Frontend:**
- React with Next.js (JavaScript, not TypeScript)
- Tailwind CSS for styling
- Lucide React for icons

**Backend:**
- Next.js API Routes (serverless functions)
- RESTful API design

**Database:**
- Supabase (PostgreSQL + Auth)
- Alternative: Firebase, MongoDB

**Hosting:**
- Vercel (primary recommendation)
- Alternative: Netlify

### 8.2 Data Models

**Users Table:**
```javascript
{
  id: string (uuid),
  username: string (unique),
  email: string (optional, unique),
  role: enum('admin', 'member', 'viewer'),
  points_balance: number (default: 10),
  created_at: timestamp,
  last_active: timestamp
}
```

**Markets Table:**
```javascript
{
  id: string (uuid),
  creator_id: string (foreign key: users),
  question: string,
  description: text (optional),
  status: enum('proposed', 'approved', 'live', 'closed', 'resolved', 'disputed', 'final', 'dissolved'),
  close_time: timestamp,
  created_at: timestamp,
  approval_deadline: timestamp,
  resolution_time: timestamp (nullable),
  resolved_by: string (nullable, foreign key: users),
  resolution_reason: text (nullable),
  winning_outcome_id: string (nullable, foreign key: outcomes)
}
```

**Outcomes Table:**
```javascript
{
  id: string (uuid),
  market_id: string (foreign key: markets),
  outcome_text: string,
  total_staked: number (default: 0),
  order_index: number
}
```

**Predictions Table:**
```javascript
{
  id: string (uuid),
  user_id: string (foreign key: users),
  market_id: string (foreign key: markets),
  outcome_id: string (foreign key: outcomes),
  stake_amount: number,
  fee_paid: number (1% of stake),
  created_at: timestamp,
  payout_amount: number (nullable),
  paid_out: boolean (default: false)
}
```

**Approval_Votes Table:**
```javascript
{
  id: string (uuid),
  market_id: string (foreign key: markets),
  user_id: string (foreign key: users),
  vote: enum('approve', 'reject'),
  created_at: timestamp,
  UNIQUE(market_id, user_id)
}
```

**Disputes Table:**
```javascript
{
  id: string (uuid),
  market_id: string (foreign key: markets),
  initiated_by: string (foreign key: users),
  reason: text,
  status: enum('pending', 'upheld', 'overturned', 'invalidated'),
  admin_decision: text (nullable),
  decided_by: string (nullable, foreign key: users),
  created_at: timestamp,
  resolved_at: timestamp (nullable)
}
```

**Resolution_Votes Table (for community voting):**
```javascript
{
  id: string (uuid),
  market_id: string (foreign key: markets),
  user_id: string (foreign key: users),
  outcome_id: string (foreign key: outcomes),
  created_at: timestamp,
  UNIQUE(market_id, user_id)
}
```

**Activity_Logs Table:**
```javascript
{
  id: string (uuid),
  user_id: string (foreign key: users),
  action_type: string (e.g., 'market_created', 'prediction_placed', 'market_resolved'),
  target_id: string (market_id or prediction_id),
  details: jsonb,
  created_at: timestamp
}
```

**Platform_Settings Table:**
```javascript
{
  key: string (primary key),
  value: jsonb,
  updated_at: timestamp
}
```

### 8.3 API Endpoints

**Authentication:**
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

**Markets:**
- `GET /api/markets` - List all markets (with filters)
- `GET /api/markets/:id` - Get market details
- `POST /api/markets` - Create new market (member+)
- `PATCH /api/markets/:id/activate` - Activate approved market (admin)
- `DELETE /api/markets/:id` - Dissolve market (admin)

**Approval Voting:**
- `POST /api/markets/:id/vote` - Vote on market approval (member+)
- `GET /api/markets/:id/votes` - Get approval votes

**Predictions:**
- `POST /api/predictions` - Place prediction (member+)
- `GET /api/predictions/my` - Get user's predictions
- `GET /api/markets/:id/predictions` - Get market predictions

**Resolution:**
- `POST /api/markets/:id/resolve` - Resolve market (admin)
- `POST /api/markets/:id/trigger-vote` - Start community vote (admin)
- `POST /api/markets/:id/vote-resolution` - Vote on resolution (member+)

**Disputes:**
- `POST /api/markets/:id/dispute` - Initiate dispute (member+)
- `GET /api/disputes` - List disputes (admin)
- `POST /api/disputes/:id/decide` - Decide dispute (admin)

**Admin:**
- `GET /api/admin/users` - List all users (admin)
- `PATCH /api/admin/users/:id/balance` - Adjust user balance (admin)
- `PATCH /api/admin/users/:id/role` - Change user role (admin)
- `GET /api/admin/logs` - View activity logs (admin)

**User:**
- `GET /api/users/:id` - Get user profile
- `GET /api/leaderboard` - Get top users by points

### 8.4 Business Logic Rules

**Approval Voting:**
- Voting period: 15 hours from market creation
- Required votes: 10 approvals minimum
- Users cannot vote on their own markets
- Admin veto overrides any vote count

**Stake Validation:**
- Minimum stake: 1 point
- Maximum stake: User's current balance
- Fee: Exactly 1% of stake amount
- Points must be available (not locked in other predictions)

**Resolution Timing:**
- Markets auto-close at `close_time`
- Resolution must occur after close time
- Suggested resolution window: within 48 hours of close
- Dispute window: 24 hours from resolution timestamp

**Payout Calculation:**
- Calculate after FINAL state only
- Process all winning predictions in single transaction
- Update user balances atomically
- Mark predictions as `paid_out: true`

**Market Dissolution:**
- Can occur in PROPOSED state only
- Refund any early stakes (if system allows pre-approval staking)
- Log dissolution reason
- Cannot be undone

### 8.5 Security & Permissions

**Role-Based Access Control (RBAC):**

| Action | Viewer | Member | Admin |
|--------|--------|--------|-------|
| View markets | ✓ | ✓ | ✓ |
| Create market | ✗ | ✓ | ✓ |
| Vote on approval | ✗ | ✓ | ✓ |
| Place prediction | ✗ | ✓ | ✓ |
| Initiate dispute | ✗ | ✓ | ✓ |
| Activate market | ✗ | ✗ | ✓ |
| Resolve market | ✗ | ✗ | ✓ |
| Decide dispute | ✗ | ✗ | ✓ |
| Adjust balances | ✗ | ✗ | ✓ |
| View logs | ✗ | ✗ | ✓ |
| Manage users | ✗ | ✗ | ✓ |

**Audit Trail:**
- All admin actions logged with timestamp and user ID
- Market state changes logged
- Balance changes logged with reason
- Immutable log entries

**Data Validation:**
- Server-side validation for all inputs
- Sanitize user-generated content
- Rate limiting on API endpoints
- SQL injection prevention (parameterized queries)

---

## 9. Error Handling & Edge Cases

### 9.1 Market Creation Errors
- **Duplicate market:** Admin reviews and may reject
- **Invalid outcomes:** Minimum 2, maximum 5 outcomes required
- **Past deadline:** Close time must be future timestamp
- **Malformed question:** Minimum character requirements

### 9.2 Trading Errors
- **Insufficient balance:** Display clear error with current balance
- **Market closed:** Prevent stakes after deadline
- **Invalid stake amount:** Must be ≥ 1 point and ≤ available balance
- **Network failure:** Retry mechanism with pending state

### 9.3 Resolution Errors
- **Premature resolution:** Cannot resolve before close time
- **Missing reason:** Resolution reason required
- **Vote tie (community):** Admin breaks tie manually
- **Network timeout:** Manual admin intervention

### 9.4 Dispute Errors
- **Late dispute:** Must be within 24-hour window
- **Missing reason:** Dispute reason required (minimum length)
- **Duplicate dispute:** Only one dispute per user per market

### 9.5 Graceful Degradation
- System favors safety over automation
- Manual admin override available for all critical actions
- Clear error states displayed to users
- Automatic rollback on transaction failures

---

## 10. Success Metrics (MVP)

### Primary Metrics
1. **Weekly Active Users:** Target 50+ active predictors
2. **Market Resolution Rate:** >95% resolved without disputes
3. **System Uptime:** >99% availability
4. **Code Quality:** Clear, maintainable codebase

### Secondary Metrics
- Average markets created per week
- Average predictions per market
- User retention (week-over-week)
- Average time to resolution
- Dispute rate (disputes ÷ total resolutions)

### Qualitative Success
- Positive user feedback from Ritual Discord community
- Low support burden
- Easy onboarding for new users
- Admin confidence in resolution tools

---

## 11. Future Considerations (Post-MVP)

**Explicitly out of scope for MVP, but noted for future:**
- Real money (testnet tokens) integration
- Leaderboard rankings to display users with most winnings and most engagements
- Blockchain/on-chain settlement
- Automated oracle resolution
- AMM or order book mechanics
- Multi-community support
- Mobile native apps
- Advanced analytics dashboard
- Reputation/badge system
- Market maker incentives
- API for third-party integrations

---

## 14. Appendix

### A. Glossary

- **Play Money:** Virtual currency (points) with no real-world value
- **Pool:** Total staked points for a specific outcome
- **Implied Probability:** Percentage based on pool distribution
- **Stake:** Points wagered on an outcome
- **Fee:** 1% of stake retained by platform
- **Payout:** Points distributed to correct predictors
- **Approval Vote:** Member vote to validate proposed market
- **Resolution Vote:** Member vote to determine correct outcome
- **Veto:** Admin power to reject any market
- **Dispute:** Challenge to a resolved outcome
- **Dissolve:** Cancellation of proposed market

### B. User Stories

**As a Member:**
- I want to propose markets so my community can predict on topics I care about
- I want to vote on market approvals so only quality markets go live
- I want to place predictions easily so I can participate with minimal friction
- I want to see my prediction history so I can track my performance
- I want to dispute incorrect resolutions so fair outcomes are maintained

**As an Admin:**
- I want to activate approved markets so prediction can begin
- I want to resolve markets quickly so users get payouts promptly
- I want to review disputes fairly so trust is maintained
- I want to adjust balances manually so I can handle edge cases
- I want to view activity logs so I can monitor platform health

**As a Viewer:**
- I want to browse markets so I can learn about prediction markets
- I want to see resolution history so I can understand how outcomes are determined

### C. References

- Original PRD provided by client
- Clarifications from Q&A session (January 12, 2026)
- Ritual Network Discord community context

---

**Document Version History:**
- v1.0 (January 12, 2026): Initial comprehensive PRD based on client requirements and clarifications

**Document Owner:** Development Team  
**Stakeholders:** Ritual Network Community, Admin Team  
**Review Cycle:** After MVP launch for lessons learned