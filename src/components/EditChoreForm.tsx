// src/components/EditChoreForm.tsx
import React, { useState, useEffect } from 'react';
import { useChores } from '../contexts/ChoresContext'; // Adjust path if necessary
import { Chore, RecurrenceSetting } from '../types'; // Adjust path if necessary

interface EditChoreFormProps {
  choreToEdit: Chore;
  onClose: () => void; // Function to close the form/modal
}

const daysOfWeek = [
  { label: 'Sunday', value: 0 }, { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 }, { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 }, { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 }
];

export const EditChoreForm: React.FC<EditChoreFormProps> = ({ choreToEdit, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(''); // YYYY-MM-DD

  const [recurrenceType, setRecurrenceType] = useState<string>('none');
  const [weeklyDay, setWeeklyDay] = useState<number>(0);
  const [monthlyDay, setMonthlyDay] = useState<number>(1);
  const [specificDaysInput, setSpecificDaysInput] = useState<string>('');

  const { updateChore } = useChores();

  useEffect(() => {
    if (choreToEdit) {
      setName(choreToEdit.name);
      setDescription(choreToEdit.description);
      setDueDate(choreToEdit.dueDate); // Assuming dueDate is "YYYY-MM-DD"

      const rec = choreToEdit.recurrence;
      if (rec === null) {
        setRecurrenceType('none');
      } else {
        setRecurrenceType(rec.type);
        if (rec.type === 'weekly') {
          setWeeklyDay(rec.dayOfWeek);
        } else if (rec.type === 'monthly') {
          setMonthlyDay(rec.dayOfMonth);
        } else if (rec.type === 'specificDays') {
          setSpecificDaysInput(rec.days.join(','));
        }
      }
    }
  }, [choreToEdit]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !dueDate) {
      alert('Please enter a chore name and a due date.');
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
        } else if (recurrenceType === 'specificDays' && specificDaysInput.trim() === '') {
            // If type is specificDays but input is empty, treat as no recurrence for this submission
            recurrenceSetting = null;
        }
        break;
      case 'none':
      default:
        recurrenceSetting = null;
        break;
    }

    // If specificDays was selected type, but input was empty or invalid leading to null setting
    if (recurrenceType === 'specificDays' && recurrenceSetting === null && specificDaysInput.trim() !== '') {
        alert('For "Specific Days" recurrence, please provide valid, comma-separated day numbers (0-6), or clear the input if you wish to remove this recurrence type.');
        return;
    }


    updateChore(choreToEdit.id, {
      name,
      description,
      recurrence: recurrenceSetting,
      dueDate,
      // isComplete is not changed by this form directly
      // id is not changed
    });

    onClose(); // Close the form/modal after submission
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: 'white' }}>
      <h3>Edit Chore</h3>
      <div>
        <label htmlFor="editChoreName">Chore Name:</label>
        <input id="editChoreName" type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
      </div>
      <div>
        <label htmlFor="editChoreDescription">Description:</label>
        <textarea id="editChoreDescription" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px', minHeight: '60px' }} />
      </div>
      <div>
        <label htmlFor="editDueDate">Due Date:</label>
        <input id="editDueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
      </div>
      <div>
        <label htmlFor="editRecurrenceType">Recurrence Type:</label>
        <select id="editRecurrenceType" value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px' }}>
          <option value="none">None</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="specificDays">Specific Days of Week</option>
        </select>
      </div>

      {recurrenceType === 'weekly' && (
        <div>
          <label htmlFor="editWeeklyDay">Day of the Week:</label>
          <select id="editWeeklyDay" value={weeklyDay} onChange={(e) => setWeeklyDay(parseInt(e.target.value, 10))} style={{ width: '100%', padding: '8px', marginBottom: '10px' }}>
            {daysOfWeek.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
          </select>
        </div>
      )}

      {recurrenceType === 'monthly' && (
        <div>
          <label htmlFor="editMonthlyDay">Day of the Month (1-31):</label>
          <input id="editMonthlyDay" type="number" min="1" max="31" value={monthlyDay} onChange={(e) => setMonthlyDay(parseInt(e.target.value, 10))} style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
        </div>
      )}

      {recurrenceType === 'specificDays' && (
        <div>
          <label htmlFor="editSpecificDaysInput">Specific Days (comma-separated, 0=Sun, 6=Sat):</label>
          <input id="editSpecificDaysInput" type="text" value={specificDaysInput} onChange={(e) => setSpecificDaysInput(e.target.value)} placeholder="e.g., 1,3,5 for Mon,Wed,Fri" style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
        </div>
      )}

      <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
        <button type="button" onClick={onClose} style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}>
          Cancel
        </button>
        <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
          Save Changes
        </button>
      </div>
    </form>
  );
};
