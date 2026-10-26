'use client'

import React from 'react';

const IntroState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center text-white p-6">
      <div className="max-w-2xl">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-linear-to-r from-purple-400 to-pink-500">
          Last.fm Track Wall
        </h1>
        <p className="mt-4 text-lg md:text-xl text-gray-300">
          Visualize your listening habits as an animated wall of your top album art.
        </p>
        <div className="mt-8 bg-gray-900/50 border border-purple-800/50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white">How to use:</h2>
          <p className="mt-2 text-gray-400">
            Add your Last.fm username to the URL to get started.
          </p>
          <p className="mt-4 text-sm font-mono bg-gray-800 text-purple-300 p-3 rounded-md overflow-x-auto">
            {typeof window !== 'undefined' ? `${window.location.origin}?username=your_username` : '?username=your_username'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default IntroState;
