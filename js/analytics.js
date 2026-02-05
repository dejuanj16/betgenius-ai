// =====================================================
// BetGenius AI - Advanced Analytics Engine
// Team stats, matchup analysis, and AI predictions
// =====================================================

// =====================================================
// NFL Team Stats Database (2024 Season Rankings)
// =====================================================
const NFL_TEAM_STATS = {
    // AFC West
    'Kansas City Chiefs': {
        abbr: 'KC', record: '11-6', division: 'AFC West',
        offense: { rank: 7, passYards: 4102, rushYards: 1789, ppg: 24.8, passRank: 8, rushRank: 15 },
        defense: { rank: 4, passYardsAllowed: 3421, rushYardsAllowed: 1654, ppgAllowed: 19.2, passDefRank: 6, rushDefRank: 12 },
        pace: 'average', homeRecord: '7-2', awayRecord: '4-4', last5: '4-1', ats: '9-8'
    },
    'Las Vegas Raiders': {
        abbr: 'LV', record: '4-13', division: 'AFC West',
        offense: { rank: 28, passYards: 3456, rushYards: 1567, ppg: 17.5, passRank: 26, rushRank: 22 },
        defense: { rank: 24, passYardsAllowed: 4012, rushYardsAllowed: 1987, ppgAllowed: 25.4, passDefRank: 25, rushDefRank: 26 },
        pace: 'slow', homeRecord: '2-7', awayRecord: '2-6', last5: '1-4', ats: '7-10'
    },
    'Los Angeles Chargers': {
        abbr: 'LAC', record: '11-6', division: 'AFC West',
        offense: { rank: 18, passYards: 3678, rushYards: 2012, ppg: 22.1, passRank: 19, rushRank: 8 },
        defense: { rank: 1, passYardsAllowed: 2987, rushYardsAllowed: 1432, ppgAllowed: 17.1, passDefRank: 1, rushDefRank: 8 },
        pace: 'slow', homeRecord: '6-3', awayRecord: '5-3', last5: '3-2', ats: '10-7'
    },
    'Denver Broncos': {
        abbr: 'DEN', record: '10-7', division: 'AFC West',
        offense: { rank: 22, passYards: 3512, rushYards: 1876, ppg: 20.8, passRank: 22, rushRank: 11 },
        defense: { rank: 8, passYardsAllowed: 3567, rushYardsAllowed: 1543, ppgAllowed: 20.1, passDefRank: 10, rushDefRank: 6 },
        pace: 'average', homeRecord: '6-3', awayRecord: '4-4', last5: '3-2', ats: '11-6'
    },

    // AFC North
    'Baltimore Ravens': {
        abbr: 'BAL', record: '12-5', division: 'AFC North',
        offense: { rank: 2, passYards: 3987, rushYards: 2654, ppg: 28.5, passRank: 10, rushRank: 1 },
        defense: { rank: 3, passYardsAllowed: 3234, rushYardsAllowed: 1654, ppgAllowed: 18.8, passDefRank: 4, rushDefRank: 14 },
        pace: 'fast', homeRecord: '7-2', awayRecord: '5-3', last5: '4-1', ats: '10-7'
    },
    'Pittsburgh Steelers': {
        abbr: 'PIT', record: '10-7', division: 'AFC North',
        offense: { rank: 24, passYards: 3345, rushYards: 1798, ppg: 19.8, passRank: 25, rushRank: 13 },
        defense: { rank: 6, passYardsAllowed: 3456, rushYardsAllowed: 1523, ppgAllowed: 19.8, passDefRank: 8, rushDefRank: 5 },
        pace: 'slow', homeRecord: '6-3', awayRecord: '4-4', last5: '2-3', ats: '9-8'
    },
    'Cleveland Browns': {
        abbr: 'CLE', record: '3-14', division: 'AFC North',
        offense: { rank: 32, passYards: 2876, rushYards: 1654, ppg: 15.2, passRank: 32, rushRank: 20 },
        defense: { rank: 20, passYardsAllowed: 3876, rushYardsAllowed: 1876, ppgAllowed: 24.2, passDefRank: 20, rushDefRank: 22 },
        pace: 'slow', homeRecord: '2-6', awayRecord: '1-8', last5: '1-4', ats: '6-11'
    },
    'Cincinnati Bengals': {
        abbr: 'CIN', record: '9-8', division: 'AFC North',
        offense: { rank: 5, passYards: 4234, rushYards: 1654, ppg: 26.2, passRank: 4, rushRank: 21 },
        defense: { rank: 18, passYardsAllowed: 3765, rushYardsAllowed: 1765, ppgAllowed: 23.5, passDefRank: 17, rushDefRank: 18 },
        pace: 'fast', homeRecord: '5-4', awayRecord: '4-4', last5: '4-1', ats: '10-7'
    },

    // AFC East
    'Buffalo Bills': {
        abbr: 'BUF', record: '13-4', division: 'AFC East',
        offense: { rank: 1, passYards: 4456, rushYards: 2123, ppg: 30.2, passRank: 1, rushRank: 4 },
        defense: { rank: 7, passYardsAllowed: 3543, rushYardsAllowed: 1598, ppgAllowed: 20.0, passDefRank: 9, rushDefRank: 9 },
        pace: 'fast', homeRecord: '8-1', awayRecord: '5-3', last5: '5-0', ats: '11-6'
    },
    'Miami Dolphins': {
        abbr: 'MIA', record: '8-9', division: 'AFC East',
        offense: { rank: 10, passYards: 3987, rushYards: 1876, ppg: 24.1, passRank: 9, rushRank: 12 },
        defense: { rank: 22, passYardsAllowed: 3932, rushYardsAllowed: 1832, ppgAllowed: 24.8, passDefRank: 22, rushDefRank: 20 },
        pace: 'fast', homeRecord: '5-4', awayRecord: '3-5', last5: '2-3', ats: '7-10'
    },
    'New York Jets': {
        abbr: 'NYJ', record: '5-12', division: 'AFC East',
        offense: { rank: 26, passYards: 3345, rushYards: 1654, ppg: 18.5, passRank: 24, rushRank: 19 },
        defense: { rank: 12, passYardsAllowed: 3654, rushYardsAllowed: 1654, ppgAllowed: 21.5, passDefRank: 12, rushDefRank: 13 },
        pace: 'slow', homeRecord: '3-5', awayRecord: '2-7', last5: '1-4', ats: '6-11'
    },
    'New England Patriots': {
        abbr: 'NE', record: '4-13', division: 'AFC East',
        offense: { rank: 30, passYards: 3123, rushYards: 1543, ppg: 16.8, passRank: 30, rushRank: 24 },
        defense: { rank: 26, passYardsAllowed: 4098, rushYardsAllowed: 1923, ppgAllowed: 26.1, passDefRank: 26, rushDefRank: 24 },
        pace: 'slow', homeRecord: '2-6', awayRecord: '2-7', last5: '1-4', ats: '7-10'
    },

    // AFC South
    'Houston Texans': {
        abbr: 'HOU', record: '10-7', division: 'AFC South',
        offense: { rank: 8, passYards: 4012, rushYards: 1765, ppg: 24.6, passRank: 7, rushRank: 16 },
        defense: { rank: 16, passYardsAllowed: 3698, rushYardsAllowed: 1732, ppgAllowed: 22.8, passDefRank: 16, rushDefRank: 17 },
        pace: 'fast', homeRecord: '6-3', awayRecord: '4-4', last5: '3-2', ats: '9-8'
    },
    'Indianapolis Colts': {
        abbr: 'IND', record: '8-9', division: 'AFC South',
        offense: { rank: 15, passYards: 3765, rushYards: 2098, ppg: 23.2, passRank: 16, rushRank: 6 },
        defense: { rank: 14, passYardsAllowed: 3654, rushYardsAllowed: 1698, ppgAllowed: 22.1, passDefRank: 14, rushDefRank: 15 },
        pace: 'average', homeRecord: '5-3', awayRecord: '3-6', last5: '2-3', ats: '8-9'
    },
    'Jacksonville Jaguars': {
        abbr: 'JAX', record: '4-13', division: 'AFC South',
        offense: { rank: 27, passYards: 3432, rushYards: 1543, ppg: 17.8, passRank: 27, rushRank: 25 },
        defense: { rank: 28, passYardsAllowed: 4123, rushYardsAllowed: 1987, ppgAllowed: 26.8, passDefRank: 28, rushDefRank: 25 },
        pace: 'average', homeRecord: '2-7', awayRecord: '2-6', last5: '1-4', ats: '5-12'
    },
    'Tennessee Titans': {
        abbr: 'TEN', record: '3-14', division: 'AFC South',
        offense: { rank: 31, passYards: 2987, rushYards: 1432, ppg: 15.8, passRank: 31, rushRank: 28 },
        defense: { rank: 30, passYardsAllowed: 4234, rushYardsAllowed: 2012, ppgAllowed: 27.5, passDefRank: 30, rushDefRank: 28 },
        pace: 'slow', homeRecord: '2-6', awayRecord: '1-8', last5: '0-5', ats: '5-12'
    },

    // NFC West
    'San Francisco 49ers': {
        abbr: 'SF', record: '6-11', division: 'NFC West',
        offense: { rank: 12, passYards: 3876, rushYards: 1923, ppg: 23.8, passRank: 13, rushRank: 9 },
        defense: { rank: 10, passYardsAllowed: 3598, rushYardsAllowed: 1587, ppgAllowed: 21.2, passDefRank: 11, rushDefRank: 7 },
        pace: 'average', homeRecord: '4-5', awayRecord: '2-6', last5: '2-3', ats: '6-11'
    },
    'Seattle Seahawks': {
        abbr: 'SEA', record: '10-7', division: 'NFC West',
        offense: { rank: 11, passYards: 3897, rushYards: 1854, ppg: 23.9, passRank: 11, rushRank: 10 },
        defense: { rank: 21, passYardsAllowed: 3898, rushYardsAllowed: 1798, ppgAllowed: 24.5, passDefRank: 21, rushDefRank: 19 },
        pace: 'average', homeRecord: '6-3', awayRecord: '4-4', last5: '3-2', ats: '9-8'
    },
    'Los Angeles Rams': {
        abbr: 'LAR', record: '10-7', division: 'NFC West',
        offense: { rank: 9, passYards: 3998, rushYards: 1765, ppg: 24.2, passRank: 6, rushRank: 17 },
        defense: { rank: 15, passYardsAllowed: 3687, rushYardsAllowed: 1743, ppgAllowed: 22.5, passDefRank: 15, rushDefRank: 16 },
        pace: 'fast', homeRecord: '6-3', awayRecord: '4-4', last5: '4-1', ats: '10-7'
    },
    'Arizona Cardinals': {
        abbr: 'ARI', record: '8-9', division: 'NFC West',
        offense: { rank: 17, passYards: 3698, rushYards: 1876, ppg: 22.3, passRank: 18, rushRank: 10 },
        defense: { rank: 25, passYardsAllowed: 4032, rushYardsAllowed: 1876, ppgAllowed: 25.8, passDefRank: 24, rushDefRank: 21 },
        pace: 'fast', homeRecord: '5-4', awayRecord: '3-5', last5: '2-3', ats: '8-9'
    },

    // NFC North
    'Detroit Lions': {
        abbr: 'DET', record: '15-2', division: 'NFC North',
        offense: { rank: 3, passYards: 4187, rushYards: 2234, ppg: 29.8, passRank: 5, rushRank: 2 },
        defense: { rank: 9, passYardsAllowed: 3576, rushYardsAllowed: 1576, ppgAllowed: 20.8, passDefRank: 7, rushDefRank: 4 },
        pace: 'fast', homeRecord: '8-1', awayRecord: '7-1', last5: '5-0', ats: '12-5'
    },
    'Minnesota Vikings': {
        abbr: 'MIN', record: '14-3', division: 'NFC North',
        offense: { rank: 4, passYards: 4156, rushYards: 1876, ppg: 27.5, passRank: 3, rushRank: 14 },
        defense: { rank: 5, passYardsAllowed: 3387, rushYardsAllowed: 1543, ppgAllowed: 19.5, passDefRank: 5, rushDefRank: 3 },
        pace: 'average', homeRecord: '8-1', awayRecord: '6-2', last5: '4-1', ats: '11-6'
    },
    'Green Bay Packers': {
        abbr: 'GB', record: '11-6', division: 'NFC North',
        offense: { rank: 6, passYards: 4087, rushYards: 1987, ppg: 25.5, passRank: 12, rushRank: 7 },
        defense: { rank: 11, passYardsAllowed: 3632, rushYardsAllowed: 1632, ppgAllowed: 21.3, passDefRank: 13, rushDefRank: 11 },
        pace: 'average', homeRecord: '7-2', awayRecord: '4-4', last5: '3-2', ats: '10-7'
    },
    'Chicago Bears': {
        abbr: 'CHI', record: '5-12', division: 'NFC North',
        offense: { rank: 25, passYards: 3365, rushYards: 1743, ppg: 19.2, passRank: 23, rushRank: 18 },
        defense: { rank: 19, passYardsAllowed: 3832, rushYardsAllowed: 1798, ppgAllowed: 23.8, passDefRank: 19, rushDefRank: 23 },
        pace: 'average', homeRecord: '3-5', awayRecord: '2-7', last5: '2-3', ats: '7-10'
    },

    // NFC East
    'Philadelphia Eagles': {
        abbr: 'PHI', record: '14-3', division: 'NFC East',
        offense: { rank: 13, passYards: 3854, rushYards: 2345, ppg: 26.8, passRank: 14, rushRank: 3 },
        defense: { rank: 2, passYardsAllowed: 3123, rushYardsAllowed: 1476, ppgAllowed: 18.2, passDefRank: 2, rushDefRank: 2 },
        pace: 'average', homeRecord: '8-1', awayRecord: '6-2', last5: '5-0', ats: '12-5'
    },
    'Washington Commanders': {
        abbr: 'WAS', record: '12-5', division: 'NFC East',
        offense: { rank: 14, passYards: 3798, rushYards: 1932, ppg: 24.5, passRank: 15, rushRank: 8 },
        defense: { rank: 17, passYardsAllowed: 3743, rushYardsAllowed: 1765, ppgAllowed: 23.2, passDefRank: 18, rushDefRank: 18 },
        pace: 'average', homeRecord: '7-2', awayRecord: '5-3', last5: '4-1', ats: '10-7'
    },
    'Dallas Cowboys': {
        abbr: 'DAL', record: '7-10', division: 'NFC East',
        offense: { rank: 19, passYards: 3654, rushYards: 1654, ppg: 21.8, passRank: 17, rushRank: 23 },
        defense: { rank: 23, passYardsAllowed: 3965, rushYardsAllowed: 1854, ppgAllowed: 25.2, passDefRank: 23, rushDefRank: 21 },
        pace: 'average', homeRecord: '4-5', awayRecord: '3-5', last5: '2-3', ats: '7-10'
    },
    'New York Giants': {
        abbr: 'NYG', record: '3-14', division: 'NFC East',
        offense: { rank: 29, passYards: 3187, rushYards: 1487, ppg: 16.5, passRank: 29, rushRank: 27 },
        defense: { rank: 29, passYardsAllowed: 4187, rushYardsAllowed: 1987, ppgAllowed: 27.2, passDefRank: 29, rushDefRank: 27 },
        pace: 'slow', homeRecord: '2-6', awayRecord: '1-8', last5: '0-5', ats: '5-12'
    },

    // NFC South
    'Tampa Bay Buccaneers': {
        abbr: 'TB', record: '10-7', division: 'NFC South',
        offense: { rank: 16, passYards: 3743, rushYards: 1543, ppg: 22.8, passRank: 20, rushRank: 26 },
        defense: { rank: 27, passYardsAllowed: 4109, rushYardsAllowed: 1654, ppgAllowed: 26.5, passDefRank: 28, rushDefRank: 10 },
        pace: 'average', homeRecord: '6-3', awayRecord: '4-4', last5: '3-2', ats: '9-8'
    },
    'Atlanta Falcons': {
        abbr: 'ATL', record: '8-9', division: 'NFC South',
        offense: { rank: 20, passYards: 3623, rushYards: 2087, ppg: 22.5, passRank: 21, rushRank: 5 },
        defense: { rank: 31, passYardsAllowed: 4276, rushYardsAllowed: 1998, ppgAllowed: 28.2, passDefRank: 31, rushDefRank: 26 },
        pace: 'average', homeRecord: '5-4', awayRecord: '3-5', last5: '2-3', ats: '8-9'
    },
    'New Orleans Saints': {
        abbr: 'NO', record: '5-12', division: 'NFC South',
        offense: { rank: 21, passYards: 3587, rushYards: 1698, ppg: 21.2, passRank: 28, rushRank: 19 },
        defense: { rank: 13, passYardsAllowed: 3643, rushYardsAllowed: 1687, ppgAllowed: 21.8, passDefRank: 3, rushDefRank: 16 },
        pace: 'slow', homeRecord: '3-5', awayRecord: '2-7', last5: '1-4', ats: '6-11'
    },
    'Carolina Panthers': {
        abbr: 'CAR', record: '5-12', division: 'NFC South',
        offense: { rank: 23, passYards: 3498, rushYards: 1576, ppg: 20.2, passRank: 23, rushRank: 24 },
        defense: { rank: 32, passYardsAllowed: 4312, rushYardsAllowed: 2098, ppgAllowed: 29.5, passDefRank: 32, rushDefRank: 30 },
        pace: 'slow', homeRecord: '3-5', awayRecord: '2-7', last5: '2-3', ats: '7-10'
    }
};

