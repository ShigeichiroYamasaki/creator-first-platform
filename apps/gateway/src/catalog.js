export const catalog = [
  {
    trackId: 'track-mock-001',
    artistId: 'artist-ao',
    title: 'First Light',
    artistName: 'AO',
    albumTitle: 'Synthetic Dawn',
    durationSeconds: 5,
    accent: '#8b5cf6',
    requiredCapability: 'BASE_PLAN',
    contentVersion: 'synthetic-tone-v1',
    rightsVersion: 'mock-rights-v1',
    fileRef: 'local-test-tone.wav',
    navidromeIdEnv: 'NAVIDROME_MEDIA_ID_TRACK_MOCK_001'
  },
  {
    trackId: 'track-mock-002',
    artistId: 'artist-ao',
    title: 'Supporter Signal',
    artistName: 'AO',
    albumTitle: 'Synthetic Dawn',
    durationSeconds: 5,
    accent: '#22d3ee',
    requiredCapability: 'SUPPORTER',
    contentVersion: 'synthetic-tone-v1',
    rightsVersion: 'mock-rights-v1',
    fileRef: 'local-test-tone.wav',
    navidromeIdEnv: 'NAVIDROME_MEDIA_ID_TRACK_MOCK_002'
  },
  {
    trackId: 'track-mock-003',
    artistId: 'artist-lumen',
    title: 'Early Echo',
    artistName: 'Lumen',
    albumTitle: 'Five Second Studies',
    durationSeconds: 5,
    accent: '#f59e0b',
    requiredCapability: 'EARLY_SUPPORTER',
    contentVersion: 'synthetic-tone-v1',
    rightsVersion: 'mock-rights-v1',
    fileRef: 'local-test-tone.wav',
    navidromeIdEnv: 'NAVIDROME_MEDIA_ID_TRACK_MOCK_003'
  }
]

export function publicTrack(track) {
  const {
    fileRef: _fileRef,
    navidromeIdEnv: _navidromeIdEnv,
    contentVersion: _contentVersion,
    rightsVersion: _rightsVersion,
    ...value
  } = track
  return value
}
