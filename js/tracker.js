// =====================================================
// BetGenius AI - Betting Tracker
// Track all bets, calculate ROI, and analyze performance
// =====================================================

class BettingTracker {
    constructor() {
        this.bets = this.loadBets();
        this.bankroll = this.loadBankroll();
        this.initialBankroll = this.bankroll.initial || 1000;
    }

    // =====================================================
    // BET MANAGEMENT
    // =====================================================

    // Add a new bet
    addBet(bet) {
        const newBet = {
            id: this.generateId(),
            type: bet.type || 'straight', // straight, parlay, teaser
            sport: bet.sport,
            player: bet.player,
            team: bet.team,
            propType: bet.propType,
            line: bet.line,
            pick: bet.pick, // over/under or team name
            odds: bet.odds,
            wager: bet.wager,
            potentialPayout: this.calculatePayout(bet.wager, bet.odds),
            sportsbook: bet.sportsbook || 'unknown',
            confidence: bet.confidence || 50,
            status: 'pending', // pending, won, lost, push, void
            placedAt: new Date().toISOString(),
            settledAt: null,
            actualPayout: null,
            notes: bet.notes || '',
            aiRecommended: bet.aiRecommended || false
        };

        this.bets.push(newBet);
        this.saveBets();
        this.updateBankroll(-newBet.wager);

        this.showToast(`Bet placed: $${newBet.wager} on ${newBet.player || newBet.team}`, 'success');
        return newBet;
    }

    // Settle a bet
    settleBet(betId, result, actualResult = null) {
        const bet = this.bets.find(b => b.id === betId);
        if (!bet) return null;

        bet.status = result;
        bet.settledAt = new Date().toISOString();
        bet.actualResult = actualResult;

        switch (result) {
            case 'won':
                bet.actualPayout = bet.potentialPayout;
                this.updateBankroll(bet.wager + bet.potentialPayout);
                break;
            case 'push':
                bet.actualPayout = 0;
                this.updateBankroll(bet.wager); // Return stake
                break;
            case 'lost':
                bet.actualPayout = -bet.wager;
                break;
            case 'void':
                bet.actualPayout = 0;
                this.updateBankroll(bet.wager); // Return stake
                break;
        }

        this.saveBets();
        this.trackAIPrediction(bet);

        const emoji = result === 'won' ? '🎉' : result === 'lost' ? '😔' : '↩️';
        this.showToast(`${emoji} Bet ${result}!`, result === 'won' ? 'success' : 'info');

        return bet;
    }

    // Delete a bet
    deleteBet(betId) {
        const index = this.bets.findIndex(b => b.id === betId);
        if (index !== -1) {
            const bet = this.bets[index];
            if (bet.status === 'pending') {
                this.updateBankroll(bet.wager); // Refund
            }
            this.bets.splice(index, 1);
            this.saveBets();
            this.showToast('Bet deleted', 'info');
        }
    }

    // =====================================================
    // PAYOUT CALCULATIONS
    // =====================================================

    calculatePayout(wager, odds) {
        if (odds > 0) {
            return wager * (odds / 100);
        } else {
            return wager * (100 / Math.abs(odds));
        }
    }

    // =====================================================
    // BANKROLL MANAGEMENT
    // =====================================================

    updateBankroll(amount) {
        this.bankroll.current += amount;
        this.bankroll.lastUpdated = new Date().toISOString();
        this.saveBankroll();
    }

    setBankroll(amount) {
        this.bankroll.current = amount;
        this.bankroll.initial = amount;
        this.initialBankroll = amount;
        this.bankroll.lastUpdated = new Date().toISOString();
        this.saveBankroll();
    }

    getBankroll() {
        return this.bankroll;
    }

    saveBankroll() {
        localStorage.setItem('betgenius_bankroll', JSON.stringify(this.bankroll));
    }

    loadBankroll() {
        try {
            const saved = localStorage.getItem('betgenius_bankroll');
            return saved ? JSON.parse(saved) : { current: 1000, initial: 1000, lastUpdated: null };
        } catch (e) {
            return { current: 1000, initial: 1000, lastUpdated: null };
        }
    }

    // =====================================================
    // STATISTICS & ANALYTICS
    // =====================================================