// =====================================================
// NBA Team Stats Database (2024-25 Season)
// =====================================================
const NBA_TEAM_STATS = {
    'Boston Celtics': {
        abbr: 'BOS', record: '38-12', conference: 'East',
        offense: { rank: 2, ppg: 119.5, pace: 100.2, offRating: 122.3, threeRate: 0.42 },
        defense: { rank: 1, oppPpg: 108.2, defRating: 110.5, oppThreeRate: 0.34 },
        rebounding: { rank: 8, rpg: 44.2, oppRpg: 42.1 },
        homeRecord: '22-4', awayRecord: '16-8', last10: '8-2', ats: '28-22'
    },
    'Cleveland Cavaliers': {
        abbr: 'CLE', record: '40-9', conference: 'East',
        offense: { rank: 1, ppg: 121.2, pace: 98.5, offRating: 123.1, threeRate: 0.38 },
        defense: { rank: 3, oppPpg: 109.5, defRating: 111.2, oppThreeRate: 0.35 },
        rebounding: { rank: 5, rpg: 45.1, oppRpg: 41.8 },
        homeRecord: '23-2', awayRecord: '17-7', last10: '9-1', ats: '30-19'
    },
    'Oklahoma City Thunder': {
        abbr: 'OKC', record: '37-10', conference: 'West',
        offense: { rank: 4, ppg: 117.8, pace: 99.8, offRating: 120.5, threeRate: 0.36 },
        defense: { rank: 2, oppPpg: 106.8, defRating: 109.8, oppThreeRate: 0.33 },
        rebounding: { rank: 3, rpg: 45.8, oppRpg: 41.2 },
        homeRecord: '21-3', awayRecord: '16-7', last10: '7-3', ats: '29-18'
    },
    'Denver Nuggets': {
        abbr: 'DEN', record: '32-18', conference: 'West',
        offense: { rank: 5, ppg: 116.5, pace: 97.2, offRating: 119.8, threeRate: 0.35 },
        defense: { rank: 12, oppPpg: 113.2, defRating: 116.5, oppThreeRate: 0.37 },
        rebounding: { rank: 1, rpg: 47.2, oppRpg: 40.5 },
        homeRecord: '20-5', awayRecord: '12-13', last10: '6-4', ats: '24-26'
    },
    'Los Angeles Lakers': {
        abbr: 'LAL', record: '28-21', conference: 'West',
        offense: { rank: 11, ppg: 114.2, pace: 99.5, offRating: 115.8, threeRate: 0.33 },
        defense: { rank: 18, oppPpg: 115.8, defRating: 118.2, oppThreeRate: 0.38 },
        rebounding: { rank: 6, rpg: 44.8, oppRpg: 43.2 },
        homeRecord: '17-8', awayRecord: '11-13', last10: '5-5', ats: '23-26'
    },
    'Golden State Warriors': {
        abbr: 'GSW', record: '24-24', conference: 'West',
        offense: { rank: 15, ppg: 112.5, pace: 101.2, offRating: 114.2, threeRate: 0.40 },
        defense: { rank: 22, oppPpg: 117.2, defRating: 119.5, oppThreeRate: 0.39 },
        rebounding: { rank: 20, rpg: 42.1, oppRpg: 44.5 },
        homeRecord: '15-10', awayRecord: '9-14', last10: '4-6', ats: '20-28'
    },
    'Phoenix Suns': {
        abbr: 'PHX', record: '26-22', conference: 'West',
        offense: { rank: 8, ppg: 115.2, pace: 98.8, offRating: 117.5, threeRate: 0.34 },
        defense: { rank: 16, oppPpg: 114.5, defRating: 117.8, oppThreeRate: 0.36 },
        rebounding: { rank: 25, rpg: 41.5, oppRpg: 44.8 },
        homeRecord: '16-8', awayRecord: '10-14', last10: '6-4', ats: '22-26'
    },
    'Miami Heat': {
        abbr: 'MIA', record: '24-24', conference: 'East',
        offense: { rank: 20, ppg: 110.8, pace: 96.5, offRating: 113.2, threeRate: 0.36 },
        defense: { rank: 8, oppPpg: 111.5, defRating: 114.8, oppThreeRate: 0.35 },
        rebounding: { rank: 15, rpg: 43.2, oppRpg: 43.5 },
        homeRecord: '15-9', awayRecord: '9-15', last10: '5-5', ats: '21-27'
    },
    'Milwaukee Bucks': {
        abbr: 'MIL', record: '26-22', conference: 'East',
        offense: { rank: 6, ppg: 115.8, pace: 99.2, offRating: 118.2, threeRate: 0.37 },
        defense: { rank: 14, oppPpg: 113.8, defRating: 116.8, oppThreeRate: 0.36 },
        rebounding: { rank: 10, rpg: 43.8, oppRpg: 42.8 },
        homeRecord: '16-8', awayRecord: '10-14', last10: '6-4', ats: '23-25'
    },
    'New York Knicks': {
        abbr: 'NYK', record: '32-18', conference: 'East',
        offense: { rank: 10, ppg: 114.5, pace: 97.8, offRating: 116.5, threeRate: 0.35 },
        defense: { rank: 5, oppPpg: 110.2, defRating: 112.5, oppThreeRate: 0.34 },
        rebounding: { rank: 2, rpg: 46.5, oppRpg: 41.2 },
        homeRecord: '19-6', awayRecord: '13-12', last10: '7-3', ats: '27-23'
    }
};

