// =====================================================
// BetGenius AI - Parlay Builder
// Build and track multi-leg parlays with combined odds
// =====================================================

class ParlayBuilder {
    constructor() {
        this.legs = [];
        this.maxLegs = 15;
        this.savedParlays = this.loadSavedParlays();
        this.parlayHistory = this.loadParlayHistory();
    }

    // =====================================================
    // PARLAY MANAGEMENT
    // =====================================================

    // Add a leg to the parlay
    addLeg(prop) {
        if (this.legs.length >= this.maxLegs) {
            this.showToast('Maximum 15 legs allowed per parlay', 'warning');
            return false;
        }

        // Check if this prop is already in the parlay
        const exists = this.legs.find(leg =>
            leg.player === prop.player &&
            leg.propType === prop.propType &&
            leg.pick === prop.pick
        );

        if (exists) {
            this.showToast('This prop is already in your parlay', 'warning');
            return false;
        }

        const leg = {
            id: this.generateId(),
            player: prop.player,
            team: prop.team,
            sport: prop.sport,
            propType: prop.propType,
            line: prop.line,
            pick: prop.pick, // 'over' or 'under'
            odds: prop.odds,
            confidence: prop.confidence,
            addedAt: new Date().toISOString()
        };

        this.legs.push(leg);
        this.updateUI();
        this.saveTempParlay();
        this.showToast(`Added ${prop.player} ${prop.propType} to parlay`, 'success');
        return true;
    }

    // Remove a leg from the parlay
    removeLeg(legId) {
        const index = this.legs.findIndex(leg => leg.id === legId);
        if (index !== -1) {
            const removed = this.legs.splice(index, 1)[0];
            this.updateUI();
            this.saveTempParlay();
            this.showToast(`Removed ${removed.player} from parlay`, 'info');
        }
    }

    // Clear all legs
    clearParlay() {
        this.legs = [];
        this.updateUI();
        this.saveTempParlay();
        this.showToast('Parlay cleared', 'info');
    }

    // =====================================================
    // ODDS CALCULATION
    // =====================================================

    // Calculate combined parlay odds
    calculateParlayOdds() {
        if (this.legs.length === 0) return 0;

        // Convert American odds to decimal, multiply, convert back
        let combinedDecimal = 1;

        this.legs.forEach(leg => {
            const decimal = this.americanToDecimal(leg.odds);
            combinedDecimal *= decimal;
        });

        return this.decimalToAmerican(combinedDecimal);
    }

    // Calculate potential payout
    calculatePayout(wager) {
        const odds = this.calculateParlayOdds();
        if (odds > 0) {
            return wager * (odds / 100);
        } else {
            return wager * (100 / Math.abs(odds));
        }
    }

    // Calculate total potential return (wager + profit)
    calculateTotalReturn(wager) {
        return wager + this.calculatePayout(wager);
    }

    // American to decimal odds conversion
    americanToDecimal(american) {
        if (american > 0) {
            return (american / 100) + 1;
        } else {
            return (100 / Math.abs(american)) + 1;
        }
    }

    // Decimal to American odds conversion
    decimalToAmerican(decimal) {
        if (decimal >= 2) {
            return Math.round((decimal - 1) * 100);
        } else {
            return Math.round(-100 / (decimal - 1));
        }
    }

    // Calculate implied probability of parlay hitting
    calculateImpliedProbability() {
        if (this.legs.length === 0) return 0;

        let combinedProb = 1;
        this.legs.forEach(leg => {
            const prob = this.oddsToImpliedProbability(leg.odds);
            combinedProb *= prob;
        });

        return combinedProb;
    }

    // Convert odds to implied probability
    oddsToImpliedProbability(american) {
        if (american > 0) {
            return 100 / (american + 100);
        } else {
            return Math.abs(american) / (Math.abs(american) + 100);
        }
    }

    // Calculate AI confidence for the parlay
    calculateParlayConfidence() {
        if (this.legs.length === 0) return 0;

        // Average confidence across all legs
        const avgConfidence = this.legs.reduce((sum, leg) => sum + (leg.confidence || 50), 0) / this.legs.length;

        // Reduce confidence for more legs (parlays are harder to hit)
        const legPenalty = Math.pow(0.95, this.legs.length - 1);

        return Math.round(avgConfidence * legPenalty);
    }

    // =====================================================
    // SAVE & LOAD
    // =====================================================

    // Save current parlay to saved list
    saveParlay(name) {
        if (this.legs.length === 0) {
            this.showToast('Add legs to your parlay first', 'warning');
            return;
        }

        const parlay = {
            id: this.generateId(),
            name: name || `Parlay ${this.savedParlays.length + 1}`,
            legs: [...this.legs],
            odds: this.calculateParlayOdds(),
            confidence: this.calculateParlayConfidence(),
            createdAt: new Date().toISOString()
        };

        this.savedParlays.push(parlay);
        this.saveSavedParlays();
        this.showToast(`Parlay "${parlay.name}" saved!`, 'success');
        return parlay;
    }