    getStats(filters = {}) {
        let filteredBets = [...this.bets];

        // Apply filters
        if (filters.sport) {
            filteredBets = filteredBets.filter(b => b.sport === filters.sport);
        }
        if (filters.propType) {
            filteredBets = filteredBets.filter(b => b.propType === filters.propType);
        }
        if (filters.sportsbook) {
            filteredBets = filteredBets.filter(b => b.sportsbook === filters.sportsbook);
        }
        if (filters.dateFrom) {
            filteredBets = filteredBets.filter(b => new Date(b.placedAt) >= new Date(filters.dateFrom));
        }
        if (filters.dateTo) {
            filteredBets = filteredBets.filter(b => new Date(b.placedAt) <= new Date(filters.dateTo));
        }

        const settled = filteredBets.filter(b => b.status !== 'pending' && b.status !== 'void');
        const won = settled.filter(b => b.status === 'won');
        const lost = settled.filter(b => b.status === 'lost');
        const pending = filteredBets.filter(b => b.status === 'pending');

        const totalWagered = settled.reduce((sum, b) => sum + b.wager, 0);
        const totalWon = won.reduce((sum, b) => sum + b.wager + b.potentialPayout, 0);
        const totalLost = lost.reduce((sum, b) => sum + b.wager, 0);
        const profit = totalWon - totalWagered;
        const roi = totalWagered > 0 ? (profit / totalWagered * 100) : 0;

        const pendingWager = pending.reduce((sum, b) => sum + b.wager, 0);
        const pendingPotential = pending.reduce((sum, b) => sum + b.potentialPayout, 0);

        // AI pick stats
        const aiPicks = settled.filter(b => b.aiRecommended);
        const aiWon = aiPicks.filter(b => b.status === 'won');
        const aiWinRate = aiPicks.length > 0 ? (aiWon.length / aiPicks.length * 100) : 0;

        return {
            total: filteredBets.length,
            pending: pending.length,
            settled: settled.length,
            won: won.length,
            lost: lost.length,
            winRate: settled.length > 0 ? (won.length / settled.length * 100) : 0,
            totalWagered: totalWagered,
            totalWon: totalWon,
            profit: profit,
            roi: roi,
            avgOdds: settled.length > 0 ? settled.reduce((sum, b) => sum + b.odds, 0) / settled.length : 0,
            avgWager: settled.length > 0 ? totalWagered / settled.length : 0,
            pendingWager: pendingWager,
            pendingPotential: pendingPotential,
            bankroll: this.bankroll.current,
            bankrollChange: this.bankroll.current - this.initialBankroll,
            aiPicks: aiPicks.length,
            aiWinRate: aiWinRate,
            streak: this.calculateStreak(settled)
        };
    }

    // Calculate current win/loss streak
    calculateStreak(settledBets) {
        if (settledBets.length === 0) return { type: null, count: 0 };

        const sorted = [...settledBets].sort((a, b) =>
            new Date(b.settledAt) - new Date(a.settledAt)
        );

        const streakType = sorted[0].status;
        let count = 0;

        for (const bet of sorted) {
            if (bet.status === streakType) {
                count++;
            } else {
                break;
            }
        }

        return { type: streakType, count: count };
    }

    // Get performance by sport
    getStatsBySport() {
        const sports = [...new Set(this.bets.map(b => b.sport).filter(Boolean))];
        const statsBySport = {};

        for (const sport of sports) {
            statsBySport[sport] = this.getStats({ sport });
        }

        return statsBySport;
    }

    // Get performance by prop type
    getStatsByPropType() {
        const propTypes = [...new Set(this.bets.map(b => b.propType).filter(Boolean))];
        const statsByProp = {};

        for (const propType of propTypes) {
            statsByProp[propType] = this.getStats({ propType });
        }

        return statsByProp;
    }

    // Get performance by sportsbook
    getStatsBySportsbook() {
        const books = [...new Set(this.bets.map(b => b.sportsbook).filter(Boolean))];
        const statsByBook = {};

        for (const book of books) {
            statsByBook[book] = this.getStats({ sportsbook: book });
        }

        return statsByBook;
    }

