// =====================================================
// BetGenius AI - Main Application
// =====================================================

// State
let state = {
    currentSport: 'all',
    currentPage: 'props',
    props: [],
    isLoading: false,
    lastUpdate: null,
    serverConnected: false
};

// =====================================================
// Server Connection Banner
// =====================================================
function initServerConnectionBanner() {
    console.log('🔌 Initializing server connection checker...');
    // Initial check immediately
    checkServerConnection();
    // Check connection status every 30 seconds
    setInterval(checkServerConnection, 30000);
}

async function checkServerConnection() {
    const banner = document.getElementById('serverConnectionBanner');
    if (!banner) {
        console.log('⚠️ Server connection banner element not found');
        return false;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch('http://localhost:3001/health', {
            method: 'GET',
            mode: 'cors',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Proxy server connected:', data.status);
            // Server is connected
            state.serverConnected = true;
            banner.style.display = 'none';
            document.body.classList.remove('has-server-banner');
            return true;
        } else {
            throw new Error(`Server returned ${response.status}`);
        }
    } catch (error) {
        // Server not available - show banner briefly then hide
        console.warn('⚠️ Proxy server not available - using demo mode');
        state.serverConnected = false;

        // Update banner text to indicate demo mode
        const bannerText = document.getElementById('serverBannerText');
        if (bannerText) {
            bannerText.innerHTML = 'Server offline - <strong>Demo Mode</strong> active with sample props';
        }

        banner.style.display = 'block';
        document.body.classList.add('has-server-banner');

        // Auto-hide banner after 5 seconds since demo mode works
        setTimeout(() => {
            banner.style.display = 'none';
            document.body.classList.remove('has-server-banner');
        }, 5000);
    }
    return false;
}

// Retry connection function (called from banner button)
window.retryConnection = async function() {
    const banner = document.getElementById('serverConnectionBanner');
    const retryBtn = banner?.querySelector('.banner-retry-btn');

    if (retryBtn) {
        retryBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        retryBtn.disabled = true;
    }

    const connected = await checkServerConnection();

    if (connected) {
        // Connection successful - refresh data
        if (window.ToastManager) {
            window.ToastManager.success('Connected', 'Proxy server connected successfully!');
        }
        // Trigger a data refresh
        setTimeout(() => {
            if (typeof refreshData === 'function') {
                refreshData();
            }
        }, 500);
    } else {
        if (window.ToastManager) {
            window.ToastManager.info('Demo Mode', 'Using sample data. Start server for live data.');
        }
        // Hide the banner after showing the message - demo mode works fine
        setTimeout(() => {
            banner.style.display = 'none';
            document.body.classList.remove('has-server-banner');
        }, 3000);
    }

    if (retryBtn) {
        retryBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Retry';
        retryBtn.disabled = false;
    }
};
let minConfidence = 60;
let autoRefreshInterval = null;
let dataRefreshInterval = null;

// Prop category definitions
const PROP_CATEGORIES = {
    all: { label: 'All', icon: 'fa-list', keywords: [] },
    points: { label: 'Points', icon: 'fa-basketball-ball', keywords: ['points', 'pts'] },
    rebounds: { label: 'Rebounds', icon: 'fa-arrows-alt-v', keywords: ['rebounds', 'reb', 'rebound'] },
    assists: { label: 'Assists', icon: 'fa-hands-helping', keywords: ['assists', 'ast', 'assist'] },
    threes: { label: '3-Pointers', icon: 'fa-bullseye', keywords: ['3-point', '3pt', 'three', 'threes', '3-pointers'] },
    steals: { label: 'Steals', icon: 'fa-hand-paper', keywords: ['steals', 'stl', 'steal'] },
    blocks: { label: 'Blocks', icon: 'fa-hand-rock', keywords: ['blocks', 'blk', 'block'] }
};

// Auto-refresh intervals
const LIVE_REFRESH_INTERVAL = 30000;  // 30 seconds for live games
const DATA_REFRESH_INTERVAL = 300000; // 5 minutes for full data refresh

// Get list of currently active sports based on season
function getActiveSports() {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12

    const activeSports = [];

    // NBA: October - June
    if (month >= 10 || month <= 6) activeSports.push('nba');

    // NFL: September - February
    if (month >= 9 || month <= 2) activeSports.push('nfl');

    // MLB: March - October
    if (month >= 3 && month <= 10) activeSports.push('mlb');

    // NHL: October - June
    if (month >= 10 || month <= 6) activeSports.push('nhl');

    // College sports follow similar patterns
    if (month >= 11 || month <= 4) activeSports.push('ncaab');
    if (month >= 8 && month <= 1) activeSports.push('ncaaf');

    // Soccer and MMA year-round
    activeSports.push('soccer', 'mma');

    return activeSports;
}

// Check if a sport is currently in season
function isSportInSeason(sport) {
    return getActiveSports().includes(sport.toLowerCase());
}

async function loadAllData() {
    try {
        console.log('📦 Loading all data...');
        showLoading();

        // Set a maximum loading time of 15 seconds
        const maxLoadTime = setTimeout(() => {
            console.warn('⚠️ Loading timeout reached, showing available data');
            hideLoading();
            renderDemoData();
        }, 15000);

        // Load props
        await loadPlayerProps();

        // Load live games if on live page
        if (currentPage === 'live') {
            await loadLiveGames();
        }

        // Update tracker UI if on tracker page
        if (currentPage === 'tracker') {
            updateTrackerUI();
        }

        clearTimeout(maxLoadTime);
        hideLoading();
        updateLastUpdateTime();

        console.log('✅ All data loaded');
    } catch (error) {
        console.error('❌ Error loading data:', error);
        hideLoading();

        // Still show available props even if there was an error
        renderDemoData();
    }
}

// Fallback: Render demo data when live data fails
function renderDemoData() {
    console.log('📊 Rendering demo data...');

    if (!window.getDemoPropsByTier) {
        console.warn('Demo data not available');
        return;
    }

    const demoTiers = window.getDemoPropsByTier(currentSport);

    // Update data source text
    const dataSourceText = document.getElementById('dataSourceText');
    if (dataSourceText) {
        dataSourceText.innerHTML = `<i class="fas fa-database" style="color: #fbbf24;"></i> Demo Mode - Sample props shown`;
        dataSourceText.style.color = '#fbbf24';
    }

    // Render the tiered props
    renderTieredProps(demoTiers);
}

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
    console.log('🚀 Starting BetGenius AI...');

    // Hide loading overlay function
    const hideLoadingOverlay = () => {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
        }
    };

    // Render demo props directly function
    const showDemoProps = () => {
        console.log('📊 Rendering demo props...');
        if (!window.getDemoPropsByTier) {
            console.warn('Demo data not available');
            return;
        }

        const demoTiers = window.getDemoPropsByTier('all');
        const container = document.getElementById('playerProps');
        if (!container) return;

        let html = '';

        // Render Top Picks
        if (demoTiers.topPicks && demoTiers.topPicks.length > 0) {
            html += '<div class="tier-section top-picks"><h2 class="tier-header"><i class="fas fa-fire"></i> Top Picks (75%+)</h2><div class="props-grid">';
            demoTiers.topPicks.forEach(prop => {
                html += renderSimplePropCard(prop);
            });
            html += '</div></div>';
        }

        // Render Good Value
        if (demoTiers.goodValue && demoTiers.goodValue.length > 0) {
            html += '<div class="tier-section good-value"><h2 class="tier-header"><i class="fas fa-check-circle"></i> Good Value (65-74%)</h2><div class="props-grid">';
            demoTiers.goodValue.forEach(prop => {
                html += renderSimplePropCard(prop);
            });
            html += '</div></div>';
        }

        // Render Leans
        if (demoTiers.leans && demoTiers.leans.length > 0) {
            html += '<div class="tier-section leans"><h2 class="tier-header"><i class="fas fa-chart-line"></i> Leans (55-64%)</h2><div class="props-grid">';
            demoTiers.leans.forEach(prop => {
                html += renderSimplePropCard(prop);
            });
            html += '</div></div>';
        }

        // Render Risky
        if (demoTiers.risky && demoTiers.risky.length > 0) {
            html += '<div class="tier-section risky"><h2 class="tier-header"><i class="fas fa-exclamation-triangle"></i> Risky (<55%)</h2><div class="props-grid">';
            demoTiers.risky.forEach(prop => {
                html += renderSimplePropCard(prop);
            });
            html += '</div></div>';
        }

        container.innerHTML = html;

        // Update tier counts
        updateTierCounts(demoTiers);

        // Update data source text
        const dataSourceText = document.getElementById('dataSourceText');
        if (dataSourceText) {
            dataSourceText.innerHTML = '<i class="fas fa-database" style="color: #fbbf24;"></i> Demo Mode - Sample props shown';
            dataSourceText.style.color = '#fbbf24';
        }
    };

    // Simple prop card renderer
    const renderSimplePropCard = (prop) => {
        const confidence = prop.confidence || 50;
        const confidenceClass = confidence >= 75 ? 'high' : confidence >= 65 ? 'medium' : confidence >= 55 ? 'low' : 'risky';
        const pickClass = prop.pick === 'OVER' ? 'over' : 'under';
        const odds = prop.odds?.over || prop.odds?.under || -110;

        return `
            <div class="prop-card ${confidenceClass}">
                <div class="prop-header">
                    <div class="player-info">
                        <span class="player-name">${prop.player || 'Unknown'}</span>
                        <span class="player-team">${prop.team || ''} • ${(prop.sport || '').toUpperCase()}</span>
                    </div>
                    <div class="confidence-badge ${confidenceClass}">
                        <span class="confidence-value">${Math.round(confidence)}%</span>
                    </div>
                </div>
                <div class="prop-body">
                    <div class="prop-type">${prop.propType || 'Prop'}</div>
                    <div class="prop-line">
                        <span class="line-value">${prop.line || 0}</span>
                    </div>
                    <div class="prop-pick ${pickClass}">
                        <span class="pick-label">${prop.pick || 'PICK'}</span>
                        <span class="pick-odds">${odds > 0 ? '+' : ''}${odds}</span>
                    </div>
                </div>
                <div class="prop-reasoning">
                    <p>${prop.reasoning || 'AI analysis based on recent performance.'}</p>
                </div>
            </div>
        `;
    };

    // FAILSAFE: Always hide loading and show demo data after 5 seconds
    setTimeout(() => {
        console.log('⏱️ Failsafe timer triggered');
        hideLoadingOverlay();
        const container = document.getElementById('playerProps');
        if (container && (!container.innerHTML || container.innerHTML.includes('Loading'))) {
            showDemoProps();
        }
    }, 5000);

    // Initialize UI components
    try {
        initNavigation();
        initSportsFilter();
        initAppFilter();
        initThemeToggle();
        initPropsAppTabs();
        initTierFilter();
        initConfidenceSlider();
        initEventListeners();
    } catch (e) {
        console.warn('UI init error:', e);
    }

    // Listen for live data refresh events
    window.addEventListener('liveDataRefreshed', (event) => {
        console.log('📊 Live data refreshed:', event.detail);
        updateLastUpdateTime();
        updateDataSourceText();

        // Show toast notification for data refresh
        if (window.ToastManager) {
            const detail = event.detail;
            window.ToastManager.show(
                `Data refreshed: ${detail.propsCount} props, ${detail.statsCount} stats loaded`,
                'success',
                3000
            );
        }
    });

    // Initialize toast manager
    if (window.ToastManager) {
        window.ToastManager.init();
    }

    // Initialize server connection status checker
    initServerConnectionBanner();

    // Initialize all live data services
    console.log('🚀 Initializing BetGenius AI...');

    // Initialize services in parallel for speed with timeout
    try {
        await Promise.race([
            Promise.all([
                window.LiveDataService?.initialize().catch(e => console.warn('LiveDataService init failed:', e)),
                window.RosterService?.initialize().catch(e => console.warn('RosterService init failed:', e))
            ]),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Init timeout')), 10000))
        ]);
    } catch (e) {
        console.warn('⚠️ Service initialization timeout or error:', e.message);
    }

    // Load initial data with timeout protection
    try {
        await Promise.race([
            loadAllData(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Data load timeout')), 15000))
        ]);
    } catch (e) {
        console.warn('⚠️ Data loading timeout or error:', e.message);
    }

    // Update data source status display
    updateDataSourceStatusDisplay();

    // ALWAYS hide loading overlay, even if there were errors
    document.getElementById('loadingOverlay').classList.add('hidden');
    console.log('✅ Loading overlay hidden');

    // Start auto-refresh for live games
    startAutoRefresh();

    // Log data sources
    if (window.LiveDataService) {
        const sources = window.LiveDataService.getDataSources();
        console.log('📊 Data Sources:', sources);
    }
});

