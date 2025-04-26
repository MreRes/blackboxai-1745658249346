const logger = require('../utils/logger');

class ContextManager {
    constructor() {
        this.contexts = new Map();
        this.defaultExpiry = 5 * 60 * 1000; // 5 minutes
    }

    // Initialize or get user context
    getContext(userId) {
        if (!this.contexts.has(userId)) {
            this.initContext(userId);
        }
        return this.contexts.get(userId);
    }

    // Initialize new context for user
    initContext(userId) {
        this.contexts.set(userId, {
            currentState: 'idle',
            lastInteraction: Date.now(),
            conversationStack: [],
            pendingActions: [],
            tempData: {},
            lastIntent: null,
            lastEntities: [],
            sessionStartTime: Date.now()
        });
    }

    // Update context with new interaction
    updateContext(userId, updates) {
        const context = this.getContext(userId);
        this.contexts.set(userId, {
            ...context,
            ...updates,
            lastInteraction: Date.now()
        });
    }

    // Push new conversation state to stack
    pushState(userId, state) {
        const context = this.getContext(userId);
        context.conversationStack.push({
            state,
            timestamp: Date.now()
        });
        this.updateContext(userId, { currentState: state });
    }

    // Pop last conversation state
    popState(userId) {
        const context = this.getContext(userId);
        const previousState = context.conversationStack.pop();
        const newState = context.conversationStack[context.conversationStack.length - 1]?.state || 'idle';
        this.updateContext(userId, { currentState: newState });
        return previousState;
    }

    // Add pending action
    addPendingAction(userId, action) {
        const context = this.getContext(userId);
        context.pendingActions.push({
            ...action,
            timestamp: Date.now()
        });
        this.updateContext(userId, { pendingActions: context.pendingActions });
    }

    // Get and remove next pending action
    getNextPendingAction(userId) {
        const context = this.getContext(userId);
        const action = context.pendingActions.shift();
        this.updateContext(userId, { pendingActions: context.pendingActions });
        return action;
    }

    // Store temporary data
    setTempData(userId, key, value, expiry = this.defaultExpiry) {
        const context = this.getContext(userId);
        context.tempData[key] = {
            value,
            expiry: Date.now() + expiry
        };
        this.updateContext(userId, { tempData: context.tempData });
    }

    // Get temporary data
    getTempData(userId, key) {
        const context = this.getContext(userId);
        const data = context.tempData[key];
        
        if (!data) return null;
        
        if (Date.now() > data.expiry) {
            delete context.tempData[key];
            this.updateContext(userId, { tempData: context.tempData });
            return null;
        }
        
        return data.value;
    }

    // Check if context requires clarification
    needsClarification(userId) {
        const context = this.getContext(userId);
        return context.pendingActions.some(action => action.type === 'clarification');
    }

    // Get conversation summary
    getConversationSummary(userId) {
        const context = this.getContext(userId);
        return {
            currentState: context.currentState,
            conversationDepth: context.conversationStack.length,
            sessionDuration: Date.now() - context.sessionStartTime,
            pendingActions: context.pendingActions.length,
            lastIntent: context.lastIntent
        };
    }

    // Check if context has expired
    isExpired(userId) {
        const context = this.getContext(userId);
        return (Date.now() - context.lastInteraction) > this.defaultExpiry;
    }

    // Clean up expired contexts
    cleanup() {
        for (const [userId, context] of this.contexts.entries()) {
            if (this.isExpired(userId)) {
                this.contexts.delete(userId);
                logger.info(`Cleaned up expired context for user ${userId}`);
            }
        }
    }

    // Get suggested responses based on context
    getSuggestedResponses(userId) {
        const context = this.getContext(userId);
        const suggestions = [];

        switch (context.currentState) {
            case 'awaiting_amount':
                suggestions.push(
                    'Berapa nominalnya?',
                    'Masukkan jumlah transaksi'
                );
                break;
            case 'awaiting_category':
                suggestions.push(
                    'Untuk kategori apa?',
                    'Pilih kategori transaksi'
                );
                break;
            case 'awaiting_confirmation':
                suggestions.push(
                    'Ya, benar',
                    'Tidak, ulangi',
                    'Batal'
                );
                break;
            case 'error':
                suggestions.push(
                    'Coba lagi',
                    'Bantuan',
                    'Kembali ke menu utama'
                );
                break;
            default:
                suggestions.push(
                    'Catat pengeluaran',
                    'Lihat laporan',
                    'Cek saldo',
                    'Bantuan'
                );
        }

        return suggestions;
    }

    // Handle context transitions
    async handleTransition(userId, fromState, toState, data = {}) {
        const context = this.getContext(userId);
        
        // Log transition
        logger.info(`Context transition for user ${userId}: ${fromState} -> ${toState}`);
        
        // Pre-transition hooks
        await this.executePreTransitionHooks(userId, fromState, toState, data);
        
        // Update state
        this.pushState(userId, toState);
        
        // Post-transition hooks
        await this.executePostTransitionHooks(userId, fromState, toState, data);
        
        return this.getContext(userId);
    }

    // Execute pre-transition hooks
    async executePreTransitionHooks(userId, fromState, toState, data) {
        // Implement pre-transition logic here
        // For example: validation, data preparation, etc.
    }

    // Execute post-transition hooks
    async executePostTransitionHooks(userId, fromState, toState, data) {
        // Implement post-transition logic here
        // For example: notifications, data cleanup, etc.
    }
}

module.exports = new ContextManager();
