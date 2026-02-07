// =====================================================
// BetGenius AI - API Service Layer
// Real-time sports data integration with enhanced accuracy
// =====================================================

// =====================================================
// Toast Notification System
// =====================================================
const ToastManager = {
    container: null,

    init() {
        this.container = document.getElementById('toastContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toastContainer';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    },

    show(type, title, message, duration = 5000) {
        if (!this.container) this.init();

        const icons = {
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle',
            info: 'fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type]} toast-icon"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        this.container.appendChild(toast);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                toast.classList.add('fade-out');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    },

    success(title, message) { return this.show('success', title, message); },
    warning(title, message) { return this.show('warning', title, message, 8000); },
    error(title, message) { return this.show('error', title, message, 10000); },
    info(title, message) { return this.show('info', title, message); }
};

// =====================================================
// Data Source Banner Manager
// =====================================================
const DataSourceBanner = {
    banner: null,
    messageEl: null,

    init() {
        this.banner = document.getElementById('dataSourceBanner');
        this.messageEl = document.getElementById('bannerMessage');
    },

    show(message, type = 'warning') {
        if (!this.banner) this.init();
        if (!this.banner) return;

        this.banner.className = `data-source-banner banner-${type}`;
        this.messageEl.textContent = message;
        this.banner.style.display = 'block';
    },

    hide() {
        if (this.banner) this.banner.style.display = 'none';
    },

    showRateLimited() {
        this.show('⚠️ Betting odds API rate limited. Showing live scores & player data from ESPN.', 'warning');
    },

    showAllLive() {
        this.show('✅ All data sources connected and live!', 'success');
        setTimeout(() => this.hide(), 5000);
    }
};

// Make available globally
window.ToastManager = ToastManager;
window.DataSourceBanner = DataSourceBanner;

// API Configuration
const API_CONFIG = {
    // Proxy server for API calls (bypasses CORS)
    PROXY_BASE: 'http://localhost:3001',

    // Direct Odds API (used by proxy server, NOT browser)
    ODDS_API_BASE: 'https://api.the-odds-api.com/v4',

    // ESPN API (Free, no key required)
    ESPN_API_BASE: 'https://site.api.espn.com/apis/site/v2/sports',

    // Ball Don't Lie API (Free NBA stats)
    BALLDONTLIE_API: 'https://api.balldontlie.io/v1',

    // Cache duration in milliseconds
    CACHE_DURATION: 3 * 60 * 1000, // 3 minutes for fresher data
};

// Betting Apps Configuration
const BETTING_APPS = {
    prizepicks: {
        id: 'prizepicks',
        name: 'PrizePicks',
        logo: 'assets/prizepicks.png',
        color: '#00D632',
        apiKey: 'prizepicks',
        type: 'dfs' // Daily Fantasy Sports
    },
    draftkings: {
        id: 'draftkings',
        name: 'DraftKings',
        logo: 'assets/draftkings.png',
        color: '#53D337',
        apiKey: 'draftkings',
        type: 'sportsbook'
    },
    fanduel: {
        id: 'fanduel',
        name: 'FanDuel',
        logo: 'assets/fanduel.png',
        color: '#1493FF',
        apiKey: 'fanduel',
        type: 'sportsbook'
    },
    sleeper: {
        id: 'sleeper',
        name: 'Sleeper',
        logo: 'assets/sleeper.png',
        color: '#1A1A2E',
        apiKey: 'sleeper',
        type: 'dfs'
    },
    underdog: {
        id: 'underdog',
        name: 'Underdog',
        logo: 'assets/underdog.png',
        color: '#FFD700',
        apiKey: 'underdog',
        type: 'dfs'
    },
    betr: {
        id: 'betr',
        name: 'Betr',
        logo: 'assets/betr.png',
        color: '#FF3366',
        apiKey: 'betr',
        type: 'sportsbook'
    },
    betmgm: {
        id: 'betmgm',
        name: 'BetMGM',
        logo: 'assets/betmgm.png',
        color: '#C4A962',
        apiKey: 'betmgm',
        type: 'sportsbook'
    },
    caesars: {
        id: 'caesars',
        name: 'Caesars',
        logo: 'assets/caesars.png',
        color: '#006747',
        apiKey: 'williamhill_us',
        type: 'sportsbook'
    }
};

// Sport mappings for different APIs
const SPORT_MAPPINGS = {
    nfl: {
        oddsApi: 'americanfootball_nfl',
        espn: 'football/nfl',
        name: 'NFL',
        icon: 'fa-football-ball',
        propMarkets: 'player_pass_yds,player_pass_tds,player_rush_yds,player_rush_tds,player_receptions,player_reception_yds,player_anytime_td'
    },
    nba: {
        oddsApi: 'basketball_nba',
        espn: 'basketball/nba',
        name: 'NBA',
        icon: 'fa-basketball-ball',
        propMarkets: 'player_points,player_rebounds,player_assists,player_threes,player_blocks,player_steals,player_points_rebounds_assists'
    },
    mlb: {
        oddsApi: 'baseball_mlb',
        espn: 'baseball/mlb',
        name: 'MLB',
        icon: 'fa-baseball-ball',
        propMarkets: 'batter_hits,batter_total_bases,batter_rbis,batter_runs,batter_home_runs,pitcher_strikeouts'
    },
    nhl: {
        oddsApi: 'icehockey_nhl',
        espn: 'hockey/nhl',
        name: 'NHL',
        icon: 'fa-hockey-puck',
        propMarkets: 'player_points,player_goals,player_assists,player_shots_on_goal,player_power_play_points'
    },
    soccer: {
        oddsApi: 'soccer_epl',
        espn: 'soccer/eng.1',
        name: 'Soccer',
        icon: 'fa-futbol',
        propMarkets: 'player_shots,player_shots_on_target,player_goal_scorer_anytime'
    },
    mma: {
        oddsApi: 'mma_mixed_martial_arts',
        espn: 'mma/ufc',
        name: 'MMA/UFC',
        icon: 'fa-fist-raised',
        propMarkets: ''
    },
    ncaaf: {
        oddsApi: 'americanfootball_ncaaf',
        espn: 'football/college-football',
        name: 'NCAAF',
        icon: 'fa-football-ball',
        propMarkets: 'player_pass_yds,player_rush_yds,player_reception_yds'
    },
    ncaab: {
        oddsApi: 'basketball_ncaab',
        espn: 'basketball/mens-college-basketball',
        name: 'NCAAB',
        icon: 'fa-basketball-ball',
        propMarkets: 'player_points,player_rebounds,player_assists'
    }
};

// Cache storage
const cache = new Map();

// =====================================================
// API Service Class
// =====================================================
class SportsAPIService {
    constructor() {
        // API key is now handled by the proxy server
        this.proxyBase = API_CONFIG.PROXY_BASE;
        this.isDemo = false; // Use proxy for real data
        this.aggregatedData = {}; // Store aggregated data by sport
    }

    // Check if cached data is still valid
    isCacheValid(key) {
        const cached = cache.get(key);
        if (!cached) return false;
        return Date.now() - cached.timestamp < API_CONFIG.CACHE_DURATION;
    }

    // Get cached data
    getCached(key) {
        const cached = cache.get(key);
        return cached ? cached.data : null;
    }

    // Set cache
    setCache(key, data) {
        cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    // =====================================================
    // Aggregated Data - Fetches from ALL API sources at once
    // =====================================================

    async fetchAggregatedData(sport) {
        const cacheKey = `aggregate_${sport}`;

        if (this.isCacheValid(cacheKey)) {
            console.log(`📦 Using cached aggregate data for ${sport}`);
            return this.getCached(cacheKey);
        }

        try {
            console.log(`🔄 Fetching aggregated data for ${sport}...`);
            const url = `${this.proxyBase}/api/aggregate/${sport}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Aggregate API Error: ${response.status}`);
            }

            const data = await response.json();

            // Store in cache and class property
            this.setCache(cacheKey, data);
            this.aggregatedData[sport] = data;

            // Check for rate-limited or errored sources
            this.handleDataSourceStatus(data.sources, sport);

            console.log(`✅ Aggregated data loaded:`, {
                games: data.data?.games?.length || 0,
                players: data.data?.players?.length || 0,
                teams: data.data?.teams?.length || 0,
                sources: Object.keys(data.sources || {})
            });

            return data;
        } catch (error) {
            console.error('Error fetching aggregated data:', error);

            // Show error toast
            if (window.ToastManager) {
                if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    window.ToastManager.error(
                        'Connection Error',
                        'Cannot connect to data server. Make sure the proxy server is running on port 3001.'
                    );
                } else {
                    window.ToastManager.error(
                        'Data Error',
                        `Failed to load ${sport.toUpperCase()} data: ${error.message}`
                    );
                }
            }

            return { error: error.message, data: {}, sources: {} };
        }
    }

    // Handle data source status and show appropriate notifications
    handleDataSourceStatus(sources, sport) {
        if (!sources) return;

        const rateLimited = [];
        const errored = [];
        const successful = [];

        Object.entries(sources).forEach(([source, status]) => {
            if (status.status === 'success') {
                successful.push(source);
            } else if (status.status === 'error') {
                if (status.message?.includes('Rate limit') || status.message?.includes('rate limit')) {
                    rateLimited.push(source);
                } else {
                    errored.push(source);
                }
            } else if (status.status === 'skipped' && status.reason?.includes('Rate')) {
                rateLimited.push(source);
            }
        });

        // Show notifications based on status
        if (rateLimited.length > 0 && window.ToastManager) {
            window.ToastManager.warning(
                'API Rate Limited',
                `${rateLimited.join(', ')} is rate limited. Using free data sources instead.`
            );
        }

        if (errored.length > 0 && window.ToastManager) {
            window.ToastManager.warning(
                'Some Data Unavailable',
                `Could not fetch from: ${errored.join(', ')}`
            );
        }

        // Update banner
        if (window.DataSourceBanner) {
            if (rateLimited.length > 0 || errored.length > 0) {
                const msg = rateLimited.length > 0
                    ? `Betting odds API rate limited. Showing live scores & players from ESPN.`
                    : `Some data sources unavailable. Showing available data.`;
                window.DataSourceBanner.show(msg, 'warning');
            }
        }

        // Store status for UI components
        this.dataSourceStatus = { successful, rateLimited, errored };
    }

    // Get games from aggregated data
    getAggregatedGames(sport) {
        return this.aggregatedData[sport]?.data?.games || [];
    }

    // Get players from aggregated data
    getAggregatedPlayers(sport) {
        return this.aggregatedData[sport]?.data?.players || [];
    }

// Get teams from aggregated data
    getAggregatedTeams(sport) {
        return this.aggregatedData[sport]?.data?.teams || [];
    }

    // Get injuries from aggregated data
    getAggregatedInjuries(sport) {
        return this.aggregatedData[sport]?.data?.injuries || {};
    }

    // Get calculated odds from aggregated data
    getCalculatedOdds(sport) {
        return this.aggregatedData[sport]?.data?.calculatedOdds || [];
    }

    // Get generated player props from aggregated data
    getGeneratedProps(sport) {
        return this.aggregatedData[sport]?.data?.generatedProps || [];
    }

    // Get props organized by tier from aggregated data
    getPropsByTier(sport) {
        return this.aggregatedData[sport]?.data?.propsByTier || null;
    }

    // Get standings from aggregated data
    getStandings(sport) {
        const data = this.aggregatedData[sport]?.data;
        return data?.nbaStandings || data?.nflStandings || data?.nhlStandings || data?.mlbStandings || [];
    }

    // Get season averages (NBA from Ball Don't Lie)
    getSeasonAverages(sport) {
        return this.aggregatedData[sport]?.data?.seasonAverages || [];
    }

    // Get sport-specific official data (NHL, MLB)
    getOfficialGames(sport) {
        const data = this.aggregatedData[sport]?.data;
        if (sport === 'nhl') return data?.nhlGames || [];
        if (sport === 'mlb') return data?.mlbGames || [];
        return [];
    }

    // Get data sources status
    getDataSourcesStatus(sport) {
        return this.aggregatedData[sport]?.sources || {};
    }

    // Get current data source status for UI
    getCurrentDataSourceStatus() {
        return this.dataSourceStatus || { successful: [], rateLimited: [], errored: [] };
    }

    // Check if a specific API is rate limited
    isApiRateLimited(apiName) {
        return this.dataSourceStatus?.rateLimited?.includes(apiName) || false;
    }

    // =====================================================
    // The Odds API - Real Odds Data
    // =====================================================

    async fetchOdds(sport, markets = 'h2h,spreads,totals') {
        const cacheKey = `odds_${sport}_${markets}`;

        if (this.isCacheValid(cacheKey)) {
            return this.getCached(cacheKey);
        }

        // Try to get live data from LiveDataService first
        if (window.LiveDataService && window.LiveDataService.liveOdds.size > 0) {
            const sportKey = SPORT_MAPPINGS[sport]?.oddsApi || sport;
            const liveOdds = window.LiveDataService.getAllLiveOdds()
                .filter(odds => odds.sportKey === sportKey || odds.sportKey.includes(sport));

            if (liveOdds.length > 0) {
                const formattedData = liveOdds.map(event => ({
                    id: event.id,
                    sport: sport,
                    sportName: SPORT_MAPPINGS[sport]?.name || sport.toUpperCase(),
                    homeTeam: event.homeTeam,
                    awayTeam: event.awayTeam,
                    commenceTime: event.commenceTime,
                    bookmakers: event.bookmakers
                }));
                this.setCache(cacheKey, formattedData);
                return formattedData;
            }
        }

        if (this.isDemo) {
            console.log('Using demo data - Add your API key for live data');
            return this.getDemoOdds(sport);
        }

        try {
            // Fetch odds through proxy server (avoids CORS)
            const url = `${this.proxyBase}/api/odds/${sport}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();

            // Check if response is a rate limit error
            if (data.error && data.error.includes('Rate limit')) {
                console.warn('Odds API rate limited, using demo data');
                if (window.ToastManager && !this._oddsRateLimitNotified) {
                    window.ToastManager.warning(
                        'Odds API Limited',
                        'Betting odds are temporarily unavailable. Showing sample data.'
                    );
                    this._oddsRateLimitNotified = true;
                }
                return this.getDemoOdds(sport);
            }

            const formattedData = this.formatOddsData(data, sport);
            this.setCache(cacheKey, formattedData);

            return formattedData;
        } catch (error) {
            console.error('Error fetching odds:', error);

            // Show user-friendly error for connection issues
            if (error.message.includes('Failed to fetch') && !this._connectionErrorNotified) {
                if (window.ToastManager) {
                    window.ToastManager.error(
                        'Connection Error',
                        'Cannot connect to data server. Check if proxy server is running.'
                    );
                }
                this._connectionErrorNotified = true;
            }

            return this.getDemoOdds(sport);
        }
    }

    // Format odds data from API response
    formatOddsData(data, sport) {
        return data.map(event => ({
            id: event.id,
            sport: sport,
            sportName: SPORT_MAPPINGS[sport]?.name || sport.toUpperCase(),
            homeTeam: event.home_team,
            awayTeam: event.away_team,
            commenceTime: new Date(event.commence_time),
            bookmakers: this.formatBookmakers(event.bookmakers)
        }));
    }

    // Format bookmaker data
    formatBookmakers(bookmakers) {
        const formatted = {};

        bookmakers.forEach(bookmaker => {
            const appKey = Object.keys(BETTING_APPS).find(
                key => BETTING_APPS[key].apiKey === bookmaker.key
            ) || bookmaker.key;

            formatted[appKey] = {
                name: bookmaker.title,
                lastUpdate: new Date(bookmaker.last_update),
                markets: {}
            };

            bookmaker.markets.forEach(market => {
                formatted[appKey].markets[market.key] = market.outcomes.map(outcome => ({
                    name: outcome.name,
                    price: outcome.price,
                    point: outcome.point
                }));
            });
        });

        return formatted;
    }

    // =====================================================
    // ESPN API - Scores and Game Data (Free)
    // =====================================================

    async fetchGames(sport) {
        const cacheKey = `games_${sport}`;

        if (this.isCacheValid(cacheKey)) {
            return this.getCached(cacheKey);
        }

        try {
            const espnSport = SPORT_MAPPINGS[sport]?.espn;
            if (!espnSport) {
                return this.getDemoGames(sport);
            }

            const url = `${API_CONFIG.ESPN_API_BASE}/${espnSport}/scoreboard`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`ESPN API Error: ${response.status}`);
            }

            const data = await response.json();
            const formattedData = this.formatESPNData(data, sport);
            this.setCache(cacheKey, formattedData);

            return formattedData;
        } catch (error) {
            console.error('Error fetching games:', error);
            return this.getDemoGames(sport);
        }
    }

    // Format ESPN API data
    formatESPNData(data, sport) {
        if (!data.events) return [];

        return data.events.map(event => {
            const competition = event.competitions[0];
            const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
            const awayTeam = competition.competitors.find(c => c.homeAway === 'away');

            return {
                id: event.id,
                sport: sport,
                sportName: SPORT_MAPPINGS[sport]?.name || sport.toUpperCase(),
                name: event.name,
                shortName: event.shortName,
                date: new Date(event.date),
                status: {
                    type: competition.status.type.name,
                    description: competition.status.type.description,
                    detail: competition.status.type.detail,
                    state: competition.status.type.state
                },
                homeTeam: {
                    id: homeTeam?.team?.id,
                    name: homeTeam?.team?.displayName || homeTeam?.team?.name,
                    abbreviation: homeTeam?.team?.abbreviation,
                    logo: homeTeam?.team?.logo,
                    score: homeTeam?.score,
                    record: homeTeam?.records?.[0]?.summary || ''
                },
                awayTeam: {
                    id: awayTeam?.team?.id,
                    name: awayTeam?.team?.displayName || awayTeam?.team?.name,
                    abbreviation: awayTeam?.team?.abbreviation,
                    logo: awayTeam?.team?.logo,
                    score: awayTeam?.score,
                    record: awayTeam?.records?.[0]?.summary || ''
                },
                venue: competition.venue?.fullName || '',
                broadcast: competition.broadcasts?.[0]?.names?.[0] || '',
                isLive: competition.status.type.state === 'in'
            };
        });
    }

    // =====================================================
    // Player Props - Real data from The Odds API
    // =====================================================

    async fetchPlayerProps(sport) {
        const cacheKey = `props_${sport}`;

        if (this.isCacheValid(cacheKey)) {
            return this.getCached(cacheKey);
        }

        if (this.isDemo) {
            return this.getDemoPlayerProps(sport);
        }

        try {
            const sportKey = SPORT_MAPPINGS[sport]?.oddsApi || sport;
            const propMarkets = SPORT_MAPPINGS[sport]?.propMarkets;

            if (!propMarkets) {
                return this.getDemoPlayerProps(sport);
            }

            // Fetch player props through proxy server (avoids CORS)
            const propsUrl = `${API_CONFIG.PROXY_BASE}/api/props/${sport}`;
            const eventsResponse = await fetch(propsUrl);

            if (!eventsResponse.ok) {
                throw new Error('Props API Error');
            }

            const propsData = await eventsResponse.json();

            // Check for rate limit error response
            if (propsData.error && propsData.error.includes('Rate limit')) {
                console.warn('Props API rate limited, using demo data');
                if (window.ToastManager && !this._propsRateLimitNotified) {
                    window.ToastManager.warning(
                        'Player Props Limited',
                        'Player props API is rate limited. Showing sample data.'
                    );
                    this._propsRateLimitNotified = true;
                }
                return this.getDemoPlayerProps(sport);
            }

            // If proxy returned props directly, use them
            if (propsData && Array.isArray(propsData)) {
                // Check if array is empty (could be rate limit or no data)
                if (propsData.length === 0) {
                    console.warn('No props data returned, using demo data');
                    return this.getDemoPlayerProps(sport);
                }

                // Format the props from the proxy response
                const flatProps = this.formatPropsFromProxy(propsData, sport);

                // Add sport identifier to each prop
                const propsWithSport = flatProps.map(prop => ({
                    ...prop,
                    sport: sport,
                    sportName: SPORT_MAPPINGS[sport]?.name || sport.toUpperCase()
                }));

                this.setCache(cacheKey, propsWithSport);
                return propsWithSport;
            }

            // Fallback to demo data if proxy returns unexpected format
            return this.getDemoPlayerProps(sport);
        } catch (error) {
            console.error('Error fetching player props:', error);

            // Show connection error only once
            if (error.message.includes('Failed to fetch') && !this._connectionErrorNotified) {
                if (window.ToastManager) {
                    window.ToastManager.error(
                        'Connection Error',
                        'Cannot connect to data server. Check if proxy server is running.'
                    );
                }
                this._connectionErrorNotified = true;
            }

            return this.getDemoPlayerProps(sport);
        }
    }

    formatPropsFromProxy(propsData, sport) {
        const playerPropsMap = new Map();

        propsData.forEach(item => {
            // Proxy returns { event, odds } where odds contains bookmakers
            const oddsData = item.odds || item;
            const eventData = item.event || item;

            if (!oddsData.bookmakers || !oddsData.bookmakers.length) return;

            const eventInfo = {
                home_team: eventData.home_team || oddsData.home_team,
                away_team: eventData.away_team || oddsData.away_team,
                commence_time: eventData.commence_time || oddsData.commence_time
            };

            oddsData.bookmakers.forEach(bookmaker => {
                const appKey = Object.keys(BETTING_APPS).find(
                    key => BETTING_APPS[key].apiKey === bookmaker.key
                ) || bookmaker.key;

                bookmaker.markets?.forEach(market => {
                    market.outcomes?.forEach(outcome => {
                        const playerName = outcome.description;
                        if (!playerName) return;

                        const propType = this.getPropLabel(market.key);

                        if (!playerPropsMap.has(playerName)) {
                            const playerStats = window.LiveDataService?.getPlayerStats(playerName);
                            const rosterInfo = window.RosterService?.getPlayerTeam(playerName);

                            playerPropsMap.set(playerName, {
                                player: playerName,
                                team: rosterInfo?.abbr || this.extractTeamFromEvent(eventInfo, playerName),
                                teamFull: rosterInfo?.team || '',
                                opponent: this.getOpponentFromEvent(eventInfo, playerName),
                                position: rosterInfo?.position || this.inferPosition(market.key),
                                seasonAverages: playerStats?.averages || {},
                                props: [],
                                books: {}
                            });
                        }

                        const playerData = playerPropsMap.get(playerName);

                        let propEntry = playerData.props.find(p => p.type === propType);
                        if (!propEntry) {
                            const avgKey = this.getAverageKey(market.key);
                            const seasonAvg = playerData.seasonAverages?.[avgKey];
                            const aiPick = this.calculateAIPickWithAverage(outcome, market.key, seasonAvg);
                            const probability = this.calculateProbabilityWithAverage(outcome.price, seasonAvg, outcome.point);

                            propEntry = {
                                type: propType,
                                line: outcome.point,
                                seasonAverage: seasonAvg || null,
                                aiPick: aiPick,
                                probability: probability,
                                bookLines: {}
                            };
                            playerData.props.push(propEntry);
                        }

                        propEntry.bookLines[appKey] = {
                            line: outcome.point,
                            overOdds: outcome.name === 'Over' ? outcome.price : propEntry.bookLines[appKey]?.overOdds,
                            underOdds: outcome.name === 'Under' ? outcome.price : propEntry.bookLines[appKey]?.underOdds
                        };

                        if (!playerData.books[appKey]) {
                            playerData.books[appKey] = BETTING_APPS[appKey] || { id: appKey, name: appKey };
                        }
                    });
                });
            });
        });

        return Array.from(playerPropsMap.values());
    }

    async fetchEventPlayerProps(sport, eventId, markets, eventInfo) {
        // This method is deprecated - props are now fetched through the proxy server
        // Keeping for backward compatibility, but it returns empty
        console.warn('fetchEventPlayerProps is deprecated - use proxy server instead');
        return [];
    }

    formatPlayerPropsFromAPI(data, eventInfo) {
        if (!data.bookmakers || !data.bookmakers.length) return [];

        const playerPropsMap = new Map();

        data.bookmakers.forEach(bookmaker => {
            const appKey = Object.keys(BETTING_APPS).find(
                key => BETTING_APPS[key].apiKey === bookmaker.key
            ) || bookmaker.key;

            bookmaker.markets.forEach(market => {
                market.outcomes.forEach(outcome => {
                    const playerName = outcome.description;
                    const propType = this.getPropLabel(market.key);

                    if (!playerPropsMap.has(playerName)) {
                        // Get player stats from LiveDataService
                        const playerStats = window.LiveDataService?.getPlayerStats(playerName);
                        const rosterInfo = window.RosterService?.getPlayerTeam(playerName);

                        playerPropsMap.set(playerName, {
                            player: playerName,
                            team: rosterInfo?.abbr || this.extractTeamFromEvent(eventInfo, playerName),
                            teamFull: rosterInfo?.team || '',
                            opponent: this.getOpponentFromEvent(eventInfo, playerName),
                            position: rosterInfo?.position || this.inferPosition(market.key),
                            seasonAverages: playerStats?.averages || {},
                            props: [],
                            books: {}
                        });
                    }

                    const playerData = playerPropsMap.get(playerName);

                    // Add prop type if not exists
                    let propEntry = playerData.props.find(p => p.type === propType);
                    if (!propEntry) {
                        // Calculate AI pick based on season average vs line
                        const avgKey = this.getAverageKey(market.key);
                        const seasonAvg = playerData.seasonAverages?.[avgKey];
                        const aiPick = this.calculateAIPickWithAverage(outcome, market.key, seasonAvg);
                        const probability = this.calculateProbabilityWithAverage(outcome.price, seasonAvg, outcome.point);

                        propEntry = {
                            type: propType,
                            line: outcome.point,
                            seasonAverage: seasonAvg || null,
                            aiPick: aiPick,
                            probability: probability,
                            bookLines: {}
                        };
                        playerData.props.push(propEntry);
                    }

                    // Add book-specific line
                    propEntry.bookLines[appKey] = {
                        line: outcome.point,
                        overOdds: outcome.name === 'Over' ? outcome.price : propEntry.bookLines[appKey]?.overOdds,
                        underOdds: outcome.name === 'Under' ? outcome.price : propEntry.bookLines[appKey]?.underOdds
                    };

                    // Track which books have this player
                    if (!playerData.books[appKey]) {
                        playerData.books[appKey] = [];
                    }
                    playerData.books[appKey].push({
                        type: propType,
                        line: outcome.point,
                        odds: outcome.price
                    });
                });
            });
        });

        return Array.from(playerPropsMap.values());
    }

    // Map prop market to season average key
    getAverageKey(marketKey) {
        const mapping = {
            'player_points': 'ppg',
            'player_rebounds': 'rpg',
            'player_assists': 'apg',
            'player_threes': '3pg',
            'player_pass_yds': 'passYds',
            'player_rush_yds': 'rushYds',
            'player_reception_yds': 'recYds'
        };
        return mapping[marketKey] || null;
    }

    // Calculate AI pick using season average
    calculateAIPickWithAverage(outcome, marketKey, seasonAvg) {
        if (seasonAvg && outcome.point) {
            // If player's average is higher than the line, pick Over
            if (seasonAvg > outcome.point) {
                return 'Over';
            } else if (seasonAvg < outcome.point) {
                return 'Under';
            }
        }
        // Fallback to odds-based calculation
        return this.calculateAIPick(outcome, marketKey);
    }

    // Calculate probability using season average
    calculateProbabilityWithAverage(odds, seasonAvg, line) {
        const impliedProb = this.americanToImpliedProb(odds);
        let adjustedProb = Math.round((impliedProb * 0.95 + 0.05) * 100);

        // Adjust based on how far season average is from line
        if (seasonAvg && line) {
            const diff = Math.abs(seasonAvg - line);
            const percentDiff = (diff / line) * 100;

            // If average is significantly different from line, boost probability
            if (percentDiff > 10) {
                adjustedProb = Math.min(adjustedProb + 10, 85);
            } else if (percentDiff > 5) {
                adjustedProb = Math.min(adjustedProb + 5, 80);
            }
        }

        return Math.min(Math.max(adjustedProb, 50), 85);
    }

    extractTeamFromEvent(eventInfo, _playerName) {
        // Try to determine team from event info
        if (eventInfo) {
            const homeTeam = eventInfo.home_team || '';
            const awayTeam = eventInfo.away_team || '';
            return homeTeam.split(' ').pop() || awayTeam.split(' ').pop() || 'TBD';
        }
        return 'TBD';
    }

    getOpponentFromEvent(eventInfo, _playerName) {
        if (eventInfo) {
            const homeTeam = eventInfo.home_team || '';
            const awayTeam = eventInfo.away_team || '';
            return `${awayTeam.split(' ').pop()} / ${homeTeam.split(' ').pop()}`;
        }
        return 'TBD';
    }

    inferPosition(marketKey) {
        const positionMap = {
            'player_pass_yds': 'QB',
            'player_pass_tds': 'QB',
            'player_rush_yds': 'RB/QB',
            'player_rush_tds': 'RB',
            'player_receptions': 'WR/TE',
            'player_reception_yds': 'WR/TE',
            'player_points': 'Player',
            'player_rebounds': 'Player',
            'player_assists': 'Player',
            'player_threes': 'Guard',
            'player_blocks': 'C/PF',
            'player_steals': 'Guard',
            'batter_hits': 'Batter',
            'batter_home_runs': 'Batter',
            'pitcher_strikeouts': 'Pitcher',
            'player_goals': 'Forward',
            'player_shots_on_goal': 'Forward'
        };
        return positionMap[marketKey] || 'Player';
    }

    calculateAIPick(outcome, _marketKey) {
        // AI logic based on odds analysis
        const price = outcome.price;
        const impliedProb = this.americanToImpliedProb(price);

        // If Over has > 52% implied probability, lean Over
        if (outcome.name === 'Over' && impliedProb > 0.48) {
            return 'Over';
        } else if (outcome.name === 'Under' && impliedProb > 0.52) {
            return 'Under';
        }
        return 'Over'; // Default
    }

    calculateProbability(odds) {
        const impliedProb = this.americanToImpliedProb(odds);
        // Adjust for juice and add slight edge detection
        const adjustedProb = Math.round((impliedProb * 0.95 + 0.05) * 100);
        return Math.min(Math.max(adjustedProb, 50), 85); // Clamp between 50-85%
    }

    getPropLabel(key) {
        const labels = {
            // NBA
            'player_points': 'Points',
            'player_rebounds': 'Rebounds',
            'player_assists': 'Assists',
            'player_threes': '3-Pointers',
            'player_blocks': 'Blocks',
            'player_steals': 'Steals',
            'player_points_rebounds_assists': 'PRA',
            'player_points_rebounds': 'Pts+Reb',
            'player_points_assists': 'Pts+Ast',
            'player_rebounds_assists': 'Reb+Ast',
            'player_double_double': 'Double-Double',
            'player_triple_double': 'Triple-Double',
            // NFL
            'player_pass_yds': 'Pass Yards',
            'player_pass_tds': 'Pass TDs',
            'player_pass_completions': 'Completions',
            'player_pass_attempts': 'Pass Attempts',
            'player_interceptions': 'INTs',
            'player_rush_yds': 'Rush Yards',
            'player_rush_tds': 'Rush TDs',
            'player_rush_attempts': 'Rush Attempts',
            'player_receptions': 'Receptions',
            'player_reception_yds': 'Rec Yards',
            'player_reception_tds': 'Rec TDs',
            'player_anytime_td': 'Anytime TD',
            'player_first_td': 'First TD',
            // MLB
            'batter_hits': 'Hits',
            'batter_total_bases': 'Total Bases',
            'batter_rbis': 'RBIs',
            'batter_runs': 'Runs',
            'batter_home_runs': 'Home Run',
            'batter_singles': 'Singles',
            'batter_doubles': 'Doubles',
            'batter_walks': 'Walks',
            'batter_strikeouts': 'Strikeouts',
            'pitcher_strikeouts': 'Strikeouts',
            'pitcher_hits_allowed': 'Hits Allowed',
            'pitcher_earned_runs': 'Earned Runs',
            'pitcher_outs': 'Outs Recorded',
            // NHL
            'player_goals': 'Goals',
            'player_shots_on_goal': 'Shots',
            'player_power_play_points': 'PP Points',
            'player_blocked_shots': 'Blocked Shots',
            'player_hits': 'Hits',
            // Soccer
            'player_shots': 'Shots',
            'player_shots_on_target': 'Shots on Target',
            'player_goal_scorer_anytime': 'Anytime Goal',
            'player_goal_scorer_first': 'First Goal'
        };
        return labels[key] || key.replace('player_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // =====================================================
    // Demo Data (when API key not configured)
    // =====================================================

    getDemoOdds(sport) {
        const now = new Date();
        const games = [];

        const teamsBySport = {
            nba: [
                { home: 'Boston Celtics', away: 'Los Angeles Lakers' },
                { home: 'Denver Nuggets', away: 'Golden State Warriors' },
                { home: 'Phoenix Suns', away: 'Miami Heat' },
                { home: 'Milwaukee Bucks', away: 'New York Knicks' }
            ],
            nfl: [
                { home: 'Kansas City Chiefs', away: 'Philadelphia Eagles' },
                { home: 'San Francisco 49ers', away: 'Dallas Cowboys' },
                { home: 'Buffalo Bills', away: 'Detroit Lions' }
            ],
            mlb: [
                { home: 'Los Angeles Dodgers', away: 'New York Yankees' },
                { home: 'Atlanta Braves', away: 'Houston Astros' }
            ],
            nhl: [
                { home: 'Edmonton Oilers', away: 'Florida Panthers' },
                { home: 'Boston Bruins', away: 'New York Rangers' }
            ]
        };

        const teams = teamsBySport[sport] || teamsBySport.nba;

        teams.forEach((matchup, index) => {
            const gameTime = new Date(now);
            gameTime.setHours(19 + index, 0, 0);

            games.push({
                id: `demo_${sport}_${index}`,
                sport: sport,
                sportName: SPORT_MAPPINGS[sport]?.name || sport.toUpperCase(),
                homeTeam: matchup.home,
                awayTeam: matchup.away,
                commenceTime: gameTime,
                bookmakers: this.generateDemoBookmakers(matchup)
            });
        });

        return games;
    }

    generateDemoBookmakers(matchup) {
        const bookmakers = {};
        const baseSpread = Math.floor(Math.random() * 10) - 5;
        const baseTotal = 200 + Math.floor(Math.random() * 50);
        const baseML = baseSpread * 20;

        Object.keys(BETTING_APPS).forEach(appKey => {
            const app = BETTING_APPS[appKey];
            if (app.type !== 'sportsbook') return;

            const variation = () => Math.floor(Math.random() * 10) - 5;

            bookmakers[appKey] = {
                name: app.name,
                lastUpdate: new Date(),
                markets: {
                    spreads: [
                        { name: matchup.home, price: -110 + variation(), point: baseSpread + (Math.random() * 0.5 - 0.25) },
                        { name: matchup.away, price: -110 + variation(), point: -baseSpread + (Math.random() * 0.5 - 0.25) }
                    ],
                    h2h: [
                        { name: matchup.home, price: baseML > 0 ? baseML + 100 + variation() : -100 + baseML + variation() },
                        { name: matchup.away, price: baseML > 0 ? -baseML - 100 + variation() : 100 - baseML + variation() }
                    ],
                    totals: [
                        { name: 'Over', price: -110 + variation(), point: baseTotal + (Math.random() * 2 - 1) },
                        { name: 'Under', price: -110 + variation(), point: baseTotal + (Math.random() * 2 - 1) }
                    ]
                }
            };
        });

        return bookmakers;
    }

    getDemoGames(sport) {
        const now = new Date();

        const gamesData = {
            nba: [
                { home: { name: 'Boston Celtics', abbr: 'BOS', record: '38-12', score: '0' }, away: { name: 'Los Angeles Lakers', abbr: 'LAL', record: '32-18', score: '0' } },
                { home: { name: 'Denver Nuggets', abbr: 'DEN', record: '35-15', score: '0' }, away: { name: 'Golden State Warriors', abbr: 'GSW', record: '28-22', score: '0' } },
                { home: { name: 'Phoenix Suns', abbr: 'PHX', record: '31-19', score: '0' }, away: { name: 'Miami Heat', abbr: 'MIA', record: '29-21', score: '0' } },
                { home: { name: 'Milwaukee Bucks', abbr: 'MIL', record: '30-20', score: '78', isLive: true }, away: { name: 'New York Knicks', abbr: 'NYK', record: '33-17', score: '72', isLive: true } }
            ],
            nfl: [
                { home: { name: 'Kansas City Chiefs', abbr: 'KC', record: '11-5', score: '0' }, away: { name: 'Philadelphia Eagles', abbr: 'PHI', record: '13-3', score: '0' } },
                { home: { name: 'San Francisco 49ers', abbr: 'SF', record: '12-4', score: '0' }, away: { name: 'Dallas Cowboys', abbr: 'DAL', record: '12-4', score: '0' } }
            ],
            mlb: [
                { home: { name: 'Los Angeles Dodgers', abbr: 'LAD', record: '95-67', score: '0' }, away: { name: 'New York Yankees', abbr: 'NYY', record: '91-71', score: '0' } }
            ],
            nhl: [
                { home: { name: 'Edmonton Oilers', abbr: 'EDM', record: '38-15', score: '0' }, away: { name: 'Florida Panthers', abbr: 'FLA', record: '40-14', score: '0' } }
            ]
        };

        const games = gamesData[sport] || gamesData.nba;

        return games.map((game, index) => {
            const gameTime = new Date(now);
            gameTime.setHours(19 + index, 0, 0);

            return {
                id: `demo_game_${sport}_${index}`,
                sport: sport,
                sportName: SPORT_MAPPINGS[sport]?.name || sport.toUpperCase(),
                name: `${game.away.name} at ${game.home.name}`,
                shortName: `${game.away.abbr} @ ${game.home.abbr}`,
                date: gameTime,
                status: {
                    type: game.home.isLive ? 'STATUS_IN_PROGRESS' : 'STATUS_SCHEDULED',
                    description: game.home.isLive ? 'In Progress' : 'Scheduled',
                    state: game.home.isLive ? 'in' : 'pre'
                },
                homeTeam: {
                    name: game.home.name,
                    abbreviation: game.home.abbr,
                    score: game.home.score,
                    record: game.home.record,
                    logo: null
                },
                awayTeam: {
                    name: game.away.name,
                    abbreviation: game.away.abbr,
                    score: game.away.score,
                    record: game.away.record,
                    logo: null
                },
                isLive: game.home.isLive || false
            };
        });
    }

    getDemoPlayerProps(sport) {
        const propsData = {
            nba: [
                // Lakers vs Celtics
                { player: 'LeBron James', team: 'LAL', position: 'SF', opponent: 'BOS', props: [
                    { type: 'Points', line: 27.5, aiPick: 'Over', probability: 68 },
                    { type: 'Rebounds', line: 7.5, aiPick: 'Over', probability: 72 },
                    { type: 'Assists', line: 7.5, aiPick: 'Under', probability: 55 },
                    { type: 'PRA', line: 42.5, aiPick: 'Over', probability: 65 },
                    { type: '3-Pointers', line: 2.5, aiPick: 'Over', probability: 61 }
                ]},
                { player: 'Anthony Davis', team: 'LAL', position: 'PF/C', opponent: 'BOS', props: [
                    { type: 'Points', line: 25.5, aiPick: 'Over', probability: 66 },
                    { type: 'Rebounds', line: 12.5, aiPick: 'Over', probability: 69 },
                    { type: 'Blocks', line: 2.5, aiPick: 'Over', probability: 62 },
                    { type: 'PRA', line: 40.5, aiPick: 'Over', probability: 64 }
                ]},
                { player: 'Austin Reaves', team: 'LAL', position: 'SG', opponent: 'BOS', props: [
                    { type: 'Points', line: 16.5, aiPick: 'Over', probability: 58 },
                    { type: 'Assists', line: 5.5, aiPick: 'Over', probability: 64 },
                    { type: '3-Pointers', line: 2.5, aiPick: 'Under', probability: 52 }
                ]},
                { player: 'Jayson Tatum', team: 'BOS', position: 'SF', opponent: 'LAL', props: [
                    { type: 'Points', line: 28.5, aiPick: 'Over', probability: 64 },
                    { type: 'Rebounds', line: 8.5, aiPick: 'Under', probability: 58 },
                    { type: '3-Pointers', line: 3.5, aiPick: 'Over', probability: 62 },
                    { type: 'PRA', line: 42.5, aiPick: 'Over', probability: 63 }
                ]},
                { player: 'Jaylen Brown', team: 'BOS', position: 'SG', opponent: 'LAL', props: [
                    { type: 'Points', line: 24.5, aiPick: 'Over', probability: 61 },
                    { type: 'Rebounds', line: 5.5, aiPick: 'Over', probability: 65 },
                    { type: '3-Pointers', line: 2.5, aiPick: 'Over', probability: 58 }
                ]},
                { player: 'Kristaps Porzingis', team: 'BOS', position: 'C', opponent: 'LAL', props: [
                    { type: 'Points', line: 20.5, aiPick: 'Over', probability: 63 },
                    { type: 'Rebounds', line: 7.5, aiPick: 'Over', probability: 66 },
                    { type: 'Blocks', line: 1.5, aiPick: 'Over', probability: 71 }
                ]},
                { player: 'Derrick White', team: 'BOS', position: 'PG', opponent: 'LAL', props: [
                    { type: 'Points', line: 15.5, aiPick: 'Over', probability: 57 },
                    { type: '3-Pointers', line: 2.5, aiPick: 'Over', probability: 60 },
                    { type: 'Assists', line: 4.5, aiPick: 'Under', probability: 54 }
                ]},
                // Nuggets vs Warriors
                { player: 'Nikola Jokic', team: 'DEN', position: 'C', opponent: 'GSW', props: [
                    { type: 'Points', line: 26.5, aiPick: 'Over', probability: 71 },
                    { type: 'Rebounds', line: 12.5, aiPick: 'Over', probability: 65 },
                    { type: 'Assists', line: 9.5, aiPick: 'Over', probability: 69 },
                    { type: 'PRA', line: 48.5, aiPick: 'Over', probability: 68 },
                    { type: 'Double-Double', line: 0.5, aiPick: 'Over', probability: 92 }
                ]},
                { player: 'Jamal Murray', team: 'DEN', position: 'PG', opponent: 'GSW', props: [
                    { type: 'Points', line: 22.5, aiPick: 'Over', probability: 59 },
                    { type: 'Assists', line: 6.5, aiPick: 'Over', probability: 62 },
                    { type: '3-Pointers', line: 3.5, aiPick: 'Under', probability: 56 }
                ]},
                { player: 'Michael Porter Jr.', team: 'DEN', position: 'SF', opponent: 'GSW', props: [
                    { type: 'Points', line: 17.5, aiPick: 'Over', probability: 58 },
                    { type: 'Rebounds', line: 7.5, aiPick: 'Over', probability: 63 },
                    { type: '3-Pointers', line: 2.5, aiPick: 'Over', probability: 55 }
                ]},
                { player: 'Aaron Gordon', team: 'DEN', position: 'PF', opponent: 'GSW', props: [
                    { type: 'Points', line: 14.5, aiPick: 'Over', probability: 60 },
                    { type: 'Rebounds', line: 6.5, aiPick: 'Over', probability: 64 }
                ]},
                { player: 'Stephen Curry', team: 'GSW', position: 'PG', opponent: 'DEN', props: [
                    { type: 'Points', line: 29.5, aiPick: 'Under', probability: 54 },
                    { type: '3-Pointers', line: 5.5, aiPick: 'Over', probability: 58 },
                    { type: 'Assists', line: 6.5, aiPick: 'Over', probability: 61 },
                    { type: 'PRA', line: 38.5, aiPick: 'Under', probability: 52 }
                ]},
                { player: 'Jonathan Kuminga', team: 'GSW', position: 'SF', opponent: 'DEN', props: [
                    { type: 'Points', line: 14.5, aiPick: 'Over', probability: 58 },
                    { type: 'Rebounds', line: 4.5, aiPick: 'Over', probability: 62 }
                ]},
                { player: 'Andrew Wiggins', team: 'GSW', position: 'SF', opponent: 'DEN', props: [
                    { type: 'Points', line: 16.5, aiPick: 'Over', probability: 57 },
                    { type: 'Rebounds', line: 4.5, aiPick: 'Over', probability: 62 }
                ]},
                { player: 'Draymond Green', team: 'GSW', position: 'PF', opponent: 'DEN', props: [
                    { type: 'Assists', line: 6.5, aiPick: 'Over', probability: 65 },
                    { type: 'Rebounds', line: 7.5, aiPick: 'Over', probability: 58 }
                ]},
                { player: 'Brandin Podziemski', team: 'GSW', position: 'SG', opponent: 'DEN', props: [
                    { type: 'Points', line: 10.5, aiPick: 'Over', probability: 55 },
                    { type: 'Assists', line: 4.5, aiPick: 'Over', probability: 58 }
                ]},
                // Suns vs Heat
                { player: 'Kevin Durant', team: 'PHX', position: 'SF', opponent: 'MIA', props: [
                    { type: 'Points', line: 28.5, aiPick: 'Over', probability: 66 },
                    { type: 'Rebounds', line: 6.5, aiPick: 'Over', probability: 62 },
                    { type: 'Assists', line: 5.5, aiPick: 'Under', probability: 55 }
                ]},
                { player: 'Devin Booker', team: 'PHX', position: 'SG', opponent: 'MIA', props: [
                    { type: 'Points', line: 27.5, aiPick: 'Over', probability: 63 },
                    { type: 'Assists', line: 5.5, aiPick: 'Over', probability: 59 },
                    { type: '3-Pointers', line: 2.5, aiPick: 'Over', probability: 61 }
                ]},
                { player: 'Bradley Beal', team: 'PHX', position: 'SG', opponent: 'MIA', props: [
                    { type: 'Points', line: 18.5, aiPick: 'Under', probability: 53 },
                    { type: 'Assists', line: 4.5, aiPick: 'Over', probability: 58 }
                ]},
                { player: 'Jimmy Butler', team: 'MIA', position: 'SF', opponent: 'PHX', props: [
                    { type: 'Points', line: 22.5, aiPick: 'Over', probability: 61 },
                    { type: 'Rebounds', line: 5.5, aiPick: 'Over', probability: 64 },
                    { type: 'Assists', line: 5.5, aiPick: 'Over', probability: 59 },
                    { type: 'Steals', line: 1.5, aiPick: 'Over', probability: 67 }
                ]},
                { player: 'Bam Adebayo', team: 'MIA', position: 'C', opponent: 'PHX', props: [
                    { type: 'Points', line: 19.5, aiPick: 'Over', probability: 62 },
                    { type: 'Rebounds', line: 10.5, aiPick: 'Over', probability: 65 },
                    { type: 'Assists', line: 3.5, aiPick: 'Over', probability: 68 }
                ]},
                { player: 'Tyler Herro', team: 'MIA', position: 'SG', opponent: 'PHX', props: [
                    { type: 'Points', line: 21.5, aiPick: 'Over', probability: 58 },
                    { type: '3-Pointers', line: 3.5, aiPick: 'Over', probability: 56 }
                ]},
                // Bucks vs Knicks
                { player: 'Giannis Antetokounmpo', team: 'MIL', position: 'PF', opponent: 'NYK', props: [
                    { type: 'Points', line: 32.5, aiPick: 'Over', probability: 64 },
                    { type: 'Rebounds', line: 11.5, aiPick: 'Over', probability: 68 },
                    { type: 'Assists', line: 6.5, aiPick: 'Under', probability: 55 },
                    { type: 'PRA', line: 50.5, aiPick: 'Over', probability: 62 }
                ]},
                { player: 'Damian Lillard', team: 'MIL', position: 'PG', opponent: 'NYK', props: [
                    { type: 'Points', line: 26.5, aiPick: 'Over', probability: 61 },
                    { type: '3-Pointers', line: 4.5, aiPick: 'Under', probability: 54 },
                    { type: 'Assists', line: 7.5, aiPick: 'Over', probability: 63 }
                ]},
                { player: 'Khris Middleton', team: 'MIL', position: 'SF', opponent: 'NYK', props: [
                    { type: 'Points', line: 16.5, aiPick: 'Under', probability: 53 },
                    { type: 'Rebounds', line: 4.5, aiPick: 'Over', probability: 58 }
                ]},
                { player: 'Jalen Brunson', team: 'NYK', position: 'PG', opponent: 'MIL', props: [
                    { type: 'Points', line: 27.5, aiPick: 'Over', probability: 65 },
                    { type: 'Assists', line: 6.5, aiPick: 'Over', probability: 68 },
                    { type: 'Rebounds', line: 3.5, aiPick: 'Under', probability: 56 }
                ]},
                { player: 'Karl-Anthony Towns', team: 'NYK', position: 'C', opponent: 'MIL', props: [
                    { type: 'Points', line: 24.5, aiPick: 'Over', probability: 62 },
                    { type: 'Rebounds', line: 12.5, aiPick: 'Over', probability: 64 },
                    { type: '3-Pointers', line: 2.5, aiPick: 'Over', probability: 58 }
                ]},
                { player: 'Mikal Bridges', team: 'NYK', position: 'SF', opponent: 'MIL', props: [
                    { type: 'Points', line: 19.5, aiPick: 'Over', probability: 58 },
                    { type: 'Rebounds', line: 4.5, aiPick: 'Over', probability: 61 },
                    { type: '3-Pointers', line: 2.5, aiPick: 'Under', probability: 54 }
                ]},
                { player: 'OG Anunoby', team: 'NYK', position: 'SF', opponent: 'MIL', props: [
                    { type: 'Points', line: 15.5, aiPick: 'Over', probability: 56 },
                    { type: 'Rebounds', line: 4.5, aiPick: 'Over', probability: 59 },
                    { type: 'Steals', line: 1.5, aiPick: 'Over', probability: 62 }
                ]},
                { player: 'Josh Hart', team: 'NYK', position: 'SG', opponent: 'MIL', props: [
                    { type: 'Points', line: 12.5, aiPick: 'Over', probability: 58 },
                    { type: 'Rebounds', line: 8.5, aiPick: 'Over', probability: 64 },
                    { type: 'Assists', line: 4.5, aiPick: 'Over', probability: 56 }
                ]}
            ],
            nfl: [
                // Chiefs vs Eagles
                { player: 'Patrick Mahomes', team: 'KC', position: 'QB', opponent: 'PHI', props: [
                    { type: 'Pass Yards', line: 285.5, aiPick: 'Over', probability: 67 },
                    { type: 'Pass TDs', line: 2.5, aiPick: 'Over', probability: 58 },
                    { type: 'Rush Yards', line: 24.5, aiPick: 'Over', probability: 55 },
                    { type: 'Completions', line: 24.5, aiPick: 'Over', probability: 62 },
                    { type: 'Interceptions', line: 0.5, aiPick: 'Under', probability: 58 }
                ]},
                { player: 'Travis Kelce', team: 'KC', position: 'TE', opponent: 'PHI', props: [
                    { type: 'Receiving Yards', line: 68.5, aiPick: 'Over', probability: 61 },
                    { type: 'Receptions', line: 6.5, aiPick: 'Over', probability: 64 },
                    { type: 'Receiving TDs', line: 0.5, aiPick: 'Over', probability: 45 }
                ]},
                { player: 'Isiah Pacheco', team: 'KC', position: 'RB', opponent: 'PHI', props: [
                    { type: 'Rush Yards', line: 62.5, aiPick: 'Over', probability: 56 },
                    { type: 'Rush Attempts', line: 14.5, aiPick: 'Over', probability: 63 },
                    { type: 'Anytime TD', line: 0.5, aiPick: 'Over', probability: 48 }
                ]},
                { player: 'Rashee Rice', team: 'KC', position: 'WR', opponent: 'PHI', props: [
                    { type: 'Receiving Yards', line: 72.5, aiPick: 'Over', probability: 59 },
                    { type: 'Receptions', line: 5.5, aiPick: 'Over', probability: 62 }
                ]},
                { player: 'Jalen Hurts', team: 'PHI', position: 'QB', opponent: 'KC', props: [
                    { type: 'Pass Yards', line: 245.5, aiPick: 'Under', probability: 52 },
                    { type: 'Rush Yards', line: 45.5, aiPick: 'Over', probability: 64 },
                    { type: 'Pass TDs', line: 1.5, aiPick: 'Over', probability: 71 },
                    { type: 'Rush TDs', line: 0.5, aiPick: 'Over', probability: 58 }
                ]},
                { player: 'A.J. Brown', team: 'PHI', position: 'WR', opponent: 'KC', props: [
                    { type: 'Receiving Yards', line: 78.5, aiPick: 'Over', probability: 58 },
                    { type: 'Receptions', line: 5.5, aiPick: 'Over', probability: 61 },
                    { type: 'Receiving TDs', line: 0.5, aiPick: 'Over', probability: 44 }
                ]},
                { player: 'DeVonta Smith', team: 'PHI', position: 'WR', opponent: 'KC', props: [
                    { type: 'Receiving Yards', line: 65.5, aiPick: 'Over', probability: 56 },
                    { type: 'Receptions', line: 5.5, aiPick: 'Under', probability: 54 }
                ]},
                { player: 'Saquon Barkley', team: 'PHI', position: 'RB', opponent: 'KC', props: [
                    { type: 'Rush Yards', line: 85.5, aiPick: 'Over', probability: 63 },
                    { type: 'Receiving Yards', line: 25.5, aiPick: 'Over', probability: 58 },
                    { type: 'Rush Attempts', line: 18.5, aiPick: 'Over', probability: 65 },
                    { type: 'Anytime TD', line: 0.5, aiPick: 'Over', probability: 62 },
                    { type: 'Total Yards', line: 115.5, aiPick: 'Over', probability: 59 }
                ]},
                { player: 'Dallas Goedert', team: 'PHI', position: 'TE', opponent: 'KC', props: [
                    { type: 'Receiving Yards', line: 42.5, aiPick: 'Over', probability: 55 },
                    { type: 'Receptions', line: 3.5, aiPick: 'Over', probability: 62 }
                ]},
                // 49ers vs Cowboys
                { player: 'Brock Purdy', team: 'SF', position: 'QB', opponent: 'DAL', props: [
                    { type: 'Pass Yards', line: 268.5, aiPick: 'Over', probability: 61 },
                    { type: 'Pass TDs', line: 2.5, aiPick: 'Over', probability: 55 },
                    { type: 'Completions', line: 22.5, aiPick: 'Over', probability: 58 }
                ]},
                { player: 'Christian McCaffrey', team: 'SF', position: 'RB', opponent: 'DAL', props: [
                    { type: 'Rush Yards', line: 78.5, aiPick: 'Over', probability: 65 },
                    { type: 'Receiving Yards', line: 35.5, aiPick: 'Over', probability: 68 },
                    { type: 'Receptions', line: 4.5, aiPick: 'Over', probability: 72 },
                    { type: 'Anytime TD', line: 0.5, aiPick: 'Over', probability: 71 },
                    { type: 'Total Yards', line: 118.5, aiPick: 'Over', probability: 64 }
                ]},
                { player: 'Deebo Samuel', team: 'SF', position: 'WR', opponent: 'DAL', props: [
                    { type: 'Receiving Yards', line: 58.5, aiPick: 'Over', probability: 55 },
                    { type: 'Rush Yards', line: 12.5, aiPick: 'Over', probability: 61 },
                    { type: 'Total Yards', line: 75.5, aiPick: 'Over', probability: 58 }
                ]},
                { player: 'Brandon Aiyuk', team: 'SF', position: 'WR', opponent: 'DAL', props: [
                    { type: 'Receiving Yards', line: 72.5, aiPick: 'Over', probability: 59 },
                    { type: 'Receptions', line: 5.5, aiPick: 'Over', probability: 56 }
                ]},
                { player: 'George Kittle', team: 'SF', position: 'TE', opponent: 'DAL', props: [
                    { type: 'Receiving Yards', line: 55.5, aiPick: 'Over', probability: 57 },
                    { type: 'Receptions', line: 4.5, aiPick: 'Over', probability: 62 }
                ]},
                { player: 'Dak Prescott', team: 'DAL', position: 'QB', opponent: 'SF', props: [
                    { type: 'Pass Yards', line: 275.5, aiPick: 'Over', probability: 58 },
                    { type: 'Pass TDs', line: 2.5, aiPick: 'Under', probability: 54 },
                    { type: 'Rush Yards', line: 15.5, aiPick: 'Over', probability: 52 }
                ]},
                { player: 'CeeDee Lamb', team: 'DAL', position: 'WR', opponent: 'SF', props: [
                    { type: 'Receiving Yards', line: 88.5, aiPick: 'Under', probability: 53 },
                    { type: 'Receptions', line: 7.5, aiPick: 'Over', probability: 61 },
                    { type: 'Receiving TDs', line: 0.5, aiPick: 'Over', probability: 46 }
                ]},
                { player: 'Rico Dowdle', team: 'DAL', position: 'RB', opponent: 'SF', props: [
                    { type: 'Rush Yards', line: 58.5, aiPick: 'Over', probability: 55 },
                    { type: 'Receiving Yards', line: 18.5, aiPick: 'Over', probability: 58 },
                    { type: 'Anytime TD', line: 0.5, aiPick: 'Under', probability: 54 }
                ]},
                // Bills vs Lions
                { player: 'Josh Allen', team: 'BUF', position: 'QB', opponent: 'DET', props: [
                    { type: 'Pass Yards', line: 265.5, aiPick: 'Over', probability: 59 },
                    { type: 'Pass TDs', line: 2.5, aiPick: 'Over', probability: 61 },
                    { type: 'Rush Yards', line: 35.5, aiPick: 'Over', probability: 64 },
                    { type: 'Rush TDs', line: 0.5, aiPick: 'Over', probability: 52 }
                ]},
                { player: 'Khalil Shakir', team: 'BUF', position: 'WR', opponent: 'DET', props: [
                    { type: 'Receiving Yards', line: 68.5, aiPick: 'Over', probability: 59 },
                    { type: 'Receptions', line: 5.5, aiPick: 'Over', probability: 64 }
                ]},
                { player: 'James Cook', team: 'BUF', position: 'RB', opponent: 'DET', props: [
                    { type: 'Rush Yards', line: 68.5, aiPick: 'Over', probability: 58 },
                    { type: 'Receiving Yards', line: 18.5, aiPick: 'Over', probability: 61 }
                ]},
                { player: 'Dalton Kincaid', team: 'BUF', position: 'TE', opponent: 'DET', props: [
                    { type: 'Receiving Yards', line: 52.5, aiPick: 'Over', probability: 57 },
                    { type: 'Receptions', line: 4.5, aiPick: 'Over', probability: 62 }
                ]},
                { player: 'Jared Goff', team: 'DET', position: 'QB', opponent: 'BUF', props: [
                    { type: 'Pass Yards', line: 278.5, aiPick: 'Over', probability: 63 },
                    { type: 'Pass TDs', line: 2.5, aiPick: 'Over', probability: 58 },
                    { type: 'Completions', line: 23.5, aiPick: 'Over', probability: 61 }
                ]},
                { player: 'Amon-Ra St. Brown', team: 'DET', position: 'WR', opponent: 'BUF', props: [
                    { type: 'Receiving Yards', line: 82.5, aiPick: 'Over', probability: 64 },
                    { type: 'Receptions', line: 7.5, aiPick: 'Over', probability: 68 }
                ]},
                { player: 'Jahmyr Gibbs', team: 'DET', position: 'RB', opponent: 'BUF', props: [
                    { type: 'Rush Yards', line: 58.5, aiPick: 'Over', probability: 55 },
                    { type: 'Receiving Yards', line: 28.5, aiPick: 'Over', probability: 62 },
                    { type: 'Total Yards', line: 88.5, aiPick: 'Over', probability: 58 }
                ]},
                { player: 'David Montgomery', team: 'DET', position: 'RB', opponent: 'BUF', props: [
                    { type: 'Rush Yards', line: 52.5, aiPick: 'Over', probability: 56 },
                    { type: 'Anytime TD', line: 0.5, aiPick: 'Over', probability: 54 }
                ]}
            ],
            nhl: [
                // Oilers vs Panthers
                { player: 'Connor McDavid', team: 'EDM', position: 'C', opponent: 'FLA', props: [
                    { type: 'Points', line: 1.5, aiPick: 'Over', probability: 72 },
                    { type: 'Goals', line: 0.5, aiPick: 'Over', probability: 55 },
                    { type: 'Assists', line: 1.5, aiPick: 'Under', probability: 54 },
                    { type: 'Shots', line: 4.5, aiPick: 'Over', probability: 68 },
                    { type: 'Power Play Points', line: 0.5, aiPick: 'Over', probability: 62 }
                ]},
                { player: 'Leon Draisaitl', team: 'EDM', position: 'C', opponent: 'FLA', props: [
                    { type: 'Points', line: 1.5, aiPick: 'Over', probability: 68 },
                    { type: 'Goals', line: 0.5, aiPick: 'Over', probability: 58 },
                    { type: 'Shots', line: 4.5, aiPick: 'Over', probability: 64 },
                    { type: 'Assists', line: 0.5, aiPick: 'Over', probability: 71 }
                ]},
                { player: 'Zach Hyman', team: 'EDM', position: 'LW', opponent: 'FLA', props: [
                    { type: 'Goals', line: 0.5, aiPick: 'Over', probability: 52 },
                    { type: 'Points', line: 0.5, aiPick: 'Over', probability: 61 },
                    { type: 'Shots', line: 3.5, aiPick: 'Over', probability: 58 }
                ]},
                { player: 'Ryan Nugent-Hopkins', team: 'EDM', position: 'C', opponent: 'FLA', props: [
                    { type: 'Points', line: 0.5, aiPick: 'Over', probability: 58 },
                    { type: 'Assists', line: 0.5, aiPick: 'Over', probability: 54 }
                ]},
                { player: 'Aleksander Barkov', team: 'FLA', position: 'C', opponent: 'EDM', props: [
                    { type: 'Points', line: 0.5, aiPick: 'Over', probability: 64 },
                    { type: 'Goals', line: 0.5, aiPick: 'Over', probability: 48 },
                    { type: 'Shots', line: 3.5, aiPick: 'Over', probability: 56 }
                ]},
                { player: 'Matthew Tkachuk', team: 'FLA', position: 'LW', opponent: 'EDM', props: [
                    { type: 'Points', line: 0.5, aiPick: 'Over', probability: 62 },
                    { type: 'Goals', line: 0.5, aiPick: 'Over', probability: 46 },
                    { type: 'Shots', line: 3.5, aiPick: 'Over', probability: 58 },
                    { type: 'Hits', line: 2.5, aiPick: 'Over', probability: 64 }
                ]},
                { player: 'Sam Reinhart', team: 'FLA', position: 'C', opponent: 'EDM', props: [
                    { type: 'Goals', line: 0.5, aiPick: 'Over', probability: 52 },
                    { type: 'Points', line: 0.5, aiPick: 'Over', probability: 58 }
                ]},
                { player: 'Carter Verhaeghe', team: 'FLA', position: 'LW', opponent: 'EDM', props: [
                    { type: 'Points', line: 0.5, aiPick: 'Over', probability: 54 },
                    { type: 'Goals', line: 0.5, aiPick: 'Over', probability: 42 }
                ]},
                // Bruins vs Rangers
                { player: 'David Pastrnak', team: 'BOS', position: 'RW', opponent: 'NYR', props: [
                    { type: 'Points', line: 1.5, aiPick: 'Under', probability: 54 },
                    { type: 'Goals', line: 0.5, aiPick: 'Over', probability: 55 },
                    { type: 'Shots', line: 4.5, aiPick: 'Over', probability: 66 },
                    { type: 'Power Play Points', line: 0.5, aiPick: 'Over', probability: 58 }
                ]},
                { player: 'Brad Marchand', team: 'BOS', position: 'LW', opponent: 'NYR', props: [
                    { type: 'Points', line: 0.5, aiPick: 'Over', probability: 61 },
                    { type: 'Assists', line: 0.5, aiPick: 'Over', probability: 54 }
                ]},
                { player: 'Charlie McAvoy', team: 'BOS', position: 'D', opponent: 'NYR', props: [
                    { type: 'Points', line: 0.5, aiPick: 'Over', probability: 52 },
                    { type: 'Shots', line: 2.5, aiPick: 'Over', probability: 58 },
                    { type: 'Blocked Shots', line: 2.5, aiPick: 'Over', probability: 61 }
                ]},
                { player: 'Artemi Panarin', team: 'NYR', position: 'LW', opponent: 'BOS', props: [
                    { type: 'Points', line: 1.5, aiPick: 'Under', probability: 56 },
                    { type: 'Goals', line: 0.5, aiPick: 'Over', probability: 48 },
                    { type: 'Assists', line: 0.5, aiPick: 'Over', probability: 58 },
                    { type: 'Shots', line: 3.5, aiPick: 'Over', probability: 62 }
                ]},
                { player: 'Mika Zibanejad', team: 'NYR', position: 'C', opponent: 'BOS', props: [
                    { type: 'Points', line: 0.5, aiPick: 'Over', probability: 58 },
                    { type: 'Goals', line: 0.5, aiPick: 'Over', probability: 45 },
                    { type: 'Shots', line: 3.5, aiPick: 'Over', probability: 55 }
                ]},
                { player: 'Adam Fox', team: 'NYR', position: 'D', opponent: 'BOS', props: [
                    { type: 'Points', line: 0.5, aiPick: 'Over', probability: 61 },
                    { type: 'Assists', line: 0.5, aiPick: 'Over', probability: 55 },
                    { type: 'Shots', line: 2.5, aiPick: 'Over', probability: 58 }
                ]},
                { player: 'Chris Kreider', team: 'NYR', position: 'LW', opponent: 'BOS', props: [
                    { type: 'Goals', line: 0.5, aiPick: 'Over', probability: 48 },
                    { type: 'Points', line: 0.5, aiPick: 'Over', probability: 54 }
                ]}
            ],
            mlb: [
                // Dodgers vs Yankees
                { player: 'Shohei Ohtani', team: 'LAD', position: 'DH', opponent: 'NYY', props: [
                    { type: 'Hits', line: 1.5, aiPick: 'Over', probability: 52 },
                    { type: 'Total Bases', line: 2.5, aiPick: 'Over', probability: 48 },
                    { type: 'RBIs', line: 0.5, aiPick: 'Over', probability: 55 },
                    { type: 'Runs', line: 0.5, aiPick: 'Over', probability: 58 },
                    { type: 'Home Run', line: 0.5, aiPick: 'Over', probability: 28 },
                    { type: 'Walks', line: 0.5, aiPick: 'Over', probability: 62 }
                ]},
                { player: 'Mookie Betts', team: 'LAD', position: 'RF', opponent: 'NYY', props: [
                    { type: 'Hits', line: 1.5, aiPick: 'Under', probability: 54 },
                    { type: 'Total Bases', line: 1.5, aiPick: 'Over', probability: 58 },
                    { type: 'Runs', line: 0.5, aiPick: 'Over', probability: 61 }
                ]},
                { player: 'Freddie Freeman', team: 'LAD', position: '1B', opponent: 'NYY', props: [
                    { type: 'Hits', line: 1.5, aiPick: 'Over', probability: 48 },
                    { type: 'RBIs', line: 0.5, aiPick: 'Over', probability: 52 },
                    { type: 'Total Bases', line: 1.5, aiPick: 'Over', probability: 55 }
                ]},
                { player: 'Max Muncy', team: 'LAD', position: '3B', opponent: 'NYY', props: [
                    { type: 'Hits', line: 0.5, aiPick: 'Over', probability: 56 },
                    { type: 'Home Run', line: 0.5, aiPick: 'Over', probability: 22 },
                    { type: 'RBIs', line: 0.5, aiPick: 'Over', probability: 48 }
                ]},
                { player: 'Aaron Judge', team: 'NYY', position: 'RF', opponent: 'LAD', props: [
                    { type: 'Hits', line: 1.5, aiPick: 'Under', probability: 55 },
                    { type: 'Home Run', line: 0.5, aiPick: 'Over', probability: 32 },
                    { type: 'Total Bases', line: 2.5, aiPick: 'Over', probability: 45 },
                    { type: 'RBIs', line: 0.5, aiPick: 'Over', probability: 54 },
                    { type: 'Strikeouts', line: 1.5, aiPick: 'Over', probability: 62 }
                ]},
                { player: 'Juan Soto', team: 'NYY', position: 'LF', opponent: 'LAD', props: [
                    { type: 'Hits', line: 1.5, aiPick: 'Over', probability: 46 },
                    { type: 'Walks', line: 0.5, aiPick: 'Over', probability: 68 },
                    { type: 'Total Bases', line: 1.5, aiPick: 'Over', probability: 52 }
                ]},
                { player: 'Giancarlo Stanton', team: 'NYY', position: 'DH', opponent: 'LAD', props: [
                    { type: 'Hits', line: 0.5, aiPick: 'Over', probability: 52 },
                    { type: 'Home Run', line: 0.5, aiPick: 'Over', probability: 28 },
                    { type: 'Total Bases', line: 1.5, aiPick: 'Over', probability: 45 }
                ]},
                { player: 'Anthony Volpe', team: 'NYY', position: 'SS', opponent: 'LAD', props: [
                    { type: 'Hits', line: 0.5, aiPick: 'Over', probability: 58 },
                    { type: 'Runs', line: 0.5, aiPick: 'Over', probability: 52 }
                ]},
                { player: 'Gleyber Torres', team: 'NYY', position: '2B', opponent: 'LAD', props: [
                    { type: 'Hits', line: 0.5, aiPick: 'Over', probability: 55 },
                    { type: 'RBIs', line: 0.5, aiPick: 'Under', probability: 54 }
                ]}
            ],
            soccer: [
                // Arsenal vs Chelsea
                { player: 'Bukayo Saka', team: 'ARS', position: 'RW', opponent: 'CHE', props: [
                    { type: 'Shots', line: 2.5, aiPick: 'Over', probability: 62 },
                    { type: 'Shots on Target', line: 1.5, aiPick: 'Over', probability: 54 },
                    { type: 'Anytime Goal', line: 0.5, aiPick: 'Over', probability: 28 },
                    { type: 'Assists', line: 0.5, aiPick: 'Over', probability: 32 }
                ]},
                { player: 'Martin Odegaard', team: 'ARS', position: 'CAM', opponent: 'CHE', props: [
                    { type: 'Shots', line: 2.5, aiPick: 'Over', probability: 58 },
                    { type: 'Key Passes', line: 2.5, aiPick: 'Over', probability: 64 },
                    { type: 'Anytime Goal', line: 0.5, aiPick: 'Over', probability: 25 }
                ]},
                { player: 'Kai Havertz', team: 'ARS', position: 'CF', opponent: 'CHE', props: [
                    { type: 'Shots', line: 2.5, aiPick: 'Over', probability: 55 },
                    { type: 'Headers Won', line: 3.5, aiPick: 'Over', probability: 61 },
                    { type: 'Anytime Goal', line: 0.5, aiPick: 'Over', probability: 32 }
                ]},
                { player: 'Gabriel Jesus', team: 'ARS', position: 'CF', opponent: 'CHE', props: [
                    { type: 'Shots', line: 2.5, aiPick: 'Under', probability: 54 },
                    { type: 'Anytime Goal', line: 0.5, aiPick: 'Over', probability: 28 }
                ]},
                { player: 'Cole Palmer', team: 'CHE', position: 'CAM', opponent: 'ARS', props: [
                    { type: 'Shots', line: 3.5, aiPick: 'Over', probability: 56 },
                    { type: 'Shots on Target', line: 1.5, aiPick: 'Over', probability: 52 },
                    { type: 'Anytime Goal', line: 0.5, aiPick: 'Over', probability: 35 }
                ]},
                { player: 'Nicolas Jackson', team: 'CHE', position: 'CF', opponent: 'ARS', props: [
                    { type: 'Shots', line: 2.5, aiPick: 'Over', probability: 54 },
                    { type: 'Anytime Goal', line: 0.5, aiPick: 'Over', probability: 26 }
                ]},
                { player: 'Raheem Sterling', team: 'CHE', position: 'LW', opponent: 'ARS', props: [
                    { type: 'Shots', line: 1.5, aiPick: 'Over', probability: 58 },
                    { type: 'Dribbles', line: 2.5, aiPick: 'Over', probability: 55 }
                ]},
                { player: 'Enzo Fernandez', team: 'CHE', position: 'CM', opponent: 'ARS', props: [
                    { type: 'Passes', line: 55.5, aiPick: 'Over', probability: 61 },
                    { type: 'Tackles', line: 2.5, aiPick: 'Over', probability: 54 }
                ]}
            ]
        };

        const players = propsData[sport] || propsData.nba;

        return players.map(player => ({
            ...player,
            sport: sport,
            sportName: SPORT_MAPPINGS[sport]?.name || sport.toUpperCase(),
            books: this.generateDemoPropsBooks(player.props)
        }));
    }

    generateDemoPropsBooks(props) {
        const books = {};

        // DFS Apps with player props (different line format with multipliers)
        const dfsApps = ['prizepicks', 'underdog', 'sleeper', 'betr'];

        dfsApps.forEach(appKey => {
            books[appKey] = props.map(prop => {
                // Slight line variations between books (realistic)
                const lineVariation = (Math.random() * 0.5 - 0.25);
                return {
                    type: prop.type,
                    line: parseFloat((prop.line + lineVariation).toFixed(1)),
                    overMultiplier: (1.8 + Math.random() * 0.4).toFixed(2),
                    underMultiplier: (1.8 + Math.random() * 0.4).toFixed(2)
                };
            });
        });

        // Traditional sportsbooks (different odds format)
        const sportsbooks = ['draftkings', 'fanduel', 'betmgm', 'caesars'];

        sportsbooks.forEach(appKey => {
            books[appKey] = props.map(prop => {
                // Each book has slightly different lines and odds
                const lineVariation = (Math.random() * 0.5 - 0.25);
                const oddsVariation = Math.floor(Math.random() * 15) - 7;
                return {
                    type: prop.type,
                    line: parseFloat((prop.line + lineVariation).toFixed(1)),
                    overOdds: -110 + oddsVariation,
                    underOdds: -110 - oddsVariation
                };
            });
        });

        return books;
    }

    // =====================================================
    // AI Predictions (Simulated - would use ML model in production)
    // =====================================================

    generateAIPrediction(game, odds) {
        // In production, this would call an ML model
        // For now, we simulate based on odds

        const homeML = odds?.bookmakers?.draftkings?.markets?.h2h?.[0]?.price || -150;
        const awayML = odds?.bookmakers?.draftkings?.markets?.h2h?.[1]?.price || 130;

        const homeWinProb = this.americanToImpliedProb(homeML);
        const awayWinProb = this.americanToImpliedProb(awayML);

        // Normalize probabilities
        const total = homeWinProb + awayWinProb;
        const normalizedHome = Math.round((homeWinProb / total) * 100);
        const normalizedAway = 100 - normalizedHome;

        const homeScore = sport === 'nhl' ? 3 + Math.floor(Math.random() * 3) :
                         sport === 'mlb' ? 4 + Math.floor(Math.random() * 4) :
                         100 + Math.floor(Math.random() * 30);
        const awayScore = homeScore + (normalizedHome > 50 ? -Math.floor(Math.random() * 10) : Math.floor(Math.random() * 10));

        return {
            winner: normalizedHome > 50 ? game.homeTeam : game.awayTeam,
            homeWinProbability: normalizedHome,
            awayWinProbability: normalizedAway,
            predictedScore: {
                home: homeScore,
                away: awayScore
            },
            confidence: Math.max(normalizedHome, normalizedAway) + Math.floor(Math.random() * 10) - 5,
            factors: this.generateFactors(normalizedHome > 50)
        };
    }

    americanToImpliedProb(odds) {
        if (odds > 0) {
            return 100 / (odds + 100);
        } else {
            return Math.abs(odds) / (Math.abs(odds) + 100);
        }
    }

    generateFactors(homeFavored) {
        const homeFactors = ['Home Court', 'Recent Form', 'Rest Advantage', 'H2H Record', 'Defensive Rating'];
        const awayFactors = ['Road Warriors', 'Star Power', 'Momentum', 'Matchup Edge', 'Offensive Rating'];

        const factors = homeFavored ? homeFactors : awayFactors;
        return factors.slice(0, 3 + Math.floor(Math.random() * 2));
    }
}

// Export
window.SportsAPI = new SportsAPIService();
window.BETTING_APPS = BETTING_APPS;
window.SPORT_MAPPINGS = SPORT_MAPPINGS;
