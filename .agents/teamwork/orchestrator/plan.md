# Project Plan: KontrakanKu Enhancement

## Objectives
Enhance KontrakanKu web application to support:
1. Dynamic Duty Rotations (Galon 1p, Minyak 4-5p, Gas 2p, Listrik 2x3p, dynamic admin CRUD + colors)
2. Split Bills & QRIS Integration (WiFi/custom split evenly/selected, valid QRIS dynamic payload, user guide)
3. Calendar & Tracking System (Colored purchase/payment history, custom agendas, duration tracking)
4. House & Admin Management (Maintenance reporting form, Admin User CRUD & password reset, strict RBAC, invite code house auto-join)
5. Realtime TiDB Database Integration (Drizzle ORM, zero reliance on in-memory mocks, zero data loss across restarts)

## Execution Phases
- **Phase 0: Survey Full Scope**
  - Spawn 3 parallel Explorers to map existing codebase (schema, auth, routes, UI components, current mocks, QRIS generator, test infrastructure).
  - Synthesize reports into `PROJECT.md` Feature Inventory & Architecture.
- **Phase 1: Architecture & Decomposition**
  - Define interface contracts, data models, and milestone boundaries in `PROJECT.md`.
  - Check Feature Inventory coverage.
- **Phase 2: Dual Track Dispatch**
  - Spawn E2E Testing Orchestrator (Tiers 1-4 test suite).
  - Spawn Sub-orchestrators for milestones.
- **Phase 3: Milestone Monitoring & Quality Gates**
  - Enforce Explorer -> Worker -> Reviewer -> Challenger -> Auditor gate per milestone.
- **Phase 4: Final Milestone & Adversarial Hardening**
  - Pass 100% E2E test suite.
  - Tier 5 adversarial testing with Challenger loop.
- **Phase 5: Final Delivery**
  - Deliver final report to parent.
