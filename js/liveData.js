// =====================================================
// BetGenius AI - Live Data Service
// Pulls real-time data from multiple sources for 100% accuracy
// Sources: The Odds API (via proxy), ESPN
// =====================================================

class LiveDataService {
    constructor() {
        // Proxy server URL (run node server.js to start)
        this.proxyBase = 'http://localhost:3001';
        this.useProxy = true; // Set to true to use proxy server

        // API Endpoints (ESPN is CORS-friendly, no key needed)
        this.apis = {
            espn: {
                base: 'https://site.api.espn.com/apis/site/v2/sports',
                core: 'https://sports.core.api.espn.com/v2/sports'
            }
        };

        // Cache for API responses
        this.cache = new Map();
        this.cacheExpiry = 2 * 60 * 1000; // 2 minutes for live data

        // Player stats storage
        this.playerStats = new Map();
        this.playerAverages = new Map();

        // Live player props storage
        this.playerProps = new Map();

        // Live odds storage
        this.liveOdds = new Map();
        this.liveLines = new Map();

        // Data source tracking
        this.dataSources = {
            odds: 'loading',
            rosters: 'loading',
            stats: 'loading',
            injuries: 'loading',
            props: 'loading'
        };

        this.proxyAvailable = false;
        this.lastUpdate = null;
    }

