// src/pages/CanvasPage.jsx
import React, { useState } from 'react';
import Canvas from '../components/Canvas';

export default function CanvasPage() {
  const [currentTool, setCurrentTool] = useState('wall');
  
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="flex-grow relative">
        <Canvas currentTool={currentTool} />
      </div>
    </div>
  );
}