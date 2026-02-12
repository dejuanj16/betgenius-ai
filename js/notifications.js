// =====================================================
// BetGenius AI - Push Notifications
// Alerts for high-confidence props (75%+)
// =====================================================

class NotificationManager {
    constructor() {
        this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
        this.permission = this.isSupported ? Notification.permission : 'denied';
        this.enabled = localStorage.getItem('notificationsEnabled') === 'true';
        this.checkInterval = null;
        this.lastNotifiedProps = new Set(JSON.parse(localStorage.getItem('lastNotifiedProps') || '[]'));
        this.confidenceThreshold = 75; // Only notify for 75%+ confidence

        // Notification settings
        this.settings = {
            highConfidence: true,  // 75%+ picks
            lineMovement: true,    // Significant line changes
            gameStart: false,      // 30 min before game
            ...JSON.parse(localStorage.getItem('notificationSettings') || '{}')
        };

        console.log('🔔 NotificationManager initialized', {
            supported: this.isSupported,
            permission: this.permission,
            enabled: this.enabled
        });
    }

    // =====================================================
    // Permission Management
    // =====================================================

    async requestPermission() {
        if (!this.isSupported) {
            console.warn('Push notifications not supported');
            this.showToast('Push notifications are not supported in this browser', 'warning');
            return false;
        }

        try {
            const result = await Notification.requestPermission();
            this.permission = result;

            if (result === 'granted') {
                this.enabled = true;
                localStorage.setItem('notificationsEnabled', 'true');
                this.showToast('🔔 Notifications enabled! You\'ll get alerts for 75%+ picks', 'success');
                this.startMonitoring();
                return true;
            } else if (result === 'denied') {
                this.showToast('Notifications blocked. Enable in browser settings.', 'error');
                return false;
            } else {
                this.showToast('Notification permission dismissed', 'warning');
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            this.showToast('Failed to request notification permission', 'error');
            return false;
        }
    }

    // Check if notifications are available
    canNotify() {
        return this.isSupported && this.permission === 'granted' && this.enabled;
    }

    // Disable notifications
    disable() {
        this.enabled = false;
        localStorage.setItem('notificationsEnabled', 'false');
        this.stopMonitoring();
        this.showToast('Notifications disabled', 'info');
    }

    // Enable notifications (if permission granted)
    enable() {
        if (this.permission === 'granted') {
            this.enabled = true;
            localStorage.setItem('notificationsEnabled', 'true');
            this.startMonitoring();
            this.showToast('🔔 Notifications enabled!', 'success');
        } else {
            this.requestPermission();
        }
    }

    // Toggle notifications
    toggle() {
        if (this.enabled) {
            this.disable();
        } else {
            this.enable();
        }
        return this.enabled;
    }

    // =====================================================
    // Notification Sending
    // =====================================================

    async sendNotification(title, body, options = {}) {
        if (!this.canNotify()) {
            console.log('Cannot send notification - not enabled or permitted');
            return null;
        }

        const defaultOptions = {
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-72.png',
            vibrate: [200, 100, 200],
            tag: 'betgenius-' + Date.now(),
            renotify: true,
            requireInteraction: false,
            data: {},
            ...options
        };

        try {
            // Try using service worker for background notifications
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(title, {
                    body,
                    ...defaultOptions
                });
            } else {
                // Fallback to regular notification
                new Notification(title, {
                    body,
                    ...defaultOptions
                });
            }

            console.log('📢 Notification sent:', title);
            return true;
        } catch (error) {
            console.error('Error sending notification:', error);
            return false;
        }
    }

    // Send notification for a high-confidence prop
    async notifyHighConfidenceProp(prop) {
        // Create unique ID for this prop
        const propId = `${prop.player}-${prop.propType}-${prop.line}`;

        // Don't notify if we already notified about this prop recently
        if (this.lastNotifiedProps.has(propId)) {
            console.log('Already notified about this prop:', propId);
            return false;
        }

        const title = `🎯 ${prop.confidence}% Confidence Pick!`;
        const body = `${prop.player} ${prop.propType} ${prop.pick} ${prop.line}\n${prop.reasoning || ''}`;

        const sent = await this.sendNotification(title, body, {
            tag: `prop-${propId}`,
            data: { prop, type: 'highConfidence' },
            actions: [
                { action: 'view', title: 'View Pick' },
                { action: 'addParlay', title: 'Add to Parlay' }
            ]
        });

        if (sent) {
            // Remember we notified about this prop
            this.lastNotifiedProps.add(propId);
            // Keep only last 50 notifications
            if (this.lastNotifiedProps.size > 50) {
                const arr = Array.from(this.lastNotifiedProps);
                this.lastNotifiedProps = new Set(arr.slice(-50));
            }
            localStorage.setItem('lastNotifiedProps', JSON.stringify([...this.lastNotifiedProps]));
        }

        return sent;
    }

