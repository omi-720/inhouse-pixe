// src/components/ArcSidebar.jsx
import React, { useState, useEffect } from "react";

const ArcSidebar = ({ selectedObject, onEdit }) => {
  // States for each editable property
  const [radius, setRadius] = useState("");
  const [radiusInput, setRadiusInput] = useState("");
  const [editingRadius, setEditingRadius] = useState(false);
  const [thickness, setThickness] = useState("");
  const [thicknessInput, setThicknessInput] = useState("");
  const [editingThickness, setEditingThickness] = useState(false);
  const [startAngle, setStartAngle] = useState(0);
  const [endAngle, setEndAngle] = useState(0);

  // Update local state when selected object changes
  useEffect(() => {
    if (selectedObject && selectedObject.type === "arc") {
      const arc = selectedObject.object;
      const radiusValue = arc.radius.toString();
      const thicknessValue = arc.thickness.toString();

      setRadius(radiusValue);
      setRadiusInput(radiusValue);
      setThickness(thicknessValue);
      setThicknessInput(thicknessValue);

      // Convert radians to degrees for display
      setStartAngle((arc.startAngle * 180) / Math.PI);
      setEndAngle((arc.endAngle * 180) / Math.PI);

      setEditingRadius(false);
      setEditingThickness(false);
    } else {
      // Reset inputs when no object is selected
      setRadius("");
      setRadiusInput("");
      setThickness("");
      setThicknessInput("");
      setStartAngle(0);
      setEndAngle(0);
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

  // Start editing thickness
  const handleThicknessInputFocus = () => {
    setEditingThickness(true);
  };

  // Handle thickness input change
  const handleThicknessChange = (e) => {
    setThicknessInput(e.target.value);
  };

  // Apply thickness on Enter
  const handleThicknessKeyDown = (e) => {
    if (e.key === "Enter") {
      applyThicknessChange();
    }
  };

  // Apply thickness change
  const applyThicknessChange = () => {
    if (!selectedObject) return;

    const value = parseFloat(thicknessInput);
    if (!isNaN(value) && value > 0) {
      // Apply the change to the actual object
      onEdit("thickness", value, selectedObject.id);
      setThickness(value.toString());
    } else {
      // Reset to current value if invalid
      setThicknessInput(thickness);
    }

    setEditingThickness(false);
  };

  // Handle thickness input blur
  const handleThicknessBlur = () => {
    if (editingThickness) {
      applyThicknessChange();
    }
  };

  // Handle angle changes with sliders
  const handleStartAngleChange = (e) => {
    const value = parseFloat(e.target.value);
    setStartAngle(value);

    // Convert to radians for the arc model
    const radiansValue = (value * Math.PI) / 180;

    // Since changing start and end angles requires updating both together,
    // we need to pass both values to an angles property
    onEdit(
      "angles",
      {
        startAngle: radiansValue,
        endAngle: selectedObject.object.endAngle,
      },
      selectedObject.id
    );
  };

  const handleEndAngleChange = (e) => {
    const value = parseFloat(e.target.value);
    setEndAngle(value);

    // Convert to radians for the arc model
    const radiansValue = (value * Math.PI) / 180;

    // Update both angles
    onEdit(
      "angles",
      {
        startAngle: selectedObject.object.startAngle,
        endAngle: radiansValue,
      },
      selectedObject.id
    );
  };

  if (!selectedObject || selectedObject.type !== "arc") {
    return null;
  }

  const arc = selectedObject.object;

  // Calculate angle difference in degrees (for displaying arc length)
  let angleDifference = (endAngle - startAngle + 360) % 360;
  if (angleDifference > 180) {
    angleDifference = 360 - angleDifference;
  }

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
      <h3 style={{ margin: "0 0 5px 0", fontSize: "16px" }}>Arc Properties</h3>

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

      {/* Thickness input */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <label>Thickness:</label>
        <div style={{ display: "flex", alignItems: "center" }}>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={thicknessInput}
            onChange={handleThicknessChange}
            onKeyDown={handleThicknessKeyDown}
            onFocus={handleThicknessInputFocus}
            onBlur={handleThicknessBlur}
            style={{
              width: "100%",
              padding: "5px",
              border: "1px solid #ccc",
              borderRadius: "3px",
              backgroundColor: editingThickness ? "#fffdf0" : "white",
            }}
          />
          <span style={{ marginLeft: "5px" }}>m</span>
        </div>
        <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
          Press Enter to apply changes
        </div>
      </div>

      {/* Start angle slider */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <label>Start Angle: {startAngle.toFixed(0)}°</label>
        <input
          type="range"
          min="0"
          max="359"
          step="1"
          value={startAngle}
          onChange={handleStartAngleChange}
          style={{
            width: "100%",
          }}
        />
      </div>

      {/* End angle slider */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <label>End Angle: {endAngle.toFixed(0)}°</label>
        <input
          type="range"
          min="0"
          max="359"
          step="1"
          value={endAngle}
          onChange={handleEndAngleChange}
          style={{
            width: "100%",
          }}
        />
      </div>

      {/* Display calculated values */}
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
          <span>Arc Angle:</span>
          <span>{angleDifference.toFixed(1)}°</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "5px",
          }}
        >
          <span>Arc Length:</span>
          <span>{arc.arcLength.toFixed(2)} m</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Chord Length:</span>
          <span>{arc.chordLength.toFixed(2)} m</span>
        </div>
      </div>

      {/* Apply buttons for properties */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={applyRadiusChange}
          disabled={!editingRadius}
          style={{
            flex: 1,
            padding: "5px 10px",
            backgroundColor: editingRadius ? "#4CAF50" : "#e0e0e0",
            color: editingRadius ? "white" : "#888",
            border: "none",
            borderRadius: "3px",
            cursor: editingRadius ? "pointer" : "default",
          }}
        >
          Apply Radius
        </button>

        <button
          onClick={applyThicknessChange}
          disabled={!editingThickness}
          style={{
            flex: 1,
            padding: "5px 10px",
            backgroundColor: editingThickness ? "#4CAF50" : "#e0e0e0",
            color: editingThickness ? "white" : "#888",
            border: "none",
            borderRadius: "3px",
            cursor: editingThickness ? "pointer" : "default",
          }}
        >
          Apply Thickness
        </button>
      </div>
    </div>
  );
};

export default ArcSidebar;
