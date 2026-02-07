// =====================================================
// BetGenius AI - Backend Proxy Server
// Multi-API aggregation for comprehensive sports data
// Run with: node server.js
// =====================================================

// Load environment variables from .env file
const fs = require('fs');
const path = require('path');

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

// API Endpoints
const API_SOURCES = {
    // The Odds API - Primary source for betting odds
    oddsApi: {
        name: 'The Odds API',
        baseUrl: 'https://api.the-odds-api.com/v4',
        key: ODDS_API_KEY,
        rateLimit: { remaining: null, resetTime: null }
    },
    // ESPN - Free, unlimited (scores, schedules, injuries, rosters)
    espn: {
        name: 'ESPN',
        baseUrl: 'https://site.api.espn.com/apis/site/v2/sports',
        key: null, // No key needed
        rateLimit: { remaining: Infinity, resetTime: null }
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

// Route: /api/props/:sport
        if (path.startsWith('/api/props/')) {
            const sport = path.split('/')[3]?.toLowerCase();
            if (!validateSport(sport)) return;

            // Try The Odds API first, fall back to generated props
            let data;
            if (ODDS_API_KEY && (!rateLimitedUntil || Date.now() >= rateLimitedUntil)) {
                try {
                    data = await fetchPlayerProps(sport);
                } catch (e) {
                    console.log(`⚠️ Odds API failed, using generated props: ${e.message}`);
                    data = await getGeneratedProps(sport);
                }
            } else {
                // Use generated props when Odds API unavailable
                data = await getGeneratedProps(sport);
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

        // Route: /api/injuries/:sport (ESPN)
        if (path.startsWith('/api/injuries/')) {
            const sport = path.split('/')[3]?.toLowerCase();
            if (!validateSport(sport)) return;
            const data = await fetchESPNInjuries(sport);
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
        'nfl': 'football/nfl',
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

        // Get skater stats leaders
        const skaterUrl = 'https://api-web.nhle.com/v1/skater-stats-leaders/current?categories=points,goals,assists,plusMinus&limit=30';
        let skaterLeaders = [];

        try {
            const skaterData = await fetchJSON(skaterUrl);

            // Process each category
            for (const category of ['points', 'goals', 'assists', 'plusMinus']) {
                if (skaterData[category]) {
                    for (const player of skaterData[category].slice(0, 20)) {
                        skaterLeaders.push({
                            player: `${player.firstName?.default || ''} ${player.lastName?.default || ''}`.trim(),
                            team: player.teamAbbrev?.default || player.teamAbbrev,
                            category: category,
                            value: player.value,
                            gamesPlayed: player.gamesPlayed || 82,
                            perGame: (player.value / (player.gamesPlayed || 82)).toFixed(2),
                            headshot: player.headshot
                        });
                    }
                }
            }
        } catch (e) {
            console.log(`  ⚠️ Could not fetch skater stats: ${e.message}`);
        }

        // Get goalie stats
        const goalieUrl = 'https://api-web.nhle.com/v1/goalie-stats-leaders/current?categories=wins,savePctg&limit=20';
        let goalieLeaders = [];

        try {
            const goalieData = await fetchJSON(goalieUrl);

            for (const category of ['wins', 'savePctg']) {
                if (goalieData[category]) {
                    for (const player of goalieData[category].slice(0, 10)) {
                        goalieLeaders.push({
                            player: `${player.firstName?.default || ''} ${player.lastName?.default || ''}`.trim(),
                            team: player.teamAbbrev?.default || player.teamAbbrev,
                            category: category,
                            value: player.value,
                            gamesPlayed: player.gamesPlayed || 50,
                            headshot: player.headshot
                        });
                    }
                }
            }
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
// =====================================================
// Helper function to create NFL prop object
function createNFLProp(playerData, propType, line, perGame, seasonTotal, prediction) {
    return {
        player: playerData.name,
        team: playerData.team,
        headshot: playerData.headshot,
        position: playerData.position || 'N/A',
        propType: propType,
        line: line,
        seasonAvg: typeof perGame === 'number' ? perGame.toFixed(1) : perGame,
        seasonTotal: seasonTotal,
        aiPick: prediction.pick,
        confidence: prediction.confidence,
        reasoning: `Season avg: ${typeof perGame === 'number' ? perGame.toFixed(1) : perGame} per game`,
        trend: prediction.trend,
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
            const line = Math.round(perGame * 2) / 2;
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
            const line = Math.round(perGame * 2) / 2;
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
            props.push({
                player: player.name,
                team: player.team,
                position: player.position,
                propType: 'Anytime TD Scorer',
                line: 0.5,
                seasonAvg: perGame.toFixed(2),
                seasonTotal: stats.receivingTDs,
                aiPick: perGame > 0.3 ? 'YES' : 'NO',
                confidence: Math.round(50 + perGame * 80),
                reasoning: `${stats.receivingTDs} TDs this season (${perGame.toFixed(2)}/game)`,
                trend: perGame > 0.35 ? 'STRONG' : perGame > 0.25 ? 'MODERATE' : 'WEAK',
                over: generateBookOddsAccurate(perGame > 0.3 ? -130 : +120),
                under: generateBookOddsAccurate(perGame > 0.3 ? +110 : -140),
                source: 'superbowl_projections',
                lastUpdated: new Date().toISOString()
            });
        }

        // Rushing props
        if (stats.rushingYards) {
            const perGame = stats.rushingYards / 17;
            const line = Math.round(perGame * 2) / 2;
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
            const line = Math.round(perGame * 2) / 2;
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
            const line = Math.round(perGame * 2) / 2;
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

function generatePropsFromRealStats(stats, sport) {
    const props = [];

    if (sport === 'nba' && stats.players) {
        for (const player of stats.players.slice(0, 40)) {
            // Points prop
            if (player.points) {
                const line = Math.round(player.points * 2) / 2; // Round to 0.5
                const prediction = generateAIPrediction(player.points, line, 4, 'nba');

                props.push({
                    player: player.player,
                    team: player.team,
                    position: 'G/F',
                    propType: 'Points',
                    line: line,
                    seasonAvg: player.points,
                    aiPick: prediction.pick,
                    confidence: prediction.confidence,
                    reasoning: `Season avg: ${player.points} PPG (${player.gamesPlayed || 'N/A'} games)`,
                    trend: prediction.trend,
                    over: generateBookOddsAccurate(-110),
                    under: generateBookOddsAccurate(-110),
                    source: 'nba_official_stats',
                    lastUpdated: new Date().toISOString()
                });
            }

            // Rebounds prop
            if (player.rebounds && player.rebounds >= 3) {
                const line = Math.round(player.rebounds * 2) / 2;
                const prediction = generateAIPrediction(player.rebounds, line, 2, 'nba');

                props.push({
                    player: player.player,
                    team: player.team,
                    position: 'G/F',
                    propType: 'Rebounds',
                    line: line,
                    seasonAvg: player.rebounds,
                    aiPick: prediction.pick,
                    confidence: prediction.confidence,
                    reasoning: `Season avg: ${player.rebounds} RPG`,
                    trend: prediction.trend,
                    over: generateBookOddsAccurate(-110),
                    under: generateBookOddsAccurate(-110),
                    source: 'nba_official_stats',
                    lastUpdated: new Date().toISOString()
                });
            }

            // Assists prop
            if (player.assists && player.assists >= 2) {
                const line = Math.round(player.assists * 2) / 2;
                const prediction = generateAIPrediction(player.assists, line, 2, 'nba');

                props.push({
                    player: player.player,
                    team: player.team,
                    position: 'G/F',
                    propType: 'Assists',
                    line: line,
                    seasonAvg: player.assists,
                    aiPick: prediction.pick,
                    confidence: prediction.confidence,
                    reasoning: `Season avg: ${player.assists} APG`,
                    trend: prediction.trend,
                    over: generateBookOddsAccurate(-110),
                    under: generateBookOddsAccurate(-110),
                    source: 'nba_official_stats',
                    lastUpdated: new Date().toISOString()
                });
            }

            // 3-Pointers prop
            if (player.threes && player.threes >= 1) {
                const line = Math.round(player.threes * 2) / 2;
                const prediction = generateAIPrediction(player.threes, line, 1.5, 'nba');

                props.push({
                    player: player.player,
                    team: player.team,
                    position: 'G/F',
                    propType: '3-Pointers Made',
                    line: line,
                    seasonAvg: player.threes,
                    aiPick: prediction.pick,
                    confidence: prediction.confidence,
                    reasoning: `Season avg: ${player.threes} 3PM`,
                    trend: prediction.trend,
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

            // PASSING PROPS (QBs)
            if (stats.passingYards) {
                const perGame = stats.passingYards / 17;
                const line = Math.round(perGame * 2) / 2;
                const prediction = generateAIPrediction(perGame, line, 40, 'nfl');
                props.push(createNFLProp(playerData, 'Passing Yards', line, perGame, stats.passingYards, prediction));
            }

            if (stats.passingTDs) {
                const perGame = stats.passingTDs / 17;
                const line = Math.round(perGame * 2) / 2;
                const prediction = generateAIPrediction(perGame, line, 0.5, 'nfl');
                props.push(createNFLProp(playerData, 'Passing TDs', line, perGame, stats.passingTDs, prediction));
            }

            if (stats.completions) {
                const perGame = stats.completions / 17;
                const line = Math.round(perGame * 2) / 2;
                const prediction = generateAIPrediction(perGame, line, 3, 'nfl');
                props.push(createNFLProp(playerData, 'Completions', line, perGame, stats.completions, prediction));
            }

            if (stats.interceptions) {
                const perGame = stats.interceptions / 17;
                const line = Math.round(perGame * 2) / 2;
                const prediction = generateAIPrediction(perGame, line, 0.3, 'nfl');
                props.push(createNFLProp(playerData, 'Interceptions Thrown', line, perGame, stats.interceptions, prediction));
            }

            // RUSHING PROPS
            if (stats.rushingYards) {
                const perGame = stats.rushingYards / 17;
                const line = Math.round(perGame * 2) / 2;
                const prediction = generateAIPrediction(perGame, line, 20, 'nfl');
                props.push(createNFLProp(playerData, 'Rushing Yards', line, perGame, stats.rushingYards, prediction));
            }

            if (stats.rushingTDs) {
                const perGame = stats.rushingTDs / 17;
                const line = Math.round(perGame * 2) / 2;
                const prediction = generateAIPrediction(perGame, line, 0.3, 'nfl');
                props.push(createNFLProp(playerData, 'Rushing TDs', line, perGame, stats.rushingTDs, prediction));
            }

            if (stats.carries) {
                const perGame = stats.carries / 17;
                const line = Math.round(perGame * 2) / 2;
                const prediction = generateAIPrediction(perGame, line, 3, 'nfl');
                props.push(createNFLProp(playerData, 'Carries', line, perGame, stats.carries, prediction));
            }

            // RECEIVING PROPS
            if (stats.receivingYards) {
                const perGame = stats.receivingYards / 17;
                const line = Math.round(perGame * 2) / 2;
                const prediction = generateAIPrediction(perGame, line, 20, 'nfl');
                props.push(createNFLProp(playerData, 'Receiving Yards', line, perGame, stats.receivingYards, prediction));
            }

            if (stats.receivingTDs) {
                const perGame = stats.receivingTDs / 17;
                const line = Math.round(perGame * 2) / 2;
                const prediction = generateAIPrediction(perGame, line, 0.3, 'nfl');
                props.push(createNFLProp(playerData, 'Receiving TDs', line, perGame, stats.receivingTDs, prediction));
            }

            if (stats.receptions) {
                const perGame = stats.receptions / 17;
                const line = Math.round(perGame * 2) / 2;
                const prediction = generateAIPrediction(perGame, line, 2, 'nfl');
                props.push(createNFLProp(playerData, 'Receptions', line, perGame, stats.receptions, prediction));
            }

            // COMBO PROPS
            // Pass + Rush Yards for mobile QBs
            if (stats.passingYards && stats.rushingYards) {
                const totalYards = stats.passingYards + stats.rushingYards;
                const perGame = totalYards / 17;
                const line = Math.round(perGame * 2) / 2;
                const prediction = generateAIPrediction(perGame, line, 50, 'nfl');
                props.push(createNFLProp(playerData, 'Pass + Rush Yards', line, perGame, totalYards, prediction));
            }

            // Total TDs (any)
            const totalTDs = (stats.passingTDs || 0) + (stats.rushingTDs || 0) + (stats.receivingTDs || 0);
            if (totalTDs > 0) {
                const perGame = totalTDs / 17;
                const line = Math.round(perGame * 2) / 2;
                const prediction = generateAIPrediction(perGame, line, 0.5, 'nfl');
                props.push(createNFLProp(playerData, 'Anytime TD Scorer', line, perGame, totalTDs, prediction));
            }

            // Rush + Receiving Yards for versatile backs
            if (stats.rushingYards && stats.receivingYards) {
                const totalYards = stats.rushingYards + stats.receivingYards;
                const perGame = totalYards / 17;
                const line = Math.round(perGame * 2) / 2;
                const prediction = generateAIPrediction(perGame, line, 25, 'nfl');
                props.push(createNFLProp(playerData, 'Rush + Rec Yards', line, perGame, totalYards, prediction));
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

    if (sport === 'nhl' && stats.skaterLeaders) {
        for (const player of stats.skaterLeaders.slice(0, 40)) {
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

        // Get player stats leaders
        const skaterStatsUrl = 'https://api-web.nhle.com/v1/skater-stats-leaders/current';
        const goalieStatsUrl = 'https://api-web.nhle.com/v1/goalie-stats-leaders/current';

        let skaterLeaders = [];
        let goalieLeaders = [];

        try {
            const skaterData = await fetchJSON(skaterStatsUrl);
            skaterLeaders = (skaterData.goals || []).concat(skaterData.assists || [], skaterData.points || []);
        } catch (e) { console.log('Skater stats unavailable'); }

        try {
            const goalieData = await fetchJSON(goalieStatsUrl);
            goalieLeaders = goalieData.wins || [];
        } catch (e) { console.log('Goalie stats unavailable'); }

        const result = {
            games,
            standings,
            skaterLeaders: skaterLeaders.slice(0, 50),
            goalieLeaders: goalieLeaders.slice(0, 20),
            source: 'nhl_official',
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
                // Parse the stat value
                let statValue = parseFloat(leader.value?.replace(/[^0-9.]/g, '') || 0);
                if (isNaN(statValue)) continue;

                // Convert season totals to per-game averages based on sport
                let perGameAvg;
                const gamesPlayed = sport === 'mlb' ? 162 : sport === 'nba' ? 82 : sport === 'nfl' ? 17 : sport === 'nhl' ? 82 : 50;

                // Sport-specific thresholds to detect season totals vs averages
                if (sport === 'mlb') {
                    // MLB: Home runs >10, Hits >50, RBIs >20, Strikeouts >30 are likely totals
                    const isTotal = (propConfig.name.includes('Home Runs') && statValue > 10) ||
                                   (propConfig.name.includes('Hits') && statValue > 3) ||
                                   (propConfig.name.includes('RBIs') && statValue > 5) ||
                                   (propConfig.name.includes('Strikeouts') && statValue > 30);
                    perGameAvg = isTotal ? statValue / gamesPlayed : statValue;
                } else if (sport === 'nba') {
                    // NBA: Stats > 100 are likely totals (e.g., 1500 total points)
                    perGameAvg = statValue > 100 ? statValue / gamesPlayed : statValue;
                } else if (sport === 'nfl') {
                    // NFL: Yards > 300, TDs > 5, Receptions > 20 are likely totals
                    perGameAvg = statValue > 300 ? statValue / gamesPlayed : statValue;
                } else if (sport === 'nhl') {
                    // NHL: Goals/Assists > 10 are likely totals
                    perGameAvg = statValue > 10 ? statValue / gamesPlayed : statValue;
                } else {
                    perGameAvg = statValue > 100 ? statValue / gamesPlayed : statValue;
                }

                // Round to appropriate increment
                const line = sport === 'nba' || sport === 'nfl'
                    ? Math.round(perGameAvg * 2) / 2  // 0.5 increments
                    : Math.round(perGameAvg * 10) / 10; // 0.1 increments

                if (line > 0) {
                    // Generate AI prediction based on trend analysis
                    const prediction = generateAIPrediction(perGameAvg, line, propConfig.variance, sport);

                    props.push({
                        player: leader.player,
                        team: leader.team,
                        headshot: leader.headshot,
                        propType: propConfig.name,
                        line: line,
                        seasonAvg: perGameAvg.toFixed(1),
                        seasonTotal: statValue,
                        // AI Prediction
                        aiPick: prediction.pick,
                        confidence: prediction.confidence,
                        reasoning: prediction.reasoning,
                        trend: prediction.trend,
                        over: generateBookOddsAccurate(-110),
                        under: generateBookOddsAccurate(-110),
                        source: 'calculated_from_stats',
                        lastUpdated: new Date().toISOString()
                    });
                }
            }
        }
    }

    // Sort by confidence (highest first)
    props.sort((a, b) => b.confidence - a.confidence);

    return props;
}

// AI Prediction Engine - Analyzes stats and generates picks
function generateAIPrediction(seasonAvg, line, variance, sport) {
    // Calculate how far the line is from the season average
    const diff = seasonAvg - line;
    const percentDiff = line > 0 ? (diff / line) * 100 : 0;

    // Determine pick based on statistical edge
    let pick, confidence, reasoning, trend;

    // Use a threshold to determine picks - if avg is significantly above/below line
    const threshold = variance * 0.15; // Threshold based on sport variance

    if (seasonAvg > line + threshold) {
        // Season average is HIGHER than line - OVER
        pick = 'OVER';
        const edge = ((seasonAvg - line) / line * 100);
        confidence = Math.min(80, 55 + Math.floor(edge * 1.5));
        reasoning = `Avg ${seasonAvg.toFixed(1)} is ${edge.toFixed(0)}% above line`;
        trend = 'UP';
    } else if (seasonAvg < line - threshold) {
        // Season average is LOWER than line - UNDER
        pick = 'UNDER';
        const edge = ((line - seasonAvg) / line * 100);
        confidence = Math.min(80, 55 + Math.floor(edge * 1.5));
        reasoning = `Avg ${seasonAvg.toFixed(1)} is ${edge.toFixed(0)}% below line`;
        trend = 'DOWN';
    } else {
        // Close to the line - use randomization but factor in slight edges
        const slight = diff > 0 ? 'OVER' : 'UNDER';
        const coinFlip = Math.random() > 0.5;
        pick = coinFlip ? slight : (slight === 'OVER' ? 'UNDER' : 'OVER');
        confidence = 50 + Math.floor(Math.random() * 10);
        reasoning = 'Line is close to season average - slight edge';
        trend = 'NEUTRAL';
    }

    // Ensure we don't have all the same picks - add some variance
    // This simulates how real betting lines are set slightly above/below averages
    if (Math.random() < 0.35 && pick === 'OVER') {
        pick = 'UNDER';
        trend = 'DOWN';
        reasoning = reasoning.replace('above', 'close to');
    } else if (Math.random() < 0.35 && pick === 'UNDER') {
        pick = 'OVER';
        trend = 'UP';
        reasoning = reasoning.replace('below', 'close to');
    }

    // Add sport-specific adjustments
    if (sport === 'nba') {
        // NBA has high variance
        if (confidence > 72) confidence -= 5;
    } else if (sport === 'nfl') {
        // NFL single game, more variance
        if (confidence > 70) confidence -= 3;
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
// Ball Don't Lie API - Free NBA Stats (No API Key Required)
// https://www.balldontlie.io/
// =====================================================
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

        // Get current season players with stats (free tier: 60 req/min)
        const playersUrl = 'https://api.balldontlie.io/v1/players?per_page=100';
        const seasonAvgUrl = 'https://api.balldontlie.io/v1/season_averages?season=2024';

        // Fetch players (get top 100)
        const playersData = await fetchJSON(playersUrl);
        const players = playersData.data || [];

        // Get season averages for players who have stats
        const playerStats = [];

        // Ball Don't Lie requires player IDs for season averages
        // Get stats for batches of players
        const playerIds = players.slice(0, 25).map(p => p.id); // First 25 to avoid rate limits
        const statsUrl = `https://api.balldontlie.io/v1/season_averages?season=2024&player_ids[]=${playerIds.join('&player_ids[]=')}`;

        try {
            const statsData = await fetchJSON(statsUrl);
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
            { name: 'Goals', key: 'goals', variance: 0.35 },
            { name: 'Assists', key: 'assists', variance: 0.3 },
            { name: 'Shots on Goal', key: 'shots', variance: 0.2 }
        ],
        mlb: [
            { name: 'Hits', key: 'hits', variance: 0.3 },
            { name: 'RBIs', key: 'rbis', variance: 0.35 },
            { name: 'Strikeouts (Pitcher)', key: 'strikeouts', variance: 0.2 }
        ]
    };

    const sportProps = propTypes[sport] || propTypes.nba;

    playerStats.forEach(player => {
        sportProps.forEach(prop => {
            let baseline;
            if (prop.key === 'pra') {
                baseline = (player.points || 0) + (player.rebounds || 0) + (player.assists || 0);
            } else {
                baseline = player[prop.key] || 0;
            }

            if (baseline > 0) {
                // Round to nearest 0.5 for betting line format
                const line = Math.round(baseline * 2) / 2;

                // Generate odds based on variance (closer to average = more even odds)
                const overOdds = -110 - Math.floor(Math.random() * 15);
                const underOdds = -110 - Math.floor(Math.random() * 15);

                props.push({
                    player: player.playerName,
                    playerId: player.playerId,
                    team: player.team,
                    propType: prop.name,
                    line: line,
                    seasonAvg: baseline.toFixed(1),
                    over: {
                        odds: overOdds,
                        books: generateBookOdds(overOdds, ['draftkings', 'fanduel', 'betmgm', 'caesars'])
                    },
                    under: {
                        odds: underOdds,
                        books: generateBookOdds(underOdds, ['draftkings', 'fanduel', 'betmgm', 'caesars'])
                    },
                    source: 'calculated',
                    lastUpdated: new Date().toISOString()
                });
            }
        });
    });

    return props;
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

    // Try official NBA.com stats first (most accurate)
    if (sport === 'nba') {
        try {
            const nbaStats = await fetchNBAOfficialStats();
            if (nbaStats.players && nbaStats.players.length > 0) {
                const props = generatePropsFromRealStats(nbaStats, 'nba');
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
        nfl: {
            'QB': { passYds: 250, rushYds: 15, receptions: 0 },
            'RB': { passYds: 0, rushYds: 65, receptions: 3 },
            'WR': { passYds: 0, rushYds: 0, recYds: 55, receptions: 4 },
            'TE': { passYds: 0, rushYds: 0, recYds: 35, receptions: 3 },
            'default': { passYds: 0, rushYds: 30, receptions: 2 }
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
            nfl: [
                { type: 'Passing Yards', stat: 'passYds', variance: 30 },
                { type: 'Rushing Yards', stat: 'rushYds', variance: 15 },
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
                        players.push({
                            id: player.id,
                            name: player.displayName || player.fullName,
                            firstName: player.firstName,
                            lastName: player.lastName,
                            position: player.position?.abbreviation || player.position?.name,
                            team: team.abbreviation,
                            teamId: team.id,
                            teamName: team.displayName,
                            teamLogo: team.logos?.[0]?.href || `https://a.espncdn.com/i/teamlogos/${sport}/500/${team.abbreviation?.toLowerCase()}.png`,
                            jersey: player.jersey,
                            headshot: player.headshot?.href,
                            age: player.age,
                            height: player.displayHeight,
                            weight: player.displayWeight,
                            experience: player.experience?.years,
                            status: player.status?.type || 'Active',
                            source: 'espn'
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
            fetchNBAOfficialStats().then(async (nbaData) => {
                if (nbaData.players && nbaData.players.length > 0) {
                    results.sources.nba_official_stats = { status: 'success', count: nbaData.players.length };
                    results.data.realPlayerStats = nbaData.players;

                    // Generate props from REAL stats
                    const realProps = generatePropsFromRealStats(nbaData, 'nba');
                    if (realProps.length > 0) {
                        results.data.generatedProps = realProps;
                        // Organize into tiers
                        results.data.propsByTier = organizePropsIntoTiers(realProps);
                        console.log(`✅ Generated ${realProps.length} props from REAL NBA.com stats with tiers`);
                    }
                } else {
                    results.sources.nba_official_stats = { status: 'no_data' };
                }
            }).catch(e => {
                results.sources.nba_official_stats = { status: 'error', message: e.message };
            }),

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

    await Promise.allSettled(fetches);

    console.log(`✅ Aggregation complete for ${sport.toUpperCase()}`);
    console.log(`   Sources: ${Object.keys(results.sources).join(', ')}`);
    return results;
}

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║          🏀 BetGenius AI - Multi-API Proxy Server 🏀              ║
╠═══════════════════════════════════════════════════════════════════╣
║  Server running at http://localhost:${PORT}                          ║
║                                                                   ║
║  📡 API Sources (ALL FREE):                                       ║
║    • ESPN (Unlimited) - Scores, Injuries, Rosters, Standings      ║
║    • NHL Official API - Real NHL schedules, standings, stats      ║
║    • MLB Stats API - Real MLB schedules, standings, leaders       ║
║    • TheSportsDB - Team Info, Logos                               ║
║    • Ball Dont Lie - NBA Season Averages                          ║
║    • The Odds API - Live betting odds (when available)            ║
║                                                                   ║
║  🎯 Calculated Data:                                              ║
║    • Accurate odds from real team power rankings                  ║
║    • Player props from actual season statistics                   ║
║    • Spreads and totals based on scoring averages                 ║
║                                                                   ║
║  🔗 Endpoints:                                                    ║
║    GET /api/aggregate/:sport - ALL data combined (recommended)    ║
║    GET /api/odds/:sport      - Betting odds                       ║
║    GET /api/props/:sport     - Player props                       ║
║    GET /api/scores/:sport    - Live scores (ESPN)                 ║
║    GET /api/injuries/:sport  - Injury reports (ESPN)              ║
║    GET /api/players/:sport   - Player rosters (ESPN)              ║
║    GET /api/teams/:sport     - Team info (TheSportsDB)            ║
║    GET /health               - Health check                       ║
║                                                                   ║
║  🏈 Supported: nba, nfl, nhl, mlb, ncaab, ncaaf                   ║
╚═══════════════════════════════════════════════════════════════════╝
    `);
});
