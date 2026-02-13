#!/usr/bin/env node
/**
 * NCAAB Props Alert System
 * 
 * Monitors PrizePicks for CBB props and sends alerts via:
 * - Slack webhook
 * - Email (via local mail command)
 * - macOS notification
 * - Terminal bell
 * 
 * Configuration:
 *   Set environment variables or edit config below:
 *   - SLACK_WEBHOOK_URL: Your Slack incoming webhook URL
 *   - ALERT_EMAIL: Email address for notifications
 * 
 * Usage:
 *   node scripts/alertNCAAB.js                    # Check once and alert if props found
 *   node scripts/alertNCAAB.js --watch            # Continuous monitoring (every 5 min)
 *   node scripts/alertNCAAB.js --watch --interval=2  # Check every 2 minutes
 *   node scripts/alertNCAAB.js --test             # Test all alert channels
 */

const https = require('https');
const { exec } = require('child_process');

// =====================================================
// CONFIGURATION - Edit these or set environment variables
// =====================================================

const CONFIG = {
    // Slack webhook URL (get from: https://api.slack.com/messaging/webhooks)
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    
    // Email for alerts (uses local mail command)
    alertEmail: process.env.ALERT_EMAIL || '',
    
    // Enable/disable alert channels
    enableSlack: true,
    enableEmail: true,
    enableMacNotification: true,
    enableTerminalBell: true,
    
    // PrizePicks CBB league ID
    prizePicksCBBUrl: 'https://api.prizepicks.com/projections?league_id=7',
    
    // State file to track if we've already alerted
    stateFile: '/tmp/ncaab_props_alerted.txt'
};

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

// =====================================================
// ALERT FUNCTIONS
// =====================================================

function sendSlackAlert(message, propsCount) {
    return new Promise((resolve, reject) => {
        if (!CONFIG.slackWebhookUrl) {
            log('⚠️ Slack webhook not configured', COLORS.yellow);
            resolve(false);
            return;
        }

        const payload = JSON.stringify({
            text: `🏀 *NCAAB Props Alert!*`,
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: '🏀 NCAAB Props Now Available!',
                        emoji: true
                    }
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*${propsCount} CBB props* just released on PrizePicks!\n\n${message}`
                    }
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: `*Time:*\n${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Source:*\nPrizePicks CBB`
                        }
                    ]
                },
                {
                    type: 'actions',
                    elements: [
                        {
                            type: 'button',
                            text: {
                                type: 'plain_text',
                                text: '🎯 View Props',
                                emoji: true
                            },
                            url: 'https://betgenius-ai.onrender.com',
                            style: 'primary'
                        }
                    ]
                }
            ]
        });

        const url = new URL(CONFIG.slackWebhookUrl);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            if (res.statusCode === 200) {
                log('✅ Slack alert sent!', COLORS.green);
                resolve(true);
            } else {
                log(`❌ Slack error: ${res.statusCode}`, COLORS.red);
                resolve(false);
            }
        });

        req.on('error', (e) => {
            log(`❌ Slack error: ${e.message}`, COLORS.red);
            resolve(false);
        });

        req.write(payload);
        req.end();
    });
}

function sendEmailAlert(message, propsCount) {
    return new Promise((resolve) => {
        if (!CONFIG.alertEmail) {
            log('⚠️ Alert email not configured', COLORS.yellow);
            resolve(false);
            return;
        }

        const subject = `🏀 NCAAB Props Alert: ${propsCount} CBB Props Available!`;
        const body = `
NCAAB Props Now Available!
==========================

${propsCount} CBB props just released on PrizePicks!

${message}

Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST

View props at: https://betgenius-ai.onrender.com

---
BetGenius AI Alert System
`;

        // Use macOS mail command
        const cmd = `echo "${body.replace(/"/g, '\\"')}" | mail -s "${subject}" ${CONFIG.alertEmail}`;
        
        exec(cmd, (error) => {
            if (error) {
                log(`⚠️ Email failed (mail command not available): ${error.message}`, COLORS.yellow);
                resolve(false);
            } else {
                log('✅ Email alert sent!', COLORS.green);
                resolve(true);
            }
        });
    });
}

