// =====================================================
// BetGenius AI - Favorites Manager
// Save and track favorite players, props, and teams
// =====================================================

class FavoritesManager {
    constructor() {
        this.favorites = this.loadFavorites();
        this.watchlist = this.loadWatchlist();
        this.alerts = this.loadAlerts();
    }

    // =====================================================
    // FAVORITE PLAYERS
    // =====================================================

    // Add a player to favorites
    addFavoritePlayer(player) {
        if (this.favorites.players.find(p => p.name === player.name)) {
            this.showToast(`${player.name} is already in favorites`, 'warning');
            return false;
        }

        const favorite = {
            id: this.generateId(),
            name: player.name,
            team: player.team,
            sport: player.sport,
            position: player.position,
            headshot: player.headshot,
            addedAt: new Date().toISOString()
        };

        this.favorites.players.push(favorite);
        this.saveFavorites();
        this.showToast(`⭐ ${player.name} added to favorites`, 'success');
        return true;
    }

    // Remove a player from favorites
    removeFavoritePlayer(playerName) {
        const index = this.favorites.players.findIndex(p => p.name === playerName);
        if (index !== -1) {
            this.favorites.players.splice(index, 1);
            this.saveFavorites();
            this.showToast(`Removed ${playerName} from favorites`, 'info');
            return true;
        }
        return false;
    }

    // Check if player is favorited
    isPlayerFavorite(playerName) {
        return this.favorites.players.some(p => p.name === playerName);
    }

    // Toggle favorite status
    toggleFavoritePlayer(player) {
        if (this.isPlayerFavorite(player.name)) {
            return this.removeFavoritePlayer(player.name);
        } else {
            return this.addFavoritePlayer(player);
        }
    }

    // Get all favorite players
    getFavoritePlayers(sport = null) {
        if (sport) {
            return this.favorites.players.filter(p => p.sport === sport);
        }
        return this.favorites.players;
    }

    // =====================================================
    // FAVORITE TEAMS
    // =====================================================

    addFavoriteTeam(team) {
        if (this.favorites.teams.find(t => t.abbr === team.abbr && t.sport === team.sport)) {
            this.showToast(`${team.name} is already in favorites`, 'warning');
            return false;
        }

        const favorite = {
            id: this.generateId(),
            name: team.name,
            abbr: team.abbr,
            sport: team.sport,
            logo: team.logo,
            addedAt: new Date().toISOString()
        };

        this.favorites.teams.push(favorite);
        this.saveFavorites();
        this.showToast(`⭐ ${team.name} added to favorites`, 'success');
        return true;
    }

    removeFavoriteTeam(teamAbbr, sport) {
        const index = this.favorites.teams.findIndex(t => t.abbr === teamAbbr && t.sport === sport);
        if (index !== -1) {
            const team = this.favorites.teams[index];
            this.favorites.teams.splice(index, 1);
            this.saveFavorites();
            this.showToast(`Removed ${team.name} from favorites`, 'info');
            return true;
        }
        return false;
    }

    isTeamFavorite(teamAbbr, sport) {
        return this.favorites.teams.some(t => t.abbr === teamAbbr && t.sport === sport);
    }

    getFavoriteTeams(sport = null) {
        if (sport) {
            return this.favorites.teams.filter(t => t.sport === sport);
        }
        return this.favorites.teams;
    }

    // =====================================================
    // WATCHLIST (Props to Watch)
    // =====================================================

    // Add a prop to watchlist
    addToWatchlist(prop) {
        const key = `${prop.player}_${prop.propType}_${prop.sport}`;

        if (this.watchlist.find(w => w.key === key)) {
            this.showToast('This prop is already in your watchlist', 'warning');
            return false;
        }

        const watchItem = {
            id: this.generateId(),
            key: key,
            player: prop.player,
            team: prop.team,
            sport: prop.sport,
            propType: prop.propType,
            targetLine: prop.line,
            targetPick: prop.pick, // over or under
            targetOdds: prop.odds,
            notes: prop.notes || '',
            addedAt: new Date().toISOString(),
            lastChecked: null,
            currentLine: null,
            priceAlert: prop.priceAlert || false, // Alert if line moves
            alertThreshold: prop.alertThreshold || 0.5 // Alert if line moves by this much
        };

        this.watchlist.push(watchItem);
        this.saveWatchlist();
        this.showToast(`👁️ Added ${prop.player} ${prop.propType} to watchlist`, 'success');
        return true;
    }

