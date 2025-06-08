// /tmp/vite_init_area/temp_pocket_money_app/src/ui/funds_management_components/AddFundsForm.tsx
const AddFundsForm = () => {
  return (
    <div className="add-funds-form">
      <h2>Add Funds</h2>
      <form>
        <div>
          <label htmlFor="amount">Amount:</label>
          <input type="number" id="amount" name="amount" placeholder="0.00" />
        </div>
        <div>
          <label htmlFor="source">Source:</label>
          <select id="source" name="source">
            <option value="bank_account_1">Bank Account ****1234</option>
            {/* More options can be added later */}
          </select>
        </div>
        <button type="submit">Add Funds</button>
      </form>
    </div>
  );
};
export default AddFundsForm;
