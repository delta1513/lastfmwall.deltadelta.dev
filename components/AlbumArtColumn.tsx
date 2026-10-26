'use client'

import React, { useMemo, useEffect, useState } from 'react';
import { LastFmTrack } from '@/types';

interface AlbumArtColumnProps {
  tracks: LastFmTrack[];
  direction: 'up' | 'down';
}

interface AlbumImageProps {
  track: LastFmTrack;
}

const AlbumImage: React.FC<AlbumImageProps> = ({ track }) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="aspect-square w-full rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
      {!imageError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={track.imageUrl}
          alt={`${track.name} by ${track.artist}`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={handleImageError}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-purple-500 to-pink-500">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://placehold.co/300x300?text=Album"
            alt="Album art placeholder"
            className="w-3/4 h-3/4 object-contain opacity-80"
          />
        </div>
      )}
    </div>
  );
};

const AlbumArtColumn: React.FC<AlbumArtColumnProps> = ({ tracks, direction }) => {
  const displayTracks = [...tracks, ...tracks];

  const MIN_DURATION = 120;
  const MAX_DURATION = 240;
  const [animationDuration] = useState(
    () => Math.floor(Math.random() * (MAX_DURATION - MIN_DURATION + 1)) + MIN_DURATION
  );

  const [animationId] = useState(() => Math.random().toString(36).slice(2, 11));

  const animationName = `marquee-${direction}-${animationDuration}-${animationId}`;

  const animationStyle = useMemo(() => {
    return {
      animation: `${animationName} ${animationDuration}s linear infinite`
    } as React.CSSProperties;
  }, [animationName, animationDuration]);

  useEffect(() => {
    const styleId = `animation-${animationName}`;

    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = styleId;

    const keyframes = direction === 'up'
      ? `
        @keyframes ${animationName} {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
      `
      : `
        @keyframes ${animationName} {
          0% { transform: translateY(-50%); }
          100% { transform: translateY(0); }
        }
      `;

    style.textContent = keyframes;
    document.head.appendChild(style);

    return () => {
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, [animationName, direction]);

  return (
    <div className="w-1/3 md:w-1/5 shrink-0">
      <div 
        className="flex flex-col gap-4 md:gap-6"
        style={animationStyle}
      >
        {displayTracks.map((track, index) => (
          <AlbumImage
            key={`${track.imageUrl}-${index}`}
            track={track}
          />
        ))}
      </div>
    </div>
  );
};

export default AlbumArtColumn;
