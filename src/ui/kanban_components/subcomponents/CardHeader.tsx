// src/ui/kanban_components/subcomponents/CardHeader.tsx
import React from 'react';

interface CardHeaderProps {
  title: string;
  isSkipped: boolean;
  isLoading: boolean;
  isEditing: boolean;
  editingValue: string;
  onEdit: () => void;
  onSave: () => void;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

/**
 * Renders the header section of a Kanban card with the chore title.
 * Supports inline editing mode.
 */
export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  isSkipped,
  isLoading,
  isEditing,
  editingValue,
  onEdit,
  onSave,
  onChange,
  onKeyDown,
  inputRef,
}) => {
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editingValue}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onSave}
        onKeyDown={onKeyDown}
        className="card-title-input"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <div className="card-header-content">
      <h4 
        className={`card-title ${isLoading || isSkipped ? 'disabled' : 'editable'}`}
        onClick={(e) => {
          if (!isLoading && !isSkipped) {
            e.stopPropagation();
            onEdit();
          }
        }}
      >
        {title}
        {isSkipped && <span className="skipped-indicator">(Skipped)</span>}
      </h4>
      {isLoading && <span className="saving-indicator">Saving...</span>}
      {!isEditing && !isLoading && !isSkipped && (
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="edit-icon-button"
          aria-label="Edit title"
        >
          ✏️
        </button>
      )}
    </div>
  );
};

export default CardHeader;
