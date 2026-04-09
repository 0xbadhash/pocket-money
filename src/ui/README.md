# UI Components Directory Structure

This directory contains all user interface components organized by feature area.

## Organization

Components are grouped into subdirectories based on their functional domain:

### Core Views
- `DashboardView.tsx` - Main dashboard landing page
- `KanbanView.tsx` - Matrix Kanban board view
- `SettingsView.tsx` - Application settings
- `ActivityMonitoringView.tsx` - Activity tracking and monitoring
- `FundsManagementView.tsx` - Financial management interface
- `ChoreManagementView.tsx` - Chore administration
- `KidDetailView.tsx` - Individual kid profile view

### Component Directories

#### `/kanban_components`
Components for the Matrix Kanban board:
- `KanbanCard.tsx` - Individual chore card with drag-and-drop support
- `KanbanColumn.tsx` - Column container for cards
- `DateColumnView.tsx` - Date-based column rendering
- `CategorySwimlaneView.tsx` - Category swimlane layout
- `KidKanbanBoard.tsx` - Complete kid's Kanban board
- `BatchActionsToolbar.tsx` - Toolbar for batch operations
- `CategoryChangeModal.tsx` - Modal for changing chore category
- `EditScopeModal.tsx` - Modal for editing instance vs series
- `KidAssignmentModal.tsx` - Modal for assigning chores to kids

#### `/chore_components`
Components for chore management:
- `AddChoreForm.tsx` - Form for creating new chores
- `ChoreList.tsx` - List view of chores

#### `/dashboard_components`
Components for the dashboard:
- `TotalFundsSummary.tsx` - Summary of total funds
- `RecentActivityFeed.tsx` - Feed of recent activities
- `QuickActions.tsx` - Quick action buttons

#### `/funds_management_components`
Components for financial management:
- `AddFundsForm.tsx` - Form for adding funds
- `CurrentBalanceDisplay.tsx` - Display of current balance
- `RecentFundActivity.tsx` - Recent fund transactions

#### `/settings_components`
Components for settings pages:
- `ProfileSettings.tsx` - User profile settings
- `NotificationSettings.tsx` - Notification preferences
- `PaymentSettings.tsx` - Payment configuration
- `AppPreferences.tsx` - General app preferences
- `KidAccountSettings.tsx` - Kid account management
- `KanbanSettingsView.tsx` - Kanban board configuration
- `SupportLegal.tsx` - Support and legal information

#### `/activity_components`, `/activity_monitoring`, `/activity_monitoring_components`
Components for activity tracking and monitoring features.

#### `/chore_management`, `/settings`
Additional organizational directories for specific feature areas.

## Component Design Principles

1. **Single Responsibility**: Each component should have one clear purpose
2. **Reusability**: Common UI patterns should be extracted into shared components
3. **Type Safety**: All components use TypeScript with proper type definitions
4. **Accessibility**: Components include appropriate ARIA attributes and keyboard navigation
5. **Separation of Concerns**: Business logic is separated from presentation

## Testing

Each component directory includes corresponding test files:
- `*.test.tsx` - Unit tests using Vitest and React Testing Library
- `*.integration.test.tsx` - Integration tests for component interactions

## Best Practices

- Use functional components with hooks
- Leverage context for shared state
- Implement proper error boundaries
- Follow consistent naming conventions
- Document props interfaces with JSDoc