// =====================================================
// Analytics Engine Class
// =====================================================
class MatchupAnalyzer {
    constructor() {
        this.nflStats = NFL_TEAM_STATS;
        this.nbaStats = NBA_TEAM_STATS;
    }

    // Get team stats by name (fuzzy matching)
    getTeamStats(teamName, sport) {
        const stats = sport === 'nfl' ? this.nflStats : this.nbaStats;

        // Direct match
        if (stats[teamName]) return stats[teamName];

        // Fuzzy match by team name
        const teamKey = Object.keys(stats).find(key => {
            const lowerKey = key.toLowerCase();
            const lowerName = teamName.toLowerCase();
            return lowerKey.includes(lowerName) || lowerName.includes(lowerKey) ||
                   stats[key].abbr.toLowerCase() === lowerName;
        });

        return teamKey ? stats[teamKey] : null;
    }

    // =====================================================
    // MAIN ANALYSIS: Generate comprehensive matchup analysis
    // =====================================================
    analyzeMatchup(homeTeam, awayTeam, sport) {
        const homeStats = this.getTeamStats(homeTeam, sport);
        const awayStats = this.getTeamStats(awayTeam, sport);

        if (!homeStats || !awayStats) {
            return this.generateBasicPrediction(homeTeam, awayTeam);
        }

        const analysis = {
            homeTeam: { name: homeTeam, stats: homeStats },
            awayTeam: { name: awayTeam, stats: awayStats },
            sport: sport,
            matchupAdvantages: [],
            hiddenFactors: [],
            blowoutProbability: 0,
            closenessScore: 0,
            predictedTotal: 0,
            prediction: null
        };

        if (sport === 'nfl') {
            return this.analyzeNFLMatchup(analysis);
        } else {
            return this.analyzeNBAMatchup(analysis);
        }
    }

