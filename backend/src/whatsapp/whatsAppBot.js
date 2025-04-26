const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const EventEmitter = require('events');
const logger = require('../utils/logger');
const messageHandler = require('./messageHandler');
const User = require('../models/User');

class WhatsAppBot extends EventEmitter {
    constructor() {
        super();
        this.status = 'disconnected';
        this.qr = null;
        this.initializeClient();
    }

    initializeClient() {
        this.client = new Client({
            authStrategy: new LocalAuth({ clientId: "financial-bot" }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        // QR Code event
        this.client.on('qr', async (qr) => {
            try {
                this.qr = qr;
                this.status = 'qr_received';
                
                // Generate QR code as data URL
                const qrDataUrl = await qrcode.toDataURL(qr);
                
                // Emit QR code event
                this.emit('qr', qrDataUrl);
                
                logger.info('New QR code generated');
            } catch (error) {
                logger.error('Error generating QR code:', error);
            }
        });

        // Ready event
        this.client.on('ready', () => {
            this.status = 'connected';
            this.qr = null;
            this.emit('ready');
            logger.info('WhatsApp bot is ready!');
        });

        // Authenticated event
        this.client.on('authenticated', (session) => {
            this.status = 'authenticated';
            this.emit('authenticated', session);
            logger.info('WhatsApp bot authenticated');
        });

        // Authentication failure event
        this.client.on('auth_failure', (error) => {
            this.status = 'auth_failure';
            this.emit('auth_failure', error);
            logger.error('WhatsApp authentication failed:', error);
        });

        // Disconnected event
        this.client.on('disconnected', (reason) => {
            this.status = 'disconnected';
            this.emit('disconnected', reason);
            logger.warn('WhatsApp bot disconnected:', reason);
            
            // Attempt to reconnect
            setTimeout(() => {
                logger.info('Attempting to reconnect...');
                this.initialize();
            }, 5000);
        });

        // Message event
        this.client.on('message', async (message) => {
            try {
                await messageHandler.handleMessage(message, this.client);
            } catch (error) {
                logger.error('Error handling message:', error);
            }
        });

        // Button response event
        this.client.on('message_reaction', async (reaction) => {
            try {
                if (reaction.reaction.startsWith('btn_')) {
                    const buttonId = reaction.reaction.replace('btn_', '');
                    await messageHandler.handleButtonResponse(reaction.message, buttonId);
                }
            } catch (error) {
                logger.error('Error handling button response:', error);
            }
        });

        // Group events
        this.client.on('group_join', async (notification) => {
            // Leave groups automatically as this is a personal finance bot
            const chat = await notification.getChat();
            await chat.leave();
        });

        // State change events
        this.client.on('change_state', (state) => {
            logger.info('WhatsApp connection state:', state);
        });

        // Connection events
        this.client.on('loading_screen', (percent, message) => {
            logger.info(`Loading: ${percent}% - ${message}`);
        });
    }

    async initialize() {
        try {
            logger.info('Initializing WhatsApp bot...');
            await this.client.initialize();
        } catch (error) {
            logger.error('Error initializing WhatsApp bot:', error);
            throw error;
        }
    }

    async logout() {
        try {
            await this.client.logout();
            this.status = 'disconnected';
            this.qr = null;
            this.emit('logout');
            logger.info('WhatsApp bot logged out');
        } catch (error) {
            logger.error('Error logging out:', error);
            throw error;
        }
    }

    async sendMessage(to, message, options = {}) {
        try {
            // Verify if user is registered
            const user = await User.findOne({
                'phoneNumbers.number': to,
                'phoneNumbers.isActive': true
            });

            if (!user) {
                logger.warn(`Attempted to send message to unregistered number: ${to}`);
                return false;
            }

            // Send message
            await this.client.sendMessage(to, message, options);
            return true;
        } catch (error) {
            logger.error('Error sending message:', error);
            return false;
        }
    }

    async sendNotification(to, type, data) {
        try {
            let message;
            
            switch (type) {
                case 'budget_warning':
                    message = `⚠️ *Peringatan Budget*\n\n` +
                             `Budget ${data.category} Anda tersisa ${data.remaining}%.\n` +
                             `Sisa budget: Rp ${data.amount.toLocaleString('id-ID')}`;
                    break;

                case 'budget_exceeded':
                    message = `🚨 *Budget Terlampaui*\n\n` +
                             `Budget ${data.category} Anda telah terlampaui.\n` +
                             `Pengeluaran: Rp ${data.spent.toLocaleString('id-ID')}\n` +
                             `Budget: Rp ${data.budget.toLocaleString('id-ID')}`;
                    break;

                case 'subscription_expiring':
                    message = `📅 *Pemberitahuan Langganan*\n\n` +
                             `Langganan Anda akan berakhir dalam ${data.daysLeft} hari.\n` +
                             `Tanggal berakhir: ${data.expiryDate}\n\n` +
                             `Hubungi admin untuk perpanjangan.`;
                    break;

                case 'monthly_report':
                    const report = MessageMedia.fromFilePath(data.reportPath);
                    await this.sendMessage(to, '📊 *Laporan Bulanan*\n\nBerikut laporan keuangan Anda bulan ini:');
                    await this.sendMessage(to, report);
                    return;

                default:
                    message = data.message;
            }

            await this.sendMessage(to, message);
        } catch (error) {
            logger.error('Error sending notification:', error);
        }
    }

    getStatus() {
        return {
            status: this.status,
            qr: this.qr
        };
    }

    isConnected() {
        return this.status === 'connected';
    }
}

// Export singleton instance
module.exports = new WhatsAppBot();
