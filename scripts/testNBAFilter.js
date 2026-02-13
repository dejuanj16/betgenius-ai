#!/usr/bin/env node
/**
 * NBA Props Monitor & Filter Test - February 17, 2026
 *
 * Purpose: Monitor NBA props when regular season resumes after All-Star Weekend
 *
 * All-Star Weekend Schedule:
 *   - Feb 14 (Fri): Rising Stars Game
 *   - Feb 15 (Sat): Skills/3PT/Dunk Contest
 *   - Feb 16 (Sun): All-Star Game
 *   - Feb 17 (Mon): Regular season resumes!
 *
 * Usage:
 *   node scripts/testNBAFilter.js              # Full test suite
 *   node scripts/testNBAFilter.js --check      # Quick status check
 *   node scripts/testNBAFilter.js --monitor    # Monitor mode (refresh every 2 min)
 */

const https = require('https');

const API_BASE = 'https://betgenius-ai.onrender.com';
const ESPN_NBA = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
const PRIZEPICKS_NBA = 'https://api.prizepicks.com/projections?league_id=7';

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    magenta: '\x1b[35m'
};

function log(msg, color = '') {
    const timestamp = new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' });
    console.log(`${color}[${timestamp} EST] ${msg}${COLORS.reset}`);
}

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`JSON parse error: ${e.message}`));
                }
            });
        }).on('error', reject);
    });
}

async function getESPNGames() {
    const data = await fetchJSON(ESPN_NBA);
    const games = (data.events || []).map(event => {
        const comp = event.competitions?.[0] || {};
        const home = comp.competitors?.find(c => c.homeAway === 'home') || {};
        const away = comp.competitors?.find(c => c.homeAway === 'away') || {};
        const status = event.status?.type?.name || 'UNKNOWN';

        // Detect All-Star events
        const name = (event.name || '').toLowerCase();
        const isAllStar = name.includes('all-star') || name.includes('rising stars') ||
                          name.includes('celebrity') || name.includes('team ');

        return {
            name: event.name,
            homeTeam: home.team?.abbreviation,
            awayTeam: away.team?.abbreviation,
            homeScore: home.score,
            awayScore: away.score,
            status: status,
            statusDetail: event.status?.type?.shortDetail || status,
            isFinal: status === 'STATUS_FINAL',
            isInProgress: status === 'STATUS_IN_PROGRESS',
            isAllStar: isAllStar,
            gameTime: event.date
        };
    });
    return games;
}

async function getNBAProps() {
    const data = await fetchJSON(`${API_BASE}/api/props/nba`);
    return {
        source: data.source,
        propsCount: data.propsCount || 0,
        props: data.props || [],
        note: data.note,
        specialEvent: data.specialEvent
    };
}

async function checkPrizePicks() {
    try {
        const data = await fetchJSON(PRIZEPICKS_NBA);
        const projections = data.data || [];

        return {
            available: projections.length > 0,
            count: projections.length
        };
    } catch (e) {
        return { available: false, error: e.message };
    }
}

