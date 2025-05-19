// src/components/PolygonSidebar.jsx
import React, { useState, useEffect } from "react";

const PolygonSidebar = ({ selectedObject, onEdit }) => {
  if (!selectedObject || selectedObject.type !== "polygon") {
    return null;
  }

  const polygon = selectedObject.object;

  // Format perimeter and area more nicely
  const formatMeasurement = (value, unit) => {
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
        Polygon Properties
      </h3>

      {/* Display basic info */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Points:</span>
          <span>{polygon.points.length}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Closed:</span>
          <span>{polygon.isClosed ? "Yes" : "No"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Perimeter:</span>
          <span>{formatMeasurement(polygon.perimeter, "")}</span>
        </div>
        {polygon.isClosed && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Area:</span>
            <span>{formatMeasurement(polygon.area, "²")}</span>
          </div>
        )}
      </div>

      {/* Points list - collapsed by default */}
      <details style={{ marginTop: "5px" }}>
        <summary style={{ cursor: "pointer", userSelect: "none" }}>
          Polygon Points
        </summary>
        <div
          style={{
            maxHeight: "200px",
            overflowY: "auto",
            marginTop: "10px",
            padding: "5px",
            border: "1px solid #eee",
            borderRadius: "3px",
          }}
        >
          {polygon.points.map((point, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "3px 0",
                borderBottom:
                  index < polygon.points.length - 1 ? "1px solid #eee" : "none",
              }}
            >
              <span>Point {index + 1}:</span>
              <span>
                ({point.x.toFixed(2)}, {point.y.toFixed(2)})
              </span>
            </div>
          ))}
        </div>
      </details>

      {/* Help text */}
      <div style={{ fontSize: "11px", color: "#666", marginTop: "10px" }}>
        Use the select tool to edit individual points by clicking and dragging
        them.
      </div>
      <div style={{ fontSize: "11px", color: "#666" }}>
        Press Delete to remove the selected polygon.
      </div>
    </div>
  );
};

export default PolygonSidebar;