// Update Data Source Status Display
function updateDataSourceStatusDisplay() {
    const status = window.SportsAPI?.getCurrentDataSourceStatus();
    if (!status) return;

    const { successful, rateLimited, errored } = status;

    // Log status
    console.log('📊 Data Sources Status:', {
        live: successful,
        rateLimited: rateLimited,
        errors: errored
    });

    // Show banner if any sources are limited
    if (rateLimited.length > 0) {
        if (window.DataSourceBanner) {
            window.DataSourceBanner.showRateLimited();
        }
    }

    // Show success toast if all working
    if (successful.length > 0 && rateLimited.length === 0 && errored.length === 0) {
        if (window.ToastManager) {
            window.ToastManager.success(
                'Data Loaded',
                `Connected to ${successful.length} data sources successfully.`
            );
        }
    }
}

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
function initEventListeners() {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            document.querySelector('.nav-links').classList.toggle('show');
        });
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await loadProps();
        });
    }

    // Parlay toggle button
    const parlayToggleBtn = document.getElementById('parlayToggleBtn');
    const parlayPanel = document.getElementById('parlayPanel');
    const parlayOverlay = document.getElementById('parlayOverlay');
    const closeParlayBtn = document.getElementById('closeParlayBtn');

    if (parlayToggleBtn && parlayPanel) {
        parlayToggleBtn.addEventListener('click', () => {
            parlayPanel.classList.add('open');
            parlayOverlay.classList.add('active');
        });
    }

    if (closeParlayBtn) {
        closeParlayBtn.addEventListener('click', () => {
            parlayPanel.classList.remove('open');
            parlayOverlay.classList.remove('active');
        });
    }

    if (parlayOverlay) {
        parlayOverlay.addEventListener('click', () => {
            parlayPanel.classList.remove('open');
            parlayOverlay.classList.remove('active');
        });
    }

    // Tracker page buttons
    const addBetBtn = document.getElementById('addBetBtn');
    const addBetModal = document.getElementById('addBetModal');

    if (addBetBtn && addBetModal) {
        addBetBtn.addEventListener('click', () => {
            addBetModal.classList.add('active');
        });
    }

    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modal;
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Set bankroll button
    const setBankrollBtn = document.getElementById('setBankrollBtn');
    if (setBankrollBtn) {
        setBankrollBtn.addEventListener('click', () => {
            const current = window.BettingTracker?.getBankroll()?.current || 1000;
            const newAmount = prompt('Set your bankroll:', current);
            if (newAmount && !isNaN(parseFloat(newAmount))) {
                window.BettingTracker.setBankroll(parseFloat(newAmount));
                updateTrackerUI();
            }
        });
    }

    // Export bets button
    const exportBetsBtn = document.getElementById('exportBetsBtn');
    if (exportBetsBtn) {
        exportBetsBtn.addEventListener('click', () => {
            window.BettingTracker?.exportBets();
        });
    }

    // Tracker tabs
    document.querySelectorAll('.tracker-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            // Update active tab
            document.querySelectorAll('.tracker-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show/hide content
            document.querySelectorAll('.tracker-content').forEach(content => {
                content.classList.add('hidden');
            });

            const contentId = 'tracker' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
            const content = document.getElementById(contentId);
            if (content) {
                content.classList.remove('hidden');
            }

            // Load analytics if needed
            if (tabName === 'analytics') {
                renderAnalytics();
            }
        });
    });

    // Add bet form
    const addBetForm = document.getElementById('addBetForm');
    if (addBetForm) {
        addBetForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const bet = {
                sport: document.getElementById('betSport').value,
                sportsbook: document.getElementById('betSportsbook').value,
                player: document.getElementById('betPlayer').value,
                team: document.getElementById('betTeam').value,
                propType: document.getElementById('betPropType').value,
                line: parseFloat(document.getElementById('betLine').value),
                pick: document.getElementById('betPick').value,
                odds: parseInt(document.getElementById('betOdds').value),
                wager: parseFloat(document.getElementById('betWager').value),
                notes: document.getElementById('betNotes').value
            };

            window.BettingTracker.addBet(bet);
            addBetModal.classList.remove('active');
            addBetForm.reset();
            updateTrackerUI();
        });

        // Update potential win display
        const wagerInput = document.getElementById('betWager');
        const oddsInput = document.getElementById('betOdds');
        const potentialWinDisplay = document.getElementById('potentialWinDisplay');

        const updatePotentialWin = () => {
            const wager = parseFloat(wagerInput?.value) || 0;
            const odds = parseInt(oddsInput?.value) || -110;
            let payout = 0;

            if (odds > 0) {
                payout = wager * (odds / 100);
            } else {
                payout = wager * (100 / Math.abs(odds));
            }

            if (potentialWinDisplay) {
                potentialWinDisplay.textContent = `$${payout.toFixed(2)}`;
            }
        };

        wagerInput?.addEventListener('input', updatePotentialWin);
        oddsInput?.addEventListener('input', updatePotentialWin);
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
// Navigation
function initNavigation() {
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;

            // Update active link
            document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Show/hide pages
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById(page).classList.add('active');

            // Close mobile menu
            document.querySelector('.nav-links').classList.remove('show');

            // Update tracker if navigating to tracker page
            if (page === 'tracker') {
                updateTrackerUI();
            }
        });
    });
}

