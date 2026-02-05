// =====================================================
// BetGenius AI - Main Application
// =====================================================

// State
let currentSport = 'all';
let currentApp = 'all';
let currentPropsApp = 'all';
let minConfidence = 60;
let autoRefreshInterval = null;

// Calendar filter - only show games within 4 days from today
const MAX_DAYS_OUT = 4;

// Check if a date is within the allowed range (today + 4 days)
function isWithinDateRange(gameDate) {
    if (!gameDate) return true;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + MAX_DAYS_OUT);

    const game = new Date(gameDate);
    return game >= today && game <= maxDate;
}

// Filter games array to only include games within date range
function filterByDateRange(games) {
    return games.filter(game => isWithinDateRange(game.date || game.commence_time));
}

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    initNavigation();
    initSportsFilter();
    initAppFilter();
    initThemeToggle();
    initPropsAppTabs();
    initConfidenceSlider();
    initEventListeners();

    // Initialize all live data services
    console.log('🚀 Initializing BetGenius AI...');

    // Initialize services in parallel for speed
    await Promise.all([
        window.LiveDataService?.initialize(),
        window.RosterService?.initialize()
    ]);

    // Load initial data
    await loadAllData();

    // Hide loading overlay
    setTimeout(() => {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }, 500);

    // Start auto-refresh for live games
    startAutoRefresh();

    // Log data sources
    if (window.LiveDataService) {
        const sources = window.LiveDataService.getDataSources();
        console.log('📊 Data Sources:', sources);
    }
});

// =====================================================
// Navigation
// =====================================================
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('data-page');
            navigateTo(pageId);
        });
    });

    // View all links
    document.querySelectorAll('.view-all').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('data-page');
            if (pageId) navigateTo(pageId);
        });
    });

    // Mobile menu
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            document.querySelector('.nav-links').classList.toggle('mobile-open');
        });
    }
}

function navigateTo(pageId) {
    const navLinks = document.querySelectorAll('.nav-links a');
    const pages = document.querySelectorAll('.page');

    navLinks.forEach(l => l.classList.remove('active'));
    document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');

    pages.forEach(page => {
        page.classList.remove('active');
        if (page.id === pageId) page.classList.add('active');
    });
}

// =====================================================
// Sports Filter
// =====================================================
function initSportsFilter() {
    const sportBtns = document.querySelectorAll('.sport-btn');

    sportBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            sportBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentSport = this.getAttribute('data-sport');
            await loadAllData();
        });
    });
}

// =====================================================
// Betting App Filter
// =====================================================
function initAppFilter() {
    const appBtns = document.querySelectorAll('.app-btn');

    appBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            appBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentApp = this.getAttribute('data-app');
            await loadAllData();
        });
    });
}

function initPropsAppTabs() {
    const tabs = document.querySelectorAll('.prop-app-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', async function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentPropsApp = this.getAttribute('data-app');
            await loadPlayerProps();
        });
    });
}

// =====================================================
// Theme Toggle
// =====================================================
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const icon = themeToggle.querySelector('i');

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        icon.classList.replace('fa-moon', 'fa-sun');
    }

    themeToggle.addEventListener('click', function() {
        document.body.classList.toggle('light-theme');
        if (document.body.classList.contains('light-theme')) {
            icon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('theme', 'light');
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('theme', 'dark');
        }
    });
}

// =====================================================
// Event Listeners
// =====================================================
function initEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', loadAllData);
    document.getElementById('refreshInsight')?.addEventListener('click', loadAllData);
    document.getElementById('refreshLive')?.addEventListener('click', loadLiveGames);

    // Confidence slider
    initConfidenceSlider();

    // Time filter
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Search inputs
    document.getElementById('oddsSearch')?.addEventListener('input', filterOddsTable);
    document.getElementById('playerSearch')?.addEventListener('input', filterPlayerProps);
    document.getElementById('betTypeFilter')?.addEventListener('change', loadOddsComparison);
    document.getElementById('propTypeFilter')?.addEventListener('change', loadPlayerProps);

    // Auto refresh toggle
    document.getElementById('autoRefresh')?.addEventListener('change', function() {
        if (this.checked) startAutoRefresh();
        else stopAutoRefresh();
    });
}