    // =====================================================
    // NFL Specific Analysis
    // =====================================================
    analyzeNFLMatchup(analysis) {
        const home = analysis.homeTeam.stats;
        const away = analysis.awayTeam.stats;

        // Parse records
        const homeWins = parseInt(home.record.split('-')[0]);
        const homeLosses = parseInt(home.record.split('-')[1]);
        const awayWins = parseInt(away.record.split('-')[0]);
        const awayLosses = parseInt(away.record.split('-')[1]);

        // Calculate base win probabilities from records
        const homeWinPct = homeWins / (homeWins + homeLosses);
        const awayWinPct = awayWins / (awayWins + awayLosses);

        // =====================================================
        // KEY MATCHUP ANALYSIS: Offense vs Defense
        // =====================================================

        // Away Pass Offense vs Home Pass Defense
        const passMatchup = this.analyzePassingMatchup(away.offense, home.defense, 'away');
        analysis.matchupAdvantages.push(passMatchup);

        // Home Pass Offense vs Away Pass Defense
        const homePassMatchup = this.analyzePassingMatchup(home.offense, away.defense, 'home');
        analysis.matchupAdvantages.push(homePassMatchup);

        // Rush Matchups
        const rushMatchup = this.analyzeRushingMatchup(away.offense, home.defense, 'away');
        analysis.matchupAdvantages.push(rushMatchup);

        const homeRushMatchup = this.analyzeRushingMatchup(home.offense, away.defense, 'home');
        analysis.matchupAdvantages.push(homeRushMatchup);

        // =====================================================
        // HIDDEN VALUE DETECTION
        // =====================================================

        // Record vs Stats Mismatch (Your Tampa Bay example)
        const recordMismatch = this.detectRecordStatsMismatch(home, away);
        if (recordMismatch) {
            analysis.hiddenFactors.push(recordMismatch);
        }

        // Recent Form Analysis
        const homeForm = this.parseRecord(home.last5);
        const awayForm = this.parseRecord(away.last5);
        if (Math.abs(homeForm - awayForm) > 0.3) {
            analysis.hiddenFactors.push({
                type: 'recent_form',
                description: homeForm > awayForm ?
                    `${analysis.homeTeam.name} is ${home.last5} in last 5, trending UP` :
                    `${analysis.awayTeam.name} is ${away.last5} in last 5, trending UP`,
                impact: 'medium',
                adjustment: homeForm > awayForm ? 5 : -5
            });
        }

        // Home/Away Splits
        const homeHomePct = this.parseRecord(home.homeRecord);
        const awayAwayPct = this.parseRecord(away.awayRecord);
        if (homeHomePct > 0.7 && awayAwayPct < 0.5) {
            analysis.hiddenFactors.push({
                type: 'venue_splits',
                description: `${analysis.homeTeam.name} is ${home.homeRecord} at home, ${analysis.awayTeam.name} is ${away.awayRecord} on road`,
                impact: 'high',
                adjustment: 8
            });
        }

        // ATS Trends
        const homeATS = this.parseRecord(home.ats);
        const awayATS = this.parseRecord(away.ats);
        if (homeATS > 0.6 || awayATS > 0.6) {
            analysis.hiddenFactors.push({
                type: 'ats_trend',
                description: homeATS > awayATS ?
                    `${analysis.homeTeam.name} covers at ${Math.round(homeATS * 100)}%` :
                    `${analysis.awayTeam.name} covers at ${Math.round(awayATS * 100)}%`,
                impact: 'medium',
                adjustment: homeATS > awayATS ? 3 : -3
            });
        }

        // =====================================================
        // BLOWOUT & CLOSENESS PROBABILITY
        // =====================================================

        // Calculate point differential expectation
        const homeExpectedPoints = home.offense.ppg * (32 / away.defense.rank);
        const awayExpectedPoints = away.offense.ppg * (32 / home.defense.rank);
        const expectedDiff = Math.abs(homeExpectedPoints - awayExpectedPoints);

        analysis.blowoutProbability = Math.min(85, Math.round(expectedDiff * 3 +
            (Math.abs(homeWinPct - awayWinPct) * 30)));

        analysis.closenessScore = Math.max(15, 100 - analysis.blowoutProbability);

        // Predicted total
        analysis.predictedTotal = Math.round(homeExpectedPoints + awayExpectedPoints);

        // =====================================================
        // FINAL PREDICTION
        // =====================================================

        let homeAdvantage = 3; // Base home field advantage
        let confidenceAdjustment = 0;

        // Apply matchup advantages
        analysis.matchupAdvantages.forEach(adv => {
            if (adv.favors === 'home') {
                homeAdvantage += adv.value * 0.5;
            } else {
                homeAdvantage -= adv.value * 0.5;
            }
        });

        // Apply hidden factors
        analysis.hiddenFactors.forEach(factor => {
            homeAdvantage += factor.adjustment;
            confidenceAdjustment += Math.abs(factor.adjustment) * 0.5;
        });

        // Calculate final probabilities
        const baseHomeProb = (homeWinPct * 0.4 + (1 - awayWinPct) * 0.3 + 0.53 * 0.3) * 100;
        const adjustedHomeProb = Math.min(85, Math.max(15, baseHomeProb + homeAdvantage));

        analysis.prediction = {
            winner: adjustedHomeProb > 50 ? analysis.homeTeam.name : analysis.awayTeam.name,
            winnerAbbr: adjustedHomeProb > 50 ? home.abbr : away.abbr,
            homeWinProbability: Math.round(adjustedHomeProb),
            awayWinProbability: Math.round(100 - adjustedHomeProb),
            predictedSpread: Math.round((adjustedHomeProb - 50) * 0.3 * 10) / 10,
            confidence: Math.min(92, Math.round(50 + Math.abs(adjustedHomeProb - 50) + confidenceAdjustment)),
            predictedScore: {
                home: Math.round(homeExpectedPoints),
                away: Math.round(awayExpectedPoints)
            }
        };

        return analysis;
    }

