import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Import all your context providers
import { UserProvider } from './contexts/UserContext';
import { FinancialProvider } from './contexts/FinancialContext';
import { ChoresProvider } from './contexts/ChoresContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AppNotificationProvider } from './contexts/AppNotificationContext';

// Define the wrapper component
const AllTheProviders: React.FC<{children: ReactNode}> = ({ children }) => {
  return (
    <BrowserRouter>
      <UserProvider>
        <FinancialProvider>
          <ChoresProvider>
            <AppNotificationProvider> {/* Depends on ChoresProvider */}
              <NotificationProvider> {/* General UI notifications, can be fairly outer */}
                {children}
              </NotificationProvider>
            </AppNotificationProvider>
          </ChoresProvider>
        </FinancialProvider>
      </UserProvider>
    </BrowserRouter>
  );
};

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override the render export
export { customRender as render };
