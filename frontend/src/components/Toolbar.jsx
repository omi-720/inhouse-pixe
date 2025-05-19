// // src/components/Toolbar.jsx
// import React from 'react';

// const Toolbar = ({ currentTool, onToolChange }) => {
//   return (
//     <div
//       style={{
//         position: 'absolute',
//         bottom: '10px',
//         left: '10px',
//         background: 'rgba(255,255,255,0.85)',
//         padding: '8px',
//         borderRadius: '4px',
//         display: 'flex',
//         gap: '8px',
//         boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
//       }}
//     >
//       <ToolButton
//         active={currentTool === 'wall'}
//         onClick={() => onToolChange('wall')}
//         icon="□"
//         label="Wall"
//       />
//       <ToolButton
//         active={currentTool === 'select'}
//         onClick={() => onToolChange('select')}
//         icon="↖"
//         label="Select"
//       />
//     </div>
//   );
// };

// // Helper component for tool buttons
// const ToolButton = ({ active, onClick, icon, label }) => {
//   return (
//     <button
//       onClick={onClick}
//       style={{
//         display: 'flex',
//         flexDirection: 'column',
//         alignItems: 'center',
//         padding: '8px',
//         background: active ? '#e0e0ff' : '#f0f0f0',
//         border: active ? '2px solid #6060ff' : '1px solid #c0c0c0',
//         borderRadius: '4px',
//         cursor: 'pointer',
//         width: '50px',
//         height: '50px',
//         fontSize: '20px'
//       }}
//     >
//       <span style={{ marginBottom: '4px' }}>{icon}</span>
//       <span style={{ fontSize: '12px' }}>{label}</span>
//     </button>
//   );
// };

// export default Toolbar;

// src/components/Toolbar.jsx - Updated with circle and polygon tools
import React from "react";

const Toolbar = ({ currentTool, onToolChange }) => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "10px",
        left: "10px",
        background: "rgba(255,255,255,0.85)",
        padding: "8px",
        borderRadius: "4px",
        display: "flex",
        gap: "8px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      }}
    >
      <ToolButton
        active={currentTool === "select"}
        onClick={() => onToolChange("select")}
        icon="↖"
        label="Select"
      />
      <ToolButton
        active={currentTool === "wall"}
        onClick={() => onToolChange("wall")}
        icon="□"
        label="Wall"
      />
      <ToolButton
        active={currentTool === "circle"}
        onClick={() => onToolChange("circle")}
        icon="○"
        label="Circle"
      />
      <ToolButton
        active={currentTool === "polygon"}
        onClick={() => onToolChange("polygon")}
        icon="▢"
        label="Polygon"
      />
    </div>
  );
};

// Helper component for tool buttons
const ToolButton = ({ active, onClick, icon, label }) => {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "8px",
        background: active ? "#e0e0ff" : "#f0f0f0",
        border: active ? "2px solid #6060ff" : "1px solid #c0c0c0",
        borderRadius: "4px",
        cursor: "pointer",
        width: "50px",
        height: "50px",
        fontSize: "20px",
      }}
    >
      <span style={{ marginBottom: "4px" }}>{icon}</span>
      <span style={{ fontSize: "12px" }}>{label}</span>
    </button>
  );
};

export default Toolbar;
