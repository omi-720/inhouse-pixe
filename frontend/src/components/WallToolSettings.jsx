// src/components/WallToolSettings.jsx
import React, { useState, useEffect } from 'react';
import { PIXELS_PER_METER } from '../core/geometry/MeasurementUtils';

const WallToolSettings = ({ defaultThickness, onDefaultThicknessChange }) => {
  // thickness is in meters
  const [thickness, setThickness] = useState(defaultThickness);
  const [inputValue, setInputValue] = useState(defaultThickness.toString());

  // Update local state when the prop changes
  useEffect(() => {
    setThickness(defaultThickness);
    setInputValue(defaultThickness.toString());
  }, [defaultThickness]);

  const handleInputChange = (e) => {
    // Only update the input field value, not the actual thickness yet
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      applyThickness();
    }
  };

  const applyThickness = () => {
    // Convert to float and validate - using meters
    const newThickness = parseFloat(inputValue);
    
    // MODIFIED: Changed validation range to 0.01m (1cm) to 10m
    if (!isNaN(newThickness) && newThickness >= 0.01 && newThickness <= 10) {
      setThickness(newThickness);
      onDefaultThicknessChange(newThickness);
    } else {
      // Reset input to current valid thickness if invalid input
      setInputValue(thickness.toString());
    }
  }

  const handleBlur = () => {
    // When focus leaves the input field, either apply valid value or reset to last valid value
    applyThickness();
  };

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
        gap: '10px',
        fontSize: '14px'
      }}
    >
      <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Wall Settings</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label>Default Thickness (0.01m - 10m):</label>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="number"
            min="0.01"
            max="10"
            step="0.01"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            style={{
              width: '100%',
              padding: '5px',
              border: '1px solid #ccc',
              borderRadius: '3px'
            }}
          />
          <span style={{ marginLeft: '5px' }}>m</span>
        </div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
          Press Enter to apply to new walls
        </div>
      </div>
      <button
        onClick={applyThickness}
        style={{
          padding: '5px 10px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer',
          marginTop: '5px'
        }}
      >
        Apply
      </button>
     
      {/* Add zoom level indicator to help users understand scale */}
      <div style={{
        marginTop: '15px',
        fontSize: '12px',
        padding: '5px',
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: '3px'
      }}>
        {/* Visualization of current thickness could go here */}
      </div>
    </div>
  );
};

export default WallToolSettings;