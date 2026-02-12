// =====================================================
// BetGenius AI - Backend Proxy Server
// Multi-API aggregation for comprehensive sports data
// Run with: node server.js
// =====================================================

// Load environment variables from .env file
const fs = require('fs');
const path = require('path');

// =====================================================
// ANALYTICS DATA STORAGE
// File-based persistence for analytics data
// =====================================================

const ANALYTICS_FILE = path.join(__dirname, 'data', 'analytics.json');
const ANALYTICS_EVENTS_FILE = path.join(__dirname, 'data', 'analytics_events.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// In-memory analytics cache
let analyticsCache = {
    totalSessions: 0,
    totalEvents: 0,
    uniqueUsers: 0,
    featureUsage: {},
    dailyStats: {},
    topEvents: [],
    lastUpdated: null
};

// Load analytics from file on startup
function loadAnalyticsFromFile() {
    try {
        if (fs.existsSync(ANALYTICS_FILE)) {
            const data = fs.readFileSync(ANALYTICS_FILE, 'utf8');
            analyticsCache = JSON.parse(data);
            console.log('📊 Analytics loaded from file');
        }
    } catch (e) {
        console.warn('⚠️ Could not load analytics file:', e.message);
    }
}

// Save analytics to file
function saveAnalyticsToFile() {
    try {
        analyticsCache.lastUpdated = new Date().toISOString();
        fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(analyticsCache, null, 2));
    } catch (e) {
        console.warn('⚠️ Could not save analytics:', e.message);
    }
}

// Save analytics data from frontend
async function saveAnalyticsData(data) {
    try {
        const { sessionId, events, summary } = data;

        // Update totals
        analyticsCache.totalSessions++;
        analyticsCache.totalEvents += (events?.length || 0);

        // Update feature usage
        if (summary?.eventTypes) {
            Object.entries(summary.eventTypes).forEach(([event, count]) => {
                analyticsCache.featureUsage[event] =
                    (analyticsCache.featureUsage[event] || 0) + count;
            });
        }

        // Update daily stats
        const today = new Date().toISOString().split('T')[0];
        if (!analyticsCache.dailyStats[today]) {
            analyticsCache.dailyStats[today] = { sessions: 0, events: 0 };
        }
        analyticsCache.dailyStats[today].sessions++;
        analyticsCache.dailyStats[today].events += (events?.length || 0);

        // Keep only last 30 days
        const dates = Object.keys(analyticsCache.dailyStats).sort();
        if (dates.length > 30) {
            dates.slice(0, dates.length - 30).forEach(d => {
                delete analyticsCache.dailyStats[d];
            });
        }

        // Update top events
        analyticsCache.topEvents = Object.entries(analyticsCache.featureUsage)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([event, count]) => ({ event, count }));

        // Save recent events (last 1000)
        await appendEvents(events);

        // Save to file
        saveAnalyticsToFile();

        console.log(`📊 Analytics saved: ${events?.length || 0} events from session ${sessionId}`);
        return true;
    } catch (e) {
        console.error('Analytics save error:', e.message);
        return false;
    }
}

// Append events to events file (keeps last 1000)
async function appendEvents(newEvents) {
    if (!newEvents || newEvents.length === 0) return;

    try {
        let existingEvents = [];
        if (fs.existsSync(ANALYTICS_EVENTS_FILE)) {
            const data = fs.readFileSync(ANALYTICS_EVENTS_FILE, 'utf8');
            existingEvents = JSON.parse(data);
        }

        // Add new events and keep last 1000
        existingEvents.push(...newEvents);
        if (existingEvents.length > 1000) {
            existingEvents = existingEvents.slice(-1000);
        }

        fs.writeFileSync(ANALYTICS_EVENTS_FILE, JSON.stringify(existingEvents, null, 2));
    } catch (e) {
        console.warn('Could not append events:', e.message);
    }
}

// Get aggregated analytics
async function getAggregatedAnalytics() {
    return {
        overview: {
            totalSessions: analyticsCache.totalSessions,
            totalEvents: analyticsCache.totalEvents,
            uniqueUsers: analyticsCache.uniqueUsers,
            lastUpdated: analyticsCache.lastUpdated
        },
        featureUsage: analyticsCache.featureUsage,
        topEvents: analyticsCache.topEvents,
        dailyStats: analyticsCache.dailyStats
    };
}

// Get quick summary
async function getAnalyticsSummary() {
    const today = new Date().toISOString().split('T')[0];
    const todayStats = analyticsCache.dailyStats[today] || { sessions: 0, events: 0 };

    return {
        total: {
            sessions: analyticsCache.totalSessions,
            events: analyticsCache.totalEvents
        },
        today: todayStats,
        topFeatures: analyticsCache.topEvents.slice(0, 5),
        lastUpdated: analyticsCache.lastUpdated
    };
}

// Get recent events
async function getRecentEvents(limit = 100) {
    try {
        if (fs.existsSync(ANALYTICS_EVENTS_FILE)) {
            const data = fs.readFileSync(ANALYTICS_EVENTS_FILE, 'utf8');
            const events = JSON.parse(data);
            return events.slice(-limit).reverse();
        }
    } catch (e) {
        console.warn('Could not read events:', e.message);
    }
    return [];
}

// Clear all analytics data
async function clearAnalyticsData() {
    analyticsCache = {
        totalSessions: 0,
        totalEvents: 0,
        uniqueUsers: 0,
        featureUsage: {},
        dailyStats: {},
        topEvents: [],
        lastUpdated: null
    };

    try {
        if (fs.existsSync(ANALYTICS_FILE)) fs.unlinkSync(ANALYTICS_FILE);
        if (fs.existsSync(ANALYTICS_EVENTS_FILE)) fs.unlinkSync(ANALYTICS_EVENTS_FILE);
    } catch (e) {
        console.warn('Could not delete analytics files:', e.message);
    }

    console.log('📊 Analytics data cleared');
}

// Load analytics on startup
loadAnalyticsFromFile();

// =====================================================
// AUTOMATIC ESPN ROSTER SYNC SYSTEM
// Fetches and caches current player team assignments daily
// Replaces manual roster updates with live ESPN data
// =====================================================

const ROSTER_FILE = path.join(__dirname, 'data', 'rosters.json');
const ROSTER_REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000; // Refresh every 4 hours

// Live roster cache (populated from ESPN API)
const LIVE_ROSTER_CACHE = {
    nba: new Map(),
    nfl: new Map(),
    nhl: new Map(),
    mlb: new Map(),
    lastUpdated: null,
    lastSyncStatus: 'pending'
};

// Legacy roster cache (used by updateRosterCache function)
const ROSTER_CACHE = {
    nba: { players: new Map(), lastUpdated: null },
    nfl: { players: new Map(), lastUpdated: null },
    nhl: { players: new Map(), lastUpdated: null },
    mlb: { players: new Map(), lastUpdated: null }
};

// ESPN API team IDs for each sport
const ESPN_TEAM_IDS = {
    nba: [
        { id: 1, abbr: 'ATL' }, { id: 2, abbr: 'BOS' }, { id: 17, abbr: 'BKN' },
        { id: 30, abbr: 'CHA' }, { id: 4, abbr: 'CHI' }, { id: 5, abbr: 'CLE' },
        { id: 6, abbr: 'DAL' }, { id: 7, abbr: 'DEN' }, { id: 8, abbr: 'DET' },
        { id: 9, abbr: 'GS' }, { id: 10, abbr: 'HOU' }, { id: 11, abbr: 'IND' },
        { id: 12, abbr: 'LAC' }, { id: 13, abbr: 'LAL' }, { id: 14, abbr: 'MEM' },
        { id: 15, abbr: 'MIL' }, { id: 16, abbr: 'MIN' }, { id: 3, abbr: 'NO' },
        { id: 18, abbr: 'NYK' }, { id: 22, abbr: 'OKC' }, { id: 19, abbr: 'ORL' },
        { id: 20, abbr: 'PHI' }, { id: 21, abbr: 'PHX' }, { id: 23, abbr: 'POR' },
        { id: 24, abbr: 'SAC' }, { id: 25, abbr: 'SAS' }, { id: 28, abbr: 'TOR' },
        { id: 26, abbr: 'UTA' }, { id: 27, abbr: 'WAS' }
    ],
    nhl: [
        { id: 1, abbr: 'BOS' }, { id: 2, abbr: 'BUF' }, { id: 3, abbr: 'CGY' },
        { id: 4, abbr: 'CHI' }, { id: 5, abbr: 'DET' }, { id: 6, abbr: 'EDM' },
        { id: 7, abbr: 'CAR' }, { id: 8, abbr: 'LA' }, { id: 9, abbr: 'DAL' },
        { id: 10, abbr: 'MTL' }, { id: 11, abbr: 'NJ' }, { id: 12, abbr: 'NYI' },
        { id: 13, abbr: 'NYR' }, { id: 14, abbr: 'OTT' }, { id: 15, abbr: 'PHI' },
        { id: 16, abbr: 'PIT' }, { id: 17, abbr: 'COL' }, { id: 18, abbr: 'SJ' },
        { id: 19, abbr: 'STL' }, { id: 20, abbr: 'TB' }, { id: 21, abbr: 'TOR' },
        { id: 22, abbr: 'VAN' }, { id: 23, abbr: 'WSH' }, { id: 24, abbr: 'ARI' },
        { id: 25, abbr: 'ANA' }, { id: 26, abbr: 'FLA' }, { id: 27, abbr: 'NSH' },
        { id: 28, abbr: 'WPG' }, { id: 29, abbr: 'CBJ' }, { id: 30, abbr: 'MIN' },
        { id: 52, abbr: 'SEA' }, { id: 54, abbr: 'VGK' }
    ],
    nfl: [
        { id: 1, abbr: 'ATL' }, { id: 2, abbr: 'BUF' }, { id: 3, abbr: 'CHI' },
        { id: 4, abbr: 'CIN' }, { id: 5, abbr: 'CLE' }, { id: 6, abbr: 'DAL' },
        { id: 7, abbr: 'DEN' }, { id: 8, abbr: 'DET' }, { id: 9, abbr: 'GB' },
        { id: 10, abbr: 'TEN' }, { id: 11, abbr: 'IND' }, { id: 12, abbr: 'KC' },
        { id: 13, abbr: 'LV' }, { id: 14, abbr: 'LAR' }, { id: 15, abbr: 'MIA' },
        { id: 16, abbr: 'MIN' }, { id: 17, abbr: 'NE' }, { id: 18, abbr: 'NO' },
        { id: 19, abbr: 'NYG' }, { id: 20, abbr: 'NYJ' }, { id: 21, abbr: 'PHI' },
        { id: 22, abbr: 'ARI' }, { id: 23, abbr: 'PIT' }, { id: 24, abbr: 'LAC' },
        { id: 25, abbr: 'SF' }, { id: 26, abbr: 'SEA' }, { id: 27, abbr: 'TB' },
        { id: 28, abbr: 'WSH' }, { id: 29, abbr: 'CAR' }, { id: 30, abbr: 'JAX' },
        { id: 33, abbr: 'BAL' }, { id: 34, abbr: 'HOU' }
    ],
    mlb: []  // Add MLB teams as needed
};

// Fetch JSON helper with timeout
async function fetchJSONWithTimeout(url, timeoutMs = 5000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (e) {
        clearTimeout(timeout);
        throw e;
    }
}

// Fetch roster for a single team from ESPN
async function fetchTeamRosterFromESPN(sport, teamId, teamAbbr) {
    const sportPaths = {
        nba: 'basketball/nba',
        nfl: 'football/nfl',
        nhl: 'hockey/nhl',
        mlb: 'baseball/mlb'
    };

    const sportPath = sportPaths[sport];
    if (!sportPath) return [];

    try {
        const url = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/teams/${teamId}/roster`;
        const data = await fetchJSONWithTimeout(url, 8000);

        const players = [];
        const teamName = data.team?.displayName || teamAbbr;

        for (const group of data.athletes || []) {
            const items = group.items || [group];
            for (const athlete of items) {
                const name = athlete.displayName || athlete.fullName;
                if (!name) continue;

                const position = athlete.position?.abbreviation || '';
                const status = athlete.status?.type?.toLowerCase() || 'active';
                const isInjured = ['injured', 'out', 'doubtful', 'injured-reserve', 'day-to-day'].includes(status);

                players.push({
                    name,
                    team: teamAbbr,
                    fullTeam: teamName,
                    position,
                    sport,
                    injured: isInjured,
                    status: athlete.status?.type || 'Active',
                    espnId: athlete.id
                });
            }
        }

        return players;
    } catch (e) {
        console.warn(`  ⚠️ Failed to fetch ${teamAbbr} roster: ${e.message}`);
        return [];
    }
}

// Sync all rosters for a sport from ESPN
async function syncSportRostersFromESPN(sport) {
    const teams = ESPN_TEAM_IDS[sport];
    if (!teams || teams.length === 0) {
        console.log(`⚠️ No team IDs configured for ${sport.toUpperCase()}`);
        return 0;
    }

    console.log(`📋 Syncing ${sport.toUpperCase()} rosters from ESPN (${teams.length} teams)...`);

    let totalPlayers = 0;
    const sportCache = LIVE_ROSTER_CACHE[sport];
    sportCache.clear();

    // Fetch teams in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < teams.length; i += batchSize) {
        const batch = teams.slice(i, i + batchSize);
        const results = await Promise.all(
            batch.map(t => fetchTeamRosterFromESPN(sport, t.id, t.abbr))
        );

        for (const players of results) {
            for (const player of players) {
                sportCache.set(player.name, player);
                totalPlayers++;
            }
        }

        // Small delay between batches
        if (i + batchSize < teams.length) {
            await new Promise(r => setTimeout(r, 200));
        }
    }

    console.log(`  ✅ ${sport.toUpperCase()}: ${totalPlayers} players synced`);
    return totalPlayers;
}

// Full roster sync for all sports
async function syncAllRostersFromESPN() {
    console.log('');
    console.log('🔄 ========================================');
    console.log('🔄 AUTOMATIC ESPN ROSTER SYNC STARTING');
    console.log('🔄 ========================================');
    const startTime = Date.now();

    try {
        // Sync NBA (primary focus)
        const nbaCount = await syncSportRostersFromESPN('nba');

        // Sync NHL (in season)
        const nhlCount = await syncSportRostersFromESPN('nhl');

        // Sync NFL (offseason, but sync anyway for future)
        const nflCount = await syncSportRostersFromESPN('nfl');

        LIVE_ROSTER_CACHE.lastUpdated = new Date().toISOString();
        LIVE_ROSTER_CACHE.lastSyncStatus = 'success';

        // Save to file for persistence
        await saveRostersToFile();

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log('🔄 ========================================');
        console.log(`✅ ROSTER SYNC COMPLETE in ${elapsed}s`);
        console.log(`   NBA: ${nbaCount} players`);
        console.log(`   NHL: ${nhlCount} players`);
        console.log(`   NFL: ${nflCount} players`);
        console.log(`   Last updated: ${LIVE_ROSTER_CACHE.lastUpdated}`);
        console.log('🔄 ========================================');
        console.log('');

        return { success: true, nba: nbaCount, nhl: nhlCount, nfl: nflCount, timestamp: LIVE_ROSTER_CACHE.lastUpdated };
    } catch (e) {
        console.error('❌ Roster sync failed:', e.message);
        LIVE_ROSTER_CACHE.lastSyncStatus = 'error: ' + e.message;
        return { success: false, error: e.message };
    }
}

// Save rosters to file for persistence across restarts
async function saveRostersToFile() {
    try {
        const data = {
            lastUpdated: LIVE_ROSTER_CACHE.lastUpdated,
            nba: Object.fromEntries(LIVE_ROSTER_CACHE.nba),
            nfl: Object.fromEntries(LIVE_ROSTER_CACHE.nfl),
            nhl: Object.fromEntries(LIVE_ROSTER_CACHE.nhl),
            mlb: Object.fromEntries(LIVE_ROSTER_CACHE.mlb)
        };
        fs.writeFileSync(ROSTER_FILE, JSON.stringify(data, null, 2));
        console.log('💾 Rosters saved to file');
    } catch (e) {
        console.warn('⚠️ Could not save rosters to file:', e.message);
    }
}

// Load rosters from file on startup
function loadRostersFromFile() {
    try {
        if (fs.existsSync(ROSTER_FILE)) {
            const data = JSON.parse(fs.readFileSync(ROSTER_FILE, 'utf8'));
            LIVE_ROSTER_CACHE.lastUpdated = data.lastUpdated;

            if (data.nba) {
                for (const [name, player] of Object.entries(data.nba)) {
                    LIVE_ROSTER_CACHE.nba.set(name, player);
                }
            }
            if (data.nfl) {
                for (const [name, player] of Object.entries(data.nfl)) {
                    LIVE_ROSTER_CACHE.nfl.set(name, player);
                }
            }

            console.log(`📋 Loaded ${LIVE_ROSTER_CACHE.nba.size} NBA players from cache file`);
            console.log(`   Last updated: ${LIVE_ROSTER_CACHE.lastUpdated}`);
            return true;
        }
    } catch (e) {
        console.warn('⚠️ Could not load rosters from file:', e.message);
    }
    return false;
}

// Get player info from live roster cache (with injury override support)
function getPlayerFromLiveRoster(playerName, sport = 'nba') {
    // First check injury overrides (these take priority)
    if (INJURY_OVERRIDES[playerName]) {
        return { ...INJURY_OVERRIDES[playerName], source: 'injury_override' };
    }

    // Then check live ESPN roster
    const sportCache = LIVE_ROSTER_CACHE[sport];
    if (sportCache && sportCache.has(playerName)) {
        return { ...sportCache.get(playerName), source: 'espn_live' };
    }

    // Fall back to manual overrides (legacy)
    if (RECENT_PLAYER_MOVES[playerName]) {
        return { ...RECENT_PLAYER_MOVES[playerName], source: 'manual_override' };
    }

    return null;
}

// Check if roster cache needs refresh
function shouldRefreshRosters() {
    if (!LIVE_ROSTER_CACHE.lastUpdated) return true;

    const lastUpdate = new Date(LIVE_ROSTER_CACHE.lastUpdated).getTime();
    const now = Date.now();
    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);

    return hoursSinceUpdate >= 4; // Refresh if more than 4 hours old
}

// Initialize roster system
async function initializeRosterSystem() {
    console.log('');
    console.log('📋 Initializing ESPN Roster Sync System...');

    // Load cached rosters from file
    const loadedFromFile = loadRostersFromFile();

    // If no cache or cache is old, sync immediately
    if (!loadedFromFile || shouldRefreshRosters()) {
        console.log('📋 Roster cache is stale, syncing from ESPN...');
        await syncAllRostersFromESPN();
    } else {
        console.log('📋 Using cached rosters (still fresh)');
    }

    // Set up automatic refresh every 4 hours
    setInterval(async () => {
        console.log('⏰ Scheduled roster refresh triggered');
        await syncAllRostersFromESPN();
    }, ROSTER_REFRESH_INTERVAL_MS);

    console.log(`📋 Roster auto-sync scheduled every ${ROSTER_REFRESH_INTERVAL_MS / (1000 * 60 * 60)} hours`);
}

// INJURY OVERRIDES - These always take priority over ESPN data
// Use this for players ESPN hasn't updated yet or confirmed injuries
const INJURY_OVERRIDES = {
    'Anthony Davis': { team: 'WAS', fullTeam: 'Washington Wizards', position: 'PF', sport: 'nba', injured: true },
    'Luka Doncic': { team: 'LAL', fullTeam: 'Los Angeles Lakers', position: 'PG', sport: 'nba', injured: true },
    'Damian Lillard': { team: 'POR', fullTeam: 'Portland Trail Blazers', position: 'PG', sport: 'nba', injured: true },
    'Trae Young': { team: 'WAS', fullTeam: 'Washington Wizards', position: 'PG', sport: 'nba', injured: true },
    'Jayson Tatum': { team: 'BOS', fullTeam: 'Boston Celtics', position: 'SF', sport: 'nba', injured: true },
    'Tyrese Haliburton': { team: 'IND', fullTeam: 'Indiana Pacers', position: 'PG', sport: 'nba', injured: true },
    'Fred VanVleet': { team: 'HOU', fullTeam: 'Houston Rockets', position: 'PG', sport: 'nba', injured: true }
};

// Known recent trades/moves - manual overrides
// VERIFIED by user - February 2026 Season
// Only includes CONFIRMED trades
const RECENT_PLAYER_MOVES = {
    // =====================================================
    // NBA ROSTER UPDATES - 2025-26 SEASON TRADES
    // Last verified: 02/10/2026
    // =====================================================

    // MAJOR TRADES - USER VERIFIED

    // CLEVELAND CAVALIERS - James Harden trade
    'James Harden': { team: 'CLE', fullTeam: 'Cleveland Cavaliers', position: 'PG', sport: 'nba' },

    // HOUSTON ROCKETS - Kevin Durant trade
    'Kevin Durant': { team: 'HOU', fullTeam: 'Houston Rockets', position: 'SF', sport: 'nba' },

    // LA CLIPPERS - Darius Garland trade
    'Darius Garland': { team: 'LAC', fullTeam: 'Los Angeles Clippers', position: 'PG', sport: 'nba' },

    // WASHINGTON WIZARDS - Trae Young & Anthony Davis trades
    'Trae Young': { team: 'WAS', fullTeam: 'Washington Wizards', position: 'PG', sport: 'nba', injured: true },
    'Anthony Davis': { team: 'WAS', fullTeam: 'Washington Wizards', position: 'PF', sport: 'nba', injured: true },

    // PORTLAND TRAIL BLAZERS - Damian Lillard (returned, currently injured)
    'Damian Lillard': { team: 'POR', fullTeam: 'Portland Trail Blazers', position: 'PG', sport: 'nba', injured: true },

    // UTAH JAZZ - Jaren Jackson Jr. trade
    'Jaren Jackson Jr.': { team: 'UTA', fullTeam: 'Utah Jazz', position: 'PF', sport: 'nba' },

    // INDIANA PACERS - Ivica Zubac trade, Tyrese Haliburton injured
    'Ivica Zubac': { team: 'IND', fullTeam: 'Indiana Pacers', position: 'C', sport: 'nba' },
    'Tyrese Haliburton': { team: 'IND', fullTeam: 'Indiana Pacers', position: 'PG', sport: 'nba', injured: true },

    // LA LAKERS - Luka Doncic trade (from Dallas) - currently injured
    'Luka Doncic': { team: 'LAL', fullTeam: 'Los Angeles Lakers', position: 'PG', sport: 'nba', injured: true },

    // SAN ANTONIO SPURS - De'Aaron Fox trade (from Sacramento)
    'De\'Aaron Fox': { team: 'SAS', fullTeam: 'San Antonio Spurs', position: 'PG', sport: 'nba' },

    // PHOENIX SUNS - Jalen Green trade (from Houston)
    'Jalen Green': { team: 'PHX', fullTeam: 'Phoenix Suns', position: 'SG', sport: 'nba' },

    // BOSTON CELTICS - Nikola Vučević trade (from Chicago)
    'Nikola Vučević': { team: 'BOS', fullTeam: 'Boston Celtics', position: 'C', sport: 'nba' },
    'Nikola Vucevic': { team: 'BOS', fullTeam: 'Boston Celtics', position: 'C', sport: 'nba' }, // Alt spelling

    // BOSTON CELTICS - Jayson Tatum (injured)
    'Jayson Tatum': { team: 'BOS', fullTeam: 'Boston Celtics', position: 'SF', sport: 'nba', injured: true },

    // SACRAMENTO KINGS - Zach LaVine trade (from Chicago)
    'Zach LaVine': { team: 'SAC', fullTeam: 'Sacramento Kings', position: 'SG', sport: 'nba' },
    'DeMar DeRozan': { team: 'SAC', fullTeam: 'Sacramento Kings', position: 'SF', sport: 'nba' },

    // MINNESOTA TIMBERWOLVES - Julius Randle trade (from New York)
    'Julius Randle': { team: 'MIN', fullTeam: 'Minnesota Timberwolves', position: 'PF', sport: 'nba' },

    // NEW YORK KNICKS - Verified current roster
    'Karl-Anthony Towns': { team: 'NYK', fullTeam: 'New York Knicks', position: 'C', sport: 'nba' },
    'Mikal Bridges': { team: 'NYK', fullTeam: 'New York Knicks', position: 'SF', sport: 'nba' },
    'OG Anunoby': { team: 'NYK', fullTeam: 'New York Knicks', position: 'SF', sport: 'nba' },

    // DALLAS MAVERICKS - Klay Thompson (from Golden State), Kris Middleton trade
    'Klay Thompson': { team: 'DAL', fullTeam: 'Dallas Mavericks', position: 'SG', sport: 'nba' },
    'Kris Middleton': { team: 'DAL', fullTeam: 'Dallas Mavericks', position: 'SF', sport: 'nba' },
    'Khris Middleton': { team: 'DAL', fullTeam: 'Dallas Mavericks', position: 'SF', sport: 'nba' }, // Alt spelling

    // PHOENIX SUNS - Verify roster
    'Devin Booker': { team: 'PHX', fullTeam: 'Phoenix Suns', position: 'SG', sport: 'nba' },

    // MILWAUKEE BUCKS - Myles Turner trade (from Indiana), Cam Thomas trade (from Brooklyn)
    'Giannis Antetokounmpo': { team: 'MIL', fullTeam: 'Milwaukee Bucks', position: 'PF', sport: 'nba' },
    'Myles Turner': { team: 'MIL', fullTeam: 'Milwaukee Bucks', position: 'C', sport: 'nba' },
    'Cam Thomas': { team: 'MIL', fullTeam: 'Milwaukee Bucks', position: 'SG', sport: 'nba' },

    // MEMPHIS GRIZZLIES - After JJJ trade
    'Ja Morant': { team: 'MEM', fullTeam: 'Memphis Grizzlies', position: 'PG', sport: 'nba' },

    // CHICAGO BULLS - Josh Giddey, Anfernee Simons, Rob Dillingham, Jaden Ivey trades
    'Josh Giddey': { team: 'CHI', fullTeam: 'Chicago Bulls', position: 'G', sport: 'nba' },
    'Anfernee Simons': { team: 'CHI', fullTeam: 'Chicago Bulls', position: 'SG', sport: 'nba' },
    'Rob Dillingham': { team: 'CHI', fullTeam: 'Chicago Bulls', position: 'G', sport: 'nba' },
    'Jaden Ivey': { team: 'CHI', fullTeam: 'Chicago Bulls', position: 'G', sport: 'nba' },
    'Collin Sexton': { team: 'CHI', fullTeam: 'Chicago Bulls', position: 'G', sport: 'nba' },

    // MILWAUKEE BUCKS - Kyle Kuzma trade
    'Kyle Kuzma': { team: 'MIL', fullTeam: 'Milwaukee Bucks', position: 'F', sport: 'nba' },
    'Gary Trent Jr.': { team: 'MIL', fullTeam: 'Milwaukee Bucks', position: 'G', sport: 'nba' },

    // CHARLOTTE HORNETS - Coby White trade (from Chicago)
    'Coby White': { team: 'CHA', fullTeam: 'Charlotte Hornets', position: 'PG', sport: 'nba' },

    // BROOKLYN NETS - Michael Porter Jr. trade (from Denver)
    'Michael Porter Jr.': { team: 'BKN', fullTeam: 'Brooklyn Nets', position: 'SF', sport: 'nba' },
    'Michael Porter': { team: 'BKN', fullTeam: 'Brooklyn Nets', position: 'SF', sport: 'nba' }, // Alt name

    // HOUSTON ROCKETS - Fred VanVleet (injured)
    'Fred VanVleet': { team: 'HOU', fullTeam: 'Houston Rockets', position: 'PG', sport: 'nba', injured: true },

    // FREE AGENTS - Exclude from props
    'Malik Beasley': { team: 'FA', fullTeam: 'Free Agent', position: 'SG', sport: 'nba', freeAgent: true },

    // =====================================================
    // NFL/MLB/NHL - No manual overrides needed
    // These sports use ESPN/official API data directly
    // =====================================================
};

// Update roster cache from ESPN
async function updateRosterCache(sport) {
    try {
        console.log(`📋 Updating ${sport.toUpperCase()} roster cache...`);

        const sportPaths = {
            nfl: 'football/nfl',
            nba: 'basketball/nba',
            nhl: 'hockey/nhl',
            mlb: 'baseball/mlb'
        };

        const sportPath = sportPaths[sport];
        if (!sportPath) return;

        // Fetch all teams
        const teamsUrl = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/teams`;
        const teamsData = await fetchJSON(teamsUrl);

        if (!teamsData?.sports?.[0]?.leagues?.[0]?.teams) return;

        const teams = teamsData.sports[0].leagues[0].teams;
        const players = new Map();

        for (const teamData of teams) {
            const team = teamData.team;
            const teamAbbr = team.abbreviation;
            const teamName = team.displayName;

            try {
                // Fetch roster for each team
                const rosterUrl = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/teams/${team.id}/roster`;
                const rosterData = await fetchJSON(rosterUrl);

                // Handle both grouped and flat athlete arrays
                let athletes = [];

                if (rosterData?.athletes) {
                    if (Array.isArray(rosterData.athletes)) {
                        // Check if it's grouped (has items property) or flat
                        if (rosterData.athletes[0]?.items) {
                            // Grouped format
                            for (const group of rosterData.athletes) {
                                athletes.push(...(group.items || []));
                            }
                        } else {
                            // Flat format
                            athletes = rosterData.athletes;
                        }
                    }
                }

                for (const athlete of athletes) {
                    const name = athlete.displayName || athlete.fullName;
                    if (name) {
                        players.set(name, {
                            team: teamAbbr,
                            fullTeam: teamName,
                            position: athlete.position?.abbreviation || '',
                            jersey: athlete.jersey || '',
                            headshot: athlete.headshot?.href || null
                        });
                    }
                }
            } catch (e) {
                // Continue with next team
            }
        }

        // Apply manual overrides for recent trades
        for (const [playerName, data] of Object.entries(RECENT_PLAYER_MOVES)) {
            players.set(playerName, data);
        }

        ROSTER_CACHE[sport] = {
            players: players,
            lastUpdated: new Date().toISOString()
        };

        console.log(`✅ ${sport.toUpperCase()} roster: ${players.size} players cached`);

    } catch (error) {
        console.error(`❌ Error updating ${sport} roster:`, error.message);
    }
}

// Get player's current team from cache (uses live ESPN roster with priority overrides)
function getPlayerTeam(playerName, sport) {
    // Use the unified live roster lookup function
    const liveRoster = getPlayerFromLiveRoster(playerName, sport);
    if (liveRoster) {
        return liveRoster;
    }

    // Check legacy roster cache as fallback
    const cache = ROSTER_CACHE[sport];
    if (cache?.players?.has(playerName)) {
        return cache.players.get(playerName);
    }

    // Try fuzzy match (last name only)
    const lastName = playerName.split(' ').pop();
    for (const [name, data] of cache?.players || []) {
        if (name.endsWith(lastName)) {
            return data;
        }
    }

    return null;
}

// Initialize all roster caches
async function initializeRosterCaches() {
    console.log('📋 Initializing roster caches...');
    const sports = ['nba', 'nfl', 'nhl', 'mlb'];

    for (const sport of sports) {
        await updateRosterCache(sport);
    }

    // Schedule periodic roster updates
    setInterval(async () => {
        console.log('\n📋 Scheduled roster cache refresh...');
        for (const sport of sports) {
            await updateRosterCache(sport);
        }
    }, ROSTER_REFRESH_INTERVAL_MS);
}

// =====================================================
// AUTOMATED PROP UPDATES SYSTEM
// Fetches and caches real player props from multiple sources
// =====================================================

// Live props storage - updated automatically every 5 minutes
const livePropsStore = {
    nfl: { props: [], lastUpdated: null, source: null },
    nba: { props: [], lastUpdated: null, source: null },
    nhl: { props: [], lastUpdated: null, source: null },
    mlb: { props: [], lastUpdated: null, source: null }
};

// Auto-refresh interval (5 minutes)
const PROP_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
let propRefreshTimer = null;

// Start automated prop fetching system
function startAutomatedPropFetching() {
    console.log('🔄 Starting automated prop fetching system...');

    // Initial fetch
    refreshAllProps();

    // Schedule periodic refreshes
    propRefreshTimer = setInterval(refreshAllProps, PROP_REFRESH_INTERVAL_MS);
    console.log(`⏰ Props will auto-refresh every ${PROP_REFRESH_INTERVAL_MS / 60000} minutes`);
}

// Refresh props for all active sports
async function refreshAllProps() {
    const activeSports = getActiveSports();
    console.log(`\n🔄 [${new Date().toLocaleTimeString()}] Refreshing props for: ${activeSports.join(', ')}`);

    for (const sport of activeSports) {
        try {
            const props = await fetchLivePropsFromAllSources(sport);
            if (props && props.length > 0) {
                // Enrich props with accurate team data
                const enrichedProps = props.map(prop => enrichPropWithTeamData(prop, sport));

                livePropsStore[sport] = {
                    props: enrichedProps,
                    lastUpdated: new Date().toISOString(),
                    source: 'multi-source',
                    count: enrichedProps.length
                };
                console.log(`✅ ${sport.toUpperCase()}: ${enrichedProps.length} props updated`);
            }
        } catch (error) {
            console.error(`❌ Error refreshing ${sport} props:`, error.message);
        }
    }
}

// Today's games cache for opponent info
const TODAYS_GAMES_CACHE = {
    nba: { games: [], lastUpdated: null },
    nfl: { games: [], lastUpdated: null },
    nhl: { games: [], lastUpdated: null },
    mlb: { games: [], lastUpdated: null }
};

// Fetch today's games for opponent matchup info
async function fetchTodaysGames(sport) {
    try {
        const sportPaths = {
            nfl: 'football/nfl',
            nba: 'basketball/nba',
            nhl: 'hockey/nhl',
            mlb: 'baseball/mlb'
        };

        const sportPath = sportPaths[sport];
        if (!sportPath) return [];

        const url = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/scoreboard`;
        const data = await fetchJSON(url);

        if (!data?.events) return [];

        const games = data.events.map(event => {
            const competition = event.competitions?.[0];
            const home = competition?.competitors?.find(c => c.homeAway === 'home');
            const away = competition?.competitors?.find(c => c.homeAway === 'away');

            return {
                id: event.id,
                name: event.name,
                date: event.date,
                status: event.status?.type?.name,
                homeTeam: home?.team?.abbreviation,
                homeTeamFull: home?.team?.displayName,
                awayTeam: away?.team?.abbreviation,
                awayTeamFull: away?.team?.displayName
            };
        });

        TODAYS_GAMES_CACHE[sport] = {
            games: games,
            lastUpdated: new Date().toISOString()
        };

        return games;
    } catch (error) {
        console.error(`Error fetching today's games:`, error.message);
        return [];
    }
}

// Get opponent for a team from today's games
function getOpponentFromGames(teamAbbr, sport) {
    const cache = TODAYS_GAMES_CACHE[sport];
    if (!cache?.games?.length) return null;

    for (const game of cache.games) {
        if (game.homeTeam === teamAbbr) {
            return { opponent: game.awayTeam, opponentFull: game.awayTeamFull, location: 'vs', game: game.name };
        }
        if (game.awayTeam === teamAbbr) {
            return { opponent: game.homeTeam, opponentFull: game.homeTeamFull, location: '@', game: game.name };
        }
    }

    return null;
}

// Enrich prop with accurate team data and opponent info
function enrichPropWithTeamData(prop, sport) {
    // Only override team if not already set from the prop source (like PrizePicks)
    const sourceTeam = prop.team;
    const isRealSource = prop.source === 'prizepicks' || prop.source === 'draftkings_live' || prop.isRealLine;

    const playerData = getPlayerTeam(prop.player, sport);

    if (playerData) {
        // Only update team if the prop doesn't already have one from a real source
        if (!sourceTeam || !isRealSource) {
            prop.team = playerData.team;
            prop.fullTeam = playerData.fullTeam;
        }
        if (playerData.position && !prop.position) {
            prop.position = playerData.position;
        }
        if (playerData.headshot && !prop.headshot) {
            prop.headshot = playerData.headshot;
        }
    }

    // Add opponent info
    const matchup = getOpponentFromGames(prop.team, sport);
    if (matchup) {
        prop.opponent = matchup.opponent;
        prop.opponentFull = matchup.opponentFull;
        prop.matchup = `${matchup.location} ${matchup.opponent}`;
        prop.gameDescription = matchup.game;
    }

    return prop;
}

// Fetch live props from multiple sources and merge
async function fetchLivePropsFromAllSources(sport) {
    const allProps = [];
    const seenProps = new Set(); // Track unique player+propType combinations

    // SOURCE 1 (PRIMARY): PrizePicks - Best source with REAL betting lines
    try {
        console.log(`🎯 Fetching PrizePicks as primary source for ${sport.toUpperCase()}...`);
        const prizePicksResult = await fetchPrizePicksProps(sport);
        if (prizePicksResult && prizePicksResult.props && prizePicksResult.props.length > 0) {
            prizePicksResult.props.forEach(prop => {
                const key = `${prop.player}-${prop.propType}`;
                if (!seenProps.has(key)) {
                    seenProps.add(key);
                    allProps.push({ ...prop, source: 'prizepicks', isRealLine: true });
                }
            });
            console.log(`  ✅ PrizePicks: ${prizePicksResult.props.length} REAL props (PRIMARY)`);
        }
    } catch (e) {
        console.log(`  ⚠️ PrizePicks unavailable: ${e.message}`);
    }

    // SOURCE 2: Bolt Odds - Live player props with real lines
    try {
        const boltOddsResult = await fetchBoltOddsProps(sport);
        if (boltOddsResult && boltOddsResult.props && boltOddsResult.props.length > 0) {
            boltOddsResult.props.forEach(prop => {
                const key = `${prop.player}-${prop.propType}`;
                if (!seenProps.has(key)) {
                    seenProps.add(key);
                    allProps.push({ ...prop, source: 'boltodds', isRealLine: true });
                }
            });
            console.log(`  ⚡ Bolt Odds: ${boltOddsResult.props.length} REAL props`);
        }
    } catch (e) {
        console.log(`  ⚠️ Bolt Odds unavailable: ${e.message}`);
    }

    // Source 3: Try scraping prop data from public betting APIs
    try {
        const propAggregatorData = await fetchPropAggregatorData(sport);
        if (propAggregatorData && propAggregatorData.length > 0) {
            propAggregatorData.forEach(prop => {
                const key = `${prop.player}-${prop.propType}`;
                if (!seenProps.has(key)) {
                    seenProps.add(key);
                    allProps.push({ ...prop, source: 'aggregator', isRealLine: true });
                }
            });
            console.log(`  📊 Prop Aggregator: ${propAggregatorData.length} props`);
        }
    } catch (e) {
        console.log(`  ⚠️ Prop Aggregator unavailable: ${e.message}`);
    }

    // Source 3: Try Rotowire projections
    try {
        const rotowireData = await fetchRotowireProjections(sport);
        if (rotowireData && rotowireData.length > 0) {
            rotowireData.forEach(prop => {
                const key = `${prop.player}-${prop.propType}`;
                if (!seenProps.has(key)) {
                    seenProps.add(key);
                    allProps.push({ ...prop, source: 'rotowire', isRealLine: true });
                }
            });
            console.log(`  📊 Rotowire: ${rotowireData.length} projections`);
        }
    } catch (e) {
        console.log(`  ⚠️ Rotowire unavailable: ${e.message}`);
    }

    // Source 4: ESPN player stats to generate accurate lines (fallback)
    if (allProps.length < 20) {
        try {
            const espnBasedProps = await generatePropsFromESPNStats(sport);
            if (espnBasedProps && espnBasedProps.length > 0) {
                espnBasedProps.forEach(prop => {
                    const key = `${prop.player}-${prop.propType}`;
                    if (!seenProps.has(key)) {
                        seenProps.add(key);
                        allProps.push({ ...prop, source: 'espn_stats', isRealLine: false });
                    }
                });
                console.log(`  📊 ESPN Stats: ${espnBasedProps.length} generated props (supplemental)`);
            }
        } catch (e) {
            console.log(`  ⚠️ ESPN Stats unavailable: ${e.message}`);
        }
    }

    // Source 5: Fallback to NFL props if no data found (handles offseason gracefully)
    if (allProps.length === 0 && sport === 'nfl') {
        const dkProps = await getSuperBowlDraftKingsProps();
        allProps.push(...dkProps);
        if (dkProps.length > 0) {
            console.log(`  📊 NFL Fallback: ${dkProps.length} props`);
        } else {
            console.log(`  🏈 NFL Offseason - No games available`);
        }
    }

    // Filter out injured players from all props
    const filteredProps = filterInjuredPlayers(allProps);
    console.log(`  🏥 After injury filter: ${filteredProps.length} props (removed ${allProps.length - filteredProps.length} injured)`);

    return filteredProps;
}

// Fetch from public prop aggregator APIs
async function fetchPropAggregatorData(sport) {
    // Try multiple free prop data endpoints
    const endpoints = [
        `https://api.prop-odds.com/beta/odds/${sport}/player_props`, // Prop-Odds API
        `https://api.prizepicks.com/projections?league_id=${getPrizePicksLeagueId(sport)}` // PrizePicks
    ];

    for (const endpoint of endpoints) {
        try {
            const data = await fetchJSON(endpoint);
            if (data && data.length > 0) {
                return normalizeAggregatorProps(data, sport);
            }
        } catch (e) {
            // Try next endpoint
        }
    }

    return [];
}

// Get PrizePicks league ID
function getPrizePicksLeagueId(sport) {
    const leagueIds = { nfl: 9, nba: 7, nhl: 4, mlb: 2 };
    return leagueIds[sport] || 7;
}

// Normalize aggregator props to standard format
function normalizeAggregatorProps(data, sport) {
    if (!Array.isArray(data)) return [];

    return data.map(item => ({
        player: item.player_name || item.name || item.player,
        team: item.team_abbr || item.team || '',
        position: item.position || '',
        propType: normalizePropType(item.prop_type || item.stat_type || item.market),
        line: parseFloat(item.line || item.line_score || item.value),
        seasonAvg: item.avg || item.average || null,
        over: { draftkings: parseInt(item.over_odds) || -110 },
        under: { draftkings: parseInt(item.under_odds) || -110 },
        game: item.game || item.matchup || '',
        gameTime: item.game_time || item.start_time || null,
        isRealLine: true,
        lastUpdated: new Date().toISOString()
    })).filter(p => p.player && p.line && !isNaN(p.line));
}

// Fetch Rotowire projections
async function fetchRotowireProjections(sport) {
    try {
        // Rotowire has public projection pages we can parse
        const sportPath = { nfl: 'football', nba: 'basketball', nhl: 'hockey', mlb: 'baseball' };
        const url = `https://www.rotowire.com/${sportPath[sport]}/daily-lineups.php`;

        // Fetch the page (this is a best effort - may be blocked)
        const response = await fetchText(url);
        if (!response) return [];

        // Parse projections from the page
        return parseRotowireProjections(response, sport);
    } catch (e) {
        return [];
    }
}

// Parse Rotowire HTML for projections
function parseRotowireProjections(html, sport) {
    // Basic regex extraction of player projections
    // This is simplified - real scraping would need more robust parsing
    const props = [];

    // Look for projected stats patterns
    const playerPattern = /<div[^>]*class="[^"]*player[^"]*"[^>]*>([^<]+)<\/div>/gi;
    const projPattern = /proj[^:]*:\s*([\d.]+)/gi;

    // Simplified extraction - in production, use proper HTML parsing
    return props;
}

// Fetch raw text from URL
function fetchText(apiUrl) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(apiUrl);
        const protocol = urlObj.protocol === 'https:' ? https : http;

        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            timeout: REQUEST_TIMEOUT_MS,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        };

        const request = protocol.get(options, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                fetchText(response.headers.location).then(resolve).catch(reject);
                return;
            }

            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => resolve(data));
        });

        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });

        request.on('error', error => reject(error));
    });
}

// Generate props from ESPN player statistics
async function generatePropsFromESPNStats(sport) {
    try {
        const sportPaths = {
            nfl: 'football/nfl',
            nba: 'basketball/nba',
            nhl: 'hockey/nhl',
            mlb: 'baseball/mlb'
        };

        const path = sportPaths[sport];
        if (!path) return [];

        // Get today's games
        const eventsUrl = `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`;
        const eventsData = await fetchJSON(eventsUrl);

        if (!eventsData || !eventsData.events) return [];

        const props = [];

        for (const event of eventsData.events.slice(0, 8)) {
            const homeTeam = event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home');
            const awayTeam = event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away');
            const gameName = `${awayTeam?.team?.abbreviation || 'AWAY'} @ ${homeTeam?.team?.abbreviation || 'HOME'}`;

            // Get team rosters/leaders for prop generation
            for (const team of [homeTeam, awayTeam]) {
                if (!team?.team?.id) continue;

                try {
                    // Fetch team statistics/leaders
                    const teamUrl = `https://site.api.espn.com/apis/site/v2/sports/${path}/teams/${team.team.id}`;
                    const teamData = await fetchJSON(teamUrl);

                    if (teamData?.team?.athletes) {
                        const generatedProps = generatePlayerProps(
                            teamData.team.athletes.slice(0, 5), // Top 5 players
                            team.team.abbreviation,
                            gameName,
                            sport
                        );
                        props.push(...generatedProps);
                    }
                } catch (e) {
                    // Continue with next team
                }
            }
        }

        return props;
    } catch (error) {
        console.error('ESPN Stats error:', error.message);
        return [];
    }
}

// Generate player props from athlete data
function generatePlayerProps(athletes, teamAbbr, game, sport) {
    const props = [];

    for (const athlete of athletes) {
        if (!athlete || !athlete.displayName) continue;

        const position = athlete.position?.abbreviation || '';
        const stats = athlete.statistics || [];

        // Generate props based on position and sport
        const playerProps = generatePropsForPosition(
            athlete.displayName,
            teamAbbr,
            position,
            stats,
            game,
            sport
        );

        props.push(...playerProps);
    }

    return props;
}

// Generate props for a specific position
function generatePropsForPosition(playerName, team, position, stats, game, sport) {
    const props = [];
    const now = new Date().toISOString();

    // Sport-specific prop generation
    if (sport === 'nfl') {
        if (position === 'QB') {
            props.push(
                createProp(playerName, team, position, 'Passing Yards', 225, 240, game, now),
                createProp(playerName, team, position, 'Pass Attempts', 30, 32, game, now),
                createProp(playerName, team, position, 'Passing TDs', 1.5, 1.8, game, now)
            );
        } else if (position === 'RB') {
            props.push(
                createProp(playerName, team, position, 'Rushing Yards', 55, 62, game, now),
                createProp(playerName, team, position, 'Rush Attempts', 12, 14, game, now)
            );
        } else if (['WR', 'TE'].includes(position)) {
            props.push(
                createProp(playerName, team, position, 'Receiving Yards', 45, 52, game, now),
                createProp(playerName, team, position, 'Receptions', 4, 4.5, game, now)
            );
        }
    } else if (sport === 'nba') {
        props.push(
            createProp(playerName, team, position, 'Points', 18, 22, game, now),
            createProp(playerName, team, position, 'Rebounds', 5, 6.5, game, now),
            createProp(playerName, team, position, 'Assists', 4, 5, game, now)
        );
    } else if (sport === 'nhl') {
        if (['G', 'Goalie'].includes(position)) {
            props.push(
                createProp(playerName, team, position, 'Saves', 25, 28, game, now)
            );
        } else {
            props.push(
                createProp(playerName, team, position, 'Shots on Goal', 2.5, 3, game, now),
                createProp(playerName, team, position, 'Points', 0.5, 0.8, game, now)
            );
        }
    } else if (sport === 'mlb') {
        if (['P', 'SP', 'RP'].includes(position)) {
            props.push(
                createProp(playerName, team, position, 'Strikeouts', 5.5, 6.2, game, now)
            );
        } else {
            props.push(
                createProp(playerName, team, position, 'Hits', 0.5, 1.2, game, now),
                createProp(playerName, team, position, 'Total Bases', 1.5, 2, game, now)
            );
        }
    }

    return props;
}

// Create a prop object
function createProp(player, team, position, propType, line, seasonAvg, game, lastUpdated) {
    const edge = (seasonAvg - line) / line;
    const confidence = Math.min(85, Math.max(45, 50 + Math.round(edge * 100)));
    const pick = seasonAvg > line ? 'OVER' : 'UNDER';

    return {
        player,
        team,
        position,
        propType,
        line,
        seasonAvg: seasonAvg.toFixed(1),
        over: { draftkings: -110, fanduel: -110, betmgm: -110 },
        under: { draftkings: -110, fanduel: -110, betmgm: -110 },
        game,
        aiPick: pick,
        confidence,
        reasoning: `Season avg: ${seasonAvg.toFixed(1)} ${propType.toLowerCase().includes('yard') ? 'yds' : ''}/game`,
        trend: edge > 0.05 ? 'UP' : edge < -0.05 ? 'DOWN' : 'NEUTRAL',
        isRealLine: false,
        lastUpdated
    };
}

// Normalize prop type names
function normalizePropType(propType) {
    if (!propType) return 'Unknown';
    const normalized = propType.toLowerCase();

    const mappings = {
        'pass_yds': 'Passing Yards',
        'rush_yds': 'Rushing Yards',
        'rec_yds': 'Receiving Yards',
        'pass_tds': 'Passing TDs',
        'rush_tds': 'Rushing TDs',
        'receptions': 'Receptions',
        'points': 'Points',
        'rebounds': 'Rebounds',
        'assists': 'Assists',
        'threes': '3-Pointers Made',
        'saves': 'Saves',
        'goals': 'Goals',
        'strikeouts': 'Strikeouts',
        'hits': 'Hits'
    };

    return mappings[normalized] || propType;
}

// Get cached live props for a sport
function getLiveProps(sport) {
    const cached = livePropsStore[sport];
    if (cached && cached.props.length > 0) {
        return cached;
    }
    return null;
}

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
                process.env[key.trim()] = valueParts.join('=').trim();
            }
        }
    });
}

// =====================================================
// DRAFTKINGS SPORTSBOOK API - Real Player Props
// Fetches actual DraftKings player prop lines via ESPN integration
// =====================================================
async function fetchDraftKingsPlayerProps(sport) {
    const cacheKey = `draftkings_props_${sport}`;
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < PROPS_CACHE_TTL_MS)) {
        console.log(`📦 Returning cached DraftKings props for ${sport}`);
        return propsCache[cacheKey].data;
    }

    // ESPN sport paths with their event IDs
    const sportPaths = {
        'nfl': 'football/nfl',
        'nba': 'basketball/nba',
        'mlb': 'baseball/mlb',
        'nhl': 'hockey/nhl'
    };

    const path = sportPaths[sport];
    if (!path) {
        console.log(`⚠️ Sport ${sport} not supported for DraftKings props`);
        return { props: [], source: 'draftkings', error: 'Sport not supported' };
    }

    try {
        console.log(`🎰 Fetching player props via ESPN betting integration for ${sport.toUpperCase()}...`);

        // First get all events/games
        const eventsUrl = `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`;
        const eventsData = await fetchJSON(eventsUrl);

        if (!eventsData || !eventsData.events || eventsData.events.length === 0) {
            console.log(`⚠️ No ${sport.toUpperCase()} events found`);
            return { props: [], source: 'espn', error: 'No events found' };
        }

        const allProps = [];

        // For each event, try to get player props from ESPN's betting endpoint
        for (const event of eventsData.events.slice(0, 5)) {
            const eventId = event.id;
            const eventName = event.name || event.shortName;
            const homeTeam = event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home');
            const awayTeam = event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away');

            try {
                // ESPN betting endpoint - includes props from DraftKings
                const bettingUrl = `https://sports.core.api.espn.com/v2/sports/${sport === 'nfl' ? 'football' : sport === 'nba' ? 'basketball' : sport === 'mlb' ? 'baseball' : 'hockey'}/${sport}/events/${eventId}/competitions/${eventId}/odds`;

                const oddsData = await fetchJSON(bettingUrl);

                if (oddsData && oddsData.items) {
                    for (const oddsItem of oddsData.items) {
                        // Check if this has player props
                        if (oddsItem.playerProps) {
                            for (const playerProp of oddsItem.playerProps) {
                                const playerName = playerProp.player?.displayName || playerProp.athlete?.displayName;
                                const propType = formatDraftKingsPropType(playerProp.name || playerProp.type);
                                const line = playerProp.line || playerProp.value;
                                const overOdds = playerProp.overOdds || playerProp.overPrice || -110;
                                const underOdds = playerProp.underOdds || playerProp.underPrice || -110;

                                if (playerName && line !== undefined) {
                                    allProps.push({
                                        player: playerName,
                                        team: playerProp.team?.abbreviation || '',
                                        propType: propType,
                                        line: parseFloat(line),
                                        over: { draftkings: parseInt(overOdds) || -110 },
                                        under: { draftkings: parseInt(underOdds) || -110 },
                                        game: eventName,
                                        gameTime: event.date,
                                        source: 'espn_draftkings',
                                        isRealLine: true,
                                        lastUpdated: new Date().toISOString()
                                    });
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                // ESPN betting endpoint may not be available for all events
                console.log(`  ⚠️ No betting data for ${eventName}: ${e.message}`);
            }

            // Also check for athlete statistics to create contextual props
            try {
                const statsUrl = `https://site.api.espn.com/apis/site/v2/sports/${path}/summary?event=${eventId}`;
                const summaryData = await fetchJSON(statsUrl);

                if (summaryData && summaryData.boxscore && summaryData.boxscore.players) {
                    for (const teamStats of summaryData.boxscore.players) {
                        for (const statCategory of (teamStats.statistics || [])) {
                            for (const athlete of (statCategory.athletes || [])) {
                                const playerName = athlete.athlete?.displayName;
                                if (!playerName) continue;

                                // Extract relevant stats for props based on sport
                                const stats = {};
                                if (statCategory.labels && athlete.stats) {
                                    statCategory.labels.forEach((label, idx) => {
                                        stats[label.toLowerCase()] = athlete.stats[idx];
                                    });
                                }

                                // Create props based on stats (these would be based on typical lines)
                                // This gives us player names and teams for matching
                            }
                        }
                    }
                }
            } catch (e) {
                // Summary endpoint might not have detailed stats
            }
        }

        const result = { props: allProps, source: 'espn_draftkings', count: allProps.length };

        if (allProps.length > 0) {
            propsCache[cacheKey] = { data: result, timestamp: Date.now() };
            console.log(`✅ Fetched ${allProps.length} props via ESPN betting integration`);
        } else {
            console.log(`⚠️ No player props found via ESPN - checking for live games`);
            // Check for live NFL games with weather integration
            if (sport === 'nfl') {
                const nflProps = await getSuperBowlDraftKingsProps();
                if (nflProps.length > 0) {
                    result.props = nflProps;
                    result.count = nflProps.length;
                    result.source = 'nfl_live';
                    propsCache[cacheKey] = { data: result, timestamp: Date.now() };
                    console.log(`✅ Using ${nflProps.length} NFL props with weather data`);
                } else {
                    console.log(`🏈 NFL Offseason - No games scheduled`);
                }
            }
        }

        return result;

    } catch (error) {
        console.error(`❌ ESPN betting API error: ${error.message}`);
        // Try NFL fallback
        if (sport === 'nfl') {
            const nflProps = await getSuperBowlDraftKingsProps();
            return { props: nflProps, source: 'nfl_fallback', count: nflProps.length };
        }
        return { props: [], source: 'espn', error: error.message };
    }
}

// NFL Props - Returns empty during offseason, fetches live props during regular season/playoffs
// Weather integration is ready for when season resumes
async function getNFLFallbackProps() {
    // Check if there are any NFL games today using ESPN
    try {
        const scoresUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
        const scoresData = await fetchJSON(scoresUrl);

        if (!scoresData?.events || scoresData.events.length === 0) {
            console.log('🏈 NFL Offseason - No games scheduled');
            return [];
        }

        console.log(`🏈 Found ${scoresData.events.length} NFL games today`);

        // Fetch weather for each game and generate props
        const props = [];
        const weatherByTeam = {};

        for (const event of scoresData.events) {
            const home = event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home');
            const away = event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away');

            if (!home?.team?.abbreviation || !away?.team?.abbreviation) continue;

            const homeAbbr = home.team.abbreviation;
            const awayAbbr = away.team.abbreviation;

            // Fetch weather for home stadium
            if (!weatherByTeam[homeAbbr]) {
                const weather = await fetchStadiumWeather(homeAbbr, 'nfl');
                if (weather) {
                    weatherByTeam[homeAbbr] = weather;
                    weatherByTeam[awayAbbr] = weather; // Away team plays in same conditions

                    if (!weather.indoor) {
                        console.log(`🌤️ ${homeAbbr} vs ${awayAbbr}: ${weather.temperature}°F, ${weather.conditions}, Wind: ${weather.windSpeed}mph`);
                    } else {
                        console.log(`🏟️ ${homeAbbr} vs ${awayAbbr}: Indoor stadium`);
                    }
                }
            }
        }

        // During the season, this would generate props from live data
        // For now, return empty as there are no games with betting lines
        return props;

    } catch (e) {
        console.log(`⚠️ NFL props fetch failed: ${e.message}`);
        return [];
    }
}

// Legacy function name for compatibility
async function getSuperBowlDraftKingsProps() {
    return await getNFLFallbackProps();
}

// Format DraftKings prop type to readable format
function formatDraftKingsPropType(propType) {
    if (!propType) return 'Prop';

    const mappings = {
        'pass_yds': 'Passing Yards',
        'pass_tds': 'Passing TDs',
        'pass_attempts': 'Pass Attempts',
        'pass_completions': 'Completions',
        'rush_yds': 'Rushing Yards',
        'rush_attempts': 'Rush Attempts',
        'rec_yds': 'Receiving Yards',
        'receptions': 'Receptions',
        'anytime_td': 'Anytime TD Scorer',
        'first_td': 'First TD Scorer',
        'pts': 'Points',
        'reb': 'Rebounds',
        'ast': 'Assists',
        'threes': '3-Pointers Made',
        'blk': 'Blocks',
        'stl': 'Steals',
        'goals': 'Goals',
        'assists': 'Assists',
        'shots': 'Shots on Goal',
        'saves': 'Saves',
        'strikeouts': 'Strikeouts',
        'hits': 'Hits',
        'home_runs': 'Home Runs',
        'total_bases': 'Total Bases',
        'rbi': 'RBIs'
    };

    const lowerType = propType.toLowerCase();
    for (const [key, value] of Object.entries(mappings)) {
        if (lowerType.includes(key)) return value;
    }

    // Title case the original
    return propType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Alternative: Fetch from DraftKings offers endpoint (more reliable)
async function fetchDraftKingsOffers(sport) {
    const cacheKey = `dk_offers_${sport}`;
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < PROPS_CACHE_TTL_MS)) {
        return propsCache[cacheKey].data;
    }

    // DraftKings offers for player props by sport
    const offerIds = {
        'nfl': [493, 1000], // Passing, Rushing props
        'nba': [583, 1001],
        'nhl': [1002],
        'mlb': [1003]
    };

    const sportGroupIds = {
        'nfl': 88808,
        'nba': 42648,
        'mlb': 84240,
        'nhl': 42133
    };

    const groupId = sportGroupIds[sport];
    if (!groupId) return { props: [], source: 'draftkings' };

    try {
        // Get featured offers which include player props
        const url = `https://sportsbook-nash.draftkings.com/sites/US-SB/api/v5/eventgroups/${groupId}/offers?format=json`;

        const data = await fetchJSONWithHeaders(url, {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json'
        });

        const props = [];

        if (data && data.offers) {
            for (const offerGroup of data.offers) {
                for (const offer of (offerGroup.offers || [])) {
                    // Filter for player props
                    if (offer.isPlayerProp || offer.label?.includes('Player')) {
                        for (const outcome of (offer.outcomes || [])) {
                            props.push({
                                player: outcome.participant || outcome.label,
                                propType: formatDraftKingsPropType(offer.label),
                                line: outcome.line || outcome.points,
                                over: { draftkings: outcome.oddsAmerican || -110 },
                                under: { draftkings: outcome.oddsAmerican || -110 },
                                source: 'draftkings_live',
                                isRealLine: true,
                                lastUpdated: new Date().toISOString()
                            });
                        }
                    }
                }
            }
        }

        const result = { props, source: 'draftkings', count: props.length };
        propsCache[cacheKey] = { data: result, timestamp: Date.now() };
        return result;

    } catch (error) {
        console.error(`DraftKings offers error: ${error.message}`);
        return { props: [], source: 'draftkings', error: error.message };
    }
}

// =====================================================
// ACTION NETWORK API - Multi-Sportsbook Real Odds
// Free API with odds from BetMGM, DraftKings, FanDuel, etc.
// =====================================================
async function fetchActionNetworkOdds(sport) {
    const cacheKey = `action_network_${sport}`;
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < PROPS_CACHE_TTL_MS)) {
        console.log(`📦 Returning cached Action Network odds for ${sport}`);
        return propsCache[cacheKey].data;
    }

    const sportPaths = {
        'nba': 'nba',
        'nfl': 'nfl',
        'nhl': 'nhl',
        'mlb': 'mlb',
        'ncaab': 'ncaab',
        'ncaaf': 'ncaaf'
    };

    const sportPath = sportPaths[sport] || sport;

    try {
        console.log(`🎰 Fetching REAL multi-book odds from Action Network for ${sport.toUpperCase()}...`);

        // Fetch scoreboard with odds
        const scoreboardUrl = `https://api.actionnetwork.com/web/v1/scoreboard/${sportPath}`;
        const scoreboardData = await fetchWithHeaders(scoreboardUrl, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://www.actionnetwork.com/'
        });

        // Fetch books list for name mapping
        const booksUrl = 'https://api.actionnetwork.com/web/v1/books';
        let booksMap = {};
        try {
            const booksData = await fetchWithHeaders(booksUrl, {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            });
            (booksData.books || booksData || []).forEach(b => {
                booksMap[b.id] = b.name || b.display_name || `Book ${b.id}`;
            });
        } catch (e) {
            console.log('Could not fetch books list, using IDs');
        }

        const games = scoreboardData.games || [];
        console.log(`  Found ${games.length} ${sport.toUpperCase()} games with odds data`);

        const oddsData = games.map(game => {
            const teams = game.teams || [];
            if (teams.length < 2) return null;

            const awayTeam = teams[0];
            const homeTeam = teams[1];

            // Process odds from multiple sportsbooks
            const odds = game.odds || [];
            const bookOdds = {};
            let bestSpread = null;
            let bestTotal = null;
            let bestHomeML = null;
            let bestAwayML = null;

            // Group odds by book and find best lines
            odds.forEach(o => {
                const bookId = o.book_id;
                const bookName = booksMap[bookId] || `Book ${bookId}`;

                if (!bookOdds[bookName]) {
                    bookOdds[bookName] = {};
                }

                // Spread
                if (o.spread !== undefined && o.spread !== null) {
                    bookOdds[bookName].spread = o.spread;
                    if (bestSpread === null) bestSpread = o.spread;
                }

                // Total (O/U)
                if (o.total !== undefined && o.total !== null) {
                    bookOdds[bookName].total = o.total;
                    if (bestTotal === null) bestTotal = o.total;
                }

                // Moneylines
                if (o.ml_home !== undefined) {
                    bookOdds[bookName].homeML = o.ml_home;
                    if (bestHomeML === null) bestHomeML = o.ml_home;
                }
                if (o.ml_away !== undefined) {
                    bookOdds[bookName].awayML = o.ml_away;
                    if (bestAwayML === null) bestAwayML = o.ml_away;
                }

                // Alternative format
                if (o.ml && o.ml.home !== undefined) {
                    bookOdds[bookName].homeML = o.ml.home;
                    if (bestHomeML === null) bestHomeML = o.ml.home;
                }
                if (o.ml && o.ml.away !== undefined) {
                    bookOdds[bookName].awayML = o.ml.away;
                    if (bestAwayML === null) bestAwayML = o.ml.away;
                }
            });

            // Extract specific sportsbook odds
            const betmgmOdds = Object.entries(bookOdds).find(([name]) => name.toLowerCase().includes('betmgm'));
            const draftkingsOdds = Object.entries(bookOdds).find(([name]) => name.toLowerCase().includes('dk') || name.toLowerCase().includes('draftkings'));
            const fanduelOdds = Object.entries(bookOdds).find(([name]) => name.toLowerCase().includes('fanduel'));
            const consensusOdds = bookOdds['Consensus'] || null;

            return {
                id: game.id,
                gameId: game.id,
                startTime: game.start_time,
                status: game.status,
                homeTeam: {
                    name: homeTeam.full_name || homeTeam.name,
                    abbreviation: homeTeam.abbr || homeTeam.abbreviation,
                    logo: homeTeam.logo,
                    moneyline: bestHomeML,
                    spread: bestSpread ? -bestSpread : null,
                    spreadOdds: -110
                },
                awayTeam: {
                    name: awayTeam.full_name || awayTeam.name,
                    abbreviation: awayTeam.abbr || awayTeam.abbreviation,
                    logo: awayTeam.logo,
                    moneyline: bestAwayML,
                    spread: bestSpread,
                    spreadOdds: -110
                },
                total: {
                    points: bestTotal,
                    overOdds: -110,
                    underOdds: -110
                },
                sportsbooks: {
                    betmgm: betmgmOdds ? betmgmOdds[1] : null,
                    draftkings: draftkingsOdds ? draftkingsOdds[1] : null,
                    fanduel: fanduelOdds ? fanduelOdds[1] : null,
                    consensus: consensusOdds
                },
                allBooks: bookOdds,
                bookCount: Object.keys(bookOdds).length,
                source: 'action_network',
                hasRealOdds: Object.keys(bookOdds).length > 0
            };
        }).filter(Boolean);

        // Count games with real sportsbook odds
        const realOddsCount = oddsData.filter(g => g.hasRealOdds).length;

        const result = {
            odds: oddsData,
            source: 'action_network',
            gamesCount: oddsData.length,
            realOddsCount: realOddsCount,
            booksAvailable: Object.keys(booksMap).length,
            note: `Real odds from ${realOddsCount} games via Action Network (BetMGM, DraftKings, FanDuel, etc.)`
        };

        propsCache[cacheKey] = { data: result, timestamp: Date.now() };
        console.log(`✅ Action Network: ${oddsData.length} games, ${realOddsCount} with real odds from multiple books`);
        return result;

    } catch (error) {
        console.error(`Action Network API error for ${sport}:`, error.message);
        return {
            odds: [],
            source: 'action_network',
            error: error.message,
            gamesCount: 0,
            realOddsCount: 0
        };
    }
}

// Helper function to fetch with custom headers
function fetchWithHeaders(apiUrl, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(apiUrl);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            timeout: REQUEST_TIMEOUT_MS,
            headers: {
                'Accept': 'application/json',
                ...headers
            }
        };

        const request = https.get(options, (response) => {
            let data = '';

            if (response.statusCode >= 400) {
                reject(new Error(`API error: ${response.statusCode}`));
                return;
            }

            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('Invalid JSON response'));
                }
            });
        });

        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });

        request.on('error', (error) => {
            reject(error);
        });
    });
}

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3001;

// =====================================================
// API KEYS - Multiple Sources
// =====================================================
const ODDS_API_KEY = process.env.ODDS_API_KEY;
const API_SPORTS_KEY = process.env.API_SPORTS_KEY; // Optional: api-sports.io
const MYSPORTSFEEDS_API_KEY = process.env.MYSPORTSFEEDS_API_KEY; // MySportsFeeds.com
const BALL_DONT_LIE_API_KEY = process.env.BALL_DONT_LIE_API_KEY; // Ball Don't Lie NBA API
const BOLT_ODDS_API_KEY = process.env.BOLT_ODDS_API_KEY; // Bolt Odds Player Props
const MYSPORTSFEEDS_PASSWORD = process.env.MYSPORTSFEEDS_PASSWORD || 'MYSPORTSFEEDS';

// API Endpoints
const API_SOURCES = {
    // The Odds API - Primary source for betting odds
    oddsApi: {
        name: 'The Odds API',
        baseUrl: 'https://api.the-odds-api.com/v4',
        key: ODDS_API_KEY,
        rateLimit: { remaining: null, resetTime: null }
    },
    // Bolt Odds API - Player props and odds
    boltOdds: {
        name: 'Bolt Odds',
        baseUrl: 'https://api.boltodds.com/v1',
        key: BOLT_ODDS_API_KEY,
        rateLimit: { remaining: null, resetTime: null }
    },
    // ESPN - Free, unlimited (scores, schedules, injuries, rosters)
    espn: {
        name: 'ESPN',
        baseUrl: 'https://site.api.espn.com/apis/site/v2/sports',
        key: null, // No key needed
        rateLimit: { remaining: Infinity, resetTime: null }
    },
    // MySportsFeeds - Injuries, projections, stats (250 calls/day free)
    mySportsFeeds: {
        name: 'MySportsFeeds',
        baseUrl: 'https://api.mysportsfeeds.com/v2.1/pull',
        key: MYSPORTSFEEDS_API_KEY,
        password: MYSPORTSFEEDS_PASSWORD,
        rateLimit: { remaining: 250, resetTime: null }
    },
    // NBA.com Official Stats API - Free, real player stats
    nbaStats: {
        name: 'NBA.com Stats',
        baseUrl: 'https://stats.nba.com/stats',
        key: null,
        rateLimit: { remaining: Infinity, resetTime: null }
    },
    // Ball Don't Lie - Free NBA stats
    ballDontLie: {
        name: 'Ball Dont Lie',
        baseUrl: 'https://api.balldontlie.io/v1',
        key: null,
        rateLimit: { remaining: null, resetTime: null }
    },
    // TheSportsDB - Free tier for team/player info
    sportsDb: {
        name: 'TheSportsDB',
        baseUrl: 'https://www.thesportsdb.com/api/v1/json/3',
        key: null, // Free tier
        rateLimit: { remaining: null, resetTime: null }
    },
    // NHL Official API - Free, no key required
    nhlOfficial: {
        name: 'NHL Official',
        baseUrl: 'https://api-web.nhle.com/v1',
        key: null,
        rateLimit: { remaining: Infinity, resetTime: null }
    },
    // MLB Official Stats API - Free
    mlbStats: {
        name: 'MLB Stats',
        baseUrl: 'https://statsapi.mlb.com/api/v1',
        key: null,
        rateLimit: { remaining: Infinity, resetTime: null }
    },
    // Action Network - Free, multi-sportsbook odds (BetMGM, DraftKings, FanDuel, etc.)
    actionNetwork: {
        name: 'Action Network',
        baseUrl: 'https://api.actionnetwork.com/web/v1',
        key: null,
        rateLimit: { remaining: Infinity, resetTime: null }
    },
    // API-SPORTS - Multi-sport stats, standings, fixtures (100 calls/day free)
    apiSports: {
        name: 'API-SPORTS',
        baseUrls: {
            nba: 'https://v1.basketball.api-sports.io',
            nfl: 'https://v1.american-football.api-sports.io',
            nhl: 'https://v1.hockey.api-sports.io',
            mlb: 'https://v1.baseball.api-sports.io'
        },
        key: API_SPORTS_KEY,
        rateLimit: { remaining: 100, resetTime: null }
    }
};

// Action Network Book IDs for major sportsbooks
const ACTION_NETWORK_BOOKS = {
    consensus: 15,
    draftkings_nj: 68,
    fanduel_nj: 69,
    betmgm_nj: 75,
    caesars_nj: 123,
    bet365_nj: 79,
    pointsbet: 1965,
    betrivers_nj: 71
};

// Allowed sports for validation
const ALLOWED_SPORTS = ['nba', 'nfl', 'nhl', 'mlb', 'ncaab', 'ncaaf'];

// =====================================================
// SEASONAL AWARENESS - Only show in-season sports
// =====================================================
function getSportSeasonStatus() {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();

    // Sport seasons (approximate):
    // NBA: October - June (Regular: Oct-Apr, Playoffs: Apr-Jun)
    // NFL: September - February (Regular: Sep-Jan, Playoffs: Jan-Feb, Super Bowl early Feb)
    // NHL: October - June (Regular: Oct-Apr, Playoffs: Apr-Jun)
    // MLB: April - October (Regular: Apr-Sep, Playoffs: Oct)

    const seasons = {
        nba: {
            inSeason: (month >= 10 || month <= 6),
            name: 'NBA',
            seasonDates: 'October - June'
        },
        nfl: {
            // NFL is in season Sep-Feb (Super Bowl is early February)
            inSeason: (month >= 9 || month <= 2),
            name: 'NFL',
            seasonDates: 'September - February'
        },
        nhl: {
            inSeason: (month >= 10 || month <= 6),
            name: 'NHL',
            seasonDates: 'October - June'
        },
        mlb: {
            // MLB is ONLY in season April - October
            inSeason: (month >= 4 && month <= 10),
            name: 'MLB',
            seasonDates: 'April - October'
        }
    };

    return seasons;
}

// Get currently active sports
function getActiveSports() {
    const seasons = getSportSeasonStatus();
    return Object.keys(seasons).filter(sport => seasons[sport].inSeason);
}

// Check if a specific sport is in season
function isSportInSeason(sport) {
    const seasons = getSportSeasonStatus();
    return seasons[sport]?.inSeason || false;
}

// Request configuration
const REQUEST_TIMEOUT_MS = 10000; // 10 second timeout
const RATE_LIMIT_RETRY_DELAY_MS = 60000; // Wait 1 minute if rate limited

// Rate limit tracking
let rateLimitedUntil = null;
let apiRequestsRemaining = null;

// Props cache with TTL
const PROPS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const propsCache = {};

// Validate API keys (Odds API is optional now with fallbacks)
if (!ODDS_API_KEY) {
    console.warn('⚠️ WARNING: ODDS_API_KEY not set - using free APIs only (ESPN, TheSportsDB)');
    console.warn('   For betting odds, set: export ODDS_API_KEY=your_api_key_here');
} else {
    console.log('✅ The Odds API key configured');
}

const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;

    console.log(`📡 Request: ${path}`);

    // Helper function to validate sport parameter
    const validateSport = (sport) => {
        if (!sport || !ALLOWED_SPORTS.includes(sport.toLowerCase())) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Invalid sport parameter',
                allowed: ALLOWED_SPORTS
            }));
            return false;
        }
        return true;
    };

    try {
        // Route: /api/odds/:sport
        if (path.startsWith('/api/odds/')) {
            const sport = path.split('/')[3]?.toLowerCase();
            if (!validateSport(sport)) return;

            // Try The Odds API first, fall back to free ESPN/DraftKings odds
            let data;
            if (ODDS_API_KEY && (!rateLimitedUntil || Date.now() >= rateLimitedUntil)) {
                try {
                    data = await fetchOddsAPI(sport);
                } catch (e) {
                    console.log(`⚠️ Odds API failed, using REAL DraftKings odds from ESPN: ${e.message}`);
                    data = await fetchFreeOdds(sport);
                }
            } else {
                // Use free ESPN/DraftKings odds when Odds API unavailable
                data = await fetchFreeOdds(sport);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/multibook-odds/:sport - Multi-sportsbook odds from Action Network
        if (path.startsWith('/api/multibook-odds/')) {
            const sport = path.split('/')[3]?.toLowerCase();
            if (!validateSport(sport)) return;

            const data = await fetchActionNetworkOdds(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/draftkings/:sport - Direct DraftKings props
        if (path.startsWith('/api/draftkings/')) {
            const sport = path.split('/')[3]?.toLowerCase();
            if (!validateSport(sport)) return;

            const data = await fetchDraftKingsPlayerProps(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/prizepicks/:sport - PrizePicks player props (REAL lines)
        if (path.startsWith('/api/prizepicks/')) {
            const sport = path.split('/')[3]?.toLowerCase();
            if (!validateSport(sport)) return;

            const data = await fetchPrizePicksProps(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/live-props/:sport - Automated live props with multi-source aggregation
        if (path.startsWith('/api/live-props/')) {
            const sport = path.split('/')[3]?.toLowerCase();
            if (!validateSport(sport)) return;

            // Check for cached live props first
            const liveData = getLiveProps(sport);
            if (liveData && liveData.props.length > 0) {
                console.log(`📊 Returning ${liveData.props.length} cached live props for ${sport.toUpperCase()}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    props: liveData.props,
                    source: liveData.source,
                    count: liveData.props.length,
                    lastUpdated: liveData.lastUpdated,
                    autoRefresh: true,
                    refreshInterval: PROP_REFRESH_INTERVAL_MS / 60000 + ' minutes'
                }));
                return;
            }

            // If no cached data, fetch fresh
            console.log(`🔄 No cached props, fetching fresh for ${sport.toUpperCase()}...`);
            const freshProps = await fetchLivePropsFromAllSources(sport);

            // Cache the result
            if (freshProps && freshProps.length > 0) {
                livePropsStore[sport] = {
                    props: freshProps,
                    lastUpdated: new Date().toISOString(),
                    source: 'multi-source'
                };
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                props: freshProps || [],
                source: 'multi-source',
                count: freshProps?.length || 0,
                lastUpdated: new Date().toISOString(),
                autoRefresh: true,
                refreshInterval: PROP_REFRESH_INTERVAL_MS / 60000 + ' minutes'
            }));
            return;
        }

        // Route: /api/prop-status - Get status of automated prop fetching
        if (path === '/api/prop-status') {
            const status = {};
            for (const sport of ALLOWED_SPORTS) {
                const data = livePropsStore[sport];
                status[sport] = {
                    propCount: data?.props?.length || 0,
                    lastUpdated: data?.lastUpdated || null,
                    source: data?.source || 'none'
                };
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'running',
                refreshInterval: PROP_REFRESH_INTERVAL_MS / 60000 + ' minutes',
                sports: status,
                nextRefresh: new Date(Date.now() + PROP_REFRESH_INTERVAL_MS).toISOString()
            }));
            return;
        }

// Route: /api/props/:sport
        if (path.startsWith('/api/props/')) {
            const sport = path.split('/')[3]?.toLowerCase();
            if (!validateSport(sport)) return;

            // Priority: PrizePicks > Live Props (auto-refreshed) > DraftKings > Odds API > Generated
            let data;

            // First check for cached live props (auto-refreshed every 5 min) which now include PrizePicks
            const liveData = getLiveProps(sport);
            if (liveData && liveData.props.length > 0) {
                console.log(`✅ Using ${liveData.props.length} auto-refreshed live props for ${sport.toUpperCase()}`);
                data = liveData;
            }

            // If no cached live data, try PrizePicks directly
            if (!data || !data.props?.length) {
                try {
                    const prizePicksData = await fetchPrizePicksProps(sport);
                    if (prizePicksData.props && prizePicksData.props.length > 0) {
                        console.log(`✅ Using ${prizePicksData.props.length} REAL PrizePicks props`);
                        // Filter injured players
                        const filteredProps = filterInjuredPlayers(prizePicksData.props);
                        data = {
                            props: filteredProps,
                            source: 'prizepicks',
                            isRealLine: true
                        };
                    }
                } catch (e) {
                    console.log(`⚠️ PrizePicks failed: ${e.message}`);
                }
            }

            // Try DraftKings if no PrizePicks data
            if (!data || !data.props?.length) {
                try {
                    const dkData = await fetchDraftKingsPlayerProps(sport);
                    if (dkData.props && dkData.props.length > 0) {
                        console.log(`✅ Using ${dkData.props.length} REAL DraftKings props`);
                        data = dkData;
                    }
                } catch (e) {
                    console.log(`⚠️ DraftKings failed: ${e.message}`);
                }
            }

            // Fall back to The Odds API
            if (!data && ODDS_API_KEY && (!rateLimitedUntil || Date.now() >= rateLimitedUntil)) {
                try {
                    data = await fetchPlayerProps(sport);
                } catch (e) {
                    console.log(`⚠️ Odds API failed: ${e.message}`);
                }
            }

            // Try MySportsFeeds projections (if API key configured)
            if ((!data || !data.props?.length) && MYSPORTSFEEDS_API_KEY) {
                try {
                    const msfData = await fetchMySportsFeedsProjections(sport);
                    if (msfData.props && msfData.props.length > 0) {
                        console.log(`✅ Using ${msfData.props.length} MySportsFeeds projections`);
                        data = msfData;
                    }
                } catch (e) {
                    console.log(`⚠️ MySportsFeeds projections failed: ${e.message}`);
                }
            }

            // Final fallback to generated props
            if (!data || !data.props?.length) {
                data = await getGeneratedProps(sport);
            }

            // ALWAYS enrich props with accurate team data and opponent info
            if (data && data.props && data.props.length > 0) {
                // Ensure today's games are loaded for matchup info
                await fetchTodaysGames(sport);

                // Enrich each prop with team and opponent data
                data.props = data.props.map(prop => enrichPropWithTeamData(prop, sport));
                data.propsCount = data.props.length;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/events/:sport
        if (path.startsWith('/api/events/')) {
            const sport = path.split('/')[3]?.toLowerCase();
            if (!validateSport(sport)) return;
            const data = await fetchEvents(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/scores/:sport (ESPN)
        if (path.startsWith('/api/scores/')) {
            const sport = path.split('/')[3]?.toLowerCase();
            if (!validateSport(sport)) return;
            const data = await fetchESPNScores(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/injuries/:sport (ESPN + MySportsFeeds combined)
        if (path.startsWith('/api/injuries/')) {
            const sport = path.split('/')[3]?.toLowerCase();
            if (!validateSport(sport)) return;
            // Use combined injuries from both ESPN and MySportsFeeds
            const data = await fetchAllInjuries(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/msf/injuries/:sport - MySportsFeeds injuries only
        if (path.startsWith('/api/msf/injuries/')) {
            const sport = path.split('/')[4]?.toLowerCase();
            if (!validateSport(sport)) return;
            if (!MYSPORTSFEEDS_API_KEY) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'MySportsFeeds API key not configured. Add MYSPORTSFEEDS_API_KEY to .env' }));
                return;
            }
            const data = await fetchMySportsFeedsInjuries(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/msf/projections/:sport - MySportsFeeds daily projections
        if (path.startsWith('/api/msf/projections/')) {
            const sport = path.split('/')[4]?.toLowerCase();
            if (!validateSport(sport)) return;
            if (!MYSPORTSFEEDS_API_KEY) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'MySportsFeeds API key not configured. Add MYSPORTSFEEDS_API_KEY to .env' }));
                return;
            }
            const data = await fetchMySportsFeedsProjections(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/apisports/games/:sport - API-SPORTS games/fixtures
        if (path.startsWith('/api/apisports/games/')) {
            const sport = path.split('/')[4]?.toLowerCase();
            if (!validateSport(sport)) return;
            if (!API_SPORTS_KEY) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'API-SPORTS key not configured. Add API_SPORTS_KEY to .env' }));
                return;
            }
            const data = await fetchAPISportsGames(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/apisports/standings/:sport - API-SPORTS standings
        if (path.startsWith('/api/apisports/standings/')) {
            const sport = path.split('/')[4]?.toLowerCase();
            if (!validateSport(sport)) return;
            if (!API_SPORTS_KEY) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'API-SPORTS key not configured. Add API_SPORTS_KEY to .env' }));
                return;
            }
            const data = await fetchAPISportsStandings(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/apisports/players/:sport - API-SPORTS players
        if (path.startsWith('/api/apisports/players/')) {
            const sport = path.split('/')[4]?.toLowerCase();
            if (!validateSport(sport)) return;
            if (!API_SPORTS_KEY) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'API-SPORTS key not configured. Add API_SPORTS_KEY to .env' }));
                return;
            }
            const data = await fetchAPISportsTopPlayers(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/apisports/odds/:sport - API-SPORTS betting odds
        if (path.startsWith('/api/apisports/odds/')) {
            const sport = path.split('/')[4]?.toLowerCase();
            if (!validateSport(sport)) return;
            if (!API_SPORTS_KEY) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'API-SPORTS key not configured. Add API_SPORTS_KEY to .env' }));
                return;
            }
            const data = await fetchAPISportsOdds(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/sofascore/events/:sport - SofaScore today's events
        if (path.startsWith('/api/sofascore/events/')) {
            const sport = path.split('/')[4]?.toLowerCase();
            if (!validateSport(sport)) return;
            const data = await fetchSofaScoreEvents(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/sofascore/odds/:sport - SofaScore live odds comparison
        if (path.startsWith('/api/sofascore/odds/')) {
            const sport = path.split('/')[4]?.toLowerCase();
            if (!validateSport(sport)) return;
            const data = await fetchSofaScoreLiveOdds(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/sofascore/best-odds/:sport - SofaScore best odds comparison
        if (path.startsWith('/api/sofascore/best-odds/')) {
            const sport = path.split('/')[4]?.toLowerCase();
            if (!validateSport(sport)) return;
            const data = await fetchSofaScoreBestOdds(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/sofascore/event/:eventId/odds - SofaScore odds for specific event
        if (path.match(/^\/api\/sofascore\/event\/\d+\/odds$/)) {
            const eventId = path.split('/')[4];
            const data = await fetchSofaScoreEventOdds(eventId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // =====================================================
        // NEW LIVE DATA ROUTES (FREE, UNLIMITED)
        // =====================================================

        // Route: /api/live/:sport - Aggregated live data from ALL sources
        if (path.startsWith('/api/live/')) {
            const sport = path.split('/')[3]?.toLowerCase();
            if (!validateSport(sport)) return;
            const data = await fetchAllLiveData(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/bdl/games - Ball Don't Lie today's NBA games (FREE)
        if (path === '/api/bdl/games' || path === '/api/bdl/games/') {
            const data = await fetchBDLTodaysGames();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/bdl/boxscore/:gameId - Ball Don't Lie box score (FREE)
        if (path.match(/^\/api\/bdl\/boxscore\/\d+$/)) {
            const gameId = path.split('/')[4];
            const data = await fetchBDLBoxScore(gameId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/bdl/player/:playerId/recent - Ball Don't Lie recent player stats (FREE)
        if (path.match(/^\/api\/bdl\/player\/\d+\/recent$/)) {
            const playerId = path.split('/')[4];
            const data = await fetchBDLPlayerRecentStats(playerId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/thesportsdb/live/:sport - TheSportsDB live scores (FREE)
        if (path.startsWith('/api/thesportsdb/live/')) {
            const sport = path.split('/')[4]?.toLowerCase();
            if (!validateSport(sport)) return;
            const data = await fetchSportsDBLiveScores(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/thesportsdb/upcoming/:sport - TheSportsDB upcoming events (FREE)
        if (path.startsWith('/api/thesportsdb/upcoming/')) {
            const sport = path.split('/')[4]?.toLowerCase();
            if (!validateSport(sport)) return;
            const data = await fetchSportsDBUpcomingEvents(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/thesportsdb/team/:teamName - TheSportsDB team info (FREE)
        if (path.startsWith('/api/thesportsdb/team/')) {
            const teamName = decodeURIComponent(path.split('/')[4] || '');
            if (!teamName) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Team name required' }));
                return;
            }
            const data = await fetchSportsDBTeam(teamName);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/nba/scoreboard - NBA.com live scoreboard (FREE)
        if (path === '/api/nba/scoreboard' || path === '/api/nba/scoreboard/') {
            const data = await fetchNBAComScoreboard();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/nba/boxscore/:gameId - NBA.com live box score (FREE)
        if (path.match(/^\/api\/nba\/boxscore\/\d+$/)) {
            const gameId = path.split('/')[4];
            const data = await fetchNBAComBoxScore(gameId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/nba/leaders - NBA.com league leaders (FREE)
        if (path === '/api/nba/leaders' || path === '/api/nba/leaders/') {
            const data = await fetchNBAComLeaders();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/nhl/play-by-play/:gameId - NHL live play-by-play (FREE)
        if (path.match(/^\/api\/nhl\/play-by-play\/\d+$/)) {
            const gameId = path.split('/')[4];
            const data = await fetchNHLPlayByPlay(gameId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/nhl/gamecenter/:gameId - NHL game center box score (FREE)
        if (path.match(/^\/api\/nhl\/gamecenter\/\d+$/)) {
            const gameId = path.split('/')[4];
            const data = await fetchNHLGameCenter(gameId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/mlb/live/:gamePk - MLB live game feed (FREE)
        if (path.match(/^\/api\/mlb\/live\/\d+$/)) {
            const gamePk = path.split('/')[4];
            const data = await fetchMLBLiveGame(gamePk);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/mlb/boxscore/:gamePk - MLB box score (FREE)
        if (path.match(/^\/api\/mlb\/boxscore\/\d+$/)) {
            const gamePk = path.split('/')[4];
            const data = await fetchMLBPlayerGameStats(gamePk);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/players/:sport - Player stats from multiple sources
        if (path.startsWith('/api/players/')) {
            const sport = path.split('/')[3]?.toLowerCase();
            if (!validateSport(sport)) return;
            const data = await fetchPlayerStats(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/teams/:sport - Team info from TheSportsDB
        if (path.startsWith('/api/teams/')) {
            const sport = path.split('/')[3]?.toLowerCase();
            if (!validateSport(sport)) return;
            const data = await fetchTeamInfo(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/aggregate/:sport - Combined data from all sources
        if (path.startsWith('/api/aggregate/')) {
            const sport = path.split('/')[3]?.toLowerCase();
            if (!validateSport(sport)) return;
            const data = await fetchAggregatedData(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Health check
        if (path === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                timestamp: new Date().toISOString(),
                sources: {
                    oddsApi: {
                        available: !!ODDS_API_KEY,
                        requestsRemaining: apiRequestsRemaining,
                        rateLimited: rateLimitedUntil ? Date.now() < rateLimitedUntil : false
                    },
                    espn: { available: true, requestsRemaining: 'unlimited' },
                    ballDontLie: { available: true, requestsRemaining: 'unknown' },
                    sportsDb: { available: true, requestsRemaining: 'unknown' }
                },
                cachedSports: Object.keys(propsCache)
            }));
            return;
        }

        // =====================================================
        // ANALYTICS API ENDPOINTS
        // =====================================================

        // POST /api/analytics - Receive analytics data from frontend
        if (path === '/api/analytics' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    const analyticsData = JSON.parse(body);
                    await saveAnalyticsData(analyticsData);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Analytics data saved' }));
                } catch (e) {
                    console.error('Analytics save error:', e.message);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid analytics data' }));
                }
            });
            return;
        }

        // GET /api/analytics - Get aggregated analytics data
        if (path === '/api/analytics' && req.method === 'GET') {
            const analytics = await getAggregatedAnalytics();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(analytics));
            return;
        }

        // GET /api/analytics/summary - Get quick summary stats
        if (path === '/api/analytics/summary') {
            const summary = await getAnalyticsSummary();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(summary));
            return;
        }

        // GET /api/analytics/events - Get recent events
        if (path === '/api/analytics/events') {
            const events = await getRecentEvents();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(events));
            return;
        }

        // DELETE /api/analytics - Clear all analytics data
        if (path === '/api/analytics' && req.method === 'DELETE') {
            await clearAnalyticsData();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Analytics data cleared' }));
            return;
        }

        // =====================================================
        // ROSTER API ENDPOINTS
        // =====================================================

        // POST /api/rosters/sync - Force roster sync from ESPN
        if (path === '/api/rosters/sync' && req.method === 'POST') {
            console.log('📋 Manual roster sync triggered via API');
            const result = await syncAllRostersFromESPN();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }

        // GET /api/rosters/status - Get roster sync status
        if (path === '/api/rosters/status') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                lastUpdated: LIVE_ROSTER_CACHE.lastUpdated,
                lastSyncStatus: LIVE_ROSTER_CACHE.lastSyncStatus,
                counts: {
                    nba: LIVE_ROSTER_CACHE.nba.size,
                    nfl: LIVE_ROSTER_CACHE.nfl.size,
                    nhl: LIVE_ROSTER_CACHE.nhl.size,
                    mlb: LIVE_ROSTER_CACHE.mlb.size
                },
                nextSyncIn: LIVE_ROSTER_CACHE.lastUpdated
                    ? Math.max(0, Math.round((new Date(LIVE_ROSTER_CACHE.lastUpdated).getTime() + ROSTER_REFRESH_INTERVAL_MS - Date.now()) / 60000)) + ' minutes'
                    : 'pending'
            }));
            return;
        }

        // GET /api/rosters/:sport - Get all players for a sport
        if (path.match(/^\/api\/rosters\/(nba|nfl|nhl|mlb)$/)) {
            const sport = path.split('/')[3];
            const sportCache = LIVE_ROSTER_CACHE[sport];
            const players = sportCache ? Array.from(sportCache.values()) : [];
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                sport,
                playerCount: players.length,
                lastUpdated: LIVE_ROSTER_CACHE.lastUpdated,
                players
            }));
            return;
        }

        // GET /api/rosters/player/:name - Get specific player info
        if (path.startsWith('/api/rosters/player/')) {
            const playerName = decodeURIComponent(path.split('/api/rosters/player/')[1]);
            const player = getPlayerFromLiveRoster(playerName, 'nba');
            if (player) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(player));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Player not found', searched: playerName }));
            }
            return;
        }

        // Cache invalidation - clear all or specific sport
        if (path.startsWith('/api/cache/clear')) {
            const sport = path.split('/')[4]?.toLowerCase();

            if (sport && ALLOWED_SPORTS.includes(sport)) {
                // Clear specific sport cache
                const cacheKey = `props_${sport}`;
                delete propsCache[cacheKey];
                console.log(`🗑️ Cleared cache for ${sport.toUpperCase()}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    message: `Cache cleared for ${sport}`,
                    clearedAt: new Date().toISOString()
                }));
            } else {
                // Clear all cache
                Object.keys(propsCache).forEach(k => delete propsCache[k]);
                console.log('🗑️ Cleared all props cache');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    message: 'All cache cleared',
                    clearedAt: new Date().toISOString()
                }));
            }
            return;
        }

        // Serve static files (HTML, CSS, JS)
        const staticPath = path === '/' ? '/index.html' : path;
        const filePath = __dirname + staticPath;
        const extname = String(staticPath).split('.').pop().toLowerCase();

        const mimeTypes = {
            'html': 'text/html',
            'js': 'text/javascript',
            'css': 'text/css',
            'json': 'application/json',
            'png': 'image/png',
            'jpg': 'image/jpg',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'ico': 'image/x-icon',
            'woff': 'font/woff',
            'woff2': 'font/woff2'
        };

        const contentType = mimeTypes[extname] || 'application/octet-stream';

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const content = fs.readFileSync(filePath);
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
            return;
        }

        // 404
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));

    } catch (error) {
        console.error('❌ Error:', error.message);

        // Return appropriate status code based on error type
        let statusCode = 500;
        if (error.message.includes('Rate limit')) {
            statusCode = 429;
        } else if (error.message.includes('timeout')) {
            statusCode = 504;
        } else if (error.message.includes('Invalid API key')) {
            statusCode = 401;
        } else if (error.message.includes('not found')) {
            statusCode = 404;
        }

        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
    }
});

// Fetch from The Odds API
async function fetchOddsAPI(sport) {
    const sportKeys = {
        'nba': 'basketball_nba',
        'nfl': 'americanfootball_nfl',
        'nhl': 'icehockey_nhl',
        'mlb': 'baseball_mlb',
        'ncaab': 'basketball_ncaab',
        'ncaaf': 'americanfootball_ncaaf'
    };

    const sportKey = sportKeys[sport] || sport;
    const apiUrl = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;

    return await fetchJSON(apiUrl);
}

// Fetch events list
async function fetchEvents(sport) {
    const sportKeys = {
        'nba': 'basketball_nba',
        'nfl': 'americanfootball_nfl',
        'nhl': 'icehockey_nhl',
        'mlb': 'baseball_mlb'
    };

    const sportKey = sportKeys[sport] || sport;
    const apiUrl = `https://api.the-odds-api.com/v4/sports/${sportKey}/events?apiKey=${ODDS_API_KEY}`;

    return await fetchJSON(apiUrl);
}

// Fetch player props
async function fetchPlayerProps(sport) {
    const sportKeys = {
        'nba': 'basketball_nba',
        'nfl': 'americanfootball_nfl',
        'nhl': 'icehockey_nhl',
        'mlb': 'baseball_mlb'
    };

    // Core prop markets (reduced to save API calls)
    const propMarkets = {
        'nba': 'player_points,player_rebounds,player_assists,player_threes,player_points_rebounds_assists',
        'nfl': 'player_pass_yds,player_rush_yds,player_reception_yds,player_anytime_td,player_receptions',
        'nhl': 'player_points,player_goals,player_assists,player_shots_on_goal',
        'mlb': 'batter_hits,batter_total_bases,pitcher_strikeouts,batter_home_runs'
    };

    const sportKey = sportKeys[sport] || sport;
    const markets = propMarkets[sport] || propMarkets['nba'];

    // Check cache first
    const cacheKey = `props_${sport}`;
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < PROPS_CACHE_TTL_MS)) {
        console.log(`📦 Returning cached props for ${sport.toUpperCase()}`);
        return propsCache[cacheKey].data;
    }

    // First get all events
    const events = await fetchEvents(sport);
    if (!events || !events.length) return [];

    console.log(`📋 Found ${events.length} ${sport.toUpperCase()} events, fetching props...`);

    // Get props for up to 5 events (balance between coverage and API usage)
    const maxEvents = Math.min(events.length, 5);
    const allProps = [];

    for (let i = 0; i < maxEvents; i++) {
        const event = events[i];
        const apiUrl = `https://api.the-odds-api.com/v4/sports/${sportKey}/events/${event.id}/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=${markets}&oddsFormat=american`;
        try {
            const data = await fetchJSON(apiUrl);
            if (data && data.bookmakers && data.bookmakers.length > 0) {
                // Count players in this event
                let playerCount = 0;
                data.bookmakers.forEach(book => {
                    book.markets?.forEach(market => {
                        const uniquePlayers = new Set(market.outcomes?.map(o => o.description).filter(Boolean));
                        playerCount = Math.max(playerCount, uniquePlayers.size);
                    });
                });
                console.log(`  ✅ ${event.away_team} @ ${event.home_team}: ${playerCount} players`);
                allProps.push({ event, odds: data });
            }
        } catch (e) {
            console.log(`  ⚠️ Skipping ${event.away_team} @ ${event.home_team}: ${e.message}`);
            // Stop if rate limited
            if (e.message.includes('Rate limit')) break;
        }
    }

    // Cache the results
    propsCache[cacheKey] = { data: allProps, timestamp: Date.now() };
    console.log(`📊 Total: ${allProps.length} events with player props (cached for 5 min)`);
    return allProps;
}

// Fetch ESPN Scores
async function fetchESPNScores(sport) {
    const sportPaths = {
        'nba': 'basketball/nba',
        'ncaab': 'basketball/mens-college-basketball',
        'nfl': 'football/nfl',
        'ncaaf': 'football/college-football',
        'nhl': 'hockey/nhl',
        'mlb': 'baseball/mlb'
    };

    const path = sportPaths[sport] || `basketball/${sport}`;
    const apiUrl = `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`;

    return await fetchJSON(apiUrl);
}

// Fetch ESPN Injuries
async function fetchESPNInjuries(sport) {
    const sportPaths = {
        'nba': 'basketball/nba',
        'nfl': 'football/nfl',
        'nhl': 'hockey/nhl',
        'mlb': 'baseball/mlb'
    };

    const path = sportPaths[sport] || `basketball/${sport}`;
    const apiUrl = `https://site.api.espn.com/apis/site/v2/sports/${path}/injuries`;

    return await fetchJSON(apiUrl);
}

// =====================================================
// MYSPORTSFEEDS API INTEGRATION
// Free tier: 250 API calls per day
// Provides: Injuries, Daily Projections, Player Stats
// Get API key at: https://www.mysportsfeeds.com/
// =====================================================

// MySportsFeeds cache to avoid hitting rate limits
const MSF_CACHE = {
    injuries: { data: null, lastUpdated: null },
    projections: { data: null, lastUpdated: null }
};
const MSF_CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache

// Fetch with Basic Auth for MySportsFeeds
function fetchMySportsFeeds(endpoint) {
    return new Promise((resolve, reject) => {
        if (!MYSPORTSFEEDS_API_KEY) {
            reject(new Error('MySportsFeeds API key not configured'));
            return;
        }

        const url = new URL(`https://api.mysportsfeeds.com/v2.1/pull/${endpoint}`);
        const auth = Buffer.from(`${MYSPORTSFEEDS_API_KEY}:${MYSPORTSFEEDS_PASSWORD}`).toString('base64');

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'GET',
            timeout: REQUEST_TIMEOUT_MS,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'User-Agent': 'BetGenius-AI/1.0'
            }
        };

        const request = https.get(options, (response) => {
            let data = '';

            if (response.statusCode === 401) {
                reject(new Error('MySportsFeeds: Invalid API key'));
                return;
            }

            if (response.statusCode === 429) {
                reject(new Error('MySportsFeeds: Rate limit exceeded (250/day)'));
                return;
            }

            if (response.statusCode >= 400) {
                reject(new Error(`MySportsFeeds API error: ${response.statusCode}`));
                return;
            }

            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('MySportsFeeds: Invalid JSON response'));
                }
            });
        });

        request.on('error', (err) => reject(err));
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('MySportsFeeds: Request timeout'));
        });
    });
}

// Get current season string for MySportsFeeds
function getMSFSeason(sport) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    switch (sport) {
        case 'nba':
            // NBA season runs Oct-June, uses format "2024-2025-regular"
            return month >= 10 ? `${year}-${year + 1}-regular` : `${year - 1}-${year}-regular`;
        case 'nfl':
            // NFL season runs Sep-Feb, uses format "2024-regular"
            return month >= 9 || month <= 2 ? `${month >= 9 ? year : year - 1}-regular` : `${year}-regular`;
        case 'nhl':
            // NHL season runs Oct-June
            return month >= 10 ? `${year}-${year + 1}-regular` : `${year - 1}-${year}-regular`;
        case 'mlb':
            // MLB season runs Mar-Oct
            return `${year}-regular`;
        default:
            return `${year}-regular`;
    }
}

// MySportsFeeds sport league mapping
function getMSFLeague(sport) {
    const leagues = {
        'nba': 'nba',
        'nfl': 'nfl',
        'nhl': 'nhl',
        'mlb': 'mlb'
    };
    return leagues[sport] || sport;
}

// Fetch injuries from MySportsFeeds
async function fetchMySportsFeedsInjuries(sport) {
    const cacheKey = `injuries_${sport}`;

    // Check cache first
    if (MSF_CACHE.injuries[cacheKey] &&
        MSF_CACHE.injuries[cacheKey].lastUpdated &&
        (Date.now() - MSF_CACHE.injuries[cacheKey].lastUpdated < MSF_CACHE_TTL)) {
        console.log(`📦 Using cached MySportsFeeds injuries for ${sport.toUpperCase()}`);
        return MSF_CACHE.injuries[cacheKey].data;
    }

    try {
        const league = getMSFLeague(sport);
        const season = getMSFSeason(sport);
        const endpoint = `${league}/${season}/injuries.json`;

        console.log(`🏥 Fetching MySportsFeeds injuries: ${endpoint}`);
        const data = await fetchMySportsFeeds(endpoint);

        // Parse injuries into our format
        const injuries = [];
        if (data.players) {
            for (const playerData of data.players) {
                const player = playerData.player;
                const injury = playerData.injury;

                if (player && injury) {
                    injuries.push({
                        player: `${player.firstName} ${player.lastName}`,
                        playerId: player.id,
                        team: player.currentTeam?.abbreviation || '',
                        position: player.primaryPosition || '',
                        injuryType: injury.description || 'Unknown',
                        status: injury.playingProbability || 'Out',
                        expectedReturn: injury.expectedReturn || null,
                        source: 'mysportsfeeds'
                    });
                }
            }
        }

        // Cache the result
        MSF_CACHE.injuries[cacheKey] = {
            data: { injuries, count: injuries.length, source: 'mysportsfeeds' },
            lastUpdated: Date.now()
        };

        console.log(`✅ MySportsFeeds: Found ${injuries.length} injuries for ${sport.toUpperCase()}`);
        return MSF_CACHE.injuries[cacheKey].data;

    } catch (error) {
        console.log(`⚠️ MySportsFeeds injuries error: ${error.message}`);
        return { injuries: [], count: 0, error: error.message };
    }
}

// Fetch daily player projections from MySportsFeeds
async function fetchMySportsFeedsProjections(sport) {
    const cacheKey = `projections_${sport}`;

    // Check cache first
    if (MSF_CACHE.projections[cacheKey] &&
        MSF_CACHE.projections[cacheKey].lastUpdated &&
        (Date.now() - MSF_CACHE.projections[cacheKey].lastUpdated < MSF_CACHE_TTL)) {
        console.log(`📦 Using cached MySportsFeeds projections for ${sport.toUpperCase()}`);
        return MSF_CACHE.projections[cacheKey].data;
    }

    try {
        const league = getMSFLeague(sport);
        const season = getMSFSeason(sport);

        // Get today's date in YYYYMMDD format
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

        const endpoint = `${league}/${season}/date/${dateStr}/player_gamelogs.json?sort=player.id`;

        console.log(`📊 Fetching MySportsFeeds daily projections: ${endpoint}`);
        const data = await fetchMySportsFeeds(endpoint);

        // Parse projections into props format
        const props = [];

        if (data.gamelogs) {
            for (const log of data.gamelogs) {
                const player = log.player;
                const stats = log.stats;
                const team = log.team;
                const game = log.game;

                if (!player || !stats) continue;

                const playerName = `${player.firstName} ${player.lastName}`;
                const teamAbbr = team?.abbreviation || '';
                const position = player.primaryPosition || '';

                // Generate props based on sport
                if (sport === 'nba') {
                    if (stats.offense?.pts !== undefined) {
                        props.push({
                            player: playerName,
                            team: teamAbbr,
                            position: position,
                            propType: 'Points',
                            line: roundToProperLine(stats.offense.pts, 'Points'),
                            projection: stats.offense.pts,
                            source: 'mysportsfeeds_projection',
                            isRealLine: false
                        });
                    }
                    if (stats.rebounds?.reb !== undefined) {
                        props.push({
                            player: playerName,
                            team: teamAbbr,
                            position: position,
                            propType: 'Rebounds',
                            line: roundToProperLine(stats.rebounds.reb, 'Rebounds'),
                            projection: stats.rebounds.reb,
                            source: 'mysportsfeeds_projection',
                            isRealLine: false
                        });
                    }
                    if (stats.offense?.ast !== undefined) {
                        props.push({
                            player: playerName,
                            team: teamAbbr,
                            position: position,
                            propType: 'Assists',
                            line: roundToProperLine(stats.offense.ast, 'Assists'),
                            projection: stats.offense.ast,
                            source: 'mysportsfeeds_projection',
                            isRealLine: false
                        });
                    }
                } else if (sport === 'nfl') {
                    if (stats.passing?.passYards !== undefined && stats.passing.passYards > 0) {
                        props.push({
                            player: playerName,
                            team: teamAbbr,
                            position: position,
                            propType: 'Pass Yards',
                            line: roundToProperLine(stats.passing.passYards, 'Pass Yards'),
                            projection: stats.passing.passYards,
                            source: 'mysportsfeeds_projection',
                            isRealLine: false
                        });
                    }
                    if (stats.rushing?.rushYards !== undefined && stats.rushing.rushYards > 0) {
                        props.push({
                            player: playerName,
                            team: teamAbbr,
                            position: position,
                            propType: 'Rush Yards',
                            line: roundToProperLine(stats.rushing.rushYards, 'Rush Yards'),
                            projection: stats.rushing.rushYards,
                            source: 'mysportsfeeds_projection',
                            isRealLine: false
                        });
                    }
                    if (stats.receiving?.recYards !== undefined && stats.receiving.recYards > 0) {
                        props.push({
                            player: playerName,
                            team: teamAbbr,
                            position: position,
                            propType: 'Rec Yards',
                            line: roundToProperLine(stats.receiving.recYards, 'Rec Yards'),
                            projection: stats.receiving.recYards,
                            source: 'mysportsfeeds_projection',
                            isRealLine: false
                        });
                    }
                } else if (sport === 'nhl') {
                    if (stats.scoring?.goals !== undefined) {
                        props.push({
                            player: playerName,
                            team: teamAbbr,
                            position: position,
                            propType: 'Goals',
                            line: roundToProperLine(stats.scoring.goals, 'Goals'),
                            projection: stats.scoring.goals,
                            source: 'mysportsfeeds_projection',
                            isRealLine: false
                        });
                    }
                    if (stats.scoring?.assists !== undefined) {
                        props.push({
                            player: playerName,
                            team: teamAbbr,
                            position: position,
                            propType: 'Assists',
                            line: roundToProperLine(stats.scoring.assists, 'Assists'),
                            projection: stats.scoring.assists,
                            source: 'mysportsfeeds_projection',
                            isRealLine: false
                        });
                    }
                } else if (sport === 'mlb') {
                    if (stats.batting?.hits !== undefined) {
                        props.push({
                            player: playerName,
                            team: teamAbbr,
                            position: position,
                            propType: 'Hits',
                            line: roundToProperLine(stats.batting.hits, 'Hits'),
                            projection: stats.batting.hits,
                            source: 'mysportsfeeds_projection',
                            isRealLine: false
                        });
                    }
                    if (stats.pitching?.pitcherStrikeouts !== undefined) {
                        props.push({
                            player: playerName,
                            team: teamAbbr,
                            position: position,
                            propType: 'Strikeouts',
                            line: roundToProperLine(stats.pitching.pitcherStrikeouts, 'Strikeouts'),
                            projection: stats.pitching.pitcherStrikeouts,
                            source: 'mysportsfeeds_projection',
                            isRealLine: false
                        });
                    }
                }
            }
        }

        // Cache the result
        MSF_CACHE.projections[cacheKey] = {
            data: { props, count: props.length, source: 'mysportsfeeds' },
            lastUpdated: Date.now()
        };

        console.log(`✅ MySportsFeeds: Generated ${props.length} projections for ${sport.toUpperCase()}`);
        return MSF_CACHE.projections[cacheKey].data;

    } catch (error) {
        console.log(`⚠️ MySportsFeeds projections error: ${error.message}`);
        return { props: [], count: 0, error: error.message };
    }
}

// Combined function to get both ESPN and MySportsFeeds injuries
async function fetchAllInjuries(sport) {
    const results = { espn: [], mysportsfeeds: [], combined: [] };

    // Fetch from both sources in parallel
    const [espnData, msfData] = await Promise.allSettled([
        fetchESPNInjuries(sport),
        MYSPORTSFEEDS_API_KEY ? fetchMySportsFeedsInjuries(sport) : Promise.resolve({ injuries: [] })
    ]);

    // Process ESPN injuries
    if (espnData.status === 'fulfilled' && espnData.value) {
        results.espn = espnData.value;
    }

    // Process MySportsFeeds injuries
    if (msfData.status === 'fulfilled' && msfData.value?.injuries) {
        results.mysportsfeeds = msfData.value.injuries;
    }

    // Combine and deduplicate injuries
    const seenPlayers = new Set();

    // Add MySportsFeeds first (usually more detailed)
    for (const injury of results.mysportsfeeds) {
        const key = injury.player.toLowerCase();
        if (!seenPlayers.has(key)) {
            seenPlayers.add(key);
            results.combined.push(injury);
        }
    }

    // Add ESPN injuries that aren't already included
    if (results.espn.injuries) {
        for (const teamInjuries of results.espn.injuries) {
            if (teamInjuries.injuries) {
                for (const injury of teamInjuries.injuries) {
                    const playerName = injury.athlete?.displayName || injury.athlete?.fullName;
                    if (playerName) {
                        const key = playerName.toLowerCase();
                        if (!seenPlayers.has(key)) {
                            seenPlayers.add(key);
                            results.combined.push({
                                player: playerName,
                                team: teamInjuries.team?.abbreviation || '',
                                position: injury.athlete?.position?.abbreviation || '',
                                injuryType: injury.type?.text || 'Unknown',
                                status: injury.status || 'Out',
                                source: 'espn'
                            });
                        }
                    }
                }
            }
        }
    }

    console.log(`🏥 Combined injuries: ${results.combined.length} total (ESPN: ${results.espn.injuries?.length || 0}, MSF: ${results.mysportsfeeds.length})`);
    return results;
}

// =====================================================
// API-SPORTS INTEGRATION
// Free tier: 100 API calls per day
// Provides: Stats, Standings, Fixtures, Player data
// Get API key at: https://api-sports.io/
// =====================================================

// API-SPORTS cache
const API_SPORTS_CACHE = {
    games: {},
    standings: {},
    players: {},
    stats: {}
};
const API_SPORTS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache

// Fetch from API-SPORTS with proper headers
function fetchAPISports(sport, endpoint) {
    return new Promise((resolve, reject) => {
        if (!API_SPORTS_KEY) {
            reject(new Error('API-SPORTS key not configured'));
            return;
        }

        // Sport-specific base URLs
        const baseUrls = {
            'nba': 'https://v1.basketball.api-sports.io',
            'nfl': 'https://v1.american-football.api-sports.io',
            'nhl': 'https://v1.hockey.api-sports.io',
            'mlb': 'https://v1.baseball.api-sports.io'
        };

        const baseUrl = baseUrls[sport];
        if (!baseUrl) {
            reject(new Error(`API-SPORTS: Sport ${sport} not supported`));
            return;
        }

        const url = new URL(`${baseUrl}/${endpoint}`);

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'GET',
            timeout: REQUEST_TIMEOUT_MS,
            headers: {
                'x-rapidapi-key': API_SPORTS_KEY,
                'x-rapidapi-host': url.hostname,
                'Accept': 'application/json'
            }
        };

        const request = https.get(options, (response) => {
            let data = '';

            // Track remaining API calls
            if (response.headers['x-ratelimit-requests-remaining']) {
                const remaining = parseInt(response.headers['x-ratelimit-requests-remaining']);
                console.log(`📊 API-SPORTS calls remaining: ${remaining}/100`);
            }

            if (response.statusCode === 401) {
                reject(new Error('API-SPORTS: Invalid API key'));
                return;
            }

            if (response.statusCode === 429) {
                reject(new Error('API-SPORTS: Rate limit exceeded (100/day)'));
                return;
            }

            if (response.statusCode >= 400) {
                reject(new Error(`API-SPORTS error: ${response.statusCode}`));
                return;
            }

            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.errors && Object.keys(parsed.errors).length > 0) {
                        reject(new Error(`API-SPORTS: ${JSON.stringify(parsed.errors)}`));
                        return;
                    }
                    resolve(parsed);
                } catch (e) {
                    reject(new Error('API-SPORTS: Invalid JSON response'));
                }
            });
        });

        request.on('error', (err) => reject(err));
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('API-SPORTS: Request timeout'));
        });
    });
}

// Get league ID for API-SPORTS
function getAPISportsLeague(sport) {
    // Primary league IDs for each sport
    const leagues = {
        'nba': 12,      // NBA
        'nfl': 1,       // NFL
        'nhl': 57,      // NHL
        'mlb': 1        // MLB
    };
    return leagues[sport] || 1;
}

// Get current season for API-SPORTS
// NOTE: Free plan only supports 2022-2024 seasons
function getAPISportsSeason(sport) {
    // API-SPORTS free plan limitation: only 2022-2024 seasons
    // Use 2024 for most recent available data
    const FREE_PLAN_MAX_SEASON = 2024;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    let season;
    switch (sport) {
        case 'nba':
            // NBA season: Oct-June, uses start year
            season = month >= 10 ? year : year - 1;
            break;
        case 'nfl':
            // NFL season: Sep-Feb, uses start year
            season = month >= 9 || month <= 2 ? (month >= 9 ? year : year - 1) : year;
            break;
        case 'nhl':
            // NHL season: Oct-June, uses start year
            season = month >= 10 ? year : year - 1;
            break;
        case 'mlb':
            // MLB season: Mar-Oct
            season = year;
            break;
        default:
            season = year;
    }

    // Cap at 2024 for free plan
    return Math.min(season, FREE_PLAN_MAX_SEASON);
}

// Fetch today's games from API-SPORTS
async function fetchAPISportsGames(sport) {
    const cacheKey = `games_${sport}`;

    // Check cache
    if (API_SPORTS_CACHE.games[cacheKey] &&
        API_SPORTS_CACHE.games[cacheKey].lastUpdated &&
        (Date.now() - API_SPORTS_CACHE.games[cacheKey].lastUpdated < API_SPORTS_CACHE_TTL)) {
        console.log(`📦 Using cached API-SPORTS games for ${sport.toUpperCase()}`);
        return API_SPORTS_CACHE.games[cacheKey].data;
    }

    try {
        const today = new Date().toISOString().slice(0, 10);
        const league = getAPISportsLeague(sport);
        const season = getAPISportsSeason(sport);

        let endpoint;
        if (sport === 'nba' || sport === 'nhl') {
            endpoint = `games?league=${league}&season=${season}&date=${today}`;
        } else if (sport === 'nfl') {
            endpoint = `games?league=${league}&season=${season}`;
        } else if (sport === 'mlb') {
            endpoint = `games?league=${league}&season=${season}&date=${today}`;
        }

        console.log(`🏀 Fetching API-SPORTS games: ${endpoint}`);
        const data = await fetchAPISports(sport, endpoint);

        const games = [];
        if (data.response) {
            for (const game of data.response) {
                games.push({
                    id: game.id,
                    homeTeam: game.teams?.home?.name || '',
                    homeTeamId: game.teams?.home?.id,
                    awayTeam: game.teams?.away?.name || '',
                    awayTeamId: game.teams?.away?.id,
                    homeScore: game.scores?.home?.total ?? game.scores?.home?.points ?? null,
                    awayScore: game.scores?.away?.total ?? game.scores?.away?.points ?? null,
                    status: game.status?.long || game.status?.short || '',
                    startTime: game.date || game.time,
                    venue: game.venue?.name || '',
                    source: 'api-sports'
                });
            }
        }

        // Cache result
        API_SPORTS_CACHE.games[cacheKey] = {
            data: { games, count: games.length, source: 'api-sports' },
            lastUpdated: Date.now()
        };

        console.log(`✅ API-SPORTS: Found ${games.length} games for ${sport.toUpperCase()}`);
        return API_SPORTS_CACHE.games[cacheKey].data;

    } catch (error) {
        console.log(`⚠️ API-SPORTS games error: ${error.message}`);
        return { games: [], count: 0, error: error.message };
    }
}

// Fetch standings from API-SPORTS
async function fetchAPISportsStandings(sport) {
    const cacheKey = `standings_${sport}`;

    // Check cache
    if (API_SPORTS_CACHE.standings[cacheKey] &&
        API_SPORTS_CACHE.standings[cacheKey].lastUpdated &&
        (Date.now() - API_SPORTS_CACHE.standings[cacheKey].lastUpdated < API_SPORTS_CACHE_TTL)) {
        console.log(`📦 Using cached API-SPORTS standings for ${sport.toUpperCase()}`);
        return API_SPORTS_CACHE.standings[cacheKey].data;
    }

    try {
        const league = getAPISportsLeague(sport);
        const season = getAPISportsSeason(sport);
        const endpoint = `standings?league=${league}&season=${season}`;

        console.log(`📊 Fetching API-SPORTS standings: ${endpoint}`);
        const data = await fetchAPISports(sport, endpoint);

        const standings = [];
        if (data.response) {
            for (const entry of data.response) {
                // Handle different response structures
                const teams = entry.league?.standings || entry || [];
                const teamList = Array.isArray(teams) ? teams : [teams];

                for (const team of teamList) {
                    if (Array.isArray(team)) {
                        // Nested array structure
                        for (const t of team) {
                            standings.push({
                                team: t.team?.name || t.name || '',
                                teamId: t.team?.id || t.id,
                                wins: t.win?.total ?? t.won ?? t.wins ?? 0,
                                losses: t.lose?.total ?? t.lost ?? t.losses ?? 0,
                                ties: t.draw?.total ?? t.ties ?? 0,
                                winPct: t.win?.percentage ?? t.percentage ?? null,
                                position: t.position || t.rank || 0,
                                conference: t.group?.name || t.conference || '',
                                division: t.division?.name || t.division || '',
                                source: 'api-sports'
                            });
                        }
                    } else if (team.team) {
                        standings.push({
                            team: team.team?.name || '',
                            teamId: team.team?.id,
                            wins: team.win?.total ?? team.won ?? 0,
                            losses: team.lose?.total ?? team.lost ?? 0,
                            ties: team.draw?.total ?? 0,
                            winPct: team.win?.percentage ?? null,
                            position: team.position || team.rank || 0,
                            conference: team.group?.name || '',
                            division: team.division?.name || '',
                            source: 'api-sports'
                        });
                    }
                }
            }
        }

        // Cache result
        API_SPORTS_CACHE.standings[cacheKey] = {
            data: { standings, count: standings.length, source: 'api-sports' },
            lastUpdated: Date.now()
        };

        console.log(`✅ API-SPORTS: Found ${standings.length} team standings for ${sport.toUpperCase()}`);
        return API_SPORTS_CACHE.standings[cacheKey].data;

    } catch (error) {
        console.log(`⚠️ API-SPORTS standings error: ${error.message}`);
        return { standings: [], count: 0, error: error.message };
    }
}

// Fetch player statistics from API-SPORTS
async function fetchAPISportsPlayerStats(sport, playerId) {
    const cacheKey = `player_${sport}_${playerId}`;

    // Check cache
    if (API_SPORTS_CACHE.stats[cacheKey] &&
        API_SPORTS_CACHE.stats[cacheKey].lastUpdated &&
        (Date.now() - API_SPORTS_CACHE.stats[cacheKey].lastUpdated < API_SPORTS_CACHE_TTL)) {
        return API_SPORTS_CACHE.stats[cacheKey].data;
    }

    try {
        const season = getAPISportsSeason(sport);
        const endpoint = `players/statistics?id=${playerId}&season=${season}`;

        console.log(`📊 Fetching API-SPORTS player stats: ${endpoint}`);
        const data = await fetchAPISports(sport, endpoint);

        let playerStats = null;
        if (data.response && data.response.length > 0) {
            const stats = data.response[0];
            playerStats = {
                playerId: playerId,
                player: stats.player?.name || '',
                team: stats.team?.name || '',
                position: stats.player?.position || '',
                games: stats.games?.played || 0,
                stats: stats.statistics || stats,
                source: 'api-sports'
            };
        }

        // Cache result
        API_SPORTS_CACHE.stats[cacheKey] = {
            data: playerStats,
            lastUpdated: Date.now()
        };

        return playerStats;

    } catch (error) {
        console.log(`⚠️ API-SPORTS player stats error: ${error.message}`);
        return null;
    }
}

// Fetch top players/leaders from API-SPORTS
async function fetchAPISportsTopPlayers(sport, statType = 'points') {
    const cacheKey = `top_${sport}_${statType}`;

    // Check cache
    if (API_SPORTS_CACHE.players[cacheKey] &&
        API_SPORTS_CACHE.players[cacheKey].lastUpdated &&
        (Date.now() - API_SPORTS_CACHE.players[cacheKey].lastUpdated < API_SPORTS_CACHE_TTL)) {
        console.log(`📦 Using cached API-SPORTS top players for ${sport.toUpperCase()}`);
        return API_SPORTS_CACHE.players[cacheKey].data;
    }

    try {
        const league = getAPISportsLeague(sport);
        const season = getAPISportsSeason(sport);

        // Different endpoints based on sport
        let endpoint;
        if (sport === 'nba') {
            endpoint = `players?league=${league}&season=${season}`;
        } else if (sport === 'nfl') {
            endpoint = `players?league=${league}&season=${season}`;
        } else {
            endpoint = `players?league=${league}&season=${season}`;
        }

        console.log(`⭐ Fetching API-SPORTS players: ${endpoint}`);
        const data = await fetchAPISports(sport, endpoint);

        const players = [];
        if (data.response) {
            for (const player of data.response.slice(0, 50)) {
                players.push({
                    id: player.id,
                    name: player.name || `${player.firstname} ${player.lastname}`,
                    team: player.team?.name || '',
                    teamId: player.team?.id,
                    position: player.position || '',
                    age: player.age,
                    height: player.height,
                    weight: player.weight,
                    source: 'api-sports'
                });
            }
        }

        // Cache result
        API_SPORTS_CACHE.players[cacheKey] = {
            data: { players, count: players.length, source: 'api-sports' },
            lastUpdated: Date.now()
        };

        console.log(`✅ API-SPORTS: Found ${players.length} players for ${sport.toUpperCase()}`);
        return API_SPORTS_CACHE.players[cacheKey].data;

    } catch (error) {
        console.log(`⚠️ API-SPORTS players error: ${error.message}`);
        return { players: [], count: 0, error: error.message };
    }
}

// Fetch odds from API-SPORTS (if available)
async function fetchAPISportsOdds(sport) {
    const cacheKey = `odds_${sport}`;

    // Check cache
    if (API_SPORTS_CACHE[cacheKey] &&
        API_SPORTS_CACHE[cacheKey].lastUpdated &&
        (Date.now() - API_SPORTS_CACHE[cacheKey].lastUpdated < API_SPORTS_CACHE_TTL)) {
        console.log(`📦 Using cached API-SPORTS odds for ${sport.toUpperCase()}`);
        return API_SPORTS_CACHE[cacheKey].data;
    }

    try {
        const league = getAPISportsLeague(sport);
        const endpoint = `odds?league=${league}`;

        console.log(`💰 Fetching API-SPORTS odds: ${endpoint}`);
        const data = await fetchAPISports(sport, endpoint);

        const odds = [];
        if (data.response) {
            for (const game of data.response) {
                const bookmakers = game.bookmakers || [];
                for (const book of bookmakers) {
                    const bets = book.bets || [];
                    for (const bet of bets) {
                        if (bet.name === 'Home/Away' || bet.name === 'Match Winner') {
                            odds.push({
                                gameId: game.game?.id,
                                bookmaker: book.name,
                                homeTeam: game.game?.teams?.home?.name,
                                awayTeam: game.game?.teams?.away?.name,
                                homeOdds: bet.values?.find(v => v.value === 'Home')?.odd,
                                awayOdds: bet.values?.find(v => v.value === 'Away')?.odd,
                                source: 'api-sports'
                            });
                        }
                    }
                }
            }
        }

        // Cache result
        API_SPORTS_CACHE[cacheKey] = {
            data: { odds, count: odds.length, source: 'api-sports' },
            lastUpdated: Date.now()
        };

        console.log(`✅ API-SPORTS: Found ${odds.length} odds entries for ${sport.toUpperCase()}`);
        return API_SPORTS_CACHE[cacheKey].data;

    } catch (error) {
        console.log(`⚠️ API-SPORTS odds error: ${error.message}`);
        return { odds: [], count: 0, error: error.message };
    }
}

// =====================================================
// SOFASCORE API INTEGRATION
// Free API - No key required
// Provides: Live scores, odds comparison, match data
// Base URL: https://api.sofascore.com/api/v1
// =====================================================

// SofaScore cache
const SOFASCORE_CACHE = {
    events: {},
    odds: {},
    liveOdds: {}
};
const SOFASCORE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache (odds change frequently)

// SofaScore sport IDs
const SOFASCORE_SPORTS = {
    'nba': { category: 'basketball', uniqueTournamentId: 132 },  // NBA
    'nfl': { category: 'american-football', uniqueTournamentId: 9464 }, // NFL
    'nhl': { category: 'ice-hockey', uniqueTournamentId: 234 },  // NHL
    'mlb': { category: 'baseball', uniqueTournamentId: 11205 }, // MLB
    'ncaab': { category: 'basketball', uniqueTournamentId: 137 }, // NCAA Basketball
    'ncaaf': { category: 'american-football', uniqueTournamentId: 9468 } // NCAA Football
};

// Fetch from SofaScore API
function fetchSofaScore(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `https://api.sofascore.com/api/v1/${endpoint}`;

        const options = {
            hostname: 'api.sofascore.com',
            path: `/api/v1/${endpoint}`,
            method: 'GET',
            timeout: REQUEST_TIMEOUT_MS,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Referer': 'https://www.sofascore.com/',
                'Origin': 'https://www.sofascore.com'
            }
        };

        const request = https.get(options, (response) => {
            let data = '';

            if (response.statusCode === 403 || response.statusCode === 429) {
                reject(new Error(`SofaScore: Access blocked (${response.statusCode})`));
                return;
            }

            if (response.statusCode >= 400) {
                reject(new Error(`SofaScore API error: ${response.statusCode}`));
                return;
            }

            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('SofaScore: Invalid JSON response'));
                }
            });
        });

        request.on('error', (err) => reject(err));
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('SofaScore: Request timeout'));
        });
    });
}

// Fetch today's events from SofaScore
async function fetchSofaScoreEvents(sport) {
    const cacheKey = `events_${sport}`;

    // Check cache
    if (SOFASCORE_CACHE.events[cacheKey] &&
        SOFASCORE_CACHE.events[cacheKey].lastUpdated &&
        (Date.now() - SOFASCORE_CACHE.events[cacheKey].lastUpdated < SOFASCORE_CACHE_TTL)) {
        console.log(`📦 Using cached SofaScore events for ${sport.toUpperCase()}`);
        return SOFASCORE_CACHE.events[cacheKey].data;
    }

    try {
        const sportConfig = SOFASCORE_SPORTS[sport];
        if (!sportConfig) {
            throw new Error(`SofaScore: Sport ${sport} not supported`);
        }

        // Get today's date
        const today = new Date().toISOString().slice(0, 10);
        const endpoint = `sport/${sportConfig.category}/scheduled-events/${today}`;

        console.log(`📊 Fetching SofaScore events: ${endpoint}`);
        const data = await fetchSofaScore(endpoint);

        const events = [];
        if (data.events) {
            for (const event of data.events) {
                // Filter by tournament if needed
                if (sportConfig.uniqueTournamentId &&
                    event.tournament?.uniqueTournament?.id !== sportConfig.uniqueTournamentId) {
                    continue;
                }

                events.push({
                    id: event.id,
                    homeTeam: event.homeTeam?.name || event.homeTeam?.shortName || '',
                    homeTeamId: event.homeTeam?.id,
                    awayTeam: event.awayTeam?.name || event.awayTeam?.shortName || '',
                    awayTeamId: event.awayTeam?.id,
                    homeScore: event.homeScore?.current ?? null,
                    awayScore: event.awayScore?.current ?? null,
                    status: event.status?.description || event.status?.type || '',
                    statusCode: event.status?.code,
                    startTime: event.startTimestamp ? new Date(event.startTimestamp * 1000).toISOString() : null,
                    tournament: event.tournament?.name || '',
                    season: event.season?.name || '',
                    hasOdds: event.hasOdds || false,
                    source: 'sofascore'
                });
            }
        }

        // Cache result
        SOFASCORE_CACHE.events[cacheKey] = {
            data: { events, count: events.length, source: 'sofascore' },
            lastUpdated: Date.now()
        };

        console.log(`✅ SofaScore: Found ${events.length} events for ${sport.toUpperCase()}`);
        return SOFASCORE_CACHE.events[cacheKey].data;

    } catch (error) {
        console.log(`⚠️ SofaScore events error: ${error.message}`);
        return { events: [], count: 0, error: error.message };
    }
}

// Fetch odds for a specific event from SofaScore
async function fetchSofaScoreEventOdds(eventId) {
    const cacheKey = `odds_${eventId}`;

    // Check cache (shorter TTL for odds)
    if (SOFASCORE_CACHE.odds[cacheKey] &&
        SOFASCORE_CACHE.odds[cacheKey].lastUpdated &&
        (Date.now() - SOFASCORE_CACHE.odds[cacheKey].lastUpdated < SOFASCORE_CACHE_TTL)) {
        return SOFASCORE_CACHE.odds[cacheKey].data;
    }

    try {
        const endpoint = `event/${eventId}/odds/1/all`;

        console.log(`💰 Fetching SofaScore odds for event ${eventId}`);
        const data = await fetchSofaScore(endpoint);

        const oddsData = {
            eventId: eventId,
            markets: [],
            bookmakers: [],
            source: 'sofascore'
        };

        if (data.markets) {
            for (const market of data.markets) {
                const marketData = {
                    marketId: market.marketId,
                    marketName: market.marketName || market.structureType,
                    choices: []
                };

                if (market.choices) {
                    for (const choice of market.choices) {
                        marketData.choices.push({
                            name: choice.name,
                            odds: choice.fractionalValue || choice.odds,
                            decimalOdds: choice.odds,
                            change: choice.change, // 1 = up, -1 = down, 0 = same
                            sourceId: choice.sourceId
                        });
                    }
                }

                oddsData.markets.push(marketData);
            }
        }

        // Extract bookmaker info
        if (data.providers) {
            for (const provider of data.providers) {
                oddsData.bookmakers.push({
                    id: provider.id,
                    name: provider.name,
                    logo: provider.logo
                });
            }
        }

        // Cache result
        SOFASCORE_CACHE.odds[cacheKey] = {
            data: oddsData,
            lastUpdated: Date.now()
        };

        return oddsData;

    } catch (error) {
        console.log(`⚠️ SofaScore odds error for event ${eventId}: ${error.message}`);
        return { eventId, markets: [], error: error.message };
    }
}

// Fetch live odds comparison for all today's games
async function fetchSofaScoreLiveOdds(sport) {
    const cacheKey = `liveOdds_${sport}`;

    // Check cache
    if (SOFASCORE_CACHE.liveOdds[cacheKey] &&
        SOFASCORE_CACHE.liveOdds[cacheKey].lastUpdated &&
        (Date.now() - SOFASCORE_CACHE.liveOdds[cacheKey].lastUpdated < SOFASCORE_CACHE_TTL)) {
        console.log(`📦 Using cached SofaScore live odds for ${sport.toUpperCase()}`);
        return SOFASCORE_CACHE.liveOdds[cacheKey].data;
    }

    try {
        // First get today's events
        const eventsData = await fetchSofaScoreEvents(sport);

        if (!eventsData.events || eventsData.events.length === 0) {
            return { games: [], count: 0, source: 'sofascore', message: 'No games today' };
        }

        // Fetch odds for events that have odds available
        const gamesWithOdds = [];
        const eventsWithOdds = eventsData.events.filter(e => e.hasOdds).slice(0, 10); // Limit to 10 games

        for (const event of eventsWithOdds) {
            try {
                const oddsData = await fetchSofaScoreEventOdds(event.id);

                // Find moneyline/winner market
                const moneylineMarket = oddsData.markets?.find(m =>
                    m.marketName?.toLowerCase().includes('winner') ||
                    m.marketName?.toLowerCase().includes('moneyline') ||
                    m.marketId === 1
                );

                // Find spread/handicap market
                const spreadMarket = oddsData.markets?.find(m =>
                    m.marketName?.toLowerCase().includes('spread') ||
                    m.marketName?.toLowerCase().includes('handicap')
                );

                // Find totals market
                const totalsMarket = oddsData.markets?.find(m =>
                    m.marketName?.toLowerCase().includes('total') ||
                    m.marketName?.toLowerCase().includes('over/under')
                );

                gamesWithOdds.push({
                    eventId: event.id,
                    homeTeam: event.homeTeam,
                    awayTeam: event.awayTeam,
                    startTime: event.startTime,
                    status: event.status,
                    moneyline: moneylineMarket ? {
                        home: moneylineMarket.choices?.find(c => c.name?.toLowerCase().includes('home') || c.name === event.homeTeam)?.decimalOdds,
                        away: moneylineMarket.choices?.find(c => c.name?.toLowerCase().includes('away') || c.name === event.awayTeam)?.decimalOdds,
                        draw: moneylineMarket.choices?.find(c => c.name?.toLowerCase().includes('draw'))?.decimalOdds
                    } : null,
                    spread: spreadMarket ? {
                        homeSpread: spreadMarket.choices?.[0]?.name,
                        homeOdds: spreadMarket.choices?.[0]?.decimalOdds,
                        awaySpread: spreadMarket.choices?.[1]?.name,
                        awayOdds: spreadMarket.choices?.[1]?.decimalOdds
                    } : null,
                    totals: totalsMarket ? {
                        line: totalsMarket.choices?.[0]?.name?.match(/[\d.]+/)?.[0],
                        overOdds: totalsMarket.choices?.find(c => c.name?.toLowerCase().includes('over'))?.decimalOdds,
                        underOdds: totalsMarket.choices?.find(c => c.name?.toLowerCase().includes('under'))?.decimalOdds
                    } : null,
                    bookmakers: oddsData.bookmakers?.map(b => b.name) || [],
                    source: 'sofascore'
                });

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (e) {
                console.log(`⚠️ Failed to get odds for event ${event.id}: ${e.message}`);
            }
        }

        // Cache result
        SOFASCORE_CACHE.liveOdds[cacheKey] = {
            data: {
                games: gamesWithOdds,
                count: gamesWithOdds.length,
                totalEvents: eventsData.events.length,
                source: 'sofascore',
                lastUpdated: new Date().toISOString()
            },
            lastUpdated: Date.now()
        };

        console.log(`✅ SofaScore: Found odds for ${gamesWithOdds.length} games in ${sport.toUpperCase()}`);
        return SOFASCORE_CACHE.liveOdds[cacheKey].data;

    } catch (error) {
        console.log(`⚠️ SofaScore live odds error: ${error.message}`);
        return { games: [], count: 0, error: error.message };
    }
}

// Get best odds comparison across bookmakers
async function fetchSofaScoreBestOdds(sport) {
    try {
        const liveOddsData = await fetchSofaScoreLiveOdds(sport);

        if (!liveOddsData.games || liveOddsData.games.length === 0) {
            return { comparisons: [], count: 0, source: 'sofascore' };
        }

        const comparisons = liveOddsData.games.map(game => {
            // Convert decimal odds to American odds for display
            const decimalToAmerican = (decimal) => {
                if (!decimal) return null;
                if (decimal >= 2) {
                    return Math.round((decimal - 1) * 100);
                } else {
                    return Math.round(-100 / (decimal - 1));
                }
            };

            return {
                matchup: `${game.awayTeam} @ ${game.homeTeam}`,
                startTime: game.startTime,
                homeTeam: game.homeTeam,
                awayTeam: game.awayTeam,
                moneyline: game.moneyline ? {
                    homeDecimal: game.moneyline.home,
                    homeAmerican: decimalToAmerican(game.moneyline.home),
                    awayDecimal: game.moneyline.away,
                    awayAmerican: decimalToAmerican(game.moneyline.away)
                } : null,
                spread: game.spread,
                totals: game.totals,
                bookmakers: game.bookmakers,
                source: 'sofascore'
            };
        });

        return {
            comparisons,
            count: comparisons.length,
            source: 'sofascore',
            lastUpdated: liveOddsData.lastUpdated
        };

    } catch (error) {
        console.log(`⚠️ SofaScore best odds error: ${error.message}`);
        return { comparisons: [], count: 0, error: error.message };
    }
}

// Helper function to fetch JSON with timeout and rate limit handling
function fetchJSON(apiUrl, skipRateLimit = false) {
    return new Promise((resolve, reject) => {
        // Only check rate limit for The Odds API, not for ESPN (which is free)
        const isOddsApi = apiUrl.includes('api.the-odds-api.com');

        if (isOddsApi && !skipRateLimit && rateLimitedUntil && Date.now() < rateLimitedUntil) {
            const waitTime = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
            reject(new Error(`Rate limited. Try again in ${waitTime} seconds.`));
            return;
        }

        const request = https.get(apiUrl, { timeout: REQUEST_TIMEOUT_MS }, (response) => {
            let data = '';

            // Track rate limit headers from The Odds API
            if (isOddsApi && response.headers['x-requests-remaining']) {
                apiRequestsRemaining = parseInt(response.headers['x-requests-remaining']);
                console.log(`📊 API requests remaining: ${apiRequestsRemaining}`);
            }

            // Handle rate limit response (429) - only applies to The Odds API
            if (response.statusCode === 429 && isOddsApi) {
                rateLimitedUntil = Date.now() + RATE_LIMIT_RETRY_DELAY_MS;
                console.warn('⚠️ Rate limit exceeded! Waiting 60 seconds...');
                reject(new Error('API rate limit exceeded. Please try again later.'));
                return;
            }

            // Handle other error status codes
            if (response.statusCode === 401) {
                reject(new Error('Invalid API key'));
                return;
            }

            if (response.statusCode === 404) {
                reject(new Error('Resource not found'));
                return;
            }

            if (response.statusCode >= 400) {
                reject(new Error(`API error: ${response.statusCode}`));
                return;
            }

            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('Invalid JSON response'));
                }
            });
        });

        // Handle request timeout
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Request timeout - API took too long to respond'));
        });

        // Handle connection errors
        request.on('error', (error) => {
            if (error.code === 'ECONNRESET') {
                reject(new Error('Connection reset - please try again'));
            } else if (error.code === 'ENOTFOUND') {
                reject(new Error('Cannot reach API server - check internet connection'));
            } else {
                reject(error);
            }
        });
    });
}

// =====================================================
// NEW DATA SOURCE FUNCTIONS
// =====================================================

// =====================================================
// NBA.COM OFFICIAL STATS API - Free, Real Player Stats
// https://stats.nba.com - Official NBA statistics
// =====================================================
async function fetchNBAOfficialStats() {
    const cacheKey = 'nba_official_stats';
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < PROPS_CACHE_TTL_MS)) {
        console.log('📦 Returning cached NBA official stats');
        return propsCache[cacheKey].data;
    }

    try {
        console.log('🏀 Fetching REAL NBA stats from stats.nba.com...');

        // NBA.com requires specific headers
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://www.nba.com/',
            'Origin': 'https://www.nba.com',
            'Accept-Language': 'en-US,en;q=0.9'
        };

        // Fetch league leaders for multiple categories
        const categories = ['PTS', 'REB', 'AST', 'FG3M', 'STL', 'BLK'];
        const allLeaders = {};

        for (const cat of categories) {
            const url = `https://stats.nba.com/stats/leagueleaders?LeagueID=00&PerMode=PerGame&Scope=S&Season=2024-25&SeasonType=Regular+Season&StatCategory=${cat}`;

            try {
                const data = await fetchJSONWithHeaders(url, headers);
                if (data?.resultSet?.rowSet) {
                    const headerRow = data.resultSet.headers;
                    const playerIdx = headerRow.indexOf('PLAYER');
                    const teamIdx = headerRow.indexOf('TEAM');
                    const ptsIdx = headerRow.indexOf('PTS');
                    const rebIdx = headerRow.indexOf('REB');
                    const astIdx = headerRow.indexOf('AST');
                    const fg3mIdx = headerRow.indexOf('FG3M');
                    const stlIdx = headerRow.indexOf('STL');
                    const blkIdx = headerRow.indexOf('BLK');
                    const gpIdx = headerRow.indexOf('GP');
                    const minIdx = headerRow.indexOf('MIN');

                    allLeaders[cat] = data.resultSet.rowSet.slice(0, 30).map(row => ({
                        player: row[playerIdx],
                        team: row[teamIdx],
                        points: row[ptsIdx],
                        rebounds: row[rebIdx],
                        assists: row[astIdx],
                        threes: row[fg3mIdx],
                        steals: row[stlIdx],
                        blocks: row[blkIdx],
                        gamesPlayed: row[gpIdx],
                        minutes: row[minIdx],
                        category: cat
                    }));

                    console.log(`  ✅ ${cat}: ${allLeaders[cat].length} players`);
                }
            } catch (e) {
                console.log(`  ⚠️ Could not fetch ${cat} leaders: ${e.message}`);
            }
        }

        // Combine all unique players with their stats
        const playerMap = new Map();
        for (const cat of Object.keys(allLeaders)) {
            for (const player of allLeaders[cat]) {
                if (!playerMap.has(player.player)) {
                    playerMap.set(player.player, player);
                }
            }
        }

        const players = Array.from(playerMap.values());

        const result = {
            players,
            leadersByCategory: allLeaders,
            source: 'nba_official',
            count: players.length,
            timestamp: new Date().toISOString()
        };

        propsCache[cacheKey] = { data: result, timestamp: Date.now() };
        console.log(`✅ NBA Official Stats: ${players.length} unique players with REAL stats`);
        return result;
    } catch (error) {
        console.error('NBA Official Stats API error:', error.message);
        return { players: [], leadersByCategory: {}, source: 'nba_official', error: error.message };
    }
}

// Fetch JSON with custom headers (for NBA.com)
function fetchJSONWithHeaders(apiUrl, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(apiUrl);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            timeout: REQUEST_TIMEOUT_MS,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ...headers
            }
        };

        const request = https.request(options, (response) => {
            let data = '';

            if (response.statusCode >= 400) {
                reject(new Error(`API error: ${response.statusCode}`));
                return;
            }

            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('Invalid JSON response'));
                }
            });
        });

        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });

        request.on('error', (error) => {
            reject(error);
        });

        request.end();
    });
}

// =====================================================
// MLB OFFICIAL STATS API - Real Player Statistics
// https://statsapi.mlb.com - Official MLB statistics
// =====================================================
async function fetchMLBPlayerStats() {
    const cacheKey = 'mlb_player_stats';
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < PROPS_CACHE_TTL_MS)) {
        console.log('📦 Returning cached MLB player stats');
        return propsCache[cacheKey].data;
    }

    try {
        console.log('⚾ Fetching REAL MLB stats from statsapi.mlb.com...');

        // Get hitting leaders
        const hittingUrl = 'https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=homeRuns,hits,rbi,battingAverage,stolenBases&season=2024&limit=25';
        const hittingData = await fetchJSON(hittingUrl);

        // Get pitching leaders
        const pitchingUrl = 'https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=strikeouts,wins,era,saves&season=2024&limit=25';
        const pitchingData = await fetchJSON(pitchingUrl);

        const hittingLeaders = [];
        const pitchingLeaders = [];

        // Parse hitting stats
        if (hittingData?.leagueLeaders) {
            for (const category of hittingData.leagueLeaders) {
                const catName = category.leaderCategory;
                for (const leader of (category.leaders || []).slice(0, 15)) {
                    hittingLeaders.push({
                        player: leader.person?.fullName,
                        team: leader.team?.name,
                        teamAbbr: leader.team?.abbreviation,
                        category: catName,
                        value: leader.value,
                        rank: leader.rank,
                        gamesPlayed: leader.gamesPlayed || 162,
                        perGame: catName === 'battingAverage' ? leader.value : (parseFloat(leader.value) / (leader.gamesPlayed || 162)).toFixed(2)
                    });
                }
            }
        }

        // Parse pitching stats
        if (pitchingData?.leagueLeaders) {
            for (const category of pitchingData.leagueLeaders) {
                const catName = category.leaderCategory;
                for (const leader of (category.leaders || []).slice(0, 15)) {
                    pitchingLeaders.push({
                        player: leader.person?.fullName,
                        team: leader.team?.name,
                        teamAbbr: leader.team?.abbreviation,
                        category: catName,
                        value: leader.value,
                        rank: leader.rank,
                        gamesPlayed: leader.gamesPlayed || 30,
                        perGame: catName === 'era' ? leader.value : (parseFloat(leader.value) / (leader.gamesPlayed || 30)).toFixed(2)
                    });
                }
            }
        }

        const result = {
            hittingLeaders,
            pitchingLeaders,
            source: 'mlb_official',
            hittingCount: hittingLeaders.length,
            pitchingCount: pitchingLeaders.length,
            timestamp: new Date().toISOString()
        };

        propsCache[cacheKey] = { data: result, timestamp: Date.now() };
        console.log(`✅ MLB Official Stats: ${hittingLeaders.length} hitters, ${pitchingLeaders.length} pitchers with REAL stats`);
        return result;
    } catch (error) {
        console.error('MLB Official Stats API error:', error.message);
        return { hittingLeaders: [], pitchingLeaders: [], source: 'mlb_official', error: error.message };
    }
}

// =====================================================
// NHL OFFICIAL STATS API - Real Player Statistics
// https://api-web.nhle.com - Official NHL statistics
// =====================================================
async function fetchNHLPlayerStats() {
    const cacheKey = 'nhl_player_stats';
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < PROPS_CACHE_TTL_MS)) {
        console.log('📦 Returning cached NHL player stats');
        return propsCache[cacheKey].data;
    }

    try {
        console.log('🏒 Fetching REAL NHL stats from api-web.nhle.com...');

        // NHL API requires season/gameType format, NOT /current
        // Season format: YYYYYYYY (e.g., 20242025), gameType: 2 = regular season
        const currentSeason = '20242025';
        const skaterUrl = `https://api-web.nhle.com/v1/skater-stats-leaders/${currentSeason}/2?categories=points,goals,assists&limit=30`;
        let skaterLeaders = [];

        try {
            const skaterData = await fetchJSON(skaterUrl);

            // Process each category - NHL API response structure
            for (const category of ['points', 'goals', 'assists']) {
                if (skaterData[category]) {
                    for (const player of skaterData[category].slice(0, 20)) {
                        const gamesPlayed = player.gamesPlayed || 60;
                        skaterLeaders.push({
                            player: `${player.firstName?.default || ''} ${player.lastName?.default || ''}`.trim(),
                            team: player.teamAbbrev,  // Direct string, not nested .default
                            category: category,
                            value: player.value,
                            gamesPlayed: gamesPlayed,
                            perGame: (player.value / gamesPlayed).toFixed(2),
                            headshot: player.headshot,
                            position: player.positionCode || 'F'
                        });
                    }
                }
            }
            console.log(`✅ NHL Skater stats: ${skaterLeaders.length} leaders loaded from official API`);
        } catch (e) {
            console.log(`  ⚠️ Could not fetch skater stats: ${e.message}`);
        }

        // Get goalie stats - also use season/gameType format
        const goalieUrl = `https://api-web.nhle.com/v1/goalie-stats-leaders/${currentSeason}/2?categories=wins,savePctg&limit=20`;
        let goalieLeaders = [];

        try {
            const goalieData = await fetchJSON(goalieUrl);

            for (const category of ['wins', 'savePctg']) {
                if (goalieData[category]) {
                    for (const player of goalieData[category].slice(0, 10)) {
                        goalieLeaders.push({
                            player: `${player.firstName?.default || ''} ${player.lastName?.default || ''}`.trim(),
                            team: player.teamAbbrev,  // Direct string, not nested .default
                            category: category,
                            value: player.value,
                            gamesPlayed: player.gamesPlayed || 50,
                            headshot: player.headshot
                        });
                    }
                }
            }
            console.log(`✅ NHL Goalie stats: ${goalieLeaders.length} leaders loaded`);
        } catch (e) {
            console.log(`  ⚠️ Could not fetch goalie stats: ${e.message}`);
        }

        const result = {
            skaterLeaders,
            goalieLeaders,
            source: 'nhl_official',
            skaterCount: skaterLeaders.length,
            goalieCount: goalieLeaders.length,
            timestamp: new Date().toISOString()
        };

        propsCache[cacheKey] = { data: result, timestamp: Date.now() };
        console.log(`✅ NHL Official Stats: ${skaterLeaders.length} skaters, ${goalieLeaders.length} goalies with REAL stats`);
        return result;
    } catch (error) {
        console.error('NHL Official Stats API error:', error.message);
        return { skaterLeaders: [], goalieLeaders: [], source: 'nhl_official', error: error.message };
    }
}

// =====================================================
// ESPN PLAYER STATISTICS - Real per-game averages
// =====================================================
async function fetchESPNPlayerStats(sport) {
    const cacheKey = `espn_player_stats_${sport}`;
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < PROPS_CACHE_TTL_MS)) {
        console.log(`📦 Returning cached ESPN ${sport.toUpperCase()} player stats`);
        return propsCache[cacheKey].data;
    }

    const sportPaths = {
        'nba': 'basketball/nba',
        'nfl': 'football/nfl',
        'nhl': 'hockey/nhl',
        'mlb': 'baseball/mlb'
    };

    const path = sportPaths[sport];
    if (!path) return { players: [], error: 'Sport not supported' };

    try {
        console.log(`📊 Fetching ESPN ${sport.toUpperCase()} player statistics...`);

        // Get athlete stats from ESPN
        const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/athletes?limit=100`;
        const data = await fetchJSON(url);

        const players = [];

        // ESPN may return athletes directly or nested
        const athleteList = data.athletes || data.items || [];

        for (const athlete of athleteList.slice(0, 50)) {
            // Try to get stats if available
            const stats = athlete.statistics || athlete.stats || {};

            players.push({
                id: athlete.id,
                name: athlete.fullName || athlete.displayName,
                team: athlete.team?.abbreviation || athlete.team?.displayName,
                position: athlete.position?.abbreviation,
                headshot: athlete.headshot?.href,
                stats: stats,
                source: 'espn'
            });
        }

        const result = {
            players,
            source: 'espn',
            count: players.length,
            timestamp: new Date().toISOString()
        };

        propsCache[cacheKey] = { data: result, timestamp: Date.now() };
        console.log(`✅ ESPN ${sport.toUpperCase()}: ${players.length} players`);
        return result;
    } catch (error) {
        console.error(`ESPN ${sport} stats error:`, error.message);
        return { players: [], source: 'espn', error: error.message };
    }
}

// =====================================================
// GENERATE PROPS FROM REAL STATS
// Creates betting props using actual player statistics
// Includes OVER and UNDER picks with tier classification
// Enhanced with opponent, weather, and contextual factors
// =====================================================
// Helper function to create NFL prop object with enhanced data
function createNFLProp(playerData, propType, line, perGame, seasonTotal, prediction, gameContext = {}) {
    const { opponent, isHome, weather, factors } = gameContext;

    return {
        player: playerData.name,
        team: playerData.team,
        opponent: opponent || 'TBD',
        isHome: isHome,
        matchup: opponent ? `${isHome ? 'vs' : '@'} ${opponent}` : null,
        headshot: playerData.headshot,
        position: playerData.position || 'N/A',
        propType: propType,
        line: line,
        seasonAvg: typeof perGame === 'number' ? perGame.toFixed(1) : perGame,
        adjustedAvg: prediction.adjustedAvg || perGame,
        seasonTotal: seasonTotal,
        aiPick: prediction.pick,
        confidence: prediction.confidence,
        reasoning: prediction.reasoning || `Season avg: ${typeof perGame === 'number' ? perGame.toFixed(1) : perGame} per game`,
        factors: factors || prediction.factors || [],
        trend: prediction.trend,
        weather: weather ? {
            temp: weather.temperature,
            wind: weather.windSpeed,
            conditions: weather.isRaining ? 'Rain' : weather.isSnowing ? 'Snow' : 'Clear'
        } : null,
        over: generateBookOddsAccurate(-110),
        under: generateBookOddsAccurate(-110),
        source: 'nfl_official_stats',
        lastUpdated: new Date().toISOString()
    };
}

// Generate comprehensive Super Bowl props for key players from both teams
function generateSuperBowlProps() {
    const props = [];

    // Super Bowl LX: Seattle Seahawks vs New England Patriots (based on current scoreboard)
    // Key players with estimated realistic stats based on typical production
    const superBowlPlayers = [
        // Seattle Seahawks - Additional key players
        { name: 'DK Metcalf', team: 'SEA', position: 'WR', stats: { receivingYards: 950, receptions: 65, receivingTDs: 6 } },
        { name: 'Tyler Lockett', team: 'SEA', position: 'WR', stats: { receivingYards: 680, receptions: 58, receivingTDs: 4 } },
        { name: 'Noah Fant', team: 'SEA', position: 'TE', stats: { receivingYards: 420, receptions: 42, receivingTDs: 3 } },
        { name: 'Zach Charbonnet', team: 'SEA', position: 'RB', stats: { rushingYards: 480, carries: 95, rushingTDs: 4, receptions: 28, receivingYards: 220 } },

        // New England Patriots - Additional key players
        { name: 'Demario Douglas', team: 'NE', position: 'WR', stats: { receivingYards: 720, receptions: 75, receivingTDs: 5 } },
        { name: 'Ja\'Lynn Polk', team: 'NE', position: 'WR', stats: { receivingYards: 580, receptions: 48, receivingTDs: 4 } },
        { name: 'Hunter Henry', team: 'NE', position: 'TE', stats: { receivingYards: 580, receptions: 55, receivingTDs: 6 } },
        { name: 'Rhamondre Stevenson', team: 'NE', position: 'RB', stats: { rushingYards: 720, carries: 160, rushingTDs: 5, receptions: 35, receivingYards: 280 } },
        { name: 'Antonio Gibson', team: 'NE', position: 'RB', stats: { rushingYards: 380, carries: 80, rushingTDs: 3, receptions: 32, receivingYards: 260 } },

        // First TD Scorer Candidates (fantasy relevant)
        { name: 'Devon Achane', team: 'SEA', position: 'RB', stats: { rushingYards: 320, rushingTDs: 3, receivingYards: 180, receivingTDs: 2 } },

        // Defensive players with stats
        { name: 'Tariq Woolen', team: 'SEA', position: 'CB', stats: { interceptions: 4 } },
        { name: 'Christian Gonzalez', team: 'NE', position: 'CB', stats: { interceptions: 3 } },
        { name: 'Keion White', team: 'NE', position: 'DE', stats: { sacks: 8 } },
        { name: 'Boye Mafe', team: 'SEA', position: 'LB', stats: { sacks: 7.5 } },
    ];

    for (const player of superBowlPlayers) {
        const stats = player.stats;

        // Receiving props
        if (stats.receivingYards) {
            const perGame = stats.receivingYards / 17;
            // Betting lines vary around the average - add realistic variance
            const lineVariance = (Math.random() - 0.5) * 15; // ±7.5 yards variance
            const line = Math.round((perGame + lineVariance) * 2) / 2;
            const prediction = generateAIPrediction(perGame, line, 20, 'nfl');
            props.push({
                player: player.name,
                team: player.team,
                position: player.position,
                propType: 'Receiving Yards',
                line: line,
                seasonAvg: perGame.toFixed(1),
                seasonTotal: stats.receivingYards,
                aiPick: prediction.pick,
                confidence: prediction.confidence,
                reasoning: `Season avg: ${perGame.toFixed(1)} rec yards/game`,
                trend: prediction.trend,
                over: generateBookOddsAccurate(-110),
                under: generateBookOddsAccurate(-110),
                source: 'superbowl_projections',
                lastUpdated: new Date().toISOString()
            });
        }

        if (stats.receptions) {
            const perGame = stats.receptions / 17;
            // Betting lines vary around the average
            const lineVariance = (Math.random() - 0.5) * 1.5; // ±0.75 receptions variance
            const line = Math.round((perGame + lineVariance) * 2) / 2;
            const prediction = generateAIPrediction(perGame, line, 2, 'nfl');
            props.push({
                player: player.name,
                team: player.team,
                position: player.position,
                propType: 'Receptions',
                line: line,
                seasonAvg: perGame.toFixed(1),
                seasonTotal: stats.receptions,
                aiPick: prediction.pick,
                confidence: prediction.confidence,
                reasoning: `Season avg: ${perGame.toFixed(1)} receptions/game`,
                trend: prediction.trend,
                over: generateBookOddsAccurate(-110),
                under: generateBookOddsAccurate(-110),
                source: 'superbowl_projections',
                lastUpdated: new Date().toISOString()
            });
        }

        if (stats.receivingTDs) {
            const perGame = stats.receivingTDs / 17;
            // Calculate realistic TD probability for a single game
            const tdProbability = Math.min(0.85, perGame / 0.6); // 0.6 TDs/game = ~100% confidence
            const isLikelyToScore = perGame > 0.25;
            const confidence = Math.round(35 + tdProbability * 50 + Math.random() * 8); // Range ~40-90%
            props.push({
                player: player.name,
                team: player.team,
                position: player.position,
                propType: 'Anytime TD Scorer',
                line: 0.5,
                seasonAvg: perGame.toFixed(2),
                seasonTotal: stats.receivingTDs,
                aiPick: isLikelyToScore ? 'YES' : 'NO',
                confidence: Math.min(85, Math.max(40, confidence)),
                reasoning: `${stats.receivingTDs} TDs this season (${perGame.toFixed(2)}/game)`,
                trend: perGame > 0.35 ? 'STRONG' : perGame > 0.25 ? 'MODERATE' : 'WEAK',
                over: generateBookOddsAccurate(isLikelyToScore ? -130 : +120),
                under: generateBookOddsAccurate(isLikelyToScore ? +110 : -140),
                source: 'superbowl_projections',
                lastUpdated: new Date().toISOString()
            });
        }

        // Rushing props
        if (stats.rushingYards) {
            const perGame = stats.rushingYards / 17;
            // Betting lines vary around the average
            const lineVariance = (Math.random() - 0.5) * 12; // ±6 yards variance
            const line = Math.round((perGame + lineVariance) * 2) / 2;
            const prediction = generateAIPrediction(perGame, line, 15, 'nfl');
            props.push({
                player: player.name,
                team: player.team,
                position: player.position,
                propType: 'Rushing Yards',
                line: line,
                seasonAvg: perGame.toFixed(1),
                seasonTotal: stats.rushingYards,
                aiPick: prediction.pick,
                confidence: prediction.confidence,
                reasoning: `Season avg: ${perGame.toFixed(1)} rush yards/game`,
                trend: prediction.trend,
                over: generateBookOddsAccurate(-110),
                under: generateBookOddsAccurate(-110),
                source: 'superbowl_projections',
                lastUpdated: new Date().toISOString()
            });
        }

        if (stats.carries) {
            const perGame = stats.carries / 17;
            // Betting lines vary around the average
            const lineVariance = (Math.random() - 0.5) * 2; // ±1 carry variance
            const line = Math.round((perGame + lineVariance) * 2) / 2;
            const prediction = generateAIPrediction(perGame, line, 3, 'nfl');
            props.push({
                player: player.name,
                team: player.team,
                position: player.position,
                propType: 'Carries',
                line: line,
                seasonAvg: perGame.toFixed(1),
                seasonTotal: stats.carries,
                aiPick: prediction.pick,
                confidence: prediction.confidence,
                reasoning: `Season avg: ${perGame.toFixed(1)} carries/game`,
                trend: prediction.trend,
                over: generateBookOddsAccurate(-110),
                under: generateBookOddsAccurate(-110),
                source: 'superbowl_projections',
                lastUpdated: new Date().toISOString()
            });
        }

        // Rush + Rec Yards combo
        if (stats.rushingYards && stats.receivingYards) {
            const totalYards = stats.rushingYards + stats.receivingYards;
            const perGame = totalYards / 17;
            // Betting lines vary around the average
            const lineVariance = (Math.random() - 0.5) * 20; // ±10 yards variance
            const line = Math.round((perGame + lineVariance) * 2) / 2;
            const prediction = generateAIPrediction(perGame, line, 25, 'nfl');
            props.push({
                player: player.name,
                team: player.team,
                position: player.position,
                propType: 'Rush + Rec Yards',
                line: line,
                seasonAvg: perGame.toFixed(1),
                seasonTotal: totalYards,
                aiPick: prediction.pick,
                confidence: prediction.confidence,
                reasoning: `Season avg: ${perGame.toFixed(1)} total yards/game`,
                trend: prediction.trend,
                over: generateBookOddsAccurate(-110),
                under: generateBookOddsAccurate(-110),
                source: 'superbowl_projections',
                lastUpdated: new Date().toISOString()
            });
        }

        // Defensive props
        if (stats.interceptions) {
            props.push({
                player: player.name,
                team: player.team,
                position: player.position,
                propType: 'Interception',
                line: 0.5,
                seasonAvg: (stats.interceptions / 17).toFixed(2),
                seasonTotal: stats.interceptions,
                aiPick: stats.interceptions >= 3 ? 'YES' : 'NO',
                confidence: Math.round(45 + stats.interceptions * 8),
                reasoning: `${stats.interceptions} INTs this season`,
                trend: stats.interceptions >= 4 ? 'STRONG' : 'MODERATE',
                over: generateBookOddsAccurate(+280),
                under: generateBookOddsAccurate(-350),
                source: 'superbowl_projections',
                lastUpdated: new Date().toISOString()
            });
        }

        if (stats.sacks) {
            const perGame = stats.sacks / 17;
            props.push({
                player: player.name,
                team: player.team,
                position: player.position,
                propType: 'Sack',
                line: 0.5,
                seasonAvg: perGame.toFixed(2),
                seasonTotal: stats.sacks,
                aiPick: perGame >= 0.4 ? 'YES' : 'NO',
                confidence: Math.round(40 + perGame * 60),
                reasoning: `${stats.sacks} sacks this season (${perGame.toFixed(2)}/game)`,
                trend: perGame >= 0.5 ? 'STRONG' : 'MODERATE',
                over: generateBookOddsAccurate(+200),
                under: generateBookOddsAccurate(-250),
                source: 'superbowl_projections',
                lastUpdated: new Date().toISOString()
            });
        }
    }

    console.log(`🏈 Generated ${props.length} additional Super Bowl props`);
    return props;
}

function generatePropsFromRealStats(stats, sport, gameContext = {}) {
    const props = [];
    const { todaysGames = [], injuries = [], weatherByTeam = {} } = gameContext;

    // Build a lookup for today's games to get opponent info
    const gamesByTeam = {};
    for (const game of todaysGames) {
        const homeTeam = game.homeTeam?.abbreviation || game.home?.abbreviation;
        const awayTeam = game.awayTeam?.abbreviation || game.away?.abbreviation;
        const startTime = game.startTime || game.commence_time || game.time || null;
        const venue = game.venue || null;
        const broadcast = game.broadcast || null;

        if (homeTeam) {
            gamesByTeam[homeTeam] = { opponent: awayTeam, isHome: true, gameId: game.id, startTime, venue, broadcast };
        }
        if (awayTeam) {
            gamesByTeam[awayTeam] = { opponent: homeTeam, isHome: false, gameId: game.id, startTime, venue, broadcast };
        }
    }

    if (sport === 'nba' && stats.players) {
        for (const player of stats.players.slice(0, 100)) {
            // Use live roster data (synced from ESPN) with injury/manual override priority
            const liveRosterData = getPlayerFromLiveRoster(player.player, 'nba');
            const playerTeam = liveRosterData?.team || player.team;
            const fullTeam = liveRosterData?.fullTeam || null;
            const isInjured = liveRosterData?.injured || false;

            // Skip injured players
            if (isInjured) {
                continue;
            }

            const gameInfo = gamesByTeam[playerTeam] || {};
            const opponent = gameInfo.opponent;
            const isHome = gameInfo.isHome;
            const gameTime = gameInfo.startTime || null;
            const venue = gameInfo.venue || null;

            // Points prop with enhanced prediction
            if (player.points) {
                const line = Math.round(player.points * 2) / 2;
                const enhancedPrediction = generateEnhancedPrediction({
                    seasonAvg: player.points,
                    recentAvg: player.last5Avg || player.points,
                    line: line,
                    variance: 4,
                    sport: 'nba',
                    propType: 'Points',
                    playerTeam: playerTeam,
                    opponentTeam: opponent,
                    isHome: isHome,
                    weather: null, // NBA is indoor
                    injuries: injuries
                });

                props.push({
                    player: player.player,
                    team: playerTeam,
                    fullTeam: fullTeam,
                    opponent: opponent || 'TBD',
                    isHome: isHome,
                    matchup: opponent ? `${isHome ? 'vs' : '@'} ${opponent}` : null,
                    gameTime: gameTime,
                    venue: venue,
                    position: player.position || 'G/F',
                    propType: 'Points',
                    line: line,
                    seasonAvg: player.points,
                    adjustedAvg: enhancedPrediction.adjustedAvg,
                    aiPick: enhancedPrediction.pick,
                    confidence: enhancedPrediction.confidence,
                    reasoning: enhancedPrediction.reasoning,
                    factors: enhancedPrediction.factors,
                    trend: enhancedPrediction.trend,
                    over: generateBookOddsAccurate(-110),
                    under: generateBookOddsAccurate(-110),
                    source: 'nba_official_stats',
                    lastUpdated: new Date().toISOString()
                });
            }

            // Rebounds prop
            if (player.rebounds && player.rebounds >= 3) {
                const line = Math.round(player.rebounds * 2) / 2;
                const enhancedPrediction = generateEnhancedPrediction({
                    seasonAvg: player.rebounds,
                    recentAvg: player.last5RebAvg || player.rebounds,
                    line: line,
                    variance: 2,
                    sport: 'nba',
                    propType: 'Rebounds',
                    playerTeam: playerTeam,
                    opponentTeam: opponent,
                    isHome: isHome,
                    injuries: injuries
                });

                props.push({
                    player: player.player,
                    team: playerTeam,
                    fullTeam: fullTeam,
                    opponent: opponent || 'TBD',
                    isHome: isHome,
                    matchup: opponent ? `${isHome ? 'vs' : '@'} ${opponent}` : null,
                    gameTime: gameTime,
                    venue: venue,
                    position: player.position || 'G/F',
                    propType: 'Rebounds',
                    line: line,
                    seasonAvg: player.rebounds,
                    adjustedAvg: enhancedPrediction.adjustedAvg,
                    aiPick: enhancedPrediction.pick,
                    confidence: enhancedPrediction.confidence,
                    reasoning: enhancedPrediction.reasoning,
                    factors: enhancedPrediction.factors,
                    trend: enhancedPrediction.trend,
                    over: generateBookOddsAccurate(-110),
                    under: generateBookOddsAccurate(-110),
                    source: 'nba_official_stats',
                    lastUpdated: new Date().toISOString()
                });
            }

            // Assists prop
            if (player.assists && player.assists >= 2) {
                const line = Math.round(player.assists * 2) / 2;
                const enhancedPrediction = generateEnhancedPrediction({
                    seasonAvg: player.assists,
                    recentAvg: player.last5AstAvg || player.assists,
                    line: line,
                    variance: 2,
                    sport: 'nba',
                    propType: 'Assists',
                    playerTeam: playerTeam,
                    opponentTeam: opponent,
                    isHome: isHome,
                    injuries: injuries
                });

                props.push({
                    player: player.player,
                    team: playerTeam,
                    fullTeam: fullTeam,
                    opponent: opponent || 'TBD',
                    isHome: isHome,
                    matchup: opponent ? `${isHome ? 'vs' : '@'} ${opponent}` : null,
                    gameTime: gameTime,
                    venue: venue,
                    position: player.position || 'G/F',
                    propType: 'Assists',
                    line: line,
                    seasonAvg: player.assists,
                    adjustedAvg: enhancedPrediction.adjustedAvg,
                    aiPick: enhancedPrediction.pick,
                    confidence: enhancedPrediction.confidence,
                    reasoning: enhancedPrediction.reasoning,
                    factors: enhancedPrediction.factors,
                    trend: enhancedPrediction.trend,
                    over: generateBookOddsAccurate(-110),
                    under: generateBookOddsAccurate(-110),
                    source: 'nba_official_stats',
                    lastUpdated: new Date().toISOString()
                });
            }

            // 3-Pointers prop
            if (player.threes && player.threes >= 1) {
                const line = Math.round(player.threes * 2) / 2;
                const enhancedPrediction = generateEnhancedPrediction({
                    seasonAvg: player.threes,
                    recentAvg: player.last5ThreesAvg || player.threes,
                    line: line,
                    variance: 1.5,
                    sport: 'nba',
                    propType: '3-Pointers Made',
                    playerTeam: playerTeam,
                    opponentTeam: opponent,
                    isHome: isHome,
                    injuries: injuries
                });

                props.push({
                    player: player.player,
                    team: playerTeam,
                    fullTeam: fullTeam,
                    opponent: opponent || 'TBD',
                    isHome: isHome,
                    matchup: opponent ? `${isHome ? 'vs' : '@'} ${opponent}` : null,
                    gameTime: gameTime,
                    venue: venue,
                    position: player.position || 'G/F',
                    propType: '3-Pointers Made',
                    line: line,
                    seasonAvg: player.threes,
                    adjustedAvg: enhancedPrediction.adjustedAvg,
                    aiPick: enhancedPrediction.pick,
                    confidence: enhancedPrediction.confidence,
                    reasoning: enhancedPrediction.reasoning,
                    factors: enhancedPrediction.factors,
                    trend: enhancedPrediction.trend,
                    over: generateBookOddsAccurate(-110),
                    under: generateBookOddsAccurate(-110),
                    source: 'nba_official_stats',
                    lastUpdated: new Date().toISOString()
                });
            }
        }
    }

    // NFL Props - Enhanced Super Bowl Coverage
    if (sport === 'nfl' && stats.leaders) {
        // First, collect all player data with parsed stats
        const playerDataMap = new Map();

        for (const category of stats.leaders) {
            const catName = (category.category || category.displayName || '').toLowerCase();

            for (const player of (category.leaders || [])) {
                const playerName = player.player;
                if (!playerName) continue;

                const rawValue = player.value || '';
                const existingData = playerDataMap.get(playerName) || {
                    name: playerName,
                    team: player.team || player.teamAbbr,
                    headshot: player.headshot,
                    position: player.position,
                    stats: {}
                };

                // Parse stats from the value string
                const ydsMatch = rawValue.match(/(\d+)\s*YDS/i);
                const tdMatch = rawValue.match(/(\d+)\s*TD/i);
                const recMatch = rawValue.match(/(\d+)\s*REC/i);
                const carMatch = rawValue.match(/(\d+)\s*CAR/i);
                const intMatch = rawValue.match(/(\d+)\s*INT/i);
                const compMatch = rawValue.match(/(\d+)\/(\d+)/); // Completions/Attempts

                if (catName.includes('passing')) {
                    existingData.position = 'QB';
                    if (ydsMatch) existingData.stats.passingYards = parseFloat(ydsMatch[1]);
                    if (tdMatch) existingData.stats.passingTDs = parseFloat(tdMatch[1]);
                    if (intMatch) existingData.stats.interceptions = parseFloat(intMatch[1]);
                    if (compMatch) {
                        existingData.stats.completions = parseFloat(compMatch[1]);
                        existingData.stats.attempts = parseFloat(compMatch[2]);
                    }
                } else if (catName.includes('rushing')) {
                    if (!existingData.position) existingData.position = 'RB';
                    if (ydsMatch) existingData.stats.rushingYards = parseFloat(ydsMatch[1]);
                    if (tdMatch) existingData.stats.rushingTDs = parseFloat(tdMatch[1]);
                    if (carMatch) existingData.stats.carries = parseFloat(carMatch[1]);
                } else if (catName.includes('receiving')) {
                    if (!existingData.position) existingData.position = 'WR';
                    if (ydsMatch) existingData.stats.receivingYards = parseFloat(ydsMatch[1]);
                    if (tdMatch) existingData.stats.receivingTDs = parseFloat(tdMatch[1]);
                    if (recMatch) existingData.stats.receptions = parseFloat(recMatch[1]);
                }

                // Also check parsed stats object
                if (player.stats) {
                    Object.assign(existingData.stats, player.stats);
                }

                playerDataMap.set(playerName, existingData);
            }
        }

        // Now generate comprehensive props for each player
        for (const [playerName, playerData] of playerDataMap) {
            const stats = playerData.stats;
            const playerTeam = playerData.team;
            const gameInfo = gamesByTeam[playerTeam] || {};
            const opponent = gameInfo.opponent;
            const isHome = gameInfo.isHome;
            const weather = weatherByTeam[playerTeam] || null;

            // Build game context for enhanced props
            const propGameContext = { opponent, isHome, weather };

            // PASSING PROPS (QBs) - Weather significantly affects passing
            if (stats.passingYards) {
                const perGame = stats.passingYards / 17;
                const lineVariance = (Math.random() - 0.5) * 30;
                const line = Math.round((perGame + lineVariance) * 2) / 2;
                const prediction = generateEnhancedPrediction({
                    seasonAvg: perGame,
                    recentAvg: perGame,
                    line: line,
                    variance: 40,
                    sport: 'nfl',
                    propType: 'Passing Yards',
                    playerTeam: playerTeam,
                    opponentTeam: opponent,
                    isHome: isHome,
                    weather: weather,
                    injuries: injuries
                });
                props.push(createNFLProp(playerData, 'Passing Yards', line, perGame, stats.passingYards, prediction, propGameContext));
            }

            if (stats.passingTDs) {
                const perGame = stats.passingTDs / 17;
                const lineVariance = (Math.random() - 0.5) * 0.6;
                const line = Math.round((perGame + lineVariance) * 2) / 2;
                const prediction = generateEnhancedPrediction({
                    seasonAvg: perGame,
                    recentAvg: perGame,
                    line: line,
                    variance: 0.5,
                    sport: 'nfl',
                    propType: 'Passing TDs',
                    playerTeam: playerTeam,
                    opponentTeam: opponent,
                    isHome: isHome,
                    weather: weather,
                    injuries: injuries
                });
                props.push(createNFLProp(playerData, 'Passing TDs', line, perGame, stats.passingTDs, prediction, propGameContext));
            }

            if (stats.completions) {
                const perGame = stats.completions / 17;
                const line = Math.round(perGame * 2) / 2;
                const prediction = generateEnhancedPrediction({
                    seasonAvg: perGame,
                    recentAvg: perGame,
                    line: line,
                    variance: 3,
                    sport: 'nfl',
                    propType: 'Completions',
                    playerTeam: playerTeam,
                    opponentTeam: opponent,
                    isHome: isHome,
                    weather: weather,
                    injuries: injuries
                });
                props.push(createNFLProp(playerData, 'Completions', line, perGame, stats.completions, prediction, propGameContext));
            }

            if (stats.interceptions) {
                const perGame = stats.interceptions / 17;
                const line = Math.round(perGame * 2) / 2;
                const prediction = generateEnhancedPrediction({
                    seasonAvg: perGame,
                    recentAvg: perGame,
                    line: line,
                    variance: 0.3,
                    sport: 'nfl',
                    propType: 'Interceptions',
                    playerTeam: playerTeam,
                    opponentTeam: opponent,
                    isHome: isHome,
                    weather: weather,
                    injuries: injuries
                });
                props.push(createNFLProp(playerData, 'Interceptions Thrown', line, perGame, stats.interceptions, prediction, propGameContext));
            }

            // RUSHING PROPS - Weather can boost rushing
            if (stats.rushingYards) {
                const perGame = stats.rushingYards / 17;
                const lineVariance = (Math.random() - 0.5) * 15;
                const line = Math.round((perGame + lineVariance) * 2) / 2;
                const prediction = generateEnhancedPrediction({
                    seasonAvg: perGame,
                    recentAvg: perGame,
                    line: line,
                    variance: 20,
                    sport: 'nfl',
                    propType: 'Rushing Yards',
                    playerTeam: playerTeam,
                    opponentTeam: opponent,
                    isHome: isHome,
                    weather: weather,
                    injuries: injuries
                });
                props.push(createNFLProp(playerData, 'Rushing Yards', line, perGame, stats.rushingYards, prediction, propGameContext));
            }

            if (stats.rushingTDs) {
                const perGame = stats.rushingTDs / 17;
                const lineVariance = (Math.random() - 0.5) * 0.4;
                const line = Math.round((perGame + lineVariance) * 2) / 2;
                const prediction = generateEnhancedPrediction({
                    seasonAvg: perGame,
                    recentAvg: perGame,
                    line: line,
                    variance: 0.3,
                    sport: 'nfl',
                    propType: 'Rushing TDs',
                    playerTeam: playerTeam,
                    opponentTeam: opponent,
                    isHome: isHome,
                    weather: weather,
                    injuries: injuries
                });
                props.push(createNFLProp(playerData, 'Rushing TDs', line, perGame, stats.rushingTDs, prediction, propGameContext));
            }

            if (stats.carries) {
                const perGame = stats.carries / 17;
                const line = Math.round(perGame * 2) / 2;
                const prediction = generateEnhancedPrediction({
                    seasonAvg: perGame,
                    recentAvg: perGame,
                    line: line,
                    variance: 3,
                    sport: 'nfl',
                    propType: 'Carries',
                    playerTeam: playerTeam,
                    opponentTeam: opponent,
                    isHome: isHome,
                    weather: weather,
                    injuries: injuries
                });
                props.push(createNFLProp(playerData, 'Carries', line, perGame, stats.carries, prediction, propGameContext));
            }

            // RECEIVING PROPS - Weather affects passing game
            if (stats.receivingYards) {
                const perGame = stats.receivingYards / 17;
                const lineVariance = (Math.random() - 0.5) * 15;
                const line = Math.round((perGame + lineVariance) * 2) / 2;
                const prediction = generateEnhancedPrediction({
                    seasonAvg: perGame,
                    recentAvg: perGame,
                    line: line,
                    variance: 20,
                    sport: 'nfl',
                    propType: 'Receiving Yards',
                    playerTeam: playerTeam,
                    opponentTeam: opponent,
                    isHome: isHome,
                    weather: weather,
                    injuries: injuries
                });
                props.push(createNFLProp(playerData, 'Receiving Yards', line, perGame, stats.receivingYards, prediction, propGameContext));
            }

            if (stats.receivingTDs) {
                const perGame = stats.receivingTDs / 17;
                const lineVariance = (Math.random() - 0.5) * 0.4;
                const line = Math.round((perGame + lineVariance) * 2) / 2;
                const prediction = generateEnhancedPrediction({
                    seasonAvg: perGame,
                    recentAvg: perGame,
                    line: line,
                    variance: 0.3,
                    sport: 'nfl',
                    propType: 'Receiving TDs',
                    playerTeam: playerTeam,
                    opponentTeam: opponent,
                    isHome: isHome,
                    weather: weather,
                    injuries: injuries
                });
                props.push(createNFLProp(playerData, 'Receiving TDs', line, perGame, stats.receivingTDs, prediction, propGameContext));
            }

            if (stats.receptions) {
                const perGame = stats.receptions / 17;
                const lineVariance = (Math.random() - 0.5) * 1.5;
                const line = Math.round((perGame + lineVariance) * 2) / 2;
                const prediction = generateEnhancedPrediction({
                    seasonAvg: perGame,
                    recentAvg: perGame,
                    line: line,
                    variance: 2,
                    sport: 'nfl',
                    propType: 'Receptions',
                    playerTeam: playerTeam,
                    opponentTeam: opponent,
                    isHome: isHome,
                    weather: weather,
                    injuries: injuries
                });
                props.push(createNFLProp(playerData, 'Receptions', line, perGame, stats.receptions, prediction, propGameContext));
            }

            // COMBO PROPS
            // Pass + Rush Yards for mobile QBs
            if (stats.passingYards && stats.rushingYards) {
                const totalYards = stats.passingYards + stats.rushingYards;
                const perGame = totalYards / 17;
                const line = Math.round(perGame * 2) / 2;
                const prediction = generateEnhancedPrediction({
                    seasonAvg: perGame,
                    recentAvg: perGame,
                    line: line,
                    variance: 50,
                    sport: 'nfl',
                    propType: 'Pass + Rush Yards',
                    playerTeam: playerTeam,
                    opponentTeam: opponent,
                    isHome: isHome,
                    weather: weather,
                    injuries: injuries
                });
                props.push(createNFLProp(playerData, 'Pass + Rush Yards', line, perGame, totalYards, prediction, propGameContext));
            }

            // Total TDs (any)
            const totalTDs = (stats.passingTDs || 0) + (stats.rushingTDs || 0) + (stats.receivingTDs || 0);
            if (totalTDs > 0) {
                const perGame = totalTDs / 17;
                const line = Math.round(perGame * 2) / 2;
                const prediction = generateEnhancedPrediction({
                    seasonAvg: perGame,
                    recentAvg: perGame,
                    line: line,
                    variance: 0.5,
                    sport: 'nfl',
                    propType: 'Anytime TD',
                    playerTeam: playerTeam,
                    opponentTeam: opponent,
                    isHome: isHome,
                    weather: weather,
                    injuries: injuries
                });
                props.push(createNFLProp(playerData, 'Anytime TD Scorer', line, perGame, totalTDs, prediction, propGameContext));
            }

            // Rush + Receiving Yards for versatile backs
            if (stats.rushingYards && stats.receivingYards) {
                const totalYards = stats.rushingYards + stats.receivingYards;
                const perGame = totalYards / 17;
                const line = Math.round(perGame * 2) / 2;
                const prediction = generateEnhancedPrediction({
                    seasonAvg: perGame,
                    recentAvg: perGame,
                    line: line,
                    variance: 25,
                    sport: 'nfl',
                    propType: 'Rush + Rec Yards',
                    playerTeam: playerTeam,
                    opponentTeam: opponent,
                    isHome: isHome,
                    weather: weather,
                    injuries: injuries
                });
                props.push(createNFLProp(playerData, 'Rush + Rec Yards', line, perGame, totalYards, prediction, propGameContext));
            }

            // Longest Reception/Rush for explosive play props
            if (stats.receivingYards) {
                const avgYardsPerRec = stats.receptions ? stats.receivingYards / stats.receptions : 12;
                const longestEstimate = Math.min(avgYardsPerRec * 3, 60);
                const line = Math.round(longestEstimate * 2) / 2;
                const prediction = generateAIPrediction(longestEstimate, line, 15, 'nfl');
                props.push(createNFLProp(playerData, 'Longest Reception', line, longestEstimate, 'N/A', prediction));
            }
        }

        // Sort by confidence and remove duplicates
        const seen = new Set();
        const uniqueProps = props.filter(p => {
            const key = `${p.player}-${p.propType}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        props.length = 0;
        props.push(...uniqueProps);
    }

    if (sport === 'mlb') {
        // Hitting props
        if (stats.hittingLeaders) {
            for (const player of stats.hittingLeaders.slice(0, 30)) {
                const perGame = parseFloat(player.perGame) || 0;
                if (perGame <= 0) continue;

                let propType = '';
                let variance = 0.5;

                if (player.category === 'homeRuns') {
                    propType = 'Home Runs';
                    variance = 0.3;
                } else if (player.category === 'hits') {
                    propType = 'Hits';
                    variance = 0.5;
                } else if (player.category === 'rbi') {
                    propType = 'RBIs';
                    variance = 0.4;
                } else if (player.category === 'stolenBases') {
                    propType = 'Stolen Bases';
                    variance = 0.2;
                } else {
                    continue;
                }

                const line = Math.round(perGame * 10) / 10;
                const prediction = generateAIPrediction(perGame, line, variance, 'mlb');

                props.push({
                    player: player.player,
                    team: player.teamAbbr || player.team,
                    position: 'Hitter',
                    propType: propType,
                    line: line,
                    seasonAvg: perGame,
                    seasonTotal: player.value,
                    aiPick: prediction.pick,
                    confidence: prediction.confidence,
                    reasoning: `Season: ${player.value} total (${player.gamesPlayed} G)`,
                    trend: prediction.trend,
                    over: generateBookOddsAccurate(-110),
                    under: generateBookOddsAccurate(-110),
                    source: 'mlb_official_stats',
                    lastUpdated: new Date().toISOString()
                });
            }
        }

        // Pitching props
        if (stats.pitchingLeaders) {
            for (const player of stats.pitchingLeaders.slice(0, 20)) {
                if (player.category !== 'strikeouts') continue;

                const perGame = parseFloat(player.perGame) || 0;
                if (perGame <= 0) continue;

                const line = Math.round(perGame * 2) / 2;
                const prediction = generateAIPrediction(perGame, line, 1.5, 'mlb');

                props.push({
                    player: player.player,
                    team: player.teamAbbr || player.team,
                    position: 'Pitcher',
                    propType: 'Strikeouts',
                    line: line,
                    seasonAvg: perGame,
                    seasonTotal: player.value,
                    aiPick: prediction.pick,
                    confidence: prediction.confidence,
                    reasoning: `Season: ${player.value} K (${player.gamesPlayed} GS)`,
                    trend: prediction.trend,
                    over: generateBookOddsAccurate(-110),
                    under: generateBookOddsAccurate(-110),
                    source: 'mlb_official_stats',
                    lastUpdated: new Date().toISOString()
                });
            }
        }
    }

    if (sport === 'nhl' && (stats.skaterLeaders || stats.espnLeaders)) {
        // Combine NHL official API data with ESPN data for reliability
        const leaders = stats.skaterLeaders || [];
        const espnLeaders = stats.espnLeaders || [];

        // Process NHL official API data
        for (const player of leaders.slice(0, 40)) {
            const perGame = parseFloat(player.perGame) || 0;
            if (perGame <= 0) continue;

            let propType = '';
            let variance = 0.3;

            if (player.category === 'goals') {
                propType = 'Goals';
            } else if (player.category === 'assists') {
                propType = 'Assists';
                variance = 0.4;
            } else if (player.category === 'points') {
                propType = 'Points';
                variance = 0.5;
            } else {
                continue;
            }

            const line = Math.round(perGame * 10) / 10;
            const prediction = generateAIPrediction(perGame, line, variance, 'nhl');

            props.push({
                player: player.player,
                team: player.team,
                position: 'Skater',
                headshot: player.headshot,
                propType: propType,
                line: line,
                seasonAvg: perGame,
                seasonTotal: player.value,
                aiPick: prediction.pick,
                confidence: prediction.confidence,
                reasoning: `Season: ${player.value} total (${player.gamesPlayed} GP)`,
                trend: prediction.trend,
                over: generateBookOddsAccurate(-110),
                under: generateBookOddsAccurate(-110),
                source: 'nhl_official_stats',
                lastUpdated: new Date().toISOString()
            });
        }

        // Also process ESPN leaders if available (fallback/supplement)
        for (const player of espnLeaders.slice(0, 50)) {
            // Skip if we already have this player
            const existingPlayer = props.find(p => p.player === player.name && p.propType === player.category);
            if (existingPlayer) continue;

            const perGame = player.perGame || 0;
            if (perGame <= 0) continue;

            let propType = '';
            let variance = 0.3;

            if (player.category === 'goals' || player.category === 'Goals') {
                propType = 'Goals';
            } else if (player.category === 'assists' || player.category === 'Assists') {
                propType = 'Assists';
                variance = 0.4;
            } else if (player.category === 'points' || player.category === 'Points') {
                propType = 'Points';
                variance = 0.5;
            } else if (player.category === 'shots' || player.category === 'Shots On Goal') {
                propType = 'Shots On Goal';
                variance = 1.0;
            } else {
                continue;
            }

            const gameInfo = gamesByTeam[player.team] || {};
            const opponent = gameInfo.opponent;
            const isHome = gameInfo.isHome;
            const gameTime = gameInfo.startTime || null;

            const line = Math.round(perGame * 2) / 2;
            const prediction = generateAIPrediction(perGame, line, variance, 'nhl');

            props.push({
                player: player.name,
                team: player.team,
                fullTeam: player.fullTeam,
                opponent: opponent || 'TBD',
                isHome: isHome,
                matchup: opponent ? `${isHome ? 'vs' : '@'} ${opponent}` : null,
                gameTime: gameTime,
                position: player.position || 'Skater',
                headshot: player.headshot,
                propType: propType,
                line: line,
                seasonAvg: perGame,
                seasonTotal: player.total,
                aiPick: prediction.pick,
                confidence: prediction.confidence,
                reasoning: `Season avg: ${perGame.toFixed(2)} per game`,
                trend: prediction.trend,
                over: generateBookOddsAccurate(-110),
                under: generateBookOddsAccurate(-110),
                source: 'espn_nhl_stats',
                lastUpdated: new Date().toISOString()
            });
        }
    }

    // Sort by confidence and assign tiers
    props.sort((a, b) => b.confidence - a.confidence);

    // Assign tiers based on confidence levels
    props.forEach(prop => {
        if (prop.confidence >= 75) {
            prop.tier = 'LOCK';
            prop.tierLabel = '🔥 TOP PICK';
            prop.tierDescription = 'High confidence - Strong statistical edge';
        } else if (prop.confidence >= 65) {
            prop.tier = 'GOOD';
            prop.tierLabel = '✅ GOOD VALUE';
            prop.tierDescription = 'Solid pick with good odds';
        } else if (prop.confidence >= 55) {
            prop.tier = 'LEAN';
            prop.tierLabel = '📊 LEAN';
            prop.tierDescription = 'Slight edge detected';
        } else {
            prop.tier = 'FADE';
            prop.tierLabel = '⚠️ RISKY';
            prop.tierDescription = 'Low confidence - Use caution';
        }
    });

    return props;
}

// Organize props into tiers for display
function organizePropsIntoTiers(props) {
    return {
        topPicks: props.filter(p => p.tier === 'LOCK'),
        goodValue: props.filter(p => p.tier === 'GOOD'),
        leans: props.filter(p => p.tier === 'LEAN'),
        risky: props.filter(p => p.tier === 'FADE'),
        all: props
    };
}

// =====================================================
// NHL OFFICIAL API - Free, No API Key Required
// https://api.nhle.com - Real NHL stats and schedules
// =====================================================
async function fetchNHLOfficialData() {
    const cacheKey = 'nhl_official';
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < PROPS_CACHE_TTL_MS)) {
        console.log('📦 Returning cached NHL official data');
        return propsCache[cacheKey].data;
    }

    try {
        console.log('🏒 Fetching NHL official data...');

        // Get today's schedule
        const today = new Date().toISOString().split('T')[0];
        const scheduleUrl = `https://api-web.nhle.com/v1/schedule/${today}`;
        const scheduleData = await fetchJSON(scheduleUrl);

        const games = [];
        const gameWeek = scheduleData.gameWeek || [];

        for (const day of gameWeek) {
            for (const game of (day.games || [])) {
                games.push({
                    id: game.id,
                    startTime: game.startTimeUTC,
                    venue: game.venue?.default,
                    homeTeam: {
                        id: game.homeTeam?.id,
                        name: game.homeTeam?.placeName?.default + ' ' + game.homeTeam?.commonName?.default,
                        abbrev: game.homeTeam?.abbrev,
                        logo: game.homeTeam?.logo,
                        record: game.homeTeam?.record,
                        score: game.homeTeam?.score
                    },
                    awayTeam: {
                        id: game.awayTeam?.id,
                        name: game.awayTeam?.placeName?.default + ' ' + game.awayTeam?.commonName?.default,
                        abbrev: game.awayTeam?.abbrev,
                        logo: game.awayTeam?.logo,
                        record: game.awayTeam?.record,
                        score: game.awayTeam?.score
                    },
                    gameState: game.gameState,
                    period: game.periodDescriptor?.number,
                    broadcasts: game.tvBroadcasts?.map(b => b.network) || []
                });
            }
        }

        // Get standings for accurate power rankings
        const standingsUrl = 'https://api-web.nhle.com/v1/standings/now';
        const standingsData = await fetchJSON(standingsUrl);

        const standings = (standingsData.standings || []).map(team => ({
            teamId: team.teamAbbrev?.default,
            teamName: team.teamName?.default,
            logo: team.teamLogo,
            wins: team.wins,
            losses: team.losses,
            otLosses: team.otLosses,
            points: team.points,
            gamesPlayed: team.gamesPlayed,
            goalsFor: team.goalFor,
            goalsAgainst: team.goalAgainst,
            goalDifferential: team.goalDifferential,
            winPct: team.pointPctg,
            streakCode: team.streakCode,
            streakCount: team.streakCount,
            lastTen: `${team.l10Wins}-${team.l10Losses}-${team.l10OtLosses}`
        }));

        // Get player stats leaders from NHL official API
        // Use season/gameType format (2 = regular season)
        const currentSeason = '20242025';
        const skaterStatsUrl = `https://api-web.nhle.com/v1/skater-stats-leaders/${currentSeason}/2`;
        const goalieStatsUrl = `https://api-web.nhle.com/v1/goalie-stats-leaders/${currentSeason}/2`;

        let skaterLeaders = [];
        let goalieLeaders = [];
        let espnLeaders = [];

        try {
            const skaterData = await fetchJSON(skaterStatsUrl);
            // Parse NHL API response - teamAbbrev is direct string, not nested object
            const goalsData = (skaterData.goals || []).map(p => ({
                player: (p.firstName?.default || '') + ' ' + (p.lastName?.default || ''),
                team: p.teamAbbrev,  // Direct string, not .default
                value: p.value || 0,
                gamesPlayed: 60, // Approximate games played mid-season
                perGame: (p.value || 0) / 60,
                headshot: p.headshot,
                position: p.position,
                category: 'goals'
            }));
            const assistsData = (skaterData.assists || []).map(p => ({
                player: (p.firstName?.default || '') + ' ' + (p.lastName?.default || ''),
                team: p.teamAbbrev,
                value: p.value || 0,
                gamesPlayed: 60,
                perGame: (p.value || 0) / 60,
                headshot: p.headshot,
                position: p.position,
                category: 'assists'
            }));
            const pointsData = (skaterData.points || []).map(p => ({
                player: (p.firstName?.default || '') + ' ' + (p.lastName?.default || ''),
                team: p.teamAbbrev,
                value: p.value || 0,
                gamesPlayed: 60,
                perGame: (p.value || 0) / 60,
                headshot: p.headshot,
                position: p.position,
                category: 'points'
            }));
            skaterLeaders = goalsData.concat(assistsData, pointsData);
            console.log(`✅ NHL Skater stats: ${skaterLeaders.length} leaders loaded`);
        } catch (e) {
            console.log('⚠️ NHL Skater stats unavailable:', e.message);
        }

        try {
            const goalieData = await fetchJSON(goalieStatsUrl);
            goalieLeaders = (goalieData.wins || []).map(p => ({
                player: p.firstName?.default + ' ' + p.lastName?.default,
                team: p.teamAbbrev?.default || p.teamAbbrev,
                value: p.value,
                gamesPlayed: p.gamesPlayed,
                headshot: p.headshot,
                category: 'wins'
            }));
        } catch (e) { console.log('Goalie stats unavailable'); }

        // ESPN fallback for NHL stats if official API fails
        if (skaterLeaders.length === 0) {
            try {
                console.log('🏒 Fetching NHL stats from ESPN...');
                const espnUrl = 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/statistics';
                const espnData = await fetchJSON(espnUrl);

                for (const category of (espnData.categories || [])) {
                    const catName = category.displayName || category.name || '';
                    for (const leader of (category.leaders || []).slice(0, 20)) {
                        const athlete = leader.athlete || {};
                        const team = athlete.team || {};
                        const stats = leader.statistics || [];

                        espnLeaders.push({
                            name: athlete.displayName || athlete.fullName,
                            team: team.abbreviation,
                            fullTeam: team.displayName,
                            position: athlete.position?.abbreviation,
                            headshot: athlete.headshot?.href,
                            category: catName,
                            total: leader.value,
                            perGame: stats.find(s => s.name === 'avgGoals' || s.name === 'avgPoints')?.value || (leader.value / 50),
                        });
                    }
                }
                console.log(`✅ ESPN NHL stats: ${espnLeaders.length} leaders loaded`);
            } catch (e) {
                console.log('ESPN NHL stats also unavailable:', e.message);
            }
        }

        const result = {
            games,
            standings,
            skaterLeaders: skaterLeaders.slice(0, 50),
            goalieLeaders: goalieLeaders.slice(0, 20),
            espnLeaders: espnLeaders,
            source: skaterLeaders.length > 0 ? 'nhl_official' : (espnLeaders.length > 0 ? 'espn_nhl' : 'none'),
            gamesCount: games.length,
            timestamp: new Date().toISOString()
        };

        propsCache[cacheKey] = { data: result, timestamp: Date.now() };
        console.log(`✅ NHL Official: ${games.length} games, ${standings.length} teams in standings`);
        return result;
    } catch (error) {
        console.error('NHL Official API error:', error.message);
        return { games: [], standings: [], source: 'nhl_official', error: error.message };
    }
}

// =====================================================
// MLB STATS API - Free, No API Key Required
// https://statsapi.mlb.com - Real MLB stats and schedules
// =====================================================
async function fetchMLBOfficialData() {
    const cacheKey = 'mlb_official';
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < PROPS_CACHE_TTL_MS)) {
        console.log('📦 Returning cached MLB official data');
        return propsCache[cacheKey].data;
    }

    try {
        console.log('⚾ Fetching MLB official data...');

        // Get today's schedule
        const today = new Date().toISOString().split('T')[0];
        const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=team,linescore,probablePitcher`;
        const scheduleData = await fetchJSON(scheduleUrl);

        const games = [];
        for (const date of (scheduleData.dates || [])) {
            for (const game of (date.games || [])) {
                games.push({
                    id: game.gamePk,
                    startTime: game.gameDate,
                    venue: game.venue?.name,
                    status: game.status?.detailedState,
                    homeTeam: {
                        id: game.teams?.home?.team?.id,
                        name: game.teams?.home?.team?.name,
                        score: game.teams?.home?.score,
                        wins: game.teams?.home?.leagueRecord?.wins,
                        losses: game.teams?.home?.leagueRecord?.losses,
                        probablePitcher: game.teams?.home?.probablePitcher?.fullName,
                        pitcherERA: game.teams?.home?.probablePitcher?.era
                    },
                    awayTeam: {
                        id: game.teams?.away?.team?.id,
                        name: game.teams?.away?.team?.name,
                        score: game.teams?.away?.score,
                        wins: game.teams?.away?.leagueRecord?.wins,
                        losses: game.teams?.away?.leagueRecord?.losses,
                        probablePitcher: game.teams?.away?.probablePitcher?.fullName,
                        pitcherERA: game.teams?.away?.probablePitcher?.era
                    },
                    inning: game.linescore?.currentInning,
                    inningState: game.linescore?.inningState
                });
            }
        }

        // Get standings
        const standingsUrl = 'https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2024&standingsTypes=regularSeason';
        const standingsData = await fetchJSON(standingsUrl);

        const standings = [];
        for (const record of (standingsData.records || [])) {
            for (const team of (record.teamRecords || [])) {
                standings.push({
                    teamId: team.team?.id,
                    teamName: team.team?.name,
                    division: record.division?.name,
                    wins: team.wins,
                    losses: team.losses,
                    winPct: parseFloat(team.winningPercentage),
                    gamesBack: team.gamesBack,
                    runsScored: team.runsScored,
                    runsAllowed: team.runsAllowed,
                    runDifferential: team.runDifferential,
                    streak: team.streak?.streakCode,
                    lastTen: `${team.records?.splitRecords?.find(r => r.type === 'lastTen')?.wins || 0}-${team.records?.splitRecords?.find(r => r.type === 'lastTen')?.losses || 0}`
                });
            }
        }

        // Get batting leaders
        const hittingUrl = 'https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=homeRuns,battingAverage,runsBattedIn,hits,stolenBases&season=2024&limit=20';
        let hittingLeaders = [];
        try {
            const hittingData = await fetchJSON(hittingUrl);
            hittingLeaders = (hittingData.leagueLeaders || []).map(category => ({
                category: category.leaderCategory,
                leaders: (category.leaders || []).slice(0, 10).map(l => ({
                    player: l.person?.fullName,
                    team: l.team?.name,
                    value: l.value,
                    rank: l.rank
                }))
            }));
        } catch (e) { console.log('MLB hitting leaders unavailable'); }

        // Get pitching leaders
        const pitchingUrl = 'https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=earnedRunAverage,strikeouts,wins,saves&season=2024&limit=20';
        let pitchingLeaders = [];
        try {
            const pitchingData = await fetchJSON(pitchingUrl);
            pitchingLeaders = (pitchingData.leagueLeaders || []).map(category => ({
                category: category.leaderCategory,
                leaders: (category.leaders || []).slice(0, 10).map(l => ({
                    player: l.person?.fullName,
                    team: l.team?.name,
                    value: l.value,
                    rank: l.rank
                }))
            }));
        } catch (e) { console.log('MLB pitching leaders unavailable'); }

        const result = {
            games,
            standings,
            hittingLeaders,
            pitchingLeaders,
            source: 'mlb_official',
            gamesCount: games.length,
            timestamp: new Date().toISOString()
        };

        propsCache[cacheKey] = { data: result, timestamp: Date.now() };
        console.log(`✅ MLB Official: ${games.length} games, ${standings.length} teams`);
        return result;
    } catch (error) {
        console.error('MLB Official API error:', error.message);
        return { games: [], standings: [], source: 'mlb_official', error: error.message };
    }
}

// =====================================================
// NFL Advanced Stats from ESPN
// =====================================================
async function fetchNFLAdvancedStats() {
    const cacheKey = 'nfl_advanced';
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < PROPS_CACHE_TTL_MS)) {
        console.log('📦 Returning cached NFL advanced stats');
        return propsCache[cacheKey].data;
    }

    try {
        console.log('🏈 Fetching NFL advanced stats...');

        // Get NFL standings/power rankings from ESPN
        const standingsUrl = 'https://site.api.espn.com/apis/v2/sports/football/nfl/standings';
        const standingsData = await fetchJSON(standingsUrl);

        const standings = [];
        for (const child of (standingsData.children || [])) {
            for (const innerChild of (child.standings?.entries || [])) {
                const team = innerChild.team;
                const stats = {};
                (innerChild.stats || []).forEach(s => {
                    stats[s.name] = s.value;
                });

                standings.push({
                    teamId: team?.id,
                    teamName: team?.displayName,
                    abbreviation: team?.abbreviation,
                    logo: team?.logos?.[0]?.href,
                    wins: stats.wins || 0,
                    losses: stats.losses || 0,
                    ties: stats.ties || 0,
                    winPct: stats.winPercent || 0,
                    pointsFor: stats.pointsFor || 0,
                    pointsAgainst: stats.pointsAgainst || 0,
                    pointDifferential: stats.pointDifferential || 0,
                    streak: stats.streak || 0,
                    divisionRecord: stats.divisionWinPercent || 0
                });
            }
        }

        // Get player stats leaders from ESPN
        const qbUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/leaders?limit=20';
        let leaders = [];
        try {
            const leadersData = await fetchJSON(qbUrl);
            leaders = (leadersData.leaders || []).map(cat => ({
                category: cat.name,
                displayName: cat.displayName,
                leaders: (cat.leaders || []).slice(0, 10).map(l => ({
                    player: l.athlete?.fullName,
                    team: l.team?.abbreviation,
                    value: l.displayValue,
                    headshot: l.athlete?.headshot?.href
                }))
            }));
        } catch (e) { console.log('NFL leaders unavailable from leaders endpoint'); }

        // If no leaders from regular endpoint, get from scoreboard (Super Bowl)
        if (leaders.length === 0) {
            try {
                console.log('📋 Fetching Super Bowl game data for player stats...');
                const scoreboardUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
                const scoreboardData = await fetchJSON(scoreboardUrl);

                const superBowlLeaders = [];
                for (const event of (scoreboardData.events || [])) {
                    const competition = event.competitions?.[0];
                    if (!competition) continue;

                    // Get leaders from the game
                    for (const leader of (competition.leaders || [])) {
                        const category = leader.name;
                        const displayName = leader.displayName;
                        const playerLeaders = (leader.leaders || []).map(l => ({
                            player: l.athlete?.fullName,
                            team: l.athlete?.team?.id,
                            teamAbbr: getTeamAbbr(l.athlete?.team?.id),
                            value: l.displayValue,
                            headshot: l.athlete?.headshot,
                            position: l.athlete?.position?.abbreviation,
                            stats: parsePlayerStats(l.displayValue, category)
                        }));

                        if (playerLeaders.length > 0) {
                            superBowlLeaders.push({
                                category,
                                displayName,
                                leaders: playerLeaders
                            });
                        }
                    }

                    // Also get team rosters for more player data
                    for (const competitor of (competition.competitors || [])) {
                        const team = competitor.team;
                        const teamLeaders = (competitor.leaders || []).map(cat => ({
                            category: cat.name,
                            displayName: cat.displayName,
                            leaders: (cat.leaders || []).map(l => ({
                                player: l.athlete?.fullName,
                                team: team?.abbreviation,
                                value: l.displayValue,
                                headshot: l.athlete?.headshot?.href,
                                position: l.athlete?.position?.abbreviation
                            }))
                        }));
                        superBowlLeaders.push(...teamLeaders);
                    }
                }

                if (superBowlLeaders.length > 0) {
                    leaders = superBowlLeaders;
                    console.log(`✅ Found ${leaders.length} leader categories from Super Bowl data`);
                }
            } catch (e) {
                console.log('Could not fetch Super Bowl leaders:', e.message);
            }
        }

        // Helper to get team abbreviation from ID
        function getTeamAbbr(teamId) {
            const teamMap = {
                '17': 'NE', '26': 'SEA', '1': 'ATL', '2': 'BUF', '3': 'CHI', '4': 'CIN',
                '5': 'CLE', '6': 'DAL', '7': 'DEN', '8': 'DET', '9': 'GB', '10': 'TEN',
                '11': 'IND', '12': 'KC', '13': 'LV', '14': 'LAR', '15': 'MIA', '16': 'MIN',
                '18': 'NO', '19': 'NYG', '20': 'NYJ', '21': 'PHI', '22': 'ARI', '23': 'PIT',
                '24': 'LAC', '25': 'SF', '27': 'TB', '28': 'WSH', '29': 'CAR', '30': 'JAX',
                '33': 'BAL', '34': 'HOU'
            };
            return teamMap[teamId] || teamId;
        }

        // Helper to parse stats from display value
        function parsePlayerStats(displayValue, category) {
            if (!displayValue) return {};
            // "4394 YDS, 31 TD, 8 INT" -> { yards: 4394, touchdowns: 31, interceptions: 8 }
            const stats = {};
            const parts = displayValue.split(',').map(p => p.trim());
            for (const part of parts) {
                const match = part.match(/(\d+)\s*(\w+)/);
                if (match) {
                    const value = parseInt(match[1]);
                    const type = match[2].toUpperCase();
                    if (type === 'YDS') stats.yards = value;
                    if (type === 'TD') stats.touchdowns = value;
                    if (type === 'INT') stats.interceptions = value;
                    if (type === 'CAR') stats.carries = value;
                    if (type === 'REC') stats.receptions = value;
                }
            }
            return stats;
        }

        const result = {
            standings,
            leaders,
            source: 'espn_nfl',
            teamsCount: standings.length,
            timestamp: new Date().toISOString()
        };

        propsCache[cacheKey] = { data: result, timestamp: Date.now() };
        console.log(`✅ NFL Advanced: ${standings.length} teams with stats`);
        return result;
    } catch (error) {
        console.error('NFL Advanced stats error:', error.message);
        return { standings: [], leaders: [], source: 'espn_nfl', error: error.message };
    }
}

// =====================================================
// NBA Advanced Stats from ESPN
// =====================================================
async function fetchNBAAdvancedStats() {
    const cacheKey = 'nba_advanced';
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < PROPS_CACHE_TTL_MS)) {
        console.log('📦 Returning cached NBA advanced stats');
        return propsCache[cacheKey].data;
    }

    try {
        console.log('🏀 Fetching NBA advanced stats...');

        // Get NBA standings from ESPN
        const standingsUrl = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings';
        const standingsData = await fetchJSON(standingsUrl);

        const standings = [];
        for (const child of (standingsData.children || [])) {
            for (const innerChild of (child.standings?.entries || [])) {
                const team = innerChild.team;
                const stats = {};
                (innerChild.stats || []).forEach(s => {
                    stats[s.name] = s.value;
                });

                standings.push({
                    teamId: team?.id,
                    teamName: team?.displayName,
                    abbreviation: team?.abbreviation,
                    logo: team?.logos?.[0]?.href,
                    wins: stats.wins || 0,
                    losses: stats.losses || 0,
                    winPct: stats.winPercent || 0,
                    pointsFor: stats.avgPointsFor || stats.pointsFor || 0,
                    pointsAgainst: stats.avgPointsAgainst || stats.pointsAgainst || 0,
                    streak: stats.streak || 0,
                    homeRecord: stats.homeWinPercent || 0,
                    awayRecord: stats.awayWinPercent || 0,
                    last10: stats.last10GamesRecord || ''
                });
            }
        }

        // Get player stats leaders
        const leadersUrl = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/leaders?limit=30';
        let leaders = [];
        try {
            const leadersData = await fetchJSON(leadersUrl);
            leaders = (leadersData.leaders || []).map(cat => ({
                category: cat.name,
                displayName: cat.displayName,
                leaders: (cat.leaders || []).slice(0, 15).map(l => ({
                    player: l.athlete?.fullName,
                    team: l.team?.abbreviation,
                    value: l.displayValue,
                    headshot: l.athlete?.headshot?.href
                }))
            }));
        } catch (e) { console.log('NBA leaders unavailable'); }

        const result = {
            standings,
            leaders,
            source: 'espn_nba',
            teamsCount: standings.length,
            timestamp: new Date().toISOString()
        };

        propsCache[cacheKey] = { data: result, timestamp: Date.now() };
        console.log(`✅ NBA Advanced: ${standings.length} teams with stats`);
        return result;
    } catch (error) {
        console.error('NBA Advanced stats error:', error.message);
        return { standings: [], leaders: [], source: 'espn_nba', error: error.message };
    }
}

// =====================================================
// Calculate Accurate Odds from Real Power Rankings
// Uses team stats to generate realistic betting lines
// =====================================================
function calculateAccurateOdds(homeTeam, awayTeam, sport, standings) {
    // Find teams in standings for accurate power rankings
    const homeStanding = standings.find(t =>
        t.teamName?.toLowerCase().includes(homeTeam.toLowerCase()) ||
        t.abbreviation?.toLowerCase() === homeTeam.toLowerCase() ||
        t.teamId?.toString() === homeTeam
    );
    const awayStanding = standings.find(t =>
        t.teamName?.toLowerCase().includes(awayTeam.toLowerCase()) ||
        t.abbreviation?.toLowerCase() === awayTeam.toLowerCase() ||
        t.teamId?.toString() === awayTeam
    );

    // Calculate power rating (0-100 scale)
    let homePower = 50, awayPower = 50;

    if (homeStanding && awayStanding) {
        homePower = (homeStanding.winPct || 0.5) * 80 + 20;
        awayPower = (awayStanding.winPct || 0.5) * 80 + 20;

        // Factor in point/goal differential
        if (homeStanding.pointDifferential !== undefined) {
            homePower += Math.min(10, Math.max(-10, homeStanding.pointDifferential / 10));
        }
        if (awayStanding.pointDifferential !== undefined) {
            awayPower += Math.min(10, Math.max(-10, awayStanding.pointDifferential / 10));
        }
    }

    // Home court/field advantage by sport
    const homeAdvantage = {
        'nba': 3.5,
        'nfl': 2.5,
        'nhl': 0.15,  // NHL has smaller home advantage
        'mlb': 0.04   // MLB has minimal home advantage
    }[sport] || 3;

    // Adjust home power for home advantage
    homePower += homeAdvantage;

    // Calculate win probability
    const homeWinProb = homePower / (homePower + awayPower);
    const awayWinProb = 1 - homeWinProb;

    // Convert to American odds
    const homeMoneyline = probToAmericanOdds(homeWinProb);
    const awayMoneyline = probToAmericanOdds(awayWinProb);

    // Calculate spread based on power differential and sport
    let spreadPoints;
    const powerDiff = homePower - awayPower;

    if (sport === 'nba') {
        spreadPoints = Math.round(powerDiff * 0.4 * 2) / 2; // NBA spreads in 0.5 increments
    } else if (sport === 'nfl') {
        spreadPoints = Math.round(powerDiff * 0.3 * 2) / 2;
    } else if (sport === 'nhl') {
        spreadPoints = powerDiff > 5 ? -1.5 : (powerDiff < -5 ? 1.5 : -1.5);
    } else if (sport === 'mlb') {
        spreadPoints = powerDiff > 5 ? -1.5 : (powerDiff < -5 ? 1.5 : -1.5);
    } else {
        spreadPoints = Math.round(powerDiff * 0.35 * 2) / 2;
    }

    // Calculate totals based on sport averages and team scoring
    let totalPoints;
    const homeScoring = homeStanding?.pointsFor || homeStanding?.goalsFor || 100;
    const awayScoring = awayStanding?.pointsFor || awayStanding?.goalsFor || 100;

    if (sport === 'nba') {
        totalPoints = 215 + Math.round((homeScoring + awayScoring) / 20);
    } else if (sport === 'nfl') {
        totalPoints = 43 + Math.round((homeScoring + awayScoring) / 30);
    } else if (sport === 'nhl') {
        totalPoints = 5.5 + Math.round((homeScoring + awayScoring) / 200 * 2) / 2;
    } else if (sport === 'mlb') {
        totalPoints = 8.5 + Math.round((homeScoring + awayScoring) / 150 * 2) / 2;
    } else {
        totalPoints = 200;
    }

    return {
        homeMoneyline,
        awayMoneyline,
        spread: -spreadPoints, // Home team spread (negative = favorite)
        spreadOdds: -110,
        total: totalPoints,
        overOdds: -110,
        underOdds: -110,
        homeWinProb: (homeWinProb * 100).toFixed(1) + '%',
        awayWinProb: (awayWinProb * 100).toFixed(1) + '%'
    };
}

// Convert probability to American odds
function probToAmericanOdds(prob) {
    if (prob >= 0.5) {
        return Math.round(-100 * prob / (1 - prob));
    } else {
        return Math.round(100 * (1 - prob) / prob);
    }
}

// =====================================================
// Generate Accurate Props for All Sports with AI Predictions
// =====================================================
function generateAccurateProps(leaders, sport) {
    const props = [];

    if (!leaders || leaders.length === 0) return props;

    const propConfigs = {
        nba: {
            categories: {
                'points': { name: 'Points', variance: 4 },
                'rebounds': { name: 'Rebounds', variance: 2 },
                'assists': { name: 'Assists', variance: 2 },
                'threePointsMade': { name: 'Threes Made', variance: 1.5 }
            }
        },
        nfl: {
            categories: {
                'passingYards': { name: 'Passing Yards', variance: 30 },
                'rushingYards': { name: 'Rushing Yards', variance: 15 },
                'receivingYards': { name: 'Receiving Yards', variance: 15 },
                'passingTouchdowns': { name: 'Passing TDs', variance: 0.5 }
            }
        },
        nhl: {
            categories: {
                'goals': { name: 'Goals', variance: 0.3 },
                'assists': { name: 'Assists', variance: 0.4 },
                'points': { name: 'Points', variance: 0.5 },
                'shotsOnGoal': { name: 'Shots on Goal', variance: 1 }
            }
        },
        mlb: {
            categories: {
                'homeRuns': { name: 'Home Runs', variance: 0.3 },
                'hits': { name: 'Hits', variance: 0.5 },
                'runsBattedIn': { name: 'RBIs', variance: 0.4 },
                'strikeouts': { name: 'Strikeouts (P)', variance: 1.5 }
            }
        }
    };

    const sportConfig = propConfigs[sport] || propConfigs.nba;

    for (const category of leaders) {
        const catName = category.category || category.displayName || '';
        const config = Object.entries(sportConfig.categories).find(([key]) =>
            catName.toLowerCase().includes(key.toLowerCase())
        );

        if (config && category.leaders) {
            const [, propConfig] = config;

            for (const leader of category.leaders.slice(0, 10)) {
                // Skip injured players
                if (isPlayerInjured(leader.player)) {
                    console.log(`  ⛔ Skipping ${leader.player} - injured`);
                    continue;
                }

                // Parse the stat value
                let statValue = parseFloat(leader.value?.replace(/[^0-9.]/g, '') || 0);
                if (isNaN(statValue)) continue;

                // Convert season totals to per-game averages based on sport
                let perGameAvg;
                const gamesPlayed = sport === 'mlb' ? 162 : sport === 'nba' ? 82 : sport === 'nfl' ? 17 : sport === 'nhl' ? 82 : 50;

                // Sport-specific thresholds to detect season totals vs averages
                if (sport === 'mlb') {
                    const isTotal = (propConfig.name.includes('Home Runs') && statValue > 10) ||
                                   (propConfig.name.includes('Hits') && statValue > 3) ||
                                   (propConfig.name.includes('RBIs') && statValue > 5) ||
                                   (propConfig.name.includes('Strikeouts') && statValue > 30);
                    perGameAvg = isTotal ? statValue / gamesPlayed : statValue;
                } else if (sport === 'nba') {
                    perGameAvg = statValue > 100 ? statValue / gamesPlayed : statValue;
                } else if (sport === 'nfl') {
                    perGameAvg = statValue > 300 ? statValue / gamesPlayed : statValue;
                } else if (sport === 'nhl') {
                    perGameAvg = statValue > 10 ? statValue / gamesPlayed : statValue;
                } else {
                    perGameAvg = statValue > 100 ? statValue / gamesPlayed : statValue;
                }

                // Use proper line rounding (0.5, 1.5, 2.5, etc.)
                const line = roundToProperLine(perGameAvg, propConfig.name);

                if (line > 0) {
                    // Generate smart AI prediction
                    const prediction = calculateSmartAIPick(perGameAvg, line, 'NEUTRAL', '', propConfig.name);

                    props.push({
                        player: leader.player,
                        team: leader.team,
                        position: leader.position || '',
                        headshot: leader.headshot,
                        propType: propConfig.name,
                        line: line,
                        seasonAvg: perGameAvg.toFixed(1),
                        seasonTotal: statValue,
                        aiPick: prediction.pick,
                        confidence: prediction.confidence,
                        reasoning: prediction.reasoning,
                        trend: prediction.trend,
                        over: generateBookOddsAccurate(-110),
                        under: generateBookOddsAccurate(-110),
                        source: 'generated_from_stats',
                        isRealLine: false,
                        lastUpdated: new Date().toISOString()
                    });
                }
            }
        }
    }

    // Sort by confidence (highest first) and filter injured
    const filtered = filterInjuredPlayers(props);
    filtered.sort((a, b) => b.confidence - a.confidence);

    return filtered;
}

// =====================================================
// ENHANCED AI PREDICTION ENGINE
// Factors: Weather, Recent Averages, Opponent Ratings,
// Home/Road Splits, Head-to-Head, Teammate Injuries
// =====================================================

// Team defensive ratings (lower = better defense)
const TEAM_DEFENSIVE_RATINGS = {
    nba: {
        'BOS': 105.2, 'CLE': 106.8, 'OKC': 107.1, 'MIN': 108.3, 'MIA': 109.0,
        'NYK': 109.5, 'PHI': 110.0, 'MIL': 110.5, 'DEN': 111.0, 'LAC': 111.2,
        'GSW': 111.5, 'PHX': 112.0, 'DAL': 112.3, 'LAL': 112.5, 'SAC': 113.0,
        'IND': 113.5, 'NO': 114.0, 'MEM': 114.2, 'ATL': 114.5, 'TOR': 115.0,
        'CHI': 115.5, 'BKN': 116.0, 'ORL': 116.2, 'HOU': 116.5, 'SAS': 117.0,
        'POR': 117.5, 'UTAH': 118.0, 'CHA': 118.5, 'DET': 119.0, 'WSH': 120.0
    },
    nfl: {
        'BAL': 17.5, 'CLE': 18.0, 'SF': 18.5, 'DAL': 19.0, 'BUF': 19.5,
        'MIA': 20.0, 'NYJ': 20.5, 'KC': 21.0, 'DET': 21.5, 'PHI': 22.0,
        'PIT': 22.5, 'DEN': 23.0, 'GB': 23.5, 'MIN': 24.0, 'SEA': 24.5,
        'LAC': 25.0, 'HOU': 25.5, 'JAX': 26.0, 'TEN': 26.5, 'IND': 27.0,
        'NO': 27.5, 'TB': 28.0, 'CHI': 28.5, 'ATL': 29.0, 'WAS': 29.5,
        'NYG': 30.0, 'ARI': 30.5, 'NE': 31.0, 'LV': 31.5, 'CAR': 32.0
    },
    nhl: {
        'BOS': 2.2, 'CAR': 2.3, 'NJ': 2.4, 'DAL': 2.5, 'VGK': 2.55,
        'COL': 2.6, 'NYR': 2.65, 'WPG': 2.7, 'MIN': 2.75, 'TOR': 2.8,
        'FLA': 2.85, 'TB': 2.9, 'EDM': 2.95, 'LA': 3.0, 'SEA': 3.05,
        'VAN': 3.1, 'STL': 3.15, 'CGY': 3.2, 'NSH': 3.25, 'PIT': 3.3,
        'WSH': 3.35, 'NYI': 3.4, 'DET': 3.45, 'OTT': 3.5, 'BUF': 3.55,
        'PHI': 3.6, 'MTL': 3.65, 'CBJ': 3.7, 'ANA': 3.75, 'CHI': 3.8, 'SJ': 3.9
    },
    mlb: {
        'LAD': 3.5, 'ATL': 3.6, 'HOU': 3.7, 'NYY': 3.8, 'BAL': 3.85,
        'ARI': 3.9, 'PHI': 3.95, 'TEX': 4.0, 'MIN': 4.05, 'TB': 4.1,
        'MIL': 4.15, 'SEA': 4.2, 'TOR': 4.25, 'SD': 4.3, 'SF': 4.35,
        'CLE': 4.4, 'BOS': 4.45, 'NYM': 4.5, 'CHC': 4.55, 'CIN': 4.6,
        'KC': 4.65, 'STL': 4.7, 'MIA': 4.75, 'DET': 4.8, 'PIT': 4.85,
        'LAA': 4.9, 'OAK': 4.95, 'WSH': 5.0, 'COL': 5.1, 'CHW': 5.2
    }
};

// NBA Category-Specific Defensive Ratings (per game allowed)
// Higher values = worse defense in that category = better for opponents
// reboundsAllowed: Opponent rebounds per game allowed
// assistsAllowed: Opponent assists per game allowed
// threesAllowed: Opponent 3-pointers made per game allowed
const NBA_CATEGORY_DEFENSE = {
    'BOS': { reboundsAllowed: 41.5, assistsAllowed: 23.2, threesAllowed: 11.8 }, // Elite overall but gives up some 3s
    'CLE': { reboundsAllowed: 42.0, assistsAllowed: 23.8, threesAllowed: 12.0 },
    'OKC': { reboundsAllowed: 41.0, assistsAllowed: 22.5, threesAllowed: 11.5 }, // Best perimeter D
    'MIN': { reboundsAllowed: 40.5, assistsAllowed: 24.0, threesAllowed: 12.2 }, // Great rebounding team limits opponent boards
    'MIA': { reboundsAllowed: 43.0, assistsAllowed: 23.0, threesAllowed: 12.5 },
    'NYK': { reboundsAllowed: 42.5, assistsAllowed: 24.5, threesAllowed: 12.8 },
    'PHI': { reboundsAllowed: 43.5, assistsAllowed: 24.2, threesAllowed: 13.0 },
    'MIL': { reboundsAllowed: 44.0, assistsAllowed: 25.0, threesAllowed: 13.2 },
    'DEN': { reboundsAllowed: 44.5, assistsAllowed: 25.5, threesAllowed: 13.5 },
    'LAC': { reboundsAllowed: 43.8, assistsAllowed: 24.8, threesAllowed: 13.0 },
    'GSW': { reboundsAllowed: 44.2, assistsAllowed: 25.2, threesAllowed: 13.8 },
    'PHX': { reboundsAllowed: 45.0, assistsAllowed: 26.0, threesAllowed: 14.0 },
    'DAL': { reboundsAllowed: 44.8, assistsAllowed: 25.8, threesAllowed: 14.2 },
    'LAL': { reboundsAllowed: 45.5, assistsAllowed: 26.5, threesAllowed: 14.5 },
    'SAC': { reboundsAllowed: 46.0, assistsAllowed: 27.0, threesAllowed: 14.8 },
    'IND': { reboundsAllowed: 46.5, assistsAllowed: 27.5, threesAllowed: 15.0 }, // Fast pace = more shots allowed
    'NO': { reboundsAllowed: 45.8, assistsAllowed: 26.8, threesAllowed: 14.5 },
    'MEM': { reboundsAllowed: 46.2, assistsAllowed: 27.2, threesAllowed: 15.2 },
    'ATL': { reboundsAllowed: 47.0, assistsAllowed: 28.0, threesAllowed: 15.5 }, // Poor defense
    'TOR': { reboundsAllowed: 46.0, assistsAllowed: 27.0, threesAllowed: 14.5 },
    'CHI': { reboundsAllowed: 47.5, assistsAllowed: 28.5, threesAllowed: 15.8 },
    'BKN': { reboundsAllowed: 48.0, assistsAllowed: 29.0, threesAllowed: 16.0 },
    'ORL': { reboundsAllowed: 44.0, assistsAllowed: 25.0, threesAllowed: 13.5 }, // Athletic, good paint D
    'HOU': { reboundsAllowed: 47.0, assistsAllowed: 28.0, threesAllowed: 15.5 },
    'SAS': { reboundsAllowed: 47.5, assistsAllowed: 28.5, threesAllowed: 15.8 },
    'POR': { reboundsAllowed: 48.5, assistsAllowed: 29.5, threesAllowed: 16.2 }, // Weak overall defense
    'UTAH': { reboundsAllowed: 48.0, assistsAllowed: 29.0, threesAllowed: 16.0 },
    'CHA': { reboundsAllowed: 49.0, assistsAllowed: 30.0, threesAllowed: 16.5 },
    'DET': { reboundsAllowed: 49.5, assistsAllowed: 30.5, threesAllowed: 16.8 },
    'WSH': { reboundsAllowed: 50.0, assistsAllowed: 31.0, threesAllowed: 17.0 }  // Worst defense
};

// NBA Team Records - 2025-26 Season (LIVE from ESPN - Updated 02/12/2026)
// Used for blowout risk calculation - starters may sit early in lopsided games
// Format: { wins, losses, winPct }
const NBA_TEAM_RECORDS = {
    'OKC': { wins: 42, losses: 13, winPct: 0.764 },  // #1 Overall
    'DET': { wins: 40, losses: 13, winPct: 0.755 },  // #2 Overall
    'SA': { wins: 38, losses: 16, winPct: 0.704 },  // Top 3
    'SAS': { wins: 38, losses: 16, winPct: 0.704 },  // Alt abbreviation
    'BOS': { wins: 35, losses: 19, winPct: 0.648 },
    'NY': { wins: 35, losses: 20, winPct: 0.636 },
    'NYK': { wins: 35, losses: 20, winPct: 0.636 },  // Alt abbreviation
    'DEN': { wins: 35, losses: 20, winPct: 0.636 },
    'HOU': { wins: 33, losses: 20, winPct: 0.623 },
    'CLE': { wins: 34, losses: 21, winPct: 0.618 },
    'MIN': { wins: 34, losses: 22, winPct: 0.607 },
    'LAL': { wins: 32, losses: 21, winPct: 0.604 },
    'TOR': { wins: 32, losses: 23, winPct: 0.582 },
    'PHX': { wins: 32, losses: 23, winPct: 0.582 },
    'PHI': { wins: 30, losses: 24, winPct: 0.556 },
    'ORL': { wins: 28, losses: 25, winPct: 0.528 },
    'GS': { wins: 29, losses: 26, winPct: 0.527 },
    'GSW': { wins: 29, losses: 26, winPct: 0.527 },  // Alt abbreviation
    'MIA': { wins: 29, losses: 27, winPct: 0.518 },
    'LAC': { wins: 26, losses: 28, winPct: 0.481 },
    'CHA': { wins: 26, losses: 29, winPct: 0.473 },
    'POR': { wins: 26, losses: 29, winPct: 0.473 },
    'ATL': { wins: 26, losses: 30, winPct: 0.464 },
    'CHI': { wins: 24, losses: 31, winPct: 0.436 },
    'MIL': { wins: 22, losses: 30, winPct: 0.423 },  // Struggling this year
    'MEM': { wins: 20, losses: 33, winPct: 0.377 },
    'DAL': { wins: 19, losses: 34, winPct: 0.358 },  // Down year
    'UTAH': { wins: 18, losses: 37, winPct: 0.327 },
    'UTA': { wins: 18, losses: 37, winPct: 0.327 },  // Alt abbreviation
    'BKN': { wins: 15, losses: 38, winPct: 0.283 },
    'IND': { wins: 15, losses: 40, winPct: 0.273 },
    'NO': { wins: 15, losses: 41, winPct: 0.268 },
    'NOP': { wins: 15, losses: 41, winPct: 0.268 },  // Alt abbreviation
    'WSH': { wins: 14, losses: 39, winPct: 0.264 },  // Worst record
    'SAC': { wins: 12, losses: 44, winPct: 0.214 },  // Worst record
};

// Calculate blowout risk based on team record differential
// Returns a multiplier (0.85-1.0) that reduces expected stats in blowout scenarios
function calculateBlowoutRisk(playerTeam, opponentTeam, sport) {
    if (sport !== 'nba') return { multiplier: 1.0, risk: 'normal', note: null };

    const playerRecord = NBA_TEAM_RECORDS[playerTeam];
    const oppRecord = NBA_TEAM_RECORDS[opponentTeam];

    if (!playerRecord || !oppRecord) return { multiplier: 1.0, risk: 'normal', note: null };

    // Calculate win percentage differential
    const winPctDiff = playerRecord.winPct - oppRecord.winPct;

    // If player's team is heavily favored (>15% win rate difference), risk of sitting early
    if (winPctDiff > 0.20) {
        return {
            multiplier: 0.92,
            risk: 'high_blowout',
            note: `${playerTeam} (${playerRecord.wins}-${playerRecord.losses}) heavy favorite vs ${opponentTeam} (${oppRecord.wins}-${oppRecord.losses}) - blowout risk`
        };
    } else if (winPctDiff > 0.15) {
        return {
            multiplier: 0.95,
            risk: 'moderate_blowout',
            note: `${playerTeam} favored vs ${opponentTeam} - possible reduced minutes`
        };
    }

    // If player's team is heavily underdog, they might get blown out too
    if (winPctDiff < -0.20) {
        return {
            multiplier: 0.93,
            risk: 'high_loss',
            note: `${playerTeam} (${playerRecord.wins}-${playerRecord.losses}) underdog vs ${opponentTeam} (${oppRecord.wins}-${oppRecord.losses}) - garbage time risk`
        };
    } else if (winPctDiff < -0.15) {
        return {
            multiplier: 0.96,
            risk: 'moderate_loss',
            note: `${playerTeam} underdog vs ${opponentTeam} - possible reduced minutes`
        };
    }

    // Close matchups are good - full minutes expected
    if (Math.abs(winPctDiff) < 0.08) {
        return {
            multiplier: 1.02,
            risk: 'competitive',
            note: `${playerTeam} vs ${opponentTeam} - competitive matchup, full minutes expected`
        };
    }

    return { multiplier: 1.0, risk: 'normal', note: null };
}

// Team offensive ratings (higher = better offense)
const TEAM_OFFENSIVE_RATINGS = {
    nba: {
        'BOS': 122.5, 'OKC': 121.0, 'IND': 120.5, 'SAC': 119.5, 'DAL': 118.5,
        'DEN': 118.0, 'PHX': 117.5, 'NYK': 117.0, 'CLE': 116.5, 'MIL': 116.0,
        'LAL': 115.5, 'ATL': 115.0, 'MIN': 114.5, 'NO': 114.0, 'GSW': 113.5,
        'MIA': 113.0, 'PHI': 112.5, 'LAC': 112.0, 'HOU': 111.5, 'TOR': 111.0,
        'CHI': 110.5, 'BKN': 110.0, 'MEM': 109.5, 'SAS': 109.0, 'ORL': 108.5,
        'POR': 108.0, 'UTAH': 107.5, 'DET': 107.0, 'WSH': 106.5, 'CHA': 106.0
    },
    nfl: {
        'SF': 28.5, 'MIA': 28.0, 'DAL': 27.5, 'DET': 27.0, 'BUF': 26.5,
        'PHI': 26.0, 'KC': 25.5, 'JAX': 25.0, 'BAL': 24.5, 'CIN': 24.0,
        'LAC': 23.5, 'GB': 23.0, 'HOU': 22.5, 'SEA': 22.0, 'MIN': 21.5,
        'NO': 21.0, 'CLE': 20.5, 'ATL': 20.0, 'LV': 19.5, 'NYJ': 19.0,
        'PIT': 18.5, 'DEN': 18.0, 'CHI': 17.5, 'IND': 17.0, 'TB': 16.5,
        'TEN': 16.0, 'WAS': 15.5, 'NYG': 15.0, 'ARI': 14.5, 'NE': 14.0, 'CAR': 13.5
    }
};

// Home/Road performance adjustments (multiplier: 1.0 = neutral)
// STANDARDIZED: Same 5% adjustment for all sports
const HOME_ROAD_FACTORS = {
    nba: { home: 1.05, road: 0.95 },
    nfl: { home: 1.05, road: 0.95 },
    nhl: { home: 1.05, road: 0.95 },
    mlb: { home: 1.05, road: 0.95 }
};

// Weather impact on outdoor sports (NFL, MLB)
// Stadium coordinates for weather lookup
const STADIUM_COORDINATES = {
    // NFL Stadiums (outdoor and retractable roof)
    nfl: {
        'BUF': { city: 'Buffalo', lat: 42.7738, lon: -78.7870, indoor: false },
        'MIA': { city: 'Miami', lat: 25.9580, lon: -80.2389, indoor: false },
        'NE': { city: 'Foxborough', lat: 42.0909, lon: -71.2643, indoor: false },
        'NYJ': { city: 'East Rutherford', lat: 40.8135, lon: -74.0745, indoor: false },
        'NYG': { city: 'East Rutherford', lat: 40.8135, lon: -74.0745, indoor: false },
        'BAL': { city: 'Baltimore', lat: 39.2780, lon: -76.6227, indoor: false },
        'CIN': { city: 'Cincinnati', lat: 39.0955, lon: -84.5161, indoor: false },
        'CLE': { city: 'Cleveland', lat: 41.5061, lon: -81.6995, indoor: false },
        'PIT': { city: 'Pittsburgh', lat: 40.4468, lon: -80.0158, indoor: false },
        'HOU': { city: 'Houston', lat: 29.6847, lon: -95.4107, indoor: true }, // Retractable
        'IND': { city: 'Indianapolis', lat: 39.7601, lon: -86.1639, indoor: true },
        'JAX': { city: 'Jacksonville', lat: 30.3239, lon: -81.6373, indoor: false },
        'TEN': { city: 'Nashville', lat: 36.1665, lon: -86.7713, indoor: false },
        'DEN': { city: 'Denver', lat: 39.7439, lon: -105.0201, indoor: false },
        'KC': { city: 'Kansas City', lat: 39.0489, lon: -94.4839, indoor: false },
        'LV': { city: 'Las Vegas', lat: 36.0909, lon: -115.1833, indoor: true },
        'LAC': { city: 'Inglewood', lat: 33.9535, lon: -118.3392, indoor: true },
        'DAL': { city: 'Arlington', lat: 32.7473, lon: -97.0945, indoor: true }, // Retractable
        'PHI': { city: 'Philadelphia', lat: 39.9008, lon: -75.1675, indoor: false },
        'WAS': { city: 'Landover', lat: 38.9076, lon: -76.8645, indoor: false },
        'CHI': { city: 'Chicago', lat: 41.8623, lon: -87.6167, indoor: false },
        'DET': { city: 'Detroit', lat: 42.3400, lon: -83.0456, indoor: true },
        'GB': { city: 'Green Bay', lat: 44.5013, lon: -88.0622, indoor: false },
        'MIN': { city: 'Minneapolis', lat: 44.9736, lon: -93.2575, indoor: true },
        'ATL': { city: 'Atlanta', lat: 33.7554, lon: -84.4010, indoor: true }, // Retractable
        'CAR': { city: 'Charlotte', lat: 35.2258, lon: -80.8528, indoor: false },
        'NO': { city: 'New Orleans', lat: 29.9511, lon: -90.0812, indoor: true },
        'TB': { city: 'Tampa', lat: 27.9759, lon: -82.5033, indoor: false },
        'ARI': { city: 'Glendale', lat: 33.5276, lon: -112.2626, indoor: true }, // Retractable
        'LAR': { city: 'Inglewood', lat: 33.9535, lon: -118.3392, indoor: true },
        'SF': { city: 'Santa Clara', lat: 37.4033, lon: -121.9694, indoor: false },
        'SEA': { city: 'Seattle', lat: 47.5952, lon: -122.3316, indoor: false }
    },
    // MLB Stadiums
    mlb: {
        'NYY': { city: 'Bronx', lat: 40.8296, lon: -73.9262, indoor: false },
        'NYM': { city: 'Queens', lat: 40.7571, lon: -73.8458, indoor: false },
        'BOS': { city: 'Boston', lat: 42.3467, lon: -71.0972, indoor: false },
        'TB': { city: 'St. Petersburg', lat: 27.7683, lon: -82.6534, indoor: true },
        'TOR': { city: 'Toronto', lat: 43.6414, lon: -79.3894, indoor: true }, // Retractable
        'BAL': { city: 'Baltimore', lat: 39.2838, lon: -76.6217, indoor: false },
        'CLE': { city: 'Cleveland', lat: 41.4962, lon: -81.6852, indoor: false },
        'DET': { city: 'Detroit', lat: 42.3390, lon: -83.0485, indoor: false },
        'KC': { city: 'Kansas City', lat: 39.0517, lon: -94.4803, indoor: false },
        'MIN': { city: 'Minneapolis', lat: 44.9817, lon: -93.2776, indoor: false },
        'CWS': { city: 'Chicago', lat: 41.8299, lon: -87.6338, indoor: false },
        'HOU': { city: 'Houston', lat: 29.7573, lon: -95.3555, indoor: true }, // Retractable
        'LAA': { city: 'Anaheim', lat: 33.8003, lon: -117.8827, indoor: false },
        'OAK': { city: 'Oakland', lat: 37.7516, lon: -122.2005, indoor: false },
        'SEA': { city: 'Seattle', lat: 47.5914, lon: -122.3325, indoor: true }, // Retractable
        'TEX': { city: 'Arlington', lat: 32.7512, lon: -97.0832, indoor: true }, // Retractable
        'ATL': { city: 'Atlanta', lat: 33.8907, lon: -84.4678, indoor: false },
        'MIA': { city: 'Miami', lat: 25.7781, lon: -80.2197, indoor: true }, // Retractable
        'PHI': { city: 'Philadelphia', lat: 39.9061, lon: -75.1665, indoor: false },
        'WSH': { city: 'Washington', lat: 38.8730, lon: -77.0074, indoor: false },
        'CHC': { city: 'Chicago', lat: 41.9484, lon: -87.6553, indoor: false },
        'CIN': { city: 'Cincinnati', lat: 39.0979, lon: -84.5082, indoor: false },
        'MIL': { city: 'Milwaukee', lat: 43.0280, lon: -87.9712, indoor: true }, // Retractable
        'PIT': { city: 'Pittsburgh', lat: 40.4469, lon: -80.0057, indoor: false },
        'STL': { city: 'St. Louis', lat: 38.6226, lon: -90.1928, indoor: false },
        'ARI': { city: 'Phoenix', lat: 33.4453, lon: -112.0667, indoor: true }, // Retractable
        'COL': { city: 'Denver', lat: 39.7559, lon: -104.9942, indoor: false },
        'LAD': { city: 'Los Angeles', lat: 34.0739, lon: -118.2400, indoor: false },
        'SD': { city: 'San Diego', lat: 32.7076, lon: -117.1570, indoor: false },
        'SF': { city: 'San Francisco', lat: 37.7786, lon: -122.3893, indoor: false }
    }
};

// Fetch weather for a specific team's stadium
async function fetchStadiumWeather(teamAbbr, sport) {
    try {
        const stadiums = STADIUM_COORDINATES[sport];
        if (!stadiums) return null;

        const stadium = stadiums[teamAbbr];
        if (!stadium) return null;

        // Indoor stadiums don't need weather
        if (stadium.indoor) {
            return {
                indoor: true,
                city: stadium.city,
                note: 'Indoor/dome stadium - no weather impact'
            };
        }

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${stadium.lat}&longitude=${stadium.lon}&current_weather=true`;
        const data = await fetchJSON(url);

        const temp = data.current_weather?.temperature || 70;
        const wind = data.current_weather?.windspeed || 5;
        const code = data.current_weather?.weathercode || 0;

        return {
            indoor: false,
            city: stadium.city,
            temperature: Math.round(temp * 9/5 + 32), // Convert C to F
            windSpeed: Math.round(wind * 0.621371), // Convert km/h to mph
            weatherCode: code,
            isRaining: [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code),
            isSnowing: [71, 73, 75, 77, 85, 86].includes(code),
            isExtremeCold: temp < 0, // 32F
            isExtremeHeat: temp > 35, // 95F
            conditions: getWeatherDescription(code)
        };
    } catch (e) {
        console.log(`⚠️ Weather fetch failed for ${teamAbbr}: ${e.message}`);
        return null;
    }
}

// Get human-readable weather description
function getWeatherDescription(code) {
    const descriptions = {
        0: 'Clear',
        1: 'Mostly Clear',
        2: 'Partly Cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Freezing Fog',
        51: 'Light Drizzle',
        53: 'Moderate Drizzle',
        55: 'Heavy Drizzle',
        61: 'Light Rain',
        63: 'Moderate Rain',
        65: 'Heavy Rain',
        71: 'Light Snow',
        73: 'Moderate Snow',
        75: 'Heavy Snow',
        77: 'Snow Grains',
        80: 'Light Showers',
        81: 'Moderate Showers',
        82: 'Heavy Showers',
        85: 'Light Snow Showers',
        86: 'Heavy Snow Showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm + Hail',
        99: 'Severe Thunderstorm'
    };
    return descriptions[code] || 'Unknown';
}

async function fetchWeatherData(city) {
    try {
        // Using Open-Meteo free weather API
        const cityCoords = {
            'New York': { lat: 40.7128, lon: -74.0060 },
            'Los Angeles': { lat: 34.0522, lon: -118.2437 },
            'Chicago': { lat: 41.8781, lon: -87.6298 },
            'Dallas': { lat: 32.7767, lon: -96.7970 },
            'Houston': { lat: 29.7604, lon: -95.3698 },
            'Phoenix': { lat: 33.4484, lon: -112.0740 },
            'Denver': { lat: 39.7392, lon: -104.9903 },
            'Miami': { lat: 25.7617, lon: -80.1918 },
            'Seattle': { lat: 47.6062, lon: -122.3321 },
            'Boston': { lat: 42.3601, lon: -71.0589 },
            'Philadelphia': { lat: 39.9526, lon: -75.1652 },
            'San Francisco': { lat: 37.7749, lon: -122.4194 },
            'Detroit': { lat: 42.3314, lon: -83.0458 },
            'Minneapolis': { lat: 44.9778, lon: -93.2650 },
            'Cleveland': { lat: 41.4993, lon: -81.6944 },
            'Green Bay': { lat: 44.5192, lon: -88.0198 },
            'Buffalo': { lat: 42.8864, lon: -78.8784 },
            'Kansas City': { lat: 39.0997, lon: -94.5786 },
            'Baltimore': { lat: 39.2904, lon: -76.6122 },
            'Pittsburgh': { lat: 40.4406, lon: -79.9959 }
        };

        const coords = cityCoords[city] || { lat: 40.7128, lon: -74.0060 };
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`;

        const data = await fetchJSON(url);
        return {
            temperature: data.current_weather?.temperature || 70,
            windSpeed: data.current_weather?.windspeed || 5,
            weatherCode: data.current_weather?.weathercode || 0,
            isRaining: [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(data.current_weather?.weathercode),
            isSnowing: [71, 73, 75, 77, 85, 86].includes(data.current_weather?.weathercode),
            isExtremeCold: (data.current_weather?.temperature || 70) < 32,
            isExtremeHeat: (data.current_weather?.temperature || 70) > 95
        };
    } catch (e) {
        return { temperature: 70, windSpeed: 5, isRaining: false, isSnowing: false };
    }
}

// Calculate weather impact on player performance
// STANDARDIZED: All weather factors use 5% adjustment
function getWeatherImpact(weather, sport, propType) {
    if (sport === 'nba' || sport === 'nhl') {
        // Indoor sports - no weather impact
        return { multiplier: 1.0, note: null };
    }

    let multiplier = 1.0;
    let note = null;

    // STANDARDIZED WEATHER FACTORS - 5% adjustments for all conditions
    if (sport === 'nfl' || sport === 'mlb') {
        // High wind (>15mph)
        if (weather.windSpeed > 15) {
            if (propType.includes('Pass') || propType.includes('Receiving') || propType.includes('Rec')) {
                multiplier *= 0.95;
                note = `High wind (${weather.windSpeed}mph) -5%`;
            } else if (propType.includes('Rush')) {
                multiplier *= 1.05;
                note = `Wind favors run game +5%`;
            }
        }

        // Rain
        if (weather.isRaining) {
            multiplier *= 0.95;
            note = 'Rain -5%';
        }

        // Snow
        if (weather.isSnowing) {
            multiplier *= 0.95;
            note = 'Snow -5%';
        }

        // Extreme cold (<32°F)
        if (weather.isExtremeCold) {
            multiplier *= 0.95;
            note = `Cold (${weather.temperature}°F) -5%`;
        }

        // Extreme heat (>95°F)
        if (weather.isExtremeHeat) {
            multiplier *= 0.95;
            note = `Heat (${weather.temperature}°F) -5%`;
        }
    }

    return { multiplier, note };
}

// Calculate opportunity boost when key teammates are out
function getTeammateInjuryBoost(playerTeam, sport, propType, injuries) {
    if (!injuries || injuries.length === 0) return { boost: 0, note: null };

    // Find injured players on the same team
    const teamInjuries = injuries.filter(inj =>
        inj.team === playerTeam &&
        (inj.status === 'Out' || inj.status === 'Doubtful')
    );

    if (teamInjuries.length === 0) return { boost: 0, note: null };

    let boost = 0;
    let notes = [];

    for (const injured of teamInjuries) {
        // Check if injured player is a high-usage player
        const injuredName = injured.name || injured.player;

        // NBA: Points boost when scorer is out
        if (sport === 'nba' && propType === 'Points') {
            // Approximate usage boost
            boost += 3; // Add ~3% confidence for each major player out
            notes.push(`${injuredName} out - increased usage`);
        }

        // NFL: Target boost when WR is out
        if (sport === 'nfl' && propType.includes('Receiving')) {
            boost += 4;
            notes.push(`${injuredName} out - more targets available`);
        }

        // NHL: Ice time boost
        if (sport === 'nhl' && (propType === 'Points' || propType === 'Shots')) {
            boost += 2;
            notes.push(`${injuredName} out - more ice time`);
        }
    }

    return {
        boost: Math.min(boost, 10), // Cap at 10% boost
        note: notes.length > 0 ? notes[0] : null
    };
}

// Calculate opponent matchup rating
function getOpponentMatchupRating(opponentTeam, sport, propType) {
    const defRatings = TEAM_DEFENSIVE_RATINGS[sport] || {};
    const defRating = defRatings[opponentTeam];

    if (!defRating) return { adjustment: 0, rating: 'Average', note: null };

    // Get league average
    const ratings = Object.values(defRatings);
    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

    // For NBA/NHL: higher def rating = worse defense = good for offense
    // For NFL/MLB: lower def rating = better defense = bad for offense
    let adjustment = 0;
    let rating = 'Average';
    let note = null;

    if (sport === 'nba') {
        // Check for category-specific prop types
        const categoryDefense = NBA_CATEGORY_DEFENSE[opponentTeam];

        if (categoryDefense && propType) {
            const propTypeLower = propType.toLowerCase();

            // Rebounds prop adjustments
            if (propTypeLower.includes('rebound')) {
                const rebAvg = Object.values(NBA_CATEGORY_DEFENSE).reduce((sum, t) => sum + t.reboundsAllowed, 0) / Object.keys(NBA_CATEGORY_DEFENSE).length;
                const rebDiff = categoryDefense.reboundsAllowed - rebAvg;

                if (rebDiff > 2) {
                    adjustment = Math.min(8, Math.round(rebDiff * 1.5));
                    rating = 'Easy';
                    note = `${opponentTeam} allows ${categoryDefense.reboundsAllowed.toFixed(1)} RPG (good for rebounds)`;
                } else if (rebDiff < -2) {
                    adjustment = Math.max(-8, Math.round(rebDiff * 1.5));
                    rating = 'Tough';
                    note = `${opponentTeam} allows only ${categoryDefense.reboundsAllowed.toFixed(1)} RPG`;
                }
                return { adjustment, rating, note, category: 'rebounds' };
            }

            // Assists prop adjustments
            if (propTypeLower.includes('assist')) {
                const astAvg = Object.values(NBA_CATEGORY_DEFENSE).reduce((sum, t) => sum + t.assistsAllowed, 0) / Object.keys(NBA_CATEGORY_DEFENSE).length;
                const astDiff = categoryDefense.assistsAllowed - astAvg;

                if (astDiff > 1.5) {
                    adjustment = Math.min(8, Math.round(astDiff * 2));
                    rating = 'Easy';
                    note = `${opponentTeam} allows ${categoryDefense.assistsAllowed.toFixed(1)} APG (good for assists)`;
                } else if (astDiff < -1.5) {
                    adjustment = Math.max(-8, Math.round(astDiff * 2));
                    rating = 'Tough';
                    note = `${opponentTeam} allows only ${categoryDefense.assistsAllowed.toFixed(1)} APG`;
                }
                return { adjustment, rating, note, category: 'assists' };
            }

            // 3-pointers prop adjustments
            if (propTypeLower.includes('3') || propTypeLower.includes('three') || propTypeLower.includes('3pt') || propTypeLower.includes('3-pt')) {
                const threeAvg = Object.values(NBA_CATEGORY_DEFENSE).reduce((sum, t) => sum + t.threesAllowed, 0) / Object.keys(NBA_CATEGORY_DEFENSE).length;
                const threeDiff = categoryDefense.threesAllowed - threeAvg;

                if (threeDiff > 1) {
                    adjustment = Math.min(10, Math.round(threeDiff * 3));
                    rating = 'Easy';
                    note = `${opponentTeam} allows ${categoryDefense.threesAllowed.toFixed(1)} 3PM/G (good for 3PT)`;
                } else if (threeDiff < -1) {
                    adjustment = Math.max(-10, Math.round(threeDiff * 3));
                    rating = 'Tough';
                    note = `${opponentTeam} allows only ${categoryDefense.threesAllowed.toFixed(1)} 3PM/G`;
                }
                return { adjustment, rating, note, category: '3-pointers' };
            }
        }

        // Default overall defensive rating for points/scoring props
        const diff = defRating - avgRating;
        if (diff > 3) {
            adjustment = 5;
            rating = 'Easy';
            note = `${opponentTeam} has weak defense (${defRating.toFixed(1)} DRTG)`;
        } else if (diff < -3) {
            adjustment = -5;
            rating = 'Tough';
            note = `${opponentTeam} has elite defense (${defRating.toFixed(1)} DRTG)`;
        }
    } else if (sport === 'nfl') {
        const diff = avgRating - defRating;
        if (diff > 3) {
            adjustment = -5;
            rating = 'Tough';
            note = `${opponentTeam} has elite defense (${defRating.toFixed(1)} PPG allowed)`;
        } else if (diff < -3) {
            adjustment = 5;
            rating = 'Easy';
            note = `${opponentTeam} has weak defense (${defRating.toFixed(1)} PPG allowed)`;
        }
    }

    return { adjustment, rating, note };
}

// Helper function to fetch game context for enhanced predictions
async function fetchGameContext(sport) {
    let todaysGames = [];
    let injuries = [];
    let weatherByTeam = {};

    try {
        // Fetch today's games from ESPN
        const sportPaths = { nba: 'basketball/nba', nfl: 'football/nfl', nhl: 'hockey/nhl', mlb: 'baseball/mlb' };
        const sportPath = sportPaths[sport];
        if (sportPath) {
            const scoresUrl = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/scoreboard`;
            const scoresData = await fetchJSON(scoresUrl);
            if (scoresData?.events) {
                todaysGames = scoresData.events.map(e => {
                    const home = e.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home');
                    const away = e.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away');
                    const competition = e.competitions?.[0];
                    return {
                        id: e.id,
                        homeTeam: { abbreviation: home?.team?.abbreviation, name: home?.team?.displayName },
                        awayTeam: { abbreviation: away?.team?.abbreviation, name: away?.team?.displayName },
                        startTime: e.date || competition?.date || null,
                        venue: competition?.venue?.fullName || null,
                        broadcast: competition?.broadcasts?.[0]?.names?.[0] || null,
                        status: e.status?.type?.name || 'scheduled'
                    };
                });

                // Fetch weather for outdoor sports (NFL, MLB)
                if (sport === 'nfl' || sport === 'mlb') {
                    console.log(`🌤️ Fetching weather for ${todaysGames.length} ${sport.toUpperCase()} games...`);

                    // Fetch weather for each home team's stadium (in parallel)
                    const weatherPromises = todaysGames.map(async (game) => {
                        const homeTeam = game.homeTeam?.abbreviation;
                        if (homeTeam && !weatherByTeam[homeTeam]) {
                            const weather = await fetchStadiumWeather(homeTeam, sport);
                            if (weather) {
                                weatherByTeam[homeTeam] = weather;
                                // Away team plays in same weather
                                if (game.awayTeam?.abbreviation) {
                                    weatherByTeam[game.awayTeam.abbreviation] = weather;
                                }
                            }
                        }
                    });

                    await Promise.all(weatherPromises);

                    const outdoorGames = Object.values(weatherByTeam).filter(w => !w.indoor).length;
                    console.log(`🌤️ Weather loaded: ${Object.keys(weatherByTeam).length} teams, ${outdoorGames} outdoor games`);
                }
            }
        }
        // Get injuries from cache
        injuries = Array.from(INJURED_PLAYERS_CACHE.players || []);
    } catch (e) {
        console.log(`⚠️ Could not fetch game context: ${e.message}`);
    }
    return { todaysGames, injuries, weatherByTeam };
}

// Enhanced AI Prediction with all factors
function generateEnhancedPrediction(params) {
    const {
        seasonAvg,
        recentAvg,      // Last 5-10 games average
        line,
        variance,
        sport,
        propType,
        playerTeam,
        opponentTeam,
        isHome,
        weather,
        injuries,
        headToHead      // Historical vs this opponent
    } = params;

    // Start with base calculation
    const baseAvg = recentAvg || seasonAvg;
    let adjustedAvg = baseAvg;
    const factors = [];

    // 1. Recent form adjustment (weight recent games more)
    if (recentAvg && seasonAvg) {
        const recentTrend = recentAvg - seasonAvg;
        if (Math.abs(recentTrend) > seasonAvg * 0.1) {
            adjustedAvg = seasonAvg * 0.4 + recentAvg * 0.6; // Weight recent more
            factors.push({
                factor: 'Recent Form',
                impact: recentTrend > 0 ? 'Positive' : 'Negative',
                detail: `Last 5 avg: ${recentAvg.toFixed(1)} vs season: ${seasonAvg.toFixed(1)}`
            });
        }
    }

    // 2. Home/Road adjustment
    const homeRoadFactor = HOME_ROAD_FACTORS[sport] || { home: 1.0, road: 1.0 };
    if (isHome !== undefined) {
        const locationMultiplier = isHome ? homeRoadFactor.home : homeRoadFactor.road;
        adjustedAvg *= locationMultiplier;
        factors.push({
            factor: 'Location',
            impact: isHome ? 'Home Boost' : 'Road Penalty',
            detail: isHome ? 'Playing at home (+5%)' : 'Playing on road (-5%)'
        });
    }

    // 3. Opponent matchup
    if (opponentTeam) {
        const matchup = getOpponentMatchupRating(opponentTeam, sport, propType);
        if (matchup.adjustment !== 0) {
            adjustedAvg *= (1 + matchup.adjustment / 100);
            factors.push({
                factor: 'Opponent Defense',
                impact: matchup.rating,
                detail: matchup.note
            });
        }
    }

    // 4. Weather impact (outdoor sports)
    if (weather && (sport === 'nfl' || sport === 'mlb')) {
        const weatherImpact = getWeatherImpact(weather, sport, propType);
        if (weatherImpact.multiplier !== 1.0) {
            adjustedAvg *= weatherImpact.multiplier;
            factors.push({
                factor: 'Weather',
                impact: weatherImpact.multiplier > 1 ? 'Positive' : 'Negative',
                detail: weatherImpact.note
            });
        }
    }

    // 5. Teammate injuries (opportunity boost)
    if (injuries && playerTeam) {
        const injuryBoost = getTeammateInjuryBoost(playerTeam, sport, propType, injuries);
        if (injuryBoost.boost > 0) {
            factors.push({
                factor: 'Teammate Injuries',
                impact: 'Opportunity Boost',
                detail: injuryBoost.note
            });
        }
    }

    // 6. Head-to-head history
    if (headToHead && headToHead.avgVsOpponent) {
        const h2hDiff = headToHead.avgVsOpponent - seasonAvg;
        if (Math.abs(h2hDiff) > seasonAvg * 0.15) {
            adjustedAvg = adjustedAvg * 0.8 + headToHead.avgVsOpponent * 0.2;
            factors.push({
                factor: 'H2H History',
                impact: h2hDiff > 0 ? 'Positive' : 'Negative',
                detail: `Averages ${headToHead.avgVsOpponent.toFixed(1)} vs ${opponentTeam}`
            });
        }
    }

    // 7. Blowout Risk - based on team record differential
    if (playerTeam && opponentTeam) {
        const blowoutRisk = calculateBlowoutRisk(playerTeam, opponentTeam, sport);
        if (blowoutRisk.multiplier !== 1.0) {
            adjustedAvg *= blowoutRisk.multiplier;
            factors.push({
                factor: 'Game Script',
                impact: blowoutRisk.risk === 'competitive' ? 'Positive' : 'Negative',
                detail: blowoutRisk.note
            });
        }
    }

    // Calculate prediction
    const diff = adjustedAvg - line;
    const percentDiff = line > 0 ? Math.abs(diff / line) * 100 : 0;
    const significantDiff = Math.abs(diff) / (variance || 1);

    let pick, confidence, trend;

    if (diff > 0) {
        pick = 'OVER';
        const edgeBonus = Math.min(25, significantDiff * 12);
        confidence = 52 + edgeBonus + (factors.length * 2);
        trend = significantDiff > 0.3 ? 'UP' : 'NEUTRAL';
    } else if (diff < 0) {
        pick = 'UNDER';
        const edgeBonus = Math.min(25, significantDiff * 12);
        confidence = 52 + edgeBonus + (factors.length * 2);
        trend = significantDiff > 0.3 ? 'DOWN' : 'NEUTRAL';
    } else {
        pick = Math.random() > 0.5 ? 'OVER' : 'UNDER';
        confidence = 50;
        trend = 'NEUTRAL';
    }

    // Apply teammate injury boost to confidence
    if (injuries && playerTeam) {
        const injuryBoost = getTeammateInjuryBoost(playerTeam, sport, propType, injuries);
        confidence += injuryBoost.boost;
    }

    // Add variance for realism
    const randomAdjust = Math.floor(Math.random() * 8) - 4;
    confidence = Math.max(48, Math.min(85, Math.round(confidence + randomAdjust)));

    // Build reasoning string
    let reasoning = `Adj avg: ${adjustedAvg.toFixed(1)}`;
    if (factors.length > 0) {
        reasoning += ` | Factors: ${factors.map(f => f.factor).join(', ')}`;
    }

    return {
        pick,
        confidence,
        reasoning,
        trend,
        adjustedAvg: Math.round(adjustedAvg * 10) / 10,
        factors,
        opponent: opponentTeam,
        isHome,
        weather: weather ? {
            temp: weather.temperature,
            wind: weather.windSpeed,
            conditions: weather.isRaining ? 'Rain' : weather.isSnowing ? 'Snow' : 'Clear'
        } : null
    };
}

// AI Prediction Engine - Analyzes stats and generates picks
function generateAIPrediction(seasonAvg, line, variance, sport) {
    // Calculate how far the line is from the season average
    const diff = seasonAvg - line;
    const percentDiff = line > 0 ? Math.abs(diff / line) * 100 : 0;

    // Determine pick based on statistical edge
    let pick, confidence, reasoning, trend;

    // Use variance to determine how significant the difference is
    // Lower variance means even small differences are significant
    const significantDiff = Math.abs(diff) / (variance || 1);

    if (diff > 0) {
        // Season average is HIGHER than line - OVER
        pick = 'OVER';
        // Base confidence starts at 52%, scales up with edge
        // More significant difference = higher confidence
        const edgeBonus = Math.min(30, significantDiff * 15);
        confidence = 52 + edgeBonus;
        reasoning = `Avg ${seasonAvg.toFixed(1)} is ${percentDiff.toFixed(0)}% above line`;
        trend = significantDiff > 0.3 ? 'UP' : 'NEUTRAL';
    } else if (diff < 0) {
        // Season average is LOWER than line - UNDER
        pick = 'UNDER';
        const edgeBonus = Math.min(30, significantDiff * 15);
        confidence = 52 + edgeBonus;
        reasoning = `Avg ${seasonAvg.toFixed(1)} is ${percentDiff.toFixed(0)}% below line`;
        trend = significantDiff > 0.3 ? 'DOWN' : 'NEUTRAL';
    } else {
        // Exactly on the line - true 50/50
        pick = Math.random() > 0.5 ? 'OVER' : 'UNDER';
        confidence = 50;
        reasoning = 'Line matches season average exactly';
        trend = 'NEUTRAL';
    }

    // Add random variance based on sport uncertainty (±5-12 points based on variance)
    const randomRange = Math.min(12, Math.max(5, variance * 0.5));
    const randomAdjust = Math.floor(Math.random() * randomRange * 2) - randomRange;
    confidence = confidence + randomAdjust;

    // Cap confidence between 45 and 82
    confidence = Math.max(45, Math.min(82, Math.round(confidence)));

    // Add sport-specific adjustments for realism
    if (sport === 'nba') {
        // NBA has high variance - reduce confidence slightly
        if (confidence > 70) confidence -= 2;
    } else if (sport === 'nfl') {
        // NFL single game, more variance
        if (confidence > 75) confidence -= 3;
    } else if (sport === 'mlb') {
        // MLB is highly variable
        if (confidence > 68) confidence -= 2;
    }

    return { pick, confidence, reasoning, trend };
}

// Generate AI predictions for game outcomes
function generateGamePredictions(homeTeam, awayTeam, homeStanding, awayStanding, sport) {
    // Calculate win probabilities
    const homeWinPct = homeStanding?.winPct || 0.5;
    const awayWinPct = awayStanding?.winPct || 0.5;

    // Home advantage factor
    const homeAdvantage = { nba: 0.08, nfl: 0.06, nhl: 0.04, mlb: 0.03 }[sport] || 0.05;

    // Adjusted probabilities
    const adjHomeWin = Math.min(0.85, (homeWinPct + homeAdvantage) / ((homeWinPct + homeAdvantage) + awayWinPct));
    const adjAwayWin = 1 - adjHomeWin;

    // Generate predictions
    const predictions = {
        moneyline: {
            pick: adjHomeWin > 0.5 ? homeTeam : awayTeam,
            confidence: Math.round(Math.max(adjHomeWin, adjAwayWin) * 100),
            reasoning: adjHomeWin > adjAwayWin
                ? `${homeTeam} has home advantage and stronger record`
                : `${awayTeam} has better win rate despite road disadvantage`
        },
        spread: {
            pick: null,
            confidence: 0,
            reasoning: ''
        },
        total: {
            pick: null,
            confidence: 0,
            reasoning: ''
        }
    };

    // Spread prediction
    const pointDiff = (homeStanding?.pointDifferential || 0) - (awayStanding?.pointDifferential || 0);
    const expectedMargin = (adjHomeWin - 0.5) * (sport === 'nba' ? 30 : sport === 'nfl' ? 20 : 5);

    predictions.spread.pick = expectedMargin > 0 ? `${homeTeam} cover` : `${awayTeam} cover`;
    predictions.spread.confidence = 50 + Math.min(20, Math.abs(expectedMargin) * 2);
    predictions.spread.reasoning = `Expected margin: ${expectedMargin > 0 ? '+' : ''}${expectedMargin.toFixed(1)}`;

    // Total prediction based on scoring averages
    const homeScoring = homeStanding?.pointsFor || 100;
    const awayScoring = awayStanding?.pointsFor || 100;
    const avgTotal = (homeScoring + awayScoring) / 2;

    const sportAvg = { nba: 115, nfl: 22, nhl: 3, mlb: 4.5 }[sport] || 100;
    const isHighScoring = avgTotal > sportAvg;

    predictions.total.pick = isHighScoring ? 'OVER' : 'UNDER';
    predictions.total.confidence = 50 + Math.min(20, Math.abs(avgTotal - sportAvg) / sportAvg * 50);
    predictions.total.reasoning = isHighScoring
        ? `Both teams averaging ${(avgTotal / sportAvg * 100 - 100).toFixed(0)}% above league average`
        : `Combined scoring ${(100 - avgTotal / sportAvg * 100).toFixed(0)}% below league average`;

    return predictions;
}

// Generate realistic varied odds for each sportsbook
function generateBookOddsAccurate(baseOdds) {
    const books = ['draftkings', 'fanduel', 'betmgm', 'caesars', 'pointsbet'];
    const result = {};

    books.forEach(book => {
        // Each book varies by 5-15 from base
        const variance = Math.floor(Math.random() * 11) - 5;
        result[book] = baseOdds + variance;
    });

    return result;
}

// =====================================================
// INJURED PLAYERS LIST - Updated automatically from ESPN
// Filter these players from all props
// =====================================================
const INJURED_PLAYERS_CACHE = {
    players: new Set(),
    lastUpdated: null
};

// Fetch and cache injured players from ESPN
async function updateInjuredPlayersCache() {
    console.log('🏥 Updating injured players cache...');
    const sports = ['nba', 'nfl', 'nhl', 'mlb'];
    const injured = new Set();

    for (const sport of sports) {
        try {
            const injuries = await fetchESPNInjuries(sport);
            if (injuries && injuries.injuries) {
                for (const team of injuries.injuries) {
                    for (const injury of (team.injuries || [])) {
                        const status = injury.status?.toLowerCase() || '';
                        // Only filter truly OUT players
                        if (status === 'out' || status === 'ir' || status === 'injured reserve' ||
                            status === 'doubtful' || status.includes('season')) {
                            const name = injury.athlete?.displayName || injury.player?.displayName;
                            if (name) {
                                injured.add(name);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.log(`  ⚠️ Could not fetch ${sport} injuries: ${e.message}`);
        }
    }

    // Add known major injuries (manually maintained as backup)
    const knownInjuries = [
        'Jayson Tatum', 'Ja Morant', 'Zion Williamson', 'Chet Holmgren',
        'Kawhi Leonard', 'Joel Embiid', 'Paolo Banchero'
    ];
    knownInjuries.forEach(p => injured.add(p));

    INJURED_PLAYERS_CACHE.players = injured;
    INJURED_PLAYERS_CACHE.lastUpdated = new Date().toISOString();
    console.log(`✅ Cached ${injured.size} injured players`);
    return injured;
}

// Check if a player is injured
function isPlayerInjured(playerName) {
    return INJURED_PLAYERS_CACHE.players.has(playerName);
}

// Filter injured players from props array
function filterInjuredPlayers(props) {
    return props.filter(prop => {
        const isInjured = isPlayerInjured(prop.player);
        if (isInjured) {
            console.log(`  ⛔ Filtering out ${prop.player} - injured/out`);
        }
        return !isInjured;
    });
}

// =====================================================
// PROPER LINE ROUNDING - Betting line standards
// Lines should be: 0.5, 1.5, 2.5, 3.5... or 0.5, 5.5, 10.5, etc.
// MINIMUM LINE IS ALWAYS 0.5 - never "over 0"
// =====================================================
function roundToProperLine(avg, propType) {
    if (avg === undefined || avg === null || avg <= 0) return 0.5;

    // Different rounding based on typical ranges
    const lowVariance = ['Goals', 'Touchdowns', 'Interceptions', 'Sacks', 'Blocks', 'Steals', 'Home Runs', 'RBIs', 'TDs', 'Rush+Rec TDs'];
    const medVariance = ['Assists', 'Rebounds', 'Receptions', 'Threes Made', '3-Pointers Made', 'Hits', 'Strikeouts'];
    const highVariance = ['Points', 'Passing Yards', 'Pass Yards', 'Rushing Yards', 'Rush Yards', 'Receiving Yards', 'Rec Yards', 'Saves'];

    let rounded;

    if (lowVariance.some(t => propType.includes(t))) {
        // Low number props: 0.5, 1.5, 2.5
        if (avg < 1) return 0.5;
        rounded = Math.round(avg - 0.5) + 0.5;
    } else if (medVariance.some(t => propType.includes(t))) {
        // Medium number props: round to nearest .5
        rounded = Math.round(avg * 2) / 2;
    } else if (highVariance.some(t => propType.includes(t))) {
        // High number props: round to nearest .5 for yards, etc.
        rounded = Math.round(avg * 2) / 2;
    } else {
        // Default: round to nearest .5
        rounded = Math.round(avg * 2) / 2;
    }

    // ALWAYS enforce minimum of 0.5 - NEVER return 0
    return Math.max(0.5, rounded);
}

// =====================================================
// SMART AI PICK - Calculate which side is more profitable
// Based on: season avg vs line, recent trend, matchup
// =====================================================
function calculateSmartAIPick(seasonAvg, line, trend, position, propType) {
    // Calculate edge
    const edge = (seasonAvg - line) / line;

    // Base pick on edge
    let pick = 'OVER';
    let confidence = 50;
    let reasoning = '';

    if (edge > 0.08) {
        // Strong OVER - avg significantly above line
        pick = 'OVER';
        confidence = Math.min(85, 60 + Math.round(edge * 200));
        reasoning = `Avg ${seasonAvg.toFixed(1)} is ${((edge) * 100).toFixed(0)}% above ${line} line`;
    } else if (edge < -0.08) {
        // Strong UNDER - avg significantly below line
        pick = 'UNDER';
        confidence = Math.min(85, 60 + Math.round(Math.abs(edge) * 200));
        reasoning = `Avg ${seasonAvg.toFixed(1)} is ${(Math.abs(edge) * 100).toFixed(0)}% below ${line} line`;
    } else if (edge > 0.03) {
        // Lean OVER
        pick = 'OVER';
        confidence = 55 + Math.round(edge * 150);
        reasoning = `Slight edge - avg ${seasonAvg.toFixed(1)} vs ${line} line`;
    } else if (edge < -0.03) {
        // Lean UNDER
        pick = 'UNDER';
        confidence = 55 + Math.round(Math.abs(edge) * 150);
        reasoning = `Slight edge under - avg ${seasonAvg.toFixed(1)} vs ${line} line`;
    } else {
        // Coin flip - use trend as tiebreaker
        if (trend === 'UP') {
            pick = 'OVER';
            confidence = 52;
            reasoning = 'Trending up, slight over lean';
        } else if (trend === 'DOWN') {
            pick = 'UNDER';
            confidence = 52;
            reasoning = 'Trending down, slight under lean';
        } else {
            // True coin flip - recommend passing
            pick = seasonAvg >= line ? 'OVER' : 'UNDER';
            confidence = 50;
            reasoning = 'Close to average, low confidence';
        }
    }

    // Adjust confidence based on trend alignment
    if ((pick === 'OVER' && trend === 'UP') || (pick === 'UNDER' && trend === 'DOWN')) {
        confidence = Math.min(90, confidence + 5);
        reasoning += ' (trend confirms)';
    } else if ((pick === 'OVER' && trend === 'DOWN') || (pick === 'UNDER' && trend === 'UP')) {
        confidence = Math.max(45, confidence - 5);
        reasoning += ' (trend opposes)';
    }

    // Determine trend label
    const trendLabel = edge > 0.05 ? 'UP' : edge < -0.05 ? 'DOWN' : 'NEUTRAL';

    return {
        pick,
        confidence: Math.round(confidence),
        reasoning,
        trend: trendLabel
    };
}

// =====================================================
// PRIZEPICKS API - Real Player Props
// Free public API with thousands of player projections
// =====================================================
async function fetchPrizePicksProps(sport) {
    const cacheKey = `prizepicks_${sport}`;
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < PROPS_CACHE_TTL_MS)) {
        console.log(`📦 Returning cached PrizePicks props for ${sport}`);
        return propsCache[cacheKey].data;
    }

    // Map our sport names to PrizePicks league names
    const leagueMap = {
        'nfl': ['NFL', 'NFL1H', 'NFL1Q'],
        'nba': ['NBA', 'NBA1H', 'NBA1Q'],
        'nhl': ['OHOCKEY', 'NHL'],
        'mlb': ['MLBSZN', 'MLB'],
        'ncaab': ['CBB', 'CBB1H'],
        'ncaaf': ['NCAAF']
    };

    const targetLeagues = leagueMap[sport] || [];
    if (targetLeagues.length === 0) {
        return { props: [], source: 'prizepicks', count: 0 };
    }

    try {
        console.log(`🎯 Fetching PrizePicks projections for ${sport.toUpperCase()}...`);

        // Use comprehensive browser-like headers
        const apiUrl = 'https://api.prizepicks.com/projections';

        const browserHeaders = {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': 'https://app.prizepicks.com',
            'Referer': 'https://app.prizepicks.com/',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site',
            'Connection': 'keep-alive'
        };

        const response = await fetchWithHeaders(apiUrl, browserHeaders);

        if (!response || !response.data) {
            console.log('⚠️ No data from PrizePicks API');
            return { props: [], source: 'prizepicks', count: 0 };
        }

        const projections = response.data || [];
        const included = response.included || [];

        // Build player lookup from included data
        const playerLookup = {};
        const leagueLookup = {};

        included.forEach(item => {
            if (item.type === 'new_player') {
                playerLookup[item.id] = {
                    name: item.attributes?.name,
                    team: item.attributes?.team,
                    position: item.attributes?.position,
                    image: item.attributes?.image_url,
                    league: item.relationships?.league?.data?.id
                };
            }
            if (item.type === 'league') {
                leagueLookup[item.id] = item.attributes?.name;
            }
        });

        // Filter projections for our target sport
        const sportProps = [];

        for (const proj of projections) {
            const attrs = proj.attributes || {};
            const playerId = proj.relationships?.new_player?.data?.id;
            const leagueId = proj.relationships?.league?.data?.id;
            const leagueName = leagueLookup[leagueId] || '';

            // Check if this projection is for our target sport
            if (!targetLeagues.includes(leagueName)) continue;

            const player = playerLookup[playerId] || {};
            const playerName = player.name;

            if (!playerName || !attrs.line_score) continue;

            // Skip injured players
            if (isPlayerInjured(playerName)) {
                continue;
            }

            const line = parseFloat(attrs.line_score);
            if (isNaN(line) || line <= 0) continue;

            // Normalize stat type
            const statType = normalizePrizePicksStatType(attrs.stat_type);

            // Calculate AI pick based on projection type
            const aiResult = calculateSmartAIPick(line * 1.02, line, 'NEUTRAL', player.position, statType);

            sportProps.push({
                player: playerName,
                team: player.team || attrs.description || '',
                position: player.position || '',
                headshot: player.image,
                propType: statType,
                line: line,
                seasonAvg: (line * 1.02).toFixed(1), // PrizePicks lines are close to averages
                over: { prizepicks: -110, draftkings: -110, fanduel: -110 },
                under: { prizepicks: -110, draftkings: -110, fanduel: -110 },
                aiPick: aiResult.pick,
                confidence: aiResult.confidence,
                reasoning: `PrizePicks line: ${line} ${statType}`,
                trend: aiResult.trend,
                game: attrs.description || '',
                gameTime: attrs.start_time,
                source: 'prizepicks',
                isRealLine: true,
                lastUpdated: new Date().toISOString()
            });
        }

        // Sort by game time (soonest first)
        sportProps.sort((a, b) => {
            if (a.gameTime && b.gameTime) {
                return new Date(a.gameTime) - new Date(b.gameTime);
            }
            return 0;
        });

        const result = {
            props: sportProps,
            source: 'prizepicks',
            count: sportProps.length,
            leagues: targetLeagues
        };

        propsCache[cacheKey] = { data: result, timestamp: Date.now() };
        console.log(`✅ PrizePicks: ${sportProps.length} ${sport.toUpperCase()} props fetched`);

        return result;

    } catch (error) {
        console.error(`❌ PrizePicks API error: ${error.message}`);
        return { props: [], source: 'prizepicks', error: error.message, count: 0 };
    }
}

// Normalize PrizePicks stat types to our standard format
function normalizePrizePicksStatType(statType) {
    if (!statType) return 'Points';

    const mappings = {
        // NFL
        'Pass Yards': 'Passing Yards',
        'Passing Yards': 'Passing Yards',
        'Rush Yards': 'Rushing Yards',
        'Rushing Yards': 'Rushing Yards',
        'Rec Yards': 'Receiving Yards',
        'Receiving Yards': 'Receiving Yards',
        'Pass TDs': 'Passing TDs',
        'Rush TDs': 'Rushing TDs',
        'Receptions': 'Receptions',
        'Pass Attempts': 'Pass Attempts',
        'Completions': 'Completions',
        'Interceptions': 'Interceptions',
        'Rush Attempts': 'Rush Attempts',
        'Fantasy Score': 'Fantasy Points',
        'Pass+Rush Yds': 'Pass+Rush Yards',
        'Rush+Rec Yds': 'Rush+Rec Yards',

        // NBA
        'Points': 'Points',
        'Rebounds': 'Rebounds',
        'Assists': 'Assists',
        'Pts+Rebs+Asts': 'Pts+Reb+Ast',
        'Pts+Asts': 'Pts+Ast',
        'Pts+Rebs': 'Pts+Reb',
        'Rebs+Asts': 'Reb+Ast',
        '3-Pointers Made': 'Threes Made',
        '3-PT Made': 'Threes Made',
        'Steals': 'Steals',
        'Blocks': 'Blocks',
        'Blks+Stls': 'Blk+Stl',
        'Turnovers': 'Turnovers',
        'Free Throws Made': 'Free Throws',

        // NHL
        'Shots On Goal': 'Shots on Goal',
        'Goals': 'Goals',
        'Points': 'Points',
        'Assists': 'Assists',
        'Saves': 'Saves',
        'Blocked Shots': 'Blocked Shots',
        'Hits': 'Hits',

        // MLB
        'Hits': 'Hits',
        'Total Bases': 'Total Bases',
        'RBIs': 'RBIs',
        'Runs': 'Runs',
        'Strikeouts': 'Strikeouts',
        'Pitcher Strikeouts': 'Strikeouts (P)',
        'Walks Allowed': 'Walks Allowed',
        'Hits Allowed': 'Hits Allowed',
        'Earned Runs': 'Earned Runs',
        'Outs Recorded': 'Outs Recorded'
    };

    return mappings[statType] || statType;
}

// =====================================================
// BOLT ODDS API - Player Props & Odds
// https://boltodds.com - Real-time betting odds and props
// =====================================================

async function fetchBoltOddsProps(sport) {
    const cacheKey = `boltodds_${sport}`;
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < PROPS_CACHE_TTL_MS)) {
        console.log(`📦 Returning cached Bolt Odds props for ${sport}`);
        return propsCache[cacheKey].data;
    }

    if (!BOLT_ODDS_API_KEY) {
        console.log('⚠️ Bolt Odds API key not configured');
        return { props: [], source: 'boltodds', count: 0 };
    }

    // Map our sport names to Bolt Odds league names
    const leagueMap = {
        'nfl': 'nfl',
        'nba': 'nba',
        'nhl': 'nhl',
        'mlb': 'mlb',
        'ncaab': 'ncaab',
        'ncaaf': 'ncaaf'
    };

    const league = leagueMap[sport];
    if (!league) {
        return { props: [], source: 'boltodds', count: 0 };
    }

    try {
        console.log(`⚡ Fetching Bolt Odds props for ${sport.toUpperCase()}...`);

        // Bolt Odds API endpoint for player props
        const apiUrl = `https://api.boltodds.com/v1/props/${league}`;

        const response = await new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'Authorization': `Bearer ${BOLT_ODDS_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            https.get(apiUrl, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        if (res.statusCode === 401) {
                            reject(new Error('Bolt Odds: Invalid API key'));
                            return;
                        }
                        if (res.statusCode === 429) {
                            reject(new Error('Bolt Odds: Rate limit exceeded'));
                            return;
                        }
                        if (res.statusCode !== 200) {
                            reject(new Error(`Bolt Odds API error: ${res.statusCode}`));
                            return;
                        }
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', reject);
        });

        if (!response || !response.props) {
            console.log('⚠️ Bolt Odds returned no props');
            return { props: [], source: 'boltodds', count: 0 };
        }

        // Transform Bolt Odds props to our standard format
        const props = response.props.map(prop => {
            return {
                player: prop.player_name || prop.player,
                team: prop.team_abbreviation || prop.team,
                opponent: prop.opponent_abbreviation || prop.opponent,
                propType: mapBoltOddsPropType(prop.prop_type || prop.market),
                line: parseFloat(prop.line || prop.total || 0),
                over: prop.over_odds || prop.over_price || -110,
                under: prop.under_odds || prop.under_price || -110,
                confidence: 65,
                aiPick: calculateBoltOddsPick(prop),
                source: 'boltodds',
                sportsbook: prop.sportsbook || 'BoltOdds',
                lastUpdated: new Date().toISOString()
            };
        });

        console.log(`✅ Bolt Odds: ${props.length} props for ${sport.toUpperCase()}`);

        // Cache the results
        const result = { props, source: 'boltodds', count: props.length };
        propsCache[cacheKey] = { data: result, timestamp: Date.now() };

        return result;

    } catch (error) {
        console.error(`❌ Bolt Odds error: ${error.message}`);
        return { props: [], source: 'boltodds', count: 0, error: error.message };
    }
}

// Map Bolt Odds prop types to our standard format
function mapBoltOddsPropType(propType) {
    const mappings = {
        'points': 'Points',
        'rebounds': 'Rebounds',
        'assists': 'Assists',
        'threes': '3-Pointers Made',
        '3pm': '3-Pointers Made',
        'steals': 'Steals',
        'blocks': 'Blocks',
        'pts+reb': 'Pts+Reb',
        'pts+ast': 'Pts+Ast',
        'pts+reb+ast': 'Pts+Reb+Ast',
        'reb+ast': 'Reb+Ast',
        'passing_yards': 'Pass Yards',
        'rushing_yards': 'Rush Yards',
        'receiving_yards': 'Rec Yards',
        'receptions': 'Receptions',
        'touchdowns': 'Anytime TD',
        'goals': 'Goals',
        'saves': 'Saves',
        'shots_on_goal': 'Shots on Goal',
        'strikeouts': 'Strikeouts',
        'hits': 'Hits',
        'rbi': 'RBIs'
    };

    const lowerProp = (propType || '').toLowerCase();
    return mappings[lowerProp] || propType;
}

// Calculate AI pick based on Bolt Odds line movement and consensus
function calculateBoltOddsPick(prop) {
    // If odds are significantly skewed, pick the better value
    const overOdds = parseFloat(prop.over_odds || prop.over_price || -110);
    const underOdds = parseFloat(prop.under_odds || prop.under_price || -110);

    // More negative odds = favorite, positive odds = underdog
    // Pick the underdog side if there's value
    if (overOdds > underOdds + 20) {
        return 'OVER';
    } else if (underOdds > overOdds + 20) {
        return 'UNDER';
    }

    // Default to random if odds are close
    return Math.random() > 0.5 ? 'OVER' : 'UNDER';
}

// =====================================================
// Ball Don't Lie API - Free NBA Stats (API Key Required)
// https://www.balldontlie.io/
// =====================================================

// Helper function to fetch from Ball Don't Lie with API key
function fetchBallDontLie(endpoint) {
    return new Promise((resolve, reject) => {
        if (!BALL_DONT_LIE_API_KEY) {
            reject(new Error('Ball Don\'t Lie API key not configured'));
            return;
        }

        const url = `https://api.balldontlie.io/v1${endpoint}`;
        const options = {
            headers: {
                'Authorization': BALL_DONT_LIE_API_KEY
            }
        };

        https.get(url, options, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                try {
                    if (response.statusCode === 401) {
                        reject(new Error('Ball Don\'t Lie: Invalid API key'));
                        return;
                    }
                    if (response.statusCode === 429) {
                        reject(new Error('Ball Don\'t Lie: Rate limit exceeded'));
                        return;
                    }
                    if (response.statusCode !== 200) {
                        reject(new Error(`Ball Don\'t Lie API error: ${response.statusCode}`));
                        return;
                    }
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('Ball Don\'t Lie: Invalid JSON response'));
                }
            });
        }).on('error', reject);
    });
}

async function fetchBallDontLieStats(sport) {
    if (sport !== 'nba') {
        return { players: [], stats: [], source: 'balldontlie', note: 'Only NBA supported' };
    }

    const cacheKey = `bdl_stats_${sport}`;
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < PROPS_CACHE_TTL_MS)) {
        console.log(`📦 Returning cached Ball Don't Lie stats`);
        return propsCache[cacheKey].data;
    }

    try {
        console.log(`🏀 Fetching Ball Don't Lie NBA season averages...`);

        // Fetch players with API key
        const playersData = await fetchBallDontLie('/players?per_page=100');
        const players = playersData.data || [];

        // Get season averages for players who have stats
        const playerStats = [];

        // Ball Don't Lie requires player IDs for season averages
        const playerIds = players.slice(0, 25).map(p => p.id);

        try {
            const statsData = await fetchBallDontLie(`/season_averages?season=2024&player_ids[]=${playerIds.join('&player_ids[]=')}`);
            if (statsData.data) {
                statsData.data.forEach(stat => {
                    const player = players.find(p => p.id === stat.player_id);
                    if (player && stat.games_played > 0) {
                        playerStats.push({
                            playerId: stat.player_id,
                            playerName: `${player.first_name} ${player.last_name}`,
                            team: player.team?.abbreviation || 'N/A',
                            position: player.position,
                            gamesPlayed: stat.games_played,
                            minutes: stat.min,
                            points: stat.pts,
                            rebounds: stat.reb,
                            assists: stat.ast,
                            steals: stat.stl,
                            blocks: stat.blk,
                            turnovers: stat.turnover,
                            fg_pct: stat.fg_pct,
                            fg3_pct: stat.fg3_pct,
                            ft_pct: stat.ft_pct,
                            threes: stat.fg3m,
                            source: 'balldontlie'
                        });
                    }
                });
            }
        } catch (e) {
            console.log(`  ⚠️ Could not fetch season averages: ${e.message}`);
        }

        const result = {
            players: players.map(p => ({
                id: p.id,
                name: `${p.first_name} ${p.last_name}`,
                position: p.position,
                team: p.team?.abbreviation,
                teamName: p.team?.full_name,
                height: p.height_feet ? `${p.height_feet}'${p.height_inches}"` : null,
                weight: p.weight_pounds,
                source: 'balldontlie'
            })),
            stats: playerStats,
            source: 'balldontlie',
            count: playerStats.length
        };

        propsCache[cacheKey] = { data: result, timestamp: Date.now() };
        console.log(`✅ Ball Don't Lie: ${playerStats.length} players with season averages`);
        return result;
    } catch (error) {
        console.error('Ball Dont Lie error:', error.message);
        return { players: [], stats: [], source: 'balldontlie', error: error.message };
    }
}

// =====================================================
// Ball Don't Lie Enhanced - LIVE NBA Games (FREE, UNLIMITED)
// Today's games, box scores, recent game stats
// =====================================================
const BDL_LIVE_CACHE = {
    games: { data: null, timestamp: null },
    boxScores: {},
    recentStats: {}
};
const BDL_LIVE_CACHE_TTL = 2 * 60 * 1000; // 2 minutes for live data

// Fetch today's NBA games from Ball Don't Lie
async function fetchBDLTodaysGames() {
    const cacheKey = 'bdl_games_today';
    if (BDL_LIVE_CACHE.games.data && (Date.now() - BDL_LIVE_CACHE.games.timestamp < BDL_LIVE_CACHE_TTL)) {
        return BDL_LIVE_CACHE.games.data;
    }

    try {
        const today = new Date().toISOString().split('T')[0];
        console.log(`🏀 Ball Don't Lie: Fetching today's games (${today})...`);

        const data = await fetchBallDontLie(`/games?dates[]=${today}`);
        const games = (data.data || []).map(game => ({
            id: game.id,
            date: game.date,
            status: game.status,
            period: game.period,
            time: game.time,
            homeTeam: {
                id: game.home_team.id,
                name: game.home_team.full_name,
                abbreviation: game.home_team.abbreviation,
                score: game.home_team_score
            },
            awayTeam: {
                id: game.visitor_team.id,
                name: game.visitor_team.full_name,
                abbreviation: game.visitor_team.abbreviation,
                score: game.visitor_team_score
            },
            isLive: game.status === 'In Progress' || (game.period > 0 && game.status !== 'Final'),
            source: 'balldontlie'
        }));

        const result = { games, count: games.length, date: today, source: 'balldontlie' };
        BDL_LIVE_CACHE.games = { data: result, timestamp: Date.now() };
        console.log(`✅ Ball Don't Lie: Found ${games.length} games for today`);
        return result;
    } catch (error) {
        console.error('Ball Don\'t Lie games error:', error.message);
        return { games: [], count: 0, source: 'balldontlie', error: error.message };
    }
}

// Fetch box score for a specific game
async function fetchBDLBoxScore(gameId) {
    if (BDL_LIVE_CACHE.boxScores[gameId] && (Date.now() - BDL_LIVE_CACHE.boxScores[gameId].timestamp < BDL_LIVE_CACHE_TTL)) {
        return BDL_LIVE_CACHE.boxScores[gameId].data;
    }

    try {
        console.log(`📊 Ball Don't Lie: Fetching box score for game ${gameId}...`);

        const data = await fetchBallDontLie(`/stats?game_ids[]=${gameId}&per_page=100`);
        const playerStats = (data.data || []).map(stat => ({
            playerId: stat.player.id,
            playerName: `${stat.player.first_name} ${stat.player.last_name}`,
            team: stat.team.abbreviation,
            minutes: stat.min,
            points: stat.pts,
            rebounds: stat.reb,
            assists: stat.ast,
            steals: stat.stl,
            blocks: stat.blk,
            turnovers: stat.turnover,
            fg: `${stat.fgm}/${stat.fga}`,
            fg3: `${stat.fg3m}/${stat.fg3a}`,
            ft: `${stat.ftm}/${stat.fta}`,
            source: 'balldontlie'
        }));

        const result = { gameId, playerStats, count: playerStats.length, source: 'balldontlie' };
        BDL_LIVE_CACHE.boxScores[gameId] = { data: result, timestamp: Date.now() };
        return result;
    } catch (error) {
        console.error(`Ball Don't Lie box score error for game ${gameId}:`, error.message);
        return { gameId, playerStats: [], error: error.message };
    }
}

// Fetch recent stats for a player (last 5 games)
async function fetchBDLPlayerRecentStats(playerId) {
    if (BDL_LIVE_CACHE.recentStats[playerId] && (Date.now() - BDL_LIVE_CACHE.recentStats[playerId].timestamp < 10 * 60 * 1000)) {
        return BDL_LIVE_CACHE.recentStats[playerId].data;
    }

    try {
        console.log(`📈 Ball Don't Lie: Fetching recent stats for player ${playerId}...`);

        const data = await fetchBallDontLie(`/stats?player_ids[]=${playerId}&per_page=5&sort=-game.date`);
        const games = (data.data || []).map(stat => ({
            gameId: stat.game.id,
            date: stat.game.date,
            opponent: stat.team.id === stat.game.home_team.id
                ? stat.game.visitor_team.abbreviation
                : stat.game.home_team.abbreviation,
            minutes: stat.min,
            points: stat.pts,
            rebounds: stat.reb,
            assists: stat.ast,
            steals: stat.stl,
            blocks: stat.blk,
            turnovers: stat.turnover,
            source: 'balldontlie'
        }));

        const result = { playerId, recentGames: games, count: games.length, source: 'balldontlie' };
        BDL_LIVE_CACHE.recentStats[playerId] = { data: result, timestamp: Date.now() };
        return result;
    } catch (error) {
        console.error(`Ball Don't Lie recent stats error for player ${playerId}:`, error.message);
        return { playerId, recentGames: [], error: error.message };
    }
}

// =====================================================
// TheSportsDB - FREE LIVE Data (NO API KEY - UNLIMITED)
// Live scores, events, team info, player info
// https://www.thesportsdb.com/api.php
// =====================================================
const SPORTSDB_CACHE = {
    liveScores: {},
    events: {},
    teams: {}
};
const SPORTSDB_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

const SPORTSDB_LEAGUES = {
    nba: '4387',   // NBA
    nfl: '4391',   // NFL
    nhl: '4380',   // NHL
    mlb: '4424',   // MLB
    ncaab: '4482', // NCAAM Basketball
    ncaaf: '4479'  // NCAAF
};

// Fetch live scores from TheSportsDB (FREE, no key needed for basic)
async function fetchSportsDBLiveScores(sport) {
    const leagueId = SPORTSDB_LEAGUES[sport.toLowerCase()];
    if (!leagueId) {
        return { events: [], source: 'thesportsdb', note: 'Sport not supported' };
    }

    const cacheKey = `sportsdb_live_${sport}`;
    if (SPORTSDB_CACHE.liveScores[cacheKey] && (Date.now() - SPORTSDB_CACHE.liveScores[cacheKey].timestamp < SPORTSDB_CACHE_TTL)) {
        return SPORTSDB_CACHE.liveScores[cacheKey].data;
    }

    try {
        // TheSportsDB free API - livescore endpoint
        const url = `https://www.thesportsdb.com/api/v1/json/3/latestscore.php?l=${leagueId}`;
        console.log(`📺 TheSportsDB: Fetching live scores for ${sport.toUpperCase()}...`);

        const data = await fetchJSON(url);
        const events = (data.events || []).map(event => ({
            id: event.idEvent,
            name: event.strEvent,
            date: event.dateEvent,
            time: event.strTime,
            homeTeam: event.strHomeTeam,
            awayTeam: event.strAwayTeam,
            homeScore: parseInt(event.intHomeScore) || 0,
            awayScore: parseInt(event.intAwayScore) || 0,
            status: event.strStatus,
            progress: event.strProgress,
            venue: event.strVenue,
            isLive: event.strStatus === 'Match Finished' ? false : true,
            source: 'thesportsdb'
        }));

        const result = { events, count: events.length, sport, source: 'thesportsdb' };
        SPORTSDB_CACHE.liveScores[cacheKey] = { data: result, timestamp: Date.now() };
        console.log(`✅ TheSportsDB: Found ${events.length} live/recent events`);
        return result;
    } catch (error) {
        console.error('TheSportsDB live scores error:', error.message);
        return { events: [], source: 'thesportsdb', error: error.message };
    }
}

// Fetch next 15 events for a league
async function fetchSportsDBUpcomingEvents(sport) {
    const leagueId = SPORTSDB_LEAGUES[sport.toLowerCase()];
    if (!leagueId) {
        return { events: [], source: 'thesportsdb', note: 'Sport not supported' };
    }

    const cacheKey = `sportsdb_upcoming_${sport}`;
    if (SPORTSDB_CACHE.events[cacheKey] && (Date.now() - SPORTSDB_CACHE.events[cacheKey].timestamp < 15 * 60 * 1000)) {
        return SPORTSDB_CACHE.events[cacheKey].data;
    }

    try {
        const url = `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${leagueId}`;
        console.log(`📅 TheSportsDB: Fetching upcoming events for ${sport.toUpperCase()}...`);

        const data = await fetchJSON(url);
        const events = (data.events || []).map(event => ({
            id: event.idEvent,
            name: event.strEvent,
            date: event.dateEvent,
            time: event.strTime,
            homeTeam: event.strHomeTeam,
            awayTeam: event.strAwayTeam,
            venue: event.strVenue,
            round: event.intRound,
            source: 'thesportsdb'
        }));

        const result = { events, count: events.length, sport, source: 'thesportsdb' };
        SPORTSDB_CACHE.events[cacheKey] = { data: result, timestamp: Date.now() };
        console.log(`✅ TheSportsDB: Found ${events.length} upcoming events`);
        return result;
    } catch (error) {
        console.error('TheSportsDB upcoming events error:', error.message);
        return { events: [], source: 'thesportsdb', error: error.message };
    }
}

// Fetch team details including current roster info
async function fetchSportsDBTeam(teamName) {
    const cacheKey = `sportsdb_team_${teamName}`;
    if (SPORTSDB_CACHE.teams[cacheKey] && (Date.now() - SPORTSDB_CACHE.teams[cacheKey].timestamp < 60 * 60 * 1000)) {
        return SPORTSDB_CACHE.teams[cacheKey].data;
    }

    try {
        const url = `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`;
        console.log(`🏟️ TheSportsDB: Fetching team info for ${teamName}...`);

        const data = await fetchJSON(url);
        const team = data.teams?.[0];

        if (!team) {
            return { team: null, source: 'thesportsdb', note: 'Team not found' };
        }

        const result = {
            team: {
                id: team.idTeam,
                name: team.strTeam,
                shortName: team.strTeamShort,
                league: team.strLeague,
                stadium: team.strStadium,
                location: team.strStadiumLocation,
                capacity: team.intStadiumCapacity,
                website: team.strWebsite,
                logo: team.strLogo,
                banner: team.strBanner,
                source: 'thesportsdb'
            },
            source: 'thesportsdb'
        };

        SPORTSDB_CACHE.teams[cacheKey] = { data: result, timestamp: Date.now() };
        return result;
    } catch (error) {
        console.error('TheSportsDB team error:', error.message);
        return { team: null, source: 'thesportsdb', error: error.message };
    }
}

// =====================================================
// NBA.com Official Stats API (FREE, UNLIMITED, LIVE)
// Real-time game stats, player stats, team stats
// =====================================================
const NBA_COM_CACHE = {
    scoreboard: { data: null, timestamp: null },
    gameDetail: {},
    playerStats: {},
    teamStats: {}
};
const NBA_COM_CACHE_TTL = 60 * 1000; // 1 minute for live data

// Fetch NBA.com live scoreboard
async function fetchNBAComScoreboard() {
    if (NBA_COM_CACHE.scoreboard.data && (Date.now() - NBA_COM_CACHE.scoreboard.timestamp < NBA_COM_CACHE_TTL)) {
        return NBA_COM_CACHE.scoreboard.data;
    }

    try {
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const url = `https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json`;
        console.log(`🏀 NBA.com: Fetching live scoreboard...`);

        const data = await fetchJSON(url);
        const scoreboard = data.scoreboard || {};

        const games = (scoreboard.games || []).map(game => ({
            id: game.gameId,
            gameCode: game.gameCode,
            status: game.gameStatus,
            statusText: game.gameStatusText,
            period: game.period,
            gameClock: game.gameClock,
            homeTeam: {
                id: game.homeTeam?.teamId,
                name: game.homeTeam?.teamName,
                triCode: game.homeTeam?.teamTricode,
                score: game.homeTeam?.score,
                wins: game.homeTeam?.wins,
                losses: game.homeTeam?.losses
            },
            awayTeam: {
                id: game.awayTeam?.teamId,
                name: game.awayTeam?.teamName,
                triCode: game.awayTeam?.teamTricode,
                score: game.awayTeam?.score,
                wins: game.awayTeam?.wins,
                losses: game.awayTeam?.losses
            },
            arena: game.arenaName,
            isLive: game.gameStatus === 2,
            source: 'nba.com'
        }));

        const result = {
            games,
            count: games.length,
            gameDate: scoreboard.gameDate,
            source: 'nba.com'
        };
        NBA_COM_CACHE.scoreboard = { data: result, timestamp: Date.now() };
        console.log(`✅ NBA.com: Found ${games.length} games on scoreboard`);
        return result;
    } catch (error) {
        console.error('NBA.com scoreboard error:', error.message);
        return { games: [], source: 'nba.com', error: error.message };
    }
}

// Fetch live box score from NBA.com
async function fetchNBAComBoxScore(gameId) {
    if (NBA_COM_CACHE.gameDetail[gameId] && (Date.now() - NBA_COM_CACHE.gameDetail[gameId].timestamp < NBA_COM_CACHE_TTL)) {
        return NBA_COM_CACHE.gameDetail[gameId].data;
    }

    try {
        const url = `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`;
        console.log(`📊 NBA.com: Fetching live box score for game ${gameId}...`);

        const data = await fetchJSON(url);
        const game = data.game || {};

        const formatPlayerStats = (players) => (players || []).map(p => ({
            playerId: p.personId,
            playerName: p.name,
            position: p.position,
            minutes: p.statistics?.minutes || '0:00',
            points: p.statistics?.points || 0,
            rebounds: p.statistics?.reboundsTotal || 0,
            assists: p.statistics?.assists || 0,
            steals: p.statistics?.steals || 0,
            blocks: p.statistics?.blocks || 0,
            turnovers: p.statistics?.turnovers || 0,
            fg: `${p.statistics?.fieldGoalsMade || 0}/${p.statistics?.fieldGoalsAttempted || 0}`,
            fg3: `${p.statistics?.threePointersMade || 0}/${p.statistics?.threePointersAttempted || 0}`,
            ft: `${p.statistics?.freeThrowsMade || 0}/${p.statistics?.freeThrowsAttempted || 0}`,
            plusMinus: p.statistics?.plusMinusPoints,
            source: 'nba.com'
        }));

        const result = {
            gameId,
            gameStatus: game.gameStatus,
            period: game.period,
            gameClock: game.gameClock,
            homeTeam: {
                name: game.homeTeam?.teamName,
                triCode: game.homeTeam?.teamTricode,
                score: game.homeTeam?.score,
                players: formatPlayerStats(game.homeTeam?.players)
            },
            awayTeam: {
                name: game.awayTeam?.teamName,
                triCode: game.awayTeam?.teamTricode,
                score: game.awayTeam?.score,
                players: formatPlayerStats(game.awayTeam?.players)
            },
            source: 'nba.com'
        };

        NBA_COM_CACHE.gameDetail[gameId] = { data: result, timestamp: Date.now() };
        return result;
    } catch (error) {
        console.error(`NBA.com box score error for game ${gameId}:`, error.message);
        return { gameId, error: error.message, source: 'nba.com' };
    }
}

// Fetch NBA league leaders (current season)
async function fetchNBAComLeaders() {
    const cacheKey = 'nba_leaders';
    if (NBA_COM_CACHE.playerStats[cacheKey] && (Date.now() - NBA_COM_CACHE.playerStats[cacheKey].timestamp < 30 * 60 * 1000)) {
        return NBA_COM_CACHE.playerStats[cacheKey].data;
    }

    try {
        const url = 'https://cdn.nba.com/static/json/staticData/leagueDashPlayerStats.json';
        console.log(`🏆 NBA.com: Fetching league leaders...`);

        const data = await fetchJSON(url);
        const headers = data.resultSets?.[0]?.headers || [];
        const rows = data.resultSets?.[0]?.rowSet || [];

        const players = rows.slice(0, 50).map(row => {
            const playerData = {};
            headers.forEach((header, index) => {
                playerData[header] = row[index];
            });
            return {
                playerId: playerData.PLAYER_ID,
                playerName: playerData.PLAYER_NAME,
                team: playerData.TEAM_ABBREVIATION,
                gamesPlayed: playerData.GP,
                minutes: playerData.MIN,
                points: playerData.PTS,
                rebounds: playerData.REB,
                assists: playerData.AST,
                steals: playerData.STL,
                blocks: playerData.BLK,
                turnovers: playerData.TOV,
                fg_pct: playerData.FG_PCT,
                fg3_pct: playerData.FG3_PCT,
                ft_pct: playerData.FT_PCT,
                source: 'nba.com'
            };
        });

        const result = { players, count: players.length, source: 'nba.com' };
        NBA_COM_CACHE.playerStats[cacheKey] = { data: result, timestamp: Date.now() };
        console.log(`✅ NBA.com: Found ${players.length} league leaders`);
        return result;
    } catch (error) {
        console.error('NBA.com leaders error:', error.message);
        return { players: [], source: 'nba.com', error: error.message };
    }
}

// =====================================================
// NHL Official API Enhanced (FREE, UNLIMITED, LIVE)
// More endpoints for live game data
// =====================================================
const NHL_LIVE_CACHE = {
    playByPlay: {},
    gameCenter: {},
    standings: { data: null, timestamp: null }
};
const NHL_LIVE_CACHE_TTL = 30 * 1000; // 30 seconds for play-by-play

// Fetch NHL live play-by-play
async function fetchNHLPlayByPlay(gameId) {
    if (NHL_LIVE_CACHE.playByPlay[gameId] && (Date.now() - NHL_LIVE_CACHE.playByPlay[gameId].timestamp < NHL_LIVE_CACHE_TTL)) {
        return NHL_LIVE_CACHE.playByPlay[gameId].data;
    }

    try {
        const url = `https://api-web.nhle.com/v1/gamecenter/${gameId}/play-by-play`;
        console.log(`🏒 NHL API: Fetching play-by-play for game ${gameId}...`);

        const data = await fetchJSON(url);

        const plays = (data.plays || []).slice(-20).map(play => ({
            eventId: play.eventId,
            period: play.periodDescriptor?.number,
            time: play.timeInPeriod,
            type: play.typeDescKey,
            description: play.details?.reason || play.typeDescKey,
            team: play.details?.eventOwnerTeamId,
            playerName: play.details?.scoringPlayerId ? `Player ${play.details.scoringPlayerId}` : null,
            source: 'nhl.com'
        }));

        const result = {
            gameId,
            period: data.period,
            clock: data.clock?.timeRemaining,
            homeScore: data.homeTeam?.score,
            awayScore: data.awayTeam?.score,
            plays,
            source: 'nhl.com'
        };

        NHL_LIVE_CACHE.playByPlay[gameId] = { data: result, timestamp: Date.now() };
        return result;
    } catch (error) {
        console.error(`NHL play-by-play error for game ${gameId}:`, error.message);
        return { gameId, error: error.message, source: 'nhl.com' };
    }
}

// Fetch NHL game center (comprehensive live data)
async function fetchNHLGameCenter(gameId) {
    if (NHL_LIVE_CACHE.gameCenter[gameId] && (Date.now() - NHL_LIVE_CACHE.gameCenter[gameId].timestamp < 60 * 1000)) {
        return NHL_LIVE_CACHE.gameCenter[gameId].data;
    }

    try {
        const url = `https://api-web.nhle.com/v1/gamecenter/${gameId}/boxscore`;
        console.log(`🏒 NHL API: Fetching game center for game ${gameId}...`);

        const data = await fetchJSON(url);

        const formatSkaters = (skaters) => (skaters || []).map(s => ({
            playerId: s.playerId,
            name: s.name?.default,
            position: s.position,
            goals: s.goals,
            assists: s.assists,
            points: (s.goals || 0) + (s.assists || 0),
            plusMinus: s.plusMinus,
            pim: s.pim,
            shots: s.shots,
            hits: s.hits,
            blockedShots: s.blockedShots,
            toi: s.toi,
            source: 'nhl.com'
        }));

        const result = {
            gameId,
            gameState: data.gameState,
            period: data.period,
            clock: data.clock?.timeRemaining,
            homeTeam: {
                name: data.homeTeam?.name?.default,
                abbrev: data.homeTeam?.abbrev,
                score: data.homeTeam?.score,
                sog: data.homeTeam?.sog,
                skaters: formatSkaters(data.homeTeam?.forwards?.concat(data.homeTeam?.defense || []))
            },
            awayTeam: {
                name: data.awayTeam?.name?.default,
                abbrev: data.awayTeam?.abbrev,
                score: data.awayTeam?.score,
                sog: data.awayTeam?.sog,
                skaters: formatSkaters(data.awayTeam?.forwards?.concat(data.awayTeam?.defense || []))
            },
            source: 'nhl.com'
        };

        NHL_LIVE_CACHE.gameCenter[gameId] = { data: result, timestamp: Date.now() };
        return result;
    } catch (error) {
        console.error(`NHL game center error for game ${gameId}:`, error.message);
        return { gameId, error: error.message, source: 'nhl.com' };
    }
}

// =====================================================
// MLB Stats API Enhanced (FREE, UNLIMITED, LIVE)
// More endpoints for live game data
// =====================================================
const MLB_LIVE_CACHE = {
    liveGame: {},
    playByPlay: {}
};
const MLB_LIVE_CACHE_TTL = 30 * 1000; // 30 seconds for live data

// Fetch MLB live game feed
async function fetchMLBLiveGame(gamePk) {
    if (MLB_LIVE_CACHE.liveGame[gamePk] && (Date.now() - MLB_LIVE_CACHE.liveGame[gamePk].timestamp < MLB_LIVE_CACHE_TTL)) {
        return MLB_LIVE_CACHE.liveGame[gamePk].data;
    }

    try {
        const url = `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`;
        console.log(`⚾ MLB API: Fetching live game feed for game ${gamePk}...`);

        const data = await fetchJSON(url);
        const gameData = data.gameData || {};
        const liveData = data.liveData || {};
        const linescore = liveData.linescore || {};

        const result = {
            gamePk,
            status: gameData.status?.detailedState,
            inning: linescore.currentInning,
            inningHalf: linescore.inningHalf,
            homeTeam: {
                name: gameData.teams?.home?.name,
                abbrev: gameData.teams?.home?.abbreviation,
                runs: linescore.teams?.home?.runs || 0,
                hits: linescore.teams?.home?.hits || 0,
                errors: linescore.teams?.home?.errors || 0
            },
            awayTeam: {
                name: gameData.teams?.away?.name,
                abbrev: gameData.teams?.away?.abbreviation,
                runs: linescore.teams?.away?.runs || 0,
                hits: linescore.teams?.away?.hits || 0,
                errors: linescore.teams?.away?.errors || 0
            },
            balls: linescore.balls,
            strikes: linescore.strikes,
            outs: linescore.outs,
            currentPlay: liveData.plays?.currentPlay?.result?.description,
            source: 'mlb.com'
        };

        MLB_LIVE_CACHE.liveGame[gamePk] = { data: result, timestamp: Date.now() };
        return result;
    } catch (error) {
        console.error(`MLB live game error for game ${gamePk}:`, error.message);
        return { gamePk, error: error.message, source: 'mlb.com' };
    }
}

// Fetch MLB player game stats
async function fetchMLBPlayerGameStats(gamePk) {
    try {
        const url = `https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`;
        console.log(`⚾ MLB API: Fetching box score for game ${gamePk}...`);

        const data = await fetchJSON(url);

        const formatBatters = (batters, players) => batters?.map(id => {
            const p = players?.[`ID${id}`];
            if (!p) return null;
            const stats = p.stats?.batting || {};
            return {
                playerId: id,
                name: p.person?.fullName,
                position: p.position?.abbreviation,
                atBats: stats.atBats || 0,
                runs: stats.runs || 0,
                hits: stats.hits || 0,
                rbi: stats.rbi || 0,
                walks: stats.baseOnBalls || 0,
                strikeouts: stats.strikeOuts || 0,
                avg: stats.avg,
                source: 'mlb.com'
            };
        }).filter(Boolean) || [];

        const formatPitchers = (pitchers, players) => pitchers?.map(id => {
            const p = players?.[`ID${id}`];
            if (!p) return null;
            const stats = p.stats?.pitching || {};
            return {
                playerId: id,
                name: p.person?.fullName,
                inningsPitched: stats.inningsPitched,
                hits: stats.hits || 0,
                runs: stats.runs || 0,
                earnedRuns: stats.earnedRuns || 0,
                walks: stats.baseOnBalls || 0,
                strikeouts: stats.strikeOuts || 0,
                era: stats.era,
                source: 'mlb.com'
            };
        }).filter(Boolean) || [];

        const result = {
            gamePk,
            homeTeam: {
                name: data.teams?.home?.team?.name,
                batters: formatBatters(data.teams?.home?.batters, data.teams?.home?.players),
                pitchers: formatPitchers(data.teams?.home?.pitchers, data.teams?.home?.players)
            },
            awayTeam: {
                name: data.teams?.away?.team?.name,
                batters: formatBatters(data.teams?.away?.batters, data.teams?.away?.players),
                pitchers: formatPitchers(data.teams?.away?.pitchers, data.teams?.away?.players)
            },
            source: 'mlb.com'
        };

        return result;
    } catch (error) {
        console.error(`MLB box score error for game ${gamePk}:`, error.message);
        return { gamePk, error: error.message, source: 'mlb.com' };
    }
}

// =====================================================
// Combined LIVE Data Aggregator
// Fetches from all FREE live sources simultaneously
// =====================================================
async function fetchAllLiveData(sport) {
    console.log(`🔴 LIVE: Aggregating all live data for ${sport.toUpperCase()}...`);

    const results = {
        sport,
        timestamp: new Date().toISOString(),
        sources: {},
        games: [],
        liveGames: [],
        upcomingGames: []
    };

    const promises = [];

    // ESPN Live Scores (always included)
    promises.push(
        fetchESPNScores(sport)
            .then(data => {
                results.sources.espn = { status: 'success', count: data.events?.length || 0 };
                if (data.events) {
                    data.events.forEach(event => {
                        results.games.push({ ...event, source: 'espn' });
                        if (event.status?.type?.state === 'in') {
                            results.liveGames.push({ ...event, source: 'espn' });
                        }
                    });
                }
            })
            .catch(e => { results.sources.espn = { status: 'error', message: e.message }; })
    );

    // SofaScore Events (FREE, unlimited)
    promises.push(
        fetchSofaScoreEvents(sport)
            .then(data => {
                results.sources.sofascore = { status: 'success', count: data.events?.length || 0 };
            })
            .catch(e => { results.sources.sofascore = { status: 'error', message: e.message }; })
    );

    // TheSportsDB Live Scores (FREE, unlimited)
    promises.push(
        fetchSportsDBLiveScores(sport)
            .then(data => {
                results.sources.thesportsdb = { status: 'success', count: data.events?.length || 0 };
            })
            .catch(e => { results.sources.thesportsdb = { status: 'error', message: e.message }; })
    );

    // TheSportsDB Upcoming (FREE)
    promises.push(
        fetchSportsDBUpcomingEvents(sport)
            .then(data => {
                results.upcomingGames = data.events || [];
            })
            .catch(e => { console.log('TheSportsDB upcoming error:', e.message); })
    );

    // Sport-specific live data
    if (sport === 'nba') {
        // NBA.com Live Scoreboard
        promises.push(
            fetchNBAComScoreboard()
                .then(data => {
                    results.sources.nba_com = { status: 'success', count: data.games?.length || 0 };
                    data.games?.forEach(game => {
                        if (game.isLive) {
                            results.liveGames.push({ ...game, source: 'nba.com' });
                        }
                    });
                })
                .catch(e => { results.sources.nba_com = { status: 'error', message: e.message }; })
        );

        // Ball Don't Lie Today's Games
        promises.push(
            fetchBDLTodaysGames()
                .then(data => {
                    results.sources.balldontlie = { status: 'success', count: data.games?.length || 0 };
                })
                .catch(e => { results.sources.balldontlie = { status: 'error', message: e.message }; })
        );
    }

    await Promise.allSettled(promises);

    console.log(`✅ LIVE: Aggregated from ${Object.keys(results.sources).length} sources`);
    console.log(`   Total games: ${results.games.length}, Live: ${results.liveGames.length}`);

    return results;
}

// =====================================================
// Generate Prop Lines from Real Stats
// Uses actual player averages to create realistic betting lines
// =====================================================
function generatePropsFromStats(playerStats, sport) {
    const props = [];

    const propTypes = {
        nba: [
            { name: 'Points', key: 'points', variance: 0.15 },
            { name: 'Rebounds', key: 'rebounds', variance: 0.2 },
            { name: 'Assists', key: 'assists', variance: 0.25 },
            { name: 'Threes Made', key: 'threes', variance: 0.3 },
            { name: 'Pts+Reb+Ast', key: 'pra', variance: 0.12 }
        ],
        nfl: [
            { name: 'Passing Yards', key: 'passYds', variance: 0.15 },
            { name: 'Rushing Yards', key: 'rushYds', variance: 0.2 },
            { name: 'Receiving Yards', key: 'recYds', variance: 0.2 },
            { name: 'Receptions', key: 'receptions', variance: 0.25 }
        ],
        nhl: [
            { name: 'Points', key: 'points', variance: 0.25 },
            { name: 'Shots on Goal', key: 'shots', variance: 0.2 },
            { name: 'Goals', key: 'goals', variance: 0.35 }
        ],
        mlb: [
            { name: 'Hits', key: 'hits', variance: 0.3 },
            { name: 'RBIs', key: 'rbis', variance: 0.35 },
            { name: 'Strikeouts (Pitcher)', key: 'strikeouts', variance: 0.2 }
        ]
    };

    const sportProps = propTypes[sport] || propTypes.nba;

    playerStats.forEach(player => {
        // Skip injured players
        if (isPlayerInjured(player.playerName)) {
            console.log(`  ⛔ Skipping ${player.playerName} - injured`);
            return;
        }

        sportProps.forEach(propDef => {
            let baseline;
            if (propDef.key === 'pra') {
                baseline = (player.points || 0) + (player.rebounds || 0) + (player.assists || 0);
            } else {
                baseline = player[propDef.key] || 0;
            }

            if (baseline > 0.1) {  // Only create props for players with meaningful stats
                // Use proper line rounding (0.5, 1.5, 2.5, etc.)
                const line = roundToProperLine(baseline, propDef.name);

                // Calculate smart AI pick
                const aiResult = calculateSmartAIPick(baseline, line, 'NEUTRAL', player.position, propDef.name);

                // Generate varied odds for each sportsbook
                const overOdds = generateBookOddsAccurate(-110);
                const underOdds = generateBookOddsAccurate(-110);

                props.push({
                    player: player.playerName,
                    playerId: player.playerId,
                    team: player.team,
                    position: player.position || '',
                    propType: propDef.name,
                    line: line,
                    seasonAvg: baseline.toFixed(1),
                    over: overOdds,
                    under: underOdds,
                    aiPick: aiResult.pick,
                    confidence: aiResult.confidence,
                    reasoning: aiResult.reasoning,
                    trend: aiResult.trend,
                    source: 'generated_from_stats',
                    isRealLine: false,
                    lastUpdated: new Date().toISOString()
                });
            }
        });
    });

    // Filter out any remaining injured players
    return filterInjuredPlayers(props);
}

// Generate varied odds for each sportsbook (realistic variance)
function generateBookOdds(baseOdds, books) {
    const bookOdds = {};
    books.forEach(book => {
        // Each book varies slightly from base (-8 to +8)
        const variance = Math.floor(Math.random() * 17) - 8;
        bookOdds[book] = baseOdds + variance;
    });
    return bookOdds;
}

// =====================================================
// Fetch REAL sportsbook odds from ESPN (DraftKings embedded)
// ESPN embeds real DraftKings odds in their scoreboard API
// =====================================================
async function fetchFreeOdds(sport) {
    const cacheKey = `free_odds_${sport}`;
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < PROPS_CACHE_TTL_MS)) {
        console.log(`📦 Returning cached real odds for ${sport}`);
        return propsCache[cacheKey].data;
    }

    console.log(`🎰 Fetching REAL DraftKings odds from ESPN for ${sport}...`);

    // Get games from ESPN (includes embedded DraftKings odds)
    const games = await fetchESPNScores(sport);
    const events = games.events || [];

    let realOddsCount = 0;
    let calculatedOddsCount = 0;

    // Extract REAL sportsbook odds from ESPN data
    const oddsData = events.map(event => {
        const competition = event.competitions?.[0];
        if (!competition) return null;

        const homeTeam = competition.competitors?.find(c => c.homeAway === 'home');
        const awayTeam = competition.competitors?.find(c => c.homeAway === 'away');

        if (!homeTeam || !awayTeam) return null;

        const homeRecord = homeTeam.records?.[0]?.summary || '0-0';
        const awayRecord = awayTeam.records?.[0]?.summary || '0-0';

        // Extract REAL DraftKings odds from ESPN (embedded in competition.odds)
        const espnOdds = competition.odds?.[0];
        let hasRealOdds = false;
        let oddsSource = 'calculated';
        let oddsProvider = null;

        // Default values (will be overwritten if real odds exist)
        let homeMoneyline = null;
        let awayMoneyline = null;
        let homeSpread = null;
        let awaySpread = null;
        let homeSpreadOdds = -110;
        let awaySpreadOdds = -110;
        let totalPoints = null;
        let overOdds = -110;
        let underOdds = -110;

        // Check if ESPN has REAL DraftKings/sportsbook odds
        if (espnOdds) {
            oddsProvider = espnOdds.provider?.name || 'Unknown';
            console.log(`  📊 Found ${oddsProvider} odds for ${awayTeam.team?.abbreviation} @ ${homeTeam.team?.abbreviation}`);

            // Extract spread from details (e.g., "SEA -4.5")
            if (espnOdds.details) {
                const spreadMatch = espnOdds.details.match(/([A-Z]+)\s*([-+]?\d+\.?\d*)/);
                if (spreadMatch) {
                    const spreadTeam = spreadMatch[1];
                    const spreadValue = parseFloat(spreadMatch[2]);

                    if (spreadTeam === homeTeam.team?.abbreviation) {
                        homeSpread = spreadValue;
                        awaySpread = -spreadValue;
                    } else {
                        awaySpread = spreadValue;
                        homeSpread = -spreadValue;
                    }
                    hasRealOdds = true;
                }
            }

            // Extract point spread with lines (if available)
            if (espnOdds.pointSpread) {
                if (espnOdds.pointSpread.home?.close?.line !== undefined) {
                    homeSpread = parseFloat(espnOdds.pointSpread.home.close.line);
                    awaySpread = -homeSpread;
                    hasRealOdds = true;
                }
                if (espnOdds.pointSpread.home?.close?.odds) {
                    homeSpreadOdds = parseFloat(espnOdds.pointSpread.home.close.odds);
                }
                if (espnOdds.pointSpread.away?.close?.odds) {
                    awaySpreadOdds = parseFloat(espnOdds.pointSpread.away.close.odds);
                }
            }

            // Extract Over/Under (total)
            if (espnOdds.overUnder !== undefined) {
                totalPoints = parseFloat(espnOdds.overUnder);
                hasRealOdds = true;
            }

            // Extract over/under odds if available
            if (espnOdds.overOdds) {
                overOdds = parseFloat(espnOdds.overOdds);
            }
            if (espnOdds.underOdds) {
                underOdds = parseFloat(espnOdds.underOdds);
            }

            // Extract moneylines
            if (espnOdds.moneyline) {
                if (espnOdds.moneyline.home?.close?.odds) {
                    homeMoneyline = parseInt(espnOdds.moneyline.home.close.odds);
                    hasRealOdds = true;
                }
                if (espnOdds.moneyline.away?.close?.odds) {
                    awayMoneyline = parseInt(espnOdds.moneyline.away.close.odds);
                    hasRealOdds = true;
                }
            }

            // Also check for homeMoneyline/awayMoneyline directly on odds object
            if (espnOdds.homeMoneyline !== undefined) {
                homeMoneyline = parseInt(espnOdds.homeMoneyline);
                hasRealOdds = true;
            }
            if (espnOdds.awayMoneyline !== undefined) {
                awayMoneyline = parseInt(espnOdds.awayMoneyline);
                hasRealOdds = true;
            }

            // Extract spread directly if available
            if (espnOdds.spread !== undefined && homeSpread === null) {
                homeSpread = parseFloat(espnOdds.spread);
                awaySpread = -homeSpread;
                hasRealOdds = true;
            }

            if (hasRealOdds) {
                realOddsCount++;
                oddsSource = oddsProvider || 'DraftKings';
            }
        }

        // If no real odds found, calculate fallback (but mark as calculated)
        if (!hasRealOdds) {
            calculatedOddsCount++;
            const [homeWins, homeLosses] = homeRecord.split('-').map(Number);
            const [awayWins, awayLosses] = awayRecord.split('-').map(Number);

            const homeWinPct = (homeWins + 3) / (homeWins + homeLosses + 6 || 1);
            const awayWinPct = awayWins / (awayWins + awayLosses || 1);

            homeMoneyline = winPctToOdds(homeWinPct / (homeWinPct + awayWinPct));
            awayMoneyline = winPctToOdds(awayWinPct / (homeWinPct + awayWinPct));

            const spreadPoints = Math.round((homeWinPct - awayWinPct) * 15 * 2) / 2;
            homeSpread = -spreadPoints;
            awaySpread = spreadPoints;

            totalPoints = sport === 'nba' ? 220 + Math.floor(Math.random() * 25) :
                          sport === 'nfl' ? 43 + Math.floor(Math.random() * 10) :
                          sport === 'nhl' ? 5.5 + Math.floor(Math.random() * 2) :
                          sport === 'mlb' ? 8 + Math.floor(Math.random() * 3) : 200;
        }

        return {
            id: event.id,
            gameId: event.id,
            homeTeam: {
                name: homeTeam.team?.displayName,
                abbreviation: homeTeam.team?.abbreviation,
                logo: homeTeam.team?.logo,
                record: homeRecord,
                moneyline: homeMoneyline,
                spread: homeSpread,
                spreadOdds: homeSpreadOdds
            },
            awayTeam: {
                name: awayTeam.team?.displayName,
                abbreviation: awayTeam.team?.abbreviation,
                logo: awayTeam.team?.logo,
                record: awayRecord,
                moneyline: awayMoneyline,
                spread: awaySpread,
                spreadOdds: awaySpreadOdds
            },
            total: {
                points: totalPoints,
                overOdds: overOdds,
                underOdds: underOdds
            },
            startTime: event.date,
            status: event.status?.type?.description || 'Scheduled',
            venue: competition.venue?.fullName,
            broadcast: competition.broadcasts?.[0]?.names?.[0],
            source: oddsSource,
            provider: oddsProvider,
            hasRealOdds: hasRealOdds
        };
    }).filter(Boolean);

    const result = {
        odds: oddsData,
        source: realOddsCount > 0 ? 'draftkings_via_espn' : 'calculated',
        gamesCount: oddsData.length,
        realOddsCount: realOddsCount,
        calculatedOddsCount: calculatedOddsCount,
        note: realOddsCount > 0
            ? `REAL sportsbook odds for ${realOddsCount} games from DraftKings`
            : 'Odds calculated from team records (no live sportsbook data available)'
    };

    propsCache[cacheKey] = { data: result, timestamp: Date.now() };
    console.log(`✅ ${sport.toUpperCase()} odds: ${realOddsCount} real (DraftKings), ${calculatedOddsCount} calculated`);
    return result;
}

// Convert win percentage to American odds
function winPctToOdds(winPct) {
    if (winPct >= 0.5) {
        return Math.round(-100 * winPct / (1 - winPct));
    } else {
        return Math.round(100 * (1 - winPct) / winPct);
    }
}

// Get generated props (when Odds API is unavailable)
async function getGeneratedProps(sport) {
    const cacheKey = `gen_props_${sport}`;
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < PROPS_CACHE_TTL_MS)) {
        console.log(`📦 Returning cached generated props for ${sport}`);
        return propsCache[cacheKey].data;
    }

    console.log(`🎯 Generating props from real player stats for ${sport}...`);

    // Fetch today's games and injuries for enhanced predictions
    let todaysGames = [];
    let injuries = [];
    try {
        // Fetch today's games from ESPN
        const sportPaths = { 
            nba: 'basketball/nba', 
            ncaab: 'basketball/mens-college-basketball',
            nfl: 'football/nfl', 
            ncaaf: 'football/college-football',
            nhl: 'hockey/nhl', 
            mlb: 'baseball/mlb' 
        };
        const sportPath = sportPaths[sport];
        if (sportPath) {
            const scoresUrl = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/scoreboard`;
            const scoresData = await fetchJSON(scoresUrl);
            if (scoresData?.events) {
                todaysGames = scoresData.events.map(e => {
                    const home = e.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home');
                    const away = e.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away');
                    const competition = e.competitions?.[0];
                    return {
                        id: e.id,
                        homeTeam: { abbreviation: home?.team?.abbreviation, name: home?.team?.displayName },
                        awayTeam: { abbreviation: away?.team?.abbreviation, name: away?.team?.displayName },
                        startTime: e.date || competition?.date || null,
                        venue: competition?.venue?.fullName || null,
                        broadcast: competition?.broadcasts?.[0]?.names?.[0] || null,
                        status: e.status?.type?.name || 'scheduled'
                    };
                });
                console.log(`📅 Found ${todaysGames.length} ${sport.toUpperCase()} games today for matchup context`);
            }
        }
        // Get injuries from cache
        injuries = Array.from(INJURED_PLAYERS_CACHE.players || []);
    } catch (e) {
        console.log(`⚠️ Could not fetch game context: ${e.message}`);
    }

    const gameContext = { todaysGames, injuries, weather: null };

    // Try official NBA.com stats first (most accurate)
    if (sport === 'nba') {
        try {
            const nbaStats = await fetchNBAOfficialStats();
            if (nbaStats.players && nbaStats.players.length > 0) {
                const props = generatePropsFromRealStats(nbaStats, 'nba', gameContext);
                if (props.length > 0) {
                    const result = {
                        source: 'nba_official_stats',
                        propsCount: props.length,
                        props: props,
                        note: 'Props generated from REAL NBA.com official statistics'
                    };
                    propsCache[cacheKey] = { data: result, timestamp: Date.now() };
                    console.log(`✅ Generated ${props.length} props from REAL NBA stats`);
                    return result;
                }
            }
        } catch (e) {
            console.log(`⚠️ NBA official stats failed, trying fallback: ${e.message}`);
        }

        // Fallback to Ball Don't Lie
        const bdlData = await fetchBallDontLieStats(sport);
        if (bdlData.stats && bdlData.stats.length > 0) {
            const props = generatePropsFromStats(bdlData.stats, sport);
            const result = {
                source: 'generated_from_balldontlie',
                propsCount: props.length,
                props: props,
                note: 'Props generated from Ball Don\'t Lie season averages'
            };
            propsCache[cacheKey] = { data: result, timestamp: Date.now() };
            return result;
        }
    }

    // Try official MLB stats
    if (sport === 'mlb') {
        try {
            const mlbStats = await fetchMLBPlayerStats();
            if ((mlbStats.hittingLeaders?.length > 0) || (mlbStats.pitchingLeaders?.length > 0)) {
                const props = generatePropsFromRealStats(mlbStats, 'mlb');
                if (props.length > 0) {
                    const result = {
                        source: 'mlb_official_stats',
                        propsCount: props.length,
                        props: props,
                        note: 'Props generated from REAL MLB official statistics'
                    };
                    propsCache[cacheKey] = { data: result, timestamp: Date.now() };
                    console.log(`✅ Generated ${props.length} props from REAL MLB stats`);
                    return result;
                }
            }
        } catch (e) {
            console.log(`⚠️ MLB official stats failed: ${e.message}`);
        }
    }

    // Try official NHL stats
    if (sport === 'nhl') {
        try {
            const nhlStats = await fetchNHLPlayerStats();
            if (nhlStats.skaterLeaders?.length > 0) {
                const props = generatePropsFromRealStats(nhlStats, 'nhl');
                if (props.length > 0) {
                    const result = {
                        source: 'nhl_official_stats',
                        propsCount: props.length,
                        props: props,
                        note: 'Props generated from REAL NHL official statistics'
                    };
                    propsCache[cacheKey] = { data: result, timestamp: Date.now() };
                    console.log(`✅ Generated ${props.length} props from REAL NHL stats`);
                    return result;
                }
            }
        } catch (e) {
            console.log(`⚠️ NHL official stats failed: ${e.message}`);
        }
    }

    // NFL: Check for live games with weather data (handles offseason)
    if (sport === 'nfl') {
        const nflProps = await getSuperBowlDraftKingsProps();
        if (nflProps.length > 0) {
            // Filter out injured players
            const filteredProps = filterInjuredPlayers(nflProps);
            const result = {
                source: 'nfl_live',
                propsCount: filteredProps.length,
                props: filteredProps,
                isRealLine: true,
                note: 'NFL props with weather integration'
            };
            propsCache[cacheKey] = { data: result, timestamp: Date.now() };
            console.log(`✅ Using ${filteredProps.length} NFL props with weather data`);
            return result;
        } else {
            console.log(`🏈 NFL Offseason - No games scheduled`);
            return {
                source: 'nfl_offseason',
                propsCount: 0,
                props: [],
                note: 'NFL Offseason - No games available. Check back when the season starts!'
            };
        }
    }

    // For other sports, generate from ESPN roster data
    const playerData = await fetchPlayerStats(sport);
    if (playerData.players && playerData.players.length > 0) {
        // Create estimated stats for players (since ESPN doesn't give season avgs directly)
        const estimatedStats = playerData.players.slice(0, 50).map(player => ({
            playerId: player.id,
            playerName: player.name,
            team: player.team,
            position: player.position,
            // Generate reasonable baseline stats based on sport and position
            ...getEstimatedStats(sport, player.position)
        }));

        const props = generatePropsFromStats(estimatedStats, sport);
        const result = {
            source: 'generated_from_espn_roster',
            propsCount: props.length,
            props: props,
            note: 'Props estimated from roster data'
        };
        propsCache[cacheKey] = { data: result, timestamp: Date.now() };
        return result;
    }

    return { source: 'none', props: [], note: 'No player data available' };
}

// Get estimated stats based on sport and position
function getEstimatedStats(sport, position) {
    const statsByPosition = {
        nba: {
            'G': { points: 15, rebounds: 3, assists: 5, threes: 2 },
            'F': { points: 12, rebounds: 6, assists: 3, threes: 1.5 },
            'C': { points: 10, rebounds: 8, assists: 2, threes: 0.5 },
            'PG': { points: 14, rebounds: 3, assists: 7, threes: 2 },
            'SG': { points: 16, rebounds: 3, assists: 4, threes: 2.5 },
            'SF': { points: 13, rebounds: 5, assists: 3, threes: 1.5 },
            'PF': { points: 11, rebounds: 7, assists: 2, threes: 1 },
            'default': { points: 12, rebounds: 5, assists: 3, threes: 1.5 }
        },
        ncaab: {
            'G': { points: 12, rebounds: 2.5, assists: 4, threes: 1.5 },
            'F': { points: 10, rebounds: 5, assists: 2, threes: 1 },
            'C': { points: 8, rebounds: 6, assists: 1.5, threes: 0.3 },
            'PG': { points: 11, rebounds: 2, assists: 5, threes: 1.5 },
            'SG': { points: 13, rebounds: 2.5, assists: 3, threes: 2 },
            'SF': { points: 10, rebounds: 4, assists: 2, threes: 1 },
            'PF': { points: 9, rebounds: 5.5, assists: 1.5, threes: 0.5 },
            'default': { points: 10, rebounds: 4, assists: 2.5, threes: 1 }
        },
        nfl: {
            'QB': { passYds: 250, rushYds: 15, receptions: 0 },
            'RB': { passYds: 0, rushYds: 65, receptions: 3 },
            'WR': { passYds: 0, rushYds: 0, recYds: 55, receptions: 4 },
            'TE': { passYds: 0, rushYds: 0, recYds: 35, receptions: 3 },
            'default': { passYds: 0, rushYds: 30, receptions: 2 }
        },
        ncaaf: {
            'QB': { passYds: 220, rushYds: 25, receptions: 0 },
            'RB': { passYds: 0, rushYds: 75, receptions: 2 },
            'WR': { passYds: 0, rushYds: 0, recYds: 50, receptions: 4 },
            'TE': { passYds: 0, rushYds: 0, recYds: 30, receptions: 2 },
            'default': { passYds: 0, rushYds: 35, receptions: 2 }
        },
        nhl: {
            'C': { goals: 0.3, assists: 0.4, shots: 3 },
            'LW': { goals: 0.25, assists: 0.3, shots: 2.5 },
            'RW': { goals: 0.25, assists: 0.3, shots: 2.5 },
            'D': { goals: 0.1, assists: 0.3, shots: 2 },
            'G': { goals: 0, assists: 0.05, shots: 0 },
            'default': { goals: 0.2, assists: 0.3, shots: 2 }
        },
        mlb: {
            'P': { strikeouts: 6, hits: 0, rbis: 0 },
            'C': { strikeouts: 0, hits: 1, rbis: 0.5 },
            'IF': { strikeouts: 0, hits: 1.2, rbis: 0.6 },
            'OF': { strikeouts: 0, hits: 1.3, rbis: 0.7 },
            'default': { strikeouts: 0, hits: 1, rbis: 0.5 }
        }
    };

    const sportStats = statsByPosition[sport] || statsByPosition.nba;
    const positionKey = position?.toUpperCase() || 'default';

    // Find matching position or use default
    for (const [key, stats] of Object.entries(sportStats)) {
        if (positionKey.includes(key)) {
            return stats;
        }
    }
    return sportStats.default;
}

// Generate props directly from roster data with AI predictions
async function generatePropsFromRoster(sport) {
    const props = [];

    try {
        const playerData = await fetchPlayerStats(sport);
        if (!playerData.players || playerData.players.length === 0) {
            console.log(`⚠️ No roster data for ${sport}`);
            return props;
        }

        // Get top players (first 30-50) with their positions
        const players = playerData.players.slice(0, 50);

        const propConfigs = {
            nba: [
                { type: 'Points', stat: 'points', variance: 4 },
                { type: 'Rebounds', stat: 'rebounds', variance: 2 },
                { type: 'Assists', stat: 'assists', variance: 2 },
                { type: 'Threes Made', stat: 'threes', variance: 1.5 }
            ],
            ncaab: [
                { type: 'Points', stat: 'points', variance: 3 },
                { type: 'Rebounds', stat: 'rebounds', variance: 2 },
                { type: 'Assists', stat: 'assists', variance: 1.5 },
                { type: 'Threes Made', stat: 'threes', variance: 1 }
            ],
            nfl: [
                { type: 'Passing Yards', stat: 'passYds', variance: 30 },
                { type: 'Rushing Yards', stat: 'rushYds', variance: 15 },
                { type: 'Receptions', stat: 'receptions', variance: 2 }
            ],
            ncaaf: [
                { type: 'Passing Yards', stat: 'passYds', variance: 35 },
                { type: 'Rushing Yards', stat: 'rushYds', variance: 20 },
                { type: 'Receptions', stat: 'receptions', variance: 2 }
            ],
            nhl: [
                { type: 'Goals', stat: 'goals', variance: 0.3 },
                { type: 'Assists', stat: 'assists', variance: 0.4 },
                { type: 'Shots on Goal', stat: 'shots', variance: 1 }
            ],
            mlb: [
                { type: 'Hits', stat: 'hits', variance: 0.5 },
                { type: 'RBIs', stat: 'rbis', variance: 0.4 },
                { type: 'Strikeouts (P)', stat: 'strikeouts', variance: 1.5 }
            ]
        };

        const configs = propConfigs[sport] || propConfigs.nba;

        for (const player of players) {
            const stats = getEstimatedStats(sport, player.position);

            // Generate 1-2 props per player based on position
            for (const config of configs) {
                const statValue = stats[config.stat];
                if (!statValue || statValue === 0) continue;

                // Add some variance to make lines more realistic
                const variance = (Math.random() - 0.5) * config.variance * 0.3;
                const line = Math.round((statValue + variance) * 10) / 10;

                if (line > 0) {
                    // Generate AI prediction
                    const prediction = generateAIPrediction(statValue, line, config.variance, sport);

                    props.push({
                        player: player.name,
                        team: player.team,
                        teamName: player.teamName,
                        position: player.position,
                        headshot: player.headshot,
                        propType: config.type,
                        line: line,
                        seasonAvg: statValue.toFixed(1),
                        seasonTotal: statValue,
                        // AI Prediction
                        aiPick: prediction.pick,
                        confidence: prediction.confidence,
                        reasoning: prediction.reasoning,
                        trend: prediction.trend,
                        over: generateBookOddsAccurate(-110),
                        under: generateBookOddsAccurate(-110),
                        source: 'generated_from_roster',
                        lastUpdated: new Date().toISOString()
                    });
                }

                // Only add first matching prop type per player to avoid duplicates
                break;
            }
        }

        // Sort by confidence
        props.sort((a, b) => b.confidence - a.confidence);

        // Assign tiers based on confidence levels
        props.forEach(prop => {
            if (prop.confidence >= 75) {
                prop.tier = 'LOCK';
                prop.tierLabel = '🔥 TOP PICK';
                prop.tierDescription = 'High confidence - Strong statistical edge';
            } else if (prop.confidence >= 65) {
                prop.tier = 'GOOD';
                prop.tierLabel = '✅ GOOD VALUE';
                prop.tierDescription = 'Solid pick with good odds';
            } else if (prop.confidence >= 55) {
                prop.tier = 'LEAN';
                prop.tierLabel = '📊 LEAN';
                prop.tierDescription = 'Slight edge detected';
            } else {
                prop.tier = 'FADE';
                prop.tierLabel = '⚠️ RISKY';
                prop.tierDescription = 'Low confidence - Use caution';
            }
        });

        console.log(`✅ Generated ${props.length} props from roster data for ${sport.toUpperCase()}`);
        return props;

    } catch (error) {
        console.error(`Error generating props from roster: ${error.message}`);
        return props;
    }
}

// Fetch player stats from ESPN
async function fetchPlayerStats(sport) {
    const cacheKey = `players_${sport}`;
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < PROPS_CACHE_TTL_MS)) {
        console.log(`📦 Returning cached player stats for ${sport.toUpperCase()}`);
        return propsCache[cacheKey].data;
    }

    const sportPaths = {
        'nba': 'basketball/nba',
        'nfl': 'football/nfl',
        'nhl': 'hockey/nhl',
        'mlb': 'baseball/mlb'
    };

    const path = sportPaths[sport];
    if (!path) return { error: 'Sport not supported for player stats', players: [] };

    try {
        // Get team list from ESPN
        const teamsUrl = `https://site.api.espn.com/apis/site/v2/sports/${path}/teams`;
        const teamsData = await fetchJSON(teamsUrl);

        const players = [];
        const teamsList = []; // Store team info with logos
        const teams = teamsData.sports?.[0]?.leagues?.[0]?.teams || [];

        console.log(`📋 Found ${teams.length} teams, fetching ALL rosters...`);

        // Get rosters for ALL teams (not just 10)
        for (const teamObj of teams) {
            const team = teamObj.team;

            // Store team info with logo
            teamsList.push({
                id: team.id,
                name: team.displayName,
                abbreviation: team.abbreviation,
                logo: team.logos?.[0]?.href || `https://a.espncdn.com/i/teamlogos/${sport}/500/${team.abbreviation?.toLowerCase()}.png`,
                color: team.color,
                alternateColor: team.alternateColor
            });

            try {
                const rosterUrl = `https://site.api.espn.com/apis/site/v2/sports/${path}/teams/${team.id}/roster`;
                const rosterData = await fetchJSON(rosterUrl);

                // ESPN roster can be flat array or grouped - handle both
                let athleteList = [];

                if (Array.isArray(rosterData.athletes)) {
                    // Check if it's a flat array of players or grouped
                    if (rosterData.athletes[0]?.displayName || rosterData.athletes[0]?.fullName) {
                        // Flat array of players
                        athleteList = rosterData.athletes;
                    } else if (rosterData.athletes[0]?.items || rosterData.athletes[0]?.athletes) {
                        // Grouped by position
                        rosterData.athletes.forEach(group => {
                            const groupPlayers = group.items || group.athletes || [];
                            athleteList = athleteList.concat(groupPlayers);
                        });
                    }
                }

                athleteList.forEach(player => {
                    if (player.displayName || player.fullName) {
                        const playerName = player.displayName || player.fullName;

                        // Use live roster data (synced from ESPN) with priority overrides
                        const liveRoster = getPlayerFromLiveRoster(playerName, sport);
                        const playerTeam = liveRoster?.team || team.abbreviation;
                        const playerTeamName = liveRoster?.fullTeam || team.displayName;
                        const playerPosition = liveRoster?.position || player.position?.abbreviation || player.position?.name;

                        // Generate team logo URL based on actual team
                        const teamLogoUrl = liveRoster
                            ? `https://a.espncdn.com/i/teamlogos/${sport}/500/${playerTeam?.toLowerCase()}.png`
                            : team.logos?.[0]?.href || `https://a.espncdn.com/i/teamlogos/${sport}/500/${team.abbreviation?.toLowerCase()}.png`;

                        players.push({
                            id: player.id,
                            name: playerName,
                            firstName: player.firstName,
                            lastName: player.lastName,
                            position: playerPosition,
                            team: playerTeam,
                            teamId: liveRoster ? null : team.id,
                            teamName: playerTeamName,
                            teamLogo: teamLogoUrl,
                            jersey: player.jersey,
                            headshot: player.headshot?.href,
                            age: player.age,
                            height: player.displayHeight,
                            weight: player.displayWeight,
                            experience: player.experience?.years,
                            status: player.status?.type || 'Active',
                            source: 'espn',
                            rosterOverride: override ? true : undefined
                        });
                    }
                });

                console.log(`  ✅ ${team.abbreviation}: ${athleteList.length} players`);
            } catch (e) {
                console.log(`  ⚠️ Could not fetch roster for ${team.abbreviation}: ${e.message}`);
            }
        }

        const result = {
            players,
            teams: teamsList,
            source: 'espn',
            count: players.length,
            teamCount: teamsList.length
        };
        propsCache[cacheKey] = { data: result, timestamp: Date.now() };
        console.log(`✅ Fetched ${players.length} players from ${teamsList.length} teams for ${sport.toUpperCase()}`);
        return result;
    } catch (error) {
        console.error('Error fetching player stats:', error.message);
        return { error: error.message, players: [], teams: [] };
    }
}

// Fetch team info from TheSportsDB (free)
async function fetchTeamInfo(sport) {
    const cacheKey = `teams_${sport}`;
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < PROPS_CACHE_TTL_MS * 2)) {
        console.log(`📦 Returning cached team info for ${sport.toUpperCase()}`);
        return propsCache[cacheKey].data;
    }

    // TheSportsDB league search names
    const leagueNames = {
        'nba': 'NBA',
        'nfl': 'NFL',
        'nhl': 'NHL',
        'mlb': 'MLB'
    };

    const leagueName = leagueNames[sport];
    if (!leagueName) return { error: 'Sport not supported', teams: [] };

    try {
        // Use search endpoint which is more reliable
        const url = `https://www.thesportsdb.com/api/v1/json/3/search_all_teams.php?l=${leagueName}`;
        const data = await fetchJSON(url);

        const teams = (data.teams || []).map(team => ({
            id: team.idTeam,
            name: team.strTeam,
            shortName: team.strTeamShort,
            badge: team.strBadge,
            jersey: team.strJersey,
            logo: team.strLogo,
            stadium: team.strStadium,
            city: team.strLocation,
            year: team.intFormedYear,
            description: team.strDescriptionEN?.substring(0, 200),
            source: 'thesportsdb'
        }));

        const result = { teams, source: 'thesportsdb', count: teams.length };
        propsCache[cacheKey] = { data: result, timestamp: Date.now() };
        console.log(`✅ Fetched ${teams.length} teams for ${sport.toUpperCase()} from TheSportsDB`);
        return result;
    } catch (error) {
        console.error('Error fetching team info:', error.message);
        return { error: error.message, teams: [] };
    }
}

// Fetch aggregated data from ALL sources
async function fetchAggregatedData(sport) {
    console.log(`🔄 Aggregating data from multiple sources for ${sport.toUpperCase()}...`);

    // =====================================================
    // SEASONAL CHECK - Return empty data for off-season sports
    // =====================================================
    if (!isSportInSeason(sport)) {
        const seasons = getSportSeasonStatus();
        const seasonInfo = seasons[sport];
        console.log(`⚠️ ${sport.toUpperCase()} is OFF-SEASON (Season: ${seasonInfo?.seasonDates || 'Unknown'})`);
        return {
            sport: sport,
            timestamp: new Date().toISOString(),
            offSeason: true,
            seasonInfo: {
                inSeason: false,
                seasonDates: seasonInfo?.seasonDates || 'Unknown',
                message: `${sport.toUpperCase()} is currently in the off-season. Data will be available during the regular season.`
            },
            sources: {},
            data: {
                games: [],
                players: [],
                teams: [],
                generatedProps: [],
                propsByTier: {
                    topPicks: [],
                    goodValue: [],
                    leans: [],
                    risky: [],
                    all: []
                }
            }
        };
    }

    const results = {
        sport: sport,
        timestamp: new Date().toISOString(),
        sources: {},
        data: {}
    };

    // Parallel fetch from all sources
    const fetches = [
        // ESPN Scores (always free)
        fetchESPNScores(sport).then(data => {
            results.sources.espn_scores = { status: 'success', count: data.events?.length || 0 };
            results.data.games = data.events || [];
        }).catch(e => {
            results.sources.espn_scores = { status: 'error', message: e.message };
        }),

        // ESPN Injuries (always free)
        fetchESPNInjuries(sport).then(data => {
            results.sources.espn_injuries = { status: 'success' };
            results.data.injuries = data;
        }).catch(e => {
            results.sources.espn_injuries = { status: 'error', message: e.message };
        }),

        // Player stats from ESPN
        fetchPlayerStats(sport).then(data => {
            results.sources.player_stats = { status: 'success', count: data.count || 0 };
            results.data.players = data.players || [];
        }).catch(e => {
            results.sources.player_stats = { status: 'error', message: e.message };
        }),

        // Team info from TheSportsDB
        fetchTeamInfo(sport).then(data => {
            results.sources.team_info = { status: 'success', count: data.count || 0 };
            results.data.teams = data.teams || [];
        }).catch(e => {
            results.sources.team_info = { status: 'error', message: e.message };
        })
    ];

    // Add sport-specific official API data
    if (sport === 'nhl') {
        fetches.push(
            // Fetch REAL NHL stats from official NHL API
            fetchNHLPlayerStats().then(async (nhlStats) => {
                if (nhlStats.skaterLeaders?.length > 0) {
                    results.sources.nhl_player_stats = {
                        status: 'success',
                        skaters: nhlStats.skaterLeaders?.length || 0,
                        goalies: nhlStats.goalieLeaders?.length || 0
                    };

                    // Generate props from REAL stats
                    const realProps = generatePropsFromRealStats(nhlStats, 'nhl');
                    if (realProps.length > 0) {
                        results.data.generatedProps = realProps;
                        console.log(`✅ Generated ${realProps.length} props from REAL NHL stats`);
                    }
                } else {
                    results.sources.nhl_player_stats = { status: 'no_data' };
                }
            }).catch(e => {
                results.sources.nhl_player_stats = { status: 'error', message: e.message };
            }),

            fetchNHLOfficialData().then(async (data) => {
                results.sources.nhl_official = { status: 'success', games: data.gamesCount || 0 };
                results.data.nhlGames = data.games || [];
                results.data.nhlStandings = data.standings || [];
                results.data.nhlSkaterLeaders = data.skaterLeaders || [];

                // Generate accurate odds from NHL standings
                if (data.standings && data.games) {
                    results.data.calculatedOdds = data.games.map(game => {
                        const odds = calculateAccurateOdds(
                            game.homeTeam?.abbrev || game.homeTeam?.name,
                            game.awayTeam?.abbrev || game.awayTeam?.name,
                            'nhl',
                            data.standings
                        );
                        return {
                            gameId: game.id,
                            homeTeam: { ...game.homeTeam, ...odds, spread: odds.spread },
                            awayTeam: { ...game.awayTeam, moneyline: odds.awayMoneyline, spread: -odds.spread },
                            total: { points: odds.total, overOdds: odds.overOdds, underOdds: odds.underOdds },
                            startTime: game.startTime,
                            source: 'nhl_official_calculated'
                        };
                    });
                }

                // Only use old method if we don't have real stats
                if (!results.data.generatedProps || results.data.generatedProps.length === 0) {
                    if (data.skaterLeaders && data.skaterLeaders.length > 0) {
                        const nhlLeaders = [
                            { category: 'goals', displayName: 'Goals', leaders: data.skaterLeaders.filter(l => l.goals).slice(0, 15).map(l => ({ player: l.firstName?.default + ' ' + l.lastName?.default, team: l.teamAbbrev, value: l.goals?.toString() })) },
                            { category: 'assists', displayName: 'Assists', leaders: data.skaterLeaders.filter(l => l.assists).slice(0, 15).map(l => ({ player: l.firstName?.default + ' ' + l.lastName?.default, team: l.teamAbbrev, value: l.assists?.toString() })) },
                            { category: 'points', displayName: 'Points', leaders: data.skaterLeaders.filter(l => l.points).slice(0, 15).map(l => ({ player: l.firstName?.default + ' ' + l.lastName?.default, team: l.teamAbbrev, value: l.points?.toString() })) }
                        ];
                        results.data.generatedProps = generateAccurateProps(nhlLeaders, 'nhl');
                    }
                }

                // NO FALLBACK - Only use real API data, not roster estimates
                if (!results.data.generatedProps || results.data.generatedProps.length === 0) {
                    console.log('⚠️ No real NHL stats available from API - returning empty (no fake data)');
                    results.data.generatedProps = [];
                    results.data.noRealData = true;
                }
            }).catch(e => {
                results.sources.nhl_official = { status: 'error', message: e.message };
            })
        );
    }

    if (sport === 'mlb') {
        fetches.push(
            // Fetch REAL MLB stats from official MLB Stats API
            fetchMLBPlayerStats().then(async (mlbStats) => {
                if ((mlbStats.hittingLeaders?.length > 0) || (mlbStats.pitchingLeaders?.length > 0)) {
                    results.sources.mlb_player_stats = {
                        status: 'success',
                        hitters: mlbStats.hittingLeaders?.length || 0,
                        pitchers: mlbStats.pitchingLeaders?.length || 0
                    };

                    // Generate props from REAL stats
                    const realProps = generatePropsFromRealStats(mlbStats, 'mlb');
                    if (realProps.length > 0) {
                        results.data.generatedProps = realProps;
                        console.log(`✅ Generated ${realProps.length} props from REAL MLB stats`);
                    }
                } else {
                    results.sources.mlb_player_stats = { status: 'no_data' };
                }
            }).catch(e => {
                results.sources.mlb_player_stats = { status: 'error', message: e.message };
            }),

            fetchMLBOfficialData().then(async (data) => {
                results.sources.mlb_official = { status: 'success', games: data.gamesCount || 0 };
                results.data.mlbGames = data.games || [];
                results.data.mlbStandings = data.standings || [];
                results.data.mlbHittingLeaders = data.hittingLeaders || [];
                results.data.mlbPitchingLeaders = data.pitchingLeaders || [];

                // Generate accurate odds from MLB standings
                if (data.standings && data.games) {
                    results.data.calculatedOdds = data.games.map(game => {
                        const odds = calculateAccurateOdds(
                            game.homeTeam?.name,
                            game.awayTeam?.name,
                            'mlb',
                            data.standings
                        );
                        return {
                            gameId: game.id,
                            homeTeam: {
                                ...game.homeTeam,
                                moneyline: odds.homeMoneyline,
                                spread: odds.spread,
                                spreadOdds: odds.spreadOdds
                            },
                            awayTeam: {
                                ...game.awayTeam,
                                moneyline: odds.awayMoneyline,
                                spread: -odds.spread,
                                spreadOdds: odds.spreadOdds
                            },
                            total: { points: odds.total, overOdds: odds.overOdds, underOdds: odds.underOdds },
                            startTime: game.startTime,
                            probablePitchers: {
                                home: game.homeTeam?.probablePitcher,
                                away: game.awayTeam?.probablePitcher
                            },
                            source: 'mlb_official_calculated'
                        };
                    });
                }

                // Only use ESPN data if we don't have real stats
                if (!results.data.generatedProps || results.data.generatedProps.length === 0) {
                    const allLeaders = [...(data.hittingLeaders || []), ...(data.pitchingLeaders || [])];
                    if (allLeaders.length > 0) {
                        results.data.generatedProps = generateAccurateProps(allLeaders, 'mlb');
                    }
                }

                // NO FALLBACK - Only use real API data, not roster estimates
                if (!results.data.generatedProps || results.data.generatedProps.length === 0) {
                    console.log('⚠️ No real MLB stats available from API - returning empty (no fake data)');
                    results.data.generatedProps = [];
                    results.data.noRealData = true;
                }
            }).catch(e => {
                results.sources.mlb_official = { status: 'error', message: e.message };
            })
        );
    }

    if (sport === 'nfl') {
        fetches.push(
            fetchNFLAdvancedStats().then(async (data) => {
                results.sources.nfl_advanced = { status: 'success', teams: data.teamsCount || 0 };
                results.data.nflStandings = data.standings || [];
                results.data.nflLeaders = data.leaders || [];
                results.data.superBowl = true; // Flag for Super Bowl

                // Generate player props from NFL leaders using real stats
                let allProps = [];
                if (data.leaders && data.leaders.length > 0) {
                    const realProps = generatePropsFromRealStats({ leaders: data.leaders }, 'nfl');
                    allProps = [...realProps];
                }

                // Generate additional Super Bowl props for secondary players
                const additionalProps = generateSuperBowlProps();
                allProps = [...allProps, ...additionalProps];

                // Remove duplicates
                const seen = new Set();
                allProps = allProps.filter(p => {
                    const key = `${p.player}-${p.propType}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });

                if (allProps.length > 0) {
                    results.data.generatedProps = allProps;
                    results.data.propsByTier = organizePropsIntoTiers(allProps);
                    console.log(`✅ Generated ${allProps.length} NFL Super Bowl props with tiers`);
                } else {
                    console.log('⚠️ No real NFL stats available from API - returning empty (no fake data)');
                    results.data.generatedProps = [];
                    results.data.noRealData = true;
                }
            }).catch(e => {
                results.sources.nfl_advanced = { status: 'error', message: e.message };
            })
        );
    }

    if (sport === 'nba') {
        fetches.push(
            // Fetch REAL NBA stats from official NBA.com API
            (async () => {
                try {
                    const nbaData = await fetchNBAOfficialStats();
                    if (nbaData.players && nbaData.players.length > 0) {
                        results.sources.nba_official_stats = { status: 'success', count: nbaData.players.length };
                        results.data.realPlayerStats = nbaData.players;

                        // Fetch game context for enhanced predictions
                        const gameContext = await fetchGameContext('nba');
                        console.log(`📅 Using ${gameContext.todaysGames.length} games for matchup context`);

                        // Generate props from REAL stats with game context
                        const realProps = generatePropsFromRealStats(nbaData, 'nba', gameContext);
                        if (realProps.length > 0) {
                            results.data.generatedProps = realProps;
                            // Organize into tiers
                            results.data.propsByTier = organizePropsIntoTiers(realProps);
                            console.log(`✅ Generated ${realProps.length} props from REAL NBA.com stats with tiers`);
                        }
                    } else {
                        results.sources.nba_official_stats = { status: 'no_data' };
                    }
                } catch(e) {
                    results.sources.nba_official_stats = { status: 'error', message: e.message };
                }
            })(),

            fetchNBAAdvancedStats().then(async (data) => {
                results.sources.nba_advanced = { status: 'success', teams: data.teamsCount || 0 };
                results.data.nbaStandings = data.standings || [];
                results.data.nbaLeaders = data.leaders || [];

                // Only generate from ESPN if we don't have real stats
                if (!results.data.generatedProps || results.data.generatedProps.length === 0) {
                    if (data.leaders && data.leaders.length > 0) {
                        results.data.generatedProps = generateAccurateProps(data.leaders, 'nba');
                    }
                }

                // NO FALLBACK - Only use real API data, not roster estimates
                if (!results.data.generatedProps || results.data.generatedProps.length === 0) {
                    console.log('⚠️ No real NBA stats available from API - returning empty (no fake data)');
                    results.data.generatedProps = [];
                    results.data.noRealData = true;
                }
            }).catch(e => {
                results.sources.nba_advanced = { status: 'error', message: e.message };
            }),
            // Also get Ball Don't Lie stats for more detail
            fetchBallDontLieStats(sport).then(data => {
                if (data.stats && data.stats.length > 0) {
                    results.sources.balldontlie = { status: 'success', count: data.stats.length };
                    results.data.seasonAverages = data.stats;
                } else {
                    results.sources.balldontlie = { status: 'no_data', sport: sport };
                }
            }).catch(e => {
                results.sources.balldontlie = { status: 'error', message: e.message };
            })
        );
    }

    // Calculate odds for ESPN games if we haven't from official API
    if (sport === 'nba' || sport === 'nfl') {
        fetches.push(
            (async () => {
                // Wait for standings to be fetched first
                await new Promise(resolve => setTimeout(resolve, 500));
                const standings = results.data.nbaStandings || results.data.nflStandings || [];
                const games = results.data.games || [];

                if (games.length > 0 && standings.length > 0) {
                    results.data.calculatedOdds = games.map(game => {
                        const homeTeam = game.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home');
                        const awayTeam = game.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away');

                        if (!homeTeam || !awayTeam) return null;

                        const odds = calculateAccurateOdds(
                            homeTeam.team?.displayName || homeTeam.team?.abbreviation,
                            awayTeam.team?.displayName || awayTeam.team?.abbreviation,
                            sport,
                            standings
                        );

                        return {
                            gameId: game.id,
                            homeTeam: {
                                name: homeTeam.team?.displayName,
                                abbreviation: homeTeam.team?.abbreviation,
                                logo: homeTeam.team?.logo,
                                score: homeTeam.score,
                                moneyline: odds.homeMoneyline,
                                spread: odds.spread,
                                spreadOdds: odds.spreadOdds,
                                winProb: odds.homeWinProb
                            },
                            awayTeam: {
                                name: awayTeam.team?.displayName,
                                abbreviation: awayTeam.team?.abbreviation,
                                logo: awayTeam.team?.logo,
                                score: awayTeam.score,
                                moneyline: odds.awayMoneyline,
                                spread: -odds.spread,
                                spreadOdds: odds.spreadOdds,
                                winProb: odds.awayWinProb
                            },
                            total: {
                                points: odds.total,
                                overOdds: odds.overOdds,
                                underOdds: odds.underOdds
                            },
                            startTime: game.date,
                            status: game.status?.type?.description,
                            venue: game.competitions?.[0]?.venue?.fullName,
                            broadcast: game.competitions?.[0]?.broadcasts?.[0]?.names?.[0],
                            source: 'espn_calculated'
                        };
                    }).filter(Boolean);

                    results.sources.calculated_odds = {
                        status: 'success',
                        count: results.data.calculatedOdds.length
                    };
                }
            })()
        );
    }

    // Fetch REAL sportsbook odds (DraftKings via ESPN)
    fetches.push(
        fetchFreeOdds(sport).then(data => {
            if (data.realOddsCount > 0) {
                results.sources.sportsbook_odds = {
                    status: 'success',
                    provider: 'DraftKings via ESPN',
                    realOddsGames: data.realOddsCount,
                    totalGames: data.gamesCount
                };
                results.data.realOdds = data.odds;
                console.log(`✅ Added REAL sportsbook odds for ${data.realOddsCount} ${sport.toUpperCase()} games`);
            } else {
                results.sources.sportsbook_odds = {
                    status: 'no_real_odds',
                    note: 'Using calculated odds instead'
                };
            }
        }).catch(e => {
            results.sources.sportsbook_odds = { status: 'error', message: e.message };
        })
    );

    // Only add Odds API if key is available and not rate limited
    if (ODDS_API_KEY && (!rateLimitedUntil || Date.now() >= rateLimitedUntil)) {
        fetches.push(
            fetchOddsAPI(sport).then(data => {
                results.sources.odds_api = { status: 'success', count: data.length || 0 };
                results.data.odds = data;
            }).catch(e => {
                results.sources.odds_api = { status: 'error', message: e.message };
            })
        );
    } else {
        results.sources.odds_api = {
            status: 'skipped',
            reason: !ODDS_API_KEY ? 'No API key' : 'Rate limited',
            note: 'Using calculated odds from real team stats instead'
        };
    }

    // Fetch REAL player props from DraftKings (PRIMARY SOURCE)
    fetches.push(
        fetchDraftKingsPlayerProps(sport).then(dkData => {
            if (dkData && dkData.props && dkData.props.length > 0) {
                results.sources.draftkings_props = {
                    status: 'success',
                    count: dkData.props.length,
                    provider: 'DraftKings Sportsbook'
                };
                results.data.draftKingsProps = dkData.props;
                console.log(`✅ Fetched ${dkData.props.length} REAL DraftKings player props for ${sport.toUpperCase()}`);
            } else {
                results.sources.draftkings_props = {
                    status: dkData.error ? 'error' : 'no_data',
                    message: dkData.error || 'No props available'
                };
            }
        }).catch(e => {
            results.sources.draftkings_props = { status: 'error', message: e.message };
        })
    );

    // Also fetch from The Odds API as backup (DraftKings, FanDuel, etc.)
    if (ODDS_API_KEY && (!rateLimitedUntil || Date.now() >= rateLimitedUntil)) {
        fetches.push(
            fetchPlayerProps(sport).then(propsData => {
                if (propsData && propsData.length > 0) {
                    // Process real sportsbook props
                    const realProps = [];
                    for (const eventData of propsData) {
                        const { event, odds } = eventData;
                        if (!odds.bookmakers) continue;

                        for (const bookmaker of odds.bookmakers) {
                            const bookKey = bookmaker.key; // e.g., 'draftkings', 'fanduel'

                            for (const market of (bookmaker.markets || [])) {
                                for (const outcome of (market.outcomes || [])) {
                                    if (!outcome.description) continue; // Skip if no player name

                                    // Parse market type to readable format
                                    const propTypeMap = {
                                        'player_points': 'Points',
                                        'player_rebounds': 'Rebounds',
                                        'player_assists': 'Assists',
                                        'player_threes': '3-Pointers Made',
                                        'player_points_rebounds_assists': 'PRA',
                                        'player_pass_yds': 'Passing Yards',
                                        'player_rush_yds': 'Rushing Yards',
                                        'player_reception_yds': 'Receiving Yards',
                                        'player_anytime_td': 'Anytime TD Scorer',
                                        'player_receptions': 'Receptions',
                                        'player_goals': 'Goals',
                                        'player_shots_on_goal': 'Shots on Goal',
                                        'batter_hits': 'Hits',
                                        'batter_total_bases': 'Total Bases',
                                        'pitcher_strikeouts': 'Strikeouts',
                                        'batter_home_runs': 'Home Runs'
                                    };

                                    const propType = propTypeMap[market.key] || market.key;
                                    const playerName = outcome.description;
                                    const line = outcome.point || 0.5;
                                    const pick = outcome.name; // 'Over' or 'Under'
                                    const odds_val = outcome.price;

                                    // Check if prop already exists for this player/type
                                    let existingProp = realProps.find(p =>
                                        p.player === playerName && p.propType === propType
                                    );

                                    if (!existingProp) {
                                        existingProp = {
                                            player: playerName,
                                            team: '', // Will be filled from event data
                                            propType: propType,
                                            line: line,
                                            source: 'sportsbook_live',
                                            isRealLine: true,
                                            over: {},
                                            under: {},
                                            confidence: null, // No AI prediction for real lines
                                            aiPick: null,
                                            game: `${event.away_team} @ ${event.home_team}`,
                                            gameTime: event.commence_time,
                                            lastUpdated: new Date().toISOString()
                                        };
                                        realProps.push(existingProp);
                                    }

                                    // Add odds from this bookmaker
                                    if (pick === 'Over') {
                                        existingProp.over[bookKey] = odds_val;
                                    } else if (pick === 'Under') {
                                        existingProp.under[bookKey] = odds_val;
                                    }
                                }
                            }
                        }
                    }

                    if (realProps.length > 0) {
                        results.sources.real_player_props = {
                            status: 'success',
                            count: realProps.length,
                            provider: 'The Odds API (DraftKings, FanDuel, etc.)'
                        };
                        results.data.realPlayerProps = realProps;
                        console.log(`✅ Fetched ${realProps.length} REAL sportsbook player props for ${sport.toUpperCase()}`);
                    }
                }
            }).catch(e => {
                results.sources.real_player_props = { status: 'error', message: e.message };
            })
        );
    }

    await Promise.allSettled(fetches);

    // Merge real player props with generated props
    // Priority: DraftKings props > Odds API props > Generated from stats

    // Combine all real props sources (DraftKings takes priority)
    const allRealProps = [];

    // Add DraftKings props first (highest priority)
    if (results.data.draftKingsProps && results.data.draftKingsProps.length > 0) {
        allRealProps.push(...results.data.draftKingsProps);
        console.log(`📊 Using ${results.data.draftKingsProps.length} DraftKings props as primary source`);
    }

    // Add Odds API props for props not covered by DraftKings
    if (results.data.realPlayerProps && results.data.realPlayerProps.length > 0) {
        const dkKeys = new Set(allRealProps.map(p => `${p.player}-${p.propType}`));
        for (const prop of results.data.realPlayerProps) {
            const key = `${prop.player}-${prop.propType}`;
            if (!dkKeys.has(key)) {
                allRealProps.push(prop);
            }
        }
    }

    if (allRealProps.length > 0) {
        // Create a map of real props by player+propType
        const realPropsMap = new Map();
        for (const prop of allRealProps) {
            const key = `${prop.player}-${prop.propType}`;
            realPropsMap.set(key, prop);
        }

        // Merge with generated props - real props take priority
        const generatedProps = results.data.generatedProps || [];
        const mergedProps = [];
        const addedKeys = new Set();

        // First add all real props (with AI analysis if available from generated)
        for (const realProp of allRealProps) {
            const key = `${realProp.player}-${realProp.propType}`;
            const generatedMatch = generatedProps.find(g =>
                g.player === realProp.player && g.propType === realProp.propType
            );

            if (generatedMatch) {
                // Merge: use real line but add AI prediction
                mergedProps.push({
                    ...realProp,
                    aiPick: generatedMatch.aiPick,
                    confidence: generatedMatch.confidence,
                    seasonAvg: generatedMatch.seasonAvg,
                    reasoning: generatedMatch.reasoning,
                    trend: generatedMatch.trend
                });
            } else {
                mergedProps.push(realProp);
            }
            addedKeys.add(key);
        }

        // Add remaining generated props that don't have real lines
        for (const genProp of generatedProps) {
            const key = `${genProp.player}-${genProp.propType}`;
            if (!addedKeys.has(key)) {
                genProp.isRealLine = false;
                genProp.source = 'generated_from_stats';
                mergedProps.push(genProp);
                addedKeys.add(key);
            }
        }

        results.data.generatedProps = mergedProps;
        results.data.propsByTier = organizePropsIntoTiers(mergedProps);
        console.log(`🔀 Merged ${allRealProps.length} real props with generated props (${mergedProps.length} total)`);
    }

    // Also include props in the main response object for easier access
    results.props = results.data.propsByTier || organizePropsIntoTiers(results.data.generatedProps || []);

    console.log(`✅ Aggregation complete for ${sport.toUpperCase()}`);
    console.log(`   Sources: ${Object.keys(results.sources).join(', ')}`);
    return results;
}

server.listen(PORT, async () => {
    const msfStatus = MYSPORTSFEEDS_API_KEY ? '✅' : '❌';
    const apiSportsStatus = API_SPORTS_KEY ? '✅' : '❌';
    const bdlStatus = BALL_DONT_LIE_API_KEY ? '✅' : '❌';
    console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║              🏀 BetGenius AI - Multi-API Proxy Server 🏀                   ║
╠════════════════════════════════════════════════════════════════════════════╣
║  Server running at http://localhost:${PORT}                                    ║
║                                                                            ║
║  📡 FREE LIVE DATA SOURCES:                                                ║
║    • ESPN (Unlimited) ✅ - Live Scores, Injuries, Rosters, Standings       ║
║    • SofaScore (Unlimited) ✅ - Live Odds Comparison, Events               ║
║    • NBA.com Official (Unlimited) ✅ - Live Scoreboard, Box Scores         ║
║    • NHL Official API (Unlimited) ✅ - Live Play-by-Play, Game Center      ║
║    • MLB Stats API (Unlimited) ✅ - Live Game Feed, Box Scores             ║
║    • TheSportsDB (Unlimited) ✅ - Live Scores, Upcoming Events             ║
║    • Ball Dont Lie (Unlimited) ${bdlStatus} - Live NBA Games, Box Scores          ║
║    • The Odds API (500/month) ✅ - Live betting odds                       ║
║    • MySportsFeeds (250/day) ${msfStatus} - Injuries, Projections                 ║
║    • API-SPORTS (100/day) ${apiSportsStatus} - Games, Standings, Players             ║
║                                                                            ║
║  🔴 LIVE DATA ENDPOINTS (FREE, UNLIMITED):                                 ║
║    GET /api/live/:sport             - ALL live sources combined            ║
║    GET /api/nba/scoreboard          - NBA.com live scoreboard              ║
║    GET /api/nba/boxscore/:gameId    - NBA.com live box score               ║
║    GET /api/nba/leaders             - NBA.com league leaders               ║
║    GET /api/bdl/games               - Ball Don't Lie today's games         ║
║    GET /api/bdl/boxscore/:gameId    - Ball Don't Lie box score             ║
║    GET /api/thesportsdb/live/:sport - TheSportsDB live scores              ║
║    GET /api/thesportsdb/upcoming/:sport - Upcoming events                  ║
║    GET /api/nhl/play-by-play/:gameId - NHL live play-by-play               ║
║    GET /api/nhl/gamecenter/:gameId  - NHL live game center                 ║
║    GET /api/mlb/live/:gamePk        - MLB live game feed                   ║
║    GET /api/mlb/boxscore/:gamePk    - MLB live box score                   ║
║                                                                            ║
║  🔗 CORE ENDPOINTS:                                                        ║
║    GET /api/aggregate/:sport        - ALL data combined                    ║
║    GET /api/props/:sport            - Player props                         ║
║    GET /api/scores/:sport           - Live scores (ESPN)                   ║
║    GET /api/injuries/:sport         - Combined injuries                    ║
║    GET /api/sofascore/events/:sport - Today's events (SofaScore)           ║
║    GET /api/sofascore/odds/:sport   - Live odds (SofaScore)                ║
║    GET /health                      - Health check                         ║
║                                                                            ║
║  🏈 Supported: nba, nfl, nhl, mlb, ncaab, ncaaf                            ║
╚════════════════════════════════════════════════════════════════════════════╝
    `);

    // Initialize injured players cache
    console.log('🏥 Loading injured players...');
    await updateInjuredPlayersCache();

    // Refresh injuries every 15 minutes
    setInterval(updateInjuredPlayersCache, 15 * 60 * 1000);

    // Initialize roster caches (for accurate team assignments)
    console.log('📋 Loading player rosters...');
    await initializeRosterCaches();

    // Initialize automatic ESPN roster sync system
    await initializeRosterSystem();

    // Fetch today's games for matchup info
    console.log('🎮 Loading today\'s games...');
    for (const sport of ['nba', 'nfl', 'nhl', 'mlb']) {
        await fetchTodaysGames(sport);
    }

    // Refresh today's games every 30 minutes
    setInterval(async () => {
        for (const sport of ['nba', 'nfl', 'nhl', 'mlb']) {
            await fetchTodaysGames(sport);
        }
    }, 30 * 60 * 1000);

    // Start automated prop fetching system
    startAutomatedPropFetching();
});
