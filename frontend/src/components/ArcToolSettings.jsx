// src/components/ArcToolSettings.jsx
import React, { useState, useEffect } from "react";

const ArcToolSettings = ({
  onThicknessChange,
  onColorChange,
  defaultThickness = 0.05,
  defaultColor = "#0000FF",
  showMeasurements = true,
  onShowMeasurements,
}) => {
  const [thickness, setThickness] = useState(defaultThickness);
  const [color, setColor] = useState(defaultColor);
  const [showMeasurementsState, setShowMeasurementsState] =
    useState(showMeasurements);

  // Convert hex to number for Pixi.js
  const hexToNumber = (hex) => {
    return parseInt(hex.replace("#", ""), 16);
  };

  // Convert number to hex
  const numberToHex = (num) => {
    return "#" + num.toString(16).padStart(6, "0");
  };

  // Update local state when defaults change
  useEffect(() => {
    setThickness(defaultThickness);
    setColor(
      typeof defaultColor === "string"
        ? defaultColor
        : numberToHex(defaultColor)
    );
  }, [defaultThickness, defaultColor]);

  // Update local state when showMeasurements prop changes
  useEffect(() => {
    setShowMeasurementsState(showMeasurements);
  }, [showMeasurements]);

  // Thickness change handler
  const handleThicknessChange = (e) => {
    const value = parseFloat(e.target.value);
    setThickness(value);
    if (onThicknessChange) {
      onThicknessChange(value);
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

  // Show measurements handler
  const handleShowMeasurementsChange = (e) => {
    const newValue = e.target.checked;
    setShowMeasurementsState(newValue);
    if (onShowMeasurements) {
      onShowMeasurements(newValue);
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
      <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>Arc Settings</h3>

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

      {/* Show measurements checkbox */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <input
          type="checkbox"
          id="showMeasurements"
          checked={showMeasurementsState}
          onChange={handleShowMeasurementsChange}
          style={{ marginRight: "10px" }}
        />
        <label htmlFor="showMeasurements">Show Measurements</label>
      </div>

      <div
        style={{
          marginTop: "15px",
          fontSize: "12px",
          color: "#666",
        }}
      >
        Click to set the center point, then click to set the radius and start
        angle, and click again to set the end angle.
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "#666",
        }}
      >
        Press ESC to cancel drawing.
      </div>
    </div>
  );
};

export default ArcToolSettings;
