# Project Feature Tracking

This document tracks the status, priority, and progress of key features and tasks for the "Google Pocket Money" application. It is based on the original project brief and will be updated as development progresses.

## Status Legend
-   **Planned**: Not yet started.
-   **In Progress**: Actively being worked on or partially implemented.
-   **Done**: Completed and meets initial requirements.
-   **Blocked**: Cannot proceed due to dependencies or other issues.
-   **On Hold**: Temporarily paused.

---

## Overall Next Priorities
*(Updated: YYYY-MM-DD - Will be manually updated by the user/agent as focus shifts)*

1.  **Implement Recurring Chores (Chore Tracking - Task 7.2 & new UI)**:
    *   Define recurrence rules in `Chore` type (`src/types.ts`).
    *   Update `AddChoreForm.tsx` to allow setting recurrence.
    *   Enhance `ChoresContext` to manage and potentially auto-generate instances of recurring chores.
    *   Status: Planned
    *   Priority: High (User Requested)
2.  **Refine FinancialContext - Explicit Per-Kid Balances (Task 1.2 / Task 2.2 related)**:
    *   Discuss and implement how per-kid virtual balances are managed and displayed, distinct from the main transaction log if needed.
    *   This might involve changes to `FinancialContext` and how balances are shown in `KidDetailView` or a kid-specific dashboard section.
    *   Status: Planned
    *   Priority: Medium
3.  **UI/UX Refinement Pass (Task 3.1)**:
    *   Address any minor UI inconsistencies.
    *   Improve component styling for better Material Design alignment if specific areas are identified.
    *   Consider implementing actual chart visualization in `ActivityChart.tsx` if library installation becomes possible or a simple SVG chart is feasible.
    *   Status: Planned
    *   Priority: Medium

*(Note: Priorities and specific next steps beyond these top items will be determined based on ongoing progress and feedback.)*

---

## Phase 1: Foundation & Core Functionality
### Task 1.1: Prepaid Debit Card Solution (Physical & Virtual)
*Led by Google Pay/Wallet Team*
-   **Feature**: Research and select banking partners.
    -   Status: Planned
    -   Priority: Medium (External Dependency)
    -   Notes: Requires banking partner integration.
-   **Feature**: Develop secure card provisioning and management within Google Pay/Wallet.
    -   Status: Planned
    -   Priority: Medium (External Dependency)
    -   Notes: Core Google Pay/Wallet team responsibility.
-   **Feature**: Implement physical card ordering, activation, and replacement workflows.
    -   Status: Planned
    -   Priority: Medium
    -   Notes: UI/UX for these flows will be needed in the parent app eventually.
-   **Feature**: Explore virtual card generation for online/in-app purchases.
    -   Status: Planned
    -   Priority: Medium
    -   Notes: Important for online usability.

### Task 1.2: Funds Management & Transfers
*Led by Google Pay/Wallet Team*
-   **Feature**: Develop secure, real-time mechanisms for parents to load funds.
    -   Status: In Progress (UI/Context mocked)
    -   Priority: High
    -   Notes: `AddFundsForm.tsx` and `FinancialContext` provide UI and client-side logic. Backend integration needed.
-   **Feature**: Implement robust transaction processing, reconciliation, and fraud detection.
    -   Status: Planned
    -   Priority: High (External Dependency)
    -   Notes: Core Google security/financial infrastructure.
-   **Feature**: Integrate with existing banking APIs for seamless money movement.
    -   Status: Planned
    -   Priority: High (External Dependency)
    -   Notes: Core backend task.

### Task 2.1: Secure Kid & Parent Account Creation
*Led by Google Identity/Accounts Team*
-   **Feature**: Leverage existing Google Account infrastructure with parental consent (Family Link).
    -   Status: In Progress (UserContext conceptualized)
    -   Priority: High
    -   Notes: `UserContext` simulates a logged-in parent with kids. Actual Family Link integration is a backend/platform task.
-   **Feature**: Ensure robust KYC/AML compliance for parent accounts.
    -   Status: Planned
    -   Priority: High (External Dependency)
    -   Notes: Legal and platform compliance.