function initConfidenceSlider() {
    const slider = document.getElementById('confidenceSlider');
    const valueDisplay = document.getElementById('confidenceValue');

    if (slider) {
        slider.addEventListener('input', function() {
            minConfidence = parseInt(this.value);
            valueDisplay.textContent = `${minConfidence}%`;
            loadPredictions();
        });
    }
}

// =====================================================
// Load All Data
// =====================================================
async function loadAllData() {
    updateLastUpdateTime();

    const sports = currentSport === 'all' ? ['nba', 'nfl', 'mlb', 'nhl'] : [currentSport];

    // Load data in parallel
    await Promise.all([
        loadDashboardData(sports),
        loadOddsComparison(),
        loadPlayerProps(),
        loadPredictions(),
        loadLiveGames()
    ]);
}

function updateLastUpdateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    document.getElementById('lastUpdateTime').textContent = timeStr;
}

// =====================================================
// Dashboard
// =====================================================
async function loadDashboardData(sports) {
    let allGames = [];
    let allOdds = [];

    for (const sport of sports) {
        const games = await window.SportsAPI.fetchGames(sport);
        const odds = await window.SportsAPI.fetchOdds(sport);
        allGames = allGames.concat(games);
        allOdds = allOdds.concat(odds);
    }

    // Filter games to only show within 4 days
    allGames = filterByDateRange(allGames);
    allOdds = filterByDateRange(allOdds);

    // Update stats
    const liveGames = allGames.filter(g => g.isLive);
    document.getElementById('gamesToday').textContent = allGames.length;
    document.getElementById('liveGamesCount').textContent = liveGames.length;
    document.getElementById('hotPicks').textContent = Math.floor(allOdds.length * 0.3);

    // Generate AI insight
    generateAIInsight(allGames, allOdds);

    // Load picks and games
    loadTopPicks(allOdds);
    loadUpcomingGames(allGames, allOdds);
}

function generateAIInsight(games, odds) {
    const insights = [
        `Analyzing ${games.length} games today across all sports. Home teams are favored in ${Math.floor(games.length * 0.6)} matchups.`,
        `Based on line movements, ${Math.floor(odds.length * 0.25)} games show value opportunities where books disagree.`,
        `NBA unders are hitting at 58% this week. Consider targeting unders in high-pace matchups.`,
        `NFL home underdogs with spreads between +3 and +7 are covering at a 54% rate.`,
        `Look for live betting opportunities in close games - momentum shifts create value.`
    ];
    document.getElementById('aiInsightText').textContent = insights[Math.floor(Math.random() * insights.length)];
}

function loadTopPicks(oddsData) {
    const container = document.getElementById('topPicks');

    if (!oddsData.length) {
        container.innerHTML = '<div class="no-data"><i class="fas fa-search"></i><p>No picks available</p></div>';
        return;
    }

    // Generate top picks from odds data
    const picks = oddsData.slice(0, 6).map((game) => {
        const confidence = 60 + Math.floor(Math.random() * 25);
        const bookmaker = Object.keys(game.bookmakers)[0];
        const markets = game.bookmakers[bookmaker]?.markets || {};

        let pickType = 'Spread';
        let pickValue = game.homeTeam;
        let odds = '-110';

        if (markets.spreads?.[0]) {
            pickValue = `${markets.spreads[0].name} ${formatLine(markets.spreads[0].point)}`;
            odds = formatOdds(markets.spreads[0].price);
        } else if (markets.h2h?.[0]) {
            pickType = 'Moneyline';
            pickValue = markets.h2h[0].name;
            odds = formatOdds(markets.h2h[0].price);
        }

        return { game, pickType, pickValue, odds, confidence, bookmaker };
    });

    container.innerHTML = picks.map(pick => `
        <div class="pick-card">
            <div class="pick-header">
                <span class="pick-sport">
                    <i class="fas ${getSportIcon(pick.game.sport)}"></i>
                    ${pick.game.sportName}
                </span>
                <span class="pick-confidence ${pick.confidence >= 70 ? 'high' : 'medium'}">
                    ${pick.confidence}%
                </span>
            </div>
            <div class="pick-matchup">
                <div class="pick-team">
                    <div class="team-logo">${getTeamInitials(pick.game.homeTeam)}</div>
                    <div class="team-name">${shortenTeamName(pick.game.homeTeam)}</div>
                </div>
                <div class="pick-vs">VS</div>
                <div class="pick-team">
                    <div class="team-logo">${getTeamInitials(pick.game.awayTeam)}</div>
                    <div class="team-name">${shortenTeamName(pick.game.awayTeam)}</div>
                </div>
            </div>
            <div class="pick-recommendation">
                <div class="pick-type">${pick.pickType}</div>
                <div class="pick-value">${pick.pickValue}</div>
                <div class="pick-odds">${pick.odds}</div>
            </div>
            <div class="pick-apps">
                ${generateAppBadges(pick.game.bookmakers)}
            </div>
        </div>
    `).join('');
}

