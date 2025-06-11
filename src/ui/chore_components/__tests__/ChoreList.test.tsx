// src/ui/chore_components/__tests__/ChoreList.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChoreList from '../ChoreList';
import { ChoresContext, ChoresContextType } from '../../../contexts/ChoresContext';
import { UserContext, UserContextType as ActualUserContextType } from '../../../contexts/UserContext'; // Renamed
import { FinancialContext, FinancialContextType as ActualFinancialContextType } from '../../../contexts/FinancialContext'; // Needed for ChoresContext mock
import type { ChoreDefinition, ChoreInstance, Kid } from '../../../types';
import { vi } from 'vitest'; // Ensure vi is imported

// Mocks
const mockToggleChoreInstanceComplete = vi.fn();
const mockAddChoreDefinition = vi.fn();
const mockGenerateInstancesForPeriod = vi.fn();
const mockGetChoreDefinitionsForKid = vi.fn(); // Will be set per test or default
const mockToggleSubTaskComplete = vi.fn();

const mockKids: Kid[] = [
  { id: 'kid1', name: 'Kid One', age: 10 },
  { id: 'kid2', name: 'Kid Two', age: 8 },
];

const mockUserContextValue: ActualUserContextType = {
  user: { name: 'Test Parent', email: 'parent@test.com', kids: mockKids },
  loading: false,
};

const mockFinancialContextValue: ActualFinancialContextType = {
  financialData: { currentBalance: 0, transactions: [] },
  addFunds: vi.fn(),
  addTransaction: vi.fn(),
  addKidReward: vi.fn(),
};

let currentChoreDefinitions: ChoreDefinition[] = [];
let currentChoreInstances: ChoreInstance[] = [];

const choresContextMockValue: ChoresContextType = {
  choreDefinitions: currentChoreDefinitions,
  choreInstances: currentChoreInstances,
  addChoreDefinition: mockAddChoreDefinition,
  generateInstancesForPeriod: mockGenerateInstancesForPeriod,
  toggleChoreInstanceComplete: mockToggleChoreInstanceComplete,
  getChoreDefinitionsForKid: mockGetChoreDefinitionsForKid,
  toggleSubTaskComplete: mockToggleSubTaskComplete,
};

// Allow dynamic update of context value for tests
const renderChoreListComponent = (
  props: React.ComponentProps<typeof ChoreList>,
  customChoresContextValue?: Partial<ChoresContextType>
) => {
  // Update the mutable mock value before rendering
  // This is a bit of a workaround for wanting dynamic context values per test.
  // Normally, you'd wrap the component with a new Provider value each time.
  // However, ChoreList itself doesn't re-render on context prop changes, but on context internal state changes.
  // For this component, we'll primarily test its rendering based on props and initial context state.
  // The more complex interactions are tested in ChoresContext.test.tsx.

  // For ChoreList, it re-fetches definitions via getChoreDefinitionsForKid if kidId prop changes.
  // And it uses choreInstances directly from context.

  const effectiveChoresContext = { ...choresContextMockValue, ...customChoresContextValue };

  return render(
    <UserContext.Provider value={mockUserContextValue}>
      <FinancialContext.Provider value={mockFinancialContextValue}>
        <ChoresContext.Provider value={effectiveChoresContext}>
          <ChoreList {...props} />
        </ChoresContext.Provider>
      </FinancialContext.Provider>
    </UserContext.Provider>
  );
};