-   **Feature**: Implement secure login, password recovery, and multi-factor authentication.
    -   Status: Planned
    -   Priority: High (External Dependency)
    -   Notes: Relies on Google Identity infrastructure. UI for login flows will be needed.

### Task 2.2: Family Grouping & Roles
*Led by Google Identity/Accounts Team*
-   **Feature**: Integrate with Google Family Link for parent-child relationships.
    -   Status: In Progress (Kid data model in UserContext)
    -   Priority: High
    -   Notes: Mock kid data and `Kid` type defined. `KidAccountSettings.tsx` displays kids. `KidDetailView` created. Actual Family Link integration is backend/platform.
-   **Feature**: Define roles and permissions for parents and kids.
    -   Status: Planned
    -   Priority: Medium
    -   Notes: Will influence UI capabilities for different user types.

### Task 3.1: Parent App Interface Design & Development
*Led by Google Material Design/Product Design Team*
-   **Feature**: Create an intuitive Material Design-compliant interface for managing funds, settings, and monitoring kid activity.
    -   Status: In Progress (Significant UI shells and basic styling done)
    -   Priority: High
    -   Notes:
        -   `DashboardView.tsx` created.
        -   `FundsManagementView.tsx` created (linked to `FinancialContext`).
        -   `SettingsView.tsx` created (displays dynamic user & kid data).
        -   `ActivityMonitoringView.tsx` created (with dynamic filters and data summary).
        -   Basic Material Design principles applied via CSS variables (light/dark themes).
        -   Further Material Design compliance and refinement can continue.
-   **Feature**: Focus on clear dashboards, easy navigation, and secure access.
    -   Status: In Progress
    -   Priority: High
    -   Notes: Dashboards and navigation are implemented. Secure access UI (login pages etc.) is planned.

### Task 3.2: Kid App Interface Design & Development
*Led by Google Material Design/Product Design Team*
-   **Feature**: Design an engaging, age-appropriate, and secure interface for kids.
    -   Status: Planned
    -   Priority: High
    -   Notes: No work started on the dedicated Kid App UI yet.
-   **Feature**: Incorporate gamification elements where appropriate.
    -   Status: Planned
    -   Priority: Medium
    -   Notes: Will depend on Kid App design.

### Task 3.3: Cross-Platform Compatibility
*Led by Google Material Design/Product Design Team*
-   **Feature**: Develop native apps for Android and iOS.
    -   Status: Planned
    -   Priority: High
    -   Notes: Current React web app can serve as a PWA or inform React Native development.
-   **Feature**: Consider a web-based portal for supplementary access.
    -   Status: In Progress (This is what we are building)
    -   Priority: High
    -   Notes: The current React application is the web-based portal.

---

## Phase 2: Mimicking Key Features (GoHenry Specifics)
### Task 4.1: Curriculum Development (Financial Education: "Money Missions")
*Led by Google Kids & Family / Google Arts & Culture / AI/ML Team*
-   **Feature**: Collaborate with experts for age-appropriate "Money Missions".
    -   Status: Planned
    -   Priority: Medium
    -   Notes: Content-focused, UI will be needed to display missions.
-   **Feature**: Tailor content for different age groups.
    -   Status: Planned
    -   Priority: Medium

### Task 4.2: Content Creation (Videos & Quizzes)
*Led by Google Kids & Family / Google Arts & Culture / AI/ML Team*
-   **Feature**: Produce high-quality, engaging video content and interactive quizzes.
    -   Status: Planned
    -   Priority: Medium
    -   Notes: UI for video/quiz presentation needed.
-   **Feature**: Implement gamified progression and rewards (badges, virtual currency).
    -   Status: Planned
    -   Priority: Medium

### Task 4.3: AI-Powered Personalization (Money Missions)
*Led by Google Kids & Family / Google Arts & Culture / AI/ML Team*
-   **Feature**: Use AI/ML to recommend relevant "Money Missions".
    -   Status: Planned
    -   Priority: Low (Advanced Feature)
    -   Notes: Requires significant AI/ML work.

### Task 5.1: Flexible Spending Limits (Parental Control)
*Led by Google Family Link / Google Pay Team*
-   **Feature**: Implement robust controls for parents to set spending limits (daily, weekly, per-transaction).
    -   Status: Planned
    -   Priority: High
    -   Notes: UI needed in Parent App (likely Kid Settings / Kid Detail View).