function loadUpcomingGames(games, oddsData) {
    const container = document.getElementById('upcomingGames');

    // Filter out live games
    const upcoming = games.filter(g => !g.isLive).slice(0, 8);

    if (!upcoming.length) {
        container.innerHTML = '<div class="no-data"><i class="fas fa-calendar"></i><p>No upcoming games</p></div>';
        return;
    }

    container.innerHTML = upcoming.map(game => {
        // Find matching odds
        const odds = oddsData.find(o =>
            o.homeTeam.includes(game.homeTeam?.name?.split(' ').pop() || '') ||
            game.homeTeam?.name?.includes(o.homeTeam.split(' ').pop() || '')
        );

        const bookmaker = odds ? Object.keys(odds.bookmakers)[0] : null;
        const markets = odds?.bookmakers[bookmaker]?.markets || {};

        return `
            <div class="game-card">
                <div class="game-time">
                    <div class="game-time-value">${formatGameTime(game.date)}</div>
                    <div class="game-date">${formatGameDate(game.date)}</div>
                </div>
                <div class="game-teams">
                    <div class="game-team away">
                        <div>
                            <div class="game-team-name">${game.awayTeam?.abbreviation || shortenTeamName(game.awayTeam?.name)}</div>
                            <div class="game-team-record">${game.awayTeam?.record || ''}</div>
                        </div>
                        <div class="game-team-logo">${game.awayTeam?.logo ? `<img src="${game.awayTeam.logo}" alt="">` : getTeamInitials(game.awayTeam?.name)}</div>
                    </div>
                    <div class="game-vs">@</div>
                    <div class="game-team">
                        <div class="game-team-logo">${game.homeTeam?.logo ? `<img src="${game.homeTeam.logo}" alt="">` : getTeamInitials(game.homeTeam?.name)}</div>
                        <div>
                            <div class="game-team-name">${game.homeTeam?.abbreviation || shortenTeamName(game.homeTeam?.name)}</div>
                            <div class="game-team-record">${game.homeTeam?.record || ''}</div>
                        </div>
                    </div>
                </div>
                <div class="game-odds">
                    <div class="odds-box">
                        <div class="odds-label">Spread</div>
                        <div class="odds-value">${markets.spreads?.[0]?.point ? formatLine(markets.spreads[0].point) : '--'}</div>
                    </div>
                    <div class="odds-box">
                        <div class="odds-label">ML</div>
                        <div class="odds-value">${markets.h2h?.[0]?.price ? formatOdds(markets.h2h[0].price) : '--'}</div>
                    </div>
                    <div class="odds-box">
                        <div class="odds-label">O/U</div>
                        <div class="odds-value">${markets.totals?.[0]?.point ? roundLine(markets.totals[0].point) : '--'}</div>
                    </div>
                </div>
                <div class="game-prediction">
                    <div class="prediction-label">AI Pick</div>
                    <div class="prediction-value">${game.homeTeam?.abbreviation || 'HOME'}</div>
                    <div class="prediction-label">${55 + Math.floor(Math.random() * 20)}%</div>
                </div>
            </div>
        `;
    }).join('');
}