async function runQuickCheck() {
    console.log('\n' + '═'.repeat(65));
    log('🏀 NBA PROPS MONITOR - QUICK CHECK', COLORS.bold + COLORS.cyan);
    console.log('═'.repeat(65) + '\n');

    // Check ESPN games
    log('Fetching ESPN NBA scoreboard...', COLORS.blue);
    const games = await getESPNGames();

    const regularGames = games.filter(g => !g.isAllStar);
    const allStarGames = games.filter(g => g.isAllStar);
    const finalGames = regularGames.filter(g => g.isFinal);
    const inProgressGames = regularGames.filter(g => g.isInProgress);
    const scheduledGames = regularGames.filter(g => !g.isFinal && !g.isInProgress);

    console.log(`\n📊 Game Status:`);
    console.log(`   Total Events: ${games.length}`);

    if (allStarGames.length > 0) {
        console.log(`   ${COLORS.yellow}⭐ All-Star Events: ${allStarGames.length}${COLORS.reset}`);
        allStarGames.forEach(g => {
            console.log(`      • ${g.name} - ${g.statusDetail}`);
        });
    }

    console.log(`   Regular Season Games: ${regularGames.length}`);
    if (regularGames.length > 0) {
        console.log(`   ${COLORS.green}✓ Final: ${finalGames.length}${COLORS.reset}`);
        console.log(`   ${COLORS.yellow}▶ In Progress: ${inProgressGames.length}${COLORS.reset}`);
        console.log(`   ⏳ Scheduled: ${scheduledGames.length}`);
    }

    if (finalGames.length > 0) {
        console.log(`\n🏁 Completed Games (should be filtered):`);
        finalGames.forEach(g => {
            console.log(`   ${g.awayTeam} ${g.awayScore} @ ${g.homeTeam} ${g.homeScore} - FINAL`);
        });
    }

    // Check API props
    log('\nFetching BetGenius NBA props...', COLORS.blue);
    const propsData = await getNBAProps();

    console.log(`\n📈 Props Status:`);
    console.log(`   Source: ${propsData.source}`);
    console.log(`   Props Count: ${propsData.propsCount}`);

    if (propsData.specialEvent) {
        console.log(`   ${COLORS.yellow}⚠ Special Event: ${propsData.specialEvent}${COLORS.reset}`);
        console.log(`   Note: ${propsData.note}`);
        return { ready: false, reason: 'All-Star Weekend still active', isAllStar: true };
    }

    // Check PrizePicks
    log('\nChecking PrizePicks NBA...', COLORS.blue);
    const pp = await checkPrizePicks();
    if (pp.available) {
        console.log(`   ${COLORS.green}✅ PrizePicks NBA: ${pp.count} props available${COLORS.reset}`);
    } else {
        console.log(`   ${COLORS.yellow}⏳ No PrizePicks NBA props yet${COLORS.reset}`);
    }

    // Check for props from completed teams
    if (finalGames.length > 0 && propsData.props.length > 0) {
        const completedTeams = new Set();
        finalGames.forEach(g => {
            completedTeams.add(g.homeTeam);
            completedTeams.add(g.awayTeam);
        });

        const propsFromCompleted = propsData.props.filter(p => completedTeams.has(p.team));

        console.log(`\n🔍 Filter Test Results:`);
        if (propsFromCompleted.length === 0) {
            log(`✅ PASS: 0 props from completed teams (filtering working!)`, COLORS.green);
        } else {
            log(`❌ FAIL: ${propsFromCompleted.length} props from completed teams found!`, COLORS.red);
            propsFromCompleted.slice(0, 5).forEach(p => {
                console.log(`   - ${p.player} (${p.team}): ${p.line} ${p.prop}`);
            });
        }

        return {
            ready: true,
            passed: propsFromCompleted.length === 0,
            completedTeams: Array.from(completedTeams),
            propsFromCompleted: propsFromCompleted.length
        };
    }

    return {
        ready: regularGames.length > 0,
        waiting: regularGames.length > 0 && finalGames.length === 0,
        noGames: regularGames.length === 0
    };
}

async function runMonitorMode(intervalSec = 120) {
    console.log('\n' + '═'.repeat(65));
    log('🏀 NBA FILTER TEST - MONITOR MODE', COLORS.bold + COLORS.cyan);
    log(`   Refreshing every ${intervalSec} seconds. Press Ctrl+C to stop.`, COLORS.cyan);
    console.log('═'.repeat(65) + '\n');

    let lastFinalCount = 0;
    let wasAllStar = true;

    const check = async () => {
        try {
            const games = await getESPNGames();
            const props = await getNBAProps();

            const regularGames = games.filter(g => !g.isAllStar);
            const finalGames = regularGames.filter(g => g.isFinal);
            const inProgress = regularGames.filter(g => g.isInProgress);

            // Alert when transitioning out of All-Star Weekend
            if (wasAllStar && regularGames.length > 0 && !props.specialEvent) {
                wasAllStar = false;
                console.log('\n' + '🎉'.repeat(20));
                log(`NBA REGULAR SEASON HAS RESUMED!`, COLORS.bold + COLORS.green);
                console.log('🎉'.repeat(20) + '\n');
                process.stdout.write('\x07'); // Bell
            }

            // Alert on new FINAL games
            if (finalGames.length > lastFinalCount) {
                log(`🚨 NEW GAME WENT FINAL!`, COLORS.bold + COLORS.yellow);
                const newFinals = finalGames.slice(lastFinalCount);
                newFinals.forEach(g => {
                    log(`   ${g.awayTeam} ${g.awayScore} @ ${g.homeTeam} ${g.homeScore} - FINAL`, COLORS.yellow);
                });
                lastFinalCount = finalGames.length;
            }

            // Status line
            const statusLine = [
                `Games: ${regularGames.length}`,
                `Final: ${finalGames.length}`,
                `Live: ${inProgress.length}`,
                `Props: ${props.propsCount}`,
                `Source: ${props.source}`
            ].join(' | ');

            log(statusLine, props.specialEvent ? COLORS.yellow : COLORS.green);

            // Check filtering
            if (finalGames.length > 0 && props.props.length > 0) {
                const completedTeams = new Set();
                finalGames.forEach(g => {
                    completedTeams.add(g.homeTeam);
                    completedTeams.add(g.awayTeam);
                });

                const leaked = props.props.filter(p => completedTeams.has(p.team));
                if (leaked.length > 0) {
                    log(`❌ FILTER LEAK: ${leaked.length} props from completed teams!`, COLORS.red);
                } else {
                    log(`✅ Filter working: 0 props from ${completedTeams.size} completed teams`, COLORS.green);
                }
            }

        } catch (e) {
            log(`Error: ${e.message}`, COLORS.red);
        }
    };

    await check();
    setInterval(check, intervalSec * 1000);
}

