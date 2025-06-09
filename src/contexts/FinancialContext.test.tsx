// src/contexts/FinancialContext.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react'; // Using render for provider, act for state updates
import React, { useContext } from 'react';

import {
  FinancialProvider,
  useFinancialContext,
  FinancialContextType,
  Transaction,
  ApiError,
  FinancialData // Assuming FinancialData is exported
} from './FinancialContext'; // Assuming path is correct relative to test file
import { UserContext, UserContextType } from './UserContext'; // Assuming path

// Mock UserContext value
const mockUser: UserContextType['user'] = {
  id: 'userTest1',
  name: 'Test User',
  token: 'mock-auth-token-123',
  kids: [], // Add kids if needed for specific tests, though addFunds doesn't directly use kids from UserContext
};

const mockUserContextValue: UserContextType = {
  user: mockUser,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
};

// Global mock for fetch
global.fetch = vi.fn();

// Helper component to consume and expose FinancialContext for testing
let lastContextState: FinancialContextType | null = null;
const TestConsumer = () => {
  const context = useFinancialContext();
  lastContextState = context;
  return null; // No UI needed for this consumer
};

// Wrapper to provide contexts
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <UserContext.Provider value={mockUserContextValue}>
      <FinancialProvider>
        {ui}
      </FinancialProvider>
    </UserContext.Provider>
  );
};


