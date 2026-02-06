// =====================================================
// BetGenius AI - Backend Proxy Server
// Bypasses CORS restrictions for live API calls
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

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3001;
const ODDS_API_KEY = process.env.ODDS_API_KEY;

// Allowed sports for validation
const ALLOWED_SPORTS = ['nba', 'nfl', 'nhl', 'mlb', 'ncaab', 'ncaaf'];

// Request configuration
const REQUEST_TIMEOUT_MS = 10000; // 10 second timeout
const RATE_LIMIT_RETRY_DELAY_MS = 60000; // Wait 1 minute if rate limited

// Rate limit tracking
let rateLimitedUntil = null;
let apiRequestsRemaining = null;

// Validate API key is set
if (!ODDS_API_KEY) {
    console.error('❌ ERROR: ODDS_API_KEY environment variable is not set!');
    console.error('   Set it with: export ODDS_API_KEY=your_api_key_here');
    console.error('   Or create a .env file with: ODDS_API_KEY=your_api_key_here');
    process.exit(1);
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
            const data = await fetchOddsAPI(sport);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // Route: /api/props/:sport
        if (path.startsWith('/api/props/')) {
            const sport = path.split('/')[3]?.toLowerCase();
            if (!validateSport(sport)) return;
            const data = await fetchPlayerProps(sport);
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

        // Health check
        if (path === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                timestamp: new Date().toISOString(),
                apiRequestsRemaining: apiRequestsRemaining,
                rateLimited: rateLimitedUntil ? Date.now() < rateLimitedUntil : false,
                rateLimitResetsIn: rateLimitedUntil && Date.now() < rateLimitedUntil
                    ? Math.ceil((rateLimitedUntil - Date.now()) / 1000) + 's'
                    : null
            }));
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

    // Check cache first (5 minute cache for props)
    const cacheKey = `props_${sport}`;
    if (propsCache[cacheKey] && (Date.now() - propsCache[cacheKey].timestamp < 300000)) {
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

// Props cache
const propsCache = {};

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
function fetchJSON(apiUrl) {
    return new Promise((resolve, reject) => {
        // Check if we're currently rate limited
        if (rateLimitedUntil && Date.now() < rateLimitedUntil) {
            const waitTime = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
            reject(new Error(`Rate limited. Try again in ${waitTime} seconds.`));
            return;
        }

        const request = https.get(apiUrl, { timeout: REQUEST_TIMEOUT_MS }, (response) => {
            let data = '';

            // Track rate limit headers from The Odds API
            if (response.headers['x-requests-remaining']) {
                apiRequestsRemaining = parseInt(response.headers['x-requests-remaining']);
                console.log(`📊 API requests remaining: ${apiRequestsRemaining}`);
            }

            // Handle rate limit response (429)
            if (response.statusCode === 429) {
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

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║       🏀 BetGenius AI - Live Data Proxy Server 🏀      ║
╠════════════════════════════════════════════════════════╣
║  Server running at http://localhost:${PORT}              ║
║                                                        ║
║  Endpoints:                                            ║
║    GET /api/odds/:sport    - Live betting odds         ║
║    GET /api/props/:sport   - Player props              ║
║    GET /api/events/:sport  - Upcoming events           ║
║    GET /api/scores/:sport  - Live scores (ESPN)        ║
║    GET /api/injuries/:sport - Injury reports (ESPN)    ║
║    GET /health             - Health check              ║
║                                                        ║
║  Supported sports: nba, nfl, nhl, mlb, ncaab, ncaaf    ║
╚════════════════════════════════════════════════════════╝
    `);
});