    // Analyze passing matchup
    analyzePassingMatchup(offense, defense, side) {
        const offRank = offense.passRank;
        const defRank = defense.passDefRank;
        const mismatch = defRank - offRank; // Positive = advantage to offense

        let description = '';
        let value = 0;
        let impact = 'low';

        if (mismatch >= 15) {
            description = `Major passing mismatch: #${offRank} pass offense vs #${defRank} pass defense`;
            value = 8;
            impact = 'critical';
        } else if (mismatch >= 8) {
            description = `Favorable passing matchup: #${offRank} pass offense vs #${defRank} pass defense`;
            value = 5;
            impact = 'high';
        } else if (mismatch <= -15) {
            description = `Tough passing matchup: #${offRank} pass offense vs #${defRank} pass defense`;
            value = -6;
            impact = 'high';
        } else if (mismatch <= -8) {
            description = `Challenging passing matchup: #${offRank} pass offense vs #${defRank} pass defense`;
            value = -3;
            impact = 'medium';
        } else {
            description = `Even passing matchup: #${offRank} vs #${defRank}`;
            value = 0;
            impact = 'low';
        }

        return {
            type: 'passing',
            side: side,
            favors: mismatch > 0 ? (side === 'away' ? 'away' : 'home') : (side === 'away' ? 'home' : 'away'),
            description: description,
            value: Math.abs(value),
            impact: impact,
            offenseRank: offRank,
            defenseRank: defRank
        };
    }