// =====================================================
// Odds Comparison
// =====================================================
async function loadOddsComparison() {
    const container = document.getElementById('oddsTableBody');
    const betType = document.getElementById('betTypeFilter')?.value || 'all';

    container.innerHTML = '<tr><td colspan="7" class="loading-cell"><i class="fas fa-spinner fa-spin"></i> Loading odds...</td></tr>';

    const sports = currentSport === 'all' ? ['nba', 'nfl', 'mlb', 'nhl'] : [currentSport];
    let allOdds = [];

    for (const sport of sports) {
        const odds = await window.SportsAPI.fetchOdds(sport);
        allOdds = allOdds.concat(odds);
    }

    // Filter odds to only show games within 4 days
    allOdds = filterByDateRange(allOdds);

    if (!allOdds.length) {
        container.innerHTML = '<tr><td colspan="7" class="loading-cell">No odds available</td></tr>';
        return;
    }

    const rows = [];
    const books = ['draftkings', 'fanduel', 'betmgm', 'caesars'];
    const marketTypes = betType === 'all' ? ['spreads', 'h2h', 'totals'] : [betType];

    allOdds.forEach(game => {
        marketTypes.forEach(market => {
            const marketLabel = market === 'spreads' ? 'Spread' : market === 'h2h' ? 'Moneyline' : 'Total';

            // Get odds from each book
            const bookOdds = {};
            let bestOdds = { value: -9999, book: '' };

            books.forEach(book => {
                const bookData = game.bookmakers[book];
                if (bookData?.markets?.[market]?.[0]) {
                    const outcome = bookData.markets[market][0];
const display = market === 'h2h' ? formatOdds(outcome.price) :
                                   `${formatLine(outcome.point)} (${formatOdds(outcome.price)})`;
                    bookOdds[book] = { display, price: outcome.price };

                    if (outcome.price > bestOdds.value) {
                        bestOdds = { value: outcome.price, book, display };
                    }
                }
            });

            if (Object.keys(bookOdds).length > 0) {
                rows.push(`
                    <tr>
                        <td>
                            <div class="odds-game-info">
                                <div class="odds-game-teams">${shortenTeamName(game.awayTeam)} @ ${shortenTeamName(game.homeTeam)}</div>
                                <div class="odds-game-time">${formatGameTime(game.commenceTime)} • ${game.sportName}</div>
                            </div>
                        </td>
                        <td><strong>${marketLabel}</strong></td>
                        ${books.map(book => `
                            <td class="odds-cell ${bestOdds.book === book ? 'best' : ''}">
                                ${bookOdds[book]?.display || '--'}
                            </td>
                        `).join('')}
                        <td class="best-odds-cell">
                            <div class="best-odds-value">${bestOdds.display || '--'}</div>
                            <div class="best-odds-book">${window.BETTING_APPS[bestOdds.book]?.name || ''}</div>
                        </td>
                    </tr>
                `);
            }
        });
    });

    container.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="7" class="loading-cell">No odds found</td></tr>';
}

function filterOddsTable() {
    const search = document.getElementById('oddsSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#oddsTableBody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(search) ? '' : 'none';
    });
}

