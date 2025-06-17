// src/ui/kanban_components/InstanceDetailModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import type { ChoreInstance, ChoreDefinition, KanbanColumnConfig } from '../../types';
import { useUserContext } from '../../contexts/UserContext';
import { useChoresContext } from '../../contexts/ChoresContext';

interface InstanceDetailModalProps {
  instance: ChoreInstance | null;
  definition: ChoreDefinition | null;
  isVisible: boolean;
  onClose: () => void;
}

// Enhanced Styling
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.65)', display: 'flex', // Slightly darker overlay
  alignItems: 'center', justifyContent: 'center', zIndex: 1050,
};

const modalContentStyle: React.CSSProperties = {
  background: 'var(--surface-color, #ffffff)', // Use CSS variable for theme support
  color: 'var(--text-color, #213547)', // Use CSS variable
  padding: '20px 25px', // Adjusted padding
  borderRadius: '12px', // Softer border radius
  minWidth: '550px', // Adjusted minWidth
  width: 'auto', // Allow content to dictate width up to maxWidth
  maxWidth: '700px',   // Adjusted maxWidth
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 5px 20px rgba(0, 0, 0, 0.25)', // Softer shadow
  position: 'relative',
  borderTop: '5px solid var(--primary-color, #007bff)', // Accent border
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute', top: '15px', right: '20px', background: 'transparent',
  border: 'none', fontSize: '2rem', cursor: 'pointer',
  color: 'var(--text-color-secondary, #aaa)', lineHeight: 1, padding: 0,
};

const editButtonStyle: React.CSSProperties = {
  marginLeft: '10px', background: 'none', border: 'none',
  cursor: 'pointer', padding: '2px 4px', fontSize: '0.9em',
  color: 'var(--primary-color, #007bff)', borderRadius: '4px',
  display: 'inline-flex', alignItems: 'center',
};

const sectionHeadingStyle: React.CSSProperties = {
  marginTop: '20px', marginBottom: '10px',
  borderBottom: '1px solid var(--border-color, #eee)',
  paddingBottom: '10px', cursor: 'pointer', display: 'flex',
  justifyContent: 'space-between', alignItems: 'center',
  fontSize: '1.1em', fontWeight: 600, color: 'var(--text-color-strong, #333)'
};

const inputStyle: React.CSSProperties = {
  padding: '8px 10px', border: '1px solid var(--border-color, #ccc)',
  borderRadius: '4px', fontSize: '0.95em',
  backgroundColor: 'var(--input-background, white)', color: 'var(--input-text-color, black)'
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle, width: 'calc(100% - 22px)', // Account for padding and border
  boxSizing: 'border-box', resize: 'vertical', minHeight: '60px',
};

const detailItemStyle: React.CSSProperties = {
  display: 'flex', marginBottom: '10px', alignItems: 'center', fontSize: '0.95em'
};
const detailLabelStyle: React.CSSProperties = {
  minWidth: '130px', marginRight: '10px', color: 'var(--text-color-secondary, #555)', fontWeight: 600,
};


