// src/ui/chore_components/AddChoreForm.tsx
import React, { useState, useContext } from 'react';
import { useChoresContext } from '../../contexts/ChoresContext';
import { UserContext } from '../../contexts/UserContext'; // To get kids for dropdown
import type { Kid } from '../../types'; // Import Kid type

const AddChoreForm = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedKidId, setAssignedKidId] = useState<string | undefined>(undefined); // Store as string or undefined
  const [dueDate, setDueDate] = useState('');
  const [rewardAmount, setRewardAmount] = useState<number | string>(''); // Allow string for input, then parse

  const { addChore } = useChoresContext();
  const userContext = useContext(UserContext);
  const kids = userContext?.user?.kids || [];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      alert('Please enter a chore title.');
      return;
    }

    const choreData = {
      title: title.trim(),
      description: description.trim() || undefined, // Store undefined if empty
      assignedKidId: assignedKidId || undefined, // Store undefined if empty string (e.g. "Unassigned")
      dueDate: dueDate || undefined,
      rewardAmount: rewardAmount ? parseFloat(String(rewardAmount)) : undefined,
    };

    addChore(choreData);

    // Reset form fields
    setTitle('');
    setDescription('');
    setAssignedKidId(undefined);
    setDueDate('');
    setRewardAmount('');
    alert('Chore added!');
  };

  return (
    <form onSubmit={handleSubmit} className="add-chore-form">
      <div>
        <label htmlFor="choreTitle">Title:</label>
        <input
          type="text"
          id="choreTitle"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="choreDescription">Description (Optional):</label>
        <textarea
          id="choreDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="assignedKid">Assign to (Optional):</label>
        <select
          id="assignedKid"
          value={assignedKidId || ''} // Handle undefined for select value
          onChange={(e) => setAssignedKidId(e.target.value || undefined)}
          disabled={userContext?.loading || kids.length === 0}
        >
          <option value="">Unassigned</option>
          {kids.map((kid: Kid) => (
            <option key={kid.id} value={kid.id}>
              {kid.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="dueDate">Due Date (Optional):</label>
        <input
          type="date"
          id="dueDate"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="rewardAmount">Reward Amount (Optional):</label>
        <input
          type="number"
          id="rewardAmount"
          value={rewardAmount}
          onChange={(e) => setRewardAmount(e.target.value)}
          step="0.01"
          min="0"
        />
      </div>
      <button type="submit">Add Chore</button>
    </form>
  );
};

export default AddChoreForm;
