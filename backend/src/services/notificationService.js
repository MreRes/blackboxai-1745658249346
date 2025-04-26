const cron = require('node-cron');
const moment = require('moment');
const logger = require('../utils/logger');
const whatsAppBot = require('../whatsapp/whatsAppBot');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const pdfGenerator = require('../utils/pdfGenerator');

class NotificationService {
    constructor() {
        this.setupCronJobs();
    }

    setupCronJobs() {
        // Check budgets daily at 9 AM
        cron.schedule('0 9 * * *', () => {
            this.checkBudgets();
        });

        // Send monthly reports on the 1st of each month at 8 AM
        cron.schedule('0 8 1 * *', () => {
            this.sendMonthlyReports();
        });

        // Check subscription expiry daily at 10 AM
        cron.schedule('0 10 * * *', () => {
            this.checkSubscriptionExpiry();
        });

        // Send weekly summaries every Monday at 8 AM
        cron.schedule('0 8 * * 1', () => {
            this.sendWeeklySummaries();
        });

        // Check for unusual spending patterns daily at 11 AM
        cron.schedule('0 11 * * *', () => {
            this.checkSpendingPatterns();
        });
    }

    async checkBudgets() {
        try {
            logger.info('Checking budgets for all users...');
            const currentDate = new Date();
            
            // Get all active budgets
            const budgets = await Budget.find({
                startDate: { $lte: currentDate },
                endDate: { $gte: currentDate }
            }).populate('userId');

            for (const budget of budgets) {
                const totalExpenses = await Transaction.aggregate([
                    {
                        $match: {
                            userId: budget.userId._id,
                            type: 'expense',
                            category: budget.category,
                            date: {
                                $gte: budget.startDate,
                                $lte: currentDate
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

                const spent = totalExpenses[0]?.total || 0;
                const percentage = (spent / budget.amount) * 100;

                // Get user's active phone numbers
                const user = await User.findById(budget.userId._id);
                const activePhones = user.phoneNumbers.filter(p => p.isActive).map(p => p.number);

                if (percentage >= 100 && !budget.notifiedExceeded) {
                    // Budget exceeded notification
                    for (const phone of activePhones) {
                        await whatsAppBot.sendNotification(phone, 'budget_exceeded', {
                            category: budget.category,
                            spent,
                            budget: budget.amount
                        });
                    }
                    budget.notifiedExceeded = true;
                    await budget.save();
                } else if (percentage >= 80 && !budget.notifiedWarning) {
                    // Budget warning notification
                    for (const phone of activePhones) {
                        await whatsAppBot.sendNotification(phone, 'budget_warning', {
                            category: budget.category,
                            remaining: (100 - percentage).toFixed(1),
                            amount: budget.amount - spent
                        });
                    }
                    budget.notifiedWarning = true;
                    await budget.save();
                }
            }
        } catch (error) {
            logger.error('Error checking budgets:', error);
        }
    }

    async sendMonthlyReports() {
        try {
            logger.info('Generating and sending monthly reports...');
            const lastMonth = moment().subtract(1, 'month');
            const users = await User.find({ 'phoneNumbers.isActive': true });

            for (const user of users) {
                // Generate monthly report
                const report = await this.generateMonthlyReport(user._id, lastMonth);
                const pdfPath = await pdfGenerator.generateReport(report);

                // Send to all active phone numbers
                const activePhones = user.phoneNumbers.filter(p => p.isActive).map(p => p.number);
                for (const phone of activePhones) {
                    await whatsAppBot.sendNotification(phone, 'monthly_report', {
                        reportPath: pdfPath
                    });
                }
            }
        } catch (error) {
            logger.error('Error sending monthly reports:', error);
        }
    }

    async checkSubscriptionExpiry() {
        try {
            logger.info('Checking subscription expiry...');
            const users = await User.find({
                'phoneNumbers.isActive': true,
                'phoneNumbers.expiresAt': {
                    $gte: moment().toDate(),
                    $lte: moment().add(7, 'days').toDate()
                }
            });

            for (const user of users) {
                const expiringPhones = user.phoneNumbers.filter(p => 
                    p.isActive && 
                    moment(p.expiresAt).isBetween(moment(), moment().add(7, 'days'))
                );

                for (const phone of expiringPhones) {
                    const daysLeft = moment(phone.expiresAt).diff(moment(), 'days');
                    await whatsAppBot.sendNotification(phone.number, 'subscription_expiring', {
                        daysLeft,
                        expiryDate: moment(phone.expiresAt).format('DD MMMM YYYY')
                    });
                }
            }
        } catch (error) {
            logger.error('Error checking subscription expiry:', error);
        }
    }

    async sendWeeklySummaries() {
        try {
            logger.info('Sending weekly summaries...');
            const users = await User.find({ 'phoneNumbers.isActive': true });
            const lastWeekStart = moment().subtract(1, 'week').startOf('week');
            const lastWeekEnd = moment().subtract(1, 'week').endOf('week');

            for (const user of users) {
                // Get last week's transactions
                const transactions = await Transaction.find({
                    userId: user._id,
                    date: {
                        $gte: lastWeekStart.toDate(),
                        $lte: lastWeekEnd.toDate()
                    }
                });

                // Calculate summaries
                const income = transactions
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0);
                
                const expenses = transactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0);

                // Group expenses by category
                const categoryExpenses = transactions
                    .filter(t => t.type === 'expense')
                    .reduce((acc, t) => {
                        acc[t.category] = (acc[t.category] || 0) + t.amount;
                        return acc;
                    }, {});

                // Format message
                const message = `📊 *Ringkasan Minggu Lalu*\n\n` +
                              `💰 Pemasukan: Rp ${income.toLocaleString('id-ID')}\n` +
                              `💸 Pengeluaran: Rp ${expenses.toLocaleString('id-ID')}\n` +
                              `💵 Selisih: Rp ${(income - expenses).toLocaleString('id-ID')}\n\n` +
                              `📋 Pengeluaran per Kategori:\n` +
                              Object.entries(categoryExpenses)
                                  .map(([category, amount]) => 
                                      `• ${category}: Rp ${amount.toLocaleString('id-ID')}`)
                                  .join('\n');

                // Send to all active phone numbers
                const activePhones = user.phoneNumbers.filter(p => p.isActive).map(p => p.number);
                for (const phone of activePhones) {
                    await whatsAppBot.sendMessage(phone, message);
                }
            }
        } catch (error) {
            logger.error('Error sending weekly summaries:', error);
        }
    }

    async checkSpendingPatterns() {
        try {
            logger.info('Analyzing spending patterns...');
            const users = await User.find({ 'phoneNumbers.isActive': true });

            for (const user of users) {
                // Get last 30 days transactions
                const transactions = await Transaction.find({
                    userId: user._id,
                    type: 'expense',
                    date: {
                        $gte: moment().subtract(30, 'days').toDate()
                    }
                });

                // Calculate daily averages
                const dailyTotals = transactions.reduce((acc, t) => {
                    const date = moment(t.date).format('YYYY-MM-DD');
                    acc[date] = (acc[date] || 0) + t.amount;
                    return acc;
                }, {});

                const dailyAmounts = Object.values(dailyTotals);
                const average = dailyAmounts.reduce((a, b) => a + b, 0) / dailyAmounts.length;
                const stdDev = Math.sqrt(
                    dailyAmounts.reduce((sq, n) => sq + Math.pow(n - average, 2), 0) / dailyAmounts.length
                );

                // Check today's spending
                const today = moment().format('YYYY-MM-DD');
                const todayTotal = dailyTotals[today] || 0;

                if (todayTotal > average + (2 * stdDev)) {
                    // Unusual spending detected
                    const message = `⚠️ *Peringatan Pengeluaran*\n\n` +
                                  `Pengeluaran hari ini (Rp ${todayTotal.toLocaleString('id-ID')}) ` +
                                  `lebih tinggi dari biasanya.\n\n` +
                                  `Rata-rata harian: Rp ${average.toFixed(0).toLocaleString('id-ID')}`;

                    const activePhones = user.phoneNumbers.filter(p => p.isActive).map(p => p.number);
                    for (const phone of activePhones) {
                        await whatsAppBot.sendMessage(phone, message);
                    }
                }
            }
        } catch (error) {
            logger.error('Error checking spending patterns:', error);
        }
    }

    async generateMonthlyReport(userId, month) {
        // Implementation moved to pdfGenerator.js
        return pdfGenerator.generateMonthlyReport(userId, month);
    }
}

module.exports = new NotificationService();