    // Check if proxy server is running
    async checkProxyServer() {
        try {
            const response = await fetch(`${this.proxyBase}/health`, {
                signal: AbortSignal.timeout(2000)
            });
            if (response.ok) {
                console.log('✅ Proxy server is running');
                this.proxyAvailable = true;
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Proxy not available. Run: node server.js');
            this.proxyAvailable = false;
        }
        return false;
    }

    // =====================================================
    // Main initialization - fetch all live data
    // =====================================================
    async initialize() {
        console.log('🔄 Initializing Live Data Service...');
        const startTime = Date.now();

        try {
            // First check if proxy is available for live odds
            await this.checkProxyServer();

            // Fetch all data in parallel for speed
            const results = await Promise.allSettled([
                this.fetchLiveOddsFromProxy(),
                this.fetchPlayerPropsFromProxy(),
                this.fetchNBAPlayerStats(),
                this.fetchNFLPlayerStats(),
                this.fetchLiveScoresESPN(),
                this.fetchInjuryReports()
            ]);

            // Track which sources succeeded
            const oddsSuccess = results[0].status === 'fulfilled' && results[0].value;
            const propsSuccess = results[1].status === 'fulfilled' && results[1].value;
            const nbaStatsSuccess = results[2].status === 'fulfilled' && results[2].value;
            const nflStatsSuccess = results[3].status === 'fulfilled' && results[3].value;
            const _scoresSuccess = results[4].status === 'fulfilled' && results[4].value;
            const injuriesSuccess = results[5].status === 'fulfilled' && results[5].value;

            this.dataSources.odds = oddsSuccess ? 'live' : 'demo';
            this.dataSources.props = propsSuccess ? 'live' : 'demo';
            this.dataSources.stats = (nbaStatsSuccess || nflStatsSuccess) ? 'live' : 'demo';
            this.dataSources.injuries = injuriesSuccess ? 'live' : 'cached';

            this.lastUpdate = new Date();
            const elapsed = Date.now() - startTime;

            console.log(`✅ Live Data Service initialized in ${elapsed}ms`);
            console.log(`📊 Sources - Odds: ${this.dataSources.odds}, Props: ${this.dataSources.props}, Stats: ${this.dataSources.stats}`);
            console.log(`📈 Loaded ${this.playerStats.size} player stats, ${this.liveOdds.size} live odds, ${this.playerProps.size} props`);

            return true;
        } catch (error) {
            console.error('❌ Error initializing Live Data Service:', error);
            return false;
        }
    }

    // =====================================================
    // FETCH VIA PROXY SERVER (CORS-safe)
    // =====================================================
    async fetchLiveOddsFromProxy() {
        if (!this.proxyAvailable) {
            console.log('⚠️ Proxy not available, skipping live odds');
            return false;
        }

        const sports = ['nba', 'nfl', 'nhl', 'mlb'];
        let totalGames = 0;

        for (const sport of sports) {
            try {
                const response = await fetch(`${this.proxyBase}/api/odds/${sport}`);
                if (!response.ok) continue;

                const data = await response.json();
                if (data && Array.isArray(data)) {
                    data.forEach(game => {
                        const gameKey = `${game.home_team}_${game.away_team}_${game.commence_time}`;
                        this.liveOdds.set(gameKey, {
                            id: game.id,
                            sport: sport,
                            sportKey: game.sport_key,
                            homeTeam: game.home_team,
                            awayTeam: game.away_team,
                            commenceTime: new Date(game.commence_time),
                            bookmakers: this.processBookmakers(game.bookmakers)
                        });
                        totalGames++;
                    });
                }
            } catch (error) {
                console.error(`Error fetching odds for ${sport}:`, error);
            }
        }
        console.log(`📊 Fetched live odds for ${totalGames} games via proxy`);
        return totalGames > 0;
    }

    async fetchPlayerPropsFromProxy() {
        if (!this.proxyAvailable) {
            console.log('⚠️ Proxy not available, skipping player props');
            return false;
        }

        const sports = ['nba', 'nfl'];
        let totalProps = 0;

        for (const sport of sports) {
            try {
                const response = await fetch(`${this.proxyBase}/api/props/${sport}`);
                if (!response.ok) continue;

                const data = await response.json();
                if (data && Array.isArray(data)) {
                    data.forEach(eventData => {
                        if (eventData.odds && eventData.odds.bookmakers) {
                            const props = this.processPlayerProps(eventData.odds, sport);
                            props.forEach(prop => {
                                this.playerProps.set(`${prop.player}_${sport}`, prop);
                                totalProps++;
                            });
                        }
                    });
                }
            } catch (error) {
                console.error(`Error fetching props for ${sport}:`, error);
            }
        }
        console.log(`📊 Fetched ${totalProps} player props via proxy`);
        return totalProps > 0;
    }

    // =====================================================
    // THE ODDS API - Live Betting Lines (Direct - backup)
    // =====================================================
    async fetchLiveOddsFromOddsAPI() {
        const sports = ['basketball_nba', 'americanfootball_nfl', 'icehockey_nhl', 'baseball_mlb'];
        let totalGames = 0;

        for (const sport of sports) {
            try {
                // Fetch odds with all available bookmakers
                const url = `${this.apis.oddsApi.base}/sports/${sport}/odds?apiKey=${this.apis.oddsApi.key}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;

                const response = await fetch(url);
                if (!response.ok) {
                    console.warn(`⚠️ Odds API returned ${response.status} for ${sport}`);
                    continue;
                }

                const data = await response.json();

                if (data && Array.isArray(data)) {
                    data.forEach(game => {
                        const gameKey = `${game.home_team}_${game.away_team}_${game.commence_time}`;
                        this.liveOdds.set(gameKey, {
                            id: game.id,
                            sport: sport,
                            sportKey: sport,
                            homeTeam: game.home_team,
                            awayTeam: game.away_team,
                            commenceTime: new Date(game.commence_time),
                            bookmakers: this.processBookmakers(game.bookmakers)
                        });
                        totalGames++;
                    });
                }
            } catch (error) {
                console.error(`Error fetching odds for ${sport}:`, error);
            }
        }

        console.log(`📊 Fetched live odds for ${totalGames} games`);
        return totalGames > 0;
    }

    processBookmakers(bookmakers) {
        const processed = {};

        if (!bookmakers) return processed;

        bookmakers.forEach(book => {
            const bookKey = this.mapBookmakerKey(book.key);

            processed[bookKey] = {
                name: book.title,
                lastUpdate: new Date(book.last_update),
                markets: {}
            };

            book.markets?.forEach(market => {
                processed[bookKey].markets[market.key] = market.outcomes.map(outcome => ({
                    name: outcome.name,
                    price: outcome.price,
                    point: outcome.point
                }));
            });
        });

        return processed;
    }

    mapBookmakerKey(apiKey) {
        const mapping = {
            'draftkings': 'draftkings',
            'fanduel': 'fanduel',
            'betmgm': 'betmgm',
            'caesars': 'caesars',
            'williamhill_us': 'caesars',
            'pointsbetus': 'pointsbet',
            'betrivers': 'betrivers',
            'unibet_us': 'unibet',
            'bovada': 'bovada',
            'mybookieag': 'mybookie',
            'betonlineag': 'betonline',
            'lowvig': 'lowvig',
            'superbook': 'superbook',
            'wynnbet': 'wynnbet',
            'betfred': 'betfred',
            'circasports': 'circa',
            'espnbet': 'espnbet'
        };
        return mapping[apiKey] || apiKey;
    }

    // =====================================================
    // FETCH PLAYER PROPS FROM ODDS API
    // =====================================================
    async fetchPlayerPropsFromOddsAPI(sport, eventId) {
        try {
            const sportKey = this.getSportKey(sport);
            const markets = this.getPropMarkets(sport);

            const url = `${this.apis.oddsApi.base}/sports/${sportKey}/events/${eventId}/odds?apiKey=${this.apis.oddsApi.key}&regions=us&markets=${markets}&oddsFormat=american`;

            const response = await fetch(url);
            if (!response.ok) return [];

            const data = await response.json();
            return this.processPlayerProps(data, sport);
        } catch (error) {
            console.error('Error fetching player props:', error);
            return [];
        }
    }

    getSportKey(sport) {
        const keys = {
            'nba': 'basketball_nba',
            'nfl': 'americanfootball_nfl',
            'nhl': 'icehockey_nhl',
            'mlb': 'baseball_mlb'
        };
        return keys[sport] || sport;
    }

    getPropMarkets(sport) {
        const markets = {
            'nba': 'player_points,player_rebounds,player_assists,player_threes,player_blocks,player_steals,player_points_rebounds_assists',
            'nfl': 'player_pass_yds,player_pass_tds,player_rush_yds,player_reception_yds,player_receptions,player_anytime_td',
            'nhl': 'player_points,player_goals,player_assists,player_shots_on_goal',
            'mlb': 'batter_hits,batter_total_bases,pitcher_strikeouts,batter_home_runs'
        };
        return markets[sport] || '';
    }

    processPlayerProps(data, sport) {
        if (!data.bookmakers) return [];

        const propsMap = new Map();

        data.bookmakers.forEach(book => {
            const bookKey = this.mapBookmakerKey(book.key);

            book.markets?.forEach(market => {
                market.outcomes?.forEach(outcome => {
                    const playerName = outcome.description;
                    if (!playerName) return;

                    if (!propsMap.has(playerName)) {
                        propsMap.set(playerName, {
                            player: playerName,
                            sport: sport,
                            props: [],
                            books: {}
                        });
                    }

                    const playerData = propsMap.get(playerName);
                    const propType = this.getPropLabel(market.key);

                    let prop = playerData.props.find(p => p.type === propType);
                    if (!prop) {
                        prop = {
                            type: propType,
                            line: outcome.point,
                            bookLines: {}
                        };
                        playerData.props.push(prop);
                    }

                    prop.bookLines[bookKey] = {
                        line: outcome.point,
                        overOdds: outcome.name === 'Over' ? outcome.price : prop.bookLines[bookKey]?.overOdds,
                        underOdds: outcome.name === 'Under' ? outcome.price : prop.bookLines[bookKey]?.underOdds
                    };

                    playerData.books[bookKey] = true;
                });
            });
        });

        return Array.from(propsMap.values());
    }

    getPropLabel(marketKey) {
        const labels = {
            'player_points': 'Points',
            'player_rebounds': 'Rebounds',
            'player_assists': 'Assists',
            'player_threes': '3-Pointers',
            'player_blocks': 'Blocks',
            'player_steals': 'Steals',
            'player_points_rebounds_assists': 'PRA',
            'player_pass_yds': 'Pass Yards',
            'player_pass_tds': 'Pass TDs',
            'player_rush_yds': 'Rush Yards',
            'player_reception_yds': 'Rec Yards',
            'player_receptions': 'Receptions',
            'player_anytime_td': 'Anytime TD',
            'player_goals': 'Goals',
            'player_shots_on_goal': 'Shots',
            'batter_hits': 'Hits',
            'batter_total_bases': 'Total Bases',
            'pitcher_strikeouts': 'Strikeouts',
            'batter_home_runs': 'Home Runs'
        };
        return labels[marketKey] || marketKey;
    }

    // =====================================================
    // ESPN - Live Scores and Schedules
    // =====================================================
    async fetchLiveScoresESPN() {
        const sports = [
            { path: 'basketball/nba', key: 'nba' },
            { path: 'football/nfl', key: 'nfl' },
            { path: 'hockey/nhl', key: 'nhl' },
            { path: 'baseball/mlb', key: 'mlb' }
        ];

        let totalGames = 0;

        for (const sport of sports) {
            try {
                const response = await fetch(`${this.apis.espn.base}/${sport.path}/scoreboard`);
                if (!response.ok) continue;

                const data = await response.json();
                if (data.events) {
                    data.events.forEach(event => {
                        this.cache.set(`espn_game_${event.id}`, {
                            data: event,
                            timestamp: Date.now(),
                            sport: sport.key
                        });
                        totalGames++;
                    });
                }
            } catch (error) {
                console.error(`Error fetching ESPN scores for ${sport.key}:`, error);
            }
        }

        return totalGames > 0;
    }

    // =====================================================
    // ESPN - Player Season Averages
    // =====================================================
    async fetchNBAPlayerStats() {
        try {
            // Fetch NBA leaders for points, assists, rebounds
            const categories = ['scoringPerGame', 'assistsPerGame', 'reboundsPerGame'];

            for (const category of categories) {
                const url = `${this.apis.espn.base}/basketball/nba/leaders?category=${category}`;
                const response = await fetch(url);

                if (response.ok) {
                    const data = await response.json();
                    this.processNBALeaders(data, category);
                }
            }

            // Fetch individual player stats from team rosters
            await this.fetchNBATeamStats();

            return this.playerStats.size > 0;
        } catch (error) {
            console.error('Error fetching NBA stats:', error);
            return false;
        }
    }

    processNBALeaders(data, category) {
        if (!data.leaders) return;

        data.leaders.forEach(leaderCategory => {
            leaderCategory.leaders?.forEach(leader => {
                const athlete = leader.athlete;
                if (!athlete) return;

                const playerName = athlete.displayName;
                const stats = this.playerStats.get(playerName) || {
                    name: playerName,
                    team: athlete.team?.abbreviation || '',
                    position: athlete.position?.abbreviation || '',
                    sport: 'nba',
                    averages: {}
                };

                // Map category to stat name
                const statMap = {
                    'scoringPerGame': 'ppg',
                    'assistsPerGame': 'apg',
                    'reboundsPerGame': 'rpg'
                };

                if (statMap[category]) {
                    stats.averages[statMap[category]] = parseFloat(leader.value) || 0;
                }

                this.playerStats.set(playerName, stats);
            });
        });
    }

    async fetchNBATeamStats() {
        const teams = ['lal', 'bos', 'den', 'gsw', 'phx', 'mia', 'mil', 'phi', 'nyc', 'cle', 'okc', 'min', 'dal', 'sac', 'lac'];

        for (const teamId of teams) {
            try {
                const response = await fetch(`${this.apis.espn.base}/basketball/nba/teams/${teamId}/roster`);
                if (!response.ok) continue;

                const data = await response.json();
                this.processTeamRosterStats(data, 'nba');
            } catch (error) {
                // Continue with other teams
            }
        }
    }

    processTeamRosterStats(data, sport) {
        if (!data.athletes) return;

        data.athletes.forEach(group => {
            const athletes = group.items || [group];
            athletes.forEach(athlete => {
                if (!athlete.displayName) return;

                const playerName = athlete.displayName;
                const teamName = data.team?.displayName || '';
                const teamAbbr = data.team?.abbreviation || '';

                const stats = this.playerStats.get(playerName) || {
                    name: playerName,
                    sport: sport,
                    averages: {}
                };

                stats.team = teamAbbr;
                stats.teamFull = teamName;
                stats.position = athlete.position?.abbreviation || '';
                stats.jersey = athlete.jersey || '';
                stats.headshot = athlete.headshot?.href || '';

                // Get stats if available
                if (athlete.statistics) {
                    athlete.statistics.forEach(stat => {
                        stats.averages[stat.abbreviation?.toLowerCase()] = parseFloat(stat.value) || 0;
                    });
                }

                this.playerStats.set(playerName, stats);
            });
        });
    }

    // =====================================================
    // NFL Player Stats
    // =====================================================
    async fetchNFLPlayerStats() {
        try {
            const categories = ['passingYards', 'rushingYards', 'receivingYards', 'passingTouchdowns'];

            for (const category of categories) {
                const url = `${this.apis.espn.base}/football/nfl/leaders?category=${category}`;
                const response = await fetch(url);

                if (response.ok) {
                    const data = await response.json();
                    this.processNFLLeaders(data, category);
                }
            }

            return this.playerStats.size > 0;
        } catch (error) {
            console.error('Error fetching NFL stats:', error);
            return false;
        }
    }

    processNFLLeaders(data, category) {
        if (!data.leaders) return;

        data.leaders.forEach(leaderCategory => {
            leaderCategory.leaders?.forEach(leader => {
                const athlete = leader.athlete;
                if (!athlete) return;

                const playerName = athlete.displayName;
                const stats = this.playerStats.get(playerName) || {
                    name: playerName,
                    team: athlete.team?.abbreviation || '',
                    position: athlete.position?.abbreviation || '',
                    sport: 'nfl',
                    averages: {}
                };

                const statMap = {
                    'passingYards': 'passYds',
                    'rushingYards': 'rushYds',
                    'receivingYards': 'recYds',
                    'passingTouchdowns': 'passTDs'
                };

                if (statMap[category]) {
                    stats.averages[statMap[category]] = parseFloat(leader.value) || 0;
                }

                this.playerStats.set(playerName, stats);
            });
        });
    }

    // =====================================================
    // Injury Reports
    // =====================================================
    async fetchInjuryReports() {
        const sports = [
            { path: 'basketball/nba', key: 'nba' },
            { path: 'football/nfl', key: 'nfl' },
            { path: 'hockey/nhl', key: 'nhl' }
        ];

        let totalInjuries = 0;

        for (const sport of sports) {
            try {
                const response = await fetch(`${this.apis.espn.base}/${sport.path}/injuries`);
                if (!response.ok) continue;

                const data = await response.json();
                if (data.injuries) {
                    data.injuries.forEach(teamInjury => {
                        teamInjury.injuries?.forEach(injury => {
                            const status = injury.status?.toLowerCase();
                            if (status === 'out' || status === 'doubtful' || status === 'ir') {
                                this.cache.set(`injury_${injury.athlete?.id}`, {
                                    player: injury.athlete?.displayName,
                                    status: injury.status,
                                    description: injury.details?.detail,
                                    team: teamInjury.team?.abbreviation,
                                    sport: sport.key
                                });
                                totalInjuries++;
                            }
                        });
                    });
                }
            } catch (error) {
                console.error(`Error fetching injuries for ${sport.key}:`, error);
            }
        }

        return totalInjuries > 0;
    }

    // =====================================================
    // Public API Methods
    // =====================================================

    // Get live odds for a specific game
    getLiveOdds(homeTeam, awayTeam) {
        for (const [key, odds] of this.liveOdds) {
            if (key.includes(homeTeam) || key.includes(awayTeam)) {
                return odds;
            }
        }
        return null;
    }

    // Get all live odds
    getAllLiveOdds() {
        return Array.from(this.liveOdds.values());
    }

    // Get all player props
    getAllPlayerProps() {
        return Array.from(this.playerProps.values());
    }

    // Get player props by player name
    getPlayerProps(playerName) {
        for (const [key, prop] of this.playerProps) {
            if (key.startsWith(playerName)) {
                return prop;
            }
        }
        return null;
    }

    // Get player stats
    getPlayerStats(playerName) {
        return this.playerStats.get(playerName) || null;
    }

    // Get player season average
    getPlayerAverage(playerName, statType) {
        const stats = this.playerStats.get(playerName);
        if (!stats || !stats.averages) return null;
        return stats.averages[statType] || null;
    }

    // Check if player is injured
    isPlayerInjured(playerName) {
        for (const [key, injury] of this.cache) {
            if (key.startsWith('injury_') && injury.player === playerName) {
                return true;
            }
        }
        return false;
    }

    // Get data source status
    getDataSources() {
        return this.dataSources;
    }

    // Get last update time
    getLastUpdate() {
        return this.lastUpdate;
    }

    // Force refresh all data
    async refresh() {
        this.cache.clear();
        this.liveOdds.clear();
        this.playerProps.clear();
        this.playerStats.clear();
        await this.initialize();
        return this.lastUpdate;
    }

    // Get accurate line for a player prop
    getAccurateLine(playerName, propType, book = null) {
        for (const [key, odds] of this.liveOdds) {
            // Search through bookmakers for player props
            for (const [bookKey, bookData] of Object.entries(odds.bookmakers)) {
                if (book && bookKey !== book) continue;

                // Look for player in markets
                for (const [marketKey, outcomes] of Object.entries(bookData.markets || {})) {
                    const match = outcomes.find(o =>
                        o.description === playerName &&
                        this.getPropLabel(marketKey) === propType
                    );
                    if (match) {
                        return {
                            line: match.point,
                            odds: match.price,
                            book: bookKey,
                            bookName: bookData.name
                        };
                    }
                }
            }
        }
        return null;
    }

    // Get best line across all books
    getBestLine(playerName, propType, overUnder = 'over') {
        const lines = [];

for (const [_key, odds] of this.liveOdds) {
            for (const [bookKey, bookData] of Object.entries(odds.bookmakers)) {
                for (const [marketKey, outcomes] of Object.entries(bookData.markets || {})) {
                    outcomes.forEach(outcome => {
                        if (outcome.description === playerName &&
                            this.getPropLabel(marketKey) === propType &&
                            outcome.name.toLowerCase() === overUnder) {
                            lines.push({
                                line: outcome.point,
                                odds: outcome.price,
                                book: bookKey,
                                bookName: bookData.name
                            });
                        }
                    });
                }
            }
        }

        if (lines.length === 0) return null;

        // Return the best odds
        lines.sort((a, b) => b.odds - a.odds);
        return lines[0];
    }
}

// Initialize and export
window.LiveDataService = new LiveDataService();

// Auto-initialize
document.addEventListener('DOMContentLoaded', async () => {
    await window.LiveDataService.initialize();
});
