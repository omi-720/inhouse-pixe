// src/components/ZoneDividerSidebar.jsx
import React, { useState, useEffect } from "react";

const ZoneDividerSidebar = ({ selectedObject, onEdit }) => {
  // States for editable properties
  const [thickness, setThickness] = useState(0.05);
  const [isDashed, setIsDashed] = useState(true);
  const [color, setColor] = useState("#333333");

  // Convert hex to number for Pixi.js
  const hexToNumber = (hex) => {
    return parseInt(hex.replace("#", ""), 16);
  };

  // Convert number to hex for input
  const numberToHex = (num) => {
    return "#" + num.toString(16).padStart(6, "0");
  };

  // Update local state when selected object changes
  useEffect(() => {
    if (selectedObject && selectedObject.type === "zoneDivider") {
      const divider = selectedObject.object;

      setThickness(divider.thickness || 0.05);
      setIsDashed(divider.isDashed !== undefined ? divider.isDashed : true);
      setColor(numberToHex(divider.color || 0x333333));
    }
  }, [selectedObject]);

  // Format length more nicely
  const formatLength = (length) => {
    if (!length) return "0m";

    if (length < 0.01) {
      return `${(length * 1000).toFixed(0)}mm`;
    } else if (length < 1) {
      return `${(length * 100).toFixed(1)}cm`;
    } else if (length < 10) {
      return `${length.toFixed(2)}m`;
    } else if (length < 100) {
      return `${length.toFixed(1)}m`;
    } else {
      return `${Math.round(length)}m`;
    }
  };

  // Thickness change handler
  const handleThicknessChange = (e) => {
    const value = parseFloat(e.target.value);
    setThickness(value);
    onEdit("thickness", value, selectedObject.id);
  };

  // Dashed change handler
  const handleDashedChange = (e) => {
    const value = e.target.checked;
    setIsDashed(value);
    onEdit("isDashed", value, selectedObject.id);
  };

  // Color change handlers
  const handleColorChange = (e) => {
    setColor(e.target.value);
  };

  const applyColorChange = () => {
    if (!selectedObject) return;

    // Convert hex to number for Pixi.js
    const colorNumber = hexToNumber(color);
    onEdit("color", colorNumber, selectedObject.id);
  };

  if (!selectedObject || selectedObject.type !== "zoneDivider") {
    return null;
  }

  const divider = selectedObject.object;

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
        Zone Divider Properties
      </h3>

      {/* Thickness slider */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <label>Thickness: {thickness.toFixed(2)}m</label>
        <input
          type="range"
          min="0.01"
          max="0.2"
          step="0.01"
          value={thickness}
          onChange={handleThicknessChange}
          style={{
            width: "100%",
          }}
        />
      </div>

      {/* Dashed checkbox */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <input
          type="checkbox"
          id="isDashed"
          checked={isDashed}
          onChange={handleDashedChange}
        />
        <label htmlFor="isDashed">Dashed Line</label>
      </div>

      {/* Color */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <label>Color:</label>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="color"
            value={color}
            onChange={handleColorChange}
            onBlur={applyColorChange}
            style={{
              width: "40px",
              height: "30px",
              padding: "0",
              border: "1px solid #ccc",
              borderRadius: "3px",
            }}
          />
          <input
            type="text"
            value={color}
            onChange={handleColorChange}
            onBlur={applyColorChange}
            style={{
              width: "calc(100% - 50px)",
              padding: "5px",
              border: "1px solid #ccc",
              borderRadius: "3px",
            }}
          />
        </div>
      </div>

      {/* Display measurements */}
      <div
        style={{
          marginTop: "10px",
          padding: "10px",
          backgroundColor: "rgba(0,0,0,0.05)",
          borderRadius: "4px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Length:</span>
          <span>{formatLength(divider.length)}</span>
        </div>
      </div>

      {/* Keyboard controls info */}
      <div style={{ fontSize: "11px", color: "#666", marginTop: "10px" }}>
        <div>Press 'D' to toggle dashed/solid line</div>
        <div>Press Delete to remove the divider</div>
      </div>
    </div>
  );
};

export default ZoneDividerSidebar;