function sendMacNotification(title, message) {
    return new Promise((resolve) => {
        if (!CONFIG.enableMacNotification) {
            resolve(false);
            return;
        }

        const script = `display notification "${message.replace(/"/g, '\\"')}" with title "${title}" sound name "Glass"`;
        
        exec(`osascript -e '${script}'`, (error) => {
            if (error) {
                log(`⚠️ macOS notification failed: ${error.message}`, COLORS.yellow);
                resolve(false);
            } else {
                log('✅ macOS notification sent!', COLORS.green);
                resolve(true);
            }
        });
    });
}

function playTerminalBell() {
    if (CONFIG.enableTerminalBell) {
        // Play bell multiple times for attention
        process.stdout.write('\x07\x07\x07');
    }
}

// =====================================================
// PRIZEPICKS CHECK
// =====================================================

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
        const data = await fetchJSON(CONFIG.prizePicksCBBUrl);
        const projections = data.data || [];
        
        if (projections.length === 0) {
            return { available: false, count: 0, props: [] };
        }
        
        const props = projections.slice(0, 10).map(p => {
            const attrs = p.attributes || {};
            return {
                player: attrs.name,
                line: attrs.line_score,
                stat: attrs.stat_type,
                team: attrs.team_name || 'Unknown'
            };
        });
        
        return { available: true, count: projections.length, props };
    } catch (e) {
        return { available: false, error: e.message, count: 0, props: [] };
    }
}

// =====================================================
// STATE MANAGEMENT (prevent duplicate alerts)
// =====================================================

const fs = require('fs');

function hasAlreadyAlerted() {
    try {
        if (fs.existsSync(CONFIG.stateFile)) {
            const content = fs.readFileSync(CONFIG.stateFile, 'utf8');
            const alertedDate = content.trim();
            const today = new Date().toISOString().split('T')[0];
            return alertedDate === today;
        }
    } catch (e) {
        // Ignore errors
    }
    return false;
}

function markAsAlerted() {
    try {
        const today = new Date().toISOString().split('T')[0];
        fs.writeFileSync(CONFIG.stateFile, today);
    } catch (e) {
        log(`⚠️ Could not save alert state: ${e.message}`, COLORS.yellow);
    }
}

function resetAlertState() {
    try {
        if (fs.existsSync(CONFIG.stateFile)) {
            fs.unlinkSync(CONFIG.stateFile);
        }
    } catch (e) {
        // Ignore
    }
}

// =====================================================
// MAIN FUNCTIONS
// =====================================================

async function sendAllAlerts(propsCount, props) {
    const propsMessage = props.slice(0, 5).map(p => 
        `• ${p.player} (${p.team}): ${p.line} ${p.stat}`
    ).join('\n');
    
    const message = `Sample props:\n${propsMessage}\n\n...and ${Math.max(0, propsCount - 5)} more!`;
    
    // Send all alerts in parallel
    const results = await Promise.all([
        sendSlackAlert(message, propsCount),
        sendEmailAlert(message, propsCount),
        sendMacNotification('🏀 NCAAB Props Available!', `${propsCount} CBB props just released!`)
    ]);
    
    playTerminalBell();
    
    return results.some(r => r);
}

async function runCheck() {
    console.log('\n' + '═'.repeat(60));
    log('🏀 NCAAB PROPS ALERT CHECK', COLORS.bold + COLORS.cyan);
    console.log('═'.repeat(60) + '\n');
    
    // Check PrizePicks
    log('Checking PrizePicks CBB...', COLORS.blue);
    const pp = await checkPrizePicks();
    
    if (pp.error) {
        log(`❌ Error: ${pp.error}`, COLORS.red);
        return { alerted: false };
    }
    
    if (!pp.available) {
        log('⏳ No CBB props yet', COLORS.yellow);
        console.log('   Props typically release 1-3 hours before tip-off\n');
        return { alerted: false };
    }
    
    // Props are available!
    log(`🎉 ${pp.count} CBB PROPS AVAILABLE!`, COLORS.bold + COLORS.green);
    
    console.log(`\n${COLORS.green}Sample props:${COLORS.reset}`);
    pp.props.slice(0, 8).forEach(p => {
        console.log(`  • ${p.player} (${p.team}): ${p.line} ${p.stat}`);
    });
    
    // Check if we've already alerted today
    if (hasAlreadyAlerted()) {
        log('\n✅ Already sent alerts today (skipping duplicate)', COLORS.yellow);
        return { alerted: false, alreadySent: true };
    }
    
    // Send alerts
    console.log(`\n${COLORS.cyan}Sending alerts...${COLORS.reset}`);
    const alertSent = await sendAllAlerts(pp.count, pp.props);
    
    if (alertSent) {
        markAsAlerted();
    }
    
    console.log('─'.repeat(60) + '\n');
    
    return { alerted: alertSent, propsCount: pp.count };
}

