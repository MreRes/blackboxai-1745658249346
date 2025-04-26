const natural = require('natural');
const moment = require('moment');
const logger = require('../utils/logger');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

// Configure tokenizer for Bahasa Indonesia
const tokenizer = new natural.WordTokenizer();
const classifier = new natural.BayesClassifier();

// Train classifier with common Indonesian financial phrases
function trainClassifier() {
    // Transaksi
    classifier.addDocument('catat pengeluaran', 'add_expense');
    classifier.addDocument('tambah pengeluaran', 'add_expense');
    classifier.addDocument('keluar uang', 'add_expense');
    classifier.addDocument('bayar', 'add_expense');
    classifier.addDocument('beli', 'add_expense');
    
    classifier.addDocument('catat pemasukan', 'add_income');
    classifier.addDocument('tambah pemasukan', 'add_income');
    classifier.addDocument('terima uang', 'add_income');
    classifier.addDocument('dapat uang', 'add_income');
    classifier.addDocument('gajian', 'add_income');

    // Laporan
    classifier.addDocument('lihat laporan', 'view_report');
    classifier.addDocument('tampilkan laporan', 'view_report');
    classifier.addDocument('report keuangan', 'view_report');
    classifier.addDocument('rangkuman', 'view_report');
    classifier.addDocument('rekap', 'view_report');

    // Budget
    classifier.addDocument('atur budget', 'set_budget');
    classifier.addDocument('tentukan anggaran', 'set_budget');
    classifier.addDocument('set limit', 'set_budget');
    classifier.addDocument('batas pengeluaran', 'set_budget');
    
    classifier.addDocument('cek budget', 'check_budget');
    classifier.addDocument('lihat sisa budget', 'check_budget');
    classifier.addDocument('sisa anggaran', 'check_budget');
    classifier.addDocument('budget bulanan', 'check_budget');

    // Riwayat
    classifier.addDocument('riwayat transaksi', 'transaction_history');
    classifier.addDocument('lihat transaksi', 'transaction_history');
    classifier.addDocument('history', 'transaction_history');
    classifier.addDocument('mutasi', 'transaction_history');

    // Bantuan
    classifier.addDocument('bantuan', 'help');
    classifier.addDocument('tolong', 'help');
    classifier.addDocument('cara pakai', 'help');
    classifier.addDocument('panduan', 'help');

    classifier.train();
}

trainClassifier();

// Extract amount from text
function extractAmount(text) {
    // Handle various currency formats
    const amountRegex = /(?:Rp\.?\s?)?(\d+(?:\.\d{3})*(?:,\d{2})?)|(?:(?:\d+\s?(?:ribu|rb|k|juta|jt|m))\b)/i;
    const match = text.match(amountRegex);
    
    if (match) {
        let amount = match[1];
        
        // Handle abbreviations (rb, jt, etc)
        if (text.toLowerCase().includes('ribu') || text.toLowerCase().includes('rb') || text.toLowerCase().includes('k')) {
            amount = parseFloat(amount) * 1000;
        } else if (text.toLowerCase().includes('juta') || text.toLowerCase().includes('jt') || text.toLowerCase().includes('m')) {
            amount = parseFloat(amount) * 1000000;
        } else {
            amount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
        }
        
        return amount;
    }
    return null;
}

// Extract date from text
function extractDate(text) {
    // Handle various date formats and relative dates in Indonesian
    const today = /hari ini|sekarang/i;
    const yesterday = /kemarin/i;
    const tomorrow = /besok/i;
    const lastMonth = /bulan lalu/i;
    const lastWeek = /minggu lalu/i;
    
    if (today.test(text)) {
        return moment();
    } else if (yesterday.test(text)) {
        return moment().subtract(1, 'days');
    } else if (tomorrow.test(text)) {
        return moment().add(1, 'days');
    } else if (lastMonth.test(text)) {
        return moment().subtract(1, 'months');
    } else if (lastWeek.test(text)) {
        return moment().subtract(1, 'weeks');
    }

    // Try to parse specific date formats
    const dateRegex = /(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}|\d{2}))?/;
    const match = text.match(dateRegex);
    
    if (match) {
        const [_, day, month, year] = match;
        const fullYear = year ? (year.length === 2 ? '20' + year : year) : moment().year();
        return moment(`${fullYear}-${month}-${day}`, 'YYYY-MM-DD');
    }

    return moment();
}

