// src/App.jsx (modified)
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CanvasPage from './pages/CanvasPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/canvas" element={<CanvasPage />} />
    </Routes>
  );
}

export default App;