    // Notify about multiple high-confidence props
    async notifyMultipleProps(props) {
        const highConfProps = props.filter(p => p.confidence >= this.confidenceThreshold);

        if (highConfProps.length === 0) return;

        // If just one, send individual notification
        if (highConfProps.length === 1) {
            return this.notifyHighConfidenceProp(highConfProps[0]);
        }

        // For multiple, send summary
        const newProps = highConfProps.filter(p => {
            const propId = `${p.player}-${p.propType}-${p.line}`;
            return !this.lastNotifiedProps.has(propId);
        });

        if (newProps.length === 0) return;

        const title = `🔥 ${newProps.length} High-Confidence Picks!`;
        const body = newProps.slice(0, 3).map(p =>
            `${p.player} ${p.propType} ${p.pick} (${p.confidence}%)`
        ).join('\n') + (newProps.length > 3 ? `\n+${newProps.length - 3} more...` : '');

        const sent = await this.sendNotification(title, body, {
            tag: 'multi-props',
            data: { props: newProps, type: 'multipleHighConfidence' }
        });

        if (sent) {
            newProps.forEach(p => {
                const propId = `${p.player}-${p.propType}-${p.line}`;
                this.lastNotifiedProps.add(propId);
            });
            localStorage.setItem('lastNotifiedProps', JSON.stringify([...this.lastNotifiedProps]));
        }

        return sent;
    }

    // =====================================================
    // Monitoring for New Props
    // =====================================================

    startMonitoring(intervalMs = 5 * 60 * 1000) { // Check every 5 minutes
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        console.log('🔄 Starting prop monitoring for notifications...');

        // Check immediately
        this.checkForNewHighConfidenceProps();

        // Then check periodically
        this.checkInterval = setInterval(() => {
            this.checkForNewHighConfidenceProps();
        }, intervalMs);
    }

    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('⏹️ Stopped prop monitoring');
        }
    }

    async checkForNewHighConfidenceProps() {
        if (!this.canNotify()) return;

        console.log('🔍 Checking for new high-confidence props...');

        try {
            // Get current props
            const props = window.getDemoProps ? window.getDemoProps('all') : [];

            // Filter for high confidence and not already notified
            const highConfProps = props.filter(p => {
                if (p.confidence < this.confidenceThreshold) return false;
                const propId = `${p.player}-${p.propType}-${p.line}`;
                return !this.lastNotifiedProps.has(propId);
            });

            if (highConfProps.length > 0) {
                console.log(`Found ${highConfProps.length} new high-confidence props`);
                await this.notifyMultipleProps(highConfProps);
            }
        } catch (error) {
            console.error('Error checking for new props:', error);
        }
    }

    // =====================================================
    // Settings Management
    // =====================================================

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
    }

    getSettings() {
        return { ...this.settings };
    }

    // =====================================================
    // UI Helpers
    // =====================================================

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.log('Toast:', message);
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Get permission status UI text
    getStatusText() {
        if (!this.isSupported) return 'Not Supported';
        if (this.permission === 'denied') return 'Blocked';
        if (this.permission === 'granted' && this.enabled) return 'Enabled';
        if (this.permission === 'granted' && !this.enabled) return 'Disabled';
        return 'Not Set Up';
    }

    getStatusClass() {
        if (!this.isSupported || this.permission === 'denied') return 'status-error';
        if (this.permission === 'granted' && this.enabled) return 'status-success';
        return 'status-warning';
    }

    // =====================================================
    // Test Notification
    // =====================================================

    async sendTestNotification() {
        if (!this.canNotify()) {
            await this.requestPermission();
            if (!this.canNotify()) return false;
        }

        return this.sendNotification(
            '🎯 BetGenius AI Test',
            'Notifications are working! You\'ll get alerts for 75%+ confidence picks.',
            { tag: 'test-notification' }
        );
    }
}

// =====================================================
// Initialize and Export
// =====================================================

// Create global instance
window.NotificationManager = new NotificationManager();

// Convenience functions
window.enableNotifications = () => window.NotificationManager.enable();
window.disableNotifications = () => window.NotificationManager.disable();
window.toggleNotifications = () => window.NotificationManager.toggle();
window.testNotification = () => window.NotificationManager.sendTestNotification();

// Auto-start monitoring if notifications were previously enabled
if (window.NotificationManager.canNotify()) {
    window.NotificationManager.startMonitoring();
}

console.log('🔔 Push Notifications module loaded');