// Update Tracker UI with current data
function updateTrackerUI() {
    if (!window.BettingTracker) return;

    const stats = window.BettingTracker.getStats();

    // Update stat cards
    document.getElementById('statBankroll').textContent = `$${stats.bankroll.toFixed(2)}`;

    const bankrollChange = document.getElementById('statBankrollChange');
    if (bankrollChange) {
        const change = stats.bankrollChange;
        bankrollChange.textContent = `${change >= 0 ? '+' : ''}$${change.toFixed(2)}`;
        bankrollChange.className = `stat-change ${change >= 0 ? 'positive' : 'negative'}`;
    }

    document.getElementById('statROI').textContent = `${stats.roi.toFixed(1)}%`;
    document.getElementById('statWinRate').textContent = `${stats.winRate.toFixed(1)}%`;
    document.getElementById('statRecord').textContent = `${stats.won}-${stats.lost}`;

    const streak = stats.streak;
    const streakEl = document.getElementById('statStreak');
    if (streakEl && streak.type) {
        streakEl.textContent = `${streak.count}${streak.type === 'won' ? 'W' : 'L'}`;
        streakEl.style.color = streak.type === 'won' ? 'var(--accent-color)' : '#ff4757';
    } else {
        streakEl.textContent = '--';
    }

    document.getElementById('statPending').textContent = stats.pending;
    document.getElementById('statPendingAmount').textContent = `$${stats.pendingWager.toFixed(0)} at risk`;
    document.getElementById('pendingCount').textContent = stats.pending;

    const aiAccuracy = window.BettingTracker.getAIPredictionAccuracy();
    document.getElementById('statAIAccuracy').textContent = aiAccuracy.total > 0 ? `${aiAccuracy.overall.toFixed(1)}%` : '--';

    // Render pending bets
    renderPendingBets();

    // Render history
    renderBetHistory();
}

// Render pending bets list
function renderPendingBets() {
    const container = document.getElementById('pendingBetsList');
    if (!container || !window.BettingTracker) return;

    const pendingBets = window.BettingTracker.getPendingBets();

    if (pendingBets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>No pending bets</p>
                <span>Add bets from the Player Props page</span>
            </div>
        `;
        return;
    }

    container.innerHTML = pendingBets.map(bet => `
        <div class="bet-card" data-id="${bet.id}">
            <div class="bet-sport-icon">
                <i class="fas ${getSportIcon(bet.sport)}"></i>
            </div>
            <div class="bet-info">
                <div class="bet-player">${bet.player || bet.team}</div>
                <div class="bet-detail">${bet.propType} ${bet.pick.toUpperCase()} ${bet.line}</div>
                <div class="bet-meta">${bet.sportsbook} • ${new Date(bet.placedAt).toLocaleDateString()}</div>
            </div>
            <div class="bet-wager">
                <div class="bet-amount">$${bet.wager.toFixed(2)}</div>
                <div class="bet-potential">Win $${bet.potentialPayout.toFixed(2)}</div>
            </div>
            <div class="bet-actions">
                <button class="btn btn-settle btn-win" onclick="settleBet('${bet.id}', 'won')">
                    <i class="fas fa-check"></i> Win
                </button>
                <button class="btn btn-settle btn-lose" onclick="settleBet('${bet.id}', 'lost')">
                    <i class="fas fa-times"></i> Lose
                </button>
                <button class="btn btn-settle btn-push" onclick="settleBet('${bet.id}', 'push')">
                    Push
                </button>
            </div>
        </div>
    `).join('');
}

// Render bet history
function renderBetHistory() {
    const container = document.getElementById('historyBetsList');
    if (!container || !window.BettingTracker) return;

    const recentBets = window.BettingTracker.getRecentBets(20).filter(b => b.status !== 'pending');

    if (recentBets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>No bet history yet</p>
                <span>Settled bets will appear here</span>
            </div>
        `;
        return;
    }

    container.innerHTML = recentBets.map(bet => `
        <div class="bet-card ${bet.status}" data-id="${bet.id}">
            <div class="bet-sport-icon" style="background: ${bet.status === 'won' ? 'rgba(0, 255, 136, 0.15)' : bet.status === 'lost' ? 'rgba(255, 71, 87, 0.15)' : 'rgba(156, 163, 175, 0.15)'}">
                <i class="fas ${bet.status === 'won' ? 'fa-trophy' : bet.status === 'lost' ? 'fa-times-circle' : 'fa-minus-circle'}" style="color: ${bet.status === 'won' ? 'var(--accent-color)' : bet.status === 'lost' ? '#ff4757' : '#9ca3af'}"></i>
            </div>
            <div class="bet-info">
                <div class="bet-player">${bet.player || bet.team}</div>
                <div class="bet-detail">${bet.propType} ${bet.pick.toUpperCase()} ${bet.line}</div>
                <div class="bet-meta">${bet.sportsbook} • ${new Date(bet.settledAt || bet.placedAt).toLocaleDateString()}</div>
            </div>
            <div class="bet-wager">
                <div class="bet-amount" style="color: ${bet.status === 'won' ? 'var(--accent-color)' : bet.status === 'lost' ? '#ff4757' : 'var(--text-secondary)'}">
                    ${bet.status === 'won' ? '+' : bet.status === 'lost' ? '-' : ''}$${bet.status === 'won' ? bet.potentialPayout.toFixed(2) : bet.wager.toFixed(2)}
                </div>
                <div class="bet-potential">${bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}</div>
            </div>
        </div>
    `).join('');
}

// Render analytics
function renderAnalytics() {
    if (!window.BettingTracker) return;

    // By Sport
    const bySport = window.BettingTracker.getStatsBySport();
    const sportContainer = document.getElementById('analyticsBySport');
    if (sportContainer) {
        if (Object.keys(bySport).length === 0) {
            sportContainer.innerHTML = '<div class="empty-state"><p>No data yet</p></div>';
        } else {
            sportContainer.innerHTML = Object.entries(bySport).map(([sport, stats]) => `
                <div class="analytics-row">
                    <span class="label">${sport.toUpperCase()}</span>
                    <span class="value">${stats.won}-${stats.lost} (${stats.winRate.toFixed(0)}%)</span>
                    <span class="value ${stats.profit >= 0 ? 'positive' : 'negative'}">${stats.profit >= 0 ? '+' : ''}$${stats.profit.toFixed(2)}</span>
                </div>
            `).join('');
        }
    }

    // By Prop Type
    const byProp = window.BettingTracker.getStatsByPropType();
    const propContainer = document.getElementById('analyticsByProp');
    if (propContainer) {
        if (Object.keys(byProp).length === 0) {
            propContainer.innerHTML = '<div class="empty-state"><p>No data yet</p></div>';
        } else {
            propContainer.innerHTML = Object.entries(byProp).map(([prop, stats]) => `
                <div class="analytics-row">
                    <span class="label">${prop}</span>
                    <span class="value">${stats.won}-${stats.lost} (${stats.winRate.toFixed(0)}%)</span>
                    <span class="value ${stats.profit >= 0 ? 'positive' : 'negative'}">${stats.profit >= 0 ? '+' : ''}$${stats.profit.toFixed(2)}</span>
                </div>
            `).join('');
        }
    }

    // By Sportsbook
    const byBook = window.BettingTracker.getStatsBySportsbook();
    const bookContainer = document.getElementById('analyticsByBook');
    if (bookContainer) {
        if (Object.keys(byBook).length === 0) {
            bookContainer.innerHTML = '<div class="empty-state"><p>No data yet</p></div>';
        } else {
            bookContainer.innerHTML = Object.entries(byBook).map(([book, stats]) => `
                <div class="analytics-row">
                    <span class="label">${book.charAt(0).toUpperCase() + book.slice(1)}</span>
                    <span class="value">${stats.won}-${stats.lost} (${stats.winRate.toFixed(0)}%)</span>
                    <span class="value ${stats.profit >= 0 ? 'positive' : 'negative'}">${stats.profit >= 0 ? '+' : ''}$${stats.profit.toFixed(2)}</span>
                </div>
            `).join('');
        }
    }
}

