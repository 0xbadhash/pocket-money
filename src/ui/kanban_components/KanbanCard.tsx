/**
 * @file KanbanCard.tsx
 * Represents a single chore card within a Kanban column.
 */
import React, { useState, useEffect, useRef } from 'react';
import type { ChoreInstance, ChoreDefinition, KanbanColumnConfig } from '../../types'; // Added KanbanColumnConfig
import { useChoresContext } from '../../contexts/ChoresContext';
import { useUserContext } from '../../contexts/UserContext';
import { useNotification } from '../../contexts/NotificationContext';
import EditScopeModal from './EditScopeModal';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getTodayDateString } from '../../utils/dateUtils'; // For overdue calculation

interface KanbanCardProps {
  instance: ChoreInstance;
  definition: ChoreDefinition;
  isOverlay?: boolean;
  onEditChore?: (chore: ChoreDefinition) => void;
  isSelected?: boolean;
  onToggleSelection?: (instanceId: string, isSelected: boolean) => void;
  onCardClick?: (instance: ChoreInstance, definition: ChoreDefinition) => void; // Added prop
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  instance,
  definition,
  isOverlay = false,
  onEditChore,
  isSelected = false,
  onToggleSelection,
  onCardClick, // Destructured prop
}) => {
  const {
    toggleChoreInstanceComplete,
    toggleSubtaskCompletionOnInstance,
    updateChoreDefinition,
    updateChoreInstanceField,
    updateChoreSeries,
    addCommentToInstance,
    toggleSkipInstance,
  } = useChoresContext();
  const { user, getKanbanColumnConfigs } = useUserContext(); // Added getKanbanColumnConfigs
  const { addNotification } = useNotification();

  const [isEditingReward, setIsEditingReward] = useState(false);
  const [editingRewardValue, setEditingRewardValue] = useState<string | number>('');
  const rewardInputRef = useRef<HTMLInputElement>(null);

  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editingDateValue, setEditingDateValue] = useState<string>('');
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [editingPriorityValue, setEditingPriorityValue] = useState<'Low' | 'Medium' | 'High' | ''>('');

  const [newCommentText, setNewCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);

  const [isEditingTags, setIsEditingTags] = useState(false);
  const [editingTagsValue, setEditingTagsValue] = useState('');

  const [loadingStates, setLoadingStates] = useState({
    title: false,
    tags: false,
    reward: false,
    date: false,
  });

  const [isEditScopeModalVisible, setIsEditScopeModalVisible] = useState(false);
  const closeEditScopeModal = () => {
    setIsEditScopeModalVisible(false);
    setPendingEdit(undefined);
  };
  const [pendingEdit, setPendingEdit] = useState<{
    fieldName: 'instanceDate' | 'rewardAmount' | 'priority',
    value: any,
    definitionId: string,
    instanceId: string,
    fromDateForSeries: string
  } | undefined>(undefined);

  const handleConfirmEditScope = async (scope: 'instance' | 'series') => {
    if (!pendingEdit) return;
    const { fieldName, value, definitionId, instanceId, fromDateForSeries } = pendingEdit;
    if (scope === 'instance') {
      await updateChoreInstanceField(instanceId, fieldName, value);
    } else if (scope === 'series') {
      if (fieldName === 'rewardAmount' || fieldName === 'priority') {
        await updateChoreInstanceField(instanceId, fieldName, undefined); // Clear instance override
      }
      await updateChoreSeries(definitionId, { [fieldName]: value } as any, fromDateForSeries, fieldName as any);
    }
    closeEditScopeModal();
  };

  useEffect(() => { if (isEditingReward && rewardInputRef.current) rewardInputRef.current.focus(); }, [isEditingReward]);
  useEffect(() => { if (isEditingDate && dateInputRef.current) dateInputRef.current.focus(); }, [isEditingDate]);
  useEffect(() => { if (isEditingTitle && titleInputRef.current) titleInputRef.current.focus(); }, [isEditingTitle]);

  const handleEditReward = () => {
    setEditingRewardValue((instance.overriddenRewardAmount ?? definition.rewardAmount)?.toString() || '0');
    setIsEditingReward(true);
  };
  const handleSaveReward = async () => { /* ... (implementation from previous subtasks) ... */
    setIsEditingReward(false);
    const newAmount = parseFloat(editingRewardValue as string);
    if (isNaN(newAmount) || newAmount < 0) return;
    const currentEffectiveReward = instance.overriddenRewardAmount ?? definition.rewardAmount;
    if (currentEffectiveReward === newAmount) return;
    if (definition.recurrenceType) {
      setPendingEdit({ fieldName: 'rewardAmount', value: newAmount, definitionId: definition.id, instanceId: instance.id, fromDateForSeries: instance.instanceDate });
      setIsEditScopeModalVisible(true);
    } else {
      await updateChoreDefinition(definition.id, { rewardAmount: newAmount }); // For non-recurring, update definition
    }
  };

  const handleEditTitle = () => { setEditingTitleValue(definition.title); setIsEditingTitle(true); };
  const handleSaveTitle = async () => { /* ... (implementation from previous subtasks) ... */
    const newTitle = editingTitleValue.trim();
    setLoadingStates(prev => ({ ...prev, title: true }));
    setIsEditingTitle(false);
    if (newTitle && newTitle !== definition.title) {
      try {
        await updateChoreDefinition(definition.id, { title: newTitle });
        addNotification({ message: 'Title updated!', type: 'success' });
      } catch (e) { addNotification({ message: 'Failed to update title.', type: 'error' }); }
      finally { setLoadingStates(prev => ({ ...prev, title: false }));}
    }
  };
  const handleTitleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleSaveTitle(); else if (e.key === 'Escape') setIsEditingTitle(false); };
  const handleRewardInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleSaveReward(); else if (e.key === 'Escape') setIsEditingReward(false); };

  const handleEditDate = () => { setEditingDateValue(instance.instanceDate); setIsEditingDate(true); };
  const handleSaveDate = async () => { /* ... (implementation from previous subtasks) ... */
    setIsEditingDate(false);
    if (!editingDateValue || instance.instanceDate === editingDateValue) return;
    if (definition.recurrenceType) {
      setPendingEdit({ fieldName: 'instanceDate', value: editingDateValue, definitionId: definition.id, instanceId: instance.id, fromDateForSeries: instance.instanceDate });
      setIsEditScopeModalVisible(true);
    } else {
      await updateChoreInstanceField(instance.id, 'instanceDate', editingDateValue);
    }
  };
  const handleDateInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleSaveDate(); else if (e.key === 'Escape') setIsEditingDate(false); };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: instance.id, disabled: instance.isSkipped });

  const todayString = getTodayDateString();
  let isOverdue = false;
  if (definition.assignedKidId && instance.categoryStatus) {
    const kidKanbanColumns = getKanbanColumnConfigs(definition.assignedKidId);
    const currentColumnConfig = kidKanbanColumns.find(col => col.id === instance.categoryStatus);
    isOverdue = instance.instanceDate < todayString && !instance.isComplete && !instance.isSkipped && !(currentColumnConfig?.isCompletedColumn);
  } else if (instance.categoryStatus === "" && !instance.isComplete && !instance.isSkipped) {
    isOverdue = instance.instanceDate < todayString;
  }

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: (isDragging && !isOverlay) || instance.isSkipped ? 0.4 : 1 };
  const formatRecurrenceInfoShort = (def: ChoreDefinition): string | null => { /* ... (implementation from previous subtasks) ... */
    if (!def.recurrenceType) return null;
    let info = `Repeats ${def.recurrenceType}`;
    if (def.recurrenceEndDate) info += ` until ${new Date(def.recurrenceEndDate).toISOString().split('T')[0]}`;
    return info;
  };
  const recurrenceInfo = formatRecurrenceInfoShort(definition);
  const effectivePriority = instance.priority || definition.priority;
  const assignedKid = definition.assignedKidId && user?.kids ? user.kids.find(k => k.id === definition.assignedKidId) : undefined;
  const [showMenu, setShowMenu] = useState(false);
  useEffect(() => { /* ... (menu closing logic from previous subtasks) ... */
      if (!showMenu) return;
      function handleClick(e: MouseEvent) {
        const menuEl = document.getElementById(`quick-action-menu-${instance.id}`);
        if (menuEl && !menuEl.contains(e.target as Node)) setShowMenu(false);
      }
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu, instance.id]);

  const handleEditPriority = () => { setEditingPriorityValue(effectivePriority || ''); setIsEditingPriority(true); };
  const handleSavePriority = async () => { /* ... (implementation from previous subtasks, including series edit) ... */
    setIsEditingPriority(false);
    const newPriority = editingPriorityValue || undefined;
    if (newPriority === effectivePriority) return;
    if (definition.recurrenceType) {
      setPendingEdit({ fieldName: 'priority', value: newPriority, definitionId: definition.id, instanceId: instance.id, fromDateForSeries: instance.instanceDate });
      setIsEditScopeModalVisible(true);
    } else {
      await updateChoreInstanceField(instance.id, 'priority', newPriority);
      addNotification({ message: 'Priority updated!', type: 'success' });
    }
  };
  const handlePrioritySelectKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => { if (e.key === 'Enter' || e.key === 'Escape') { handleSavePriority(); (e.target as HTMLSelectElement).blur(); } };

  const handleAddComment = async () => { /* ... (implementation from previous subtasks) ... */
    if (!newCommentText.trim()) return;
    await addCommentToInstance(instance.id, newCommentText.trim(), user?.id || 'system_user', user?.username || 'System');
    setNewCommentText('');
    addNotification({ message: 'Comment added!', type: 'success' });
  };

  const getPriorityStyle = (priorityVal?: 'Low' | 'Medium' | 'High') => { /* ... (implementation from previous subtasks) ... */
    switch (priorityVal) {
      case 'High': return { color: 'red', fontWeight: 'bold' };
      case 'Medium': return { color: 'orange' };
      case 'Low': return { color: 'green' };
      default: return {};
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(instance.isSkipped ? {} : listeners)}
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        if (instance.isSkipped) return;
        const target = e.target as HTMLElement;
        const interactiveSelectors = ['button', 'input', 'select', 'textarea', '.edit-icon-button', '[aria-label*="action"]', '[role="button"]', '.button-link'];
        if (interactiveSelectors.some(selector => target.closest(selector))) {
          return;
        }
        if (onCardClick) {
          onCardClick(instance, definition);
        }
      }}
      className={`kanban-card ${instance.isComplete ? 'complete' : ''} ${instance.isSkipped ? 'skipped' : ''} ${isOverdue ? 'kanban-card-overdue' : ''} ${isDragging && !isOverlay ? 'dragging' : ''} ${isOverlay ? 'is-overlay' : ''} ${isSelected ? 'selected' : ''}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {isEditingTitle ? ( <input ref={titleInputRef} type="text" value={editingTitleValue} onChange={(e) => setEditingTitleValue(e.target.value)} onBlur={handleSaveTitle} onKeyDown={handleTitleInputKeyDown} style={{ flexGrow: 1, marginRight: '8px' }} disabled={loadingStates.title} onClick={(e) => e.stopPropagation()} /> ) : (
          <>
            <h4 style={{ margin: 0, flexGrow: 1, cursor: (loadingStates.title || instance.isSkipped) ? 'default' : 'text', textDecoration: instance.isSkipped && !instance.isComplete ? 'line-through' : 'none' }} onClick={(e) => {if (!loadingStates.title && !instance.isSkipped) { e.stopPropagation(); handleEditTitle(); }}}>
              {definition.title} {instance.isSkipped && <span style={{fontSize: '0.8em', color: 'grey'}}>(Skipped)</span>}
            </h4>
            {loadingStates.title && <span style={{fontSize: '0.8em'}}>Saving...</span>}
            {!isEditingTitle && !loadingStates.title && !instance.isSkipped && (<button onClick={(e) => { e.stopPropagation(); handleEditTitle();}} className="edit-icon-button">✏️</button>)}
          </>
        )}
        {!isOverlay && typeof onToggleSelection === 'function' && !isEditingTitle && !instance.isSkipped && (<input type="checkbox" checked={isSelected} onChange={(e) => { e.stopPropagation(); onToggleSelection(instance.id, e.target.checked); }} onClick={(e) => e.stopPropagation()} style={{ marginLeft: '8px' }} disabled={instance.isSkipped} /> )}
      </div>

      {definition.subTasks && definition.subTasks.length > 0 && ( /* Progress Bar */
        <div style={{ margin: '8px 0' }}><div style={{ backgroundColor: '#e9ecef', borderRadius: '4px', padding: '2px', height: '12px' }}>
          <div style={{ width: `${(definition.subTasks.filter(st => !!instance.subtaskCompletions?.[st.id]).length / definition.subTasks.length) * 100}%`, height: '100%', backgroundColor: '#28a745', borderRadius: '2px' }} />
        </div></div>
      )}

      {definition.description && <p style={{ fontSize: '0.9em' }}>{definition.description}</p>}
      {assignedKid && <div style={{fontSize: '0.9em'}}><strong>Assigned to:</strong> {assignedKid.name}</div>}

      <div style={{ fontSize: '0.9em', display: 'flex', gap: '5px', alignItems: 'center', marginTop: '4px' }}> {/* Priority */}
        <span>Priority:</span>
        {isEditingPriority ? (<select value={editingPriorityValue} onChange={(e) => setEditingPriorityValue(e.target.value as any)} onBlur={handleSavePriority} onKeyDown={handlePrioritySelectKeyDown} autoFocus disabled={instance.isSkipped} onClick={(e) => e.stopPropagation()}><option value="">Default</option><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select>) : (<><span style={getPriorityStyle(effectivePriority)}>{effectivePriority || 'Default'}</span>{!instance.isSkipped && <button onClick={(e) => { e.stopPropagation(); handleEditPriority();}} className="edit-icon-button">✏️</button>}</>)}
      </div>
      <div style={{ fontSize: '0.9em', display: 'flex', gap: '5px', alignItems: 'center', marginTop: '4px' }}> {/* Due Date */}
        <span>Due:</span>
        {isEditingDate ? (<input ref={dateInputRef} type="date" value={editingDateValue} onChange={(e) => setEditingDateValue(e.target.value)} onBlur={handleSaveDate} onKeyDown={handleDateInputKeyDown} disabled={instance.isSkipped} onClick={(e) => e.stopPropagation()} />) : (<><span>{instance.instanceDate}</span>{!instance.isSkipped && <button onClick={(e) => { e.stopPropagation(); handleEditDate();}} className="edit-icon-button">✏️</button>}</>)}
      </div>
      {definition.rewardAmount !== undefined && ( /* Reward */
        <div style={{ fontSize: '0.9em', display: 'flex', gap: '5px', alignItems: 'center' }}><span>Reward:</span>
        {isEditingReward ? (<input ref={rewardInputRef} type="number" value={editingRewardValue} onChange={(e) => setEditingRewardValue(e.target.value)} onBlur={handleSaveReward} onKeyDown={handleRewardInputKeyDown} min="0" step="0.01" disabled={instance.isSkipped} onClick={(e) => e.stopPropagation()} />) : (<>$ {(instance.overriddenRewardAmount ?? definition.rewardAmount)?.toFixed(2) || '0.00'}{instance.overriddenRewardAmount != null && <span style={{fontSize:'0.8em', color: 'grey'}}>(edited)</span>}{!instance.isSkipped && <button onClick={(e) => { e.stopPropagation(); handleEditReward();}} className="edit-icon-button">✏️</button>}</>)}
        </div>
      )}

      {/* Tags Display and Edit */}
      {isEditingTags && !instance.isSkipped ? (
        <div style={{ marginTop: '8px', marginBottom: '8px' }} onClick={(e) => e.stopPropagation()}>
          <input type="text" value={editingTagsValue} onChange={(e) => setEditingTagsValue(e.target.value)} placeholder="Tags, comma-separated" style={{width: 'calc(100% - 120px)'}} autoFocus />
          <button onClick={async (e) => { e.stopPropagation(); setLoadingStates(p=>({...p, tags:true})); await updateChoreDefinition(definition.id, { tags: editingTagsValue.split(',').map(t => t.trim()).filter(Boolean) }); addNotification({message:'Tags updated!', type:'success'}); setLoadingStates(p=>({...p, tags:false})); setIsEditingTags(false); }} className="button-primary" disabled={loadingStates.tags}>Save</button>
          <button onClick={(e) => { e.stopPropagation(); setIsEditingTags(false);}} className="button-secondary" disabled={loadingStates.tags}>Cancel</button>
        </div>
      ) : (
        (definition.tags && definition.tags.length > 0) || !instance.isSkipped ? (
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
            {definition.tags && definition.tags.length > 0 ? definition.tags.map(tag => (<span key={tag} className="chore-tag">{tag}</span>)) : <span style={{fontSize:'0.8em', color:'#777'}}>No tags.</span>}
            {!instance.isSkipped && <button onClick={(e) => { e.stopPropagation(); setEditingTagsValue(definition.tags?.join(', ') || ''); setIsEditingTags(true); }} className="edit-icon-button" aria-label="Edit tags">✏️</button>}
          </div>
        ) : null
      )}

      {definition.subTasks && definition.subTasks.length > 0 && ( /* Subtasks */
        <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '8px' }}>
          <h5 style={{fontSize:'0.9em', margin:'0 0 5px 0'}}>Sub-tasks:</h5>
          {definition.subTasks.map(st => (<div key={st.id} style={{display:'flex', alignItems:'center'}}><input type="checkbox" id={`st-${instance.id}-${st.id}`} checked={!!instance.subtaskCompletions?.[st.id]} onChange={(e) => {e.stopPropagation(); if(!instance.isSkipped) toggleSubtaskCompletionOnInstance(instance.id, st.id);}} disabled={instance.isSkipped} onClick={(e) => e.stopPropagation()} /><label htmlFor={`st-${instance.id}-${st.id}`} style={{textDecoration:instance.subtaskCompletions?.[st.id]?'line-through':'none', cursor: instance.isSkipped?'default':'pointer'}}>{st.title}</label></div>))}
        </div>
      )}

      {recurrenceInfo && <p style={{ fontStyle: 'italic', fontSize: '0.8em' }}>{recurrenceInfo}</p>}
      <p style={{ fontSize: '0.9em' }}>Status: {instance.isComplete ? 'Complete' : 'Incomplete'}</p>

      {/* User Comments Section */}
      <div style={{ marginTop: '10px', marginBottom: '10px' }}>
        <button onClick={(e) => {e.stopPropagation(); setShowComments(!showComments);}} className="button-link">
          {showComments ? 'Hide Comments' : 'View Comments'} ({instance.instanceComments?.length || 0})
        </button>
        {showComments && (
          <div className="comments-section" style={{ marginTop: '8px', borderTop: '1px solid var(--border-color, #eee)', paddingTop: '8px' }} onClick={(e)=>e.stopPropagation()}>
            <h5 style={{ fontSize: '0.9em', marginBottom: '5px', color: 'var(--text-color-secondary, #666)', marginTop: '0' }}>User Comments</h5>
            {instance.instanceComments && instance.instanceComments.length > 0 ? (
              instance.instanceComments.map(comment => (
                <div key={comment.id} className="comment-item" style={{ marginBottom: '4px', fontSize: '0.85em', borderBottom: '1px dotted #eee', paddingBottom: '4px' }}>
                  <span style={{fontWeight: 'bold'}}>{comment.userName}</span> <span style={{fontSize: '0.8em', color: '#777'}}>({new Date(comment.createdAt).toLocaleString()}):</span>
                  <p style={{margin: '2px 0 0 0', whiteSpace: 'pre-wrap'}}>{comment.text}</p>
                </div>
              ))
            ) : (<p style={{fontSize: '0.8em', color: '#777'}}>No comments yet.</p>)}
            <div className="add-comment-form" style={{ marginTop: '10px' }}>
              <textarea value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} placeholder="Add a comment..." rows={2} style={{ width: '100%', boxSizing: 'border-box', marginBottom: '4px' }} disabled={instance.isSkipped} onClick={(e) => e.stopPropagation()} />
              <button onClick={(e) => {e.stopPropagation(); handleAddComment();}} disabled={!newCommentText.trim() || instance.isSkipped} className="button-primary">Add Comment</button>
            </div>
          </div>
        )}
      </div>

      {/* Activity Log Section */}
      <div style={{ marginTop: '10px' }}>
        <button onClick={(e) => {e.stopPropagation(); setShowActivityLog(!showActivityLog);}} className="button-link">
          {showActivityLog ? 'Hide Activity' : 'View Activity'} ({instance.activityLog?.length || 0})
        </button>
        {showActivityLog && (
          <div className="activity-log-section" style={{ marginTop: '8px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #eee', padding: '8px', fontSize: '0.8em', backgroundColor: '#f9f9f9' }} onClick={(e)=>e.stopPropagation()}>
            <h5 style={{ fontSize: '0.9em', marginBottom: '5px', color: 'var(--text-color-secondary, #666)', marginTop: '0' }}>Activity Log</h5>
            {instance.activityLog && instance.activityLog.length > 0 ? (
              instance.activityLog.map(log => (
                <div key={log.timestamp + log.action + (log.details || '')} className="activity-log-entry" style={{ marginBottom: '4px', borderBottom: '1px dotted #ddd', paddingBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold' }}>{new Date(log.timestamp).toLocaleString()}</span> -
                  <span style={{ color: '#555', marginLeft: '4px' }}>{log.userName || log.userId || 'System'}</span>:
                  <span style={{ marginLeft: '4px', fontWeight: '500' }}>{log.action}</span>
                  {log.details && <span style={{ marginLeft: '4px', color: '#777' }}>({log.details})</span>}
                </div>
              ))
            ) : (<p style={{fontSize: '0.8em', color: '#777', marginTop: '4px'}}>No activity yet.</p>)}
          </div>
        )}
      </div>

      {!instance.isSkipped && (<button onClick={(e) => {e.stopPropagation(); toggleChoreInstanceComplete(instance.id);}} style={{ marginTop: '10px' }} className="button-secondary" disabled={instance.isSkipped}>{instance.isComplete ? 'Mark Incomplete' : 'Mark Complete'}</button>)}
      {instance.isSkipped ? (<button onClick={(e) => {e.stopPropagation(); toggleSkipInstance(instance.id);}} style={{ marginTop: '10px' }} className="button-tertiary">Unskip</button>) : (!instance.isComplete && <button onClick={(e) => {e.stopPropagation(); toggleSkipInstance(instance.id);}} style={{ marginTop: '10px', marginLeft: '8px' }} className="button-tertiary">Skip</button>)}
      {onEditChore && !instance.isSkipped && (<button type="button" onClick={e => { e.stopPropagation(); onEditChore(definition); }} style={{ marginTop: '10px', marginLeft: '8px' }} className="button-edit">Edit Chore Def</button>)}

      <div style={{ position: 'relative', display: 'inline-block', marginLeft: '8px' }}>
        <button aria-label="Quick actions" onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', padding: 0, color: '#888' }}>⋮</button>
        {showMenu && (
          <div id={`quick-action-menu-${instance.id}`} style={{position: 'absolute', top: 24, right: 0, background: '#fff', border: '1px solid #ccc', borderRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 100, minWidth: 120}} onClick={e => e.stopPropagation()}>
            <button style={{display:'block', width:'100%', background:'none', border:'none', padding:'8px 12px', textAlign:'left', cursor:'pointer'}} onClick={(e) => { e.stopPropagation(); setShowMenu(false); if (onEditChore && !instance.isSkipped) onEditChore(definition); }} disabled={instance.isSkipped}>Edit Chore Def</button>
          </div>
        )}
      </div>

      {isEditScopeModalVisible && pendingEdit && (<EditScopeModal isVisible={isEditScopeModalVisible} onClose={closeEditScopeModal} onConfirmScope={handleConfirmEditScope} fieldName={pendingEdit.fieldName} newValue={pendingEdit.value} /> )}
    </div>
  );
};

export default React.memo(KanbanCard);

const globalStyles = `
.edit-icon-button { background: none; border: none; cursor: pointer; padding: 0 4px; font-size: 0.9em; color: var(--text-color-secondary, #555); }
.edit-icon-button:hover { color: var(--text-color-primary, #000); }
.kanban-card-overdue { border-left-color: var(--status-color-overdue, #dc3545) !important; background-color: var(--surface-color-overdue, #ffebee) !important; }
.chore-tag { background-color: var(--primary-color-light, #e0e0e0); color: var(--text-color-primary, #333); padding: 2px 6px; border-radius: 3px; font-size: 0.8em; }
.button-link { background: none; border: none; color: var(--primary-color, #007bff); text-decoration: underline; cursor: pointer; padding: 0; font-size: 0.9em; }
`;
if (typeof window !== 'undefined' && !document.getElementById('kanban-card-dynamic-styles')) {
  const styleSheet = document.createElement("style");
  styleSheet.id = "kanban-card-dynamic-styles";
  styleSheet.innerText = globalStyles;
  document.head.appendChild(styleSheet);
}