describe('ChoreList', () => {
  const kid1ChoresDef: ChoreDefinition[] = [
    { id: 'def1', title: 'Kid1 Chore A', assignedKidId: 'kid1', dueDate: '2024-01-01', rewardAmount: 1, isComplete: false, recurrenceType: null },
    { id: 'def2', title: 'Kid1 Chore B', assignedKidId: 'kid1', dueDate: '2024-01-02', rewardAmount: 2, isComplete: false, recurrenceType: 'daily', recurrenceEndDate: '2024-01-03' },
  ];
  const kid1ChoresInst: ChoreInstance[] = [
    { id: 'def1_2024-01-01', choreDefinitionId: 'def1', instanceDate: '2024-01-01', isComplete: false },
    { id: 'def2_2024-01-02', choreDefinitionId: 'def2', instanceDate: '2024-01-02', isComplete: true }, // One completed
    { id: 'def2_2024-01-03', choreDefinitionId: 'def2', instanceDate: '2024-01-03', isComplete: false },
  ];

  beforeEach(() => {
    mockToggleChoreInstanceComplete.mockClear();
    mockGetChoreDefinitionsForKid.mockClear();
    currentChoreDefinitions = []; // Reset shared mutable state
    currentChoreInstances = [];   // Reset shared mutable state
  });

  it('renders "No chores assigned" when no kidId is provided and no unassigned chores exist', () => {
    // mockGetChoreDefinitionsForKid.mockReturnValue([]); // No unassigned defs - handled by specificContextValue
    // choresContextMockValue.choreInstances = []; // No unassigned instances - handled by specificContextValue

    const specificContextValue: ChoresContextType = {
      choreDefinitions: [], // Explicitly empty
      choreInstances: [],   // Explicitly empty
      getChoreDefinitionsForKid: vi.fn(() => []), // Mock for this test
      addChoreDefinition: vi.fn(),
      generateInstancesForPeriod: vi.fn(),
      toggleChoreInstanceComplete: vi.fn(),
      toggleSubTaskComplete: vi.fn(),
    };

    render( // Using direct render with full provider stack for this isolated test
      <UserContext.Provider value={mockUserContextValue}>
        <FinancialContext.Provider value={mockFinancialContextValue}>
          <ChoresContext.Provider value={specificContextValue}>
            <ChoreList title="Unassigned Chores" />
          </ChoresContext.Provider>
        </FinancialContext.Provider>
      </UserContext.Provider>
    );
    expect(screen.getByText('Unassigned Chores')).toBeInTheDocument();
    // The component logic for "No chores to display for this period." might depend on instances.
    // If getChoreDefinitionsForKid returns empty and choreInstances is empty, it should show no chores.
    // Let's assume it relies on instances for display.
    expect(screen.getByText(/No chores to display for this period./i)).toBeInTheDocument();
  });

  it('renders chores for a specific kid when kidId is provided', () => {
    // mockGetChoreDefinitionsForKid.mockImplementation((kId) => kId === 'kid1' ? kid1ChoresDef : []);
    // choresContextMockValue.choreInstances = kid1ChoresInst;

    const specificContextValue: ChoresContextType = {
      choreDefinitions: kid1ChoresDef, // Definitions that instances will refer to
      choreInstances: kid1ChoresInst,
      getChoreDefinitionsForKid: (kId) => (kId === 'kid1' ? kid1ChoresDef : []),
      addChoreDefinition: vi.fn(),
      generateInstancesForPeriod: vi.fn(),
      toggleChoreInstanceComplete: mockToggleChoreInstanceComplete, // Keep original mock for assertion
      toggleSubTaskComplete: vi.fn(),
    };

    render( // Using direct render with full provider stack
      <UserContext.Provider value={mockUserContextValue}>
        <FinancialContext.Provider value={mockFinancialContextValue}>
          <ChoresContext.Provider value={specificContextValue}>
            <ChoreList title="Kid One's Chores" kidId="kid1" />
          </ChoresContext.Provider>
        </FinancialContext.Provider>
      </UserContext.Provider>
    );

    expect(screen.getByText("Kid One's Chores")).toBeInTheDocument();
    // Ensure the text matches exactly what ChoreList would render (e.g. using instanceDate)
    // The original test data had instanceDate in ChoreInstance, and dueDate in ChoreDefinition
    // ChoreList component appears to use instance.instanceDate for the display string.
    // Let's verify the text based on kid1ChoresInst
    expect(screen.getByText(`Kid1 Chore A (Due: ${kid1ChoresInst[0].instanceDate})`)).toBeInTheDocument();
    expect(screen.getByText(`Kid1 Chore B (Due: ${kid1ChoresInst[1].instanceDate})`)).toBeInTheDocument();
    expect(screen.getByText(`Kid1 Chore B (Due: ${kid1ChoresInst[2].instanceDate})`)).toBeInTheDocument();

    // Check completion status based on instance data
    const choreACheckbox = screen.getByLabelText(`Kid1 Chore A (Due: ${kid1ChoresInst[0].instanceDate})`);
    expect(choreACheckbox).not.toBeChecked();

    const choreB_Jan2_Checkbox = screen.getByLabelText(`Kid1 Chore B (Due: ${kid1ChoresInst[1].instanceDate})`);
    expect(choreB_Jan2_Checkbox).toBeChecked(); // This instance is isComplete: true

    const choreB_Jan3_Checkbox = screen.getByLabelText(`Kid1 Chore B (Due: ${kid1ChoresInst[2].instanceDate})`);
    expect(choreB_Jan3_Checkbox).not.toBeChecked();
  });

  it('calls toggleChoreInstanceComplete when a chore checkbox is clicked', async () => {
    const user = userEvent.setup();
    // mockGetChoreDefinitionsForKid.mockReturnValue(kid1ChoresDef);
    // choresContextMockValue.choreInstances = kid1ChoresInst;

    const specificContextValue: ChoresContextType = {
      choreDefinitions: kid1ChoresDef,
      choreInstances: kid1ChoresInst,
      getChoreDefinitionsForKid: (kId) => (kId === 'kid1' ? kid1ChoresDef : []),
      addChoreDefinition: vi.fn(),
      generateInstancesForPeriod: vi.fn(),
      toggleChoreInstanceComplete: mockToggleChoreInstanceComplete, // Use the original spy
      toggleSubTaskComplete: vi.fn(),
    };

    render( // Using direct render with full provider stack
      <UserContext.Provider value={mockUserContextValue}>
        <FinancialContext.Provider value={mockFinancialContextValue}>
          <ChoresContext.Provider value={specificContextValue}>
            <ChoreList title="Test Chores" kidId="kid1" />
          </ChoresContext.Provider>
        </FinancialContext.Provider>
      </UserContext.Provider>
    );

    const choreACheckbox = screen.getByLabelText(`Kid1 Chore A (Due: ${kid1ChoresInst[0].instanceDate})`);
    await user.click(choreACheckbox);

    expect(mockToggleChoreInstanceComplete).toHaveBeenCalledTimes(1);
    expect(mockToggleChoreInstanceComplete).toHaveBeenCalledWith(kid1ChoresInst[0].id); // Pass the instance ID
  });

  it('displays tags and sub-tasks if present in the chore definition', () => {
    const defWithDetails: ChoreDefinition[] = [{
        id: 'def_detail', title: 'Detailed Chore', assignedKidId: 'kid1', dueDate: '2024-01-05', rewardAmount: 3,
        isComplete: false, recurrenceType: null,
        tags: ['cleaning', 'indoor'],
        subTasks: [
            { id: 'st1', title: 'Make bed', isComplete: false },
            { id: 'st2', title: 'Tidy desk', isComplete: true }
        ]
    }];
    const instWithDetails: ChoreInstance[] = [
        { id: 'def_detail_2024-01-05', choreDefinitionId: 'def_detail', instanceDate: '2024-01-05', isComplete: false }
    ];
    // mockGetChoreDefinitionsForKid.mockReturnValue(defWithDetails);
    // choresContextMockValue.choreInstances = instWithDetails;

    const specificContextValue: ChoresContextType = {
      choreDefinitions: defWithDetails,
      choreInstances: instWithDetails,
      getChoreDefinitionsForKid: (kId) => (kId === 'kid1' ? defWithDetails : []),
      addChoreDefinition: vi.fn(),
      generateInstancesForPeriod: vi.fn(),
      toggleChoreInstanceComplete: vi.fn(),
      toggleSubTaskComplete: vi.fn(),
    };

    render( // Using direct render with full provider stack
      <UserContext.Provider value={mockUserContextValue}>
        <FinancialContext.Provider value={mockFinancialContextValue}>
          <ChoresContext.Provider value={specificContextValue}>
            <ChoreList title="Detailed Chores" kidId="kid1" />
          </ChoresContext.Provider>
        </FinancialContext.Provider>
      </UserContext.Provider>
    );

    expect(screen.getByText(`Detailed Chore (Due: ${instWithDetails[0].instanceDate})`)).toBeInTheDocument();
    // Tags rendering check (assuming they are rendered as text, adjust selector if different)
    expect(screen.getByText(/cleaning/i)).toBeInTheDocument();
    expect(screen.getByText(/indoor/i)).toBeInTheDocument();

    // Sub-tasks rendering check
    expect(screen.getByText('Make bed')).toBeInTheDocument();
    expect(screen.getByText('Tidy desk')).toBeInTheDocument();
    // Check if sub-task completion is reflected (e.g., via style or class, here we assume text presence)
    // This might need more specific selectors based on actual rendering of sub-task completion
  });

  // Note: Testing the date range filtering (useEffect for generateInstancesForPeriod)
  // is more of an integration test with ChoresContext itself.
  // Here, we primarily test ChoreList's rendering based on the props and context state it receives.
  // The ChoreList component's own useEffect for instance generation is triggered by period changes,
  // but the actual generation logic is in ChoresContext, which is already tested.
});