async function runWatchMode(intervalMin = 5) {
    console.log('\n' + '═'.repeat(60));
    log('🏀 NCAAB PROPS ALERT - WATCH MODE', COLORS.bold + COLORS.cyan);
    log(`   Checking every ${intervalMin} minutes. Press Ctrl+C to stop.`, COLORS.cyan);
    console.log('═'.repeat(60) + '\n');
    
    // Show configuration status
    console.log(`${COLORS.blue}Alert Configuration:${COLORS.reset}`);
    console.log(`  Slack: ${CONFIG.slackWebhookUrl ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`  Email: ${CONFIG.alertEmail ? '✅ ' + CONFIG.alertEmail : '❌ Not configured'}`);
    console.log(`  macOS: ✅ Enabled`);
    console.log(`  Bell:  ✅ Enabled\n`);
    
    const check = async () => {
        const result = await runCheck();
        
        if (result.alerted) {
            console.log('\n' + '🎉'.repeat(20));
            log('ALERTS SENT! CBB props are now available!', COLORS.bold + COLORS.green);
            console.log('🎉'.repeat(20) + '\n');
        }
    };
    
    await check();
    setInterval(check, intervalMin * 60 * 1000);
}

async function testAlerts() {
    console.log('\n' + '═'.repeat(60));
    log('🧪 TESTING ALERT CHANNELS', COLORS.bold + COLORS.cyan);
    console.log('═'.repeat(60) + '\n');
    
    const testProps = [
        { player: 'Test Player 1', team: 'Wisconsin', line: '18.5', stat: 'Points' },
        { player: 'Test Player 2', team: 'Michigan State', line: '6.5', stat: 'Rebounds' },
        { player: 'Test Player 3', team: 'Loyola', line: '4.5', stat: 'Assists' }
    ];
    
    console.log(`${COLORS.blue}Testing all alert channels...${COLORS.reset}\n`);
    
    // Test Slack
    console.log('1. Testing Slack webhook...');
    await sendSlackAlert('This is a test alert from BetGenius AI', 42);
    
    // Test Email
    console.log('\n2. Testing Email...');
    await sendEmailAlert('This is a test alert from BetGenius AI', 42);
    
    // Test macOS notification
    console.log('\n3. Testing macOS notification...');
    await sendMacNotification('🧪 Test Alert', 'This is a test notification from BetGenius AI');
    
    // Test terminal bell
    console.log('\n4. Testing terminal bell...');
    playTerminalBell();
    log('Bell played!', COLORS.green);
    
    console.log('\n' + '─'.repeat(60));
    console.log(`${COLORS.green}Test complete! Check each channel for notifications.${COLORS.reset}\n`);
}

// =====================================================
// CLI
// =====================================================

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
NCAAB Props Alert System
=========================

Monitors PrizePicks for CBB props and sends alerts.

Usage:
  node scripts/alertNCAAB.js              Check once and alert if found
  node scripts/alertNCAAB.js --watch      Monitor continuously (every 5 min)
  node scripts/alertNCAAB.js --watch --interval=2   Every 2 minutes
  node scripts/alertNCAAB.js --test       Test all alert channels
  node scripts/alertNCAAB.js --reset      Reset alert state (allow re-alerting)

Configuration (environment variables):
  SLACK_WEBHOOK_URL   Slack incoming webhook URL
  ALERT_EMAIL         Email address for notifications

Example:
  export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/xxx/yyy/zzz"
  export ALERT_EMAIL="your@email.com"
  node scripts/alertNCAAB.js --watch
`);
    process.exit(0);
}

if (args.includes('--test') || args.includes('-t')) {
    testAlerts().catch(console.error);
} else if (args.includes('--reset')) {
    resetAlertState();
    log('Alert state reset - will alert again on next props detection', COLORS.green);
    process.exit(0);
} else if (args.includes('--watch') || args.includes('-w')) {
    const intervalArg = args.find(a => a.startsWith('--interval='));
    const interval = intervalArg ? parseInt(intervalArg.split('=')[1]) : 5;
    runWatchMode(interval).catch(console.error);
} else {
    runCheck().then(() => process.exit(0)).catch(e => {
        console.error(e);
        process.exit(1);
    });
}
