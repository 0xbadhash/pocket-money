// src/components/AddChoreForm.tsx
import React, { useState } from 'react';
import { useChoresContext } from '../contexts/ChoresContext'; // Adjust path if necessary
import { RecurrenceSetting } from '../types'; // Adjust path if necessary

const daysOfWeek = [
  { label: 'Sunday', value: 0 }, { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 }, { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 }, { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 }
];

export const AddChoreForm: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(''); // YYYY-MM-DD

  const [recurrenceType, setRecurrenceType] = useState<string>('none'); // 'none', 'daily', 'weekly', 'monthly', 'specificDays'
  const [weeklyDay, setWeeklyDay] = useState<number>(0); // 0 for Sunday
  const [monthlyDay, setMonthlyDay] = useState<number>(1); // Day of month
  const [specificDaysInput, setSpecificDaysInput] = useState<string>(''); // Comma-separated numbers e.g., "1,3,5"

  const { addChoreDefinition: addChore } = useChoresContext(); // Changed to useChoresContext and aliased addChoreDefinition

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      alert('Please enter a chore name.'); // Basic validation
      return;
    }

    let recurrenceSetting: RecurrenceSetting = null;
    switch (recurrenceType) {
      case 'daily':
        recurrenceSetting = { type: 'daily' };
        break;
      case 'weekly':
        recurrenceSetting = { type: 'weekly', dayOfWeek: weeklyDay };
        break;
      case 'monthly':
        if (monthlyDay < 1 || monthlyDay > 31) {
          alert('Monthly day must be between 1 and 31.');
          return;
        }
        recurrenceSetting = { type: 'monthly', dayOfMonth: monthlyDay };
        break;
      case 'specificDays':
        const parsedDays = specificDaysInput.split(',')
          .map(s => parseInt(s.trim(), 10))
          .filter(n => !isNaN(n) && n >= 0 && n <= 6);
        if (parsedDays.length === 0 && specificDaysInput.trim() !== '') {
            alert('Invalid specific days. Please use comma-separated numbers from 0 (Sun) to 6 (Sat).');
            return;
        }
        if (parsedDays.length > 0) {
            recurrenceSetting = { type: 'specificDays', days: parsedDays };
        } else {
            // If input was empty or only invalid chars, treat as 'none' effectively, or handle as error.
            // For this form, if specificDays is selected but no valid days given, maybe default to null or error.
            // Let's require valid days if type is specificDays and input is not empty.
            alert('Please enter valid days for specific days recurrence or select "None".');
            return;
        }
        break;
      case 'none':
      default:
        recurrenceSetting = null;
        break;
    }

    // If specificDays was selected but input was empty, resulting in recurrenceSetting still being null
    // but type was 'specificDays', it's an invalid state based on above.
    // The logic for specificDays ensures it only sets if parsedDays.length > 0.
    // If recurrenceType is 'specificDays' but recurrenceSetting ended up null due to empty/invalid input,
    // we should probably prevent submission or clarify.
    // The current specificDays logic returns if specificDaysInput is not empty but parsedDays is.
    // If specificDaysInput is empty and type is 'specificDays', it should not proceed.
    if (recurrenceType === 'specificDays' && (!recurrenceSetting || (recurrenceSetting.type === 'specificDays' && recurrenceSetting.days.length === 0))) {
        alert('For "Specific Days" recurrence, please provide valid, comma-separated day numbers (0-6).');
        return;
    }

    addChore(name, description, recurrenceSetting, dueDate);

    // Reset form
    setName('');
    setDescription('');
    setDueDate('');
    setRecurrenceType('none');
    setWeeklyDay(0);
    setMonthlyDay(1);
    setSpecificDaysInput('');
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
      <div>
        <label htmlFor="choreName">Chore Name:</label>
        <input
          id="choreName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
      </div>
      <div>
        <label htmlFor="choreDescription">Description:</label>
        <textarea
          id="choreDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '10px', minHeight: '60px' }}
        />
      </div>
      <div>
        <label htmlFor="dueDate">Due Date:</label>
        <input
          id="dueDate"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
      </div>
      <div>
        <label htmlFor="recurrenceType">Recurrence Type:</label>
        <select
          id="recurrenceType"
          value={recurrenceType}
          onChange={(e) => setRecurrenceType(e.target.value)}
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        >
          <option value="none">None</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="specificDays">Specific Days of Week</option>
        </select>
      </div>

      {recurrenceType === 'weekly' && (
        <div>
          <label htmlFor="weeklyDay">Day of Week:</label>
          <select
            id="weeklyDay"
            value={weeklyDay}
            onChange={(e) => setWeeklyDay(parseInt(e.target.value, 10))}
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          >
            {daysOfWeek.map(day => (
              <option key={day.value} value={day.value}>{day.label}</option>
            ))}
          </select>
        </div>
      )}

      {recurrenceType === 'monthly' && (
        <div>
          <label htmlFor="monthlyDay">Day of Month:</label>
          <input
            id="monthlyDay"
            type="number"
            min="1"
            max="31"
            value={monthlyDay}
            onChange={(e) => setMonthlyDay(parseInt(e.target.value, 10))}
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
        </div>
      )}

      {recurrenceType === 'specificDays' && (
        <div>
          <label htmlFor="specificDaysInput">Specific Days (0-6, comma-separated):</label>
          <input
            id="specificDaysInput"
            type="text"
            value={specificDaysInput}
            onChange={(e) => setSpecificDaysInput(e.target.value)}
            placeholder="e.g., 0,2,4 (Sun,Tue,Thu)"
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
        </div>
      )}

      <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
        Add Chore
      </button>
    </form>
  );
};