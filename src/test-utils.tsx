import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Import all your context providers
import { UserProvider } from './contexts/UserContext';
import { FinancialProvider } from './contexts/FinancialContext';
import { ChoresProvider } from './contexts/ChoresContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AppNotificationProvider } from './contexts/AppNotificationContext';

// Define the wrapper component with all providers active
const AllTheProviders: React.FC<{children: ReactNode}> = ({ children }) => {
  return (
    <BrowserRouter> {/* Keep BrowserRouter active */}
      <UserProvider> {/* UserProvider active */}
        {/* <FinancialProvider> // Keep FinancialProvider commented out */}
          {/* <ChoresProvider> // Keep ChoresProvider commented out */}
            {/* <AppNotificationProvider> // Keep AppNotificationProvider commented out */}
              {/* <NotificationProvider> // Keep NotificationProvider commented out */}
                {children}
              {/* </NotificationProvider> // Keep NotificationProvider commented out */}
            {/* </AppNotificationProvider> // Keep AppNotificationProvider commented out */}
          {/* </ChoresProvider> // Keep ChoresProvider commented out */}
        {/* </FinancialProvider> // Keep FinancialProvider commented out */}
      </UserProvider> {/* UserProvider active */}
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
