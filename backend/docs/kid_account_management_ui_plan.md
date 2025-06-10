# Kid Account Management - UI Plan

This document outlines the UI plan for how a parent user can manage their kid(s)' accounts within the application.

## 1. Overview and Access

-   **Access Point:** Parents will access kid management features primarily through their main `DashboardView.tsx`.
-   A dedicated section or card titled "My Kids" or "Family Accounts" will be displayed on the parent's dashboard.
-   This section will provide a summary of each kid and a call-to-action to manage them further.

## 2. Viewing Kids' Accounts

-   **Initial Display (Parent Dashboard):**
    -   The "My Kids" section on `DashboardView.tsx` will list each linked kid.
    -   For each kid, it will display:
        -   Kid's Name
        -   Kid's Age
        -   (Later) Quick summary like current balance or pending chores.
    -   A button/link like "View Details" or "Manage [Kid's Name]" for each kid.
    -   A prominent "Add New Kid" button.

-   **Dedicated Kid Detail View (Future - `KidDetailView.tsx` already exists but might be repurposed/enhanced):**
    -   Clicking "View Details" for a kid could navigate to `KidDetailView.tsx` (which currently exists as a placeholder).
    -   This view would show more comprehensive information about the kid:
        -   Full profile (name, age, avatar if any).
        -   Detailed balance and transaction history (integrating with `FinancialContext`).
        -   Assigned chores and their status (integrating with `ChoresContext`).
        -   Allowance settings.
        -   Savings goals.
        -   Settings specific to the kid's account (e.g., spending limits, app permissions - conceptual for now).

## 3. Adding a New Kid Account

-   **Access:** From the "Add New Kid" button on the parent's dashboard.
-   **Proposed Component:** A new view or modal, let's call it `AddKidView.tsx` (or `AddKidForm.tsx` if it's a simpler component).
-   **Form Fields for `AddKidForm.tsx`:**
    -   `name`: Kid's first name or nickname (string, required).
    -   `age`: Kid's age (number, required, perhaps with min/max).
    -   `email`: (Optional) Kid's email address. If provided, could be used for a kid-specific login later. For younger kids, this might be omitted.
    -   `initialPassword` / `confirmInitialPassword`: (Optional) If kids are to have their own login. For simplicity, initially, kid accounts might only be accessible via the parent's account. If passwords are set, clear expectations on password rules should be given.
    -   (Later) Initial balance, allowance setup.
-   **Process:**
    1.  Parent fills out the form.
    2.  On submission, data is sent to a backend endpoint (e.g., `POST /api/v1/parents/me/kids`).
    3.  The backend creates the `KidUser` record, associating it with the `ParentUser`.
    4.  The parent's `kids` array in their `UserContext` (and backend record) is updated.
    5.  UI updates to show the new kid in the list.

## 4. Editing Kid Account Details

-   **Access:** From the `KidDetailView.tsx` (e.g., an "Edit Profile" button).
-   **Functionality:** Allow parent to update kid's name, age. Other settings like allowance, password reset (if applicable) would also be here.

## 5. Removing a Kid Account (Conceptual)

-   **Access:** Likely from `KidDetailView.tsx` or a "manage" option next to each kid in the list.
-   **Considerations:** This is a sensitive action. It would require confirmation and clear understanding of what happens to the kid's data (e.g., transaction history, balance). For now, this is purely conceptual.

## Backend API Endpoints (Conceptual - to support UI)

-   `GET /api/v1/parents/me/kids`: Fetches all kid accounts for the logged-in parent. (Already implicitly supported if `ParentUser.kids` is populated on login).
-   `POST /api/v1/parents/me/kids`: Adds a new kid account for the logged-in parent.
    -   Request: `{ name, age, email?, password? }`
    -   Response: The new `KidUser` object.
-   `GET /api/v1/kids/{kidId}`: (If needed for `KidDetailView` if not all data comes with parent).
-   `PUT /api/v1/kids/{kidId}`: Updates a kid's details.
-   `DELETE /api/v1/kids/{kidId}`: (Conceptual) Removes a kid account.

## Data Flow & State Management

-   The `ParentUser` object in `UserContext` should be the primary source of truth for the list of kids associated with the parent.
-   When a new kid is added, this context (and backend) needs to be updated, and UI should react accordingly.
-   `FinancialContext` and `ChoresContext` would be filtered or accessed based on `kidId` when viewing kid-specific details.

This plan provides a roadmap for developing the UI and conceptual backend interactions for kid account management. The immediate next step based on this plan would be to implement the "View Kids" section in the parent's dashboard.
