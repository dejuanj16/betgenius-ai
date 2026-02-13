// =====================================================
// BetGenius AI - Live Odds & Schedule Fetcher
// Fetches TODAY's games from ESPN and filters props
// ESPN APIs are CORS-friendly - no proxy needed
// =====================================================

class LiveOddsFetcher {
    constructor() {
        this.espnBase = 'https://site.api.espn.com/apis/site/v2/sports';
        this.cache = new Map();
        this.cacheExpiry = 2 * 60 * 1000; // 2 minutes
        this.lastFetch = null;
        this.lastFetchDate = null; // Track which date we fetched
        this.todaysGames = new Map(); // Store today's games by sport
        this.teamsPlayingToday = new Map(); // Teams playing today by sport

        // Sports currently in season (February 2026)
        this.activeSports = ['nba', 'nhl', 'ncaab'];
        this.offseasonSports = ['nfl', 'mlb', 'ncaaf'];
    }

    // =====================================================
    // Check if we need to refresh (new day or cache expired)
    // =====================================================
    needsRefresh() {
        const today = new Date().toDateString();

        // If it's a new day, force refresh
        if (this.lastFetchDate !== today) {
            console.log('📅 New day detected - refreshing schedule...');
            return true;
        }

        // If cache expired (2 minutes), refresh
        if (this.lastFetch && (Date.now() - this.lastFetch > this.cacheExpiry)) {
            return true;
        }

        // If no data, refresh
        if (this.todaysGames.size === 0) {
            return true;
        }

        return false;
    }

    // =====================================================
    // Fetch TODAY's schedule for all sports
    // =====================================================
    async fetchTodaysSchedule() {
        console.log('📅 Fetching today\'s schedule...');

        const schedulePromises = this.activeSports.map(sport =>
            this.fetchSportSchedule(sport)
        );

        await Promise.allSettled(schedulePromises);

        // Update cache timestamps
        this.lastFetch = Date.now();
        this.lastFetchDate = new Date().toDateString();

        // Log summary
        let totalGames = 0;
        this.todaysGames.forEach((games, sport) => {
            console.log(`📅 ${sport.toUpperCase()}: ${games.length} games today`);
            totalGames += games.length;
        });

        console.log(`✅ Total games today: ${totalGames}`);
        return this.todaysGames;
    }

    // =====================================================
    // Fetch schedule for a specific sport
    // =====================================================
    async fetchSportSchedule(sport) {
        const sportPath = this.getSportPath(sport);
        if (!sportPath) return [];

        try {
            const url = `${this.espnBase}/${sportPath}/scoreboard`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`ESPN returned ${response.status}`);
            }

            const data = await response.json();
            const games = this.parseSchedule(data, sport);

            // Store games and playing teams
            this.todaysGames.set(sport, games);

            // Extract team abbreviations
            const teams = new Set();
            games.forEach(game => {
                if (game.homeTeam?.abbreviation) teams.add(game.homeTeam.abbreviation.toUpperCase());
                if (game.awayTeam?.abbreviation) teams.add(game.awayTeam.abbreviation.toUpperCase());
            });
            this.teamsPlayingToday.set(sport, teams);

