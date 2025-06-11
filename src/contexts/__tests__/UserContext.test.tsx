// src/contexts/__tests__/UserContext.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

  it('should initially have loading as true and user as null', () => {
    renderWithUserProvider(<div />);
    expect(capturedContextState?.loading).toBe(true);
    expect(capturedContextState?.user).toBeNull();
  });

  it('should set user data and loading to false after the timeout', async () => {
    renderWithUserProvider(<div />);

    // Expect initial state
    expect(capturedContextState?.loading).toBe(true);
    expect(capturedContextState?.user).toBeNull();

    // Fast-forward timers
    act(() => {
      vi.advanceTimersByTime(1500); // Advance by the timeout duration in UserProvider
    });

    // Wait for state update (though with fake timers and act, it might be synchronous)
    // Using waitFor as a safeguard if there were microtasks involved,
    // but with jest.advanceTimersByTime and act, direct assertion should also work.
    await waitFor(() => {
      expect(capturedContextState?.loading).toBe(false);
      expect(capturedContextState?.user).not.toBeNull();
    });

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