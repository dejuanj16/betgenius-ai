// =====================================================
// BetGenius AI - Sample Data
// =====================================================

// Current date for dynamic scheduling
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

// Helper to format time
function formatTime(hours, minutes = 0) {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Helper to format date
function formatDate(date) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Team data with logos (using emojis as placeholders)
const teams = {
    // NBA
    lakers: { name: 'Lakers', logo: '🟡', record: '32-18', sport: 'nba' },
    celtics: { name: 'Celtics', logo: '☘️', record: '38-12', sport: 'nba' },
    warriors: { name: 'Warriors', logo: '🌉', record: '28-22', sport: 'nba' },
    nuggets: { name: 'Nuggets', logo: '⛏️', record: '35-15', sport: 'nba' },
    bucks: { name: 'Bucks', logo: '🦌', record: '30-20', sport: 'nba' },
    heat: { name: 'Heat', logo: '🔥', record: '29-21', sport: 'nba' },
    suns: { name: 'Suns', logo: '☀️', record: '31-19', sport: 'nba' },
    knicks: { name: 'Knicks', logo: '🗽', record: '33-17', sport: 'nba' },

    // NFL
    chiefs: { name: 'Chiefs', logo: '🏈', record: '11-5', sport: 'nfl' },
    eagles: { name: 'Eagles', logo: '🦅', record: '13-3', sport: 'nfl' },
    niners: { name: '49ers', logo: '⚒️', record: '12-4', sport: 'nfl' },
    bills: { name: 'Bills', logo: '🦬', record: '11-5', sport: 'nfl' },
    cowboys: { name: 'Cowboys', logo: '⭐', record: '12-4', sport: 'nfl' },
    lions: { name: 'Lions', logo: '🦁', record: '10-6', sport: 'nfl' },

    // MLB
    dodgers: { name: 'Dodgers', logo: '⚾', record: '95-67', sport: 'mlb' },
    yankees: { name: 'Yankees', logo: '⚾', record: '91-71', sport: 'mlb' },
    braves: { name: 'Braves', logo: '🪓', record: '89-73', sport: 'mlb' },
    astros: { name: 'Astros', logo: '🚀', record: '87-75', sport: 'mlb' },

    // NHL
    oilers: { name: 'Oilers', logo: '🛢️', record: '38-15', sport: 'nhl' },
    panthers: { name: 'Panthers', logo: '🐆', record: '40-14', sport: 'nhl' },
    bruins: { name: 'Bruins', logo: '🐻', record: '35-18', sport: 'nhl' },
    rangers: { name: 'Rangers', logo: '🗽', record: '36-17', sport: 'nhl' },

    // Soccer
    arsenal: { name: 'Arsenal', logo: '🔴', record: '20-4-3', sport: 'soccer' },
    mancity: { name: 'Man City', logo: '🔵', record: '19-5-4', sport: 'soccer' },
    liverpool: { name: 'Liverpool', logo: '🔴', record: '18-6-4', sport: 'soccer' },
    chelsea: { name: 'Chelsea', logo: '🔵', record: '14-8-5', sport: 'soccer' },
    realmadrid: { name: 'Real Madrid', logo: '⚪', record: '21-3-4', sport: 'soccer' },
    barcelona: { name: 'Barcelona', logo: '🔵', record: '19-5-4', sport: 'soccer' },

    // MMA (fighters as teams)
    fighter1: { name: 'Jon Jones', logo: '🥊', record: '27-1', sport: 'mma' },
    fighter2: { name: 'Stipe Miocic', logo: '🥊', record: '20-4', sport: 'mma' },
    fighter3: { name: 'Islam Makhachev', logo: '🥊', record: '25-1', sport: 'mma' },
    fighter4: { name: 'Charles Oliveira', logo: '🥊', record: '34-9', sport: 'mma' },

    // Tennis
    djokovic: { name: 'N. Djokovic', logo: '🎾', record: '#1', sport: 'tennis' },
    sinner: { name: 'J. Sinner', logo: '🎾', record: '#2', sport: 'tennis' },
    alcaraz: { name: 'C. Alcaraz', logo: '🎾', record: '#3', sport: 'tennis' },
    medvedev: { name: 'D. Medvedev', logo: '🎾', record: '#4', sport: 'tennis' }
};

// Today's top AI picks
const topPicks = [
    {
        sport: 'nba',
        sportName: 'NBA',
        homeTeam: teams.celtics,
        awayTeam: teams.lakers,
        pickType: 'Spread',
        pickValue: 'Celtics -6.5',
        odds: '-110',
        confidence: 78,
        aiReasoning: 'Home court advantage, superior defensive rating'
    },
    {
        sport: 'nfl',
        sportName: 'NFL',
        homeTeam: teams.chiefs,
        awayTeam: teams.eagles,
        pickType: 'Moneyline',
        pickValue: 'Chiefs ML',
        odds: '-135',
        confidence: 72,
        aiReasoning: 'Mahomes home record, defensive matchup'
    },
    {
        sport: 'nba',
        sportName: 'NBA',
        homeTeam: teams.nuggets,
        awayTeam: teams.warriors,
        pickType: 'Over/Under',
        pickValue: 'Over 228.5',
        odds: '-105',
        confidence: 74,
        aiReasoning: 'High pace matchup, both teams scoring well'
    },
    {
        sport: 'nhl',
        sportName: 'NHL',
        homeTeam: teams.oilers,
        awayTeam: teams.panthers,
        pickType: 'Puck Line',
        pickValue: 'Oilers -1.5',
        odds: '+145',
        confidence: 65,
        aiReasoning: 'McDavid on hot streak, home ice advantage'
    },
    {
        sport: 'soccer',
        sportName: 'Premier League',
        homeTeam: teams.arsenal,
        awayTeam: teams.chelsea,
        pickType: 'Result',
        pickValue: 'Arsenal Win',
        odds: '-150',
        confidence: 81,
        aiReasoning: 'Form advantage, home record this season'
    },
    {
        sport: 'mma',
        sportName: 'UFC',
        homeTeam: teams.fighter3,
        awayTeam: teams.fighter4,
        pickType: 'Winner',
        pickValue: 'Makhachev',
        odds: '-200',
        confidence: 77,
        aiReasoning: 'Grappling advantage, recent form'
    }
];

// Upcoming games
const upcomingGames = [
    {
        sport: 'nba',
        homeTeam: teams.celtics,
        awayTeam: teams.lakers,
        time: formatTime(19, 30),
        date: formatDate(today),
        spread: { home: '-6.5', away: '+6.5' },
        moneyline: { home: '-240', away: '+195' },
        total: '225.5',
        aiPrediction: { winner: 'Celtics', confidence: 78 }
    },
    {
        sport: 'nba',
        homeTeam: teams.nuggets,
        awayTeam: teams.warriors,
        time: formatTime(21, 0),
        date: formatDate(today),
        spread: { home: '-4.5', away: '+4.5' },
        moneyline: { home: '-180', away: '+155' },
        total: '228.5',
        aiPrediction: { winner: 'Nuggets', confidence: 71 }
    },
    {
        sport: 'nba',
        homeTeam: teams.suns,
        awayTeam: teams.heat,
        time: formatTime(22, 0),
        date: formatDate(today),
        spread: { home: '-2.5', away: '+2.5' },
        moneyline: { home: '-135', away: '+115' },
        total: '219.5',
        aiPrediction: { winner: 'Suns', confidence: 62 }
    },
    {
        sport: 'nhl',
        homeTeam: teams.oilers,
        awayTeam: teams.panthers,
        time: formatTime(20, 0),
        date: formatDate(today),
        spread: { home: '-1.5', away: '+1.5' },
        moneyline: { home: '-145', away: '+125' },
        total: '6.5',
        aiPrediction: { winner: 'Oilers', confidence: 68 }
    },
    {
        sport: 'nhl',
        homeTeam: teams.bruins,
        awayTeam: teams.rangers,
        time: formatTime(19, 0),
        date: formatDate(today),
        spread: { home: '-1.5', away: '+1.5' },
        moneyline: { home: '-130', away: '+110' },
        total: '5.5',
        aiPrediction: { winner: 'Bruins', confidence: 58 }
    },
    {
        sport: 'soccer',
        homeTeam: teams.arsenal,
        awayTeam: teams.chelsea,
        time: formatTime(15, 0),
        date: formatDate(tomorrow),
        spread: { home: '-1.5', away: '+1.5' },
        moneyline: { home: '-150', away: '+320' },
        total: '2.5',
        aiPrediction: { winner: 'Arsenal', confidence: 76 }
    },
    {
        sport: 'soccer',
        homeTeam: teams.realmadrid,
        awayTeam: teams.barcelona,
        time: formatTime(16, 0),
        date: formatDate(tomorrow),
        spread: { home: '-0.5', away: '+0.5' },
        moneyline: { home: '+120', away: '+150' },
        total: '3.5',
        aiPrediction: { winner: 'Real Madrid', confidence: 54 }
    },
    {
        sport: 'mlb',
        homeTeam: teams.dodgers,
        awayTeam: teams.yankees,
        time: formatTime(19, 10),
        date: formatDate(tomorrow),
        spread: { home: '-1.5', away: '+1.5' },
        moneyline: { home: '-135', away: '+120' },
        total: '8.5',
        aiPrediction: { winner: 'Dodgers', confidence: 63 }
    }
];

// Odds comparison data
const oddsComparison = [
    {
        homeTeam: teams.celtics,
        awayTeam: teams.lakers,
        time: formatTime(19, 30),
        date: formatDate(today),
        sport: 'nba',
        bets: [
            {
                type: 'Spread',
                line: 'Celtics -6.5',
                draftkings: '-110',
                fanduel: '-108',
                betmgm: '-110',
                caesars: '-105',
                best: { book: 'Caesars', odds: '-105' }
            },
            {
                type: 'Moneyline',
                line: 'Celtics ML',
                draftkings: '-245',
                fanduel: '-240',
                betmgm: '-250',
                caesars: '-235',
                best: { book: 'Caesars', odds: '-235' }
            },
            {
                type: 'Total',
                line: 'Over 225.5',
                draftkings: '-110',
                fanduel: '-112',
                betmgm: '-108',
                caesars: '-110',
                best: { book: 'BetMGM', odds: '-108' }
            }
        ]
    },
    {
        homeTeam: teams.nuggets,
        awayTeam: teams.warriors,
        time: formatTime(21, 0),
        date: formatDate(today),
        sport: 'nba',
        bets: [
            {
                type: 'Spread',
                line: 'Nuggets -4.5',
                draftkings: '-105',
                fanduel: '-110',
                betmgm: '-108',
                caesars: '-110',
                best: { book: 'DraftKings', odds: '-105' }
            },
            {
                type: 'Moneyline',
                line: 'Nuggets ML',
                draftkings: '-180',
                fanduel: '-175',
                betmgm: '-185',
                caesars: '-180',
                best: { book: 'FanDuel', odds: '-175' }
            }
        ]
    },
    {
        homeTeam: teams.oilers,
        awayTeam: teams.panthers,
        time: formatTime(20, 0),
        date: formatDate(today),
        sport: 'nhl',
        bets: [
            {
                type: 'Puck Line',
                line: 'Oilers -1.5',
                draftkings: '+150',
                fanduel: '+145',
                betmgm: '+155',
                caesars: '+148',
                best: { book: 'BetMGM', odds: '+155' }
            },
            {
                type: 'Moneyline',
                line: 'Oilers ML',
                draftkings: '-145',
                fanduel: '-140',
                betmgm: '-150',
                caesars: '-142',
                best: { book: 'FanDuel', odds: '-140' }
            }
        ]
    },
    {
        homeTeam: teams.arsenal,
        awayTeam: teams.chelsea,
        time: formatTime(15, 0),
        date: formatDate(tomorrow),
        sport: 'soccer',
        bets: [
            {
                type: 'Match Result',
                line: 'Arsenal Win',
                draftkings: '-155',
                fanduel: '-150',
                betmgm: '-160',
                caesars: '-145',
                best: { book: 'Caesars', odds: '-145' }
            },
            {
                type: 'Total Goals',
                line: 'Over 2.5',
                draftkings: '-120',
                fanduel: '-115',
                betmgm: '-125',
                caesars: '-118',
                best: { book: 'FanDuel', odds: '-115' }
            }
        ]
    }
];

// Player props data - Comprehensive database
const playerProps = [
    // =====================================================
    // NBA PLAYER PROPS
    // =====================================================

    // Lakers vs Celtics
    {
        player: 'LeBron James',
        team: 'Lakers',
        opponent: 'Celtics',
        position: 'SF',
        sport: 'nba',
        props: [
            { type: 'Points', line: 27.5, pick: 'Over', probability: 68, odds: '-115' },
            { type: 'Rebounds', line: 7.5, pick: 'Over', probability: 72, odds: '-105' },
            { type: 'Assists', line: 7.5, pick: 'Under', probability: 55, odds: '-110' },
            { type: 'PRA', line: 42.5, pick: 'Over', probability: 65, odds: '-108' },
            { type: 'Steals', line: 1.5, pick: 'Under', probability: 58, odds: '-115' },
            { type: '3-Pointers', line: 2.5, pick: 'Over', probability: 61, odds: '-105' }
        ]
    },
    {
        player: 'Anthony Davis',
        team: 'Lakers',
        opponent: 'Celtics',
        position: 'PF/C',
        sport: 'nba',
        props: [
            { type: 'Points', line: 25.5, pick: 'Over', probability: 66, odds: '-110' },
            { type: 'Rebounds', line: 12.5, pick: 'Over', probability: 69, odds: '-108' },
            { type: 'Blocks', line: 2.5, pick: 'Over', probability: 62, odds: '+100' },
            { type: 'PRA', line: 40.5, pick: 'Over', probability: 64, odds: '-105' },
            { type: 'Assists', line: 3.5, pick: 'Under', probability: 54, odds: '-115' }
        ]
    },
    {
        player: 'Austin Reaves',
        team: 'Lakers',
        opponent: 'Celtics',
        position: 'SG',
        sport: 'nba',
        props: [
            { type: 'Points', line: 16.5, pick: 'Over', probability: 58, odds: '-105' },
            { type: 'Assists', line: 5.5, pick: 'Over', probability: 64, odds: '-110' },
            { type: '3-Pointers', line: 2.5, pick: 'Under', probability: 52, odds: '-108' },
            { type: 'PRA', line: 25.5, pick: 'Over', probability: 60, odds: '-105' }
        ]
    },
    {
        player: "D'Angelo Russell",
        team: 'Lakers',
        opponent: 'Celtics',
        position: 'PG',
        sport: 'nba',
        props: [
            { type: 'Points', line: 17.5, pick: 'Under', probability: 55, odds: '-110' },
            { type: 'Assists', line: 6.5, pick: 'Over', probability: 62, odds: '-105' },
            { type: '3-Pointers', line: 3.5, pick: 'Under', probability: 58, odds: '-108' }
        ]
    },
    {
        player: 'Jayson Tatum',
        team: 'Celtics',
        opponent: 'Lakers',
        position: 'SF',
        sport: 'nba',
        props: [
            { type: 'Points', line: 28.5, pick: 'Over', probability: 64, odds: '-108' },
            { type: 'Rebounds', line: 8.5, pick: 'Under', probability: 58, odds: '-110' },
            { type: '3-Pointers', line: 3.5, pick: 'Over', probability: 62, odds: '+100' },
            { type: 'Assists', line: 5.5, pick: 'Over', probability: 59, odds: '-105' },
            { type: 'PRA', line: 42.5, pick: 'Over', probability: 63, odds: '-112' }
        ]
    },
    {
        player: 'Jaylen Brown',
        team: 'Celtics',
        opponent: 'Lakers',
        position: 'SG',
        sport: 'nba',
        props: [
            { type: 'Points', line: 24.5, pick: 'Over', probability: 61, odds: '-108' },
            { type: 'Rebounds', line: 5.5, pick: 'Over', probability: 65, odds: '-105' },
            { type: '3-Pointers', line: 2.5, pick: 'Over', probability: 58, odds: '+105' },
            { type: 'Steals', line: 1.5, pick: 'Over', probability: 56, odds: '-110' }
        ]
    },
    {
        player: 'Derrick White',
        team: 'Celtics',
        opponent: 'Lakers',
        position: 'PG',
        sport: 'nba',
        props: [
            { type: 'Points', line: 15.5, pick: 'Over', probability: 57, odds: '-105' },
            { type: '3-Pointers', line: 2.5, pick: 'Over', probability: 60, odds: '-108' },
            { type: 'Assists', line: 4.5, pick: 'Under', probability: 54, odds: '-110' }
        ]
    },
    {
        player: 'Kristaps Porzingis',
        team: 'Celtics',
        opponent: 'Lakers',
        position: 'C',
        sport: 'nba',
        props: [
            { type: 'Points', line: 20.5, pick: 'Over', probability: 63, odds: '-110' },
            { type: 'Rebounds', line: 7.5, pick: 'Over', probability: 66, odds: '-105' },
            { type: 'Blocks', line: 1.5, pick: 'Over', probability: 71, odds: '-115' },
            { type: '3-Pointers', line: 1.5, pick: 'Over', probability: 68, odds: '-108' }
        ]
    },

    // Nuggets vs Warriors
    {
        player: 'Nikola Jokic',
        team: 'Nuggets',
        opponent: 'Warriors',
        position: 'C',
        sport: 'nba',
        props: [
            { type: 'Points', line: 26.5, pick: 'Over', probability: 71, odds: '-112' },
            { type: 'Rebounds', line: 12.5, pick: 'Over', probability: 65, odds: '-105' },
            { type: 'Assists', line: 9.5, pick: 'Over', probability: 69, odds: '-108' },
            { type: 'PRA', line: 48.5, pick: 'Over', probability: 68, odds: '-110' },
            { type: 'Double-Double', line: 0.5, pick: 'Over', probability: 92, odds: '-450' },
            { type: 'Triple-Double', line: 0.5, pick: 'Over', probability: 38, odds: '+165' }
        ]
    },
    {
        player: 'Jamal Murray',
        team: 'Nuggets',
        opponent: 'Warriors',
        position: 'PG',
        sport: 'nba',
        props: [
            { type: 'Points', line: 22.5, pick: 'Over', probability: 59, odds: '-105' },
            { type: 'Assists', line: 6.5, pick: 'Over', probability: 62, odds: '-108' },
            { type: '3-Pointers', line: 3.5, pick: 'Under', probability: 56, odds: '-110' },
            { type: 'PRA', line: 32.5, pick: 'Over', probability: 61, odds: '-105' }
        ]
    },
    {
        player: 'Michael Porter Jr.',
        team: 'Nuggets',
        opponent: 'Warriors',
        position: 'SF',
        sport: 'nba',
        props: [
            { type: 'Points', line: 17.5, pick: 'Over', probability: 58, odds: '-108' },
            { type: 'Rebounds', line: 7.5, pick: 'Over', probability: 63, odds: '-105' },
            { type: '3-Pointers', line: 2.5, pick: 'Over', probability: 55, odds: '+100' }
        ]
    },
    {
        player: 'Aaron Gordon',
        team: 'Nuggets',
        opponent: 'Warriors',
        position: 'PF',
        sport: 'nba',
        props: [
            { type: 'Points', line: 14.5, pick: 'Over', probability: 60, odds: '-105' },
            { type: 'Rebounds', line: 6.5, pick: 'Over', probability: 64, odds: '-108' },
            { type: 'Assists', line: 3.5, pick: 'Under', probability: 58, odds: '-110' }
        ]
    },
    {
        player: 'Stephen Curry',
        team: 'Warriors',
        opponent: 'Nuggets',
        position: 'PG',
        sport: 'nba',
        props: [
            { type: 'Points', line: 29.5, pick: 'Under', probability: 54, odds: '-110' },
            { type: '3-Pointers', line: 5.5, pick: 'Over', probability: 58, odds: '+105' },
            { type: 'Assists', line: 6.5, pick: 'Over', probability: 61, odds: '-108' },
            { type: 'PRA', line: 38.5, pick: 'Under', probability: 52, odds: '-105' },
            { type: 'Steals', line: 1.5, pick: 'Under', probability: 55, odds: '-110' }
        ]
    },
    {
        player: 'Andrew Wiggins',
        team: 'Warriors',
        opponent: 'Nuggets',
        position: 'SF',
        sport: 'nba',
        props: [
            { type: 'Points', line: 16.5, pick: 'Over', probability: 57, odds: '-105' },
            { type: 'Rebounds', line: 4.5, pick: 'Over', probability: 62, odds: '-108' },
            { type: '3-Pointers', line: 1.5, pick: 'Over', probability: 64, odds: '-110' }
        ]
    },
    {
        player: 'Klay Thompson',
        team: 'Warriors',
        opponent: 'Nuggets',
        position: 'SG',
        sport: 'nba',
        props: [
            { type: 'Points', line: 18.5, pick: 'Under', probability: 54, odds: '-108' },
            { type: '3-Pointers', line: 3.5, pick: 'Under', probability: 52, odds: '-105' },
            { type: 'Rebounds', line: 3.5, pick: 'Under', probability: 56, odds: '-110' }
        ]
    },
    {
        player: 'Draymond Green',
        team: 'Warriors',
        opponent: 'Nuggets',
        position: 'PF',
        sport: 'nba',
        props: [
            { type: 'Assists', line: 6.5, pick: 'Over', probability: 65, odds: '-108' },
            { type: 'Rebounds', line: 7.5, pick: 'Over', probability: 58, odds: '-105' },
            { type: 'Points', line: 8.5, pick: 'Under', probability: 54, odds: '-110' }
        ]
    },

    // Suns vs Heat
    {
        player: 'Kevin Durant',
        team: 'Suns',
        opponent: 'Heat',
        position: 'SF',
        sport: 'nba',
        props: [
            { type: 'Points', line: 28.5, pick: 'Over', probability: 66, odds: '-110' },
            { type: 'Rebounds', line: 6.5, pick: 'Over', probability: 62, odds: '-105' },
            { type: 'Assists', line: 5.5, pick: 'Under', probability: 55, odds: '-108' },
            { type: 'PRA', line: 40.5, pick: 'Over', probability: 64, odds: '-112' }
        ]
    },
    {
        player: 'Devin Booker',
        team: 'Suns',
        opponent: 'Heat',
        position: 'SG',
        sport: 'nba',
        props: [
            { type: 'Points', line: 27.5, pick: 'Over', probability: 63, odds: '-108' },
            { type: 'Assists', line: 5.5, pick: 'Over', probability: 59, odds: '-105' },
            { type: '3-Pointers', line: 2.5, pick: 'Over', probability: 61, odds: '+100' },
            { type: 'PRA', line: 35.5, pick: 'Over', probability: 60, odds: '-105' }
        ]
    },
    {
        player: 'Bradley Beal',
        team: 'Suns',
        opponent: 'Heat',
        position: 'SG',
        sport: 'nba',
        props: [
            { type: 'Points', line: 18.5, pick: 'Under', probability: 53, odds: '-110' },
            { type: 'Assists', line: 4.5, pick: 'Over', probability: 58, odds: '-105' },
            { type: '3-Pointers', line: 1.5, pick: 'Over', probability: 62, odds: '-108' }
        ]
    },
    {
        player: 'Jimmy Butler',
        team: 'Heat',
        opponent: 'Suns',
        position: 'SF',
        sport: 'nba',
        props: [
            { type: 'Points', line: 22.5, pick: 'Over', probability: 61, odds: '-105' },
            { type: 'Rebounds', line: 5.5, pick: 'Over', probability: 64, odds: '-108' },
            { type: 'Assists', line: 5.5, pick: 'Over', probability: 59, odds: '-105' },
            { type: 'Steals', line: 1.5, pick: 'Over', probability: 67, odds: '-112' }
        ]
    },
    {
        player: 'Bam Adebayo',
        team: 'Heat',
        opponent: 'Suns',
        position: 'C',
        sport: 'nba',
        props: [
            { type: 'Points', line: 19.5, pick: 'Over', probability: 62, odds: '-108' },
            { type: 'Rebounds', line: 10.5, pick: 'Over', probability: 65, odds: '-105' },
            { type: 'Assists', line: 3.5, pick: 'Over', probability: 68, odds: '-110' },
            { type: 'Blocks', line: 0.5, pick: 'Over', probability: 74, odds: '-135' }
        ]
    },
    {
        player: 'Tyler Herro',
        team: 'Heat',
        opponent: 'Suns',
        position: 'SG',
        sport: 'nba',
        props: [
            { type: 'Points', line: 21.5, pick: 'Over', probability: 58, odds: '-105' },
            { type: '3-Pointers', line: 3.5, pick: 'Over', probability: 56, odds: '+105' },
            { type: 'Assists', line: 4.5, pick: 'Under', probability: 54, odds: '-108' }
        ]
    },

    // Bucks vs Knicks
    {
        player: 'Giannis Antetokounmpo',
        team: 'Bucks',
        opponent: 'Knicks',
        position: 'PF',
        sport: 'nba',
        props: [
            { type: 'Points', line: 32.5, pick: 'Over', probability: 64, odds: '-108' },
            { type: 'Rebounds', line: 11.5, pick: 'Over', probability: 68, odds: '-110' },
            { type: 'Assists', line: 6.5, pick: 'Under', probability: 55, odds: '-105' },
            { type: 'PRA', line: 50.5, pick: 'Over', probability: 62, odds: '-112' },
            { type: 'Blocks', line: 1.5, pick: 'Over', probability: 59, odds: '-108' },
            { type: 'Double-Double', line: 0.5, pick: 'Over', probability: 88, odds: '-380' }
        ]
    },
    {
        player: 'Damian Lillard',
        team: 'Bucks',
        opponent: 'Knicks',
        position: 'PG',
        sport: 'nba',
        props: [
            { type: 'Points', line: 26.5, pick: 'Over', probability: 61, odds: '-105' },
            { type: '3-Pointers', line: 4.5, pick: 'Under', probability: 54, odds: '-108' },
            { type: 'Assists', line: 7.5, pick: 'Over', probability: 63, odds: '-110' },
            { type: 'PRA', line: 36.5, pick: 'Over', probability: 59, odds: '-105' }
        ]
    },
    {
        player: 'Khris Middleton',
        team: 'Bucks',
        opponent: 'Knicks',
        position: 'SF',
        sport: 'nba',
        props: [
            { type: 'Points', line: 16.5, pick: 'Under', probability: 53, odds: '-110' },
            { type: 'Rebounds', line: 4.5, pick: 'Over', probability: 58, odds: '-105' },
            { type: 'Assists', line: 4.5, pick: 'Over', probability: 60, odds: '-108' }
        ]
    },
    {
        player: 'Jalen Brunson',
        team: 'Knicks',
        opponent: 'Bucks',
        position: 'PG',
        sport: 'nba',
        props: [
            { type: 'Points', line: 27.5, pick: 'Over', probability: 65, odds: '-110' },
            { type: 'Assists', line: 6.5, pick: 'Over', probability: 68, odds: '-108' },
            { type: 'Rebounds', line: 3.5, pick: 'Under', probability: 56, odds: '-105' },
            { type: 'PRA', line: 36.5, pick: 'Over', probability: 63, odds: '-112' }
        ]
    },
    {
        player: 'Julius Randle',
        team: 'Knicks',
        opponent: 'Bucks',
        position: 'PF',
        sport: 'nba',
        props: [
            { type: 'Points', line: 22.5, pick: 'Over', probability: 59, odds: '-105' },
            { type: 'Rebounds', line: 9.5, pick: 'Over', probability: 64, odds: '-108' },
            { type: 'Assists', line: 4.5, pick: 'Over', probability: 57, odds: '-105' }
        ]
    },
    {
        player: 'RJ Barrett',
        team: 'Knicks',
        opponent: 'Bucks',
        position: 'SG',
        sport: 'nba',
        props: [
            { type: 'Points', line: 18.5, pick: 'Over', probability: 56, odds: '-108' },
            { type: 'Rebounds', line: 5.5, pick: 'Over', probability: 61, odds: '-105' },
            { type: '3-Pointers', line: 1.5, pick: 'Over', probability: 58, odds: '+100' }
        ]
    },

    // =====================================================
    // NFL PLAYER PROPS
    // =====================================================

    // Chiefs vs Eagles
    {
        player: 'Patrick Mahomes',
        team: 'Chiefs',
        opponent: 'Eagles',
        position: 'QB',
        sport: 'nfl',
        props: [
            { type: 'Pass Yards', line: 285.5, pick: 'Over', probability: 67, odds: '-115' },
            { type: 'Pass TDs', line: 2.5, pick: 'Over', probability: 58, odds: '+120' },
            { type: 'Rush Yards', line: 24.5, pick: 'Over', probability: 55, odds: '-105' },
            { type: 'Completions', line: 24.5, pick: 'Over', probability: 62, odds: '-108' },
            { type: 'Interceptions', line: 0.5, pick: 'Under', probability: 58, odds: '+105' },
            { type: 'Longest Pass', line: 39.5, pick: 'Over', probability: 54, odds: '-110' }
        ]
    },
    {
        player: 'Travis Kelce',
        team: 'Chiefs',
        opponent: 'Eagles',
        position: 'TE',
        sport: 'nfl',
        props: [
            { type: 'Receiving Yards', line: 68.5, pick: 'Over', probability: 61, odds: '-105' },
            { type: 'Receptions', line: 6.5, pick: 'Over', probability: 64, odds: '-108' },
            { type: 'Receiving TDs', line: 0.5, pick: 'Over', probability: 45, odds: '+130' },
            { type: 'Longest Reception', line: 22.5, pick: 'Over', probability: 58, odds: '-105' }
        ]
    },
    {
        player: 'Isiah Pacheco',
        team: 'Chiefs',
        opponent: 'Eagles',
        position: 'RB',
        sport: 'nfl',
        props: [
            { type: 'Rush Yards', line: 62.5, pick: 'Over', probability: 56, odds: '-108' },
            { type: 'Rush Attempts', line: 14.5, pick: 'Over', probability: 63, odds: '-105' },
            { type: 'Receiving Yards', line: 15.5, pick: 'Under', probability: 54, odds: '-110' },
            { type: 'Anytime TD', line: 0.5, pick: 'Over', probability: 48, odds: '+115' }
        ]
    },
    {
        player: 'Rashee Rice',
        team: 'Chiefs',
        opponent: 'Eagles',
        position: 'WR',
        sport: 'nfl',
        props: [
            { type: 'Receiving Yards', line: 72.5, pick: 'Over', probability: 59, odds: '-105' },
            { type: 'Receptions', line: 5.5, pick: 'Over', probability: 62, odds: '-108' },
            { type: 'Receiving TDs', line: 0.5, pick: 'Over', probability: 42, odds: '+140' }
        ]
    },
    {
        player: 'Jalen Hurts',
        team: 'Eagles',
        opponent: 'Chiefs',
        position: 'QB',
        sport: 'nfl',
        props: [
            { type: 'Pass Yards', line: 245.5, pick: 'Under', probability: 52, odds: '-105' },
            { type: 'Rush Yards', line: 45.5, pick: 'Over', probability: 64, odds: '-108' },
            { type: 'Pass TDs', line: 1.5, pick: 'Over', probability: 71, odds: '-130' },
            { type: 'Rush TDs', line: 0.5, pick: 'Over', probability: 58, odds: '+100' },
            { type: 'Completions', line: 18.5, pick: 'Under', probability: 54, odds: '-110' }
        ]
    },
    {
        player: "A.J. Brown",
        team: 'Eagles',
        opponent: 'Chiefs',
        position: 'WR',
        sport: 'nfl',
        props: [
            { type: 'Receiving Yards', line: 78.5, pick: 'Over', probability: 58, odds: '-105' },
            { type: 'Receptions', line: 5.5, pick: 'Over', probability: 61, odds: '-108' },
            { type: 'Receiving TDs', line: 0.5, pick: 'Over', probability: 44, odds: '+125' },
            { type: 'Longest Reception', line: 28.5, pick: 'Over', probability: 55, odds: '-105' }
        ]
    },
    {
        player: 'DeVonta Smith',
        team: 'Eagles',
        opponent: 'Chiefs',
        position: 'WR',
        sport: 'nfl',
        props: [
            { type: 'Receiving Yards', line: 65.5, pick: 'Over', probability: 56, odds: '-108' },
            { type: 'Receptions', line: 5.5, pick: 'Under', probability: 54, odds: '-105' },
            { type: 'Receiving TDs', line: 0.5, pick: 'Over', probability: 38, odds: '+155' }
        ]
    },
    {
        player: 'Saquon Barkley',
        team: 'Eagles',
        opponent: 'Chiefs',
        position: 'RB',
        sport: 'nfl',
        props: [
            { type: 'Rush Yards', line: 85.5, pick: 'Over', probability: 63, odds: '-108' },
            { type: 'Receiving Yards', line: 25.5, pick: 'Over', probability: 58, odds: '-105' },
            { type: 'Rush Attempts', line: 18.5, pick: 'Over', probability: 65, odds: '-110' },
            { type: 'Anytime TD', line: 0.5, pick: 'Over', probability: 62, odds: '-145' },
            { type: 'Total Yards', line: 115.5, pick: 'Over', probability: 59, odds: '-105' }
        ]
    },
    {
        player: 'Dallas Goedert',
        team: 'Eagles',
        opponent: 'Chiefs',
        position: 'TE',
        sport: 'nfl',
        props: [
            { type: 'Receiving Yards', line: 42.5, pick: 'Over', probability: 55, odds: '-105' },
            { type: 'Receptions', line: 3.5, pick: 'Over', probability: 62, odds: '-108' },
            { type: 'Receiving TDs', line: 0.5, pick: 'Under', probability: 62, odds: '-140' }
        ]
    },

    // 49ers vs Cowboys
    {
        player: 'Brock Purdy',
        team: '49ers',
        opponent: 'Cowboys',
        position: 'QB',
        sport: 'nfl',
        props: [
            { type: 'Pass Yards', line: 268.5, pick: 'Over', probability: 61, odds: '-105' },
            { type: 'Pass TDs', line: 2.5, pick: 'Over', probability: 55, odds: '+125' },
            { type: 'Completions', line: 22.5, pick: 'Over', probability: 58, odds: '-108' },
            { type: 'Interceptions', line: 0.5, pick: 'Under', probability: 62, odds: '-105' }
        ]
    },
    {
        player: 'Christian McCaffrey',
        team: '49ers',
        opponent: 'Cowboys',
        position: 'RB',
        sport: 'nfl',
        props: [
            { type: 'Rush Yards', line: 78.5, pick: 'Over', probability: 65, odds: '-110' },
            { type: 'Receiving Yards', line: 35.5, pick: 'Over', probability: 68, odds: '-108' },
            { type: 'Receptions', line: 4.5, pick: 'Over', probability: 72, odds: '-115' },
            { type: 'Anytime TD', line: 0.5, pick: 'Over', probability: 71, odds: '-165' },
            { type: 'Total Yards', line: 118.5, pick: 'Over', probability: 64, odds: '-105' }
        ]
    },
    {
        player: 'Deebo Samuel',
        team: '49ers',
        opponent: 'Cowboys',
        position: 'WR',
        sport: 'nfl',
        props: [
            { type: 'Receiving Yards', line: 58.5, pick: 'Over', probability: 55, odds: '-105' },
            { type: 'Rush Yards', line: 12.5, pick: 'Over', probability: 61, odds: '-108' },
            { type: 'Total Yards', line: 75.5, pick: 'Over', probability: 58, odds: '-105' }
        ]
    },
    {
        player: 'Brandon Aiyuk',
        team: '49ers',
        opponent: 'Cowboys',
        position: 'WR',
        sport: 'nfl',
        props: [
            { type: 'Receiving Yards', line: 72.5, pick: 'Over', probability: 59, odds: '-108' },
            { type: 'Receptions', line: 5.5, pick: 'Over', probability: 56, odds: '-105' },
            { type: 'Receiving TDs', line: 0.5, pick: 'Over', probability: 41, odds: '+145' }
        ]
    },
    {
        player: 'George Kittle',
        team: '49ers',
        opponent: 'Cowboys',
        position: 'TE',
        sport: 'nfl',
        props: [
            { type: 'Receiving Yards', line: 55.5, pick: 'Over', probability: 57, odds: '-105' },
            { type: 'Receptions', line: 4.5, pick: 'Over', probability: 62, odds: '-108' },
            { type: 'Receiving TDs', line: 0.5, pick: 'Over', probability: 43, odds: '+130' }
        ]
    },
    {
        player: 'Dak Prescott',
        team: 'Cowboys',
        opponent: '49ers',
        position: 'QB',
        sport: 'nfl',
        props: [
            { type: 'Pass Yards', line: 275.5, pick: 'Over', probability: 58, odds: '-105' },
            { type: 'Pass TDs', line: 2.5, pick: 'Under', probability: 54, odds: '-108' },
            { type: 'Rush Yards', line: 15.5, pick: 'Over', probability: 52, odds: '-110' },
            { type: 'Interceptions', line: 0.5, pick: 'Over', probability: 48, odds: '+110' }
        ]
    },
    {
        player: 'CeeDee Lamb',
        team: 'Cowboys',
        opponent: '49ers',
        position: 'WR',
        sport: 'nfl',
        props: [
            { type: 'Receiving Yards', line: 88.5, pick: 'Under', probability: 53, odds: '-105' },
            { type: 'Receptions', line: 7.5, pick: 'Over', probability: 61, odds: '-108' },
            { type: 'Receiving TDs', line: 0.5, pick: 'Over', probability: 46, odds: '+120' },
            { type: 'Targets', line: 10.5, pick: 'Over', probability: 64, odds: '-110' }
        ]
    },
    {
        player: 'Tony Pollard',
        team: 'Cowboys',
        opponent: '49ers',
        position: 'RB',
        sport: 'nfl',
        props: [
            { type: 'Rush Yards', line: 65.5, pick: 'Under', probability: 55, odds: '-105' },
            { type: 'Receiving Yards', line: 22.5, pick: 'Over', probability: 58, odds: '-108' },
            { type: 'Anytime TD', line: 0.5, pick: 'Under', probability: 54, odds: '-110' }
        ]
    },

    // Bills vs Lions
    {
        player: 'Josh Allen',
        team: 'Bills',
        opponent: 'Lions',
        position: 'QB',
        sport: 'nfl',
        props: [
            { type: 'Pass Yards', line: 265.5, pick: 'Over', probability: 59, odds: '-105' },
            { type: 'Pass TDs', line: 2.5, pick: 'Over', probability: 61, odds: '+110' },
            { type: 'Rush Yards', line: 35.5, pick: 'Over', probability: 64, odds: '-108' },
            { type: 'Rush TDs', line: 0.5, pick: 'Over', probability: 52, odds: '+115' },
            { type: 'Total TDs', line: 2.5, pick: 'Over', probability: 58, odds: '+100' }
        ]
    },
    {
        player: 'Stefon Diggs',
        team: 'Bills',
        opponent: 'Lions',
        position: 'WR',
        sport: 'nfl',
        props: [
            { type: 'Receiving Yards', line: 75.5, pick: 'Over', probability: 57, odds: '-105' },
            { type: 'Receptions', line: 6.5, pick: 'Over', probability: 62, odds: '-108' },
            { type: 'Receiving TDs', line: 0.5, pick: 'Over', probability: 44, odds: '+125' }
        ]
    },
    {
        player: 'James Cook',
        team: 'Bills',
        opponent: 'Lions',
        position: 'RB',
        sport: 'nfl',
        props: [
            { type: 'Rush Yards', line: 68.5, pick: 'Over', probability: 58, odds: '-105' },
            { type: 'Receiving Yards', line: 18.5, pick: 'Over', probability: 61, odds: '-108' },
            { type: 'Anytime TD', line: 0.5, pick: 'Over', probability: 51, odds: '+110' }
        ]
    },
    {
        player: 'Jared Goff',
        team: 'Lions',
        opponent: 'Bills',
        position: 'QB',
        sport: 'nfl',
        props: [
            { type: 'Pass Yards', line: 278.5, pick: 'Over', probability: 63, odds: '-108' },
            { type: 'Pass TDs', line: 2.5, pick: 'Over', probability: 58, odds: '+115' },
            { type: 'Completions', line: 23.5, pick: 'Over', probability: 61, odds: '-105' },
            { type: 'Interceptions', line: 0.5, pick: 'Under', probability: 56, odds: '-110' }
        ]
    },
    {
        player: "Amon-Ra St. Brown",
        team: 'Lions',
        opponent: 'Bills',
        position: 'WR',
        sport: 'nfl',
        props: [
            { type: 'Receiving Yards', line: 82.5, pick: 'Over', probability: 64, odds: '-110' },
            { type: 'Receptions', line: 7.5, pick: 'Over', probability: 68, odds: '-108' },
            { type: 'Receiving TDs', line: 0.5, pick: 'Over', probability: 48, odds: '+105' }
        ]
    },
    {
        player: 'Jahmyr Gibbs',
        team: 'Lions',
        opponent: 'Bills',
        position: 'RB',
        sport: 'nfl',
        props: [
            { type: 'Rush Yards', line: 58.5, pick: 'Over', probability: 55, odds: '-105' },
            { type: 'Receiving Yards', line: 28.5, pick: 'Over', probability: 62, odds: '-108' },
            { type: 'Total Yards', line: 88.5, pick: 'Over', probability: 58, odds: '-105' }
        ]
    },
    {
        player: 'David Montgomery',
        team: 'Lions',
        opponent: 'Bills',
        position: 'RB',
        sport: 'nfl',
        props: [
            { type: 'Rush Yards', line: 52.5, pick: 'Over', probability: 56, odds: '-108' },
            { type: 'Anytime TD', line: 0.5, pick: 'Over', probability: 54, odds: '+100' },
            { type: 'Rush Attempts', line: 12.5, pick: 'Over', probability: 61, odds: '-105' }
        ]
    },

    // =====================================================
    // NHL PLAYER PROPS
    // =====================================================

    // Oilers vs Panthers
    {
        player: 'Connor McDavid',
        team: 'Oilers',
        opponent: 'Panthers',
        position: 'C',
        sport: 'nhl',
        props: [
            { type: 'Points', line: 1.5, pick: 'Over', probability: 72, odds: '-130' },
            { type: 'Goals', line: 0.5, pick: 'Over', probability: 55, odds: '+105' },
            { type: 'Assists', line: 1.5, pick: 'Under', probability: 54, odds: '-105' },
            { type: 'Shots', line: 4.5, pick: 'Over', probability: 68, odds: '-110' },
            { type: 'Power Play Points', line: 0.5, pick: 'Over', probability: 62, odds: '-108' }
        ]
    },
    {
        player: 'Leon Draisaitl',
        team: 'Oilers',
        opponent: 'Panthers',
        position: 'C',
        sport: 'nhl',
        props: [
            { type: 'Points', line: 1.5, pick: 'Over', probability: 68, odds: '-120' },
            { type: 'Goals', line: 0.5, pick: 'Over', probability: 58, odds: '-105' },
            { type: 'Shots', line: 4.5, pick: 'Over', probability: 64, odds: '-108' },
            { type: 'Assists', line: 0.5, pick: 'Over', probability: 71, odds: '-125' }
        ]
    },
    {
        player: 'Zach Hyman',
        team: 'Oilers',
        opponent: 'Panthers',
        position: 'LW',
        sport: 'nhl',
        props: [
            { type: 'Goals', line: 0.5, pick: 'Over', probability: 52, odds: '+115' },
            { type: 'Points', line: 0.5, pick: 'Over', probability: 61, odds: '-110' },
            { type: 'Shots', line: 3.5, pick: 'Over', probability: 58, odds: '-105' }
        ]
    },
    {
        player: 'Ryan Nugent-Hopkins',
        team: 'Oilers',
        opponent: 'Panthers',
        position: 'C',
        sport: 'nhl',
        props: [
            { type: 'Points', line: 0.5, pick: 'Over', probability: 58, odds: '-105' },
            { type: 'Assists', line: 0.5, pick: 'Over', probability: 54, odds: '+100' },
            { type: 'Shots', line: 2.5, pick: 'Over', probability: 61, odds: '-108' }
        ]
    },
    {
        player: 'Aleksander Barkov',
        team: 'Panthers',
        opponent: 'Oilers',
        position: 'C',
        sport: 'nhl',
        props: [
            { type: 'Points', line: 0.5, pick: 'Over', probability: 64, odds: '-115' },
            { type: 'Goals', line: 0.5, pick: 'Over', probability: 48, odds: '+125' },
            { type: 'Shots', line: 3.5, pick: 'Over', probability: 56, odds: '-105' },
            { type: 'Blocks', line: 1.5, pick: 'Over', probability: 52, odds: '+100' }
        ]
    },
    {
        player: 'Matthew Tkachuk',
        team: 'Panthers',
        opponent: 'Oilers',
        position: 'LW',
        sport: 'nhl',
        props: [
            { type: 'Points', line: 0.5, pick: 'Over', probability: 62, odds: '-110' },
            { type: 'Goals', line: 0.5, pick: 'Over', probability: 46, odds: '+130' },
            { type: 'Shots', line: 3.5, pick: 'Over', probability: 58, odds: '-105' },
            { type: 'Hits', line: 2.5, pick: 'Over', probability: 64, odds: '-108' }
        ]
    },
    {
        player: 'Sam Reinhart',
        team: 'Panthers',
        opponent: 'Oilers',
        position: 'C',
        sport: 'nhl',
        props: [
            { type: 'Goals', line: 0.5, pick: 'Over', probability: 52, odds: '+110' },
            { type: 'Points', line: 0.5, pick: 'Over', probability: 58, odds: '-105' },
            { type: 'Shots', line: 3.5, pick: 'Over', probability: 55, odds: '+100' }
        ]
    },
    {
        player: 'Carter Verhaeghe',
        team: 'Panthers',
        opponent: 'Oilers',
        position: 'LW',
        sport: 'nhl',
        props: [
            { type: 'Points', line: 0.5, pick: 'Over', probability: 54, odds: '+100' },
            { type: 'Goals', line: 0.5, pick: 'Over', probability: 42, odds: '+145' },
            { type: 'Shots', line: 2.5, pick: 'Over', probability: 58, odds: '-105' }
        ]
    },

    // Bruins vs Rangers
    {
        player: 'David Pastrnak',
        team: 'Bruins',
        opponent: 'Rangers',
        position: 'RW',
        sport: 'nhl',
        props: [
            { type: 'Points', line: 1.5, pick: 'Under', probability: 54, odds: '-105' },
            { type: 'Goals', line: 0.5, pick: 'Over', probability: 55, odds: '+100' },
            { type: 'Shots', line: 4.5, pick: 'Over', probability: 66, odds: '-110' },
            { type: 'Power Play Points', line: 0.5, pick: 'Over', probability: 58, odds: '-105' }
        ]
    },
    {
        player: 'Brad Marchand',
        team: 'Bruins',
        opponent: 'Rangers',
        position: 'LW',
        sport: 'nhl',
        props: [
            { type: 'Points', line: 0.5, pick: 'Over', probability: 61, odds: '-110' },
            { type: 'Assists', line: 0.5, pick: 'Over', probability: 54, odds: '+100' },
            { type: 'Shots', line: 3.5, pick: 'Under', probability: 56, odds: '-105' }
        ]
    },
    {
        player: 'Charlie McAvoy',
        team: 'Bruins',
        opponent: 'Rangers',
        position: 'D',
        sport: 'nhl',
        props: [
            { type: 'Points', line: 0.5, pick: 'Over', probability: 52, odds: '+105' },
            { type: 'Shots', line: 2.5, pick: 'Over', probability: 58, odds: '-105' },
            { type: 'Blocked Shots', line: 2.5, pick: 'Over', probability: 61, odds: '-108' }
        ]
    },
    {
        player: 'Artemi Panarin',
        team: 'Rangers',
        opponent: 'Bruins',
        position: 'LW',
        sport: 'nhl',
        props: [
            { type: 'Points', line: 1.5, pick: 'Under', probability: 56, odds: '-108' },
            { type: 'Goals', line: 0.5, pick: 'Over', probability: 48, odds: '+120' },
            { type: 'Assists', line: 0.5, pick: 'Over', probability: 58, odds: '-105' },
            { type: 'Shots', line: 3.5, pick: 'Over', probability: 62, odds: '-110' }
        ]
    },
    {
        player: 'Mika Zibanejad',
        team: 'Rangers',
        opponent: 'Bruins',
        position: 'C',
        sport: 'nhl',
        props: [
            { type: 'Points', line: 0.5, pick: 'Over', probability: 58, odds: '-105' },
            { type: 'Goals', line: 0.5, pick: 'Over', probability: 45, odds: '+135' },
            { type: 'Shots', line: 3.5, pick: 'Over', probability: 55, odds: '+100' },
            { type: 'Faceoff Wins', line: 10.5, pick: 'Over', probability: 54, odds: '-105' }
        ]
    },
    {
        player: 'Adam Fox',
        team: 'Rangers',
        opponent: 'Bruins',
        position: 'D',
        sport: 'nhl',
        props: [
            { type: 'Points', line: 0.5, pick: 'Over', probability: 61, odds: '-110' },
            { type: 'Assists', line: 0.5, pick: 'Over', probability: 55, odds: '+100' },
            { type: 'Shots', line: 2.5, pick: 'Over', probability: 58, odds: '-105' },
            { type: 'Blocked Shots', line: 1.5, pick: 'Over', probability: 64, odds: '-108' }
        ]
    },
    {
        player: 'Chris Kreider',
        team: 'Rangers',
        opponent: 'Bruins',
        position: 'LW',
        sport: 'nhl',
        props: [
            { type: 'Goals', line: 0.5, pick: 'Over', probability: 48, odds: '+115' },
            { type: 'Points', line: 0.5, pick: 'Over', probability: 54, odds: '+100' },
            { type: 'Shots', line: 3.5, pick: 'Over', probability: 56, odds: '-105' }
        ]
    },

    // =====================================================
    // MLB PLAYER PROPS
    // =====================================================

    // Dodgers vs Yankees
    {
        player: 'Shohei Ohtani',
        team: 'Dodgers',
        opponent: 'Yankees',
        position: 'DH',
        sport: 'mlb',
        props: [
            { type: 'Hits', line: 1.5, pick: 'Over', probability: 52, odds: '+110' },
            { type: 'Total Bases', line: 2.5, pick: 'Over', probability: 48, odds: '+125' },
            { type: 'RBIs', line: 0.5, pick: 'Over', probability: 55, odds: '-105' },
            { type: 'Runs', line: 0.5, pick: 'Over', probability: 58, odds: '-110' },
            { type: 'Home Run', line: 0.5, pick: 'Over', probability: 28, odds: '+260' },
            { type: 'Walks', line: 0.5, pick: 'Over', probability: 62, odds: '-130' }
        ]
    },
    {
        player: 'Mookie Betts',
        team: 'Dodgers',
        opponent: 'Yankees',
        position: 'RF',
        sport: 'mlb',
        props: [
            { type: 'Hits', line: 1.5, pick: 'Under', probability: 54, odds: '-105' },
            { type: 'Total Bases', line: 1.5, pick: 'Over', probability: 58, odds: '-110' },
            { type: 'Runs', line: 0.5, pick: 'Over', probability: 61, odds: '-115' },
            { type: 'Stolen Base', line: 0.5, pick: 'Over', probability: 35, odds: '+190' }
        ]
    },
    {
        player: 'Freddie Freeman',
        team: 'Dodgers',
        opponent: 'Yankees',
        position: '1B',
        sport: 'mlb',
        props: [
            { type: 'Hits', line: 1.5, pick: 'Over', probability: 48, odds: '+130' },
            { type: 'RBIs', line: 0.5, pick: 'Over', probability: 52, odds: '+105' },
            { type: 'Total Bases', line: 1.5, pick: 'Over', probability: 55, odds: '-105' },
            { type: 'Walks', line: 0.5, pick: 'Over', probability: 58, odds: '-115' }
        ]
    },
    {
        player: 'Max Muncy',
        team: 'Dodgers',
        opponent: 'Yankees',
        position: '3B',
        sport: 'mlb',
        props: [
            { type: 'Hits', line: 0.5, pick: 'Over', probability: 56, odds: '-110' },
            { type: 'Home Run', line: 0.5, pick: 'Over', probability: 22, odds: '+320' },
            { type: 'RBIs', line: 0.5, pick: 'Over', probability: 48, odds: '+115' },
            { type: 'Walks', line: 0.5, pick: 'Over', probability: 61, odds: '-125' }
        ]
    },
    {
        player: 'Aaron Judge',
        team: 'Yankees',
        opponent: 'Dodgers',
        position: 'RF',
        sport: 'mlb',
        props: [
            { type: 'Hits', line: 1.5, pick: 'Under', probability: 55, odds: '-108' },
            { type: 'Home Run', line: 0.5, pick: 'Over', probability: 32, odds: '+210' },
            { type: 'Total Bases', line: 2.5, pick: 'Over', probability: 45, odds: '+135' },
            { type: 'RBIs', line: 0.5, pick: 'Over', probability: 54, odds: '-105' },
            { type: 'Strikeouts', line: 1.5, pick: 'Over', probability: 62, odds: '-120' }
        ]
    },
    {
        player: 'Juan Soto',
        team: 'Yankees',
        opponent: 'Dodgers',
        position: 'LF',
        sport: 'mlb',
        props: [
            { type: 'Hits', line: 1.5, pick: 'Over', probability: 46, odds: '+140' },
            { type: 'Walks', line: 0.5, pick: 'Over', probability: 68, odds: '-155' },
            { type: 'Total Bases', line: 1.5, pick: 'Over', probability: 52, odds: '+105' },
            { type: 'Runs', line: 0.5, pick: 'Over', probability: 55, odds: '-105' }
        ]
    },
    {
        player: 'Giancarlo Stanton',
        team: 'Yankees',
        opponent: 'Dodgers',
        position: 'DH',
        sport: 'mlb',
        props: [
            { type: 'Hits', line: 0.5, pick: 'Over', probability: 52, odds: '+100' },
            { type: 'Home Run', line: 0.5, pick: 'Over', probability: 28, odds: '+260' },
            { type: 'Total Bases', line: 1.5, pick: 'Over', probability: 45, odds: '+140' },
            { type: 'Strikeouts', line: 1.5, pick: 'Over', probability: 65, odds: '-135' }
        ]
    },
    {
        player: 'Anthony Volpe',
        team: 'Yankees',
        opponent: 'Dodgers',
        position: 'SS',
        sport: 'mlb',
        props: [
            { type: 'Hits', line: 0.5, pick: 'Over', probability: 58, odds: '-115' },
            { type: 'Runs', line: 0.5, pick: 'Over', probability: 52, odds: '+100' },
            { type: 'Total Bases', line: 1.5, pick: 'Under', probability: 56, odds: '-105' }
        ]
    },
    {
        player: 'Gleyber Torres',
        team: 'Yankees',
        opponent: 'Dodgers',
        position: '2B',
        sport: 'mlb',
        props: [
            { type: 'Hits', line: 0.5, pick: 'Over', probability: 55, odds: '-105' },
            { type: 'RBIs', line: 0.5, pick: 'Under', probability: 54, odds: '-108' },
            { type: 'Total Bases', line: 1.5, pick: 'Under', probability: 58, odds: '-115' }
        ]
    },

    // =====================================================
    // SOCCER PLAYER PROPS
    // =====================================================

    // Arsenal vs Chelsea
    {
        player: 'Bukayo Saka',
        team: 'Arsenal',
        opponent: 'Chelsea',
        position: 'RW',
        sport: 'soccer',
        props: [
            { type: 'Shots', line: 2.5, pick: 'Over', probability: 62, odds: '-110' },
            { type: 'Shots on Target', line: 1.5, pick: 'Over', probability: 54, odds: '+100' },
            { type: 'Anytime Goal', line: 0.5, pick: 'Over', probability: 28, odds: '+260' },
            { type: 'Assists', line: 0.5, pick: 'Over', probability: 32, odds: '+210' }
        ]
    },
    {
        player: 'Martin Odegaard',
        team: 'Arsenal',
        opponent: 'Chelsea',
        position: 'CAM',
        sport: 'soccer',
        props: [
            { type: 'Shots', line: 2.5, pick: 'Over', probability: 58, odds: '-105' },
            { type: 'Key Passes', line: 2.5, pick: 'Over', probability: 64, odds: '-115' },
            { type: 'Anytime Goal', line: 0.5, pick: 'Over', probability: 25, odds: '+300' },
            { type: 'Assists', line: 0.5, pick: 'Over', probability: 35, odds: '+185' }
        ]
    },
    {
        player: 'Kai Havertz',
        team: 'Arsenal',
        opponent: 'Chelsea',
        position: 'CF',
        sport: 'soccer',
        props: [
            { type: 'Shots', line: 2.5, pick: 'Over', probability: 55, odds: '+100' },
            { type: 'Headers Won', line: 3.5, pick: 'Over', probability: 61, odds: '-108' },
            { type: 'Anytime Goal', line: 0.5, pick: 'Over', probability: 32, odds: '+215' }
        ]
    },
    {
        player: 'Gabriel Jesus',
        team: 'Arsenal',
        opponent: 'Chelsea',
        position: 'CF',
        sport: 'soccer',
        props: [
            { type: 'Shots', line: 2.5, pick: 'Under', probability: 54, odds: '-105' },
            { type: 'Anytime Goal', line: 0.5, pick: 'Over', probability: 28, odds: '+260' },
            { type: 'Dribbles', line: 1.5, pick: 'Over', probability: 58, odds: '-110' }
        ]
    },
    {
        player: 'Cole Palmer',
        team: 'Chelsea',
        opponent: 'Arsenal',
        position: 'CAM',
        sport: 'soccer',
        props: [
            { type: 'Shots', line: 3.5, pick: 'Over', probability: 56, odds: '+100' },
            { type: 'Shots on Target', line: 1.5, pick: 'Over', probability: 52, odds: '+110' },
            { type: 'Anytime Goal', line: 0.5, pick: 'Over', probability: 35, odds: '+190' },
            { type: 'Assists', line: 0.5, pick: 'Over', probability: 28, odds: '+260' }
        ]
    },
    {
        player: 'Nicolas Jackson',
        team: 'Chelsea',
        opponent: 'Arsenal',
        position: 'CF',
        sport: 'soccer',
        props: [
            { type: 'Shots', line: 2.5, pick: 'Over', probability: 54, odds: '-105' },
            { type: 'Anytime Goal', line: 0.5, pick: 'Over', probability: 26, odds: '+285' },
            { type: 'Offsides', line: 1.5, pick: 'Over', probability: 48, odds: '+125' }
        ]
    },
    {
        player: 'Raheem Sterling',
        team: 'Chelsea',
        opponent: 'Arsenal',
        position: 'LW',
        sport: 'soccer',
        props: [
            { type: 'Shots', line: 1.5, pick: 'Over', probability: 58, odds: '-110' },
            { type: 'Dribbles', line: 2.5, pick: 'Over', probability: 55, odds: '+100' },
            { type: 'Anytime Goal', line: 0.5, pick: 'Over', probability: 22, odds: '+350' }
        ]
    },
    {
        player: 'Enzo Fernandez',
        team: 'Chelsea',
        opponent: 'Arsenal',
        position: 'CM',
        sport: 'soccer',
        props: [
            { type: 'Passes', line: 55.5, pick: 'Over', probability: 61, odds: '-110' },
            { type: 'Tackles', line: 2.5, pick: 'Over', probability: 54, odds: '+100' },
            { type: 'Shots', line: 1.5, pick: 'Under', probability: 58, odds: '-108' }
        ]
    }
];

// AI predictions with detailed analysis
const aiPredictions = [
    {
        homeTeam: teams.celtics,
        awayTeam: teams.lakers,
        sport: 'nba',
        time: formatTime(19, 30),
        date: formatDate(today),
        prediction: {
            winner: 'Celtics',
            winProbability: 72,
            predictedScore: { home: 118, away: 108 },
            spread: -6.5,
            confidence: 78
        },
        factors: ['Home Court', 'Defense', 'Rest Advantage', 'H2H Record'],
        analysis: 'The Celtics have a significant home court advantage and their defense has been elite, holding opponents to under 105 PPG at home.'
    },
    {
        homeTeam: teams.nuggets,
        awayTeam: teams.warriors,
        sport: 'nba',
        time: formatTime(21, 0),
        date: formatDate(today),
        prediction: {
            winner: 'Nuggets',
            winProbability: 68,
            predictedScore: { home: 122, away: 115 },
            spread: -4.5,
            confidence: 71
        },
        factors: ['Altitude', 'Jokic MVP', 'Bench Depth', 'Recent Form'],
        analysis: 'Denver\'s altitude advantage and Jokic\'s dominant recent performances make them favorites. Warriors struggling on the road.'
    },
    {
        homeTeam: teams.oilers,
        awayTeam: teams.panthers,
        sport: 'nhl',
        time: formatTime(20, 0),
        date: formatDate(today),
        prediction: {
            winner: 'Oilers',
            winProbability: 61,
            predictedScore: { home: 4, away: 2 },
            spread: -1.5,
            confidence: 65
        },
        factors: ['McDavid Hot', 'Power Play', 'Home Ice', 'Goaltending'],
        analysis: 'McDavid has 12 points in his last 5 games. The Oilers power play is clicking at 32% this month.'
    },
    {
        homeTeam: teams.arsenal,
        awayTeam: teams.chelsea,
        sport: 'soccer',
        time: formatTime(15, 0),
        date: formatDate(tomorrow),
        prediction: {
            winner: 'Arsenal',
            winProbability: 58,
            predictedScore: { home: 2, away: 1 },
            spread: -1.5,
            confidence: 76
        },
        factors: ['Title Race', 'Home Form', 'Clean Sheets', 'Set Pieces'],
        analysis: 'Arsenal have won 12 of their last 14 home matches. Chelsea struggling away with just 2 wins in their last 8 road games.'
    },
    {
        homeTeam: teams.chiefs,
        awayTeam: teams.eagles,
        sport: 'nfl',
        time: formatTime(18, 30),
        date: formatDate(tomorrow),
        prediction: {
            winner: 'Chiefs',
            winProbability: 58,
            predictedScore: { home: 27, away: 24 },
            spread: -3.5,
            confidence: 65
        },
        factors: ['Mahomes', 'Red Zone', 'Pass Rush', 'Weather'],
        analysis: 'Mahomes is 32-5 at home in his career. The Chiefs defense has allowed the fewest rushing yards in the league.'
    },
    {
        homeTeam: teams.realmadrid,
        awayTeam: teams.barcelona,
        sport: 'soccer',
        time: formatTime(16, 0),
        date: formatDate(tomorrow),
        prediction: {
            winner: 'Real Madrid',
            winProbability: 45,
            predictedScore: { home: 2, away: 2 },
            spread: 0,
            confidence: 52
        },
        factors: ['El Clasico', 'Form', 'Injuries', 'Crowd'],
        analysis: 'Classic rivalry match with both teams in good form. This one is too close to call - consider the draw at +240.'
    }
];

// Live games data
const liveGames = [
    {
        sport: 'nba',
        sportName: 'NBA',
        homeTeam: { ...teams.bucks, score: 78 },
        awayTeam: { ...teams.knicks, score: 72 },
        period: '3rd',
        timeRemaining: '4:32',
        odds: {
            spread: { value: '-4.5', change: 'up' },
            moneyline: { value: '-185', change: 'up' },
            total: { value: '218.5', change: 'down' }
        }
    },
    {
        sport: 'nhl',
        sportName: 'NHL',
        homeTeam: { ...teams.bruins, score: 2 },
        awayTeam: { ...teams.rangers, score: 2 },
        period: '2nd',
        timeRemaining: '8:15',
        odds: {
            spread: { value: '-1.5', change: 'down' },
            moneyline: { value: '+105', change: 'down' },
            total: { value: '5.5', change: 'up' }
        }
    },
    {
        sport: 'soccer',
        sportName: 'Premier League',
        homeTeam: { ...teams.liverpool, score: 1 },
        awayTeam: { ...teams.mancity, score: 1 },
        period: "62'",
        timeRemaining: '',
        odds: {
            spread: { value: '+0.5', change: 'stable' },
            moneyline: { value: '+280', change: 'up' },
            total: { value: '2.5', change: 'down' }
        }
    },
    {
        sport: 'tennis',
        sportName: 'ATP Tour',
        homeTeam: { ...teams.djokovic, score: '6-4, 3-2' },
        awayTeam: { ...teams.sinner, score: '4-6, 2-3' },
        period: 'Set 2',
        timeRemaining: '',
        odds: {
            spread: { value: '-3.5', change: 'stable' },
            moneyline: { value: '-180', change: 'up' },
            total: { value: '21.5', change: 'stable' }
        }
    }
];

// Export data
window.sportsData = {
    teams,
    topPicks,
    upcomingGames,
    oddsComparison,
    playerProps,
    aiPredictions,
    liveGames
};
