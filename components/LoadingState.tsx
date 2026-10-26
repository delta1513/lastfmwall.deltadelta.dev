
import React from 'react';

interface LoadingStateProps {
  username: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ username }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center text-white p-4">
      <div className="w-16 h-16 border-4 border-t-4 border-gray-600 border-t-purple-500 rounded-full animate-spin"></div>
      <h1 className="mt-8 text-2xl md:text-3xl font-bold tracking-tight text-white">
        Generating your soundscape
      </h1>
      <p className="mt-2 text-lg text-gray-300">
        Fetching top tracks for <span className="font-bold text-purple-400">{username}</span>...
      </p>
    </div>
  );
};

export default LoadingState;