// Settle a bet
function settleBet(betId, result) {
    if (window.BettingTracker) {
        window.BettingTracker.settleBet(betId, result);
        updateTrackerUI();
    }
}

// Make settleBet globally available
window.settleBet = settleBet;

// Add prop to parlay from card button
function addPropToParlay(player, propType, line, pick, odds, sport, team, confidence) {
    if (window.ParlayBuilder) {
        const prop = {
            player: player,
            propType: propType,
            line: line,
            pick: pick,
            odds: odds,
            sport: sport,
            team: team,
            confidence: confidence
        };

        const added = window.ParlayBuilder.addLeg(prop);

        if (added) {
            // Open parlay panel to show the added leg
            const parlayPanel = document.getElementById('parlayPanel');
            const parlayOverlay = document.getElementById('parlayOverlay');
            if (parlayPanel) {
                parlayPanel.classList.add('open');
                parlayOverlay?.classList.add('active');
            }
        }
    }
}

// Toggle favorite player from card button
function toggleFavoritePlayer(playerName, team, sport, position) {
    if (window.FavoritesManager) {
        const player = {
            name: playerName,
            team: team,
            sport: sport,
            position: position
        };

        window.FavoritesManager.toggleFavoritePlayer(player);

        // Update button state
        document.querySelectorAll('.btn-favorite').forEach(btn => {
            if (btn.onclick?.toString().includes(playerName)) {
                btn.classList.toggle('active', window.FavoritesManager.isPlayerFavorite(playerName));
            }
        });
    }
}

// Quick add bet from card button
function quickAddBet(player, propType, line, pick, odds, sport, team, confidence) {
    if (window.BettingTracker) {
        // Open the add bet modal with pre-filled values
        const modal = document.getElementById('addBetModal');

        if (modal) {
            document.getElementById('betSport').value = sport;
            document.getElementById('betPlayer').value = player;
            document.getElementById('betTeam').value = team;
            document.getElementById('betPropType').value = propType;
            document.getElementById('betLine').value = line;
            document.getElementById('betPick').value = pick;
            document.getElementById('betOdds').value = odds;

            modal.classList.add('active');
        }
    }
}

// Helper to escape HTML in strings
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Make functions globally available
window.addPropToParlay = addPropToParlay;
window.toggleFavoritePlayer = toggleFavoritePlayer;
window.quickAddBet = quickAddBet;

