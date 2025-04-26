const moment = require('moment');
const logger = require('../utils/logger');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const insightService = require('./insightService');

class GoalService {
    constructor() {
        this.goalTypes = {
            SAVINGS: 'savings',
            DEBT_PAYMENT: 'debt_payment',
            INVESTMENT: 'investment',
            PURCHASE: 'purchase',
            EMERGENCY_FUND: 'emergency_fund',
            EDUCATION: 'education'
        };

        this.timeframes = {
            SHORT: 'short',    // < 1 year
            MEDIUM: 'medium',  // 1-3 years
            LONG: 'long'      // > 3 years
        };
    }

    async createGoal(userId, goalData) {
        try {
            // Validate goal data
            this.validateGoalData(goalData);

            // Calculate monthly target based on timeframe
            const monthlyTarget = this.calculateMonthlyTarget(goalData.targetAmount, goalData.targetDate);

            // Check feasibility based on user's financial history
            const feasibility = await this.checkGoalFeasibility(userId, monthlyTarget);

            const goal = await Goal.create({
                userId,
                type: goalData.type,
                name: goalData.name,
                targetAmount: goalData.targetAmount,
                currentAmount: goalData.currentAmount || 0,
                targetDate: moment(goalData.targetDate).toDate(),
                monthlyTarget,
                priority: goalData.priority || 'medium',
                status: 'active',
                feasibility: feasibility.score,
                strategy: this.generateStrategy(goalData, feasibility),
                milestones: this.generateMilestones(goalData),
                notifications: goalData.notifications || ['monthly']
            });

            return goal;
        } catch (error) {
            logger.error('Error creating goal:', error);
            throw error;
        }
    }

    validateGoalData(goalData) {
        if (!this.goalTypes[goalData.type.toUpperCase()]) {
            throw new Error('Invalid goal type');
        }

        if (!goalData.targetAmount || goalData.targetAmount <= 0) {
            throw new Error('Invalid target amount');
        }

        if (!moment(goalData.targetDate).isValid() || moment(goalData.targetDate).isBefore(moment())) {
            throw new Error('Invalid target date');
        }

        return true;
    }

    calculateMonthlyTarget(targetAmount, targetDate) {
        const months = moment(targetDate).diff(moment(), 'months', true);
        return targetAmount / months;
    }

    async checkGoalFeasibility(userId, monthlyTarget) {
        // Get user's financial data
        const insights = await insightService.generateInsights(userId);
        
        // Calculate feasibility score (0-100)
        let score = 100;
        const factors = [];

        // Factor 1: Monthly savings capacity
        const monthlySavings = insights.savingsAnalysis.monthlyAverage;
        if (monthlyTarget > monthlySavings) {
            score -= 20;
            factors.push({
                type: 'warning',
                message: 'Target bulanan melebihi rata-rata tabungan Anda'
            });
        }

        // Factor 2: Budget stability
        const budgetViolations = insights.budgetAnalysis.filter(b => b.percentage > 100).length;
        if (budgetViolations > 0) {
            score -= 10 * budgetViolations;
            factors.push({
                type: 'warning',
                message: 'Beberapa kategori budget Anda sering terlampaui'
            });
        }

        // Factor 3: Income stability
        if (insights.spendingPatterns.volatility > 0.3) {
            score -= 15;
            factors.push({
                type: 'warning',
                message: 'Pola pemasukan/pengeluaran Anda cukup fluktuatif'
            });
        }

        return {
            score: Math.max(0, score),
            factors,
            recommendation: this.getFeasibilityRecommendation(score)
        };
    }

    getFeasibilityRecommendation(score) {
        if (score >= 80) {
            return 'Goal ini sangat realistis untuk dicapai.';
        } else if (score >= 60) {
            return 'Goal ini bisa dicapai dengan disiplin yang baik.';
        } else if (score >= 40) {
            return 'Goal ini menantang, perlu penyesuaian budget.';
        } else {
            return 'Goal ini terlalu ambisius, pertimbangkan untuk merevisi target.';
        }
    }

