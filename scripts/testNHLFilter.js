#!/usr/bin/env node
/**
 * NHL Filter Test Script - Scheduled for February 26, 2026
 *
 * Purpose: Test completed games filtering when NHL resumes from Olympic Break
 *
 * Test Plan:
 * 1. Verify NHL games are showing (no longer Olympic Break)
 * 2. Check props are being served before games go FINAL
 * 3. Monitor a game going FINAL and verify props get filtered out
 * 4. Verify team abbreviation normalization works
 *
 * Usage:
 *   node scripts/testNHLFilter.js              # Run full test suite
 *   node scripts/testNHLFilter.js --monitor    # Monitor mode (refresh every 2 min)
 *   node scripts/testNHLFilter.js --check      # Quick status check
 */

const https = require('https');

const API_BASE = 'https://betgenius-ai.onrender.com';
const ESPN_NHL = 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard';

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(msg, color = '') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${color}[${timestamp}] ${msg}${COLORS.reset}`);
}

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : require('http');
        client.get(url, { headers: { 'User-Agent': 'BetGenius-Test/1.0' } }, (res) => {
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
    const data = await fetchJSON(ESPN_NHL);
    const games = (data.events || []).map(event => {
        const comp = event.competitions?.[0] || {};
        const home = comp.competitors?.find(c => c.homeAway === 'home') || {};
        const away = comp.competitors?.find(c => c.homeAway === 'away') || {};
        const status = event.status?.type?.name || 'UNKNOWN';

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
            gameTime: event.date
        };
    });
    return games;
}

async function getNHLProps() {
    const data = await fetchJSON(`${API_BASE}/api/props/nhl`);
    return {
        source: data.source,
        propsCount: data.propsCount || 0,
        props: data.props || [],
        note: data.note,
        specialEvent: data.specialEvent
    };
}

async function runQuickCheck() {
    console.log('\n' + '='.repeat(60));
    log('🏒 NHL FILTER TEST - QUICK CHECK', COLORS.bold + COLORS.cyan);
    console.log('='.repeat(60) + '\n');

    // Check ESPN games
    log('Fetching ESPN NHL scoreboard...', COLORS.blue);
    const games = await getESPNGames();

    const finalGames = games.filter(g => g.isFinal);
    const inProgressGames = games.filter(g => g.isInProgress);
    const scheduledGames = games.filter(g => !g.isFinal && !g.isInProgress);

    console.log(`\n📊 Game Status:`);
    console.log(`   Total Games: ${games.length}`);
    console.log(`   ${COLORS.green}✓ Final: ${finalGames.length}${COLORS.reset}`);
    console.log(`   ${COLORS.yellow}▶ In Progress: ${inProgressGames.length}${COLORS.reset}`);
    console.log(`   ⏳ Scheduled: ${scheduledGames.length}`);

    if (finalGames.length > 0) {
        console.log(`\n🏁 Completed Games (should be filtered):`);
        finalGames.forEach(g => {
            console.log(`   ${g.awayTeam} ${g.awayScore} @ ${g.homeTeam} ${g.homeScore} - FINAL`);
        });
    }

    // Check API props
    log('\nFetching BetGenius NHL props...', COLORS.blue);
    const propsData = await getNHLProps();

    console.log(`\n📈 Props Status:`);
    console.log(`   Source: ${propsData.source}`);
    console.log(`   Props Count: ${propsData.propsCount}`);

    if (propsData.specialEvent) {
        console.log(`   ${COLORS.yellow}⚠ Special Event: ${propsData.specialEvent}${COLORS.reset}`);
        console.log(`   Note: ${propsData.note}`);
        return { ready: false, reason: 'Olympic Break still active' };
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

    return { ready: games.length > 0, waiting: true };
}

async function runMonitorMode(intervalSec = 120) {
    console.log('\n' + '='.repeat(60));
    log('🏒 NHL FILTER TEST - MONITOR MODE', COLORS.bold + COLORS.cyan);
    log(`   Refreshing every ${intervalSec} seconds. Press Ctrl+C to stop.`, COLORS.cyan);
    console.log('='.repeat(60) + '\n');

    let lastFinalCount = 0;

    const check = async () => {
        try {
            const games = await getESPNGames();
            const props = await getNHLProps();

            const finalGames = games.filter(g => g.isFinal);
            const inProgress = games.filter(g => g.isInProgress);

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
                `Games: ${games.length}`,
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
    console.log('\n' + '='.repeat(70));
    console.log(`${COLORS.bold}${COLORS.cyan}`);
    console.log('  🏒 NHL COMPLETED GAMES FILTER TEST');
    console.log('  Scheduled for: February 26, 2026 (NHL resumes from Olympic Break)');
    console.log(`${COLORS.reset}`);
    console.log('='.repeat(70) + '\n');

    const today = new Date();
    const targetDate = new Date('2026-02-26');
    const daysUntil = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntil > 0) {
        log(`⏳ ${daysUntil} days until NHL resumes (Feb 26, 2026)`, COLORS.yellow);
        log('Running preliminary check anyway...\n', COLORS.yellow);
    } else if (daysUntil === 0) {
        log('🎉 TODAY IS THE DAY! NHL resumes from Olympic Break!', COLORS.green);
    } else {
        log(`✅ NHL has been back for ${Math.abs(daysUntil)} days`, COLORS.green);
    }

    // Run the check
    const result = await runQuickCheck();

    console.log('\n' + '-'.repeat(60));
    console.log('Test Summary:');

    if (result.specialEvent) {
        console.log(`  Status: ${COLORS.yellow}Not ready - ${result.reason}${COLORS.reset}`);
        console.log('  Action: Run this test again on Feb 26 or later');
    } else if (result.waiting) {
        console.log(`  Status: ${COLORS.yellow}Waiting for games to go FINAL${COLORS.reset}`);
        console.log('  Action: Run with --monitor to watch for game completions');
    } else if (result.passed) {
        console.log(`  Status: ${COLORS.green}✅ PASSED - Filtering working correctly!${COLORS.reset}`);
        console.log(`  Completed Teams: ${result.completedTeams.join(', ')}`);
        console.log(`  Props Leaked: ${result.propsFromCompleted}`);
    } else {
        console.log(`  Status: ${COLORS.red}❌ FAILED - Props from completed teams found!${COLORS.reset}`);
        console.log(`  Action: Check filterCompletedGameProps() in server.js`);
    }

    console.log('-'.repeat(60) + '\n');
}

// Main
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
NHL Filter Test Script
======================

Tests the completed games filtering when NHL resumes from Olympic Break.

Usage:
  node scripts/testNHLFilter.js              Run full test suite
  node scripts/testNHLFilter.js --check      Quick status check
  node scripts/testNHLFilter.js --monitor    Monitor mode (refresh every 2 min)
  node scripts/testNHLFilter.js --monitor --interval=60  Custom interval (seconds)

Scheduled for: February 26, 2026 (NHL resumes)
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
