// src/ui/payment_methods_components/PaymentMethodsView.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react'; // Added within
import userEvent from '@testing-library/user-event'; // For interaction tests
import PaymentMethodsView from './PaymentMethodsView';

// The mockPaymentMethods array is defined inside PaymentMethodsView.tsx.
// For testing, we know its structure and content.
// If we needed to control it from tests, we'd refactor PaymentMethodsView to accept props or context.

describe('PaymentMethodsView', () => {
  it('should render the main heading', () => {
    render(<PaymentMethodsView />);
    expect(screen.getByRole('heading', { name: /manage payment methods/i })).toBeInTheDocument();
  });

  it('should display the list of mock payment methods with their details', () => {
    render(<PaymentMethodsView />);

    // Based on the mockPaymentMethods array defined in PaymentMethodsView.tsx:
    // { id: 'pm_1', type: 'card', displayName: 'Visa ****1234', isDefault: true, ... }
    // { id: 'pm_2', type: 'bank_account', displayName: 'Chase Checking ****5678', ... }
    // { id: 'pm_3', type: 'card', displayName: 'Mastercard ****8765', ... }
    // { id: 'pm_4', type: 'bank_account', displayName: 'BoA Savings ****1122', ... }

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(4); // Assuming 4 mock methods are defined in the component

    // Check details for the first payment method (Visa ****1234, default)
    const firstMethodItem = listItems[0];
    expect(within(firstMethodItem).getByText('Visa ****1234')).toBeInTheDocument();
    expect(within(firstMethodItem).getByText('Default')).toBeInTheDocument();
    expect(within(firstMethodItem).getByText(/Type: VISA | Expires: 12\/2025/i)).toBeInTheDocument();
    expect(within(firstMethodItem).getByRole('button', { name: /Remove Visa \*\*\*\*1234/i })).toBeInTheDocument();

    // Check details for the second payment method (Chase Checking ****5678)
    const secondMethodItem = listItems[1];
    expect(within(secondMethodItem).getByText('Chase Checking ****5678')).toBeInTheDocument();
    expect(within(secondMethodItem).queryByText('Default')).not.toBeInTheDocument(); // Should not be default
    expect(within(secondMethodItem).getByText(/Type: Bank Account \(checking\) | Bank: Chase Bank/i)).toBeInTheDocument();
    expect(within(secondMethodItem).getByRole('button', { name: /Remove Chase Checking \*\*\*\*5678/i })).toBeInTheDocument();
  });

  it('should display the "Add New Payment Method" button', () => {
    render(<PaymentMethodsView />);
    expect(screen.getByRole('button', { name: /add new payment method/i })).toBeInTheDocument();
  });

  it('should not display the add form placeholder initially', () => {
    render(<PaymentMethodsView />);
    expect(screen.queryByText(/Placeholder for "Add New Payment Method" form./i)).not.toBeInTheDocument();
  });

  it('should not display an empty state message when there are payment methods (current hardcoded state)', () => {
    render(<PaymentMethodsView />);
    // This test confirms the behavior with the current hardcoded, non-empty data.
    // It implicitly tests the conditional logic: if the list were empty, the other branch would be taken.
    expect(screen.queryByText("You have no payment methods saved.")).not.toBeInTheDocument();

    // And confirm the list is shown instead
    const listItems = screen.getAllByRole('listitem'); // This would throw error if no items found
    expect(listItems.length).toBeGreaterThan(0);
  });

  describe('"Add New Payment Method" Button Interactions', () => {
    it('should initially not show the add form placeholder', () => {
      render(<PaymentMethodsView />);
      expect(screen.queryByText(/Placeholder for "Add New Payment Method" form./i)).not.toBeInTheDocument();
    });

    it('should show the add form placeholder when "Add New Payment Method" button is clicked', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodsView />);

      const addButton = screen.getByRole('button', { name: /add new payment method/i });
      await user.click(addButton);

      expect(screen.getByText(/Placeholder for "Add New Payment Method" form./i)).toBeInTheDocument();
      // Check if button text changed (optional, but good)
      expect(screen.getByRole('button', { name: /cancel adding/i })).toBeInTheDocument();
    });

    it('should hide the add form placeholder when "Cancel Adding" or "Close Placeholder" is clicked', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodsView />);

      const addButton = screen.getByRole('button', { name: /add new payment method/i });
      // Click once to show
      await user.click(addButton);
      expect(screen.getByText(/Placeholder for "Add New Payment Method" form./i)).toBeInTheDocument();

      // Now click the same button (which should now be "Cancel Adding")
      const cancelButton = screen.getByRole('button', { name: /cancel adding/i });
      await user.click(cancelButton);
      expect(screen.queryByText(/Placeholder for "Add New Payment Method" form./i)).not.toBeInTheDocument();
      // Check if button text reverted
      expect(screen.getByRole('button', { name: /add new payment method/i })).toBeInTheDocument();

      // Test the "Close Placeholder" button as well
      // Click "Add New" again
      await user.click(screen.getByRole('button', { name: /add new payment method/i }));
      expect(screen.getByText(/Placeholder for "Add New Payment Method" form./i)).toBeInTheDocument();

      const closePlaceholderButton = screen.getByRole('button', { name: /close placeholder/i });
      await user.click(closePlaceholderButton);
      expect(screen.queryByText(/Placeholder for "Add New Payment Method" form./i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add new payment method/i })).toBeInTheDocument();
    });
  });

  describe('"Remove" Button Interactions', () => {
    it('should call console.log when a "Remove" button is clicked (placeholder test)', async () => {
      const user = userEvent.setup();
      const consoleLogSpy = vi.spyOn(console, 'log');
      // We could also spy on window.alert if desired:
      // const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {}); // Mock impl to prevent actual alert

      render(<PaymentMethodsView />);

      // Find the first "Remove" button. Based on current mock data, this would be for "Visa ****1234"
      // It's safer to get all and pick one, or use a more specific selector if possible.
      const removeButtons = screen.getAllByRole('button', { name: /remove .*/i });
      expect(removeButtons.length).toBeGreaterThan(0); // Make sure buttons are found

      // Click the first remove button
      await user.click(removeButtons[0]);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith('Attempting to remove payment method: pm_1'); // Assuming pm_1 is the ID of the first item

      // if alertSpy was used:
      // expect(alertSpy).toHaveBeenCalledTimes(1);
      // expect(alertSpy).toHaveBeenCalledWith('(Placeholder) Remove payment method: pm_1');

      // Cleanup the spy
      consoleLogSpy.mockRestore();
      // if (alertSpy) alertSpy.mockRestore();
    });
  });
});
