#!/usr/bin/env node
/**
 * Automated Daily NBA Standings Update Script
 *
 * This script fetches the latest NBA standings from ESPN and updates
 * the NBA_TEAM_RECORDS constant in server.js
 *
 * Usage:
 *   node scripts/updateStandings.js
 *
 * Can be scheduled via cron:
 *   0 6 * * * cd /path/to/sports-betting-ai && node scripts/updateStandings.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SERVER_FILE = path.join(__dirname, '..', 'server.js');
const ESPN_STANDINGS_URL = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings';

// Fetch JSON from URL
function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Failed to parse JSON: ${e.message}`));
                }
            });
        }).on('error', reject);
    });
}

// Parse ESPN standings data
function parseStandings(data) {
    const teams = {};

    for (const conf of data.children || []) {
        for (const entry of conf.standings?.entries || []) {
            const team = entry.team || {};
            const abbr = team.abbreviation || '';

            const stats = {};
            for (const stat of entry.stats || []) {
                stats[stat.name] = stat.value || 0;
            }

            const wins = Math.round(stats.wins || 0);
            const losses = Math.round(stats.losses || 0);
            const winPct = parseFloat((stats.winPercent || 0).toFixed(3));

            teams[abbr] = { wins, losses, winPct };
        }
    }

    return teams;
}

// Generate the NBA_TEAM_RECORDS code block
function generateRecordsCode(teams, date) {
    // Sort by win percentage descending
    const sorted = Object.entries(teams).sort((a, b) => b[1].winPct - a[1].winPct);

    // Abbreviation mappings for compatibility
    const altAbbrs = {
        'SA': 'SAS',
        'NY': 'NYK',
        'GS': 'GSW',
        'NO': 'NOP',
        'UTAH': 'UTA'
    };

    let code = `// NBA Team Records - 2025-26 Season (LIVE from ESPN - Updated ${date})\n`;
    code += `// Used for blowout risk calculation - starters may sit early in lopsided games\n`;
    code += `// Format: { wins, losses, winPct }\n`;
    code += `const NBA_TEAM_RECORDS = {\n`;

    for (const [abbr, record] of sorted) {
        const comment = getTeamComment(abbr, record, sorted);
        code += `    '${abbr}': { wins: ${record.wins}, losses: ${record.losses}, winPct: ${record.winPct.toFixed(3)} },${comment}\n`;

        // Add alternate abbreviation if exists
        const altAbbr = Object.entries(altAbbrs).find(([alt, main]) => alt === abbr || main === abbr);
        if (altAbbr) {
            const [alt, main] = altAbbr;
            const otherAbbr = abbr === alt ? main : alt;
            if (!teams[otherAbbr]) {
                code += `    '${otherAbbr}': { wins: ${record.wins}, losses: ${record.losses}, winPct: ${record.winPct.toFixed(3)} },  // Alt abbreviation\n`;
            }
        }
    }

    code += `};`;

    return code;
}

// Get comment for team based on ranking
function getTeamComment(abbr, record, sorted) {
    const rank = sorted.findIndex(([a]) => a === abbr) + 1;

    if (rank === 1) return '  // #1 Overall';
    if (rank === 2) return '  // #2 Overall';
    if (rank <= 3) return '  // Top 3';
    if (abbr === 'DET' && record.winPct > 0.6) return '  // Breakout year!';
    if (abbr === 'SA' || abbr === 'SAS') return '  // Wemby effect';
    if (abbr === 'MIL' && record.winPct < 0.5) return '  // Struggling this year';
    if (abbr === 'DAL' && record.winPct < 0.4) return '  // Down year';
    if (rank >= sorted.length - 1) return '  // Worst record';
    if (rank >= sorted.length - 5) return '';

    return '';
}

// Update server.js with new standings
function updateServerFile(newRecordsCode) {
    let content = fs.readFileSync(SERVER_FILE, 'utf8');

    // Find the NBA_TEAM_RECORDS block using regex for more reliable matching
    const startMarker = '// NBA Team Records - 2025-26 Season';

    const startIdx = content.indexOf(startMarker);
    if (startIdx === -1) {
        throw new Error('Could not find NBA_TEAM_RECORDS in server.js');
    }

    // Find the closing brace and semicolon of the const declaration
    // We need to find "const NBA_TEAM_RECORDS = {" and its matching "};"
    const constStart = content.indexOf('const NBA_TEAM_RECORDS', startIdx);
    if (constStart === -1) {
        throw new Error('Could not find const NBA_TEAM_RECORDS declaration');
    }

    // Find the opening brace
    const openBrace = content.indexOf('{', constStart);
    if (openBrace === -1) {
        throw new Error('Could not find opening brace of NBA_TEAM_RECORDS');
    }

    // Count braces to find matching close
    let braceCount = 0;
    let endIdx = -1;

    for (let i = openBrace; i < content.length; i++) {
        if (content[i] === '{') {
            braceCount++;
        } else if (content[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
                endIdx = i + 1;
                // Include the semicolon if present
                if (content[endIdx] === ';') endIdx++;
                break;
            }
        }
    }

    if (endIdx === -1) {
        throw new Error('Could not find end of NBA_TEAM_RECORDS object');
    }

    // Replace from startMarker (the comment) to endIdx (end of object)
    const newContent = content.substring(0, startIdx) + newRecordsCode + content.substring(endIdx);

    fs.writeFileSync(SERVER_FILE, newContent, 'utf8');
}

// Main function
async function main() {
    const today = new Date().toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    }).replace(/\//g, '/');

    console.log(`\n🏀 NBA Standings Update - ${today}`);
    console.log('='.repeat(50));

    try {
        // Fetch standings from ESPN
        console.log('\n📡 Fetching standings from ESPN...');
        const data = await fetchJSON(ESPN_STANDINGS_URL);

        // Parse the standings
        const teams = parseStandings(data);
        const teamCount = Object.keys(teams).length;
        console.log(`✅ Fetched ${teamCount} teams`);

        if (teamCount < 25) {
            throw new Error(`Only got ${teamCount} teams, expected 30`);
        }

        // Show top 5 and bottom 5
        const sorted = Object.entries(teams).sort((a, b) => b[1].winPct - a[1].winPct);

        console.log('\n📊 Current Standings:');
        console.log('\nTop 5:');
        for (const [abbr, record] of sorted.slice(0, 5)) {
            console.log(`  ${abbr.padEnd(4)} ${record.wins}-${record.losses} (${(record.winPct * 100).toFixed(1)}%)`);
        }

        console.log('\nBottom 5:');
        for (const [abbr, record] of sorted.slice(-5)) {
            console.log(`  ${abbr.padEnd(4)} ${record.wins}-${record.losses} (${(record.winPct * 100).toFixed(1)}%)`);
        }

        // Generate new code block
        const formattedDate = new Date().toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
        const newRecordsCode = generateRecordsCode(teams, formattedDate);

        // Update server.js
        console.log('\n📝 Updating server.js...');
        updateServerFile(newRecordsCode);
        console.log('✅ server.js updated successfully');

        // Log completion
        console.log('\n' + '='.repeat(50));
        console.log('✅ Standings update complete!');
        console.log('🔄 Restart the server to apply changes:');
        console.log('   pkill -f "node server.js" && node server.js');
        console.log();

    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { fetchJSON, parseStandings, generateRecordsCode, updateServerFile };
