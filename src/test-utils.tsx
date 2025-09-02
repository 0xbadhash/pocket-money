import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import { UserProvider } from './contexts/UserContext';
import { FinancialProvider } from './contexts/FinancialContext';
import { ChoresProvider } from './contexts/ChoresContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AppNotificationProvider } from './contexts/AppNotificationContext';

const AllTheProviders: React.FC<{children: ReactNode}> = ({ children }) => {
  return (
    <BrowserRouter>
      <UserProvider>
        <FinancialProvider>
          <ChoresProvider>
            <AppNotificationProvider>
              <NotificationProvider>
                {children}
              </NotificationProvider>
            </AppNotificationProvider>
          </ChoresProvider>
        </FinancialProvider>
      </UserProvider>
    </BrowserRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
