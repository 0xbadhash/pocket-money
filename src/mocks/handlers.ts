// src/mocks/handlers.ts
import { http, HttpResponse, delay } from 'msw';

let idCounter = 100; // Simple counter for mock transaction IDs

export const handlers = [
  http.post('/api/funds/add', async ({ request }) => {
    const newFundDetails = await request.json() as { amount: number; source: string; kidId?: string };

    // Simulate some validation
    if (typeof newFundDetails.amount !== 'number' || newFundDetails.amount <= 0) {
      await delay(500);
      return HttpResponse.json(
        { success: false, message: 'Invalid amount provided.' },
        { status: 400 }
      );
    }

    if (!newFundDetails.source) {
      await delay(500);
      return HttpResponse.json(
        { success: false, message: 'Payment source is required.' },
        { status: 400 }
      );
    }

    // Simulate a processing delay
    await delay(1500);

    // Simulate occasional server errors (e.g., 10% chance of failure)
    if (Math.random() < 0.1) {
      return HttpResponse.json(
        { success: false, message: 'A simulated random server error occurred.' },
        { status: 500 }
      );
    }

    // Simulate success
    const transactionId = `mock_txn_${Date.now()}_${idCounter++}`;
    const kidName = newFundDetails.kidId ? `Kid ${newFundDetails.kidId.replace('kid_', '').toUpperCase()}` : 'General Funds';
    const description = `Mock deposit from ${newFundDetails.source} for ${kidName}`;

    const mockTransaction = {
      id: transactionId,
      date: new Date().toISOString(), // Backend would set this
      description: description,
      amount: newFundDetails.amount,
      category: 'Income', // Backend would categorize
      kidId: newFundDetails.kidId,
    };

    // Simulate a new balance calculation (very basic)
    // In a real scenario, the backend would manage the true balance.
    // This is just to make the mock response more complete.
    const mockNewBalance = 200 + newFundDetails.amount; // Assume a base and add to it

    return HttpResponse.json({
      success: true,
      transaction: mockTransaction,
      newBalance: mockNewBalance
    });
  }),
];