async function runFullTest() {
    console.log('\n' + '═'.repeat(70));
    console.log(`${COLORS.bold}${COLORS.cyan}`);
    console.log('  🏀 NBA COMPLETED GAMES FILTER TEST');
    console.log('  Scheduled for: February 17, 2026 (Regular season resumes)');
    console.log(`${COLORS.reset}`);
    console.log('═'.repeat(70) + '\n');

    console.log(`${COLORS.yellow}All-Star Weekend Schedule:${COLORS.reset}`);
    console.log('  • Feb 14 (Fri): Rising Stars Game');
    console.log('  • Feb 15 (Sat): Skills/3PT/Dunk Contest');
    console.log('  • Feb 16 (Sun): All-Star Game');
    console.log('  • Feb 17 (Mon): Regular season resumes! ⬅️\n');

    const today = new Date();
    const targetDate = new Date('2026-02-17');
    const daysUntil = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntil > 0) {
        log(`⏳ ${daysUntil} days until NBA resumes (Feb 17, 2026)`, COLORS.yellow);
        log('Running preliminary check anyway...\n', COLORS.yellow);
    } else if (daysUntil === 0) {
        log('🎉 TODAY IS THE DAY! NBA regular season resumes!', COLORS.green);
    } else {
        log(`✅ NBA has been back for ${Math.abs(daysUntil)} days`, COLORS.green);
    }

    // Run the check
    const result = await runQuickCheck();

    console.log('\n' + '─'.repeat(65));
    console.log('Test Summary:');

    if (result.isAllStar) {
        console.log(`  Status: ${COLORS.yellow}Not ready - ${result.reason}${COLORS.reset}`);
        console.log('  Action: Run this test again on Feb 17 or later');
    } else if (result.noGames) {
        console.log(`  Status: ${COLORS.yellow}No regular season games yet${COLORS.reset}`);
        console.log('  Action: Check back when games are scheduled');
    } else if (result.waiting) {
        console.log(`  Status: ${COLORS.yellow}Waiting for games to go FINAL${COLORS.reset}`);
        console.log('  Action: Run with --monitor to watch for game completions');
    } else if (result.passed) {
        console.log(`  Status: ${COLORS.green}✅ PASSED - Filtering working correctly!${COLORS.reset}`);
        console.log(`  Completed Teams: ${result.completedTeams.join(', ')}`);
        console.log(`  Props Leaked: ${result.propsFromCompleted}`);
    } else if (result.passed === false) {
        console.log(`  Status: ${COLORS.red}❌ FAILED - Props from completed teams found!${COLORS.reset}`);
        console.log(`  Action: Check filterCompletedGameProps() in server.js`);
    }

    console.log('─'.repeat(65) + '\n');
}

// Main
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
NBA Filter Test Script
======================

Tests completed games filtering when NBA resumes after All-Star Weekend.

Usage:
  node scripts/testNBAFilter.js              Run full test suite
  node scripts/testNBAFilter.js --check      Quick status check
  node scripts/testNBAFilter.js --monitor    Monitor mode (refresh every 2 min)
  node scripts/testNBAFilter.js --monitor --interval=60  Custom interval (seconds)

All-Star Weekend: Feb 14-16, 2026
Regular Season Resumes: Feb 17, 2026
`);
    process.exit(0);
}

if (args.includes('--monitor') || args.includes('-m')) {
    const intervalArg = args.find(a => a.startsWith('--interval='));
    const interval = intervalArg ? parseInt(intervalArg.split('=')[1]) : 120;
    runMonitorMode(interval).catch(console.error);
} else if (args.includes('--check') || args.includes('-c')) {
    runQuickCheck().then(() => process.exit(0)).catch(e => {
        console.error(e);
        process.exit(1);
    });
} else {
    runFullTest().catch(console.error);
}