const InstanceDetailModal: React.FC<InstanceDetailModalProps> = ({
  instance,
  definition,
  isVisible,
  onClose,
}) => {
  const { user, getKanbanColumnConfigs } = useUserContext();
  const { updateChoreInstanceField, toggleSubtaskCompletionOnInstance, addCommentToInstance } = useChoresContext();

  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editingDateValue, setEditingDateValue] = useState('');
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [editingPriorityValue, setEditingPriorityValue] = useState<'Low' | 'Medium' | 'High' | ''>('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editingDescriptionValue, setEditingDescriptionValue] = useState('');

  const [showSubtasks, setShowSubtasks] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  const dateInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const prioritySelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (isVisible && instance) {
      setEditingDateValue(instance.instanceDate || '');
      const currentEffectivePriority = instance.priority || definition?.priority || '';
      setEditingPriorityValue(currentEffectivePriority);
      setEditingDescriptionValue(instance.instanceDescription || definition?.description || '');

      setIsEditingDate(false);
      setIsEditingPriority(false);
      setIsEditingDescription(false);
      setShowComments(false);
      setShowActivityLog(false);
      // setShowSubtasks(true); // Default for subtasks can remain true or be reset
    }
  }, [isVisible, instance, definition]);

  useEffect(() => { if (isEditingDate && dateInputRef.current) dateInputRef.current.focus(); }, [isEditingDate]);
  useEffect(() => { if (isEditingDescription && descriptionTextareaRef.current) descriptionTextareaRef.current.focus(); }, [isEditingDescription]);
  useEffect(() => { if (isEditingPriority && prioritySelectRef.current) prioritySelectRef.current.focus(); }, [isEditingPriority]);

  if (!isVisible || !instance || !definition) return null;

  const assignedKid = definition.assignedKidId && user?.kids?.find(k => k.id === definition.assignedKidId);
  const statusColumnTitle = (() => {
    if (definition.assignedKidId && instance.categoryStatus) {
      const kidCols = getKanbanColumnConfigs(definition.assignedKidId);
      return kidCols.find(col => col.id === instance.categoryStatus)?.title || 'Uncategorized';
    } return 'Uncategorized';
  })();
  const effectivePriority = instance.priority || definition.priority;
  const priorityDisplayMap = { Low: { color: 'var(--priority-low, green)' }, Medium: { color: 'var(--priority-medium, orange)' }, High: { color: 'var(--priority-high, red)' } };
  const priorityStyle: React.CSSProperties = effectivePriority ? priorityDisplayMap[effectivePriority] || {} : {};

  const handleSaveDate = async () => {
    if (editingDateValue && editingDateValue !== instance.instanceDate) {
      await updateChoreInstanceField(instance.id, 'instanceDate', editingDateValue);
    }
    setIsEditingDate(false);
  };
  const handleSavePriority = async () => {
    const newPriority = editingPriorityValue || undefined;
    const currentEffectivePriority = instance.priority || definition?.priority;
    if (newPriority !== currentEffectivePriority) {
      await updateChoreInstanceField(instance.id, 'priority', newPriority);
    }
    setIsEditingPriority(false);
  };
  const handleSaveDescription = async () => {
    const currentDisplayDesc = instance.instanceDescription || definition?.description || "";
    if (editingDescriptionValue !== currentDisplayDesc) {
      await updateChoreInstanceField(instance.id, 'instanceDescription', editingDescriptionValue.trim() === "" && !definition?.description ? undefined : editingDescriptionValue.trim());
    }
    setIsEditingDescription(false);
  };
  const handleAddNewComment = async () => {
    if (!newCommentText.trim() || !user) return; // Ensure user is available for comment
    await addCommentToInstance(instance!.id, newCommentText.trim(), user.id, user.username);
    setNewCommentText('');
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="instance-modal-title">
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={closeButtonStyle} aria-label="Close modal">&times;</button>
        <h2 id="instance-modal-title" style={{ marginTop: 0, marginBottom: '5px', color: 'var(--primary-color, #007bff)' }}>{definition.title}</h2>
        <p style={{fontSize: '0.9em', color: 'var(--text-color-secondary, #666)', marginTop: 0, marginBottom: '20px'}}>Instance for: {new Date(instance.instanceDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <div style={{ marginBottom: '15px', borderTop: '1px solid var(--border-color, #eee)', paddingTop: '15px' }}>
          <h4 style={{ marginTop:0, marginBottom: '15px', color: 'var(--text-color-strong, #333)' }}>Details</h4>

          <div style={detailItemStyle}>
            <strong style={detailLabelStyle}>Description:</strong>
            {!isEditingDescription && !instance.isSkipped && ( <button onClick={() => setIsEditingDescription(true)} style={editButtonStyle} aria-label="Edit instance description">✏️</button> )}
          </div>
          {isEditingDescription && !instance.isSkipped ? (
            <textarea ref={descriptionTextareaRef} value={editingDescriptionValue} onChange={(e) => setEditingDescriptionValue(e.target.value)} onBlur={handleSaveDescription} rows={4} style={textareaStyle}/>
          ) : (
            <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 10px 0', padding: '8px', border: '1px solid var(--border-color-soft, #f0f0f0)', borderRadius:'4px', backgroundColor: 'var(--surface-color-secondary, #f9f9f9)', minHeight: '40px' }}>
              {instance.instanceDescription ?? definition?.description ?? <em>No description provided.</em>}
            </p>
          )}

          <div style={detailItemStyle}>
            <strong style={detailLabelStyle}>Due Date:</strong>
            {isEditingDate && !instance.isSkipped ? (
              <input ref={dateInputRef} type="date" value={editingDateValue} onChange={(e) => setEditingDateValue(e.target.value)} onBlur={handleSaveDate} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} style={inputStyle}/>
            ) : ( <>{instance.instanceDate} {!instance.isSkipped && <button onClick={() => setIsEditingDate(true)} style={editButtonStyle} aria-label="Edit due date">✏️</button>}</> )}
          </div>

          <div style={detailItemStyle}><strong style={detailLabelStyle}>Status:</strong> {statusColumnTitle}</div>

          <div style={detailItemStyle}>
            <strong style={detailLabelStyle}>Priority:</strong>
            {isEditingPriority && !instance.isSkipped ? (
              <select ref={prioritySelectRef} value={editingPriorityValue} onChange={(e) => setEditingPriorityValue(e.target.value as typeof editingPriorityValue)} onBlur={handleSavePriority} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();}} style={inputStyle}>
                <option value="">Default</option><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
              </select>
            ) : ( <><span style={priorityStyle}>{effectivePriority || 'Default'}</span> {!instance.isSkipped && <button onClick={() => setIsEditingPriority(true)} style={editButtonStyle} aria-label="Edit priority">✏️</button>}</>)}
          </div>

          <div style={detailItemStyle}><strong style={detailLabelStyle}>Assigned To:</strong> {assignedKid?.name || 'Unassigned'}</div>
          {definition.tags && definition.tags.length > 0 && (<div style={{...detailItemStyle, alignItems: 'flex-start' }}><strong style={detailLabelStyle}>Tags:</strong><div style={{display:'flex', flexWrap:'wrap', gap:'5px'}}>{definition.tags.map(tag => (<span key={tag} style={{ backgroundColor: 'var(--neutral-bg-soft, #e0e0e0)', color: 'var(--neutral-text, #333)', padding: '3px 8px', borderRadius: '12px', fontSize: '0.85em' }}>{tag}</span>))}</div></div>)}
          <div style={detailItemStyle}><strong style={detailLabelStyle}>Completed:</strong> {instance.isComplete ? 'Yes' : 'No'}</div>
          {instance.isSkipped && <div style={{...detailItemStyle, color: 'var(--text-color-secondary, grey)'}}><strong style={detailLabelStyle}>Skipped:</strong> Yes</div>}
        </div>

        {/* Subtasks Section */}
        {(definition.subTasks && definition.subTasks.length > 0) && <div style={{ marginBottom: '15px' }}>
          <h4 onClick={() => setShowSubtasks(!showSubtasks)} style={sectionHeadingStyle}>
            <span>Subtasks</span><span>{showSubtasks ? '▼' : '▶'}</span>
          </h4>
          {showSubtasks && (<div style={{paddingTop: '10px'}}>
              {(() => { const completed = definition.subTasks!.filter(st => !!instance.subtaskCompletions?.[st.id]).length; const progress = (definition.subTasks!.length > 0) ? (completed / definition.subTasks!.length) * 100 : 0;
                return (<div style={{ margin: '8px 0' }}><div style={{ backgroundColor: '#e9ecef', borderRadius: '4px', padding: '2px', height: '12px' }}><div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--success-color, #28a745)', borderRadius: '2px' }} /></div></div>);
              })()}
              {definition.subTasks!.map(subTask => (
                <div key={subTask.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '6px', padding: '4px 0' }}>
                  <input type="checkbox" id={`modal-subtask-${instance.id}-${subTask.id}`} checked={!!instance.subtaskCompletions?.[subTask.id]} onChange={() => toggleSubtaskCompletionOnInstance(instance!.id, subTask.id)} style={{ marginRight: '10px', transform:'scale(1.1)' }} disabled={instance.isSkipped || instance.isComplete}/>
                  <label htmlFor={`modal-subtask-${instance.id}-${subTask.id}`} style={{ textDecoration: instance.subtaskCompletions?.[subTask.id] ? 'line-through' : 'none', color: instance.subtaskCompletions?.[subTask.id] ? 'var(--text-color-secondary)' : 'var(--text-color)' }}>{subTask.title}</label>
                </div>
              ))}
          </div>)}
        </div>}

        {/* Comments Section */}
        <div style={{ marginBottom: '15px' }}>
          <h4 onClick={() => setShowComments(!showComments)} style={sectionHeadingStyle}>
            <span>User Comments ({instance.instanceComments?.length || 0})</span><span>{showComments ? '▼' : '▶'}</span>
          </h4>
          {showComments && (<div style={{paddingTop: '10px', borderTop: '1px solid var(--border-color-soft, #f0f0f0)', marginTop:'-10px' }}>
            {instance.instanceComments && instance.instanceComments.length > 0 ? (
              instance.instanceComments.slice().reverse().map(comment => (
                <div key={comment.id} style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px dotted var(--border-color, #eee)' }}>
                  <p style={{ margin: '0 0 3px 0', fontSize: '0.9em' }}><strong style={{color: 'var(--text-color-strong)'}}>{comment.userName}</strong> <span style={{ fontSize: '0.8em', color: 'var(--text-color-secondary, #777)' }}>({new Date(comment.createdAt).toLocaleString()}):</span></p>
                  <p style={{ margin: '0', whiteSpace: 'pre-wrap', fontSize: '0.9em', paddingLeft:'5px' }}>{comment.text}</p>
                </div>
              ))
            ) : (<p><em>No comments yet.</em></p>)}
            <div style={{ marginTop: '15px' }}>
              <textarea value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} placeholder="Add a comment..." rows={3} style={{...textareaStyle, marginBottom:'8px'}} disabled={instance.isSkipped}/>
              <button onClick={handleAddNewComment} disabled={!newCommentText.trim() || instance.isSkipped} className="button-primary">Add Comment</button>
            </div>
          </div>)}
        </div>

        {/* Activity Log Section */}
        <div style={{ marginBottom: '15px' }}>
          <h4 onClick={() => setShowActivityLog(!showActivityLog)} style={sectionHeadingStyle}>
            <span>Activity Log ({instance.activityLog?.length || 0})</span><span>{showActivityLog ? '▼' : '▶'}</span>
          </h4>
          {showActivityLog && (<div style={{ paddingTop: '10px', maxHeight: '250px', overflowY: 'auto', fontSize: '0.85em', borderTop: '1px solid var(--border-color-soft, #f0f0f0)', marginTop:'-10px', padding:'10px', backgroundColor:'var(--surface-color-secondary, #f9f9f9)', borderRadius:'4px' }}>
            {instance.activityLog && instance.activityLog.length > 0 ? (
              instance.activityLog.map(log => (
                <div key={log.timestamp + log.action + log.details} style={{ marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px dotted var(--border-color, #ddd)' }}>
                  <p style={{ margin: '0 0 2px 0' }}><strong style={{fontSize:'0.9em'}}>{new Date(log.timestamp).toLocaleString()}</strong> - {log.userName || log.userId}</p>
                  <p style={{ margin: '0 0 2px 10px' }}><em>{log.action}</em>{log.details ? `: ${log.details}` : ''}</p>
                </div>
              ))
            ) : (<p><em>No activity recorded yet.</em></p>)}
          </div>)}
        </div>

        <div style={{ textAlign: 'right', marginTop: '30px', paddingTop: '15px', borderTop: '1px solid var(--border-color, #eee)' }}>
          <button onClick={onClose} className="button-secondary" style={{padding: '8px 15px'}}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default InstanceDetailModal;