    // Analyze rushing matchup
    analyzeRushingMatchup(offense, defense, side) {
        const offRank = offense.rushRank;
        const defRank = defense.rushDefRank;
        const mismatch = defRank - offRank;

        let description = '';
        let value = 0;
        let impact = 'low';

        if (mismatch >= 12) {
            description = `Run game advantage: #${offRank} rush offense vs #${defRank} rush defense`;
            value = 6;
            impact = 'high';
        } else if (mismatch >= 6) {
            description = `Favorable run matchup: #${offRank} rush offense vs #${defRank} rush defense`;
            value = 3;
            impact = 'medium';
        } else if (mismatch <= -12) {
            description = `Run game stifled: #${offRank} rush offense vs #${defRank} rush defense`;
            value = -5;
            impact = 'high';
        } else {
            description = `Neutral run matchup`;
            value = 0;
            impact = 'low';
        }

        return {
            type: 'rushing',
            side: side,
            favors: mismatch > 0 ? (side === 'away' ? 'away' : 'home') : (side === 'away' ? 'home' : 'away'),
            description: description,
            value: Math.abs(value),
            impact: impact
        };
    }

    // Detect record vs stats mismatch (hidden value finder)
    detectRecordStatsMismatch(home, away) {
        const homeWinPct = this.parseRecord(home.record);
        const awayWinPct = this.parseRecord(away.record);

        // Check if worse record team has better key stats
        if (homeWinPct > awayWinPct + 0.15) {
            // Home team has better record, but check if away has hidden advantages
            if (away.offense.passRank < home.defense.passDefRank - 10) {
                return {
                    type: 'hidden_value',
                    description: `⚠️ HIDDEN VALUE: ${away.abbr} is #${away.offense.passRank} in passing vs ${home.abbr}'s #${home.defense.passDefRank} ranked pass defense. Record (${away.record}) doesn't reflect offensive capability.`,
                    impact: 'critical',
                    adjustment: -7
                };
            }
        } else if (awayWinPct > homeWinPct + 0.15) {
            // Away team has better record, but check if home has hidden advantages
            if (home.offense.passRank < away.defense.passDefRank - 10) {
                return {
                    type: 'hidden_value',
                    description: `⚠️ HIDDEN VALUE: ${home.abbr} is #${home.offense.passRank} in passing vs ${away.abbr}'s #${away.defense.passDefRank} ranked pass defense. Home team undervalued.`,
                    impact: 'critical',
                    adjustment: 7
                };
            }
        }

        return null;
    }

