# Survey Explorer 2 Dispatch

## 2026-09-26T01:50:00Z
Role: Explorer 2 (Backend API, Auth & Business Logic Survey)
Working Directory: /home/ali/project/kontrakanku/.agents/teamwork/survey_explorer_2
Authoritative Requirements: /home/ali/project/kontrakanku/.agents/teamwork/ORIGINAL_REQUEST.md

Task:
You are an Explorer surveying the existing KontrakanKu codebase. Read ORIGINAL_REQUEST.md first.
Investigate:
1. Server framework and API routes (Next.js App router / API routes / Express / Fastify / tRPC / etc.).
2. Authentication & Session handling, User roles & RBAC enforcement (admin vs member checks).
3. Registration & Invite Code flow (how invite codes work, why users might not be automatically joined to the house, bug analysis).
4. QRIS payload generation logic (inspect existing QRIS logic, CRC16 calculation, why it's buggy or how it generates payloads, how dynamic amounts work).
5. Existing endpoints for duties/rotations, bills, calendar, maintenance, admin actions.

Output:
Write a comprehensive report to `/home/ali/project/kontrakanku/.agents/teamwork/survey_explorer_2/report.md` and send a message when done.