    // Remove from watchlist
    removeFromWatchlist(watchId) {
        const index = this.watchlist.findIndex(w => w.id === watchId);
        if (index !== -1) {
            const item = this.watchlist[index];
            this.watchlist.splice(index, 1);
            this.saveWatchlist();
            this.showToast(`Removed ${item.player} from watchlist`, 'info');
            return true;
        }
        return false;
    }

    // Check if prop is in watchlist
    isInWatchlist(player, propType, sport) {
        const key = `${player}_${propType}_${sport}`;
        return this.watchlist.some(w => w.key === key);
    }

    // Get watchlist items
    getWatchlist(sport = null) {
        if (sport) {
            return this.watchlist.filter(w => w.sport === sport);
        }
        return this.watchlist;
    }

    // Update watchlist item with current line
    updateWatchlistLine(watchId, currentLine, currentOdds) {
        const item = this.watchlist.find(w => w.id === watchId);
        if (item) {
            const lineMoved = Math.abs(currentLine - item.targetLine);

            item.currentLine = currentLine;
            item.currentOdds = currentOdds;
            item.lastChecked = new Date().toISOString();
            item.lineMoved = lineMoved;

            // Check if alert should fire
            if (item.priceAlert && lineMoved >= item.alertThreshold) {
                this.triggerLineAlert(item, lineMoved);
            }

            this.saveWatchlist();
        }
    }

    // =====================================================
    // ALERTS
    // =====================================================

    // Create a new alert
    createAlert(config) {
        const alert = {
            id: this.generateId(),
            type: config.type, // 'line_move', 'confidence', 'game_start', 'injury'
            player: config.player,
            team: config.team,
            sport: config.sport,
            propType: config.propType,
            condition: config.condition, // e.g., 'line_below', 'confidence_above'
            threshold: config.threshold,
            enabled: true,
            triggered: false,
            triggeredAt: null,
            createdAt: new Date().toISOString()
        };

        this.alerts.push(alert);
        this.saveAlerts();
        this.showToast(`🔔 Alert created for ${config.player || config.team}`, 'success');
        return alert;
    }

    // Delete an alert
    deleteAlert(alertId) {
        const index = this.alerts.findIndex(a => a.id === alertId);
        if (index !== -1) {
            this.alerts.splice(index, 1);
            this.saveAlerts();
            return true;
        }
        return false;
    }

