// src/components/ZoneToolSettings.jsx
import React, { useState, useEffect } from "react";

const ZoneToolSettings = ({
  onFillColorChange,
  onBorderColorChange,
  onFillAlphaChange,
  onBorderThicknessChange,
  defaultFillColor = "#EEEEEE",
  defaultBorderColor = "#666666",
  defaultFillAlpha = 0.2,
  defaultBorderThickness = 0.05,
}) => {
  const [fillColor, setFillColor] = useState(defaultFillColor);
  const [borderColor, setBorderColor] = useState(defaultBorderColor);
  const [fillAlpha, setFillAlpha] = useState(defaultFillAlpha);
  const [borderThickness, setBorderThickness] = useState(
    defaultBorderThickness
  );

  // Convert hex to number for Pixi.js
  const hexToNumber = (hex) => {
    return parseInt(hex.replace("#", ""), 16);
  };

  // Update local state when defaults change
  useEffect(() => {
    setFillColor(defaultFillColor);
    setBorderColor(defaultBorderColor);
    setFillAlpha(defaultFillAlpha);
    setBorderThickness(defaultBorderThickness);
  }, [
    defaultFillColor,
    defaultBorderColor,
    defaultFillAlpha,
    defaultBorderThickness,
  ]);

  // Fill color handlers
  const handleFillColorChange = (e) => {
    const newColor = e.target.value;
    setFillColor(newColor);
    if (onFillColorChange) {
      onFillColorChange(hexToNumber(newColor));
    }
  };

  // Border color handlers
  const handleBorderColorChange = (e) => {
    const newColor = e.target.value;
    setBorderColor(newColor);
    if (onBorderColorChange) {
      onBorderColorChange(hexToNumber(newColor));
    }
  };

  // Fill alpha handlers
  const handleFillAlphaChange = (e) => {
    const value = parseFloat(e.target.value);
    setFillAlpha(value);
    if (onFillAlphaChange) {
      onFillAlphaChange(value);
    }
  };

  // Border thickness handlers
  const handleBorderThicknessChange = (e) => {
    const value = parseFloat(e.target.value);
    setBorderThickness(value);
    if (onBorderThicknessChange) {
      onBorderThicknessChange(value);
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
      <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>Zone Settings</h3>

      {/* Fill color */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <label>Fill Color:</label>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="color"
            value={fillColor}
            onChange={handleFillColorChange}
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
            value={fillColor}
            onChange={handleFillColorChange}
            style={{
              width: "calc(100% - 50px)",
              padding: "5px",
              border: "1px solid #ccc",
              borderRadius: "3px",
            }}
          />
        </div>
      </div>

      {/* Fill Transparency */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <label>Fill Transparency: {(fillAlpha * 100).toFixed(0)}%</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={fillAlpha}
          onChange={handleFillAlphaChange}
          style={{
            width: "100%",
          }}
        />
      </div>

      {/* Border color */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <label>Border Color:</label>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="color"
            value={borderColor}
            onChange={handleBorderColorChange}
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
            value={borderColor}
            onChange={handleBorderColorChange}
            style={{
              width: "calc(100% - 50px)",
              padding: "5px",
              border: "1px solid #ccc",
              borderRadius: "3px",
            }}
          />
        </div>
      </div>

      {/* Border thickness */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <label>Border Thickness: {borderThickness.toFixed(2)}m</label>
        <input
          type="range"
          min="0.01"
          max="0.2"
          step="0.01"
          value={borderThickness}
          onChange={handleBorderThicknessChange}
          style={{
            width: "100%",
          }}
        />
      </div>

      <div
        style={{
          marginTop: "15px",
          fontSize: "12px",
          color: "#666",
        }}
      >
        Click to add points. Double-click or click the first point to close the
        zone.
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "#666",
        }}
      >
        Press ESC to cancel or Enter to finish the zone.
      </div>
    </div>
  );
};

export default ZoneToolSettings;
