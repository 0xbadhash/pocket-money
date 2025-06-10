// src/ui/payment_methods_components/PaymentMethodsView.tsx
import React, { useState } from 'react'; // Added useState

// ... (PaymentMethod interface, mockPaymentMethods array, styles object - remain the same)
interface PaymentMethod {
  id: string;
  type: 'bank_account' | 'card';
  displayName: string;
  isDefault?: boolean;
  cardType?: 'visa' | 'mastercard' | 'amex';
  last4Digits?: string;
  expiryMonth?: number;
  expiryYear?: number;
  bankName?: string;
  accountType?: 'checking' | 'savings';
}

const mockPaymentMethods: PaymentMethod[] = [
  { id: 'pm_1', type: 'card', displayName: 'Visa ****1234', isDefault: true, cardType: 'visa', last4Digits: '1234', expiryMonth: 12, expiryYear: 2025 },
  { id: 'pm_2', type: 'bank_account', displayName: 'Chase Checking ****5678', bankName: 'Chase Bank', accountType: 'checking', last4Digits: '5678' },
  { id: 'pm_3', type: 'card', displayName: 'Mastercard ****8765', cardType: 'mastercard', last4Digits: '8765', expiryMonth: 8, expiryYear: 2026 },
  { id: 'pm_4', type: 'bank_account', displayName: 'BoA Savings ****1122', isDefault: false, bankName: 'Bank of America', accountType: 'savings', last4Digits: '1122' }
];

const styles: { [key: string]: React.CSSProperties } = {
  paymentMethodItem: { border: '1px solid #eee', padding: '10px', marginBottom: '10px', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  defaultBadge: { backgroundColor: '#4CAF50', color: 'white', padding: '3px 8px', borderRadius: '3px', fontSize: '0.8em', marginLeft: '10px' },
  actionsContainer: {},
  removeButton: { backgroundColor: '#f44336', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' },
  addButton: { backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer', fontSize: '1em', marginTop: '20px' },
  addFormPlaceholder: { border: '1px dashed #ccc', padding: '20px', marginTop: '20px', borderRadius: '5px', backgroundColor: '#f9f9f9' }
};


const PaymentMethodsView: React.FC = () => {
  const paymentMethods = mockPaymentMethods;
  const [showAddFormPlaceholder, setShowAddFormPlaceholder] = useState(false); // State to toggle placeholder

  const handleRemove = (id: string) => {
    console.log(`Attempting to remove payment method: ${id}`);
    alert(`(Placeholder) Remove payment method: ${id}`);
  };

  const toggleAddFormPlaceholder = () => {
    setShowAddFormPlaceholder(prev => !prev);
  };

  return (
    <div className="payment-methods-view" style={{ padding: '20px' }}>
      <h2>Manage Payment Methods</h2>

      {paymentMethods.length === 0 ? (
        <p>You have no payment methods saved.</p>
      ) : (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {paymentMethods.map((method) => (
            <li key={method.id} style={styles.paymentMethodItem}>
              <div>
                <strong>{method.displayName}</strong>
                {method.isDefault && <span style={styles.defaultBadge}>Default</span>}
                <div style={{ fontSize: '0.9em', color: '#555' }}>
                  {method.type === 'card' && method.cardType && method.expiryMonth && method.expiryYear && (
                    `Type: ${method.cardType.toUpperCase()} | Expires: ${String(method.expiryMonth).padStart(2, '0')}/${method.expiryYear}`
                  )}
                  {method.type === 'bank_account' && method.bankName && method.accountType && (
                    `Type: Bank Account (${method.accountType}) | Bank: ${method.bankName}`
                  )}
                </div>
              </div>
              <div style={styles.actionsContainer}>
                <button
                  onClick={() => handleRemove(method.id)}
                  style={styles.removeButton}
                  aria-label={`Remove ${method.displayName}`}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: '20px' }}>
        <button onClick={toggleAddFormPlaceholder} style={styles.addButton}>
          {showAddFormPlaceholder ? 'Cancel Adding' : 'Add New Payment Method'}
        </button>
      </div>

      {showAddFormPlaceholder && (
        <div style={styles.addFormPlaceholder}>
          <p>Placeholder for "Add New Payment Method" form.</p>
          <p>This area would typically contain input fields for card details or bank account information, along with submission and cancel buttons.</p>
          {/* Example placeholder fields (non-interactive) */}
          <div>
            <label htmlFor="pm_type" style={{display: 'block', margin: '10px 0 5px'}}>Payment Type:</label>
            <select id="pm_type" disabled><option>Card</option><option>Bank Account</option></select>
          </div>
          <div>
            <label htmlFor="pm_details" style={{display: 'block', margin: '10px 0 5px'}}>Details:</label>
            <input type="text" id="pm_details" disabled placeholder="Card number or Account number" style={{width: 'calc(100% - 12px)', padding: '5px'}}/>
          </div>
          <button disabled style={{marginTop: '10px', marginRight: '10px'}}>Save Payment Method</button>
          <button onClick={toggleAddFormPlaceholder} style={{marginTop: '10px'}}>Close Placeholder</button>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodsView;
