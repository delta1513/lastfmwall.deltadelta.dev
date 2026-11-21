'use client'

import React, { useEffect, useState } from 'react';
import AlbumArtColumn from './AlbumArtColumn';
import LoadingState from './LoadingState';
import type { LastFmTrack } from '@/types';
import { getTopTracks } from '@/services/lastfmService';
import { buildColumns } from '@/lib/buildColumns';
import { useWakeLock } from '@/hooks/useWakeLock';

export default function TrackWallClient({ username }: { username: string }) {
  // Keep the display on for as long as the wall is open.
  useWakeLock();

  const [columns, setColumns] = useState<LastFmTrack[][]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTracks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedTracks = await getTopTracks(username);
        setColumns(buildColumns(fetchedTracks, window.innerWidth < 768 ? 3 : 5));
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTracks();
  }, [username]);

  if (isLoading) {
    return <LoadingState username={username} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-center text-white">
        <div>
          <h2 className="text-2xl font-bold text-red-400">Error</h2>
          <p className="mt-2 text-lg text-gray-300">{error}</p>
          <p className="mt-4 text-sm text-gray-400">Please check the username and ensure they have a Last.fm profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-12 md:gap-16 h-full overflow-hidden">
      {columns.map((columnTracks, index) => (
        <AlbumArtColumn key={index} tracks={columnTracks} direction={index % 2 === 0 ? 'up' : 'down'} />
      ))}
    </div>
  );
}
