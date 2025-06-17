// src/ui/chore_components/AddChoreForm.tsx
import React, { useState, useContext, useEffect } from 'react';
import { useChoresContext } from '../../contexts/ChoresContext';
import { UserContext } from '../../contexts/UserContext';
import type { Kid, SubTask } from '../../types';

const AddChoreForm = ({
  initialChore,
  defaultKidId,
  defaultDueDate,
  defaultCategoryStatus,
  onSuccess,
  onCancel,
  enableSubtasks,
  enableRecurrence,
  defaultIsRecurring,
}: {
  initialChore?: any;
  defaultKidId?: string;
  defaultDueDate?: Date;
  defaultCategoryStatus?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  enableSubtasks?: boolean;
  enableRecurrence?: boolean;
  defaultIsRecurring?: boolean;
}) => {
  // --- Use effect to populate state when editing ---
  const [title, setTitle] = useState(initialChore?.title || '');
  const [description, setDescription] = useState(initialChore?.description || '');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | ''>(initialChore?.priority || '');
  const [assignedKidId, setAssignedKidId] = useState<string | undefined>(initialChore?.assignedKidId || defaultKidId || undefined);
  const [dueDate, setDueDate] = useState(initialChore?.dueDate || (defaultDueDate ? defaultDueDate.toISOString().split('T')[0] : ''));
  const [earlyStartDate, setEarlyStartDate] = useState(initialChore?.earlyStartDate || '');
  const [rewardAmount, setRewardAmount] = useState<number | string>(initialChore?.rewardAmount ?? '');

  // Recurrence state
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly' | 'monthly'>(
    initialChore?.recurrenceType || 'none'
  );
  const [recurrenceDaysOfWeek, setRecurrenceDaysOfWeek] = useState<number[]>(
    initialChore?.recurrenceType === 'weekly'
      ? (Array.isArray(initialChore?.recurrenceDay) ? initialChore.recurrenceDay : (typeof initialChore?.recurrenceDay === 'number' ? [initialChore.recurrenceDay] : []))
      : []
  );
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState<number | ''>(
    initialChore?.recurrenceType === 'monthly' && initialChore?.recurrenceDay
      ? initialChore.recurrenceDay
      : ''
  );
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(
    initialChore?.recurrenceEndDate || ''
  );
  const [tagsInput, setTagsInput] = useState(initialChore?.tags?.join(', ') || '');
  const [subTasks, setSubTasks] = useState<SubTask[]>(initialChore?.subTasks || []);

  // If initialChore changes (editing a different chore), update state
  useEffect(() => {
    if (initialChore) {
      setTitle(initialChore.title || '');
      setDescription(initialChore.description || '');
      setPriority(initialChore.priority || '');
      setAssignedKidId(initialChore.assignedKidId || defaultKidId || undefined);
      setDueDate(initialChore.dueDate || (defaultDueDate ? defaultDueDate.toISOString().split('T')[0] : ''));
      setEarlyStartDate(initialChore.earlyStartDate || '');
      setRewardAmount(initialChore.rewardAmount ?? '');
      setRecurrenceType(initialChore.recurrenceType || 'none');
      setRecurrenceDaysOfWeek(
        initialChore.recurrenceType === 'weekly'
          ? (Array.isArray(initialChore.recurrenceDay) ? initialChore.recurrenceDay : (typeof initialChore.recurrenceDay === 'number' ? [initialChore.recurrenceDay] : []))
          : []
      );
      setRecurrenceDayOfMonth(
        initialChore.recurrenceType === 'monthly' && initialChore.recurrenceDay
          ? initialChore.recurrenceDay
          : ''
      );
      setRecurrenceEndDate(initialChore.recurrenceEndDate || '');
      setTagsInput(initialChore.tags?.join(', ') || '');
      setSubTasks(initialChore.subTasks || []);
    }
  }, [initialChore, defaultKidId, defaultDueDate]);

  const { addChoreDefinition } = useChoresContext();
  const userContext = useContext(UserContext);
  const kids = userContext?.user?.kids || [];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      alert('Please enter a chore title.');
      return;
    }

    let recurrenceDay: number | number[] | null = null;
    if (recurrenceType === 'weekly') {
      recurrenceDay = recurrenceDaysOfWeek.length > 0 ? recurrenceDaysOfWeek : null;
    } else if (recurrenceType === 'monthly') {
      recurrenceDay = recurrenceDayOfMonth ? Number(recurrenceDayOfMonth) : null;
    }

    const choreData = {
      title: title.trim(),
      description: description.trim() || undefined,
      assignedKidId: assignedKidId || defaultKidId || undefined,
      dueDate: dueDate || (defaultDueDate ? defaultDueDate.toISOString().split('T')[0] : undefined),
      earlyStartDate: earlyStartDate || undefined, // Add earlyStartDate
      rewardAmount: rewardAmount ? parseFloat(String(rewardAmount)) : undefined,
      recurrenceType: recurrenceType === 'none' ? null : recurrenceType,
      recurrenceDay,
      recurrenceEndDate: recurrenceType !== 'none' && recurrenceEndDate ? recurrenceEndDate : null,
      tags: tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '').length > 0 ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : undefined,
      subTasks: subTasks.map(st => ({...st, title: st.title.trim()})).filter(st => st.title !== '').length > 0 ? subTasks.map(st => ({...st, title: st.title.trim()})).filter(st => st.title !== '') : undefined,
      priority: priority || undefined,
    };

    addChoreDefinition(choreData);

    // Reset form fields
    setTitle('');
    setDescription('');
    setAssignedKidId(undefined);
    setDueDate('');
    setEarlyStartDate(''); // Reset earlyStartDate
    setRewardAmount('');
    setRecurrenceType('none');
    setRecurrenceDaysOfWeek([]);
    setRecurrenceDayOfMonth('');
    setRecurrenceEndDate('');
    setTagsInput(''); // Reset tags input
    setSubTasks([]); // Reset sub-tasks
    setPriority(''); // Reset priority
    alert('Chore added!');
    if (onSuccess) onSuccess();
  };

  const handleRecurrenceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as 'none' | 'daily' | 'weekly' | 'monthly';
    setRecurrenceType(type);
    setRecurrenceDaysOfWeek([]);
    setRecurrenceDayOfMonth('');
  };

  const handleRecurrenceDayOfWeekChange = (day: number) => {
    setRecurrenceDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
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
        <label htmlFor="earlyStartDate">Early Start Date (Optional):</label>
        <input
          type="date"
          id="earlyStartDate"
          value={earlyStartDate}
          onChange={(e) => {
            setEarlyStartDate(e.target.value);
            // Basic validation: earlyStartDate should not be after dueDate
            if (dueDate && e.target.value > dueDate) {
              // Optionally clear dueDate or show a warning. For now, just a console log.
              console.warn("Early start date is after the due date.");
            }
          }}
          max={dueDate || undefined} // HTML5 validation: not after dueDate
        />
         {dueDate && earlyStartDate && earlyStartDate > dueDate && (
          <p style={{ color: 'orange', fontSize: '0.8em' }}>Warning: Early start is after due date.</p>
        )}
      </div>
      <div>
        <label htmlFor="rewardAmount">Reward Amount (Optional):</label>
        <input type="number" id="rewardAmount" value={rewardAmount} onChange={(e) => setRewardAmount(e.target.value)} step="0.01" min="0"/>
      </div>

      <div>
        <label htmlFor="priority">Priority (Optional):</label>
        <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value as 'Low' | 'Medium' | 'High' | '')}>
          <option value="">Default</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
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
          <label>Days of the Week:</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
              <label key={day} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <input
                  type="checkbox"
                  checked={recurrenceDaysOfWeek.includes(idx)}
                  onChange={() => handleRecurrenceDayOfWeekChange(idx)}
                />
                {day}
              </label>
            ))}
          </div>
        </div>
      )}

      {recurrenceType === 'monthly' && (
        <div>
          <label htmlFor="recurrenceDayOfMonth">Day of the Month (1-31):</label>
          <input
            type="number"
            id="recurrenceDayOfMonth"
            value={recurrenceDayOfMonth}
            onChange={e => setRecurrenceDayOfMonth(Number(e.target.value))}
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
            min={dueDate || new Date().toISOString().split('T')[0]}
          />
        </div>
      )}

      {/* Sub-tasks Section */}
      {enableSubtasks && (
        <div className="sub-tasks-section" style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
          <label>Sub-tasks (Optional):</label>
          {subTasks.map((subTask, index) => (
            <div key={subTask.id} className="sub-task-item" style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
              <input
                type="text"
                placeholder={`Sub-task ${index + 1}`}
                value={subTask.title}
                onChange={(e) => handleSubTaskTitleChange(subTask.id, e.target.value)}
                style={{ flexGrow: 1, marginRight: '5px' }}
              />
              <button type="button" onClick={() => handleRemoveSubTask(subTask.id)}>Remove</button>
            </div>
          ))}
          <button type="button" onClick={handleAddSubTask} style={{ marginTop: '5px' }}>
            + Add Sub-task
          </button>
        </div>
      )}

      <button type="submit">{initialChore ? 'Update Chore' : 'Add Chore'}</button>
      {onCancel && (
        <button type="button" onClick={onCancel} style={{ marginLeft: 8 }}>
          Cancel
        </button>
      )}
    </form>
  );
};

export default AddChoreForm;
