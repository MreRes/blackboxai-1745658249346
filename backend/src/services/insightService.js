const moment = require('moment');
const logger = require('../utils/logger');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const sentimentAnalyzer = require('../nlp/sentimentAnalyzer');

class InsightService {
    async generateInsights(userId) {
        try {
            const insights = {
                spendingPatterns: await this.analyzeSpendingPatterns(userId),
                budgetAnalysis: await this.analyzeBudgetPerformance(userId),
                savingsAnalysis: await this.analyzeSavingsRate(userId),
                categoryAnalysis: await this.analyzeCategoryTrends(userId),
                recommendations: []
            };

            // Generate recommendations based on analyses
            insights.recommendations = await this.generateRecommendations(insights);

            return insights;
        } catch (error) {
            logger.error('Error generating insights:', error);
            throw error;
        }
    }

    async analyzeSpendingPatterns(userId) {
        const sixMonthsAgo = moment().subtract(6, 'months').startOf('month');
        
        // Get monthly spending totals
        const monthlySpending = await Transaction.aggregate([
            {
                $match: {
                    userId,
                    type: 'expense',
                    date: { $gte: sixMonthsAgo.toDate() }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    total: { $sum: '$amount' }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        // Calculate trends
        const amounts = monthlySpending.map(m => m.total);
        const average = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const trend = this.calculateTrend(amounts);

        return {
            monthlyTotals: monthlySpending,
            averageMonthly: average,
            trend: trend,
            highestMonth: Math.max(...amounts),
            lowestMonth: Math.min(...amounts),
            volatility: this.calculateVolatility(amounts)
        };
    }

    async analyzeBudgetPerformance(userId) {
        const currentMonth = moment().startOf('month');
        
        // Get all budgets for current month
        const budgets = await Budget.find({
            userId,
            startDate: { $lte: moment().toDate() },
            endDate: { $gte: moment().toDate() }
        });

        const budgetAnalysis = [];

        for (const budget of budgets) {
            const expenses = await Transaction.aggregate([
                {
                    $match: {
                        userId,
                        type: 'expense',
                        category: budget.category,
                        date: {
                            $gte: currentMonth.toDate(),
                            $lte: moment().toDate()
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
            const remaining = budget.amount - spent;
            const percentage = (spent / budget.amount) * 100;

            budgetAnalysis.push({
                category: budget.category,
                budgeted: budget.amount,
                spent,
                remaining,
                percentage,
                status: this.getBudgetStatus(percentage)
            });
        }

        return budgetAnalysis;
    }

    async analyzeSavingsRate(userId) {
        const lastSixMonths = moment().subtract(6, 'months').startOf('month');
        
        const transactions = await Transaction.aggregate([
            {
                $match: {
                    userId,
                    date: { $gte: lastSixMonths.toDate() }
                }
            },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const income = transactions.find(t => t._id === 'income')?.total || 0;
        const expenses = transactions.find(t => t._id === 'expense')?.total || 0;
        const savings = income - expenses;
        const savingsRate = income > 0 ? (savings / income) * 100 : 0;

        return {
            income,
            expenses,
            savings,
            savingsRate,
            status: this.getSavingsStatus(savingsRate),
            monthlyAverage: savings / 6
        };
    }

    async analyzeCategoryTrends(userId) {
        const threeMonthsAgo = moment().subtract(3, 'months').startOf('month');
        
        const categoryTrends = await Transaction.aggregate([
            {
                $match: {
                    userId,
                    type: 'expense',
                    date: { $gte: threeMonthsAgo.toDate() }
                }
            },
            {
                $group: {
                    _id: {
                        category: '$category',
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    total: { $sum: '$amount' }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ]);

        // Organize by category
        const trends = {};
        categoryTrends.forEach(trend => {
            if (!trends[trend._id.category]) {
                trends[trend._id.category] = [];
            }
            trends[trend._id.category].push({
                month: `${trend._id.year}-${trend._id.month}`,
                amount: trend.total
            });
        });

        // Calculate trend for each category
        Object.keys(trends).forEach(category => {
            const amounts = trends[category].map(t => t.amount);
            trends[category] = {
                data: trends[category],
                trend: this.calculateTrend(amounts),
                average: amounts.reduce((a, b) => a + b, 0) / amounts.length
            };
        });

        return trends;
    }

    async generateRecommendations(insights) {
        const recommendations = [];

        // Spending pattern recommendations
        if (insights.spendingPatterns.trend > 0.1) {
            recommendations.push({
                type: 'warning',
                message: 'Pengeluaran Anda menunjukkan tren kenaikan. Pertimbangkan untuk mengevaluasi pengeluaran rutin.',
                priority: 'high'
            });
        }

        // Budget recommendations
        const overBudgetCategories = insights.budgetAnalysis
            .filter(b => b.percentage > 100)
            .map(b => b.category);
        
        if (overBudgetCategories.length > 0) {
            recommendations.push({
                type: 'alert',
                message: `Budget untuk kategori ${overBudgetCategories.join(', ')} terlampaui. Evaluasi kembali alokasi budget Anda.`,
                priority: 'high'
            });
        }

        // Savings recommendations
        if (insights.savingsAnalysis.savingsRate < 20) {
            recommendations.push({
                type: 'warning',
                message: 'Tingkat tabungan Anda di bawah rekomendasi (20%). Pertimbangkan untuk:',
                details: [
                    'Membuat anggaran lebih ketat',
                    'Mengurangi pengeluaran tidak penting',
                    'Mencari sumber pendapatan tambahan'
                ],
                priority: 'high'
            });
        } else if (insights.savingsAnalysis.savingsRate > 30) {
            recommendations.push({
                type: 'opportunity',
                message: 'Tingkat tabungan Anda sangat baik! Pertimbangkan untuk:',
                details: [
                    'Mulai berinvestasi',
                    'Diversifikasi portofolio',
                    'Membuat dana darurat'
                ],
                priority: 'medium'
            });
        }

        // Category-specific recommendations
        Object.entries(insights.categoryTrends).forEach(([category, data]) => {
            if (data.trend > 0.2) {
                recommendations.push({
                    type: 'insight',
                    message: `Pengeluaran untuk kategori ${category} menunjukkan peningkatan signifikan.`,
                    details: ['Periksa penyebab kenaikan', 'Evaluasi kebutuhan vs keinginan'],
                    priority: 'medium'
                });
            }
        });

        return recommendations;
    }

    calculateTrend(numbers) {
        if (numbers.length < 2) return 0;
        
        const n = numbers.length;
        const x = Array.from({length: n}, (_, i) => i);
        const y = numbers;
        
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + (xi * y[i]), 0);
        const sumXX = x.reduce((sum, xi) => sum + (xi * xi), 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return slope / numbers[0]; // Normalize by first value
    }

    calculateVolatility(numbers) {
        const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
        return Math.sqrt(variance) / mean; // Coefficient of variation
    }

    getBudgetStatus(percentage) {
        if (percentage >= 100) return 'exceeded';
        if (percentage >= 80) return 'warning';
        if (percentage >= 50) return 'normal';
        return 'good';
    }

    getSavingsStatus(savingsRate) {
        if (savingsRate >= 30) return 'excellent';
        if (savingsRate >= 20) return 'good';
        if (savingsRate >= 10) return 'fair';
        return 'poor';
    }
}

module.exports = new InsightService();