// Extract category from text
function extractCategory(text) {
    const categories = {
        'makan': 'Makanan & Minuman',
        'minum': 'Makanan & Minuman',
        'transportasi': 'Transportasi',
        'bensin': 'Transportasi',
        'gojek': 'Transportasi',
        'grab': 'Transportasi',
        'listrik': 'Utilitas',
        'air': 'Utilitas',
        'internet': 'Utilitas',
        'pulsa': 'Komunikasi',
        'paket data': 'Komunikasi',
        'belanja': 'Belanja',
        'gaji': 'Pendapatan',
        'bonus': 'Pendapatan',
        'investasi': 'Investasi',
        'kesehatan': 'Kesehatan',
        'hiburan': 'Hiburan'
    };

    const words = text.toLowerCase().split(' ');
    for (const word of words) {
        if (categories[word]) {
            return categories[word];
        }
    }

    return 'Lainnya';
}

// Process incoming messages
async function processMessage(text, user) {
    try {
        const classification = classifier.classify(text.toLowerCase());
        const amount = extractAmount(text);
        const date = extractDate(text);
        const category = extractCategory(text);

        switch (classification) {
            case 'add_expense':
                if (!amount) {
                    return {
                        type: 'text',
                        content: 'Mohon cantumkan jumlah pengeluaran. Contoh: "catat pengeluaran 50rb untuk makan"'
                    };
                }
                
                const expense = await Transaction.create({
                    userId: user._id,
                    type: 'expense',
                    amount: amount,
                    date: date.toDate(),
                    category: category,
                    description: text.replace(/Rp\.?\s?\d+(?:\.\d{3})*(?:,\d{2})?/g, '').trim()
                });

                // Check budget after adding expense
                const budget = await Budget.findOne({
                    userId: user._id,
                    category: category,
                    period: {
                        $gte: moment().startOf('month').toDate(),
                        $lte: moment().endOf('month').toDate()
                    }
                });

                let budgetMessage = '';
                if (budget) {
                    const totalExpenses = await Transaction.aggregate([
                        {
                            $match: {
                                userId: user._id,
                                category: category,
                                type: 'expense',
                                date: {
                                    $gte: moment().startOf('month').toDate(),
                                    $lte: moment().endOf('month').toDate()
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                total: { $sum: '$amount' }
                            }
                        }
                    ]);

                    if (totalExpenses[0].total >= budget.amount) {
                        budgetMessage = '\n⚠️ Perhatian: Budget untuk kategori ' + category + ' sudah terlampaui!';
                    } else if (totalExpenses[0].total >= budget.amount * 0.8) {
                        budgetMessage = '\n⚠️ Perhatian: Budget untuk kategori ' + category + ' sudah mencapai 80%';
                    }
                }

                return {
                    type: 'text',
                    content: `✅ Pengeluaran sebesar Rp ${amount.toLocaleString('id-ID')} untuk kategori ${category} berhasil dicatat.${budgetMessage}`
                };

            case 'add_income':
                if (!amount) {
                    return {
                        type: 'text',
                        content: 'Mohon cantumkan jumlah pemasukan. Contoh: "catat pemasukan 1jt gaji"'
                    };
                }

                const income = await Transaction.create({
                    userId: user._id,
                    type: 'income',
                    amount: amount,
                    date: date.toDate(),
                    category: category,
                    description: text.replace(/Rp\.?\s?\d+(?:\.\d{3})*(?:,\d{2})?/g, '').trim()
                });

                return {
                    type: 'text',
                    content: `✅ Pemasukan sebesar Rp ${amount.toLocaleString('id-ID')} dari kategori ${category} berhasil dicatat.`
                };

            case 'view_report':
                // Generate financial report
                const report = await generateReport(user._id);
                return {
                    type: 'report',
                    content: report,
                    message: 'Berikut laporan keuangan Anda:'
                };

            case 'check_budget':
                const budgets = await Budget.find({
                    userId: user._id,
                    period: {
                        $gte: moment().startOf('month').toDate(),
                        $lte: moment().endOf('month').toDate()
                    }
                });

                if (budgets.length === 0) {
                    return {
                        type: 'text',
                        content: 'Anda belum mengatur budget untuk bulan ini.'
                    };
                }

                let budgetStatus = 'Status Budget Bulan Ini:\n\n';
                for (const budget of budgets) {
                    const expenses = await Transaction.aggregate([
                        {
                            $match: {
                                userId: user._id,
                                category: budget.category,
                                type: 'expense',
                                date: {
                                    $gte: moment().startOf('month').toDate(),
                                    $lte: moment().endOf('month').toDate()
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                total: { $sum: '$amount' }
                            }
                        }
                    ]);

                    const spent = expenses[0]?.total || 0;
                    const percentage = (spent / budget.amount) * 100;
                    const remaining = budget.amount - spent;

                    budgetStatus += `${budget.category}:\n`;
                    budgetStatus += `Budget: Rp ${budget.amount.toLocaleString('id-ID')}\n`;
                    budgetStatus += `Terpakai: Rp ${spent.toLocaleString('id-ID')} (${percentage.toFixed(1)}%)\n`;
                    budgetStatus += `Sisa: Rp ${remaining.toLocaleString('id-ID')}\n\n`;
                }

                return {
                    type: 'text',
                    content: budgetStatus
                };

            case 'transaction_history':
                const transactions = await Transaction.find({
                    userId: user._id
                })
                .sort({ date: -1 })
                .limit(10);

                let history = 'Riwayat Transaksi Terakhir:\n\n';
                for (const trans of transactions) {
                    const date = moment(trans.date).format('DD/MM/YYYY');
                    const type = trans.type === 'expense' ? '🔴' : '🟢';
                    history += `${type} ${date} - ${trans.category}\n`;
                    history += `${trans.description || 'Tanpa keterangan'}\n`;
                    history += `Rp ${trans.amount.toLocaleString('id-ID')}\n\n`;
                }

                return {
                    type: 'text',
                    content: history
                };

            case 'help':
                return {
                    type: 'text',
                    content: `Panduan Penggunaan Bot:

1. Catat Pengeluaran:
   "catat pengeluaran 50rb makan siang"
   "bayar grab 25rb"

2. Catat Pemasukan:
   "catat pemasukan 5jt gaji"
   "dapat uang 1juta dari proyek"

3. Lihat Laporan:
   "lihat laporan"
   "tampilkan laporan bulanan"

4. Cek Budget:
   "cek budget"
   "lihat sisa anggaran"

5. Riwayat Transaksi:
   "lihat riwayat"
   "tampilkan mutasi"

Catatan:
- Gunakan satuan rb/ribu atau jt/juta
- Bisa mencatat transaksi di masa lalu dengan menyebut tanggalnya
- Sebutkan kategori transaksi untuk pencatatan lebih detail`
                };

            default:
                return {
                    type: 'text',
                    content: 'Maaf, saya tidak memahami permintaan Anda. Ketik "bantuan" untuk melihat panduan penggunaan.'
                };
        }
    } catch (error) {
        logger.error('Error processing message:', error);
        return {
            type: 'text',
            content: 'Maaf, terjadi kesalahan dalam memproses permintaan Anda.'
        };
    }
}

async function generateReport(userId) {
    // Implementation for generating financial report
    // This will be implemented in detail later
}

module.exports = {
    processMessage,
    trainClassifier
};
