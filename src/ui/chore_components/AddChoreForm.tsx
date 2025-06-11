// src/ui/chore_components/AddChoreForm.tsx
import React, { useState, useContext } from 'react';
import { useChoresContext } from '../../contexts/ChoresContext';
import { UserContext } from '../../contexts/UserContext';
import type { Kid, SubTask } from '../../types';
import { getTodayDateString } from '../../utils/dateUtils'; // Import date utility

const AddChoreForm = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedKidId, setAssignedKidId] = useState<string | undefined>(undefined);
  const [dueDate, setDueDate] = useState('');
  const [rewardAmount, setRewardAmount] = useState<number | string>('');

  // State for recurrence
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [recurrenceDay, setRecurrenceDay] = useState<string>('');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);

  const { addChoreDefinition } = useChoresContext();
  const userContext = useContext(UserContext);
  const kids = userContext?.user?.kids || [];

  // Helper to process tags input
  const processTags = (input: string) => {
    const processedTags = input
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag !== '');
    return processedTags.length > 0 ? processedTags : undefined;
  };

  // Helper to process sub-tasks
  const processSubTasks = (tasks: SubTask[]) => {
    const processedTasks = tasks
      .map(st => ({ ...st, title: st.title.trim() }))
      .filter(st => st.title !== '');
    return processedTasks.length > 0 ? processedTasks : undefined;
  };

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
      dueDate: dueDate || getTodayDateString(), // Prioritize the incoming change as it provides a default
      rewardAmount: rewardAmount ? Number(rewardAmount) : undefined, // Using Number() is generally robust
      // Recurrence data
      recurrenceType: recurrenceType === 'none' ? null : recurrenceType,
      recurrenceDay: (recurrenceType === 'weekly' || recurrenceType === 'monthly') && recurrenceDay
        ? parseInt(recurrenceDay, 10)
        : null,
      recurrenceEndDate: recurrenceType !== 'none' && recurrenceEndDate ? recurrenceEndDate : null,

      tags: processTags(tagsInput),
      subTasks: processSubTasks(subTasks),
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
    setTagsInput('');
    setSubTasks([]);
    alert('Chore added!');
  };

  const handleRecurrenceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as 'none' | 'daily' | 'weekly' | 'monthly';
    setRecurrenceType(type);
    setRecurrenceDay(''); // Reset day when type changes
  };

  // Sub-task handlers
  const handleAddSubTask = () => {
    setSubTasks(prev => [...prev, { id: `st_${Date.now()}`, title: '', isComplete: false }]);
  };

  const handleSubTaskTitleChange = (id: string, newTitle: string) => {
    setSubTasks(prev => prev.map(st => st.id === id ? { ...st, title: newTitle } : st));
  };

  const handleRemoveSubTask = (id: string) => {
    setSubTasks(prev => prev.filter(st => st.id !== id));
  };

  return (
    <form onSubmit={handleSubmit} className="add-chore-form">
      {/* Basic Chore Details */}
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
        <select
          id="assignedKid"
          value={assignedKidId || ''}
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
        <label htmlFor="dueDate">Due Date (Optional, or Start Date for Recurring):</label>
        <input type="date" id="dueDate" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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

      {/* Tags Input Field */}
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

      {/* Recurrence Fields */}
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
          <select
            id="recurrenceDayOfWeek"
            value={recurrenceDay}
            onChange={(e) => setRecurrenceDay(e.target.value)}
            required={recurrenceType === 'weekly'}
          >
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

      {/* This div was previously unclosed */}
      {(recurrenceType !== 'none') && (
        <div>
          <label htmlFor="recurrenceEndDate">Repeat Until (Optional):</label>
          <input type="date" id="recurrenceEndDate" value={recurrenceEndDate} onChange={(e) => setRecurrenceEndDate(e.target.value)} />
        </div>
      )}

      {/* Sub-tasks Section */}
      <h3>Sub-tasks (Optional)</h3>
      {subTasks.map((subTask) => (
        <div key={subTask.id} className="sub-task-item">
          <input
            type="text"
            value={subTask.title}
            onChange={(e) => handleSubTaskTitleChange(subTask.id, e.target.value)}
            placeholder="Sub-task title"
          />
          <button type="button" onClick={() => handleRemoveSubTask(subTask.id)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={handleAddSubTask}>
        Add Sub-task
      </button>

      <button type="submit" className="submit-button">
        Add Chore
      </button>
    </form>
  );
};

export default AddChoreForm;