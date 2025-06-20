import React, { useState, useEffect } from 'react';
import { ChoreInstance, ChoreDefinition, KanbanColumnConfig } from '../../types';
import { useUserContext } from '../../contexts/UserContext';
import { useChoresContext } from '../../contexts/ChoresContext';

interface InstanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  choreInstance: ChoreInstance | null;
  choreDefinition: ChoreDefinition | null;
}

const InstanceDetailModal: React.FC<InstanceDetailModalProps> = ({
  isOpen,
  onClose,
  choreInstance,
  choreDefinition,
}) => {
  const { user, getKanbanColumnConfigs } = useUserContext();
  const {
    updateChoreInstanceField,
    toggleSubtaskCompletionOnInstance,
    addCommentToInstance
  } = useChoresContext();

  const [editableDate, setEditableDate] = useState('');
  const [editablePriority, setEditablePriority] = useState<string | undefined>('');
  const [editableInstanceDescription, setEditableInstanceDescription] = useState('');
  const [saveFeedback, setSaveFeedback] = useState<Record<string, string>>({});
  const [isSubtasksOpen, setIsSubtasksOpen] = useState(true);
  const [isCommentsOpen, setIsCommentsOpen] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);

  useEffect(() => {
    if (isOpen && choreInstance) {
      setEditableDate(choreInstance.instanceDate);
      setEditablePriority(choreInstance.priority || 'default');
      setEditableInstanceDescription(choreInstance.instanceDescription || '');
      setNewCommentText('');
      setSaveFeedback({});
      // Default section states can be set here if desired, e.g.,
      // setIsSubtasksOpen(true);
      // setIsCommentsOpen(true);
      // setIsActivityLogOpen(false);
    }
  }, [isOpen, choreInstance]);

  if (!isOpen) {
    return null;
  }

  const handleSaveField = async (fieldName: keyof ChoreInstance, value: any) => {
    if (!choreInstance) return;
    try {
      await updateChoreInstanceField(choreInstance.id, fieldName, value);
      setSaveFeedback(prev => ({ ...prev, [fieldName]: 'Saved!' }));
      setTimeout(() => setSaveFeedback(prev => ({ ...prev, [fieldName]: '' })), 2000);
    } catch (error) {
      console.error("Failed to save field:", error);
      setSaveFeedback(prev => ({ ...prev, [fieldName]: 'Error saving.' }));
      setTimeout(() => setSaveFeedback(prev => ({ ...prev, [fieldName]: '' })), 2000);
    }
  };

  const handleAddComment = async () => {
    if (!choreInstance || !newCommentText.trim() || !user) return;
    try {
      await addCommentToInstance(choreInstance.id, newCommentText.trim(), user.id, user.username);
      setNewCommentText('');
      setSaveFeedback(prev => ({ ...prev, newComment: 'Comment posted!' }));
      setTimeout(() => setSaveFeedback(prev => ({ ...prev, newComment: '' })), 2000);
    } catch (error) {
      console.error("Failed to add comment:", error);
      setSaveFeedback(prev => ({ ...prev, newComment: 'Error posting.' }));
      setTimeout(() => setSaveFeedback(prev => ({ ...prev, newComment: '' })), 2000);
    }
  };

  const getAssignedKidName = (kidId?: string): string => {
    if (!kidId || !user || !user.kids) return 'N/A';
    const kid = user.kids.find(k => k.id === kidId);
    return kid ? kid.name : 'Unknown Kid';
  };

  const getStatusName = (statusId?: string, kidId?: string): string => {
    if (!statusId || !kidId) return 'N/A';
    const configs: KanbanColumnConfig[] = getKanbanColumnConfigs(kidId);
    const config = configs.find(c => c.id === statusId);
    return config ? config.title : 'Unknown Status';
  };

  // Consistent color palette (conceptual)
  const colors = {
    primary: '#007bff', // Blue
    success: '#28a745', // Green
    textPrimary: '#333',
    textSecondary: '#555',
    textMuted: '#777',
    borderLight: '#e0e0e0',
    borderDefault: '#ccc',
    backgroundLight: '#f9f9f9',
    white: '#fff',
    overlay: 'rgba(0, 0, 0, 0.5)',
  };

  // Base font family
  const baseFontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  const modalStyle: React.CSSProperties = {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    backgroundColor: colors.white, padding: '20px', borderRadius: '10px',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)', zIndex: 1000,
    width: '90%', maxWidth: '650px', // Slightly wider
    maxHeight: '85vh', overflowY: 'auto',
    fontFamily: baseFontFamily, lineHeight: '1.6'
  };
  const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.overlay, zIndex: 999
  };
  const headerStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    borderBottom: `1px solid ${colors.borderLight}`, paddingBottom: '12px', marginBottom: '20px'
  };
  const titleStyle: React.CSSProperties = {
    margin: 0, fontSize: '1.6em', fontWeight: 600, color: colors.textPrimary
  };
  const closeButtonStyle: React.CSSProperties = {
    background: 'transparent', border: 'none', fontSize: '1.8em',
    cursor: 'pointer', color: colors.textMuted, padding: '0 5px'
  };
  const sectionStyle: React.CSSProperties = {
    marginBottom: '25px'
  };
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '1.1em', fontWeight: 600, color: colors.textSecondary,
    marginBottom: '12px', borderBottom: `1px solid ${colors.borderLight}`,
    paddingBottom: '8px'
  };
  const detailItemStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', padding: '10px 0', // Increased padding
    fontSize: '0.9rem', alignItems: 'center', borderBottom: `1px solid ${colors.borderLight}` // Add subtle separator
  };
  const detailItemStyleNoBorder: React.CSSProperties = { // For last items or items with inputs
    display: 'flex', justifyContent: 'space-between', padding: '10px 0',
    fontSize: '0.9rem', alignItems: 'center'
  };
  const detailLabelStyle: React.CSSProperties = {
    fontWeight: 500, color: colors.textPrimary, marginRight: '15px', minWidth: '140px'
  };
  const detailValueStyle: React.CSSProperties = {
    color: colors.textSecondary, textAlign: 'left', flexGrow: 1, wordBreak: 'break-word'
  };

  const inputBaseStyle: React.CSSProperties = {
    padding: '10px', border: `1px solid ${colors.borderDefault}`, borderRadius: '5px',
    fontSize: '0.9rem', width: '100%', boxSizing: 'border-box',
    backgroundColor: colors.white, // Changed from backgroundLight for better contrast with potential page bg
    color: colors.textPrimary,
  }
  const inputStyle: React.CSSProperties = { ...inputBaseStyle };
  const textareaStyle: React.CSSProperties = { ...inputBaseStyle, minHeight: '80px', resize: 'vertical', lineHeight: '1.5' };

  const buttonBaseStyle: React.CSSProperties = {
    padding: '8px 12px', fontSize: '0.9rem', border: 'none',
    borderRadius: '5px', cursor: 'pointer', fontWeight: 500,
    transition: 'background-color 0.2s ease',
  }
  const saveButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle, marginLeft: '10px',
    backgroundColor: colors.success, color: colors.white
  };
  const addCommentButtonStyle: React.CSSProperties = {
    ...buttonBaseStyle, alignSelf: 'flex-end',
    backgroundColor: colors.primary, color: colors.white
  };
  const feedbackStyle: React.CSSProperties = {
    marginLeft: '10px', fontSize: '0.8rem', fontStyle: 'italic', color: colors.success
  };
   const errorFeedbackStyle: React.CSSProperties = {
    ...feedbackStyle, color: '#dc3545' // Red for error
   };

  const tagStyle: React.CSSProperties = {
    backgroundColor: colors.borderLight, color: colors.textSecondary, padding: '4px 8px',
    borderRadius: '4px', marginRight: '6px', fontSize: '0.8rem',
    display: 'inline-block', marginBottom: '6px'
  };

  const collapsibleSectionHeaderStyle: React.CSSProperties = {
    ...sectionTitleStyle, display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', cursor: 'pointer', padding: '8px 0'
  };
  const subtaskProgressBarStyle: React.CSSProperties = {
    height: '12px', backgroundColor: colors.borderLight, borderRadius: '6px', margin: '12px 0'
  };
  const subtaskProgressBarInnerStyle: (percent: number) => React.CSSProperties = (percent) => ({
    height: '100%', width: `${percent}%`, backgroundColor: colors.success,
    borderRadius: '6px', transition: 'width 0.3s ease-in-out'
  });
  const subtaskItemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', padding: '6px 0', fontSize: '0.9rem',
    borderBottom: `1px solid ${colors.borderLight}`
  };
   const subtaskItemStyleLast: React.CSSProperties = { ...subtaskItemStyle, borderBottom: 'none' };

  const subtaskCheckboxStyle: React.CSSProperties = { marginRight: '12px', transform: 'scale(1.1)' };
  const subtaskTitleStyle: (completed: boolean) => React.CSSProperties = (completed) => ({
    textDecoration: completed ? 'line-through' : 'none',
    color: completed ? colors.textMuted : colors.textPrimary,
    cursor: 'pointer'
  });

  const listContainerStyle: React.CSSProperties = {
    paddingLeft: 0, margin: '10px 0 0 0', maxHeight: '180px', overflowY: 'auto',
    border: `1px solid ${colors.borderLight}`, borderRadius: '5px', padding: '10px'
  }

  const commentItemStyle: React.CSSProperties = {
    borderBottom: `1px solid ${colors.borderLight}`, padding: '10px 0',
    fontSize: '0.9rem', listStyleType: 'none'
  };
   const commentItemStyleLast: React.CSSProperties = { ...commentItemStyle, borderBottom: 'none' };
  const commentAuthorStyle: React.CSSProperties = { fontWeight: 600, color: colors.primary, marginRight: '8px' };
  const commentTimestampStyle: React.CSSProperties = { fontSize: '0.75rem', color: colors.textMuted };
  const commentTextStyle: React.CSSProperties = { marginTop: '5px', lineHeight: '1.5', color: colors.textSecondary, whiteSpace: 'pre-wrap' };
  const addCommentFormStyle: React.CSSProperties = { marginTop: '20px', display: 'flex', flexDirection: 'column' };
  const addCommentTextAreaStyle: React.CSSProperties = { ...textareaStyle, minHeight: '70px', marginBottom: '10px' };

  const activityLogItemStyle: React.CSSProperties = {
    borderBottom: `1px solid ${colors.borderLight}`, padding: '8px 0',
    fontSize: '0.8rem', listStyleType: 'none', display: 'flex', flexWrap: 'wrap'
  };
  const activityLogItemStyleLast: React.CSSProperties = { ...activityLogItemStyle, borderBottom: 'none' };
  const activityLogTimestampStyle: React.CSSProperties = { color: colors.textMuted, minWidth: '135px', marginRight: '10px', display: 'inline-block', flexShrink: 0 };
  const activityLogUserStyle: React.CSSProperties = { fontWeight: 'bold', color: colors.textPrimary, marginRight: '5px' };
  const activityLogActionStyle: React.CSSProperties = { color: colors.textSecondary, marginRight: '5px' };
  const activityLogDetailsStyle: React.CSSProperties = { color: colors.textMuted, fontStyle: 'italic', marginLeft: '5px' };


  if (!choreInstance || !choreDefinition) {
    return ( <div style={overlayStyle} onClick={onClose}><div style={modalStyle}><div style={headerStyle}><h2 style={titleStyle}>Chore Details</h2><button onClick={onClose} style={closeButtonStyle}>&times;</button></div><p>Chore data not available.</p></div></div> );
  }

  const effectivePriority = choreInstance.priority || choreDefinition.priority || 'N/A';
  const definitionSubtasks = choreDefinition.subTasks || [];
  const completedSubtasksCount = definitionSubtasks.filter(st => choreInstance.subtaskCompletions?.[st.id]).length;
  const totalSubtasksCount = definitionSubtasks.length;
  const subtaskProgressPercent = totalSubtasksCount > 0 ? (completedSubtasksCount / totalSubtasksCount) * 100 : 0;

  const instanceComments = choreInstance.instanceComments || [];
  const sortedComments = [...instanceComments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const activityLog = choreInstance.activityLog || [];
  const sortedActivityLog = [...activityLog].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());


  return (
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>{choreDefinition.title || 'Chore Details'}</h2>
          <button onClick={onClose} style={closeButtonStyle}>&times;</button>
        </div>

        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Definition Details</h3>
          {choreDefinition.description && (
            <div style={detailItemStyle}><span style={detailLabelStyle}>Description:</span><span style={detailValueStyle}>{choreDefinition.description}</span></div>
          )}
          <div style={detailItemStyle}><span style={detailLabelStyle}>Assigned To:</span><span style={detailValueStyle}>{getAssignedKidName(choreDefinition.assignedKidId)}</span></div>
          {choreDefinition.tags && choreDefinition.tags.length > 0 && (
            <div style={{ ...detailItemStyleNoBorder, flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={detailLabelStyle}>Tags:</span>
              <div style={{marginTop: '5px'}}>{choreDefinition.tags.map(tag => <span key={tag} style={tagStyle}>{tag}</span>)}</div>
            </div>
          )}
        </div>

        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Instance Details (Editable)</h3>
          <div style={detailItemStyleNoBorder}>
            <span style={detailLabelStyle}>Date:</span>
            <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              <input type="date" value={editableDate} onChange={(e) => setEditableDate(e.target.value)} style={inputStyle} />
              <button onClick={() => handleSaveField('instanceDate', editableDate)} style={saveButtonStyle}>Save</button>
              {saveFeedback['instanceDate'] && <span style={saveFeedback['instanceDate'] === 'Saved!' ? feedbackStyle : errorFeedbackStyle}>{saveFeedback['instanceDate']}</span>}
            </div>
          </div>
          <div style={detailItemStyleNoBorder}>
            <span style={detailLabelStyle}>Priority:</span>
            <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              <select value={editablePriority} onChange={(e) => setEditablePriority(e.target.value)} style={inputStyle}>
                <option value="default">Default ({choreDefinition.priority || 'N/A'})</option>
                <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
              </select>
              <button onClick={() => handleSaveField('priority', editablePriority === 'default' ? undefined : editablePriority)} style={saveButtonStyle}>Save</option>
              {saveFeedback['priority'] && <span style={saveFeedback['priority'] === 'Saved!' ? feedbackStyle : errorFeedbackStyle}>{saveFeedback['priority']}</span>}
            </div>
          </div>
          <div style={{ ...detailItemStyleNoBorder, flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={detailLabelStyle}>Instance-Specific Description:</span>
            <div style={{ width: '100%', marginTop: '5px'}}>
              <textarea value={editableInstanceDescription} onChange={(e) => setEditableInstanceDescription(e.target.value)} placeholder="Add a specific note or description for this instance..." style={textareaStyle} />
              <div style={{textAlign: 'right', marginTop: '8px'}}>
                 <button onClick={() => handleSaveField('instanceDescription', editableInstanceDescription)} style={{...saveButtonStyle}}>Save Description</button>
                 {saveFeedback['instanceDescription'] && <span style={saveFeedback['instanceDescription'] === 'Saved!' ? feedbackStyle : errorFeedbackStyle}>{saveFeedback['instanceDescription']}</span>}
              </div>
            </div>
          </div>
          <div style={detailItemStyle}><span style={detailLabelStyle}>Status (Current):</span><span style={detailValueStyle}>{getStatusName(choreInstance.categoryStatus, choreDefinition.assignedKidId)}</span></div>
          <div style={detailItemStyle}><span style={detailLabelStyle}>Completed:</span><span style={detailValueStyle}>{choreInstance.isComplete ? 'Yes' : 'No'}</span></div>
          <div style={detailItemStyle}><span style={detailLabelStyle}>Skipped:</span><span style={detailValueStyle}>{choreInstance.isSkipped ? 'Yes' : 'No'}</span></div>
          <div style={{...detailItemStyle, borderBottom: 'none'}}><span style={detailLabelStyle}>Definition Priority:</span><span style={detailValueStyle}>{choreDefinition.priority || 'N/A'}</span></div>
        </div>

        <div style={sectionStyle}>
          <h3 style={collapsibleSectionHeaderStyle} onClick={() => setIsSubtasksOpen(!isSubtasksOpen)}>
            <span>Subtasks ({completedSubtasksCount}/{totalSubtasksCount})</span>
            <span>{isSubtasksOpen ? '▼' : '▶'}</span>
          </h3>
          {isSubtasksOpen && (
            <>
              {totalSubtasksCount > 0 ? (
                <div style={listContainerStyle}> {/* Added container for scroll + border */}
                  <div style={subtaskProgressBarStyle}><div style={subtaskProgressBarInnerStyle(subtaskProgressPercent)} /></div>
                  {definitionSubtasks.map((subtask, index) => (
                    <div key={subtask.id} style={index === totalSubtasksCount - 1 ? subtaskItemStyleLast : subtaskItemStyle}>
                      <input type="checkbox" id={`subtask-${choreInstance.id}-${subtask.id}`} checked={!!choreInstance.subtaskCompletions?.[subtask.id]} onChange={() => toggleSubtaskCompletionOnInstance(choreInstance.id, subtask.id)} style={subtaskCheckboxStyle} disabled={choreInstance.isSkipped || choreInstance.isComplete} />
                      <label htmlFor={`subtask-${choreInstance.id}-${subtask.id}`} style={subtaskTitleStyle(!!choreInstance.subtaskCompletions?.[subtask.id])}>{subtask.title}</label>
                    </div>
                  ))}
                </div>
              ) : <p style={{ fontSize: '0.9em', color: colors.textMuted, textAlign: 'center', marginTop: '10px' }}>No subtasks for this chore.</p>}
            </>
          )}
        </div>

        <div style={sectionStyle}>
          <h3 style={collapsibleSectionHeaderStyle} onClick={() => setIsCommentsOpen(!isCommentsOpen)}>
            <span>User Comments ({sortedComments.length})</span>
            <span>{isCommentsOpen ? '▼' : '▶'}</span>
          </h3>
          {isCommentsOpen && (
            <>
              {sortedComments.length > 0 ? (
                <ul style={listContainerStyle}>
                  {sortedComments.map((comment, index) => (
                    <li key={comment.id} style={index === sortedComments.length - 1 ? commentItemStyleLast : commentItemStyle}>
                      <div>
                        <span style={commentAuthorStyle}>{comment.userName}</span>
                        <span style={commentTimestampStyle}>({new Date(comment.createdAt).toLocaleString()})</span>
                      </div>
                      <p style={commentTextStyle}>{comment.text}</p>
                    </li>
                  ))}
                </ul>
              ) : <p style={{ fontSize: '0.9em', color: colors.textMuted, textAlign: 'center', marginTop: '10px' }}>No comments yet.</p>}

              <div style={addCommentFormStyle}>
                <textarea value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} placeholder="Add a comment..." style={addCommentTextAreaStyle} disabled={!user} />
                <button onClick={handleAddComment} style={addCommentButtonStyle} disabled={!newCommentText.trim() || !user}>Add Comment</button>
                {saveFeedback['newComment'] && <span style={saveFeedback['newComment'] === 'Comment posted!' ? feedbackStyle : errorFeedbackStyle}>{saveFeedback['newComment']}</span>}
              </div>
            </>
          )}
        </div>

        <div style={sectionStyle}>
          <h3 style={collapsibleSectionHeaderStyle} onClick={() => setIsActivityLogOpen(!isActivityLogOpen)}>
            <span>Activity Log ({sortedActivityLog.length})</span>
            <span>{isActivityLogOpen ? '▼' : '▶'}</span>
          </h3>
          {isActivityLogOpen && (
            <>
              {sortedActivityLog.length > 0 ? (
                <ul style={listContainerStyle}>
                  {sortedActivityLog.map((logEntry, index) => (
                    <li key={`${logEntry.timestamp}-${index}-${logEntry.action}`} style={index === sortedActivityLog.length - 1 ? activityLogItemStyleLast : activityLogItemStyle}>
                      <span style={activityLogTimestampStyle}>{new Date(logEntry.timestamp).toLocaleString()}</span>
                      <div>
                        <span style={activityLogUserStyle}>{logEntry.userName || 'System'}</span>
                        <span style={activityLogActionStyle}>{logEntry.action}</span>
                        {logEntry.details && (<span style={activityLogDetailsStyle}>({logEntry.details})</span>)}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p style={{ fontSize: '0.9em', color: colors.textMuted, textAlign: 'center', marginTop: '10px' }}>No activities logged yet.</p>}
            </>
          )}
        </div>

      </div>
    </>
  );
};

export default InstanceDetailModal;
