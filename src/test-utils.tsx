import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Import all context providers
import { UserProvider } from './contexts/UserContext';
import { FinancialProvider } from './contexts/FinancialContext';
import { ChoresProvider } from './contexts/ChoresContext';
import { NotificationProvider } from './contexts/NotificationContext';

interface AllProvidersProps {
  children: ReactNode;
}

/**
 * Wrapper component that includes all application providers
 * Use this in tests to ensure components have access to all contexts
 */
const AllTheProviders: React.FC<AllProvidersProps> = ({ children }) => {
  return (
    <BrowserRouter>
      <UserProvider>
        <FinancialProvider>
          <ChoresProvider>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </ChoresProvider>
        </FinancialProvider>
      </UserProvider>
    </BrowserRouter>
  );
};

/**
 * Custom render function that wraps components with all providers
 * @param ui - The React element to render
 * @param options - Optional render options
 */
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override the render export
export { customRender as render };
