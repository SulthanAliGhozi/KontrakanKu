# Original User Request

## 2026-09-26T01:46:56Z

# Teamwork Project Prompt — Draft

> Status: Ready for launch — awaiting user approval
> Goal: Delegate to teamwork_preview for full implementation
> Requested team: Full team

Enhance the "KontrakanKu" web application to support complex, group-specific duty rotations, split bills, an interactive history calendar, maintenance reporting, strict RBAC, and fully integrate all features with the existing TiDB database.

Working directory: /home/ali/project/kontrakanku
Integrity mode: development

## Requirements

### R1. Dynamic Duty Rotations (Kebutuhan & Giliran)
Implement a robust rotation system for house needs:
- Galon: strict 1-person rotation.
- Minyak: rotation limited to a specific subgroup (e.g., 4-5 people who cook).
- Gas: rotation for pairs (2 people at a time).
- Listrik: rotation for 2 subgroups of 3 people each (since there are 2 tokens).
Admins must be able to dynamically add/edit these needs and assign specific colors to them.

### R2. Split Bills & QRIS Integration
- WiFi and arbitrary items (Patungan/Nitip): evenly split among all 6 members or specified members.
- QRIS: Fix the existing QRIS payload generation logic to ensure members can smoothly pay their splits. Create a user guide/instruction section on the website for how to use the QRIS feature.

### R3. Calendar & Tracking System
- Implement a Calendar view that records purchases/payments of needs (Gas, Listrik, Minyak, Air) using their assigned colors.
- Allow users to add custom agendas (e.g., "laprak bareng").
- Enable duration tracking (e.g., how many days a gas cylinder lasted based on the calendar history).

### R4. House & Admin Management
- Maintenance Form: Create a form to report house damages/repairs.
- Admin Panel (Manage Users): Admins can view all users, perform CRUD operations, and help reset passwords.
- Ensure strict Role-Based Access Control (RBAC) so standard members cannot access admin menus.
- Ensure the Invite Code registration flow automatically joins new users to the correct house.

### R5. Realtime Database Integration
- Ensure EVERY feature is fully integrated with the existing TiDB MySQL database (via Drizzle ORM).
- Eliminate any remaining bugs or reliance on in-memory mock data.

## Acceptance Criteria

### Duty & Financial Logic
- [ ] Galon, Minyak, Gas, and Listrik properly rotate only among the members specified in their respective subgroups.
- [ ] WiFi split bills correctly divide costs among all house members.
- [ ] QRIS dynamically generates valid payment codes based on the split bill amounts.

### UI & Management
- [ ] Calendar displays purchase history and custom agendas with distinct, admin-configured colors.
- [ ] Admin User Management UI allows successfully changing a user's password and deleting/editing users.
- [ ] New users registering with a valid invite code are immediately visible in the house's user list without requiring a server restart.
- [ ] Standard members are strictly blocked from accessing the Admin Management UI or modifying house-wide settings.

### Database
- [ ] No in-memory state is used as the source of truth; server restarts do not cause data loss for any of the new features.