-   **Feature**: Allow for category-specific blocking.
    -   Status: Planned
    -   Priority: Medium

### Task 5.2: Real-time Spending Alerts (Parental Control)
*Led by Google Family Link / Google Pay Team*
-   **Feature**: Develop push notification system for transaction alerts (customizable).
    -   Status: Planned
    -   Priority: Medium
    -   Notes: Requires notification infrastructure. UI for settings needed.
-   **Feature**: Integrate with Google Assistant for voice-activated summaries/alerts.
    -   Status: Planned
    -   Priority: Low

### Task 5.3: Merchant Blocking (Parental Control)
*Led by Google Family Link / Google Pay Team*
-   **Feature**: System for parents to manually block specific merchants/categories.
    -   Status: Planned
    -   Priority: Medium
    -   Notes: UI for blocking needed. Leverage Google Maps/business data.

### Task 5.4: Recurring Pocket Money Management (Parental Control)
*Led by Google Family Link / Google Pay Team*
-   **Feature**: Implement automated allowance scheduling (weekly, bi-weekly, monthly).
    -   Status: Planned
    -   Priority: High
    -   Notes: UI for setup needed. User requested this after chore rewards.
-   **Feature**: Allow for one-off top-ups or bonus payments.
    -   Status: In Progress (Conceptually via `AddFundsForm` for specific kids)
    -   Priority: High
    -   Notes: `AddFundsForm` allows adding funds for specific kids; can be used for bonuses.

### Task 6.1: Interactive Goal Creation (Goal Setting)
*Led by Google Fit / Google Tasks / AI/ML Team*
-   **Feature**: Enable kids to create visual savings goals.
    -   Status: Planned
    -   Priority: Medium
    -   Notes: UI for Kid App.
-   **Feature**: Allow uploading images or selecting from a library for goals.
    -   Status: Planned
    -   Priority: Low

### Task 6.2: Progress Tracking (Goal Setting)
*Led by Google Fit / Google Tasks / AI/ML Team*
-   **Feature**: Visually display progress towards goals.
    -   Status: Planned
    -   Priority: Medium
-   **Feature**: Provide notifications/nudges to encourage saving.
    -   Status: Planned
    -   Priority: Low
-   **Feature**: Allow parents to contribute to goals directly.
    -   Status: Planned
    -   Priority: Medium

### Task 6.3: Smart Goal Suggestions (AI)
*Led by Google Fit / Google Tasks / AI/ML Team*
-   **Feature**: AI to suggest realistic savings timelines.
    -   Status: Planned
    -   Priority: Low (Advanced Feature)
-   **Feature**: Integrate with Google Shopping for item prices.
    -   Status: Planned
    -   Priority: Low

### Task 7.1: Chore Assignment & Tracking (Chore Tracking)
*Led by Google Calendar / Google Tasks / AI/ML Team*
-   **Feature**: Allow parents to create and assign chores to specific kids.
    -   Status: In Progress
    -   Priority: High
    -   Notes: `ChoreManagementView` with `AddChoreForm` allows creation and assignment.
-   **Feature**: Enable kids to mark chores as complete in their app.
    -   Status: Planned (Parent app can toggle, Kid app part pending)
    -   Priority: High
    -   Notes: Parent app's `ChoreList` allows toggling completion. Kid app interaction is future.
-   **Feature**: Implement a simple parent approval workflow for completed chores.
    -   Status: Planned
    -   Priority: Medium
-   **Feature**: Kid-Specific Kanban Board View.
    -   Status: Done
    -   Priority: High (Enhancement to chore tracking)
    -   Notes: Provides a visual Kanban interface (`KanbanView.tsx`) for a selected kid's chores. Displays chores in 'Active' and 'Completed' columns for daily, weekly, or monthly periods. Supports drag-and-drop to reorder chores and move them between columns (which updates their completion status). Features include column theming, filtering by reward status, and sorting by due date, title, or reward. Comprehensive tests (unit, component, integration) and JSDoc comments have been added for this feature.
    -   **Sub-Feature**: Persist Custom Chore Order.
        -   Status: Done
        -   Notes: Allows users to manually reorder chores within a Kanban column via drag-and-drop. This custom order is saved (in localStorage via ChoresContext) and reapplied when the board is viewed with the "My Order / Due Date" sort setting. Applying an explicit sort (e.g., by Title, Reward) will clear the custom order for the currently viewed columns, allowing the explicit sort to take precedence.

