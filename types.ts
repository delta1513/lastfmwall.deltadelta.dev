
export interface LastFmImage {
  '#text': string;
  size: 'small' | 'medium' | 'large' | 'extralarge';
}

export interface LastFmArtist {
  name: string;
  mbid: string;
  url: string;
}

export interface RawLastFmTrack {
  name: string;
  duration: string;
  playcount: string;
  artist: LastFmArtist;
  image: LastFmImage[];
  url: string;
}

export interface LastFmTrack {
  name: string;
  artist: string;
  imageUrl: string;
}