            return games;
        } catch (error) {
            console.warn(`Failed to fetch ${sport} schedule:`, error.message);
            this.todaysGames.set(sport, []);
            this.teamsPlayingToday.set(sport, new Set());
            return [];
        }
    }

    // =====================================================
    // Parse ESPN scoreboard into schedule
    // =====================================================
    parseSchedule(data, sport) {
        const games = [];

        if (!data.events) return games;

        for (const event of data.events) {
            try {
                const competition = event.competitions?.[0];
                if (!competition) continue;

                const homeTeam = competition.competitors?.find(c => c.homeAway === 'home');
                const awayTeam = competition.competitors?.find(c => c.homeAway === 'away');

                if (!homeTeam || !awayTeam) continue;

                const status = competition.status?.type?.name || 'scheduled';
                const isLive = status === 'in_progress' || status === 'STATUS_IN_PROGRESS';
                const isCompleted = status === 'final' || status === 'STATUS_FINAL';

                // Get odds
                const odds = competition.odds?.[0] || {};

                games.push({
                    id: event.id,
                    sport: sport,
                    name: event.name,
                    shortName: event.shortName,
                    startTime: new Date(event.date),
                    status: status,
                    isLive: isLive,
                    isCompleted: isCompleted,
                    venue: competition.venue?.fullName || '',
                    broadcast: competition.broadcasts?.[0]?.names?.[0] || '',
                    homeTeam: {
                        name: homeTeam.team?.displayName || homeTeam.team?.name,
                        abbreviation: homeTeam.team?.abbreviation,
                        logo: homeTeam.team?.logo,
                        score: parseInt(homeTeam.score) || 0,
                        record: homeTeam.records?.[0]?.summary || ''
                    },
                    awayTeam: {
                        name: awayTeam.team?.displayName || awayTeam.team?.name,
                        abbreviation: awayTeam.team?.abbreviation,
                        logo: awayTeam.team?.logo,
                        score: parseInt(awayTeam.score) || 0,
                        record: awayTeam.records?.[0]?.summary || ''
                    },
                    odds: {
                        spread: parseFloat(odds.spread) || 0,
                        total: parseFloat(odds.overUnder) || 0,
                        homeMoneyline: parseInt(odds.homeTeamOdds?.moneyLine) || 0,
                        awayMoneyline: parseInt(odds.awayTeamOdds?.moneyLine) || 0,
                        provider: odds.provider?.name || 'ESPN BET'
                    }
                });
            } catch (e) {
                console.warn('Error parsing game:', e);
            }
        }

        return games;
    }

    // =====================================================
    // Check if a team is playing today
    // =====================================================
    isTeamPlayingToday(teamAbbr, sport) {
        const teams = this.teamsPlayingToday.get(sport.toLowerCase());
        if (!teams || teams.size === 0) return true; // If no schedule loaded, show all
        return teams.has(teamAbbr.toUpperCase());
    }

    // =====================================================
    // Get teams playing today for a sport
    // =====================================================
    getTeamsPlayingToday(sport) {
        return this.teamsPlayingToday.get(sport.toLowerCase()) || new Set();
    }

    // =====================================================
    // Get today's games for a sport
    // =====================================================
    getTodaysGames(sport = 'all') {
        if (sport === 'all') {
            const allGames = [];
            this.todaysGames.forEach((games) => {
                allGames.push(...games);
            });
            return allGames;
        }
        return this.todaysGames.get(sport.toLowerCase()) || [];
    }

    // =====================================================
    // Get schedule summary
    // =====================================================
    getScheduleSummary() {
        const summary = {};
        this.todaysGames.forEach((games, sport) => {
            summary[sport] = {
                gameCount: games.length,
                teams: Array.from(this.teamsPlayingToday.get(sport) || []),
                games: games.map(g => ({
                    matchup: g.shortName || g.name,
                    time: g.startTime,
                    status: g.status
                }))
            };
        });
        return summary;
    }

    // =====================================================
    // Filter demo props to only show TODAY's players
    // =====================================================
    filterPropsForToday(props, sport = 'all') {
        // If schedule not loaded yet, return all props
        if (this.todaysGames.size === 0) {
            console.log('⚠️ Schedule not loaded yet, showing all props');
            return props;
        }

        return props.filter(prop => {
            const propSport = (prop.sport || '').toLowerCase();

            // For MMA/Soccer, we don't filter by team (events are different)
            if (propSport === 'mma' || propSport === 'soccer') {
                // Check if there are any events today
                const games = this.todaysGames.get(propSport) || [];
                return games.length > 0;
            }

            // For team sports (NBA, NHL, NCAAB), filter by team
            const teamAbbr = (prop.team || '').toUpperCase();
            if (!teamAbbr) return false;

            return this.isTeamPlayingToday(teamAbbr, propSport);
        });
    }

    // =====================================================
    // Sport path mapping for ESPN API
    // =====================================================
    getSportPath(sport) {
        const paths = {
            nba: 'basketball/nba',
            nfl: 'football/nfl',
            mlb: 'baseball/mlb',
            nhl: 'hockey/nhl',
            ncaab: 'basketball/mens-college-basketball',
            ncaaf: 'football/college-football',
            soccer: 'soccer/eng.1', // Premier League
            mma: 'mma/ufc'
        };
        return paths[sport.toLowerCase()];
    }

    // =====================================================
    // Fetch live odds (existing method)
    // =====================================================
    async fetchLiveOdds(sport = 'all') {
        // Just return today's games
        await this.fetchTodaysSchedule();
        return this.getTodaysGames(sport);
    }
}

// =====================================================
// Enhanced Props Service - Filters by TODAY's schedule
// =====================================================
class EnhancedPropsService {
    constructor() {
        this.liveOddsFetcher = new LiveOddsFetcher();
        this.lastUpdate = null;
        this.scheduleLoaded = false;
    }

