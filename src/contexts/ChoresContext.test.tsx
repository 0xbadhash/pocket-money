// src/contexts/ChoresContext.test.tsx
import { renderHook, act } from '@testing-library/react';
import { ChoresProvider, useChoresContext, KanbanChoreOrders } from './ChoresContext';
import React, { ReactNode } from 'react';
import { vi } from 'vitest';
import { FinancialContext, FinancialContextType } from './FinancialContext'; // ChoresContext depends on FinancialContext

// Mock localStorage
const localStorageMockFactory = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    getStore: () => store, // Helper for direct inspection if needed
  };
};
let localStorageMock = localStorageMockFactory();

// Mock FinancialContext as ChoresProvider uses it
const mockAddKidReward = vi.fn();
const mockFinancialContextValue: FinancialContextType = {
  transactions: [],
  addTransaction: vi.fn(),
  addKidReward: mockAddKidReward,
  getTransactionsForKid: vi.fn(() => []),
  getFundsForKid: vi.fn(() => 0),
  loading: false,
  error: null,
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <FinancialContext.Provider value={mockFinancialContextValue}>
    <ChoresProvider>{children}</ChoresProvider>
  </FinancialContext.Provider>
);


describe('ChoresContext - Kanban Chore Orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage for each test
    localStorageMock = localStorageMockFactory();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true, // Ensure it can be reconfigured for each test
      configurable: true,
    });
  });

  test('initializes kanbanChoreOrders as an empty object if localStorage is empty', () => {
    localStorageMock.getItem.mockReturnValueOnce(null);
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    expect(result.current.kanbanChoreOrders).toEqual({});
  });

  test('initializes kanbanChoreOrders from localStorage if data exists', () => {
    const storedOrders: KanbanChoreOrders = {
      'kid1-daily_active': ['choreInst1', 'choreInst2'],
    };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(storedOrders));
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    expect(result.current.kanbanChoreOrders).toEqual(storedOrders);
  });

  test('handles invalid JSON in localStorage gracefully for kanbanChoreOrders', () => {
    localStorageMock.getItem.mockReturnValueOnce("invalid json");
    // Spy on console.error to check for error logging
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useChoresContext(), { wrapper });

    expect(result.current.kanbanChoreOrders).toEqual({}); // Should default to empty object
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error parsing kanbanChoreOrders from localStorage:",
      expect.any(SyntaxError) // Or whatever error JSON.parse throws
    );
    consoleErrorSpy.mockRestore();
  });


  test('updateKanbanChoreOrder adds a new order and updates localStorage', () => {
    const { result } = renderHook(() => useChoresContext(), { wrapper });
    const kidId = 'kid1';
    const columnIdentifier = 'daily_active';
    const orderedChoreIds = ['choreInst3', 'choreInst1'];
    const expectedKey = `${kidId}-${columnIdentifier}`;

    act(() => {
      result.current.updateKanbanChoreOrder(kidId, columnIdentifier, orderedChoreIds);
    });

    expect(result.current.kanbanChoreOrders[expectedKey]).toEqual(orderedChoreIds);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'kanbanChoreOrders',
      JSON.stringify({ [expectedKey]: orderedChoreIds })
    );
  });

  test('updateKanbanChoreOrder updates an existing order and localStorage', () => {
    const initialOrders: KanbanChoreOrders = {
      'kid1-daily_active': ['choreInst1', 'choreInst2'],
    };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(initialOrders));
    const { result } = renderHook(() => useChoresContext(), { wrapper });

    const kidId = 'kid1';
    const columnIdentifier = 'daily_active';
    const newOrderedChoreIds = ['choreInst2', 'choreInst1', 'choreInst4'];
    const expectedKey = `${kidId}-${columnIdentifier}`;

    act(() => {
      result.current.updateKanbanChoreOrder(kidId, columnIdentifier, newOrderedChoreIds);
    });

    expect(result.current.kanbanChoreOrders[expectedKey]).toEqual(newOrderedChoreIds);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'kanbanChoreOrders',
      JSON.stringify({ [expectedKey]: newOrderedChoreIds })
    );
  });

  test('updateKanbanChoreOrder clears an order if orderedChoreIds is empty and updates localStorage', () => {
    const initialOrders: KanbanChoreOrders = {
      'kid1-daily_active': ['choreInst1', 'choreInst2'],
      'kid1-weekly_active': ['choreInstA', 'choreInstB'],
    };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(initialOrders));
    const { result } = renderHook(() => useChoresContext(), { wrapper });

    const kidId = 'kid1';
    const columnIdentifier = 'daily_active';
    const emptyOrderedChoreIds: string[] = [];
    const keyToClear = `${kidId}-${columnIdentifier}`;

    act(() => {
      result.current.updateKanbanChoreOrder(kidId, columnIdentifier, emptyOrderedChoreIds);
    });

    expect(result.current.kanbanChoreOrders[keyToClear]).toBeUndefined();
    expect(result.current.kanbanChoreOrders['kid1-weekly_active']).toEqual(['choreInstA', 'choreInstB']); // Other orders remain

    const expectedStoredOrders = { ...initialOrders };
    delete expectedStoredOrders[keyToClear];
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'kanbanChoreOrders',
      JSON.stringify(expectedStoredOrders)
    );
  });
});
