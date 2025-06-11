// src/ui/funds_management_components/__tests__/AddFundsForm.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddFundsForm from '../AddFundsForm';
import { FinancialContext, FinancialContextType } from '../../../contexts/FinancialContext';
import { UserContext, UserContextType as ActualUserContextType } from '../../../contexts/UserContext'; // Renamed
import type { Kid } from '../../../types';

// Mocks
const mockAddFunds = jest.fn();
const mockAddTransaction = jest.fn();
const mockAddKidReward = jest.fn();

const mockFinancialContextValue: FinancialContextType = {
  financialData: { currentBalance: 100, transactions: [] }, // Example balance
  addFunds: mockAddFunds,
  addTransaction: mockAddTransaction,
  addKidReward: mockAddKidReward,
};

const mockKids: Kid[] = [
  { id: 'kid1_funds', name: 'Kid One Funds', age: 10 },
  { id: 'kid2_funds', name: 'Kid Two Funds', age: 8 },
];

const mockUserContextValue: ActualUserContextType = {
  user: { name: 'Test Parent Funds', email: 'parent.funds@test.com', kids: mockKids },
  loading: false,
};

const renderAddFundsFormComponent = () => {
  return render(
    <UserContext.Provider value={mockUserContextValue}>
      <FinancialContext.Provider value={mockFinancialContextValue}>
        <AddFundsForm />
      </FinancialContext.Provider>
    </UserContext.Provider>
  );
};

describe('AddFundsForm', () => {
  beforeEach(() => {
    mockAddFunds.mockClear();
    window.alert = jest.fn(); // Spy on alert
  });

  afterEach(() => {
    (window.alert as jest.Mock).mockRestore();
  });

  it('renders all form fields correctly', () => {
    renderAddFundsFormComponent();
    expect(screen.getByLabelText(/Amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Source/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/For/i)).toBeInTheDocument(); // Kid selection dropdown
    expect(screen.getByRole('button', { name: /Add Funds/i })).toBeInTheDocument();
  });

  it('populates "For" dropdown with kids and a general option', () => {
    renderAddFundsFormComponent();
    const forDropdown = screen.getByLabelText(/For/i);
    expect(forDropdown).toHaveDisplayValue('General Family Funds'); // Default option
    expect(screen.getByRole('option', { name: 'General Family Funds' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Kid One Funds' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Kid Two Funds' })).toBeInTheDocument();
  });

  it('updates state when user types into amount field', async () => {
    const user = userEvent.setup();
    renderAddFundsFormComponent();
    const amountInput = screen.getByLabelText(/Amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, '50.75');
    expect(amountInput).toHaveValue(50.75);
  });

  it('updates state when user selects a source', async () => {
    const user = userEvent.setup();
    renderAddFundsFormComponent();
    const sourceDropdown = screen.getByLabelText(/Source/i);
    // Assuming default value is 'bank_account_1' (Bank Account ****1234)
    // Let's select the second option
    const options = screen.getAllByRole('option') as HTMLOptionElement[];
    const bankAccount2Option = options.find(opt => opt.value === 'bank_account_2');
    if (!bankAccount2Option) throw new Error('Bank Account 2 option not found');

    await user.selectOptions(sourceDropdown, bankAccount2Option.value);
    expect(sourceDropdown).toHaveValue('bank_account_2');
  });

  it('updates state when user selects a kid target', async () => {
    const user = userEvent.setup();
    renderAddFundsFormComponent();
    const forDropdown = screen.getByLabelText(/For/i);
    await user.selectOptions(forDropdown, 'kid1_funds');
    expect(forDropdown).toHaveValue('kid1_funds');
  });

  describe('form submission', () => {
    it('calls addFunds with correct data and resets amount on valid submission (general funds)', async () => {
      const user = userEvent.setup();
      renderAddFundsFormComponent();

      const amountInput = screen.getByLabelText(/Amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '100');
      // Source and For dropdowns will have default values ('bank_account_1', '')

      const submitButton = screen.getByRole('button', { name: /Add Funds/i });
      await user.click(submitButton);

      expect(mockAddFunds).toHaveBeenCalledTimes(1);
      expect(mockAddFunds).toHaveBeenCalledWith(
        100,
        'Deposit from bank_account_1 for General Funds', // Default source and general kid name
        undefined // kidId is undefined for "General Family Funds"
      );
      expect(window.alert).toHaveBeenCalledWith('Successfully added $100 from bank_account_1 for General Funds');
      expect(amountInput).toHaveValue(null); // Input type number resets to null or empty string
    });

    it('calls addFunds with correct data for a specific kid', async () => {
      const user = userEvent.setup();
      renderAddFundsFormComponent();

      const amountInput = screen.getByLabelText(/Amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '75');

      const forDropdown = screen.getByLabelText(/For/i);
      await user.selectOptions(forDropdown, 'kid2_funds');

      const sourceDropdown = screen.getByLabelText(/Source/i);
      // Let's pick the second source 'bank_account_2'
      const options = screen.getAllByRole('option') as HTMLOptionElement[];
      const bankAccount2Option = options.find(opt => opt.value === 'bank_account_2');
      if (!bankAccount2Option) throw new Error('Bank Account 2 option not found for source');
      await user.selectOptions(sourceDropdown, bankAccount2Option.value);


      const submitButton = screen.getByRole('button', { name: /Add Funds/i });
      await user.click(submitButton);

      expect(mockAddFunds).toHaveBeenCalledTimes(1);
      expect(mockAddFunds).toHaveBeenCalledWith(
        75,
        'Deposit from bank_account_2 for Kid Two Funds',
        'kid2_funds'
      );
      expect(window.alert).toHaveBeenCalledWith('Successfully added $75 from bank_account_2 for Kid Two Funds');
    });

    it('shows an alert if amount is invalid (zero, negative, or not a number) on submission', async () => {
      const user = userEvent.setup();
      renderAddFundsFormComponent();
      const submitButton = screen.getByRole('button', { name: /Add Funds/i });
      const amountInput = screen.getByLabelText(/Amount/i);

      // Test with zero
      await user.clear(amountInput);
      await user.type(amountInput, '0');
      await user.click(submitButton);
      expect(mockAddFunds).not.toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith('Please enter a valid positive amount.');
      (window.alert as jest.Mock).mockClear(); // Clear mock for next assertion

      // Test with negative
      await user.clear(amountInput);
      await user.type(amountInput, '-50');
      await user.click(submitButton);
      expect(mockAddFunds).not.toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith('Please enter a valid positive amount.');
      (window.alert as jest.Mock).mockClear();

      // Test with empty (which parseFloat results in NaN)
      await user.clear(amountInput); // ensure it's empty
      fireEvent.change(amountInput, {target: {value: ''}}); // Explicitly set to empty
      await user.click(submitButton);
      expect(mockAddFunds).not.toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith('Please enter a valid positive amount.');
    });
  });
});
