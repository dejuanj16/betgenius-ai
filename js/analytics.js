// =====================================================
// BetGenius AI - Analytics & Tracking
// Monitor user engagement and feature usage
// =====================================================

class BetGeniusAnalytics {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.sessionStart = Date.now();
        this.events = [];
        this.storageKey = 'betgenius_analytics';
        this.apiEndpoint = '/api/analytics'; // Optional backend endpoint

        // Load existing data
        this.loadStoredData();

        // Track session start
        this.trackEvent('session_start', {
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });

        // Track page visibility changes
        this.setupVisibilityTracking();

        // Auto-save on page unload
        window.addEventListener('beforeunload', () => this.saveAndSync());

        console.log('📊 Analytics initialized', { sessionId: this.sessionId });
    }

    // =====================================================
    // Session Management
    // =====================================================

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getSessionDuration() {
        return Math.round((Date.now() - this.sessionStart) / 1000); // seconds
    }

    // =====================================================
    // Event Tracking
    // =====================================================

    trackEvent(eventName, properties = {}) {
        const event = {
            event: eventName,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            properties: {
                ...properties,
                sessionDuration: this.getSessionDuration(),
                page: window.location.pathname,
                url: window.location.href
            }
        };

        this.events.push(event);
        console.log('📊 Event tracked:', eventName, properties);

        // Store locally
        this.saveToLocalStorage();

        return event;
    }

    // =====================================================
    // Feature-Specific Tracking
    // =====================================================

    // Track page/tab views
    trackPageView(pageName) {
        return this.trackEvent('page_view', { pageName });
    }

    // Track sport filter changes
    trackSportFilter(sport) {
        return this.trackEvent('sport_filter', { sport });
    }

    // Track tier filter changes
    trackTierFilter(tier) {
        return this.trackEvent('tier_filter', { tier });
    }

    // Track game click (Today's Games)
    trackGameClick(sport, matchup, teams) {
        return this.trackEvent('game_click', { sport, matchup, teams });
    }

    // Track prop card view/click
    trackPropView(prop) {
        return this.trackEvent('prop_view', {
            player: prop.player,
            team: prop.team,
            sport: prop.sport,
            propType: prop.propType,
            confidence: prop.confidence,
            pick: prop.pick,
            line: prop.line
        });
    }

    // Track prop added to parlay
    trackParlayAdd(prop) {
        return this.trackEvent('parlay_add', {
            player: prop.player,
            propType: prop.propType,
            confidence: prop.confidence,
            parlaySize: window.ParlayBuilder?.legs?.length || 1
        });
    }

    // Track parlay removed
    trackParlayRemove(prop) {
        return this.trackEvent('parlay_remove', {
            player: prop.player,
            propType: prop.propType
        });
    }

    // Track parlay cleared
    trackParlayClear(legCount) {
        return this.trackEvent('parlay_clear', { legCount });
    }

    // Track notification enabled
    trackNotificationEnabled() {
        return this.trackEvent('notification_enabled');
    }

    // Track notification clicked
    trackNotificationClicked(propId) {
        return this.trackEvent('notification_clicked', { propId });
    }

    // Track search
    trackSearch(query, resultCount) {
        return this.trackEvent('search', { query, resultCount });
    }

    // Track favorite added
    trackFavoriteAdd(player, propType) {
        return this.trackEvent('favorite_add', { player, propType });
    }

    // Track favorite removed
    trackFavoriteRemove(player, propType) {
        return this.trackEvent('favorite_remove', { player, propType });
    }

    // Track schedule loaded
    trackScheduleLoaded(gameCount, sports) {
        return this.trackEvent('schedule_loaded', { gameCount, sports });
    }

    // Track error
    trackError(errorType, errorMessage, context = {}) {
        return this.trackEvent('error', { errorType, errorMessage, ...context });
    }

    // =====================================================
    // Visibility Tracking
    // =====================================================

    setupVisibilityTracking() {
        let hiddenTime = null;

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                hiddenTime = Date.now();
                this.trackEvent('page_hidden');
            } else {
                const awayDuration = hiddenTime ? Math.round((Date.now() - hiddenTime) / 1000) : 0;
                this.trackEvent('page_visible', { awayDuration });
            }
        });
    }

    // =====================================================
    // Data Storage & Sync
    // =====================================================

    loadStoredData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.historicalData = data;
            } else {
                this.historicalData = {
                    totalSessions: 0,
                    totalEvents: 0,
                    firstVisit: Date.now(),
                    lastVisit: Date.now(),
                    featureUsage: {},
                    dailyStats: {}
                };
            }
            this.historicalData.totalSessions++;
            this.historicalData.lastVisit = Date.now();
        } catch (e) {
            console.warn('Failed to load analytics data:', e);
            this.historicalData = { totalSessions: 1, totalEvents: 0, firstVisit: Date.now() };
        }
    }

    saveToLocalStorage() {
        try {
            // Update historical data
            this.historicalData.totalEvents++;
            this.historicalData.lastVisit = Date.now();

            // Update feature usage counts
            const lastEvent = this.events[this.events.length - 1];
            if (lastEvent) {
                const eventType = lastEvent.event;
                this.historicalData.featureUsage[eventType] =
                    (this.historicalData.featureUsage[eventType] || 0) + 1;
            }

            // Update daily stats
            const today = new Date().toISOString().split('T')[0];
            if (!this.historicalData.dailyStats[today]) {
                this.historicalData.dailyStats[today] = { events: 0, sessions: 1 };
            }
            this.historicalData.dailyStats[today].events++;

            // Keep only last 30 days
            const dates = Object.keys(this.historicalData.dailyStats).sort();
            if (dates.length > 30) {
                dates.slice(0, dates.length - 30).forEach(d => {
                    delete this.historicalData.dailyStats[d];
                });
            }

            localStorage.setItem(this.storageKey, JSON.stringify(this.historicalData));
        } catch (e) {
            console.warn('Failed to save analytics:', e);
        }
    }

    saveAndSync() {
        // Track session end
        this.trackEvent('session_end', {
            duration: this.getSessionDuration(),
            eventCount: this.events.length
        });

        this.saveToLocalStorage();

        // Optional: Send to backend
        this.syncToBackend();
    }

    async syncToBackend() {
        // Only sync if we have an endpoint and events
        if (!this.apiEndpoint || this.events.length === 0) return;

        try {
            // Use sendBeacon for reliable delivery on page unload
            const data = JSON.stringify({
                sessionId: this.sessionId,
                events: this.events,
                summary: this.getSessionSummary()
            });

            if (navigator.sendBeacon) {
                navigator.sendBeacon(this.apiEndpoint, data);
            } else {
                // Fallback to fetch
                fetch(this.apiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: data,
                    keepalive: true
                }).catch(() => {});
            }
        } catch (e) {
            // Silent fail - analytics shouldn't break the app
        }
    }

    // =====================================================
    // Analytics Dashboard Data
    // =====================================================

    getSessionSummary() {
        const eventCounts = {};
        this.events.forEach(e => {
            eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
        });

        return {
            sessionId: this.sessionId,
            duration: this.getSessionDuration(),
            eventCount: this.events.length,
            eventTypes: eventCounts,
            timestamp: Date.now()
        };
    }

    getAnalyticsDashboard() {
        const data = this.historicalData;
        const featureUsage = data.featureUsage || {};

        return {
            overview: {
                totalSessions: data.totalSessions || 0,
                totalEvents: data.totalEvents || 0,
                firstVisit: data.firstVisit ? new Date(data.firstVisit).toLocaleDateString() : 'N/A',
                lastVisit: data.lastVisit ? new Date(data.lastVisit).toLocaleDateString() : 'N/A',
                currentSessionDuration: this.getSessionDuration() + 's'
            },
            featureUsage: {
                propsViewed: featureUsage.prop_view || 0,
                parlayAdds: featureUsage.parlay_add || 0,
                gameClicks: featureUsage.game_click || 0,
                searches: featureUsage.search || 0,
                sportFilters: featureUsage.sport_filter || 0,
                tierFilters: featureUsage.tier_filter || 0,
                notificationsEnabled: featureUsage.notification_enabled || 0,
                favoritesAdded: featureUsage.favorite_add || 0
            },
            topFeatures: Object.entries(featureUsage)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([feature, count]) => ({ feature, count })),
            dailyStats: data.dailyStats || {},
            currentSession: this.getSessionSummary()
        };
    }

    // Print dashboard to console
    printDashboard() {
        const dashboard = this.getAnalyticsDashboard();
        console.log('📊 ============ ANALYTICS DASHBOARD ============');
        console.log('');
        console.log('📈 OVERVIEW:');
        console.table(dashboard.overview);
        console.log('');
        console.log('🎯 FEATURE USAGE:');
        console.table(dashboard.featureUsage);
        console.log('');
        console.log('🔥 TOP FEATURES:');
        console.table(dashboard.topFeatures);
        console.log('');
        console.log('📅 DAILY STATS (Last 7 days):');
        const last7Days = Object.entries(dashboard.dailyStats)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .slice(0, 7);
        console.table(Object.fromEntries(last7Days));
        console.log('================================================');

        return dashboard;
    }

    // Reset all analytics data
    resetAnalytics() {
        localStorage.removeItem(this.storageKey);
        this.events = [];
        this.historicalData = {
            totalSessions: 1,
            totalEvents: 0,
            firstVisit: Date.now(),
            lastVisit: Date.now(),
            featureUsage: {},
            dailyStats: {}
        };
        console.log('📊 Analytics data reset');
    }
}

// =====================================================
// Initialize and Export
// =====================================================

window.BetGeniusAnalytics = new BetGeniusAnalytics();

// Convenience functions
window.trackEvent = (name, props) => window.BetGeniusAnalytics.trackEvent(name, props);
window.trackPropView = (prop) => window.BetGeniusAnalytics.trackPropView(prop);
window.trackParlayAdd = (prop) => window.BetGeniusAnalytics.trackParlayAdd(prop);
window.trackGameClick = (sport, matchup, teams) => window.BetGeniusAnalytics.trackGameClick(sport, matchup, teams);
window.showAnalytics = () => window.BetGeniusAnalytics.printDashboard();
window.resetAnalytics = () => window.BetGeniusAnalytics.resetAnalytics();

console.log('📊 Analytics module loaded. Run showAnalytics() to view dashboard.');