    // Toggle alert enabled status
    toggleAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.enabled = !alert.enabled;
            this.saveAlerts();
            return alert.enabled;
        }
        return null;
    }

    // Check all alerts
    checkAlerts(propsData) {
        const triggeredAlerts = [];

        for (const alert of this.alerts) {
            if (!alert.enabled || alert.triggered) continue;

            let triggered = false;

            // Find matching prop
            const prop = propsData.find(p =>
                p.player === alert.player &&
                (!alert.propType || p.propType === alert.propType)
            );

            if (!prop) continue;

            switch (alert.type) {
                case 'line_move':
                    if (alert.condition === 'line_below' && prop.line < alert.threshold) {
                        triggered = true;
                    } else if (alert.condition === 'line_above' && prop.line > alert.threshold) {
                        triggered = true;
                    }
                    break;

                case 'confidence':
                    if (alert.condition === 'confidence_above' && prop.confidence >= alert.threshold) {
                        triggered = true;
                    }
                    break;

                case 'odds_change':
                    if (alert.condition === 'odds_above' && prop.odds > alert.threshold) {
                        triggered = true;
                    }
                    break;
            }

            if (triggered) {
                alert.triggered = true;
                alert.triggeredAt = new Date().toISOString();
                triggeredAlerts.push({ alert, prop });
            }
        }

        if (triggeredAlerts.length > 0) {
            this.saveAlerts();
            this.notifyAlerts(triggeredAlerts);
        }

        return triggeredAlerts;
    }

    // Send alert notifications
    notifyAlerts(triggeredAlerts) {
        for (const { alert, prop } of triggeredAlerts) {
            const message = this.formatAlertMessage(alert, prop);
            this.showToast(message, 'warning', 10000);

            // Try to send browser notification
            this.sendBrowserNotification(alert, prop);
        }
    }

    // Format alert message
    formatAlertMessage(alert, prop) {
        switch (alert.type) {
            case 'line_move':
                return `🔔 ${prop.player} ${prop.propType} line is now ${prop.line}!`;
            case 'confidence':
                return `🔥 ${prop.player} ${prop.propType} confidence is ${prop.confidence}%!`;
            case 'odds_change':
                return `💰 ${prop.player} ${prop.propType} odds are now ${prop.odds}!`;
            default:
                return `🔔 Alert triggered for ${prop.player}`;
        }
    }

    // Browser notification
    async sendBrowserNotification(alert, prop) {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            new Notification('BetGenius AI Alert', {
                body: this.formatAlertMessage(alert, prop),
                icon: '/favicon.ico',
                tag: alert.id
            });
        } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.sendBrowserNotification(alert, prop);
            }
        }
    }

    // Trigger line movement alert
    triggerLineAlert(watchItem, lineMoved) {
        const direction = watchItem.currentLine > watchItem.targetLine ? 'up' : 'down';
        const message = `📊 ${watchItem.player} ${watchItem.propType} line moved ${direction} to ${watchItem.currentLine} (was ${watchItem.targetLine})`;
        this.showToast(message, 'warning', 8000);
    }

    // Get active alerts
    getAlerts(filters = {}) {
        let filtered = [...this.alerts];

        if (filters.sport) {
            filtered = filtered.filter(a => a.sport === filters.sport);
        }
        if (filters.enabled !== undefined) {
            filtered = filtered.filter(a => a.enabled === filters.enabled);
        }
        if (filters.triggered !== undefined) {
            filtered = filtered.filter(a => a.triggered === filters.triggered);
        }

        return filtered;
    }

    // =====================================================
    // PERSISTENCE
    // =====================================================

    saveFavorites() {
        localStorage.setItem('betgenius_favorites', JSON.stringify(this.favorites));
    }

    loadFavorites() {
        try {
            const saved = localStorage.getItem('betgenius_favorites');
            return saved ? JSON.parse(saved) : { players: [], teams: [] };
        } catch (e) {
            return { players: [], teams: [] };
        }
    }

    saveWatchlist() {
        localStorage.setItem('betgenius_watchlist', JSON.stringify(this.watchlist));
    }

    loadWatchlist() {
        try {
            const saved = localStorage.getItem('betgenius_watchlist');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    saveAlerts() {
        localStorage.setItem('betgenius_alerts', JSON.stringify(this.alerts));
    }

    loadAlerts() {
        try {
            const saved = localStorage.getItem('betgenius_alerts');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    // Export all favorites data
    exportData() {
        const data = {
            favorites: this.favorites,
            watchlist: this.watchlist,
            alerts: this.alerts,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `betgenius_favorites_${new Date().toISOString().split('T')[0]}.json`;
        a.click();

        URL.revokeObjectURL(url);
        this.showToast('Favorites exported!', 'success');
    }

    // Import favorites data
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);

            if (data.favorites) {
                this.favorites = data.favorites;
                this.saveFavorites();
            }
            if (data.watchlist) {
                this.watchlist = data.watchlist;
                this.saveWatchlist();
            }
            if (data.alerts) {
                this.alerts = data.alerts;
                this.saveAlerts();
            }

            this.showToast('Favorites imported!', 'success');
            return true;
        } catch (e) {
            this.showToast('Failed to import data', 'error');
            return false;
        }
    }

    // =====================================================
    // UTILITIES
    // =====================================================

    generateId() {
        return 'fav_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    }

    showToast(message, type = 'info', duration = 3000) {
        if (window.ToastManager) {
            window.ToastManager.show(message, type, duration);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    // Get summary stats
    getStats() {
        return {
            favoritePlayers: this.favorites.players.length,
            favoriteTeams: this.favorites.teams.length,
            watchlistItems: this.watchlist.length,
            activeAlerts: this.alerts.filter(a => a.enabled && !a.triggered).length,
            triggeredAlerts: this.alerts.filter(a => a.triggered).length
        };
    }

    // Initialize
    init() {
        const stats = this.getStats();
        console.log('⭐ Favorites Manager initialized');
        console.log(`   👤 ${stats.favoritePlayers} favorite players`);
        console.log(`   🏀 ${stats.favoriteTeams} favorite teams`);
        console.log(`   👁️ ${stats.watchlistItems} watchlist items`);
        console.log(`   🔔 ${stats.activeAlerts} active alerts`);

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
}

// Initialize and export
window.FavoritesManager = new FavoritesManager();

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    window.FavoritesManager.init();
});