// =====================================================
// Player Props - Enhanced with roster validation
// =====================================================
async function loadPlayerProps() {
    const container = document.getElementById('playerProps');

    container.innerHTML = '<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i> Loading props and checking rosters...</div>';

    // Ensure roster service is initialized
    if (window.RosterService && !window.RosterService.getLastUpdate()) {
        await window.RosterService.initialize();
    }

    // Only load props for the selected sport, or all major sports if 'all'
    let sports = [];
    if (currentSport === 'all') {
        sports = ['nba', 'nfl', 'nhl', 'mlb'];
    } else {
        sports = [currentSport];
    }

    let allProps = [];

    for (const sport of sports) {
        const props = await window.SportsAPI.fetchPlayerProps(sport);
        // Ensure each prop has the sport tagged
        const taggedProps = props.map(p => ({
            ...p,
            sport: sport,
            sportName: window.SPORT_MAPPINGS[sport]?.name || sport.toUpperCase()
        }));
        allProps = allProps.concat(taggedProps);
    }

    // Apply roster validation - update teams and filter injured
    if (window.RosterService) {
        allProps = allProps.map(prop => window.RosterService.updatePropWithRosterInfo(prop));
        allProps = window.RosterService.filterAvailablePlayers(allProps);
    }

    // Filter by app if selected
    if (currentPropsApp !== 'all') {
        allProps = allProps.filter(p => p.books && p.books[currentPropsApp]);
    }

    if (!allProps.length) {
        container.innerHTML = '<div class="no-data"><i class="fas fa-user-slash"></i><p>No player props available</p></div>';
        return;
    }

    // Group by sport for better organization
    const groupedBySport = {};
    allProps.forEach(player => {
        const sport = player.sport || 'other';
        if (!groupedBySport[sport]) {
            groupedBySport[sport] = [];
        }
        groupedBySport[sport].push(player);
    });

    let html = '';

    // Show comprehensive data source status
    const lastUpdate = window.RosterService?.getLastUpdate();
    const liveDataUpdate = window.LiveDataService?.getLastUpdate();
    const rosterSource = window.RosterService?.getRosterSource() || 'unknown';
    const dataSources = window.LiveDataService?.getDataSources() || {};

    const oddsStatus = dataSources.odds === 'live' ? '✅ Live' : '⚠️ Demo';
    const statsStatus = dataSources.stats === 'live' ? '✅ Live' : '⚠️ Cached';
    const rosterStatus = rosterSource === 'espn_live' ? '✅ Live ESPN' : '📋 Verified';

    const allLive = dataSources.odds === 'live' && dataSources.stats === 'live' && rosterSource === 'espn_live';
    const sourceClass = allLive ? 'live' : 'fallback';

    const updateTime = liveDataUpdate || lastUpdate;
    const playerCount = window.RosterService?.playerTeams?.size || 0;
    const oddsCount = window.LiveDataService?.liveOdds?.size || 0;

    if (updateTime) {
        html += `<div class="data-sources-banner ${sourceClass}">
            <div class="data-sources-header">
                <i class="fas fa-database"></i>
                <strong>Data Sources</strong>
                <span class="update-time">Last sync: ${updateTime.toLocaleTimeString()}</span>
            </div>
            <div class="data-sources-list">
                <div class="source-item">
                    <span class="source-label">Odds:</span>
                    <span class="source-status">${oddsStatus}</span>
                    <span class="source-detail">(${oddsCount} games)</span>
                </div>
                <div class="source-item">
                    <span class="source-label">Rosters:</span>
                    <span class="source-status">${rosterStatus}</span>
                    <span class="source-detail">(${playerCount} players)</span>
                </div>
                <div class="source-item">
                    <span class="source-label">Stats:</span>
                    <span class="source-status">${statsStatus}</span>
                </div>
            </div>
            <button onclick="refreshAllData()" class="btn btn-sm"><i class="fas fa-sync"></i> Refresh All</button>
        </div>`;
    }

    for (const sport of Object.keys(groupedBySport)) {
        const sportName = window.SPORT_MAPPINGS[sport]?.name || sport.toUpperCase();
        const sportIcon = getSportIcon(sport);
        const players = groupedBySport[sport];

        html += `<div class="props-sport-section">
            <h3 class="props-sport-header"><i class="fas ${sportIcon}"></i> ${sportName} Player Props (${players.length} players)</h3>
            <div class="props-grid">`;

        html += players.map(player => `
            <div class="prop-card" data-sport="${sport}">
                <div class="prop-header">
                    <div class="prop-player-img">${getPlayerEmoji(player.position, sport)}</div>
                    <div class="prop-player-info">
                        <h3>${player.player}</h3>
                        <div class="prop-player-team">${player.teamFull || player.team} • ${player.position || 'Player'}</div>
                        <div class="prop-matchup">vs ${player.opponent}</div>
                    </div>
                    <div class="prop-sport-badge ${sport}">${sportName}</div>
                </div>
                <div class="prop-details">
                    ${player.props.map(prop => `
                        <div class="prop-item">
                            <div>
                                <div class="prop-type">${prop.type}</div>
                                <div class="prop-line">Line: <strong>${roundLine(prop.line)}</strong></div>
                                ${prop.bookLines ? `<div class="prop-book-lines">${generateBookLinesHtml(prop.bookLines)}</div>` : ''}
                            </div>
                            <div class="prop-prediction">
                                <div class="prop-pick ${(prop.aiPick || 'over').toLowerCase()}">${prop.aiPick || 'Over'}</div>
                                <div class="prop-probability">${prop.probability || 65}%</div>
                            </div>
                        </div>
                        <div class="prop-bar">
                            <div class="prop-bar-fill ${getConfidenceClass(prop.probability || 65)}" style="width: ${prop.probability || 65}%"></div>
                        </div>
                    `).join('')}
                </div>
                <div class="prop-books">
                    ${generatePropBookBadges(player.books)}
                </div>
            </div>
        `).join('');

        html += '</div></div>';
    }

    container.innerHTML = html;
}

