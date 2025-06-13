// src/components/AddChoreForm.tsx
import React, { useState } from 'react';
import { useChoresContext } from '../contexts/ChoresContext';

interface AddChoreFormProps {
  defaultKidId?: string;
  defaultDueDate?: Date;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const AddChoreForm: React.FC<AddChoreFormProps> = ({ defaultKidId, defaultDueDate, onSuccess, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string>(
    defaultDueDate ? defaultDueDate.toISOString().split('T')[0] : ''
  );
  const [assignedKidId, setAssignedKidId] = useState<string>(defaultKidId || '');

  const { addChoreDefinition } = useChoresContext();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !dueDate || !assignedKidId) {
      alert('Please enter all required fields.');
      return;
    }
    addChoreDefinition({
      title,
      description,
      assignedKidId,
      dueDate,
      recurrenceType: recurrence as 'daily' | 'weekly' | 'monthly' | null
    });
    setTitle('');
    setDescription('');
    setRecurrence(null);
    setDueDate(defaultDueDate ? defaultDueDate.toISOString().split('T')[0] : '');
    if (onSuccess) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
      <div>
        <label htmlFor="choreTitle">Chore Title:</label>
        <input
          id="choreTitle"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
        <label htmlFor="choreDueDate">Due Date:</label>
        <input
          id="choreDueDate"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
      </div>
      <div>
        <label htmlFor="choreRecurrence">Recurrence:</label>
        <select
          id="choreRecurrence"
          value={recurrence === null ? 'none' : recurrence}
          onChange={(e) => setRecurrence(e.target.value === 'none' ? null : e.target.value as string)}
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        >
          <option value="none">None</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      {/* Optionally, add kid selector if not pre-filled */}
      {!defaultKidId && (
        <div>
          <label htmlFor="assignedKidId">Assign to Kid:</label>
          <input
            id="assignedKidId"
            type="text"
            value={assignedKidId}
            onChange={(e) => setAssignedKidId(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {onCancel && (
          <button type="button" onClick={onCancel} style={{ padding: '10px 15px', backgroundColor: '#ccc', color: '#333', border: 'none', borderRadius: '4px' }}>Cancel</button>
        )}
        <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
          Add Chore
        </button>
      </div>
    </form>
  );
};

export default AddChoreForm;
