import React from 'react';

interface BatchActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onOpenCategoryModal: () => void;
  onOpenKidAssignmentModal: () => void;
  onMarkComplete: () => void;
  onMarkIncomplete: () => void;
  onSelectAllByCategory: (category: 'TO_DO' | 'IN_PROGRESS' | 'COMPLETED') => void; // New prop
}

// Basic styling for the batch actions toolbar (can be moved to a CSS file)
const toolbarStyle: React.CSSProperties = {
  padding: '10px',
  margin: '10px 0',
  backgroundColor: '#f0f0f0',
  border: '1px solid #ccc',
  borderRadius: '4px',
  display: 'flex',
  gap: '10px',
  alignItems: 'center',
  flexWrap: 'wrap', // Allow wrapping on smaller screens
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #bbb',
  borderRadius: '4px',
  cursor: 'pointer',
  backgroundColor: '#fff', // Default background for buttons
};


const BatchActionsToolbar: React.FC<BatchActionsToolbarProps> = ({
  selectedCount,
  onClearSelection,
  onOpenCategoryModal,
  onOpenKidAssignmentModal,
  onMarkComplete,
  onMarkIncomplete,
  onSelectAllByCategory,
}) => {
  const [isCategorySelectOpen, setIsCategorySelectOpen] = React.useState(false);
  const dropdownButtonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = React.useRef<HTMLDivElement>(null);
  const categoryButtonRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  React.useEffect(() => {
    categoryButtonRefs.current = categoryButtonRefs.current.slice(0, 3); // 3 categories
  }, []);


  React.useEffect(() => {
    if (isCategorySelectOpen && categoryButtonRefs.current[0]) {
      categoryButtonRefs.current[0]?.focus();
    }
  }, [isCategorySelectOpen]);

  const handleDropdownKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      setIsCategorySelectOpen(false);
      dropdownButtonRef.current?.focus();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const focusableItems = categoryButtonRefs.current.filter(Boolean) as HTMLButtonElement[];
      const activeIndex = focusableItems.findIndex(item => item === document.activeElement);

      let nextIndex = activeIndex;
      if (event.key === 'ArrowDown') {
        nextIndex = activeIndex === focusableItems.length - 1 ? 0 : activeIndex + 1;
      } else if (event.key === 'ArrowUp') {
        nextIndex = activeIndex === 0 ? focusableItems.length - 1 : activeIndex - 1;
      }
      focusableItems[nextIndex]?.focus();
    }
  };


  const handleSelectCategory = (category: 'TO_DO' | 'IN_PROGRESS' | 'COMPLETED') => {
    onSelectAllByCategory(category);
    setIsCategorySelectOpen(false);
  };

  // Style for the dropdown container
  const dropdownContainerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    marginLeft: '10px', // Add some space from other elements
  };

  // Style for the dropdown content
  const dropdownContentStyle: React.CSSProperties = {
    display: isCategorySelectOpen ? 'block' : 'none',
    position: 'absolute',
    backgroundColor: '#f9f9f9',
    minWidth: '160px',
    boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)',
    zIndex: 1,
    borderRadius: '4px', // Consistent with other button styles
    padding: '5px 0', // Add some padding
  };

  const dropdownButtonStyle: React.CSSProperties = {
    ...buttonStyle, // Inherit base button style
    width: '100%', // Make buttons take full width of dropdown
    textAlign: 'left', // Align text to the left
    padding: '8px 12px', // Consistent padding
    border: 'none', // Remove border for dropdown items
    backgroundColor: 'transparent', // Transparent background
  };


  return (
    <div style={toolbarStyle} role="toolbar" aria-label="Batch actions">
      <div style={dropdownContainerStyle}>
        <button
          ref={dropdownButtonRef}
          id="select-by-category-button"
          style={buttonStyle}
          onClick={() => setIsCategorySelectOpen(!isCategorySelectOpen)}
          aria-haspopup="menu" // Changed from "true"
          aria-expanded={isCategorySelectOpen}
          aria-controls="select-by-category-menu" // Added aria-controls
        >
          Select by Category ▼
        </button>
        <div
          ref={dropdownMenuRef}
          id="select-by-category-menu"
          role="menu" // Added role
          aria-labelledby="select-by-category-button" // Added aria-labelledby
          style={dropdownContentStyle}
          onKeyDown={handleDropdownKeyDown} // Handle keyboard navigation within menu
        >
          <button
            ref={el => categoryButtonRefs.current[0] = el}
            role="menuitem" // Added role
            style={dropdownButtonStyle}
            onClick={() => handleSelectCategory('TO_DO')}
            tabIndex={isCategorySelectOpen ? 0 : -1} // Manage tabIndex
          >
            All in TO_DO
          </button>
          <button
            ref={el => categoryButtonRefs.current[1] = el}
            role="menuitem" // Added role
            style={dropdownButtonStyle}
            onClick={() => handleSelectCategory('IN_PROGRESS')}
            tabIndex={isCategorySelectOpen ? 0 : -1} // Manage tabIndex
          >
            All in IN_PROGRESS
          </button>
          <button
            ref={el => categoryButtonRefs.current[2] = el}
            role="menuitem" // Added role
            style={dropdownButtonStyle}
            onClick={() => handleSelectCategory('COMPLETED')}
            tabIndex={isCategorySelectOpen ? 0 : -1} // Manage tabIndex
          >
            All in COMPLETED
          </button>
        </div>
      </div>

      {selectedCount > 0 && (
        <>
          <span style={{ marginLeft: '20px', marginRight: '10px', fontWeight: 'bold' }}>
            {selectedCount} selected
          </span>
          <button style={buttonStyle} onClick={onOpenKidAssignmentModal}>
            Assign to Kid
          </button>
          <button style={buttonStyle} onClick={onMarkComplete}>
            Mark as Complete
          </button>
          <button style={buttonStyle} onClick={onMarkIncomplete}>
            Mark as Incomplete
          </button>
          <button style={buttonStyle} onClick={onOpenCategoryModal}>
            Change Swimlane
          </button>
          <button style={{...buttonStyle, marginLeft: 'auto' }} onClick={onClearSelection}>
            Clear Selection
          </button>
        </>
      )}
    </div>
  );
};

export default React.memo(BatchActionsToolbar);
