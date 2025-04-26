const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { processMessage } = require('../nlp/botNLP');
const logger = require('../utils/logger');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

class WhatsAppBot {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth({ clientId: "financial-bot" }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.client.on('qr', (qr) => {
            logger.info('QR Code received, scan to connect');
            qrcode.generate(qr, { small: true });
        });

        this.client.on('ready', () => {
            logger.info('WhatsApp bot is ready!');
        });

        this.client.on('message', async (msg) => {
            try {
                await this.handleMessage(msg);
            } catch (error) {
                logger.error('Error handling message:', error);
                msg.reply('Maaf, terjadi kesalahan dalam memproses pesan Anda.');
            }
        });

        this.client.on('disconnected', (reason) => {
            logger.warn('WhatsApp bot disconnected:', reason);
            this.client.initialize();
        });
    }

    async handleMessage(msg) {
        const sender = msg.from;
        const messageBody = msg.body;

        // Check if user is registered and active
        const user = await User.findOne({
            'phoneNumbers.number': sender,
            'phoneNumbers.isActive': true
        });

        if (!user && !messageBody.toLowerCase().startsWith('/daftar')) {
            return msg.reply(
                'Maaf, nomor Anda belum terdaftar. Silakan daftar dengan format:\n' +
                '/daftar <kode_aktivasi> <username>'
            );
        }

        // Process registration if needed
        if (messageBody.toLowerCase().startsWith('/daftar')) {
            return this.handleRegistration(msg);
        }

        // Process message with NLP
        const response = await processMessage(messageBody, user);
        
        // Handle different types of responses
        if (response.type === 'text') {
            await msg.reply(response.content);
        } else if (response.type === 'report') {
            // Generate and send PDF report
            const pdfPath = await generatePDFReport(response.content);
            await msg.reply(response.message);
            await msg.reply(MessageMedia.fromFilePath(pdfPath));
        }
    }

    async handleRegistration(msg) {
        const parts = msg.body.split(' ');
        if (parts.length !== 3) {
            return msg.reply(
                'Format pendaftaran tidak valid. Gunakan:\n' +
                '/daftar <kode_aktivasi> <username>'
            );
        }

        const [_, activationCode, username] = parts;

        try {
            // Find user with matching activation code
            const user = await User.findOne({
                'activationCode.code': activationCode,
                'activationCode.expiresAt': { $gt: new Date() }
            });

            if (!user) {
                return msg.reply('Kode aktivasi tidak valid atau sudah kadaluarsa.');
            }

            if (!user.canAddPhoneNumber()) {
                return msg.reply('Batas maksimum nomor telepon untuk user ini telah tercapai.');
            }

            // Add phone number to user
            user.phoneNumbers.push({
                number: msg.from,
                isActive: true,
                activatedAt: new Date(),
                expiresAt: user.activationCode.expiresAt
            });

            await user.save();
            
            return msg.reply(
                'Pendaftaran berhasil! Selamat datang di Asisten Keuangan.\n\n' +
                'Ketik /help untuk melihat daftar perintah yang tersedia.'
            );
        } catch (error) {
            logger.error('Registration error:', error);
            return msg.reply('Maaf, terjadi kesalahan dalam proses pendaftaran.');
        }
    }

    initialize() {
        this.client.initialize();
    }
}

module.exports = new WhatsAppBot();
