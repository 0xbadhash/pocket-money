// src/test/setup.ts
import '@testing-library/jest-dom';

// You can add other global setup here if needed for your tests.
// For example, MSW server setup for all tests:
// import { server } from '../mocks/server'; // Assuming you'll create a server.ts for node msw
// beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
// afterAll(() => server.close());
// afterEach(() => server.resetHandlers());
// For now, just jest-dom. MSW can be set up per test suite if preferred.