    // Get daily performance for charts
    getDailyPerformance(days = 30) {
        const now = new Date();
        const daily = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const dayBets = this.bets.filter(b => {
                const settledDate = b.settledAt ? new Date(b.settledAt) : null;
                return settledDate && settledDate >= date && settledDate < nextDate;
            });

            const profit = dayBets.reduce((sum, b) => {
                if (b.status === 'won') return sum + b.potentialPayout;
                if (b.status === 'lost') return sum - b.wager;
                return sum;
            }, 0);

            daily.push({
                date: date.toISOString().split('T')[0],
                profit: profit,
                bets: dayBets.length,
                won: dayBets.filter(b => b.status === 'won').length,
                lost: dayBets.filter(b => b.status === 'lost').length
            });
        }

        return daily;
    }

    // =====================================================
    // AI PREDICTION TRACKING
    // =====================================================

    trackAIPrediction(bet) {
        if (!bet.aiRecommended) return;

        const predictions = this.loadAIPredictions();

        predictions.push({
            id: bet.id,
            player: bet.player,
            propType: bet.propType,
            pick: bet.pick,
            line: bet.line,
            confidence: bet.confidence,
            predicted: bet.status === 'won',
            actual: bet.actualResult,
            settledAt: bet.settledAt
        });

        this.saveAIPredictions(predictions);
    }

    getAIPredictionAccuracy() {
        const predictions = this.loadAIPredictions();
        if (predictions.length === 0) return { overall: 0, byConfidence: {} };

        const correct = predictions.filter(p => p.predicted).length;
        const overall = (correct / predictions.length) * 100;

        // Group by confidence tier
        const tiers = {
            'high': predictions.filter(p => p.confidence >= 75),
            'medium': predictions.filter(p => p.confidence >= 60 && p.confidence < 75),
            'low': predictions.filter(p => p.confidence < 60)
        };

        const byConfidence = {};
        for (const [tier, preds] of Object.entries(tiers)) {
            if (preds.length > 0) {
                const tierCorrect = preds.filter(p => p.predicted).length;
                byConfidence[tier] = {
                    total: preds.length,
                    correct: tierCorrect,
                    accuracy: (tierCorrect / preds.length) * 100
                };
            }
        }

        return { overall, byConfidence, total: predictions.length };
    }

    saveAIPredictions(predictions) {
        localStorage.setItem('betgenius_ai_predictions', JSON.stringify(predictions));
    }

    loadAIPredictions() {
        try {
            const saved = localStorage.getItem('betgenius_ai_predictions');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    // =====================================================
    // PERSISTENCE
    // =====================================================

    saveBets() {
        localStorage.setItem('betgenius_bets', JSON.stringify(this.bets));
    }

    loadBets() {
        try {
            const saved = localStorage.getItem('betgenius_bets');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    // Export bets to JSON
    exportBets() {
        const data = {
            bets: this.bets,
            bankroll: this.bankroll,
            exportedAt: new Date().toISOString(),
            stats: this.getStats()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `betgenius_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();

        URL.revokeObjectURL(url);
        this.showToast('Betting history exported!', 'success');
    }

    // Import bets from JSON
    importBets(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.bets && Array.isArray(data.bets)) {
                this.bets = data.bets;
                this.saveBets();

                if (data.bankroll) {
                    this.bankroll = data.bankroll;
                    this.saveBankroll();
                }

                this.showToast(`Imported ${data.bets.length} bets!`, 'success');
                return true;
            }
        } catch (e) {
            this.showToast('Failed to import data', 'error');
        }
        return false;
    }

    // =====================================================
    // UI HELPERS
    // =====================================================

    // Get pending bets
    getPendingBets() {
        return this.bets.filter(b => b.status === 'pending')
            .sort((a, b) => new Date(a.placedAt) - new Date(b.placedAt));
    }

    // Get recent bets
    getRecentBets(limit = 20) {
        return [...this.bets]
            .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt))
            .slice(0, limit);
    }

    // Get today's bets
    getTodaysBets() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return this.bets.filter(b => new Date(b.placedAt) >= today);
    }

    // =====================================================
    // UTILITIES
    // =====================================================

    generateId() {
        return 'bet_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    }

    showToast(message, type = 'info') {
        if (window.ToastManager) {
            window.ToastManager.show(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    // Initialize
    init() {
        console.log('📊 Betting Tracker initialized');
        console.log(`   💰 Current bankroll: $${this.bankroll.current.toFixed(2)}`);
        console.log(`   📝 ${this.bets.length} total bets tracked`);
    }
}

// Initialize and export
window.BettingTracker = new BettingTracker();

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    window.BettingTracker.init();
});
