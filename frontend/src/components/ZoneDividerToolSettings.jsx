// src/components/ZoneDividerToolSettings.jsx
import React, { useState, useEffect } from "react";

const ZoneDividerToolSettings = ({
  onThicknessChange,
  onDashedChange,
  onColorChange,
  defaultThickness = 0.05,
  defaultIsDashed = true,
  defaultColor = "#333333",
}) => {
  const [thickness, setThickness] = useState(defaultThickness);
  const [isDashed, setIsDashed] = useState(defaultIsDashed);
  const [color, setColor] = useState(defaultColor);

  // Convert hex to number for Pixi.js
  const hexToNumber = (hex) => {
    return parseInt(hex.replace("#", ""), 16);
  };

  // Update local state when defaults change
  useEffect(() => {
    setThickness(defaultThickness);
    setIsDashed(defaultIsDashed);
    setColor(defaultColor);
  }, [defaultThickness, defaultIsDashed, defaultColor]);

  // Thickness change handler
  const handleThicknessChange = (e) => {
    const value = parseFloat(e.target.value);
    setThickness(value);
    if (onThicknessChange) {
      onThicknessChange(value);
    }
  };

  // Dashed change handler
  const handleDashedChange = (e) => {
    const value = e.target.checked;
    setIsDashed(value);
    if (onDashedChange) {
      onDashedChange(value);
    }
  };

  // Color change handlers
  const handleColorChange = (e) => {
    const newColor = e.target.value;
    setColor(newColor);
    if (onColorChange) {
      onColorChange(hexToNumber(newColor));
    }
  };

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
        gap: "10px",
        fontSize: "14px",
      }}
    >
      <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>
        Zone Divider Settings
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
            style={{
              width: "calc(100% - 50px)",
              padding: "5px",
              border: "1px solid #ccc",
              borderRadius: "3px",
            }}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: "15px",
          fontSize: "12px",
          color: "#666",
        }}
      >
        Click to set the start point, then click again to set the end point.
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "#666",
        }}
      >
        Dividers must be drawn within zones or along zone boundaries.
      </div>
    </div>
  );
};

export default ZoneDividerToolSettings;
