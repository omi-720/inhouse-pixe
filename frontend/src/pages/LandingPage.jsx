// src/pages/LandingPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
 
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200">
      <h1 className="text-5xl font-extrabold text-indigo-800 mb-10 tracking-wide drop-shadow-md">
        Welcome to the Architecture Tool
      </h1>
      <button
        onClick={() => navigate('/canvas')}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105"
      >
        Enter Drawing Board
      </button>
    </div>
  );
}