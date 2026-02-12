// Jest test setup file
// Mock DOM elements and global functions

// Mock window.SportsAPI
global.window = global.window || {};
window.SportsAPI = {
  getCurrentDataSourceStatus: jest.fn(() => ({
    successful: ['espn', 'odds_api'],
    rateLimited: [],
    errored: []
  }))
};

// Mock SPORT_MAPPINGS
window.SPORT_MAPPINGS = {
  nfl: { name: 'NFL', icon: 'fa-football-ball' },
  nba: { name: 'NBA', icon: 'fa-basketball-ball' },
  nhl: { name: 'NHL', icon: 'fa-hockey-puck' },
  mlb: { name: 'MLB', icon: 'fa-baseball-ball' }
};

// Mock BETTING_APPS
window.BETTING_APPS = {
  draftkings: { name: 'DraftKings', color: '#53d337' },
  fanduel: { name: 'FanDuel', color: '#1493ff' },
  betmgm: { name: 'BetMGM', color: '#bfa258' }
};

// Console mocks to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
};
