import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Import all your context providers
import { UserProvider } from './contexts/UserContext';

// Define the wrapper component with all providers active
const AllTheProviders: React.FC<{children: ReactNode}> = ({ children }) => {
  return (
    <BrowserRouter> {/* Keep BrowserRouter active */}
      <UserProvider> {/* UserProvider active */}
        {children}
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
