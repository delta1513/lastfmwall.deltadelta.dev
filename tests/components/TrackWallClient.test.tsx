import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { LastFmTrack } from '@/types';
import TrackWallClient from '@/components/TrackWallClient';
import { getTopTracks } from '@/services/lastfmService';
import { useWakeLock } from '@/hooks/useWakeLock';
import { MIN_ROWS_PER_COLUMN } from '@/lib/buildColumns';
import { makeTracks } from '../utils/rng';

vi.mock('@/services/lastfmService', () => ({ getTopTracks: vi.fn() }));
vi.mock('@/hooks/useWakeLock', () => ({ useWakeLock: vi.fn() }));
vi.mock('@/components/AlbumArtColumn', () => ({
  default: ({ tracks, direction }: { tracks: LastFmTrack[]; direction: 'up' | 'down' }) => (
    <div data-testid="column" data-direction={direction} data-count={tracks.length} />
  ),
}));

const getTopTracksMock = vi.mocked(getTopTracks);
const originalWidth = window.innerWidth;

const setWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
};

beforeEach(() => {
  setWidth(1280);
});

afterEach(() => {
  setWidth(originalWidth);
  vi.clearAllMocks();
});

describe('TrackWallClient', () => {
  it('shows the loading state first, then the columns', async () => {
    getTopTracksMock.mockResolvedValue(makeTracks(10));
    render(<TrackWallClient username="rj" />);

    expect(screen.getByText('Generating your soundscape')).toBeTruthy();
    expect(screen.getByText('rj')).toBeTruthy();
    expect(screen.queryAllByTestId('column')).toHaveLength(0);

    const columns = await screen.findAllByTestId('column');
    expect(columns).toHaveLength(5);
    expect(screen.queryByText('Generating your soundscape')).toBeNull();
    for (const column of columns) {
      expect(Number(column.dataset.count)).toBeGreaterThanOrEqual(MIN_ROWS_PER_COLUMN);
    }
    expect(getTopTracksMock).toHaveBeenCalledWith('rj');
  });

  it('alternates scroll direction between columns', async () => {
    getTopTracksMock.mockResolvedValue(makeTracks(10));
    render(<TrackWallClient username="rj" />);
    const columns = await screen.findAllByTestId('column');
    expect(columns.map((c) => c.dataset.direction)).toEqual(['up', 'down', 'up', 'down', 'up']);
  });

  it('uses 3 columns on narrow screens', async () => {
    setWidth(500);
    getTopTracksMock.mockResolvedValue(makeTracks(10));
    render(<TrackWallClient username="rj" />);
    expect(await screen.findAllByTestId('column')).toHaveLength(3);
  });

  it('renders no columns and no error when the user has no albums with artwork', async () => {
    getTopTracksMock.mockResolvedValue([]);
    render(<TrackWallClient username="rj" />);
    await waitFor(() => expect(screen.queryByText('Generating your soundscape')).toBeNull());
    expect(screen.queryAllByTestId('column')).toHaveLength(0);
    expect(screen.queryByText('Error')).toBeNull();
  });

  it('shows the error message when fetching fails', async () => {
    getTopTracksMock.mockRejectedValue(new Error('Failed to fetch data from Last.fm API.'));
    render(<TrackWallClient username="nobody" />);

    expect(await screen.findByText('Error')).toBeTruthy();
    expect(screen.getByText('Failed to fetch data from Last.fm API.')).toBeTruthy();
    expect(screen.queryAllByTestId('column')).toHaveLength(0);
    expect(screen.queryByText('Generating your soundscape')).toBeNull();
  });

  it('shows a generic message for non-Error rejections', async () => {
    getTopTracksMock.mockRejectedValue('boom');
    render(<TrackWallClient username="rj" />);
    expect(await screen.findByText('An unknown error occurred.')).toBeTruthy();
  });

  it('keeps the screen awake while mounted', async () => {
    getTopTracksMock.mockResolvedValue(makeTracks(10));
    render(<TrackWallClient username="rj" />);
    expect(useWakeLock).toHaveBeenCalled();
    await screen.findAllByTestId('column');
    // Called with no arguments, so the hook's default (enabled) applies.
    expect(vi.mocked(useWakeLock).mock.calls.every((args) => args.length === 0 || args[0] === true)).toBe(true);
  });

  it('refetches when the username changes', async () => {
    getTopTracksMock.mockResolvedValue(makeTracks(10));
    const { rerender } = render(<TrackWallClient username="first" />);
    await screen.findAllByTestId('column');

    rerender(<TrackWallClient username="second" />);
    await waitFor(() => expect(getTopTracksMock).toHaveBeenCalledWith('second'));
    expect(await screen.findAllByTestId('column')).toHaveLength(5);
    expect(getTopTracksMock).toHaveBeenCalledTimes(2);
  });
});