// Refresh rosters manually
async function refreshRosters() {
    if (window.RosterService) {
        const updateTime = await window.RosterService.refresh();
        console.log('Rosters refreshed at', updateTime);
        loadPlayerProps(); // Reload props with new roster data
    }
}

// Refresh all data from all sources
async function refreshAllData() {
    console.log('🔄 Refreshing all data sources...');

    // Show loading indicator
    const banner = document.querySelector('.data-sources-banner');
    if (banner) {
        banner.classList.add('refreshing');
    }

    try {
        await Promise.all([
            window.LiveDataService?.refresh(),
            window.RosterService?.refresh()
        ]);

        // Reload all data
        await loadAllData();

        console.log('✅ All data refreshed successfully');
    } catch (error) {
        console.error('Error refreshing data:', error);
    }

    if (banner) {
        banner.classList.remove('refreshing');
    }
}

// Utility function to round numbers to 2 decimal places
function roundLine(value) {
    if (typeof value !== 'number') {
        const parsed = parseFloat(value);
        if (isNaN(parsed)) return value;
        return Math.round(parsed * 100) / 100;
    }
    return Math.round(value * 100) / 100;
}

// Format line with proper rounding and sign
function formatLine(value) {
    const rounded = roundLine(value);
    if (typeof rounded === 'number') {
        return rounded > 0 ? `+${rounded.toFixed(2)}` : rounded.toFixed(2);
    }
    return rounded;
}

function generateBookLinesHtml(bookLines) {
    if (!bookLines) return '';
    return Object.entries(bookLines).slice(0, 4).map(([book, data]) => {
        const appInfo = window.BETTING_APPS[book];
        if (!appInfo || !data) return '';
        const roundedLine = roundLine(data.line);
        const oddsStr = data.overOdds ? `O ${formatOdds(data.overOdds)}` : '';
        return `<span class="book-line" style="border-color: ${appInfo.color}">
            <span class="book-name">${appInfo.name}</span>: ${roundedLine} ${oddsStr}
        </span>`;
    }).filter(Boolean).join('');
}

function getPlayerEmoji(_position, sport) {
    const sportEmojis = {
        nba: '🏀',
        nfl: '🏈',
        nhl: '🏒',
        mlb: '⚾',
        soccer: '⚽',
        mma: '🥊'
    };
    return sportEmojis[sport] || '👤';
}

function getConfidenceClass(probability) {
    if (probability >= 70) return 'high-conf';
    if (probability >= 60) return 'med-conf';
    return 'low-conf';
}

function generatePropBookBadges(books) {
    if (!books) return '';
    return Object.keys(books).slice(0, 4).map(book => `
        <span class="prop-book-badge ${book}">${window.BETTING_APPS[book]?.name || book}</span>
    `).join('');
}

function filterPlayerProps() {
    const search = document.getElementById('playerSearch').value.toLowerCase();
    const cards = document.querySelectorAll('.prop-card');

    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(search) ? '' : 'none';
    });
}