    // Load a saved parlay
    loadParlay(parlayId) {
        const parlay = this.savedParlays.find(p => p.id === parlayId);
        if (parlay) {
            this.legs = [...parlay.legs];
            this.updateUI();
            this.showToast(`Loaded "${parlay.name}"`, 'success');
        }
    }

    // Delete a saved parlay
    deleteSavedParlay(parlayId) {
        const index = this.savedParlays.findIndex(p => p.id === parlayId);
        if (index !== -1) {
            const removed = this.savedParlays.splice(index, 1)[0];
            this.saveSavedParlays();
            this.showToast(`Deleted "${removed.name}"`, 'info');
        }
    }

    // Save parlays to localStorage
    saveSavedParlays() {
        localStorage.setItem('betgenius_saved_parlays', JSON.stringify(this.savedParlays));
    }

    // Load parlays from localStorage
    loadSavedParlays() {
        try {
            const saved = localStorage.getItem('betgenius_saved_parlays');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    // Save temp parlay (current working parlay)
    saveTempParlay() {
        localStorage.setItem('betgenius_temp_parlay', JSON.stringify(this.legs));
    }

    // Load temp parlay
    loadTempParlay() {
        try {
            const saved = localStorage.getItem('betgenius_temp_parlay');
            this.legs = saved ? JSON.parse(saved) : [];
            this.updateUI();
        } catch (e) {
            this.legs = [];
        }
    }

    // =====================================================
    // PARLAY HISTORY & TRACKING
    // =====================================================

    // Record a placed parlay
    placeParlay(wager) {
        if (this.legs.length === 0) return null;

        const parlay = {
            id: this.generateId(),
            legs: [...this.legs],
            wager: wager,
            odds: this.calculateParlayOdds(),
            potentialPayout: this.calculatePayout(wager),
            potentialReturn: this.calculateTotalReturn(wager),
            confidence: this.calculateParlayConfidence(),
            status: 'pending', // pending, won, lost, push
            placedAt: new Date().toISOString(),
            settledAt: null,
            result: null
        };

        this.parlayHistory.push(parlay);
        this.saveParlayHistory();
        this.clearParlay();
        this.showToast(`Parlay placed! Potential win: $${parlay.potentialPayout.toFixed(2)}`, 'success');
        return parlay;
    }

    // Update parlay result
    settleParlay(parlayId, status, result = null) {
        const parlay = this.parlayHistory.find(p => p.id === parlayId);
        if (parlay) {
            parlay.status = status;
            parlay.result = result;
            parlay.settledAt = new Date().toISOString();

            if (status === 'won') {
                parlay.actualPayout = parlay.potentialPayout;
            } else if (status === 'push') {
                parlay.actualPayout = parlay.wager;
            } else {
                parlay.actualPayout = 0;
            }

            this.saveParlayHistory();
            this.showToast(`Parlay ${status}!`, status === 'won' ? 'success' : 'info');
        }
    }

    // Get parlay statistics
    getParlayStats() {
        const settled = this.parlayHistory.filter(p => p.status !== 'pending');
        const won = settled.filter(p => p.status === 'won');
        const lost = settled.filter(p => p.status === 'lost');

        const totalWagered = settled.reduce((sum, p) => sum + p.wager, 0);
        const totalReturned = settled.reduce((sum, p) => sum + (p.actualPayout || 0), 0);
        const profit = totalReturned - totalWagered;
        const roi = totalWagered > 0 ? (profit / totalWagered * 100) : 0;

        return {
            total: this.parlayHistory.length,
            pending: this.parlayHistory.filter(p => p.status === 'pending').length,
            won: won.length,
            lost: lost.length,
            winRate: settled.length > 0 ? (won.length / settled.length * 100) : 0,
            totalWagered: totalWagered,
            totalReturned: totalReturned,
            profit: profit,
            roi: roi
        };
    }

    // Save parlay history to localStorage
    saveParlayHistory() {
        localStorage.setItem('betgenius_parlay_history', JSON.stringify(this.parlayHistory));
    }

    // Load parlay history from localStorage
    loadParlayHistory() {
        try {
            const saved = localStorage.getItem('betgenius_parlay_history');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    // =====================================================
    // UI METHODS
    // =====================================================

    // Update parlay UI
    updateUI() {
        this.renderParlaySlip();
        this.renderParlayButton();
    }

    // Render the parlay slip panel
    renderParlaySlip() {
        const container = document.getElementById('parlaySlip');
        if (!container) return;

        if (this.legs.length === 0) {
            container.innerHTML = `
                <div class="parlay-empty">
                    <i class="fas fa-layer-group"></i>
                    <p>Add props to build your parlay</p>
                    <span>Click "Add to Parlay" on any prop card</span>
                </div>
            `;
            return;
        }

        const odds = this.calculateParlayOdds();
        const confidence = this.calculateParlayConfidence();
        const impliedProb = this.calculateImpliedProbability();

        container.innerHTML = `
            <div class="parlay-header">
                <h3><i class="fas fa-layer-group"></i> ${this.legs.length}-Leg Parlay</h3>
                <button class="btn btn-sm btn-outline" onclick="window.ParlayBuilder.clearParlay()">
                    <i class="fas fa-trash"></i> Clear
                </button>
            </div>

            <div class="parlay-legs">
                ${this.legs.map(leg => this.renderLeg(leg)).join('')}
            </div>

            <div class="parlay-summary">
                <div class="parlay-odds">
                    <span class="label">Combined Odds</span>
                    <span class="value ${odds > 0 ? 'positive' : 'negative'}">${odds > 0 ? '+' : ''}${odds}</span>
                </div>
                <div class="parlay-confidence">
                    <span class="label">AI Confidence</span>
                    <span class="value ${confidence >= 70 ? 'high' : confidence >= 50 ? 'medium' : 'low'}">${confidence}%</span>
                </div>
                <div class="parlay-probability">
                    <span class="label">Implied Probability</span>
                    <span class="value">${(impliedProb * 100).toFixed(2)}%</span>
                </div>
            </div>

            <div class="parlay-wager">
                <label>Wager Amount</label>
                <div class="wager-input-group">
                    <span class="currency">$</span>
                    <input type="number" id="parlayWager" value="10" min="1" step="1" onchange="window.ParlayBuilder.updatePayoutPreview()">
                </div>
                <div class="payout-preview">
                    <span>Potential Win:</span>
                    <span class="payout-amount" id="payoutPreview">$${this.calculatePayout(10).toFixed(2)}</span>
                </div>
            </div>

            <div class="parlay-actions">
                <button class="btn btn-primary btn-block" onclick="window.ParlayBuilder.showPlaceModal()">
                    <i class="fas fa-check-circle"></i> Place Parlay
                </button>
                <button class="btn btn-outline btn-block" onclick="window.ParlayBuilder.showSaveModal()">
                    <i class="fas fa-save"></i> Save for Later
                </button>
            </div>
        `;
    }

    // Render a single parlay leg
    renderLeg(leg) {
        return `
            <div class="parlay-leg" data-id="${leg.id}">
                <div class="leg-info">
                    <span class="leg-player">${leg.player}</span>
                    <span class="leg-detail">${leg.propType} ${leg.pick.toUpperCase()} ${leg.line}</span>
                    <span class="leg-team">${leg.team || ''} • ${leg.sport.toUpperCase()}</span>
                </div>
                <div class="leg-odds ${leg.odds > 0 ? 'positive' : 'negative'}">
                    ${leg.odds > 0 ? '+' : ''}${leg.odds}
                </div>
                <button class="leg-remove" onclick="window.ParlayBuilder.removeLeg('${leg.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }

    // Render the parlay button (shows count)
    renderParlayButton() {
        const btn = document.getElementById('parlayToggleBtn');
        if (!btn) return;

        const count = this.legs.length;
        if (count > 0) {
            btn.innerHTML = `<i class="fas fa-layer-group"></i> Parlay <span class="parlay-count">${count}</span>`;
            btn.classList.add('has-legs');
        } else {
            btn.innerHTML = `<i class="fas fa-layer-group"></i> Parlay`;
            btn.classList.remove('has-legs');
        }
    }

    // Update payout preview
    updatePayoutPreview() {
        const wagerInput = document.getElementById('parlayWager');
        const payoutEl = document.getElementById('payoutPreview');
        if (wagerInput && payoutEl) {
            const wager = parseFloat(wagerInput.value) || 0;
            const payout = this.calculatePayout(wager);
            payoutEl.textContent = `$${payout.toFixed(2)}`;
        }
    }

    // Show save parlay modal
    showSaveModal() {
        const name = prompt('Name your parlay:', `${this.legs.length}-Leg Parlay`);
        if (name) {
            this.saveParlay(name);
        }
    }

    // Show place parlay modal
    showPlaceModal() {
        const wagerInput = document.getElementById('parlayWager');
        const wager = parseFloat(wagerInput?.value) || 10;

        if (confirm(`Place ${this.legs.length}-leg parlay with $${wager} wager?\n\nPotential win: $${this.calculatePayout(wager).toFixed(2)}`)) {
            this.placeParlay(wager);
        }
    }

    // Toggle parlay panel visibility
    togglePanel() {
        const panel = document.getElementById('parlayPanel');
        if (panel) {
            panel.classList.toggle('open');
        }
    }

    // =====================================================
    // UTILITIES
    // =====================================================

    generateId() {
        return 'parlay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    }

    showToast(message, type = 'info') {
        if (window.ToastManager) {
            window.ToastManager.show(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    // Initialize the parlay builder
    init() {
        this.loadTempParlay();
        this.updateUI();
        console.log('🎯 Parlay Builder initialized');
    }
}

// Initialize and export
window.ParlayBuilder = new ParlayBuilder();

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    window.ParlayBuilder.init();
});
