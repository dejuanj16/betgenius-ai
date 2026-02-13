#!/usr/bin/env node
/**
 * NCAAB Props Monitor - February 13, 2026
 * 
 * Monitors PrizePicks for CBB (College Basketball) props before tonight's games.
 * 
 * Tonight's Games:
 *   - Michigan State @ Wisconsin - 8:00 PM EST
 *   - Saint Louis @ Loyola Chicago - 8:30 PM EST  
 *   - Ohio @ Miami (OH) - 9:00 PM EST
 * 
 * Usage:
 *   node scripts/monitorNCAAB.js              # Check once
 *   node scripts/monitorNCAAB.js --watch      # Monitor every 15 min
 *   node scripts/monitorNCAAB.js --watch --interval=5  # Every 5 min
 */

const https = require('https');

const PRIZEPICKS_CBB_URL = 'https://api.prizepicks.com/projections?league_id=7';
const BETGENIUS_API = 'https://betgenius-ai.onrender.com/api/props/ncaab';

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

const TONIGHT_GAMES = [
    { away: 'Michigan State', home: 'Wisconsin', time: '8:00 PM EST', abbr: ['MSU', 'WIS'] },
    { away: 'Saint Louis', home: 'Loyola Chicago', time: '8:30 PM EST', abbr: ['SLU', 'LUC'] },
    { away: 'Ohio', home: 'Miami (OH)', time: '9:00 PM EST', abbr: ['OHIO', 'M-OH'] }
];

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

async function checkPrizePicks() {
    try {
        const data = await fetchJSON(PRIZEPICKS_CBB_URL);
        const projections = data.data || [];
        
        if (projections.length === 0) {
            return { available: false, count: 0, props: [] };
        }
        
        // Parse props
        const props = projections.map(p => {
            const attrs = p.attributes || {};
            return {
                player: attrs.name,
                line: attrs.line_score,
                stat: attrs.stat_type,
                team: attrs.team_name || 'Unknown'
            };
        });
        
        // Check for tonight's games
        const tonightTeams = TONIGHT_GAMES.flatMap(g => [g.away.toLowerCase(), g.home.toLowerCase()]);
        const tonightProps = props.filter(p => 
            tonightTeams.some(team => (p.team || '').toLowerCase().includes(team))
        );
        
        return { 
            available: true, 
            count: projections.length, 
            props: props,
            tonightProps: tonightProps
        };
    } catch (e) {
        return { available: false, error: e.message, count: 0, props: [] };
    }
}

async function checkBetGeniusAPI() {
    try {
        const data = await fetchJSON(BETGENIUS_API);
        return {
            source: data.source,
            propsCount: data.propsCount || 0,
            note: data.note
        };
    } catch (e) {
        return { error: e.message };
    }
}

async function runCheck() {
    console.log('\n' + '═'.repeat(65));
    log('🏀 NCAAB PROPS MONITOR', COLORS.bold + COLORS.cyan);
    console.log('═'.repeat(65));
    
    // Show tonight's games
    console.log(`\n${COLORS.yellow}Tonight's Games:${COLORS.reset}`);
    TONIGHT_GAMES.forEach(g => {
        console.log(`  🏀 ${g.away} @ ${g.home} - ${g.time}`);
    });
    
    // Check PrizePicks
    console.log(`\n${COLORS.blue}Checking PrizePicks CBB...${COLORS.reset}`);
    const pp = await checkPrizePicks();
    
    if (pp.error) {
        log(`❌ PrizePicks Error: ${pp.error}`, COLORS.red);
    } else if (pp.available) {
        log(`✅ PrizePicks CBB Props: ${pp.count} available!`, COLORS.green);
        
        if (pp.tonightProps && pp.tonightProps.length > 0) {
            console.log(`\n${COLORS.green}Props for Tonight's Games:${COLORS.reset}`);
            pp.tonightProps.slice(0, 10).forEach(p => {
                console.log(`  • ${p.player} (${p.team}): ${p.line} ${p.stat}`);
            });
        }
        
        console.log(`\n${COLORS.cyan}Sample Props:${COLORS.reset}`);
        pp.props.slice(0, 8).forEach(p => {
            console.log(`  • ${p.player}: ${p.line} ${p.stat}`);
        });
    } else {
        log(`⏳ No CBB props yet - PrizePicks hasn't released them`, COLORS.yellow);
        console.log(`   Props typically release 1-3 hours before tip-off`);
    }
    
    // Check BetGenius API
    console.log(`\n${COLORS.blue}Checking BetGenius API...${COLORS.reset}`);
    const bg = await checkBetGeniusAPI();
    
    if (bg.error) {
        log(`❌ BetGenius Error: ${bg.error}`, COLORS.red);
    } else {
        console.log(`  Source: ${bg.source}`);
        console.log(`  Props: ${bg.propsCount}`);
        if (bg.note) {
            console.log(`  Note: ${bg.note}`);
        }
    }
    
    // Time until first game
    const now = new Date();
    const firstGame = new Date('2026-02-14T01:00:00Z'); // 8 PM EST = 01:00 UTC next day
    const hoursUntil = (firstGame - now) / (1000 * 60 * 60);
    
    console.log(`\n${COLORS.magenta}⏰ Time until first tip-off: ${hoursUntil.toFixed(1)} hours${COLORS.reset}`);
    
    if (hoursUntil <= 3 && !pp.available) {
        log(`⚠️ Props usually release by now - keep monitoring!`, COLORS.yellow);
    }
    
    console.log('─'.repeat(65) + '\n');
    
    return { prizepicks: pp, betgenius: bg };
}

async function runWatchMode(intervalMin = 15) {
    console.log('\n' + '═'.repeat(65));
    log(`🏀 NCAAB PROPS MONITOR - WATCH MODE`, COLORS.bold + COLORS.cyan);
    log(`   Checking every ${intervalMin} minutes. Press Ctrl+C to stop.`, COLORS.cyan);
    console.log('═'.repeat(65));
    
    let propsFound = false;
    
    const check = async () => {
        const result = await runCheck();
        
        if (result.prizepicks.available && !propsFound) {
            propsFound = true;
            console.log('\n' + '🎉'.repeat(20));
            log(`CBB PROPS ARE NOW AVAILABLE! ${result.prizepicks.count} props found!`, COLORS.bold + COLORS.green);
            console.log('🎉'.repeat(20) + '\n');
            
            // Play alert sound (terminal bell)
            process.stdout.write('\x07');
        }
    };
    
    await check();
    setInterval(check, intervalMin * 60 * 1000);
}

// Main
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
NCAAB Props Monitor
====================

Monitors PrizePicks for CBB props before tonight's games.

Usage:
  node scripts/monitorNCAAB.js              Check once
  node scripts/monitorNCAAB.js --watch      Monitor every 15 min
  node scripts/monitorNCAAB.js --watch --interval=5  Every 5 min

Tonight's Games (Feb 13, 2026):
  • Michigan State @ Wisconsin - 8:00 PM EST
  • Saint Louis @ Loyola Chicago - 8:30 PM EST
  • Ohio @ Miami (OH) - 9:00 PM EST
`);
    process.exit(0);
}

if (args.includes('--watch') || args.includes('-w')) {
    const intervalArg = args.find(a => a.startsWith('--interval='));
    const interval = intervalArg ? parseInt(intervalArg.split('=')[1]) : 15;
    runWatchMode(interval).catch(console.error);
} else {
    runCheck().then(() => process.exit(0)).catch(e => {
        console.error(e);
        process.exit(1);
    });
}
