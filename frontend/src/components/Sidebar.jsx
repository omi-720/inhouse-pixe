// src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react';

const Sidebar = ({ selectedObject, onEdit }) => {
  // States for each editable property - track both displayed value and edited value separately
  const [thickness, setThickness] = useState('');
  const [length, setLength] = useState('');
  const [thicknessInput, setThicknessInput] = useState('');
  const [lengthInput, setLengthInput] = useState('');
  const [editingThickness, setEditingThickness] = useState(false);
  const [editingLength, setEditingLength] = useState(false);
  
  // Update local state when selected object changes
  useEffect(() => {
    if (selectedObject && selectedObject.type === 'wall') {
      const wall = selectedObject.object;
      const thicknessValue = wall.thickness.toString();
      const lengthValue = wall.length.toFixed(2);
      
      setThickness(thicknessValue);
      setLength(lengthValue);
      setThicknessInput(thicknessValue);
      setLengthInput(lengthValue);
      setEditingThickness(false);
      setEditingLength(false);
    } else {
      // Reset inputs when no object is selected
      setThickness('');
      setLength('');
      setThicknessInput('');
      setLengthInput('');
    }
  }, [selectedObject]);
  
  // Start editing thickness
  const handleThicknessInputFocus = () => {
    setEditingThickness(true);
  };
  
  // Start editing length
  const handleLengthInputFocus = () => {
    setEditingLength(true);
  };
  
  // Handle thickness input change
  const handleThicknessChange = (e) => {
    setThicknessInput(e.target.value);
  };
  
  // Handle length input change
  const handleLengthChange = (e) => {
    setLengthInput(e.target.value);
  };
  
  // Apply thickness on Enter
  const handleThicknessKeyDown = (e) => {
    if (e.key === 'Enter') {
      applyThicknessChange();
    }
  };
  
  // Apply length on Enter
  const handleLengthKeyDown = (e) => {
    if (e.key === 'Enter') {
      applyLengthChange();
    }
  };
  
  // Apply thickness change
  const applyThicknessChange = () => {
    if (!selectedObject) return;
    
    const value = parseFloat(thicknessInput);
    if (!isNaN(value) && value > 0 && value <= 10) {
      // Apply the change to the actual object
      onEdit('thickness', value, selectedObject.id);
      setThickness(value.toString());
    } else {
      // Reset to current value if invalid
      setThicknessInput(thickness);
    }
    
    setEditingThickness(false);
  };
  
  // Apply length change
  const applyLengthChange = () => {
    if (!selectedObject) return;
    
    const value = parseFloat(lengthInput);
    if (!isNaN(value) && value > 0) {
      // Apply the change to the actual object
      onEdit('length', value, selectedObject.id);
      setLength(value.toFixed(2));
    } else {
      // Reset to current value if invalid
      setLengthInput(length);
    }
    
    setEditingLength(false);
  };
  
  // Handle thickness input blur
  const handleThicknessBlur = () => {
    if (editingThickness) {
      applyThicknessChange();
    }
  };
  
  // Handle length input blur
  const handleLengthBlur = () => {
    if (editingLength) {
      applyLengthChange();
    }
  };
  
  if (!selectedObject) {
    return null;
  }
  
  return (
    <div 
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        width: '250px',
        background: 'rgba(255,255,255,0.85)',
        padding: '15px',
        borderRadius: '4px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        fontSize: '14px'
      }}
    >
      <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>Wall Properties</h3>
      
      {selectedObject.type === 'wall' && (
        <>
          {/* Thickness input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label>Thickness (max 10m):</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input 
                type="number" 
                min="0.1" 
                max="10"
                step="0.1"
                value={thicknessInput}
                onChange={handleThicknessChange}
                onKeyDown={handleThicknessKeyDown}
                onFocus={handleThicknessInputFocus}
                onBlur={handleThicknessBlur}
                style={{ 
                  width: '100%',
                  padding: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  backgroundColor: editingThickness ? '#fffdf0' : 'white'
                }}
              />
              <span style={{ marginLeft: '5px' }}>m</span>
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
              Press Enter to apply changes
            </div>
          </div>
          
          {/* Length input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label>Length:</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input 
                type="number" 
                min="0.1"
                step="0.1"
                value={lengthInput}
                onChange={handleLengthChange}
                onKeyDown={handleLengthKeyDown}
                onFocus={handleLengthInputFocus}
                onBlur={handleLengthBlur}
                style={{ 
                  width: '100%',
                  padding: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  backgroundColor: editingLength ? '#fffdf0' : 'white'
                }}
              />
              <span style={{ marginLeft: '5px' }}>m</span>
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
              Press Enter to apply changes
            </div>
          </div>
          
          {/* Apply buttons for each property */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={applyThicknessChange}
              disabled={!editingThickness}
              style={{
                flex: 1,
                padding: '5px 10px',
                backgroundColor: editingThickness ? '#4CAF50' : '#e0e0e0',
                color: editingThickness ? 'white' : '#888',
                border: 'none',
                borderRadius: '3px',
                cursor: editingThickness ? 'pointer' : 'default'
              }}
            >
              Apply Thickness
            </button>
            
            <button
              onClick={applyLengthChange}
              disabled={!editingLength}
              style={{
                flex: 1,
                padding: '5px 10px',
                backgroundColor: editingLength ? '#4CAF50' : '#e0e0e0',
                color: editingLength ? 'white' : '#888',
                border: 'none',
                borderRadius: '3px',
                cursor: editingLength ? 'pointer' : 'default'
              }}
            >
              Apply Length
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Sidebar;