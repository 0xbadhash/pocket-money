// src/contexts/__tests__/UserContext.test.tsx
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react'; // Import act
import { UserProvider, UserContext, UserContextType as ActualUserContextType } from '../UserContext'; // Renamed to avoid conflict

// Test component to access context values
let capturedContextState: ActualUserContextType | null = null;
const TestConsumerComponent = () => {
  capturedContextState = React.useContext(UserContext);
  return null;
};

// Helper to render with provider
const renderWithUserProvider = (ui: React.ReactElement) => {
  return render(
    <UserProvider>
      {ui}
      <TestConsumerComponent />
    </UserProvider>
  );
};

describe('UserContext', () => {
  beforeEach(() => {
    capturedContextState = null;
    vi.useFakeTimers(); // Use fake timers as UserProvider uses setTimeout
  });

  afterEach(() => {
    vi.runOnlyPendingTimers(); // Run any remaining timers
    vi.useRealTimers(); // Restore real timers
  });

  it('should initially have loading as true and user as null', async () => {
    await act(async () => {
      renderWithUserProvider(<div />);
    });
    expect(capturedContextState?.loading).toBe(true);
    expect(capturedContextState?.user).toBeNull();
  });

  it('should set user data and loading to false after the timeout', async () => {
    await act(async () => {
      renderWithUserProvider(<div />);
    });

    // Expect initial state
    expect(capturedContextState?.loading).toBe(true);
    expect(capturedContextState?.user).toBeNull();

    // Fast-forward timers
    await act(async () => {
      vi.advanceTimersByTime(1500); // Advance by the timeout duration in UserProvider
      vi.runAllTimers(); // Ensure all timers are flushed
    });

    // After timers are advanced and run, the state should be updated.
    // No need for waitFor with properly managed fake timers.
    expect(capturedContextState?.loading).toBe(false);
    expect(capturedContextState?.user).not.toBeNull();
    expect(capturedContextState?.user?.name).toBe('Parent User (Fetched)');
    expect(capturedContextState?.user?.email).toBe('parent.user.fetched@example.com');
    expect(capturedContextState?.user?.kids.length).toBe(3);
    expect(capturedContextState?.user?.kids[0].name).toBe('Alex');
  });

  it('clears timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const { unmount } = renderWithUserProvider(<div />);

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    clearTimeoutSpy.mockRestore();
  });
});