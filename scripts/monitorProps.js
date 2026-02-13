#!/usr/bin/env node
// =====================================================
// BetGenius AI - Props Monitoring Script
// Monitors completed games filtering effectiveness
// Run: node scripts/monitorProps.js [sport]
// =====================================================

const https = require('https');
const http = require('http');

// Configuration
const API_BASE = process.env.API_URL || 'https://betgenius-ai.onrender.com';
const SPORTS = ['nba', 'nhl', 'ncaab'];

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

// ESPN sport paths
const ESPN_PATHS = {
    nba: 'basketball/nba',
    nhl: 'hockey/nhl',
    ncaab: 'basketball/mens-college-basketball',
    nfl: 'football/nfl',
    mlb: 'baseball/mlb',
    ncaaf: 'football/college-football'
};

// Fetch JSON from URL
function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Failed to parse JSON: ${e.message}`));
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

// Fetch game statuses from ESPN
async function fetchGameStatuses(sport) {
    const sportPath = ESPN_PATHS[sport];
    if (!sportPath) return null;

    const url = `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/scoreboard`;
    const data = await fetchJSON(url);

    if (!data?.events) return { games: [], completed: [], scheduled: [], inProgress: [] };

    const completed = [];
    const scheduled = [];
    const inProgress = [];
    const completedTeams = new Set();
    const activeTeams = new Set();

    for (const event of data.events) {
        const name = event.shortName || event.name || 'Unknown';
        const status = event.status?.type?.name || 'unknown';
        const detail = event.status?.type?.detail || '';
        const competition = event.competitions?.[0];
        const home = competition?.competitors?.find(c => c.homeAway === 'home');
        const away = competition?.competitors?.find(c => c.homeAway === 'away');
        const homeAbbr = home?.team?.abbreviation || '?';
        const awayAbbr = away?.team?.abbreviation || '?';
        const homeScore = home?.score || '0';
        const awayScore = away?.score || '0';

        const gameInfo = {
            name,
            status,
            detail,
            homeTeam: homeAbbr,
            awayTeam: awayAbbr,
            score: `${awayAbbr} ${awayScore} - ${homeScore} ${homeAbbr}`
        };

        if (status === 'STATUS_FINAL' || status === 'final') {
            completed.push(gameInfo);
            completedTeams.add(homeAbbr);
            completedTeams.add(awayAbbr);
        } else if (status === 'STATUS_IN_PROGRESS' || status.includes('PROGRESS') || status === 'STATUS_HALFTIME') {
            inProgress.push(gameInfo);
            activeTeams.add(homeAbbr);
            activeTeams.add(awayAbbr);
        } else {
            scheduled.push(gameInfo);
            activeTeams.add(homeAbbr);
            activeTeams.add(awayAbbr);
        }
    }

    return {
        games: data.events,
        completed,
        scheduled,
        inProgress,
        completedTeams: Array.from(completedTeams),
        activeTeams: Array.from(activeTeams)
    };
}

// Fetch props from API
async function fetchProps(sport) {
    const url = `${API_BASE}/api/props/${sport}`;
    try {
        const data = await fetchJSON(url);
        return {
            props: data.props || [],
            source: data.source || 'unknown',
            count: data.propsCount || data.props?.length || 0
        };
    } catch (e) {
        return { props: [], source: 'error', count: 0, error: e.message };
    }
}

// Analyze props by team
function analyzeProps(props, completedTeams) {
    const byTeam = {};
    let completedTeamProps = 0;
    let activeTeamProps = 0;

    const completedSet = new Set(completedTeams.map(t => t.toUpperCase()));

    for (const prop of props) {
        const team = (prop.team || 'Unknown').toUpperCase();
        if (!byTeam[team]) byTeam[team] = [];
        byTeam[team].push(prop);

        if (completedSet.has(team)) {
            completedTeamProps++;
        } else {
            activeTeamProps++;
        }
    }

    return { byTeam, completedTeamProps, activeTeamProps };
}

// Print separator
function separator(char = '=', length = 60) {
    console.log(char.repeat(length));
}

// Monitor a single sport
async function monitorSport(sport) {
    console.log(`\n${colors.bright}${colors.cyan}📊 ${sport.toUpperCase()} PROPS MONITOR${colors.reset}`);
    separator();

    // Fetch game statuses
    console.log(`${colors.blue}Fetching game statuses from ESPN...${colors.reset}`);
    let gameData;
    try {
        gameData = await fetchGameStatuses(sport);
    } catch (e) {
        console.log(`${colors.red}❌ Failed to fetch games: ${e.message}${colors.reset}`);
        return;
    }

    // Fetch props
    console.log(`${colors.blue}Fetching props from API...${colors.reset}`);
    let propsData;
    try {
        propsData = await fetchProps(sport);
    } catch (e) {
        console.log(`${colors.red}❌ Failed to fetch props: ${e.message}${colors.reset}`);
        return;
    }

    // Game status summary
    console.log(`\n${colors.bright}Game Status:${colors.reset}`);
    console.log(`   ✅ Completed:   ${colors.green}${gameData.completed.length}${colors.reset}`);
    console.log(`   🔴 In Progress: ${colors.yellow}${gameData.inProgress.length}${colors.reset}`);
    console.log(`   ⏳ Scheduled:   ${colors.blue}${gameData.scheduled.length}${colors.reset}`);

    // Show in-progress games
    if (gameData.inProgress.length > 0) {
        console.log(`\n${colors.yellow}In Progress:${colors.reset}`);
        for (const game of gameData.inProgress) {
            console.log(`   🔴 ${game.score} (${game.detail})`);
        }
    }

    // Show completed games
    if (gameData.completed.length > 0) {
        console.log(`\n${colors.green}Completed (should be filtered):${colors.reset}`);
        for (const game of gameData.completed.slice(0, 5)) {
            console.log(`   ✅ ${game.score} - FINAL`);
        }
        if (gameData.completed.length > 5) {
            console.log(`   ... and ${gameData.completed.length - 5} more`);
        }
    }

    // Props summary
    console.log(`\n${colors.bright}Props Status:${colors.reset}`);
    console.log(`   Source: ${propsData.source}`);
    console.log(`   Total Props: ${colors.cyan}${propsData.count}${colors.reset}`);

    // Analyze props
    const analysis = analyzeProps(propsData.props, gameData.completedTeams);

    // Check for filtering issues
    if (analysis.completedTeamProps > 0) {
        console.log(`\n${colors.red}⚠️  FILTERING ISSUE DETECTED!${colors.reset}`);
        console.log(`   Props from completed teams: ${colors.red}${analysis.completedTeamProps}${colors.reset}`);
        console.log(`   These should have been filtered out.`);

        // Show which completed teams still have props
        console.log(`\n   Teams with completed games still showing props:`);
        const completedSet = new Set(gameData.completedTeams.map(t => t.toUpperCase()));
        for (const [team, props] of Object.entries(analysis.byTeam)) {
            if (completedSet.has(team)) {
                console.log(`   ${colors.red}   ${team}: ${props.length} props${colors.reset}`);
            }
        }
    } else if (gameData.completed.length > 0) {
        console.log(`\n${colors.green}✅ FILTERING WORKING CORRECTLY!${colors.reset}`);
        console.log(`   ${gameData.completedTeams.length} teams with completed games`);
        console.log(`   0 props showing for completed teams`);
    }

    // Props by team breakdown
    console.log(`\n${colors.bright}Props by Team:${colors.reset}`);
    const sortedTeams = Object.entries(analysis.byTeam)
        .sort((a, b) => b[1].length - a[1].length);

    const completedSet = new Set(gameData.completedTeams.map(t => t.toUpperCase()));
    for (const [team, props] of sortedTeams.slice(0, 10)) {
        const marker = completedSet.has(team) ? `${colors.red}🏁` : `${colors.green}▶️`;
        console.log(`   ${marker} ${team}: ${props.length} props${colors.reset}`);
    }
    if (sortedTeams.length > 10) {
        console.log(`   ... and ${sortedTeams.length - 10} more teams`);
    }

    return {
        sport,
        timestamp: new Date().toISOString(),
        games: {
            completed: gameData.completed.length,
            inProgress: gameData.inProgress.length,
            scheduled: gameData.scheduled.length
        },
        props: {
            total: propsData.count,
            completedTeamProps: analysis.completedTeamProps,
            activeTeamProps: analysis.activeTeamProps
        },
        filteringWorking: analysis.completedTeamProps === 0
    };
}

// Main monitoring function
async function main() {
    const args = process.argv.slice(2);
    const targetSport = args[0]?.toLowerCase();
    const continuous = args.includes('--watch') || args.includes('-w');
    const interval = parseInt(args.find(a => a.startsWith('--interval='))?.split('=')[1] || '300');

    console.log(`\n${colors.bright}${colors.magenta}╔════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}║     🎯 BetGenius AI - Props Monitoring Dashboard       ║${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}╚════════════════════════════════════════════════════════╝${colors.reset}`);
    console.log(`\n📅 ${new Date().toLocaleString()}`);
    console.log(`🌐 API: ${API_BASE}`);

    const sportsToMonitor = targetSport ? [targetSport] : SPORTS;

    const runMonitor = async () => {
        const results = [];
        for (const sport of sportsToMonitor) {
            if (ESPN_PATHS[sport]) {
                const result = await monitorSport(sport);
                if (result) results.push(result);
            } else {
                console.log(`\n${colors.yellow}⚠️  Unknown sport: ${sport}${colors.reset}`);
            }
        }

        // Summary
        separator();
        console.log(`\n${colors.bright}📋 SUMMARY${colors.reset}`);
        for (const r of results) {
            const status = r.filteringWorking
                ? `${colors.green}✅ OK${colors.reset}`
                : `${colors.red}⚠️ ISSUE${colors.reset}`;
            console.log(`   ${r.sport.toUpperCase()}: ${r.props.total} props | ${r.games.completed} completed games | ${status}`);
        }
        console.log(`\n${colors.cyan}Last checked: ${new Date().toLocaleTimeString()}${colors.reset}`);
    };

    await runMonitor();

    if (continuous) {
        console.log(`\n${colors.yellow}👀 Watching mode - refreshing every ${interval} seconds (Ctrl+C to stop)${colors.reset}`);
        setInterval(async () => {
            console.clear();
            await runMonitor();
        }, interval * 1000);
    }
}

// Run if called directly
main().catch(err => {
    console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
    process.exit(1);
});

module.exports = { monitorSport, fetchGameStatuses, fetchProps };
