// src/components/ZoneSidebar.jsx
import React, { useState, useEffect } from "react";

const ZoneSidebar = ({ selectedObject, onEdit }) => {
  // State for editable properties
  const [name, setName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [fillColor, setFillColor] = useState("");
  const [fillAlpha, setFillAlpha] = useState(0.2);
  const [borderColor, setBorderColor] = useState("");
  const [borderThickness, setBorderThickness] = useState(0.05);

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
    if (selectedObject && selectedObject.type === "zone") {
      const zone = selectedObject.object;

      setName(zone.name || "Zone");
      setNameInput(zone.name || "Zone");

      // Convert color numbers to hex strings for inputs
      setFillColor(numberToHex(zone.fillColor || 0xeeeeee));
      setBorderColor(numberToHex(zone.borderColor || 0x666666));

      // Set alpha and thickness
      setFillAlpha(zone.fillAlpha !== undefined ? zone.fillAlpha : 0.2);
      setBorderThickness(zone.borderThickness || 0.05);

      setEditingName(false);
    }
  }, [selectedObject]);

  // Format perimeter and area more nicely
  const formatMeasurement = (value, unit) => {
    if (!value) return "0" + unit;

    if (value < 0.01) {
      return `${(value * 1000).toFixed(0)} mm${unit}`;
    } else if (value < 1) {
      return `${(value * 100).toFixed(1)} cm${unit}`;
    } else if (value < 10) {
      return `${value.toFixed(2)} m${unit}`;
    } else if (value < 100) {
      return `${value.toFixed(1)} m${unit}`;
    } else if (value < 10000) {
      return `${value.toFixed(0)} m${unit}`;
    } else {
      // Convert to hectares or km²
      return unit === "²"
        ? `${(value / 10000).toFixed(2)} ha`
        : `${(value / 1000).toFixed(2)} km`;
    }
  };

  // Name editing handlers
  const handleNameInputFocus = () => {
    setEditingName(true);
  };

  const handleNameChange = (e) => {
    setNameInput(e.target.value);
  };

  const handleNameKeyDown = (e) => {
    if (e.key === "Enter") {
      applyNameChange();
    }
  };

  const applyNameChange = () => {
    if (!selectedObject) return;

    if (nameInput.trim() !== "") {
      onEdit("name", nameInput, selectedObject.id);
      setName(nameInput);
    } else {
      setNameInput(name);
    }

    setEditingName(false);
  };

  const handleNameBlur = () => {
    if (editingName) {
      applyNameChange();
    }
  };

  // Fill color handlers
  const handleFillColorChange = (e) => {
    setFillColor(e.target.value);
  };

  const applyFillColorChange = () => {
    if (!selectedObject) return;

    // Convert hex to number for Pixi.js
    const colorNumber = hexToNumber(fillColor);
    onEdit("fillColor", colorNumber, selectedObject.id);
  };

  // Border color handlers
  const handleBorderColorChange = (e) => {
    setBorderColor(e.target.value);
  };

  const applyBorderColorChange = () => {
    if (!selectedObject) return;

    // Convert hex to number for Pixi.js
    const colorNumber = hexToNumber(borderColor);
    onEdit("borderColor", colorNumber, selectedObject.id);
  };

  // Fill alpha handlers
  const handleFillAlphaChange = (e) => {
    const value = parseFloat(e.target.value);
    setFillAlpha(value);
    onEdit("fillAlpha", value, selectedObject.id);
  };

  // Border thickness handlers
  const handleBorderThicknessChange = (e) => {
    const value = parseFloat(e.target.value);
    setBorderThickness(value);
    onEdit("borderThickness", value, selectedObject.id);
  };

  if (!selectedObject || selectedObject.type !== "zone") {
    return null;
  }

  const zone = selectedObject.object;

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
      <h3 style={{ margin: "0 0 5px 0", fontSize: "16px" }}>Zone Properties</h3>

      {/* Name input */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <label>Name:</label>
        <div style={{ display: "flex", alignItems: "center" }}>
          <input
            type="text"
            value={nameInput}
            onChange={handleNameChange}
            onKeyDown={handleNameKeyDown}
            onFocus={handleNameInputFocus}
            onBlur={handleNameBlur}
            style={{
              width: "100%",
              padding: "5px",
              border: "1px solid #ccc",
              borderRadius: "3px",
              backgroundColor: editingName ? "#fffdf0" : "white",
            }}
          />
        </div>
        <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
          Press Enter to apply changes
        </div>
      </div>

      {/* Fill color */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <label>Fill Color:</label>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="color"
            value={fillColor}
            onChange={handleFillColorChange}
            onBlur={applyFillColorChange}
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
            onBlur={applyFillColorChange}
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
            onBlur={applyBorderColorChange}
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
            onBlur={applyBorderColorChange}
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

      {/* Display measurements */}
      <div
        style={{
          marginTop: "10px",
          padding: "10px",
          backgroundColor: "rgba(0,0,0,0.05)",
          borderRadius: "4px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "5px",
          }}
        >
          <span>Points:</span>
          <span>{zone.points?.length || 0}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "5px",
          }}
        >
          <span>Perimeter:</span>
          <span>{formatMeasurement(zone.perimeter, "")}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Area:</span>
          <span>{formatMeasurement(zone.area, "²")}</span>
        </div>
      </div>
    </div>
  );
};

export default ZoneSidebar;