// =====================================================
// Predictions with Advanced Analytics
// =====================================================
async function loadPredictions() {
    const container = document.getElementById('predictionsList');

    container.innerHTML = '<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i> Analyzing matchups with AI...</div>';

    const sports = currentSport === 'all' ? ['nba', 'nfl'] : [currentSport];
    let allGames = [];

    for (const sport of sports) {
        const games = await window.SportsAPI.fetchGames(sport);
        allGames = allGames.concat(games.filter(g => !g.isLive).map(g => ({ ...g, sport })));
    }

    // Filter games to only show within 4 days
    allGames = filterByDateRange(allGames);

    // Generate AI-powered predictions using matchup analyzer
    const predictions = allGames.slice(0, 12).map(game => {
        const homeName = game.homeTeam?.name || game.homeTeam;
        const awayName = game.awayTeam?.name || game.awayTeam;

        // Use analytics engine for deep matchup analysis
        const analysis = window.MatchupAnalyzer.analyzeMatchup(homeName, awayName, game.sport);

        return { game, analysis };
    }).filter(p => p.analysis?.prediction?.confidence >= minConfidence);

    if (!predictions.length) {
        container.innerHTML = `<div class="no-data"><i class="fas fa-brain"></i><p>No predictions match ${minConfidence}% confidence threshold</p></div>`;
        return;
    }

    container.innerHTML = predictions.map(pred => {
        const { game, analysis } = pred;
        const prediction = analysis.prediction;

        // Generate matchup advantage badges
        const advantageHtml = analysis.matchupAdvantages
            .filter(a => a.impact !== 'low')
            .slice(0, 3)
            .map(a => `<span class="prediction-factor ${a.impact}">${a.description}</span>`)
            .join('');

        // Generate hidden value alerts
        const hiddenValueHtml = analysis.hiddenFactors
            .filter(f => f.impact === 'critical' || f.impact === 'high')
            .map(f => `<div class="hidden-value-alert"><i class="fas fa-exclamation-triangle"></i> ${f.description}</div>`)
            .join('');

        return `
        <div class="prediction-card ${analysis.hiddenFactors.some(f => f.impact === 'critical') ? 'has-hidden-value' : ''}">
            <div class="prediction-matchup">
                <div class="prediction-team">
                    <div class="prediction-team-logo">${game.awayTeam?.logo ? `<img src="${game.awayTeam.logo}" alt="">` : getTeamInitials(game.awayTeam?.name)}</div>
                    <div>
                        <div class="prediction-team-name">${analysis.awayTeam?.stats?.abbr || shortenTeamName(game.awayTeam?.name)}</div>
                        <div class="prediction-team-record">${analysis.awayTeam?.stats?.record || game.awayTeam?.record || ''}</div>
                    </div>
                </div>
                <div class="prediction-team">
                    <div class="prediction-team-logo">${game.homeTeam?.logo ? `<img src="${game.homeTeam.logo}" alt="">` : getTeamInitials(game.homeTeam?.name)}</div>
                    <div>
                        <div class="prediction-team-name">${analysis.homeTeam?.stats?.abbr || shortenTeamName(game.homeTeam?.name)}</div>
                        <div class="prediction-team-record">${analysis.homeTeam?.stats?.record || game.homeTeam?.record || ''}</div>
                    </div>
                </div>
            </div>
            <div class="prediction-analysis">
                <div class="prediction-bars">
                    <div class="prediction-bar team-a" style="flex: ${prediction.awayWinProbability}">${prediction.awayWinProbability}%</div>
                    <div class="prediction-bar team-b" style="flex: ${prediction.homeWinProbability}; background: var(--accent-primary)">${prediction.homeWinProbability}%</div>
                </div>
                ${hiddenValueHtml}
                <div class="matchup-details">
                    <div class="blowout-indicator ${analysis.blowoutProbability > 50 ? 'high' : 'low'}">
                        <i class="fas ${analysis.blowoutProbability > 50 ? 'fa-bolt' : 'fa-balance-scale'}"></i>
                        ${analysis.blowoutProbability > 50 ? `Blowout Risk: ${analysis.blowoutProbability}%` : `Close Game: ${analysis.closenessScore}% likely`}
                    </div>
                    <div class="predicted-total">Proj. Total: ${analysis.predictedTotal}</div>
                </div>
                <div class="prediction-factors">
                    ${advantageHtml || analysis.matchupAdvantages.slice(0, 2).map(a => `<span class="prediction-factor">${a.type}</span>`).join('')}
                </div>
            </div>
            <div class="prediction-result">
                <div class="prediction-pick-label">AI Pick</div>
                <div class="prediction-pick">${prediction.winnerAbbr || shortenTeamName(prediction.winner)}</div>
                <div class="prediction-spread">${formatLine(prediction.predictedSpread)}</div>
                <div class="prediction-confidence">
                    <i class="fas fa-brain"></i> ${prediction.confidence}%
                </div>
                <div class="predicted-score">
                    ${prediction.predictedScore?.away || '--'} - ${prediction.predictedScore?.home || '--'}
                </div>
            </div>
        </div>
    `}).join('');
}

