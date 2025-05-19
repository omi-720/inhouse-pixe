// src/components/CircleToolSettings.jsx
import React, { useState, useEffect } from "react";

const CircleToolSettings = ({
  onShowMeasurements,
  showMeasurements = true,
}) => {
  const [showMeasurementsState, setShowMeasurementsState] =
    useState(showMeasurements);

  // Update local state when the prop changes
  useEffect(() => {
    setShowMeasurementsState(showMeasurements);
  }, [showMeasurements]);

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
      <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>
        Circle Settings
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
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
      </div>

      <div
        style={{
          marginTop: "15px",
          fontSize: "12px",
          color: "#666",
        }}
      >
        Click once to set the center point, then click again to set the radius.
      </div>
    </div>
  );
};

export default CircleToolSettings;