    // =====================================================
    // Initialize - fetch today's schedule
    // =====================================================
    async initialize() {
        console.log('🚀 Initializing BetGenius with today\'s schedule...');
        await this.liveOddsFetcher.fetchTodaysSchedule();
        this.scheduleLoaded = true;
        console.log('✅ Schedule loaded!');
    }

    // =====================================================
    // Get props - filtered to TODAY's games only
    // =====================================================
    async getProps(sport = 'all') {
        // Check if we need to refresh the schedule (new day or cache expired)
        if (this.liveOddsFetcher.needsRefresh()) {
            console.log('🔄 Refreshing schedule...');
            await this.initialize();
        }

        // Ensure schedule is loaded
        if (!this.scheduleLoaded) {
            await this.initialize();
        }

        // Fetch LIVE props from the API
        let allProps = [];

        try {
            // Use relative URL for production, localhost for dev
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const baseUrl = isLocalhost ? 'http://localhost:3001' : '';

            const sportToFetch = sport === 'all' ? 'nba' : sport;
            const response = await fetch(`${baseUrl}/api/props/${sportToFetch}`);

            if (response.ok) {
                const data = await response.json();
                // Handle both array format and object format with .props property
                if (data && data.props && Array.isArray(data.props)) {
                    allProps = data.props;
                    console.log(`📊 Fetched ${data.propsCount || allProps.length} live props from ${data.source || 'API'}`);
                } else if (Array.isArray(data)) {
                    allProps = data;
                }
            }
        } catch (e) {
            console.warn('⚠️ Could not fetch live props:', e.message);
        }

        // Filter to only show players playing TODAY
        const todaysProps = allProps.length > 0
            ? this.liveOddsFetcher.filterPropsForToday(allProps, sport)
            : allProps;

        console.log(`📊 Showing ${todaysProps.length} of ${allProps.length} props for today's games`);

        // Sort by confidence
        todaysProps.sort((a, b) => (b.confidence || 50) - (a.confidence || 50));

        this.lastUpdate = new Date();
        return todaysProps;
    }

    // =====================================================
    // Get props organized by tier - TODAY only
    // =====================================================
    async getPropsByTier(sport = 'all') {
        const props = await this.getProps(sport);

        const tiers = {
            topPicks: [],
            goodValue: [],
            leans: [],
            risky: []
        };

        for (const prop of props) {
            const confidence = prop.confidence || 50;
            let tier = prop.tier;

            if (!tier) {
                if (confidence >= 75) tier = 'topPicks';
                else if (confidence >= 65) tier = 'goodValue';
                else if (confidence >= 55) tier = 'leans';
                else tier = 'risky';
            }

            if (tiers[tier]) {
                tiers[tier].push(prop);
            } else {
                tiers.leans.push(prop);
            }
        }

        // Sort each tier by confidence
        for (const tier of Object.keys(tiers)) {
            tiers[tier].sort((a, b) => (b.confidence || 50) - (a.confidence || 50));
        }

        return tiers;
    }

    // =====================================================
    // Get today's schedule
    // =====================================================
    async getTodaysSchedule() {
        if (!this.scheduleLoaded) {
            await this.initialize();
        }
        return this.liveOddsFetcher.getScheduleSummary();
    }

    // =====================================================
    // Get today's games
    // =====================================================
    async getTodaysGames(sport = 'all') {
        if (!this.scheduleLoaded) {
            await this.initialize();
        }
        return this.liveOddsFetcher.getTodaysGames(sport);
    }

    // =====================================================
    // Get teams playing today
    // =====================================================
    getTeamsPlayingToday(sport) {
        return this.liveOddsFetcher.getTeamsPlayingToday(sport);
    }
}

// =====================================================
// Initialize and Export
// =====================================================
window.LiveOddsFetcher = new LiveOddsFetcher();
window.EnhancedPropsService = new EnhancedPropsService();

// Helper functions for direct access
window.fetchLiveOdds = async (sport) => window.LiveOddsFetcher.fetchLiveOdds(sport);
window.getLiveProps = async (sport) => window.EnhancedPropsService.getProps(sport);
window.getLivePropsByTier = async (sport) => window.EnhancedPropsService.getPropsByTier(sport);
window.getTodaysSchedule = async () => window.EnhancedPropsService.getTodaysSchedule();
window.getTodaysGames = async (sport) => window.EnhancedPropsService.getTodaysGames(sport);

// Auto-initialize on load
window.EnhancedPropsService.initialize().then(() => {
    console.log('🎯 BetGenius ready with today\'s schedule!');
}).catch(err => {
    console.warn('⚠️ Could not load schedule, showing all props:', err.message);
});

console.log('🎯 Live Odds & Schedule Fetcher loaded');