    // NBA Analysis
    analyzeNBAMatchup(analysis) {
        const home = analysis.homeTeam.stats;
        const away = analysis.awayTeam.stats;

        const homeWinPct = this.parseRecord(home.record);
        const awayWinPct = this.parseRecord(away.record);

        // Pace analysis
        const avgPace = (home.offense.pace + away.offense.pace) / 2;
        const paceImpact = avgPace > 100 ? 'high-scoring expected' : 'slower game expected';

        analysis.matchupAdvantages.push({
            type: 'pace',
            description: `Pace: ${avgPace.toFixed(1)} (${paceImpact})`,
            impact: avgPace > 101 ? 'high' : 'medium',
            favors: home.offense.pace > away.offense.pace ? 'home' : 'away',
            value: Math.abs(home.offense.pace - away.offense.pace)
        });

        // Offensive vs Defensive Rating
        const homeNetRating = home.offense.offRating - away.defense.defRating;
        const awayNetRating = away.offense.offRating - home.defense.defRating;

        analysis.matchupAdvantages.push({
            type: 'net_rating',
            description: `Net rating edge: Home ${homeNetRating.toFixed(1)} vs Away ${awayNetRating.toFixed(1)}`,
            impact: Math.abs(homeNetRating - awayNetRating) > 5 ? 'high' : 'medium',
            favors: homeNetRating > awayNetRating ? 'home' : 'away',
            value: Math.abs(homeNetRating - awayNetRating)
        });

        // Three-point analysis
        if (away.offense.threeRate > 0.38 && home.defense.oppThreeRate > 0.37) {
            analysis.hiddenFactors.push({
                type: 'three_point_vulnerability',
                description: `${analysis.awayTeam.name} shoots ${(away.offense.threeRate * 100).toFixed(0)}% of shots from 3, ${analysis.homeTeam.name} allows ${(home.defense.oppThreeRate * 100).toFixed(0)}% opponent 3PA rate`,
                impact: 'high',
                adjustment: -4
            });
        }

        // Rebounding edge
        if (Math.abs(home.rebounding.rank - away.rebounding.rank) > 10) {
            const rebAdvantage = home.rebounding.rank < away.rebounding.rank;
            analysis.hiddenFactors.push({
                type: 'rebounding',
                description: `Rebounding edge: ${rebAdvantage ? analysis.homeTeam.name : analysis.awayTeam.name} #${rebAdvantage ? home.rebounding.rank : away.rebounding.rank} vs #${rebAdvantage ? away.rebounding.rank : home.rebounding.rank}`,
                impact: 'medium',
                adjustment: rebAdvantage ? 3 : -3
            });
        }

        // Blowout probability
        const ratingDiff = Math.abs(homeNetRating - awayNetRating);
        analysis.blowoutProbability = Math.min(75, Math.round(ratingDiff * 5 + Math.abs(homeWinPct - awayWinPct) * 40));
        analysis.closenessScore = 100 - analysis.blowoutProbability;

        // Predicted total
        const expectedPace = avgPace;
        analysis.predictedTotal = Math.round((home.offense.ppg + away.offense.ppg) * (expectedPace / 100));

        // Final prediction
        let homeAdvantage = 3.5; // NBA home court
        analysis.matchupAdvantages.forEach(adv => {
            if (adv.favors === 'home') homeAdvantage += adv.value * 0.3;
            else homeAdvantage -= adv.value * 0.3;
        });
        analysis.hiddenFactors.forEach(factor => {
            homeAdvantage += factor.adjustment;
        });

        const baseHomeProb = (homeWinPct * 0.45 + (1 - awayWinPct) * 0.25 + 0.55 * 0.30) * 100;
        const adjustedHomeProb = Math.min(82, Math.max(18, baseHomeProb + homeAdvantage));

        analysis.prediction = {
            winner: adjustedHomeProb > 50 ? analysis.homeTeam.name : analysis.awayTeam.name,
            winnerAbbr: adjustedHomeProb > 50 ? home.abbr : away.abbr,
            homeWinProbability: Math.round(adjustedHomeProb),
            awayWinProbability: Math.round(100 - adjustedHomeProb),
            predictedSpread: Math.round((adjustedHomeProb - 50) * 0.25 * 10) / 10,
            confidence: Math.min(88, Math.round(50 + Math.abs(adjustedHomeProb - 50) * 0.8)),
            predictedScore: {
                home: Math.round(home.offense.ppg + (homeAdvantage * 0.5)),
                away: Math.round(away.offense.ppg - (homeAdvantage * 0.3))
            }
        };

        return analysis;
    }