    generateStrategy(goalData, feasibility) {
        const strategy = {
            steps: [],
            adjustments: []
        };

        switch (goalData.type) {
            case this.goalTypes.SAVINGS:
                strategy.steps = [
                    'Atur auto-debit untuk tabungan rutin',
                    'Alokasikan bonus dan pendapatan tidak terduga',
                    'Review dan kurangi pengeluaran tidak penting'
                ];
                break;

            case this.goalTypes.INVESTMENT:
                strategy.steps = [
                    'Riset instrumen investasi yang sesuai',
                    'Mulai dengan investasi rutin minimal',
                    'Diversifikasi portofolio seiring waktu'
                ];
                break;

            case this.goalTypes.EMERGENCY_FUND:
                strategy.steps = [
                    'Prioritaskan dana darurat sebelum investasi',
                    'Simpan di instrumen yang likuid',
                    'Target minimal 3x pengeluaran bulanan'
                ];
                break;
        }

        // Add adjustments based on feasibility
        if (feasibility.score < 60) {
            strategy.adjustments = [
                'Perpanjang jangka waktu goal',
                'Kurangi target nominal',
                'Cari sumber pendapatan tambahan'
            ];
        }

        return strategy;
    }

    generateMilestones(goalData) {
        const milestones = [];
        const totalMonths = moment(goalData.targetDate).diff(moment(), 'months');
        
        // Generate quarterly milestones
        for (let i = 3; i <= totalMonths; i += 3) {
            const targetDate = moment().add(i, 'months');
            const targetAmount = (goalData.targetAmount / totalMonths) * i;
            
            milestones.push({
                name: `Target ${i} Bulan`,
                targetDate: targetDate.toDate(),
                targetAmount,
                achieved: false
            });
        }

        // Add final milestone
        milestones.push({
            name: 'Target Akhir',
            targetDate: moment(goalData.targetDate).toDate(),
            targetAmount: goalData.targetAmount,
            achieved: false
        });

        return milestones;
    }

    async updateGoalProgress(goalId, amount) {
        try {
            const goal = await Goal.findById(goalId);
            if (!goal) throw new Error('Goal not found');

            goal.currentAmount += amount;
            
            // Update milestone status
            goal.milestones = goal.milestones.map(milestone => ({
                ...milestone,
                achieved: goal.currentAmount >= milestone.targetAmount
            }));

            // Update goal status if target reached
            if (goal.currentAmount >= goal.targetAmount) {
                goal.status = 'completed';
            }

            await goal.save();
            return goal;
        } catch (error) {
            logger.error('Error updating goal progress:', error);
            throw error;
        }
    }

    async getGoalProgress(goalId) {
        try {
            const goal = await Goal.findById(goalId);
            if (!goal) throw new Error('Goal not found');

            const progress = {
                percentage: (goal.currentAmount / goal.targetAmount) * 100,
                remaining: goal.targetAmount - goal.currentAmount,
                timeRemaining: moment(goal.targetDate).diff(moment(), 'days'),
                onTrack: this.isGoalOnTrack(goal),
                nextMilestone: this.getNextMilestone(goal),
                projectedCompletion: this.calculateProjectedCompletion(goal)
            };

            return progress;
        } catch (error) {
            logger.error('Error getting goal progress:', error);
            throw error;
        }
    }

    isGoalOnTrack(goal) {
        const elapsed = moment().diff(moment(goal.createdAt), 'months', true);
        const expectedAmount = goal.monthlyTarget * elapsed;
        return goal.currentAmount >= expectedAmount;
    }

    getNextMilestone(goal) {
        return goal.milestones.find(m => !m.achieved);
    }

    calculateProjectedCompletion(goal) {
        const monthlyAverage = goal.currentAmount / moment().diff(moment(goal.createdAt), 'months', true);
        const remaining = goal.targetAmount - goal.currentAmount;
        const monthsNeeded = remaining / monthlyAverage;
        
        return moment().add(monthsNeeded, 'months').toDate();
    }

    async generateGoalReport(userId) {
        try {
            const goals = await Goal.find({ userId });
            const report = {
                summary: {
                    total: goals.length,
                    active: goals.filter(g => g.status === 'active').length,
                    completed: goals.filter(g => g.status === 'completed').length,
                    onTrack: goals.filter(g => this.isGoalOnTrack(g)).length
                },
                goals: goals.map(goal => ({
                    name: goal.name,
                    type: goal.type,
                    progress: (goal.currentAmount / goal.targetAmount) * 100,
                    status: goal.status,
                    timeRemaining: moment(goal.targetDate).diff(moment(), 'days'),
                    onTrack: this.isGoalOnTrack(goal)
                }))
            };

            return report;
        } catch (error) {
            logger.error('Error generating goal report:', error);
            throw error;
        }
    }
}

module.exports = new GoalService();
