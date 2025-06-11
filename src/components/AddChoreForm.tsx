// src/components/AddChoreForm.tsx
import React, { useState } from 'react';
import { useChores } from '../contexts/ChoresContext'; // Adjust path as necessary
import { Recurrence } from '../types'; // Adjust path as necessary

export const AddChoreForm: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>(null); // Default to no recurrence

  const { addChore } = useChores();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      alert('Please enter a chore name.'); // Basic validation
      return;
    }
    addChore(name, description, recurrence);
    setName('');
    setDescription('');
    setRecurrence(null); // Reset form
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
        <label htmlFor="choreRecurrence">Recurrence:</label>
        <select
          id="choreRecurrence"
          value={recurrence === null ? 'none' : recurrence}
          onChange={(e) => setRecurrence(e.target.value === 'none' ? null : e.target.value as Recurrence)}
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        >
          <option value="none">None</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
        Add Chore
      </button>
    </form>
  );
};
