// src/components/CircleSidebar.jsx
import React, { useState, useEffect } from "react";

const CircleSidebar = ({ selectedObject, onEdit }) => {
  // States for each editable property
  const [radius, setRadius] = useState("");
  const [radiusInput, setRadiusInput] = useState("");
  const [editingRadius, setEditingRadius] = useState(false);

  // Update local state when selected object changes
  useEffect(() => {
    if (selectedObject && selectedObject.type === "circle") {
      const circle = selectedObject.object;
      const radiusValue = circle.radius.toString();

      setRadius(radiusValue);
      setRadiusInput(radiusValue);
      setEditingRadius(false);
    } else {
      // Reset inputs when no object is selected
      setRadius("");
      setRadiusInput("");
    }
  }, [selectedObject]);

  // Start editing radius
  const handleRadiusInputFocus = () => {
    setEditingRadius(true);
  };

  // Handle radius input change
  const handleRadiusChange = (e) => {
    setRadiusInput(e.target.value);
  };

  // Apply radius on Enter
  const handleRadiusKeyDown = (e) => {
    if (e.key === "Enter") {
      applyRadiusChange();
    }
  };

  // Apply radius change
  const applyRadiusChange = () => {
    if (!selectedObject) return;

    const value = parseFloat(radiusInput);
    if (!isNaN(value) && value > 0) {
      // Apply the change to the actual object
      onEdit("radius", value, selectedObject.id);
      setRadius(value.toString());
    } else {
      // Reset to current value if invalid
      setRadiusInput(radius);
    }

    setEditingRadius(false);
  };

  // Handle radius input blur
  const handleRadiusBlur = () => {
    if (editingRadius) {
      applyRadiusChange();
    }
  };

  if (!selectedObject || selectedObject.type !== "circle") {
    return null;
  }

  const circle = selectedObject.object;

  return (
    <div
      style={{
        position: "absolute",
        top: "10px",
        right: "10px",
        width: "250px",
        background: "rgba(255,255,255,0.85)",
        padding: "15px",
        borderRadius: "4px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        gap: "15px",
        fontSize: "14px",
      }}
    >
      <h3 style={{ margin: "0 0 5px 0", fontSize: "16px" }}>
        Circle Properties
      </h3>

      {/* Radius input */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <label>Radius:</label>
        <div style={{ display: "flex", alignItems: "center" }}>
          <input
            type="number"
            min="0.01"
            step="0.1"
            value={radiusInput}
            onChange={handleRadiusChange}
            onKeyDown={handleRadiusKeyDown}
            onFocus={handleRadiusInputFocus}
            onBlur={handleRadiusBlur}
            style={{
              width: "100%",
              padding: "5px",
              border: "1px solid #ccc",
              borderRadius: "3px",
              backgroundColor: editingRadius ? "#fffdf0" : "white",
            }}
          />
          <span style={{ marginLeft: "5px" }}>m</span>
        </div>
        <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
          Press Enter to apply changes
        </div>
      </div>

      {/* Display calculated values */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Diameter:</span>
          <span>{(circle.radius * 2).toFixed(2)} m</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Circumference:</span>
          <span>{circle.circumference.toFixed(2)} m</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Area:</span>
          <span>{circle.area.toFixed(2)} m²</span>
        </div>
      </div>

      {/* Apply button for radius */}
      <button
        onClick={applyRadiusChange}
        disabled={!editingRadius}
        style={{
          padding: "5px 10px",
          backgroundColor: editingRadius ? "#4CAF50" : "#e0e0e0",
          color: editingRadius ? "white" : "#888",
          border: "none",
          borderRadius: "3px",
          cursor: editingRadius ? "pointer" : "default",
          marginTop: "5px",
        }}
      >
        Apply Radius
      </button>
    </div>
  );
};

export default CircleSidebar;
