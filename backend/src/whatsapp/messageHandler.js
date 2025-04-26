const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const ffmpeg = require('fluent-ffmpeg');
const speech = require('@google-cloud/speech');
const botNLP = require('../nlp/botNLP');
const logger = require('../utils/logger');
const User = require('../models/User');
const contextManager = require('../nlp/contextManager');

class MessageHandler {
    constructor() {
        // Initialize Google Cloud Speech-to-Text client
        this.speechClient = new speech.SpeechClient({
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
        });
    }

    async handleMessage(message, client) {
        try {
            // Get user from database
            const user = await User.findOne({
                'phoneNumbers.number': message.from
            });

            if (!user) {
                return this.handleUnregisteredUser(message);
            }

            // Handle different message types
            if (message.hasMedia) {
                const media = await message.downloadMedia();
                if (media.mimetype.startsWith('audio/')) {
                    return this.handleVoiceMessage(message, media, user);
                }
                if (media.mimetype.startsWith('image/')) {
                    return this.handleImageMessage(message, media, user);
                }
            }

            // Handle text message
            return this.handleTextMessage(message, user);

        } catch (error) {
            logger.error('Error handling message:', error);
            message.reply('Maaf, terjadi kesalahan dalam memproses pesan Anda.');
        }
    }

    async handleUnregisteredUser(message) {
        if (message.body.toLowerCase().startsWith('/daftar')) {
            return this.handleRegistration(message);
        }

        return message.reply(
            'Maaf, nomor Anda belum terdaftar. Silakan daftar dengan format:\n' +
            '/daftar <kode_aktivasi> <username>'
        );
    }

    async handleVoiceMessage(message, media, user) {
        try {
            // Convert audio to proper format
            const audioBuffer = Buffer.from(media.data, 'base64');
            const audioPath = path.join(__dirname, `../../temp/${message.id}.ogg`);
            const wavPath = path.join(__dirname, `../../temp/${message.id}.wav`);

            // Save audio file
            await fs.promises.writeFile(audioPath, audioBuffer);

            // Convert to WAV using ffmpeg
            await new Promise((resolve, reject) => {
                ffmpeg(audioPath)
                    .toFormat('wav')
                    .on('end', resolve)
                    .on('error', reject)
                    .save(wavPath);
            });

            // Read WAV file
            const audioBytes = await fs.promises.readFile(wavPath);

            // Configure request
            const audio = {
                content: audioBytes.toString('base64'),
            };
            const config = {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: 'id-ID',
            };
            const request = {
                audio: audio,
                config: config,
            };

            // Perform speech recognition
            const [response] = await this.speechClient.recognize(request);
            const transcription = response.results
                .map(result => result.alternatives[0].transcript)
                .join('\n');

            // Clean up temporary files
            await fs.promises.unlink(audioPath);
            await fs.promises.unlink(wavPath);

            // Process transcribed text
            await this.handleTextMessage(message, user, transcription);

        } catch (error) {
            logger.error('Error processing voice message:', error);
            message.reply('Maaf, terjadi kesalahan dalam memproses pesan suara Anda.');
        }
    }

    async handleImageMessage(message, media, user) {
        // TODO: Implement receipt scanning using OCR
        message.reply('Maaf, fitur scan struk belum tersedia.');
    }

    async handleTextMessage(message, user, text = null) {
        try {
            const response = await botNLP.processMessage(text || message.body, user);
            
            switch (response.type) {
                case 'text':
                    return message.reply(response.content);

                case 'report':
                    // Generate PDF report
                    const pdfPath = await this.generatePDFReport(response.content);
                    const media = MessageMedia.fromFilePath(pdfPath);
                    await message.reply(response.message);
                    await message.reply(media);
                    // Clean up
                    await fs.promises.unlink(pdfPath);
                    break;

                case 'confirmation':
                    // Send confirmation message with buttons
                    await client.sendMessage(message.from, response.content, {
                        buttons: [
                            { id: 'yes', text: 'Ya, Benar' },
                            { id: 'no', text: 'Tidak, Ulangi' },
                            { id: 'cancel', text: 'Batal' }
                        ]
                    });
                    break;

                case 'analysis':
                    // Format and send financial analysis
                    let analysisMessage = '📊 Analisis Keuangan:\n\n';
                    
                    // Add metrics
                    analysisMessage += '💰 Ringkasan:\n';
                    analysisMessage += `• Pemasukan: Rp ${response.content.metrics.income.toLocaleString('id-ID')}\n`;
                    analysisMessage += `• Pengeluaran: Rp ${response.content.metrics.expenses.toLocaleString('id-ID')}\n`;
                    analysisMessage += `• Tingkat Tabungan: ${response.content.metrics.savingsRate}%\n\n`;

                    // Add analysis points
                    analysisMessage += '📝 Analisis:\n';
                    response.content.analysis.forEach(point => {
                        analysisMessage += `• ${point.message}\n`;
                    });

                    // Add recommendations
                    if (response.content.recommendations.length > 0) {
                        analysisMessage += '\n💡 Rekomendasi:\n';
                        response.content.recommendations.forEach(rec => {
                            analysisMessage += `• ${rec}\n`;
                        });
                    }

                    return message.reply(analysisMessage);

                default:
                    return message.reply('Maaf, terjadi kesalahan dalam memproses permintaan Anda.');
            }

        } catch (error) {
            logger.error('Error processing text message:', error);
            message.reply('Maaf, terjadi kesalahan dalam memproses pesan Anda.');
        }
    }

    async handleButtonResponse(message, buttonId) {
        const user = await User.findOne({
            'phoneNumbers.number': message.from
        });

        if (!user) return;

        const context = contextManager.getContext(user._id);

        switch (buttonId) {
            case 'yes':
                // Process pending transaction
                const data = context.tempData;
                if (data.amount && data.type) {
                    await this.processTransaction(message, user, data);
                }
                contextManager.updateContext(user._id, { currentState: 'idle', tempData: {} });
                break;

            case 'no':
                // Reset to amount input state
                contextManager.updateContext(user._id, {
                    currentState: 'awaiting_amount',
                    tempData: { type: context.tempData.type }
                });
                message.reply('Baik, silakan masukkan jumlah transaksi kembali.');
                break;

            case 'cancel':
                // Clear context and cancel operation
                contextManager.updateContext(user._id, { currentState: 'idle', tempData: {} });
                message.reply('Operasi dibatalkan.');
                break;
        }
    }

    async processTransaction(message, user, data) {
        try {
            const transaction = await Transaction.create({
                userId: user._id,
                type: data.type,
                amount: data.amount,
                description: data.description,
                date: data.date || new Date()
            });

            let response = `✅ ${data.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'} sebesar Rp ${data.amount.toLocaleString('id-ID')} berhasil dicatat.`;

            if (data.type === 'expense') {
                const budgetStatus = await botNLP.checkBudgetStatus(user._id, data.amount);
                if (budgetStatus.warning) {
                    response += `\n\n⚠️ ${budgetStatus.message}`;
                }
            }

            message.reply(response);

        } catch (error) {
            logger.error('Error processing transaction:', error);
            message.reply('Maaf, terjadi kesalahan dalam memproses transaksi.');
        }
    }

    async generatePDFReport(content) {
        // Implementation moved to pdfGenerator.js
        const pdfGenerator = require('../utils/pdfGenerator');
        return pdfGenerator.generateReport(content);
    }
}

module.exports = new MessageHandler();