describe('FinancialContext', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    (global.fetch as vi.Mock).mockClear();
    // Reset lastContextState
    lastContextState = null;
    // Reset initial financial data if FinancialProvider is re-rendered or state is manipulated directly
    // For now, FinancialProvider initializes with its own default state.
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Restores all spies and mocks
  });

  describe('addFunds', () => {
    it('should be defined', () => {
      renderWithProviders(<TestConsumer />);
      expect(lastContextState?.addFunds).toBeDefined();
      expect(lastContextState?.financialData).toBeDefined();
    });

    // Further tests for addFunds will go here

    it('should call fetch with correct parameters and update state on successful API response', async () => {
      renderWithProviders(<TestConsumer />); // Renders FinancialProvider and TestConsumer

      const mockApiTransaction: Transaction = {
        id: 'api_txn_123',
        date: new Date().toISOString().split('T')[0], // Ensure YYYY-MM-DD
        description: 'API deposit description',
        amount: 150,
        category: 'API Income',
        kidId: 'kid1',
      };
      const mockApiResponse = {
        success: true,
        transaction: mockApiTransaction,
        newBalance: 250, // Initial balance in FinancialProvider is 100. 100 + 150 = 250.
      };

      (global.fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const amountToAdd = 150;
      const source = 'test_source_account';
      const kidId = 'kid1';
      const fullDescription = 'Test deposit for Kid A'; // This is preferred by addFunds for local transaction

      let result;
      // Use act for calls that cause state updates
      await act(async () => {
        result = await lastContextState!.addFunds(amountToAdd, source, kidId, fullDescription);
      });

      // 1. Assert fetch was called correctly
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/funds/add',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockUser!.token}`, // From mockUserContextValue
          },
          body: JSON.stringify({
            amount: amountToAdd,
            source: source,
            kidId: kidId,
          }),
        })
      );

      // 2. Assert addFunds promise resolves correctly
      expect(result).toEqual({
        success: true,
        transaction: { // The transaction created by addFunds uses fields from API response
          ...mockApiTransaction,
          description: fullDescription, // addFunds prefers fullDescription if provided
        }
      });

      // 3. Assert financialData state is updated
      expect(lastContextState!.financialData.currentBalance).toBe(mockApiResponse.newBalance);
      expect(lastContextState!.financialData.transactions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: mockApiTransaction.id,
            amount: amountToAdd,
            description: fullDescription, // Check the description used by addFunds
            kidId: kidId,
            category: mockApiTransaction.category,
          }),
        ])
      );
      // Check that the new transaction is the first one
      expect(lastContextState!.financialData.transactions[0].id).toBe(mockApiTransaction.id);
    });

    it('should handle successful API response when newBalance is not provided by API', async () => {
      renderWithProviders(<TestConsumer />);

      const initialBalance = lastContextState!.financialData.currentBalance; // Default is 100

      const mockApiTransaction: Transaction = {
        id: 'api_txn_456',
        date: new Date().toISOString().split('T')[0],
        description: 'API deposit - no newBalance',
        amount: 50,
        category: 'Bonus',
      };
      const mockApiResponse = { // newBalance is missing
        success: true,
        transaction: mockApiTransaction,
      };

      (global.fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const amountToAdd = 50;
      const source = 'another_source';
      const fullDescription = 'Bonus deposit';

      let result;
      await act(async () => {
        result = await lastContextState!.addFunds(amountToAdd, source, undefined, fullDescription);
      });

      expect(result?.success).toBe(true);
      expect(result?.transaction?.id).toBe(mockApiTransaction.id);

      // Balance should be calculated locally: initialBalance + amountToAdd
      expect(lastContextState!.financialData.currentBalance).toBe(initialBalance + amountToAdd);
      expect(lastContextState!.financialData.transactions[0].id).toBe(mockApiTransaction.id);
      expect(lastContextState!.financialData.transactions[0].description).toBe(fullDescription);
    });

    it('should use API transaction description if fullDescription is not provided to addFunds', async () => {
      renderWithProviders(<TestConsumer />);

      const mockApiTransaction: Transaction = {
        id: 'api_txn_789',
        date: new Date().toISOString().split('T')[0],
        description: 'Description from API', // This should be used
        amount: 25,
        category: 'Misc Income',
      };
      const mockApiResponse = {
        success: true,
        transaction: mockApiTransaction,
        newBalance: lastContextState!.financialData.currentBalance + 25,
      };

      (global.fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const amountToAdd = 25;
      const source = 'source_for_api_desc';
      // fullDescription is NOT provided to addFunds

      await act(async () => {
        await lastContextState!.addFunds(amountToAdd, source, undefined /* no fullDescription */);
      });

      expect(lastContextState!.financialData.transactions[0].id).toBe(mockApiTransaction.id);
      expect(lastContextState!.financialData.transactions[0].description).toBe(mockApiTransaction.description);
    });

    const testApiErrorResponse = async (errorCode: string, backendMessage: string) => {
      renderWithProviders(<TestConsumer />);
      const initialFinancialData = { ...lastContextState!.financialData, transactions: [...lastContextState!.financialData.transactions] };


      (global.fetch as vi.Mock).mockResolvedValueOnce({
        ok: false, // Indicates an HTTP error status
        json: async () => ({
          success: false,
          error: { code: errorCode, message: backendMessage },
        }),
      });

      const amountToAdd = 100;
      const source = 'error_source';
      const fullDescription = 'Attempting deposit that will fail';

      let result;
      await act(async () => {
        result = await lastContextState!.addFunds(amountToAdd, source, undefined, fullDescription);
      });

      // 1. Assert fetch was called
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/funds/add',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ amount: amountToAdd, source, kidId: undefined }),
        })
      );

      // 2. Assert addFunds promise resolves with the specific error
      expect(result).toEqual({
        success: false,
        error: { code: errorCode, message: backendMessage },
      });

      // 3. Assert financialData state remains unchanged
      expect(lastContextState!.financialData.currentBalance).toBe(initialFinancialData.currentBalance);
      expect(lastContextState!.financialData.transactions).toEqual(initialFinancialData.transactions);
    };

    it('should return specific error from API for INSUFFICIENT_FUNDS and not change state', async () => {
      await testApiErrorResponse('INSUFFICIENT_FUNDS', 'Mock: Not enough funds.');
    });

    it('should return specific error from API for PAYMENT_METHOD_INVALID and not change state', async () => {
      await testApiErrorResponse('PAYMENT_METHOD_INVALID', 'Mock: Payment method is not valid.');
    });

    it('should return specific error from API for ACCOUNT_LIMIT_EXCEEDED and not change state', async () => {
      await testApiErrorResponse('ACCOUNT_LIMIT_EXCEEDED', 'Mock: Account limit has been hit.');
    });

    it('should return a fallback HTTP error code if API error structure is missing code but response not ok', async () => {
      renderWithProviders(<TestConsumer />);
      const initialFinancialData = { ...lastContextState!.financialData };

      (global.fetch as vi.Mock).mockResolvedValueOnce({
        ok: false, // HTTP error
        status: 400, // Example status
        json: async () => ({ success: false, error: { message: 'Malformed error, no code.'} }), // Missing error.code
      });

      let result;
      await act(async () => {
        result = await lastContextState!.addFunds(50, 'source', undefined, 'description');
      });

      expect(result?.success).toBe(false);
      expect(result?.error?.code).toBe('HTTP_ERROR_400'); // Fallback code generated by FinancialContext
      expect(result?.error?.message).toContain('Failed to add funds. Status: 400'); // Or the message if it was 'Malformed error, no code.'
      // Current FinancialContext logic: return { success: false, error: { code: `HTTP_ERROR_${response.status}`, message: `Failed to add funds. Status: ${response.status}` } };
      // if errorResponse.error.code is missing.

      expect(lastContextState!.financialData).toEqual(initialFinancialData);
    });

    it('should return specific error if API response is ok but success:false in body', async () => {
      renderWithProviders(<TestConsumer />);
      const initialFinancialData = { ...lastContextState!.financialData };
      const errorCode = "BACKEND_LOGIC_FAILURE";
      const backendMessage = "Backend validation failed but HTTP was 200 OK";

      (global.fetch as vi.Mock).mockResolvedValueOnce({
        ok: true, // HTTP OK
        json: async () => ({
          success: false, // Business logic failure
          error: { code: errorCode, message: backendMessage },
        }),
      });

      let result;
      await act(async () => {
        result = await lastContextState!.addFunds(50, 'source', undefined, 'description');
      });

      expect(result).toEqual({
        success: false,
        error: { code: errorCode, message: backendMessage },
      });
      expect(lastContextState!.financialData).toEqual(initialFinancialData);
    });

    it('should return NETWORK_ERROR if fetch call fails (e.g., network issue)', async () => {
      renderWithProviders(<TestConsumer />);
      const initialFinancialData = { ...lastContextState!.financialData, transactions: [...lastContextState!.financialData.transactions] };

      const networkErrorMessage = 'Failed to fetch'; // Standard message for fetch failure
      (global.fetch as vi.Mock).mockRejectedValueOnce(new TypeError(networkErrorMessage)); // Simulate fetch throwing an error

      const amountToAdd = 100;
      const source = 'network_error_source';
      const fullDescription = 'Attempting deposit that will have network failure';

      let result;
      await act(async () => {
        result = await lastContextState!.addFunds(amountToAdd, source, undefined, fullDescription);
      });

      // 1. Assert fetch was called (even though it failed)
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // 2. Assert addFunds promise resolves with NETWORK_ERROR
      expect(result).toEqual({
        success: false,
        error: { code: 'NETWORK_ERROR', message: networkErrorMessage },
      });

      // 3. Assert financialData state remains unchanged
      expect(lastContextState!.financialData.currentBalance).toBe(initialFinancialData.currentBalance);
      expect(lastContextState!.financialData.transactions).toEqual(initialFinancialData.transactions);
    });

    it('should return HTTP_ERROR if fetch returns !ok and response is not valid JSON', async () => {
      renderWithProviders(<TestConsumer />);
      const initialFinancialData = { ...lastContextState!.financialData, transactions: [...lastContextState!.financialData.transactions] };

      const httpStatus = 500;
      (global.fetch as vi.Mock).mockResolvedValueOnce({
        ok: false,
        status: httpStatus,
        json: async () => { throw new Error("Simulated JSON parsing error: Not valid JSON!"); }, // Simulate .json() failing
      });

      const amountToAdd = 100;
      const source = 'non_json_error_source';
      const fullDescription = 'Attempting deposit with non-JSON error response';

      let result;
      await act(async () => {
        result = await lastContextState!.addFunds(amountToAdd, source, undefined, fullDescription);
      });

      // 1. Assert fetch was called
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // 2. Assert addFunds promise resolves with a generic HTTP error code
      // FinancialContext's addFunds logic:
      // if (!response.ok) {
      //   const errorResponse = await response.json().catch(() => null);
      //   if (errorResponse && errorResponse.error && errorResponse.error.code) { /* ... */ }
      //   return { success: false, error: { code: `HTTP_ERROR_${response.status}`, message: `Failed to add funds. Status: ${response.status}` } };
      // }
      expect(result).toEqual({
        success: false,
        error: { code: `HTTP_ERROR_${httpStatus}`, message: `Failed to add funds. Status: ${httpStatus}` },
      });

      // 3. Assert financialData state remains unchanged
      expect(lastContextState!.financialData.currentBalance).toBe(initialFinancialData.currentBalance);
      expect(lastContextState!.financialData.transactions).toEqual(initialFinancialData.transactions);
    });

    it('should return LOCAL_VALIDATION_INVALID_AMOUNT for zero amount and not call fetch', async () => {
      renderWithProviders(<TestConsumer />);
      const initialFinancialData = { ...lastContextState!.financialData, transactions: [...lastContextState!.financialData.transactions] };

      const amountToAdd = 0; // Invalid amount
      const source = 'test_source';
      const fullDescription = 'Attempting to add zero amount';

      let result;
      await act(async () => {
        result = await lastContextState!.addFunds(amountToAdd, source, undefined, fullDescription);
      });

      // 1. Assert fetch was NOT called
      expect(global.fetch).not.toHaveBeenCalled();

      // 2. Assert addFunds promise resolves with LOCAL_VALIDATION_INVALID_AMOUNT error
      expect(result).toEqual({
        success: false,
        error: { code: 'LOCAL_VALIDATION_INVALID_AMOUNT', message: 'Amount must be positive' },
      });

      // 3. Assert financialData state remains unchanged
      expect(lastContextState!.financialData.currentBalance).toBe(initialFinancialData.currentBalance);
      expect(lastContextState!.financialData.transactions).toEqual(initialFinancialData.transactions);
    });

    it('should return LOCAL_VALIDATION_INVALID_AMOUNT for negative amount and not call fetch', async () => {
      renderWithProviders(<TestConsumer />);
      const initialFinancialData = { ...lastContextState!.financialData, transactions: [...lastContextState!.financialData.transactions] };

      const amountToAdd = -50; // Invalid amount
      const source = 'test_source_negative';
      const fullDescription = 'Attempting to add negative amount';

      let result;
      await act(async () => {
        result = await lastContextState!.addFunds(amountToAdd, source, undefined, fullDescription);
      });

      // 1. Assert fetch was NOT called
      expect(global.fetch).not.toHaveBeenCalled();

      // 2. Assert addFunds promise resolves with LOCAL_VALIDATION_INVALID_AMOUNT error
      expect(result).toEqual({
        success: false,
        error: { code: 'LOCAL_VALIDATION_INVALID_AMOUNT', message: 'Amount must be positive' },
      });

      // 3. Assert financialData state remains unchanged
      expect(lastContextState!.financialData.currentBalance).toBe(initialFinancialData.currentBalance);
      expect(lastContextState!.financialData.transactions).toEqual(initialFinancialData.transactions);
    });
  });

  // Tests for addTransaction and addKidReward could go here if needed
});