    // =====================================================
    // Player Props Analysis with Game Script
    // =====================================================
    analyzePlayerProp(player, matchupAnalysis) {
        const adjustments = {
            minutesProjection: 100, // 100% = full minutes
            statMultiplier: 1.0,
            reasoning: []
        };

        // Blowout impact on minutes
        if (matchupAnalysis.blowoutProbability > 60) {
            const isOnFavorite = this.isPlayerOnFavorite(player, matchupAnalysis);

            if (isOnFavorite) {
                adjustments.minutesProjection = 85; // Starters rest in blowout wins
                adjustments.reasoning.push(`⚠️ Blowout risk (${matchupAnalysis.blowoutProbability}%): May rest in 4th quarter`);
            } else {
                adjustments.minutesProjection = 90; // Garbage time minutes different
                adjustments.reasoning.push(`⚠️ Blowout risk: Garbage time may inflate/deflate stats`);
            }
        }

        // Close game = full minutes
        if (matchupAnalysis.closenessScore > 70) {
            adjustments.minutesProjection = 105;
            adjustments.reasoning.push(`✅ Close game projected: Full minutes expected`);
        }

        // Pace impact
        if (matchupAnalysis.predictedTotal > 230) {
            adjustments.statMultiplier *= 1.08;
            adjustments.reasoning.push(`📈 High-scoring game (${matchupAnalysis.predictedTotal}): Stat inflation likely`);
        } else if (matchupAnalysis.predictedTotal < 210) {
            adjustments.statMultiplier *= 0.95;
            adjustments.reasoning.push(`📉 Low-scoring game projected: Consider unders`);
        }

        return adjustments;
    }

    isPlayerOnFavorite(player, matchupAnalysis) {
        const homeAbbr = matchupAnalysis.homeTeam.stats?.abbr;
        const awayAbbr = matchupAnalysis.awayTeam.stats?.abbr;
        const favoriteAbbr = matchupAnalysis.prediction?.homeWinProbability > 50 ? homeAbbr : awayAbbr;
        return player.team === favoriteAbbr;
    }

    // Helper functions
    parseRecord(record) {
        if (!record) return 0.5;
        const parts = record.split('-');
        const wins = parseInt(parts[0]);
        const losses = parseInt(parts[1]);
        return wins / (wins + losses);
    }

    generateBasicPrediction(homeTeam, awayTeam) {
        return {
            homeTeam: { name: homeTeam },
            awayTeam: { name: awayTeam },
            matchupAdvantages: [],
            hiddenFactors: [],
            blowoutProbability: 25,
            closenessScore: 75,
            prediction: {
                winner: homeTeam,
                homeWinProbability: 55,
                awayWinProbability: 45,
                confidence: 52
            }
        };
    }
}

// Export
window.MatchupAnalyzer = new MatchupAnalyzer();
window.NFL_TEAM_STATS = NFL_TEAM_STATS;
window.NBA_TEAM_STATS = NBA_TEAM_STATS;
