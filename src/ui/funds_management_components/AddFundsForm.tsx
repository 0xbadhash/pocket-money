// src/ui/funds_management_components/AddFundsForm.tsx
import React, { useState, useContext } from 'react';
import { useFinancialContext } from '../../contexts/FinancialContext';
import { UserContext } from '../../contexts/UserContext';
// Make sure ApiError is imported or defined if it's used explicitly for typing 'result.error'
// However, TypeScript can infer it from the return type of addFunds.

const AddFundsForm = () => {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('bank_account_1');
  const [selectedKidId, setSelectedKidId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { addFunds } = useFinancialContext();
  const userContext = useContext(UserContext);
  const kids = userContext?.user?.kids || [];

  const getFriendlyErrorMessage = (errorCode?: string, defaultMessage?: string): string => {
    if (!errorCode) {
      return defaultMessage || 'An unexpected error occurred. Please try again.';
    }
    switch (errorCode) {
      case 'INSUFFICIENT_FUNDS':
        return 'The selected payment source has insufficient funds. Please try another source or a smaller amount.';
      case 'PAYMENT_METHOD_INVALID':
        return 'The selected payment method is invalid or could not be verified. Please check the details or try another method.';
      case 'PAYMENT_METHOD_DECLINED':
        return 'The payment was declined by the provider. Please try another payment method or contact your bank.';
      case 'ACCOUNT_LIMIT_EXCEEDED':
        return 'The transaction amount exceeds the allowed limit for this payment source or your account.';
      case 'TRANSACTION_LIMIT_EXCEEDED':
        return 'You have reached your daily/weekly transaction limit for adding funds.';
      case 'INVALID_KID_ID':
        return 'The selected recipient (kid) is not valid. Please refresh and try again.';
      case 'USER_NOT_AUTHORIZED':
        return 'You are not authorized to perform this action.';
      case 'SERVICE_UNAVAILABLE':
        return 'The payment service is temporarily unavailable. Please try again later.';
      case 'GENERAL_SERVER_ERROR':
        return 'An unexpected error occurred on our end. Please try again in a few moments.';
      case 'NETWORK_ERROR':
        return 'A network error occurred. Please check your connection and try again.';
      case 'LOCAL_VALIDATION_INVALID_AMOUNT': // From FinancialContext local validation
         return 'Please enter a valid positive amount.';
      case 'HTTP_ERROR_400': // Example generic HTTP error
      case 'HTTP_ERROR_500':
        return 'An error occurred while processing your request. Please try again later.';
      default:
        // Use the message from the error object if available and code is unknown, else generic.
        return defaultMessage || `An unknown error occurred (Code: ${errorCode}). Please try again.`;
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    const numericAmount = parseFloat(amount);

    // Client-side validation for amount format (FinancialContext does value validation)
    if (isNaN(numericAmount)) {
        setError('Please enter a valid number for the amount.');
        return;
    }
    // FinancialContext's addFunds will handle the positive amount check and return LOCAL_VALIDATION_INVALID_AMOUNT

    setIsLoading(true);

    const kidName = selectedKidId ? kids.find(k => k.id === selectedKidId)?.name : 'General Family Funds';
    const fullDescription = `Deposit from ${source} to ${kidName}`;

    try {
      // addFunds now returns Promise<{ success: boolean; error?: ApiError; transaction?: Transaction }>
      const result = await addFunds(numericAmount, source, selectedKidId || undefined, fullDescription);

      if (result.success && result.transaction) {
        setSuccessMessage(`Successfully added $${result.transaction.amount} for ${kidName}. Transaction ID: ${result.transaction.id}`);
        setAmount('');
      } else if (result.error) {
        // Use the helper function to get a friendly message based on the error code
        setError(getFriendlyErrorMessage(result.error.code, result.error.message));
      } else {
        // Fallback if result is not success and no error object is present (shouldn't happen with new FinancialContext)
        setError('Failed to add funds due to an unknown error. Please try again.');
      }
    } catch (unexpectedError: any) {
      // This catch block is for truly unexpected errors during the handleSubmit execution itself,
      // as addFunds is designed to catch its own errors and return them in the result object.
      console.error("Critical error in AddFundsForm handleSubmit:", unexpectedError);
      setError(getFriendlyErrorMessage('UNEXPECTED_ERROR', 'A critical unexpected error occurred.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="add-funds-form">
      <h2>Add Funds</h2>
      {error && <p className="error-message" style={{ color: 'red' }}>Error: {error}</p>}
      {successMessage && <p className="success-message" style={{ color: 'green' }}>{successMessage}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="amount">Amount:</label>
          <input
            type="number"
            id="amount"
            name="amount"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(null);
              setSuccessMessage(null);
            }}
            step="0.01"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="source">Source:</label>
          <select
            id="source"
            name="source"
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setError(null);
              setSuccessMessage(null);
            }}
            disabled={isLoading}
          >
            <option value="bank_account_1">Bank Account ****1234</option>
            <option value="bank_account_2">Savings Account ****5678</option>
            <option value="expired_card">Expired Card (for testing errors)</option>
          </select>
        </div>

        <div>
          <label htmlFor="kidTarget">For:</label>
          <select
            id="kidTarget"
            name="kidTarget"
            value={selectedKidId}
            onChange={(e) => {
              setSelectedKidId(e.target.value);
              setError(null);
              setSuccessMessage(null);
            }}
            disabled={userContext?.loading || kids.length === 0 || isLoading}
          >
            <option value="">General Family Funds</option>
            {kids.map(kid => (
              <option key={kid.id} value={kid.id}>
                {kid.name}
              </option>
            ))}
            <option value="kid_nonexistent">Non Existent Kid (for testing errors)</option>
          </select>
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Processing...' : 'Add Funds'}
        </button>
      </form>
    </div>
  );
};

export default AddFundsForm;
