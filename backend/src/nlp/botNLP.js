const natural = require('natural');
const moment = require('moment');
const logger = require('../utils/logger');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const sentimentAnalyzer = require('./sentimentAnalyzer');
const contextManager = require('./contextManager');
const languageProcessor = require('./languageProcessor');
const goalCommands = require('./goalCommands');

class BotNLP {
    constructor() {
        this.classifier = new natural.BayesClassifier();
        this.trainClassifier();
    }

    trainClassifier() {
        // Financial transactions
        this.classifier.addDocument('catat pengeluaran', 'add_expense');
        this.classifier.addDocument('tambah pengeluaran', 'add_expense');
        this.classifier.addDocument('keluar uang', 'add_expense');
        this.classifier.addDocument('bayar', 'add_expense');
        this.classifier.addDocument('beli', 'add_expense');
        
        this.classifier.addDocument('catat pemasukan', 'add_income');
        this.classifier.addDocument('tambah pemasukan', 'add_income');
        this.classifier.addDocument('terima uang', 'add_income');
        this.classifier.addDocument('dapat uang', 'add_income');
        this.classifier.addDocument('gajian', 'add_income');

        // Reports
        this.classifier.addDocument('lihat laporan', 'view_report');
        this.classifier.addDocument('tampilkan laporan', 'view_report');
        this.classifier.addDocument('report keuangan', 'view_report');
        this.classifier.addDocument('rangkuman', 'view_report');
        this.classifier.addDocument('rekap', 'view_report');

        // Budget
        this.classifier.addDocument('atur budget', 'set_budget');
        this.classifier.addDocument('tentukan anggaran', 'set_budget');
        this.classifier.addDocument('set limit', 'set_budget');
        this.classifier.addDocument('batas pengeluaran', 'set_budget');
        
        this.classifier.addDocument('cek budget', 'check_budget');
        this.classifier.addDocument('lihat sisa budget', 'check_budget');
        this.classifier.addDocument('sisa anggaran', 'check_budget');
        this.classifier.addDocument('budget bulanan', 'check_budget');

        // Goals
        this.classifier.addDocument('tambah goal', 'tambah_goal');
        this.classifier.addDocument('buat goal', 'tambah_goal');
        this.classifier.addDocument('target baru', 'tambah_goal');
        this.classifier.addDocument('goal baru', 'tambah_goal');

        this.classifier.addDocument('lihat goal', 'lihat_goal');
        this.classifier.addDocument('cek goal', 'lihat_goal');
        this.classifier.addDocument('status goal', 'lihat_goal');
        this.classifier.addDocument('progress goal', 'lihat_goal');

        this.classifier.addDocument('update goal', 'update_goal');
        this.classifier.addDocument('perbarui goal', 'update_goal');

        this.classifier.addDocument('hapus goal', 'hapus_goal');
        this.classifier.addDocument('batalkan goal', 'hapus_goal');
        this.classifier.addDocument('selesai goal', 'hapus_goal');

        // Education and Tips
        this.classifier.addDocument('tips keuangan', 'tips');
        this.classifier.addDocument('saran keuangan', 'tips');
        this.classifier.addDocument('edukasi', 'tips');
        this.classifier.addDocument('pembelajaran', 'tips');

        // Help
        this.classifier.addDocument('bantuan', 'help');
        this.classifier.addDocument('tolong', 'help');
        this.classifier.addDocument('cara pakai', 'help');
        this.classifier.addDocument('panduan', 'help');

        this.classifier.train();
    }

    async processMessage(text, user) {
        try {
            // Preprocess text
            const processedText = languageProcessor.preprocess(text);
            
            // Get user context
            const context = contextManager.getContext(user._id);
            
            // Analyze sentiment
            const sentiment = sentimentAnalyzer.analyzeSentiment(processedText);
            
            // Get intent
            const intent = this.classifier.classify(processedText.toLowerCase());
            
            // Update context with new intent
            contextManager.updateContext(user._id, { lastIntent: intent });

            // Handle based on context state first
            if (context.currentState !== 'idle') {
                const contextResponse = await this.handleContextState(user._id, processedText, context);
                if (contextResponse) return contextResponse;
            }

            // Check if it's a goal-related command
            if (['tambah_goal', 'lihat_goal', 'update_goal', 'hapus_goal', 'tips'].includes(intent)) {
                return await goalCommands.handleGoalCommand(processedText, user, intent);
            }

            // Process based on intent
            const response = await this.handleIntent(intent, processedText, user, sentiment, context);
            
            // Update context after processing
            contextManager.updateContext(user._id, {
                lastResponse: response,
                lastProcessedText: processedText
            });

            return response;

        } catch (error) {
            logger.error('Error processing message:', error);
            return {
                type: 'text',
                content: 'Maaf, terjadi kesalahan dalam memproses pesan Anda.'
            };
        }
    }

    // ... [Previous handleContextState implementation remains the same]
    // ... [Previous handleIntent implementation remains the same]
    // ... [Previous checkBudgetStatus implementation remains the same]
    // ... [Previous analyzeFinancialHealth implementation remains the same]
    // ... [Previous getFinancialRecommendations implementation remains the same]
    // ... [Previous getHelpMessage implementation remains the same]

    getHelpMessage(context) {
        const basicCommands = `
Panduan Penggunaan Bot:

1. Catat Transaksi:
   - "catat pengeluaran 50rb makan siang"
   - "catat pemasukan 5jt gaji"
   - "bayar grab 25rb"

2. Lihat Laporan:
   - "lihat laporan"
   - "laporan bulanan"
   - "laporan minggu ini"

3. Cek & Atur Budget:
   - "cek budget"
   - "atur budget 3jt untuk bulan ini"
   - "lihat sisa anggaran"

4. Kelola Goal:
   - "tambah goal tabungan 10jt desember 2024"
   - "lihat goal"
   - "update goal tabungan 2jt"
   - "hapus goal"

5. Tips & Edukasi:
   - "tips keuangan"
   - "saran investasi"
   - "edukasi keuangan"

Tips:
- Gunakan bahasa sehari-hari
- Bisa mencatat transaksi di masa lalu
- Sebutkan kategori untuk pencatatan lebih detail`;

        // Add contextual help if needed
        if (context.currentState === 'awaiting_amount') {
            return basicCommands + '\n\nUntuk memasukkan jumlah, Anda bisa gunakan format:\n- 50rb\n- 1,5jt\n- 1000000';
        }

        return basicCommands;
    }
}

module.exports = new BotNLP();