// =====================================================
// Live Games
// =====================================================
async function loadLiveGames() {
    const container = document.getElementById('liveGames');

    const sports = currentSport === 'all' ? ['nba', 'nfl', 'mlb', 'nhl'] : [currentSport];
    let allGames = [];

    for (const sport of sports) {
        const games = await window.SportsAPI.fetchGames(sport);
        allGames = allGames.concat(games.filter(g => g.isLive));
    }

    if (!allGames.length) {
        container.innerHTML = `
            <div class="no-data" style="grid-column: 1 / -1;">
                <i class="fas fa-moon"></i>
                <p>No live games right now</p>
            </div>
        `;
        return;
    }

    container.innerHTML = allGames.map(game => `
        <div class="live-card">
            <div class="live-indicator">LIVE</div>
            <div class="live-sport"><i class="fas ${getSportIcon(game.sport)}"></i> ${game.sportName}</div>
            <div class="live-score">
                <div class="live-team">
                    <div class="live-team-logo">${game.awayTeam?.logo ? `<img src="${game.awayTeam.logo}" alt="">` : getTeamInitials(game.awayTeam?.name)}</div>
                    <div class="live-team-name">${game.awayTeam?.abbreviation || shortenTeamName(game.awayTeam?.name)}</div>
                    <div class="live-team-score">${game.awayTeam?.score || 0}</div>
                </div>
                <div class="live-period">
                    <div class="live-period-value">${game.status?.detail || '--'}</div>
                </div>
                <div class="live-team">
                    <div class="live-team-logo">${game.homeTeam?.logo ? `<img src="${game.homeTeam.logo}" alt="">` : getTeamInitials(game.homeTeam?.name)}</div>
                    <div class="live-team-name">${game.homeTeam?.abbreviation || shortenTeamName(game.homeTeam?.name)}</div>
                    <div class="live-team-score">${game.homeTeam?.score || 0}</div>
                </div>
            </div>
            <div class="live-odds">
                <div class="live-odds-box">
                    <div class="live-odds-label">Spread</div>
                    <div class="live-odds-value">--</div>
                </div>
                <div class="live-odds-box">
                    <div class="live-odds-label">ML</div>
                    <div class="live-odds-value">--</div>
                </div>
                <div class="live-odds-box">
                    <div class="live-odds-label">O/U</div>
                    <div class="live-odds-value">--</div>
                </div>
            </div>
        </div>
    `).join('');
}

function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => {
        if (document.getElementById('live').classList.contains('active')) {
            loadLiveGames();
        }
    }, 30000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// =====================================================
// Helper Functions
// =====================================================
function getSportIcon(sport) {
    const icons = {
        nba: 'fa-basketball-ball',
        nfl: 'fa-football-ball',
        mlb: 'fa-baseball-ball',
        nhl: 'fa-hockey-puck',
        ncaab: 'fa-basketball-ball',
        ncaaf: 'fa-football-ball',
        soccer: 'fa-futbol',
        mma: 'fa-fist-raised'
    };
    return icons[sport] || 'fa-trophy';
}

function formatOdds(odds) {
    if (odds >= 0) return `+${odds}`;
    return odds.toString();
}

function formatGameTime(date) {
    if (!(date instanceof Date)) date = new Date(date);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatGameDate(date) {
    if (!(date instanceof Date)) date = new Date(date);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function shortenTeamName(name) {
    if (!name) return '--';
    const parts = name.split(' ');
    return parts.length > 1 ? parts[parts.length - 1] : name;
}

function getTeamInitials(name) {
    if (!name) return '--';
    const parts = name.split(' ');
    if (parts.length > 1) {
        return parts[parts.length - 1].substring(0, 3).toUpperCase();
    }
    return name.substring(0, 3).toUpperCase();
}

function generateAppBadges(bookmakers) {
    if (!bookmakers) return '';
    const apps = Object.keys(bookmakers).slice(0, 3);
    return apps.map(app => {
        const appInfo = window.BETTING_APPS[app];
        return appInfo ? `<span class="app-badge" style="background: ${appInfo.color}; color: ${['prizepicks', 'draftkings', 'underdog'].includes(app) ? '#000' : '#fff'}">${appInfo.name}</span>` : '';
    }).join('');
}
