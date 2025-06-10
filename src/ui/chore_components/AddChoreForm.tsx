// src/ui/chore_components/AddChoreForm.tsx
import React, { useState, useContext } from 'react';
import { useChoresContext } from '../../contexts/ChoresContext';
import { UserContext } from '../../contexts/UserContext'; // To get kids for dropdown
import type { Kid } from '../../types'; // Import Kid type

const AddChoreForm = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedKidId, setAssignedKidId] = useState<string | undefined>(undefined);
  const [dueDate, setDueDate] = useState(''); // Represents first due date or one-off due date
  const [rewardAmount, setRewardAmount] = useState<number | string>('');

  // New state for recurrence
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [recurrenceDay, setRecurrenceDay] = useState<string>(''); // Store as string from select/input
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [tagsInput, setTagsInput] = useState(''); // New state for tags

  const { addChoreDefinition } = useChoresContext();
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
      description: description.trim() || undefined,
      assignedKidId: assignedKidId || undefined,
      dueDate: dueDate || undefined,
      rewardAmount: rewardAmount ? parseFloat(String(rewardAmount)) : undefined,
      // Add recurrence data
      recurrenceType: recurrenceType === 'none' ? null : recurrenceType,
      recurrenceDay: (recurrenceType === 'weekly' || recurrenceType === 'monthly') && recurrenceDay ? parseInt(recurrenceDay, 10) : null,
      recurrenceEndDate: recurrenceType !== 'none' && recurrenceEndDate ? recurrenceEndDate : null,
      tags: tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '').length > 0 ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : undefined,
    };

    addChoreDefinition(choreData);

    // Reset form fields
    setTitle('');
    setDescription('');
    setAssignedKidId(undefined);
    setDueDate('');
    setRewardAmount('');
    setRecurrenceType('none');
    setRecurrenceDay('');
    setRecurrenceEndDate('');
    setTagsInput(''); // Reset tags input
    alert('Chore added!');
  };

  const handleRecurrenceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as 'none' | 'daily' | 'weekly' | 'monthly';
    setRecurrenceType(type);
    setRecurrenceDay(''); // Reset day when type changes
  };

  return (
    <form onSubmit={handleSubmit} className="add-chore-form">
      {/* Existing fields for title, description, assignedKid, dueDate, rewardAmount */}
      <div>
        <label htmlFor="choreTitle">Title:</label>
        <input type="text" id="choreTitle" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="choreDescription">Description (Optional):</label>
        <textarea id="choreDescription" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label htmlFor="assignedKid">Assign to (Optional):</label>
        <select id="assignedKid" value={assignedKidId || ''} onChange={(e) => setAssignedKidId(e.target.value || undefined)} disabled={userContext?.loading || kids.length === 0}>
          <option value="">Unassigned</option>
          {kids.map((kid: Kid) => (<option key={kid.id} value={kid.id}>{kid.name}</option>))}
        </select>
      </div>
      <div>
        <label htmlFor="dueDate">Due Date (Optional, or Start Date for Recurring):</label>
        <input type="date" id="dueDate" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <div>
        <label htmlFor="rewardAmount">Reward Amount (Optional):</label>
        <input type="number" id="rewardAmount" value={rewardAmount} onChange={(e) => setRewardAmount(e.target.value)} step="0.01" min="0"/>
      </div>

      {/* New Tags Input Field */}
      <div>
        <label htmlFor="choreTags">Tags (comma-separated, Optional):</label>
        <input
          type="text"
          id="choreTags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="e.g. cleaning, outdoor, urgent"
        />
      </div>

      {/* New Recurrence Fields */}
      <div>
        <label htmlFor="recurrenceType">Repeats:</label>
        <select id="recurrenceType" value={recurrenceType} onChange={handleRecurrenceTypeChange}>
          <option value="none">None</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {recurrenceType === 'weekly' && (
        <div>
          <label htmlFor="recurrenceDayOfWeek">Day of the Week:</label>
          <select id="recurrenceDayOfWeek" value={recurrenceDay} onChange={(e) => setRecurrenceDay(e.target.value)} required={recurrenceType === 'weekly'}>
            <option value="">Select a day</option>
            <option value="0">Sunday</option>
            <option value="1">Monday</option>
            <option value="2">Tuesday</option>
            <option value="3">Wednesday</option>
            <option value="4">Thursday</option>
            <option value="5">Friday</option>
            <option value="6">Saturday</option>
          </select>
        </div>
      )}

      {recurrenceType === 'monthly' && (
        <div>
          <label htmlFor="recurrenceDayOfMonth">Day of the Month (1-31):</label>
          <input
            type="number"
            id="recurrenceDayOfMonth"
            value={recurrenceDay}
            onChange={(e) => setRecurrenceDay(e.target.value)}
            min="1"
            max="31"
            required={recurrenceType === 'monthly'}
          />
        </div>
      )}

      {(recurrenceType !== 'none') && (
        <div>
          <label htmlFor="recurrenceEndDate">Repeat Until (Optional):</label>
          <input
            type="date"
            id="recurrenceEndDate"
            value={recurrenceEndDate}
            onChange={(e) => setRecurrenceEndDate(e.target.value)}
            min={dueDate || new Date().toISOString().split('T')[0]} // End date can't be before due/start date
          />
        </div>
      )}

      <button type="submit">Add Chore</button>
    </form>
  );
};

export default AddChoreForm;