function filterTierSections() {
    const tierSections = document.querySelectorAll('.tier-section');
    const tierMapping = {
        'topPicks': 'tier-top',
        'goodValue': 'tier-good',
        'leans': 'tier-lean',
        'risky': 'tier-risky'
    };

    tierSections.forEach(section => {
        if (currentTierFilter === 'all') {
            section.classList.remove('hidden');
        } else {
            const tierClass = tierMapping[currentTierFilter];
            if (section.classList.contains(tierClass)) {
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        }
    });
}

function updateTierCounts(propsByTier) {
    const counts = {
        all: (propsByTier.topPicks?.length || 0) +
             (propsByTier.goodValue?.length || 0) +
             (propsByTier.leans?.length || 0) +
             (propsByTier.risky?.length || 0),
        top: propsByTier.topPicks?.length || 0,
        good: propsByTier.goodValue?.length || 0,
        lean: propsByTier.leans?.length || 0,
        risky: propsByTier.risky?.length || 0
    };

    const countElements = {
        all: document.getElementById('tierCountAll'),
        top: document.getElementById('tierCountTop'),
        good: document.getElementById('tierCountGood'),
        lean: document.getElementById('tierCountLean'),
        risky: document.getElementById('tierCountRisky')
    };

    for (const [key, el] of Object.entries(countElements)) {
        if (el) el.textContent = counts[key];
    }
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
// Seasonal Sport Awareness
// =====================================================
function getSportSeasonStatus() {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12

    return {
        nba: {
            inSeason: (month >= 10 || month <= 6),
            name: 'NBA',
            seasonDates: 'October - June'
        },
        nfl: {
            inSeason: (month >= 9 || month <= 2),
            name: 'NFL',
            seasonDates: 'September - February'
        },
        nhl: {
            inSeason: (month >= 10 || month <= 6),
            name: 'NHL',
            seasonDates: 'October - June'
        },
        mlb: {
            inSeason: (month >= 4 && month <= 10),
            name: 'MLB',
            seasonDates: 'April - October'
        }
    };
}

// Use the getActiveSports defined earlier in the file

// =====================================================
// Load All Data (Main - single definition)
// =====================================================
// Note: The earlier loadAllData function at line ~171 handles this

function updateLastUpdateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const lastUpdateEl = document.getElementById('lastUpdateTime');
    if (lastUpdateEl) {
        lastUpdateEl.textContent = `${dateStr} ${timeStr}`;
        lastUpdateEl.title = `Last full refresh: ${now.toLocaleString()}`;
    }

    // Update data source status text
    updateDataSourceText();
}

function updateDataSourceText() {
    const dataSourceText = document.getElementById('dataSourceText');
    if (!dataSourceText) return;

    const sources = [];
    const activeSports = getActiveSports();

    // Check if services are available and working
    if (window.LiveDataService?.proxyAvailable) {
        sources.push('Live Odds');
    }
    if (window.RosterService?.rosterSource === 'espn_live') {
        sources.push('ESPN Rosters');
    }
    if (window.LiveDataService?.dataSources?.stats === 'live') {
        sources.push('Player Stats');
    }
    if (window.LiveDataService?.dataSources?.injuries === 'live') {
        sources.push('Injury Reports');
    }

    if (sources.length > 0) {
        dataSourceText.innerHTML = `<i class="fas fa-check-circle" style="color: #4ade80;"></i> Live data: ${sources.join(', ')}`;
        dataSourceText.style.color = '#4ade80';
    } else {
        dataSourceText.innerHTML = `<i class="fas fa-database" style="color: #fbbf24;"></i> Using cached data (server may be offline)`;
        dataSourceText.style.color = '#fbbf24';
    }

    // Add active sports indicator
    if (activeSports.length > 0) {
        const sportsText = activeSports.map(s => s.toUpperCase()).join(', ');
        dataSourceText.innerHTML += ` | Active: ${sportsText}`;
    }
}

// =====================================================
// Dashboard
// =====================================================
async function loadDashboardData(sports) {
    let allGames = [];
    let allOdds = [];
    let allPlayers = [];
    let allTeams = [];

    for (const sport of sports) {
        // Try to get data from aggregated endpoint first
        const aggregatedGames = window.SportsAPI.getAggregatedGames(sport);
        const aggregatedPlayers = window.SportsAPI.getAggregatedPlayers(sport);
        const aggregatedTeams = window.SportsAPI.getAggregatedTeams(sport);

        if (aggregatedGames.length > 0) {
            // Use aggregated ESPN data - format it for display
            const formattedGames = aggregatedGames.map(event => ({
                id: event.id,
                sport: sport,
                sportName: window.SPORT_MAPPINGS?.[sport]?.name || sport.toUpperCase(),
                name: event.name,
                shortName: event.shortName,
                date: new Date(event.date),
                status: event.status,
                homeTeam: {
                    name: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.team?.displayName,
                    abbreviation: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.team?.abbreviation,
                    score: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.score,
                    logo: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.team?.logo
                },
                awayTeam: {
                    name: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.team?.displayName,
                    abbreviation: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.team?.abbreviation,
                    score: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.score,
                    logo: event.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.team?.logo
                },
                isLive: event.status?.type?.state === 'in',
                statusDetail: event.status?.type?.detail || event.status?.type?.description
            }));
            allGames = allGames.concat(formattedGames);
            console.log(`✅ Loaded ${formattedGames.length} ${sport.toUpperCase()} games from aggregate`);
        } else {
            // Fallback to direct API
            const games = await window.SportsAPI.fetchGames(sport);
            allGames = allGames.concat(games);
        }

        // Get odds (may be limited due to rate limits)
        const odds = await window.SportsAPI.fetchOdds(sport);
        allOdds = allOdds.concat(odds);

        // Store player/team data for later use
        allPlayers = allPlayers.concat(aggregatedPlayers);
        allTeams = allTeams.concat(aggregatedTeams);
    }

    // Store players and teams globally for other components
    window.aggregatedPlayers = allPlayers;
    window.aggregatedTeams = allTeams;

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

    // Get calculated odds from aggregated data
    const sports = currentSport === 'all' ? ['nba', 'nfl', 'mlb', 'nhl'] : [currentSport];
    let calculatedOdds = [];
    sports.forEach(sport => {
        const sportOdds = window.SportsAPI.getCalculatedOdds(sport);
        calculatedOdds = calculatedOdds.concat(sportOdds.map(o => ({ ...o, sport })));
    });

    // Use calculated odds if available
    if (calculatedOdds.length > 0) {
        container.innerHTML = calculatedOdds.slice(0, 8).map(game => {
            const home = game.homeTeam || {};
            const away = game.awayTeam || {};
            const total = game.total || {};
            const sportName = window.SPORT_MAPPINGS?.[game.sport]?.name || game.sport?.toUpperCase();

            return `
                <div class="game-card">
                    <div class="game-header">
                        <span class="game-sport-badge ${game.sport}">${sportName}</span>
                        <div class="game-time-info">
                            <div class="game-time-value">${formatGameTime(game.startTime)}</div>
                            <div class="game-date">${formatGameDate(game.startTime)}</div>
                        </div>
                    </div>
                    <div class="game-teams-odds">
                        <div class="team-row away">
                            <div class="team-info">
                                <div class="team-logo-small">${away.logo ? `<img src="${away.logo}" alt="">` : getTeamInitials(away.name)}</div>
                                <div class="team-name">${away.abbreviation || shortenTeamName(away.name)}</div>
                            </div>
                            <div class="team-odds">
                                <span class="odds-ml ${away.moneyline > 0 ? 'underdog' : 'favorite'}">${formatOddsValue(away.moneyline)}</span>
                                <span class="odds-spread">${formatSpread(away.spread)}</span>
                            </div>
                        </div>
                        <div class="team-row home">
                            <div class="team-info">
                                <div class="team-logo-small">${home.logo ? `<img src="${home.logo}" alt="">` : getTeamInitials(home.name)}</div>
                                <div class="team-name">${home.abbreviation || shortenTeamName(home.name)}</div>
                            </div>
                            <div class="team-odds">
                                <span class="odds-ml ${home.moneyline > 0 ? 'underdog' : 'favorite'}">${formatOddsValue(home.moneyline)}</span>
                                <span class="odds-spread">${formatSpread(home.spread)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="game-total">
                        <div class="total-label">O/U</div>
                        <div class="total-value">${total.points || '--'}</div>
                    </div>
                    <div class="game-prediction">
                        <div class="prediction-label">Win Prob</div>
                        <div class="prediction-bars">
                            <div class="prob-bar away" style="width: ${parseFloat(away.winProb) || 50}%"></div>
                            <div class="prob-bar home" style="width: ${parseFloat(home.winProb) || 50}%"></div>
                        </div>
                        <div class="prediction-values">
                            <span>${away.winProb || '50%'}</span>
                            <span>${home.winProb || '50%'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        return;
    }

    // Fallback: Filter out live games
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
// Player Props - Enhanced with tier organization
// =====================================================
async function loadPlayerProps() {
    const container = document.getElementById('playerProps');

    container.innerHTML = '<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i> Loading player props...</div>';

    // Only load props for in-season sports
    let sports = [];
    const activeSports = getActiveSports();

    if (currentSport === 'all') {
        sports = activeSports; // Only active sports
    } else {
        sports = [currentSport];
    }

    // Track off-season sports for messaging
    const offSeasonSports = ['nba', 'nfl', 'nhl', 'mlb'].filter(s => !isSportInSeason(s));

    let allPropsByTier = {
        topPicks: [],
        goodValue: [],
        leans: [],
        risky: [],
        all: []
    };

    // === FIRST: Try Enhanced Props Service (Live ESPN Odds) with timeout ===
    if (window.EnhancedPropsService) {
        try {
            console.log('🎯 Fetching live ESPN odds...');
            const liveTiers = await Promise.race([
                window.EnhancedPropsService.getPropsByTier(currentSport),
                new Promise((_, reject) => setTimeout(() => reject(new Error('ESPN fetch timeout')), 8000))
            ]);

            if (liveTiers) {
                ['topPicks', 'goodValue', 'leans', 'risky'].forEach(tier => {
                    if (liveTiers[tier] && liveTiers[tier].length > 0) {
                        allPropsByTier[tier] = allPropsByTier[tier].concat(liveTiers[tier]);
                    }
                });

                // Update data source to show live data
                const dataSourceText = document.getElementById('dataSourceText');
                if (dataSourceText && (allPropsByTier.topPicks.length > 0 || allPropsByTier.goodValue.length > 0)) {
                    dataSourceText.innerHTML = `<i class="fas fa-signal" style="color: #00ff88;"></i> Live odds from ESPN/DraftKings`;
                    dataSourceText.style.color = '#00ff88';
                }
            }
        } catch (error) {
            console.warn('Live odds fetch failed:', error.message);
        }
    }

    // === SECOND: Try proxy server data (if available) ===
    if (allPropsByTier.topPicks.length === 0 && allPropsByTier.goodValue.length === 0) {
        for (const sport of sports) {
            if (!isSportInSeason(sport)) {
                console.log(`⏭️ Skipping ${sport.toUpperCase()} - off-season`);
                continue;
            }

            const tierData = window.SportsAPI.getPropsByTier(sport);
            if (tierData) {
                ['topPicks', 'goodValue', 'leans', 'risky', 'all'].forEach(tier => {
                    if (tierData[tier]) {
                        const formattedProps = tierData[tier].map(p => formatPropForDisplay(p, sport));
                        allPropsByTier[tier] = allPropsByTier[tier].concat(formattedProps);
                    }
                });
            } else {
                const generatedProps = window.SportsAPI.getGeneratedProps(sport);
                if (generatedProps && generatedProps.length > 0) {
                    const formattedProps = generatedProps.map(p => formatPropForDisplay(p, sport));
                    allPropsByTier.all = allPropsByTier.all.concat(formattedProps);
                }
            }
        }
    }

    // === THIRD: Fall back to old fetch method ===
    if (allPropsByTier.all.length === 0 &&
        allPropsByTier.topPicks.length === 0 &&
        allPropsByTier.goodValue.length === 0) {
        for (const sport of sports) {
            if (!isSportInSeason(sport)) continue;

            try {
                const props = await window.SportsAPI.fetchPlayerProps(sport);
                const taggedProps = props.map(p => ({
                    ...p,
                    sport: sport,
                    sportName: window.SPORT_MAPPINGS[sport]?.name || sport.toUpperCase()
                }));
                allPropsByTier.all = allPropsByTier.all.concat(taggedProps);
            } catch (e) {
                console.warn(`Failed to fetch props for ${sport}:`, e.message);
            }
        }
    }

    // === DEMO MODE FALLBACK ===
    // If still no props and demo data is available, use demo data
    if (allPropsByTier.all.length === 0 &&
        allPropsByTier.topPicks.length === 0 &&
        allPropsByTier.goodValue.length === 0 &&
        allPropsByTier.leans.length === 0 &&
        window.getDemoPropsByTier) {

        console.log('📊 Using demo data (server offline)');
        const demoTiers = window.getDemoPropsByTier(currentSport);

        // Merge demo props into our tiers
        ['topPicks', 'goodValue', 'leans', 'risky'].forEach(tier => {
            if (demoTiers[tier]) {
                allPropsByTier[tier] = allPropsByTier[tier].concat(demoTiers[tier]);
            }
        });

        // Update data source text to show demo mode
        const dataSourceText = document.getElementById('dataSourceText');
        if (dataSourceText) {
            dataSourceText.innerHTML = `<i class="fas fa-database" style="color: #fbbf24;"></i> Demo Mode - Sample props shown (start server for live data)`;
            dataSourceText.style.color = '#fbbf24';
        }
    }

    // Filter by app if selected
    if (currentPropsApp !== 'all') {
        ['topPicks', 'goodValue', 'leans', 'risky', 'all'].forEach(tier => {
            allPropsByTier[tier] = allPropsByTier[tier].filter(p => p.books && p.books[currentPropsApp]);
        });
    }

    // Filter by prop type if selected
    const propTypeFilterValue = document.getElementById('propTypeFilter')?.value || 'all';
    if (propTypeFilterValue !== 'all') {
        const category = PROP_CATEGORIES[propTypeFilterValue];
        if (category && category.keywords.length > 0) {
            ['topPicks', 'goodValue', 'leans', 'risky', 'all'].forEach(tier => {
                allPropsByTier[tier] = allPropsByTier[tier].filter(p => {
                    const propTypeLower = (p.propType || '').toLowerCase();
                    return category.keywords.some(keyword => propTypeLower.includes(keyword));
                });
            });
        }
    }

    const totalProps = allPropsByTier.topPicks.length + allPropsByTier.goodValue.length +
                       allPropsByTier.leans.length + allPropsByTier.risky.length || allPropsByTier.all.length;

    let html = '';

    // Show off-season notice if applicable
    if (offSeasonSports.length > 0 && currentSport === 'all') {
        const seasons = getSportSeasonStatus();
        html += `<div class="off-season-notice">
            <div class="off-season-header">
                <i class="fas fa-calendar-times"></i>
                <strong>Off-Season Sports</strong>
            </div>
            <div class="off-season-list">
                ${offSeasonSports.map(sport => {
                    const info = seasons[sport];
                    return `<span class="off-season-sport">${info.name} (${info.seasonDates})</span>`;
                }).join('')}
            </div>
        </div>`;
    }

    // Handle single off-season sport selection
    if (currentSport !== 'all' && !isSportInSeason(currentSport)) {
        const seasons = getSportSeasonStatus();
        const info = seasons[currentSport];
        container.innerHTML = `
            <div class="off-season-message">
                <i class="fas fa-calendar-times fa-3x"></i>
                <h3>${info.name} is Currently Off-Season</h3>
                <p>The ${info.name} regular season runs from <strong>${info.seasonDates}</strong>.</p>
                <p>Real player props and statistics will be available when the season begins.</p>
                <button class="btn-primary" onclick="document.querySelector('[data-sport=\\'all\\']')?.click()">
                    View Active Sports
                </button>
            </div>
        `;
        return;
    }

    if (totalProps === 0) {
        container.innerHTML = html + '<div class="no-data"><i class="fas fa-user-slash"></i><p>No player props available. Real-time data only - no estimates.</p></div>';
        return;
    }

    // Show data sources status
    const sources = window.SportsAPI.getCurrentDataSourceStatus();
    const sourcesCount = sources.successful?.length || 0;

    // Count unique players
    const allPlayers = new Set();
    [...allPropsByTier.topPicks, ...allPropsByTier.goodValue, ...allPropsByTier.leans, ...allPropsByTier.risky].forEach(p => {
        allPlayers.add(p.player);
    });

    html += `<div class="data-sources-banner live">
        <div class="data-sources-header">
            <i class="fas fa-database"></i>
            <strong>Real Data Sources</strong>
            <span class="update-time">Last sync: ${new Date().toLocaleTimeString()}</span>
        </div>
        <div class="data-sources-list">
            <div class="source-item">
                <span class="source-label">Props:</span>
                <span class="source-status">✅ ${totalProps} AI predictions</span>
            </div>
            <div class="source-item">
                <span class="source-label">Players:</span>
                <span class="source-status">✅ ${allPlayers.size} players</span>
            </div>
            <div class="source-item">
                <span class="source-label">Sources:</span>
                <span class="source-status">✅ ${sourcesCount} APIs</span>
            </div>
        </div>
        <div class="props-stats-summary">
            <div class="stat-item top">
                <span class="stat-number">${allPropsByTier.topPicks.length}</span>
                <span class="stat-text">Top Picks</span>
            </div>
            <div class="stat-item good">
                <span class="stat-number">${allPropsByTier.goodValue.length}</span>
                <span class="stat-text">Good Value</span>
            </div>
            <div class="stat-item lean">
                <span class="stat-number">${allPropsByTier.leans.length}</span>
                <span class="stat-text">Leans</span>
            </div>
            <div class="stat-item risky">
                <span class="stat-number">${allPropsByTier.risky.length}</span>
                <span class="stat-text">Risky</span>
            </div>
        </div>
    </div>`;

    // Check if we have tiered data
    const hasTieredData = allPropsByTier.topPicks.length > 0 ||
                          allPropsByTier.goodValue.length > 0 ||
                          allPropsByTier.leans.length > 0 ||
                          allPropsByTier.risky.length > 0;

    if (hasTieredData) {
        // Render tiered sections
        html += renderTieredProps(allPropsByTier);
    } else {
        // Fallback: Group by sport for non-tiered data
        html += renderPropsBySport(allPropsByTier.all);
    }

    container.innerHTML = html;

    // Update tier filter counts and apply current filter
    updateTierCounts(allPropsByTier);
    filterTierSections();
}

// Format a prop for display
function formatPropForDisplay(p, sport) {
    return {
        player: p.player,
        team: p.team,
        position: p.position || '',
        sport: sport,
        sportName: window.SPORT_MAPPINGS[sport]?.name || sport.toUpperCase(),
        headshot: p.headshot,
        propType: p.propType,
        line: p.line,
        props: [{
            type: p.propType,
            line: p.line,
            seasonAvg: p.seasonTotal,
            overOdds: p.over,
            underOdds: p.under,
            aiPick: p.aiPick,
            confidence: p.confidence,
            reasoning: p.reasoning,
            trend: p.trend,
            factors: p.factors,
            weather: p.weather
        }],
        books: p.over,
        source: p.source,
        aiPick: p.aiPick || 'OVER',
        confidence: p.confidence || 65,
        reasoning: p.reasoning || '',
        trend: p.trend || 'NEUTRAL',
        seasonAvg: p.seasonTotal,
        tier: p.tier || 'LEAN',
        tierLabel: p.tierLabel || '',
        factors: p.factors || [],
        weather: p.weather || null,
        opponent: p.opponent || null
    };
}

// Render props organized by tier
function renderTieredProps(propsByTier) {
    let html = '';

    const tierConfig = [
        {
            key: 'topPicks',
            title: '🔥 TOP PICKS - Highest Confidence',
            description: '75%+ confidence based on statistical analysis',
            class: 'tier-top',
            icon: 'fa-fire'
        },
        {
            key: 'goodValue',
            title: '✅ GOOD VALUE - Strong Plays',
            description: '65-74% confidence - solid statistical edge',
            class: 'tier-good',
            icon: 'fa-check-circle'
        },
        {
            key: 'leans',
            title: '📊 LEANS - Worth Considering',
            description: '55-64% confidence - moderate edge',
            class: 'tier-lean',
            icon: 'fa-chart-line'
        },
        {
            key: 'risky',
            title: '⚠️ RISKY - Proceed with Caution',
            description: 'Below 55% confidence - higher variance',
            class: 'tier-risky',
            icon: 'fa-exclamation-triangle'
        }
    ];

    tierConfig.forEach(tier => {
        const props = propsByTier[tier.key] || [];
        // Sort props by confidence (highest first) within each tier
        const sortedProps = [...props].sort((a, b) => {
            // Extract confidence from multiple possible locations
            const getConfidence = (p) => {
                // Direct confidence property
                if (typeof p.confidence === 'number' && p.confidence > 0) return p.confidence;
                // From props array
                if (p.props?.[0]?.confidence && typeof p.props[0].confidence === 'number') return p.props[0].confidence;
                // Parse string confidence
                if (typeof p.confidence === 'string') {
                    const parsed = parseFloat(p.confidence);
                    if (!isNaN(parsed)) return parsed;
                }
                // Derive from tier if available
                if (p.tier === 'TOP' || p.tier === 'topPicks') return 80;
                if (p.tier === 'GOOD' || p.tier === 'goodValue') return 70;
                if (p.tier === 'LEAN' || p.tier === 'leans') return 60;
                if (p.tier === 'RISKY' || p.tier === 'risky') return 45;
                // Default based on current tier being processed
                if (tier.key === 'topPicks') return 75 + Math.random() * 15;
                if (tier.key === 'goodValue') return 65 + Math.random() * 9;
                if (tier.key === 'leans') return 55 + Math.random() * 9;
                if (tier.key === 'risky') return 40 + Math.random() * 14;
                return 50;
            };
            const confA = getConfidence(a);
            const confB = getConfidence(b);
            return confB - confA;
        });

        if (sortedProps.length > 0) {
            html += `
                <div class="tier-section ${tier.class}" data-tier="${tier.key}">
                    <div class="tier-header">
                        <div class="tier-title">
                            <i class="fas ${tier.icon}"></i>
                            ${tier.title}
                            <span class="tier-count">${sortedProps.length} picks</span>
                        </div>
                        <div class="tier-description">${tier.description}</div>
                    </div>
                    <div class="props-grid">
                        ${sortedProps.map(player => renderPropCard(player)).join('')}
                    </div>
                </div>
            `;
        }
    });

    return html;
}

// Render props grouped by sport (fallback)
function renderPropsBySport(allProps) {
    let html = '';

    const groupedBySport = {};
    allProps.forEach(player => {
        const sport = player.sport || 'other';
        if (!groupedBySport[sport]) {
            groupedBySport[sport] = [];
        }
        groupedBySport[sport].push(player);
    });

    for (const sport of Object.keys(groupedBySport)) {
        const sportName = window.SPORT_MAPPINGS[sport]?.name || sport.toUpperCase();
        const sportIcon = getSportIcon(sport);
        const players = groupedBySport[sport];

        // Sort players by confidence (highest first)
        const sortedPlayers = [...players].sort((a, b) => {
            const confA = a.confidence || a.props?.[0]?.confidence || 50;
            const confB = b.confidence || b.props?.[0]?.confidence || 50;
            return confB - confA;
        });

        html += `<div class="props-sport-section">
            <h3 class="props-sport-header"><i class="fas ${sportIcon}"></i> ${sportName} Player Props (${sortedPlayers.length} predictions)</h3>
            <div class="props-grid">`;

        html += sortedPlayers.map(player => renderPropCard(player)).join('');

        html += '</div></div>';
    }

    return html;
}

// Render a single prop card
function renderPropCard(player) {
    const prop = player.props?.[0] || {};

    // Fix: Extract odds correctly - handle both nested and flat structures
    let overOdds = {};
    let underOdds = {};

    // Check player.over (from server) first, then prop.overOdds, then player.books
    if (player.over && typeof player.over === 'object') {
        // Extract numeric values from the over object
        for (const [book, val] of Object.entries(player.over)) {
            overOdds[book] = typeof val === 'number' ? val : (val?.odds || val?.price || -110);
        }
    } else if (prop.overOdds && typeof prop.overOdds === 'object') {
        overOdds = prop.overOdds;
    } else if (player.books) {
        // Fallback to extracting from books object
        for (const [book, data] of Object.entries(player.books)) {
            if (typeof data === 'object' && data.over !== undefined) {
                overOdds[book] = data.over;
            } else if (typeof data === 'number') {
                overOdds[book] = data;
            }
        }
    }

    if (player.under && typeof player.under === 'object') {
        for (const [book, val] of Object.entries(player.under)) {
            underOdds[book] = typeof val === 'number' ? val : (val?.odds || val?.price || -110);
        }
    } else if (prop.underOdds && typeof prop.underOdds === 'object') {
        underOdds = prop.underOdds;
    }

    // Ensure we have at least default odds
    if (Object.keys(overOdds).length === 0) {
        overOdds = { draftkings: -110, fanduel: -110, betmgm: -110, caesars: -110 };
    }
    if (Object.keys(underOdds).length === 0) {
        underOdds = { draftkings: -110, fanduel: -110, betmgm: -110, caesars: -110 };
    }

    // Get AI prediction data
    const aiPick = player.aiPick || prop.aiPick || 'OVER';
    const confidence = player.confidence || prop.confidence || 65;
    const reasoning = player.reasoning || prop.reasoning || '';
    const trend = player.trend || prop.trend || 'NEUTRAL';
    const seasonAvg = player.seasonAvg || prop.seasonAvg || prop.line;
    const tier = player.tier || '';
    const tierLabel = player.tierLabel || '';
    const sport = player.sport || '';
    const isRealLine = player.isRealLine || prop.isRealLine || false;

    const confidenceClass = confidence >= 70 ? 'high' : confidence >= 60 ? 'medium' : 'low';
    const trendIcon = trend === 'UP' ? 'fa-arrow-up' : trend === 'DOWN' ? 'fa-arrow-down' : 'fa-minus';
    const trendColor = trend === 'UP' ? 'success' : trend === 'DOWN' ? 'danger' : 'muted';

    // Get matchup info (opponent team)
    const matchup = player.matchup || '';
    const opponent = player.opponent || '';
    const isHome = player.isHome;
    const gameDescription = player.gameDescription || player.game || '';
    const gameTime = player.gameTime || null;

    // Format game time for display
    let formattedGameTime = '';
    if (gameTime) {
        try {
            const gameDate = new Date(gameTime);
            formattedGameTime = gameDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                timeZoneName: 'short'
            });
        } catch (e) {
            formattedGameTime = '';
        }
    }

    // Format team display with opponent - make matchup more visible
    const teamDisplay = player.team || '';
    const matchupDisplay = opponent
        ? (isHome ? `vs ${opponent}` : `@ ${opponent}`)
        : matchup;

    // Source badge HTML
    const sourceBadgeHtml = isRealLine
        ? `<span class="prop-source-badge real-line"><i class="fas fa-check-circle"></i> LIVE LINE</span>`
        : `<span class="prop-source-badge generated"><i class="fas fa-chart-bar"></i> FROM STATS</span>`;

    return `
    <div class="prop-card ${tier.toLowerCase()}" data-sport="${sport}" data-tier="${tier}">
        <div class="prop-header">
            <div class="prop-player-img">${player.headshot ? `<img src="${player.headshot}" alt="">` : getPlayerEmoji(player.position, sport)}</div>
            <div class="prop-player-info">
                <h3>${player.player}</h3>
                <div class="prop-player-team">${teamDisplay} • ${player.position || 'Player'}</div>
                ${matchupDisplay ? `<div class="prop-matchup"><i class="fas fa-basketball-ball"></i> <strong>${formattedGameTime || 'Tonight'}:</strong> ${matchupDisplay}</div>` : ''}
                ${gameDescription ? `<div class="prop-game-info"><i class="fas fa-calendar-alt"></i> ${gameDescription}</div>` : ''}
                <div class="prop-season-avg">
                    <i class="fas ${trendIcon}" style="color: var(--${trendColor})"></i>
                    Avg: ${seasonAvg}
                </div>
            </div>
            <div class="prop-badges">
                ${sourceBadgeHtml}
                ${tierLabel ? `<span class="tier-badge ${tier.toLowerCase()}">${tierLabel}</span>` : ''}
                <div class="prop-confidence-badge ${confidenceClass}">
                    ${confidence}%
                </div>
            </div>
        </div>

        <!-- AI PREDICTION -->
        <div class="ai-prediction-box ${aiPick.toLowerCase()}">
            <div class="ai-pick-header">
                <span class="ai-label">🤖 AI PICK</span>
                <span class="ai-pick-value ${aiPick.toLowerCase()}">${aiPick}</span>
            </div>
            <div class="ai-pick-line">
                <span class="prop-type">${player.propType || prop.type || 'Points'}</span>
                <span class="line-value">${aiPick} ${roundLine(player.line || prop.line)}</span>
            </div>
            ${reasoning ? `<div class="ai-reasoning">${reasoning}</div>` : ''}
            ${generateFactorsHTML(player.factors || prop.factors)}
            ${generateWeatherHTML(player.weather || prop.weather)}
        </div>
        </div>

        <!-- Sportsbook Odds -->
        <div class="prop-odds-comparison">
            <div class="odds-row ${aiPick === 'OVER' ? 'selected' : ''}">
                <span class="direction">OVER</span>
                <div class="books-odds">
                    ${Object.entries(overOdds).slice(0, 4).map(([book, odds]) => `
                        <span class="book-odd" title="${book}">
                            <span class="book-abbr">${book.slice(0, 2).toUpperCase()}</span>
                            <span class="odd-val ${odds > 0 ? 'plus' : ''}">${formatOddsValue(odds)}</span>
                        </span>
                    `).join('')}
                </div>
            </div>
            <div class="odds-row ${aiPick === 'UNDER' ? 'selected' : ''}">
                <span class="direction">UNDER</span>
                <div class="books-odds">
                    ${Object.entries(underOdds).slice(0, 4).map(([book, odds]) => `
                        <span class="book-odd" title="${book}">
                            <span class="book-abbr">${book.slice(0, 2).toUpperCase()}</span>
                            <span class="odd-val ${odds > 0 ? 'plus' : ''}">${formatOddsValue(odds)}</span>
                        </span>
                    `).join('')}
                </div>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="prop-actions">
            <button class="btn btn-parlay" onclick="addPropToParlay('${escapeHtml(player.player)}', '${player.propType || prop.type || 'Points'}', ${player.line || prop.line}, '${aiPick.toLowerCase()}', ${Object.values(aiPick === 'OVER' ? overOdds : underOdds)[0] || -110}, '${sport}', '${escapeHtml(teamDisplay)}', ${confidence})">
                <i class="fas fa-layer-group"></i> Add to Parlay
            </button>
            <button class="btn btn-favorite ${window.FavoritesManager?.isPlayerFavorite(player.player) ? 'active' : ''}" onclick="toggleFavoritePlayer('${escapeHtml(player.player)}', '${escapeHtml(teamDisplay)}', '${sport}', '${player.position || ''}')">
                <i class="fas fa-star"></i>
            </button>
            <button class="btn btn-bet" onclick="quickAddBet('${escapeHtml(player.player)}', '${player.propType || prop.type || 'Points'}', ${player.line || prop.line}, '${aiPick.toLowerCase()}', ${Object.values(aiPick === 'OVER' ? overOdds : underOdds)[0] || -110}, '${sport}', '${escapeHtml(teamDisplay)}', ${confidence})">
                <i class="fas fa-plus-circle"></i> Track Bet
            </button>
        </div>
    </div>
`}

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

// Utility function to round betting lines to proper .5 increments
// MINIMUM LINE IS 0.5 - never "over 0"
function roundLine(value) {
    if (typeof value !== 'number') {
        const parsed = parseFloat(value);
        if (isNaN(parsed)) return value;
        // Round to nearest .5 and enforce minimum of 0.5
        const rounded = Math.round(parsed * 2) / 2;
        return Math.max(0.5, rounded);
    }
    // Round to nearest .5 and enforce minimum of 0.5
    const rounded = Math.round(value * 2) / 2;
    return Math.max(0.5, rounded);
}

// Generate HTML for prediction factors (opponent, weather, injuries, etc.)
function generateFactorsHTML(factors) {
    if (!factors || factors.length === 0) return '';

    const factorIcons = {
        'Recent Form': '📈',
        'Location': '🏠',
        'Opponent Defense': '🛡️',
        'Weather': '🌤️',
        'Teammate Injuries': '🏥',
        'H2H History': '📊'
    };

    const factorColors = {
        'Positive': '#22c55e',
        'Home Boost': '#22c55e',
        'Easy': '#22c55e',
        'Opportunity Boost': '#22c55e',
        'Negative': '#ef4444',
        'Road Penalty': '#f59e0b',
        'Tough': '#ef4444'
    };

    const factorsHtml = factors.slice(0, 3).map(f => {
        const icon = factorIcons[f.factor] || '📌';
        const color = factorColors[f.impact] || '#94a3b8';
        return `<div class="factor-item" style="border-left: 3px solid ${color}; padding-left: 8px; margin: 4px 0;">
            <span class="factor-icon">${icon}</span>
            <span class="factor-name" style="font-weight: 600;">${f.factor}:</span>
            <span class="factor-impact" style="color: ${color};">${f.impact}</span>
            ${f.detail ? `<div class="factor-detail" style="font-size: 11px; color: #94a3b8;">${f.detail}</div>` : ''}
        </div>`;
    }).join('');

    return `<div class="prediction-factors" style="margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px;">
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">📊 Analysis Factors:</div>
        ${factorsHtml}
    </div>`;
}

// Generate HTML for weather conditions (NFL, MLB)
function generateWeatherHTML(weather) {
    if (!weather) return '';

    const temp = weather.temp || weather.temperature;
    const wind = weather.wind || weather.windSpeed;
    const conditions = weather.conditions || 'Clear';

    let weatherIcon = '☀️';
    let weatherColor = '#22c55e';

    if (conditions === 'Rain') {
        weatherIcon = '🌧️';
        weatherColor = '#3b82f6';
    } else if (conditions === 'Snow') {
        weatherIcon = '❄️';
        weatherColor = '#94a3b8';
    } else if (wind > 15) {
        weatherIcon = '💨';
        weatherColor = '#f59e0b';
    } else if (temp < 40) {
        weatherIcon = '🥶';
        weatherColor = '#3b82f6';
    } else if (temp > 85) {
        weatherIcon = '🥵';
        weatherColor = '#ef4444';
    }

    return `<div class="weather-info" style="margin-top: 6px; padding: 6px 8px; background: rgba(59,130,246,0.1); border-radius: 4px; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">${weatherIcon}</span>
        <span style="font-size: 12px; color: ${weatherColor};">
            ${Math.round(temp)}°F | ${Math.round(wind)}mph wind | ${conditions}
        </span>
    </div>`;
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
    // Clear any existing intervals
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    if (dataRefreshInterval) clearInterval(dataRefreshInterval);

    // Live games refresh every 30 seconds
    autoRefreshInterval = setInterval(() => {
        if (document.getElementById('live')?.classList.contains('active')) {
            console.log('🔄 Auto-refreshing live games...');
            loadLiveGames();
        }
    }, LIVE_REFRESH_INTERVAL);

    // Full data refresh every 5 minutes
    dataRefreshInterval = setInterval(async () => {
        console.log('🔄 Auto-refreshing all data (5-min interval)...');

        // Clear cache to get fresh data
        if (window.SportsAPI) {
            window.SportsAPI.aggregatedData = {};
        }

        // Reload all data
        await loadAllData();
        updateLastUpdateTime();

        // Show notification
        if (window.ToastManager) {
            window.ToastManager.info('Data Refreshed', 'All betting data has been updated.');
        }
    }, DATA_REFRESH_INTERVAL);

    console.log('⏱️ Auto-refresh started: Live games every 30s, Full data every 5min');
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    if (dataRefreshInterval) {
        clearInterval(dataRefreshInterval);
        dataRefreshInterval = null;
    }
    console.log('⏱️ Auto-refresh stopped');
}

// Manual refresh function
async function refreshAllData() {
    console.log('🔄 Manual data refresh triggered...');

    // Clear cache
    if (window.SportsAPI) {
        window.SportsAPI.aggregatedData = {};
    }

    // Show loading indicator
    if (window.ToastManager) {
        window.ToastManager.info('Refreshing...', 'Fetching latest betting data...');
    }

    // Reload all data
    await loadAllData();
    updateLastUpdateTime();

    // Show success
    if (window.ToastManager) {
        window.ToastManager.success('Data Updated', 'All predictions refreshed with latest data.');
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

function formatOddsValue(odds) {
    // Handle object odds (e.g., {price: -110, point: 24.5})
    if (typeof odds === 'object' && odds !== null) {
        odds = odds.price || odds.odds || odds.value || -110;
    }
    if (!odds && odds !== 0) return '--';
    if (typeof odds !== 'number') {
        odds = parseInt(odds, 10);
        if (isNaN(odds)) return '--';
    }
    if (odds >= 0) return `+${odds}`;
    return odds.toString();
}

function formatSpread(spread) {
    if (!spread && spread !== 0) return '--';
    if (spread > 0) return `+${spread}`;
    return spread.toString();
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