### Task 7.2: Earning Integration (Chore Tracking)
*Led by Google Calendar / Google Tasks / AI/ML Team*
-   **Feature**: Automatically link chore completion to allowance payments/rewards.
    -   Status: Done
    -   Priority: High
    -   Notes: Implemented via `ChoresContext` calling `FinancialContext.addKidReward` when chore marked complete.
-   **Feature**: Allow for one-off chore payments or recurring chore-based allowance.
    -   Status: Partially Done (One-off via reward amount) / Planned (Recurring chore-based allowance)
    -   Priority: High
    -   Notes: Current system handles one-off rewards. Recurring chore allowance is next.

### Task 7.3: Gamified Chore System (Optional)
*Led by Google Calendar / Google Tasks / AI/ML Team*
-   **Feature**: Explore points, streaks, leaderboards for chores.
    -   Status: Planned
    -   Priority: Low
    -   Notes: Optional feature.

### Task 7.4: AI-Powered Chore Reminders
*Led by Google Calendar / Google Tasks / AI/ML Team*
-   **Feature**: Use AI to provide gentle reminders to kids about chores.
    -   Status: Planned
    -   Priority: Low (Advanced Feature)

---

## Phase 3: Integration & Launch Readiness
### Task 8.1: Google Assistant Integration
*Led by Cross-Functional Teams*
-   **Feature**: Enable voice commands for checking balance, transactions, goals.
    -   Status: Planned
    -   Priority: Medium
    -   Notes: "Hey Google, what's my pocket money balance?"
-   **Feature**: Voice commands for managing goals.
    -   Status: Planned
    -   Priority: Low

### Task 8.2: Google Classroom/Family Link Integration
*Led by Cross-Functional Teams*
-   **Feature**: Deep integration with Family Link for parental controls and account management.
    -   Status: Planned (Partially conceptualized with UserContext)
    -   Priority: High
    -   Notes: Current `UserContext` is a placeholder for deeper Family Link integration.
-   **Feature**: Potential Google Classroom integration for financial literacy homework.
    -   Status: Planned
    -   Priority: Low

### Task 8.3: Data Analytics & Feedback Loops
*Led by Cross-Functional Teams*
-   **Feature**: Implement robust analytics for user behavior, pain points, improvement.
    -   Status: Planned
    -   Priority: Medium
-   **Feature**: Establish clear feedback channels for parents and kids.
    -   Status: Planned
    -   Priority: Medium

### Task 9.1: Regulatory Compliance
*Led by Google Legal / Security / Compliance Teams*
-   **Feature**: Ensure full compliance with financial regulations in all target markets.
    -   Status: Planned
    -   Priority: High (Critical External Dependency)
-   **Feature**: Conduct regular security audits and penetration testing.
    -   Status: Planned
    -   Priority: High (Critical External Dependency)

### Task 9.2: Data Privacy & Protection
*Led by Google Legal / Security / Compliance Teams*
-   **Feature**: Implement industry-leading data encryption and privacy protocols.
    -   Status: Planned
    -   Priority: High (Critical External Dependency)
-   **Feature**: Clearly communicate data usage policies.
    -   Status: Planned
    -   Priority: High

### Task 10.1: Branding & Messaging
*Led by Google Marketing Team*
-   **Feature**: Develop compelling brand identity and clear messaging.
    -   Status: Planned
    -   Priority: Medium
-   **Feature**: Highlight educational and parental control benefits.
    -   Status: Planned
    -   Priority: Medium

### Task 10.2: Launch Strategy
*Led by Google Marketing Team*
-   **Feature**: Plan a phased rollout, starting with key markets.
    -   Status: Planned
    -   Priority: Medium
-   **Feature**: Develop strong app store listings.
    -   Status: Planned
    -   Priority: Medium
-   **Feature**: Leverage Google's marketing channels.
    -   Status: Planned
    -   Priority: Medium

---
