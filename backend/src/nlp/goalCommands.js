const moment = require('moment');
const Goal = require('../models/Goal');
const goalService = require('../services/goalService');
const educationService = require('../services/educationService');
const goalParser = require('./goalParser');
const logger = require('../utils/logger');

class GoalCommands {
    constructor() {
        this.commands = {
            'tambah_goal': ['tambah goal', 'buat goal', 'target baru', 'goal baru'],
            'lihat_goal': ['lihat goal', 'cek goal', 'status goal', 'progress goal'],
            'update_goal': ['update goal', 'perbarui goal', 'progress goal'],
            'hapus_goal': ['hapus goal', 'batalkan goal', 'selesai goal'],
            'tips': ['tips keuangan', 'saran keuangan', 'edukasi', 'pembelajaran']
        };
    }

    async handleGoalCommand(text, user, type) {
        try {
            switch (type) {
                case 'tambah_goal':
                    return await this.handleAddGoal(text, user);
                case 'lihat_goal':
                    return await this.handleViewGoal(text, user);
                case 'update_goal':
                    return await this.handleUpdateGoal(text, user);
                case 'hapus_goal':
                    return await this.handleDeleteGoal(text, user);
                case 'tips':
                    return await this.handleFinancialTips(text, user);
                default:
                    return {
                        type: 'text',
                        content: 'Maaf, perintah tidak dikenali. Ketik "bantuan goal" untuk melihat panduan.'
                    };
            }
        } catch (error) {
            logger.error('Error handling goal command:', error);
            return {
                type: 'text',
                content: 'Maaf, terjadi kesalahan dalam memproses perintah.'
            };
        }
    }

    async handleAddGoal(text, user) {
        // Extract goal information using goalParser
        const goalInfo = goalParser.extractGoalInfo(text);
        
        if (!goalInfo.targetAmount || !goalInfo.type) {
            return {
                type: 'text',
                content: `Untuk menambah goal, gunakan format:\n` +
                        `"tambah goal [jenis] [target] [tanggal]"\n\n` +
                        `Contoh:\n` +
                        `"tambah goal tabungan 10jt desember 2024"\n` +
                        `"buat goal dana darurat 30jt 6 bulan"\n\n` +
                        `Jenis goal yang tersedia:\n` +
                        `- Tabungan\n` +
                        `- Dana Darurat\n` +
                        `- Investasi\n` +
                        `- Pendidikan\n` +
                        `- Pembelian\n` +
                        `- Pembayaran Utang`
            };
        }

        try {
            const goal = await goalService.createGoal(user._id, {
                type: goalInfo.type,
                name: goalInfo.name || `${goalParser.getGoalTypeInIndonesian(goalInfo.type)} Goal`,
                targetAmount: goalInfo.targetAmount,
                targetDate: goalInfo.targetDate,
                priority: goalInfo.priority || 'medium'
            });

            // Get relevant financial tip
            const tip = educationService.getContextualTip({ goalType: goalInfo.type });

            return {
                type: 'text',
                content: `✅ Goal berhasil dibuat!\n\n` +
                        goalParser.formatGoalResponse(goal) + '\n\n' +
                        `💰 Target Bulanan: Rp ${goal.monthlyTarget.toLocaleString('id-ID')}\n\n` +
                        `💡 Tips: ${tip.content}`
            };
        } catch (error) {
            logger.error('Error creating goal:', error);
            return {
                type: 'text',
                content: 'Maaf, terjadi kesalahan dalam membuat goal.'
            };
        }
    }

    async handleViewGoal(text, user) {
        try {
            const goals = await Goal.find({ userId: user._id, status: 'active' });
            
            if (goals.length === 0) {
                return {
                    type: 'text',
                    content: 'Anda belum memiliki goal aktif. Ketik "tambah goal" untuk membuat goal baru.'
                };
            }

            let response = '📊 *Progress Goal Anda*\n\n';
            
            for (const goal of goals) {
                const progress = await goalService.getGoalProgress(goal._id);
                const timeRemaining = moment(goal.targetDate).fromNow(true);

                response += `🎯 *${goal.name}*\n` +
                          `${goalParser.formatGoalResponse(goal)}\n` +
                          `Progress: ${progress.percentage.toFixed(1)}%\n` +
                          `Sisa Target: Rp ${progress.remaining.toLocaleString('id-ID')}\n` +
                          `Waktu: ${timeRemaining}\n` +
                          `Status: ${progress.onTrack ? '✅ On Track' : '⚠️ Behind Schedule'}\n\n`;

                if (progress.nextMilestone) {
                    response += `📍 *Milestone Berikutnya:*\n` +
                              `${progress.nextMilestone.name}\n` +
                              `Target: Rp ${progress.nextMilestone.targetAmount.toLocaleString('id-ID')}\n\n`;
                }
            }

            // Add summary
            const summary = await Goal.getGoalsSummary(user._id);
            response += `📈 *Ringkasan:*\n` +
                       `Total Goal: ${summary.total}\n` +
                       `On Track: ${summary.onTrack}\n` +
                       `Progress Rata-rata: ${summary.averageProgress.toFixed(1)}%`;

            return {
                type: 'text',
                content: response
            };
        } catch (error) {
            logger.error('Error viewing goals:', error);
            return {
                type: 'text',
                content: 'Maaf, terjadi kesalahan dalam menampilkan goal.'
            };
        }
    }

    async handleUpdateGoal(text, user) {
        // Extract update information using goalParser
        const { goalName, amount } = goalParser.extractUpdateInfo(text);
        
        if (!goalName || !amount) {
            return {
                type: 'text',
                content: `Untuk update goal, gunakan format:\n` +
                        `"update goal [nama goal] [jumlah]"\n\n` +
                        `Contoh:\n` +
                        `"update goal tabungan rumah 5jt"\n` +
                        `"progress goal dana darurat 2.5jt"`
            };
        }

        try {
            const goal = await Goal.findOne({
                userId: user._id,
                name: new RegExp(goalName, 'i'),
                status: 'active'
            });

            if (!goal) {
                return {
                    type: 'text',
                    content: 'Goal tidak ditemukan. Ketik "lihat goal" untuk melihat daftar goal Anda.'
                };
            }

            await goalService.updateGoalProgress(goal._id, amount);
            const progress = await goalService.getGoalProgress(goal._id);

            let response = `✅ Progress goal "${goal.name}" berhasil diperbarui!\n\n` +
                         `${goalParser.formatGoalResponse(goal)}\n` +
                         `Progress: ${progress.percentage.toFixed(1)}%\n` +
                         `Sisa Target: Rp ${progress.remaining.toLocaleString('id-ID')}\n`;

            if (progress.nextMilestone) {
                response += `\n🎯 Milestone berikutnya:\n` +
                          `${progress.nextMilestone.name}: Rp ${progress.nextMilestone.targetAmount.toLocaleString('id-ID')}`;
            }

            // Add motivational message based on progress
            if (progress.percentage >= 75) {
                response += '\n\n💪 Hampir sampai! Tetap semangat!';
            } else if (progress.percentage >= 50) {
                response += '\n\n👏 Sudah setengah jalan! Pertahankan!';
            } else if (progress.percentage >= 25) {
                response += '\n\n🌟 Progress yang bagus! Terus konsisten!';
            } else {
                response += '\n\n🚀 Langkah awal yang baik! Tetap fokus!';
            }

            return {
                type: 'text',
                content: response
            };
        } catch (error) {
            logger.error('Error updating goal:', error);
            return {
                type: 'text',
                content: 'Maaf, terjadi kesalahan dalam memperbarui goal.'
            };
        }
    }

    async handleDeleteGoal(text, user) {
        const goalName = goalParser.extractGoalNameFromText(text);
        
        if (!goalName) {
            return {
                type: 'text',
                content: `Untuk menghapus goal, gunakan format:\n` +
                        `"hapus goal [nama goal]"\n\n` +
                        `Contoh:\n` +
                        `"hapus goal tabungan rumah"`
            };
        }

        try {
            const goal = await Goal.findOne({
                userId: user._id,
                name: new RegExp(goalName, 'i'),
                status: 'active'
            });

            if (!goal) {
                return {
                    type: 'text',
                    content: 'Goal tidak ditemukan. Ketik "lihat goal" untuk melihat daftar goal Anda.'
                };
            }

            goal.status = 'cancelled';
            await goal.save();

            return {
                type: 'text',
                content: `✅ Goal "${goal.name}" berhasil dihapus.\n\n` +
                        `Ringkasan goal:\n` +
                        goalParser.formatGoalResponse(goal)
            };
        } catch (error) {
            logger.error('Error deleting goal:', error);
            return {
                type: 'text',
                content: 'Maaf, terjadi kesalahan dalam menghapus goal.'
            };
        }
    }

    async handleFinancialTips(text, user) {
        try {
            // Get user's financial context
            const goals = await Goal.find({ userId: user._id, status: 'active' });
            const context = {
                hasActiveGoals: goals.length > 0,
                goalTypes: goals.map(g => g.type)
            };

            // Get relevant tip and educational content
            const tip = educationService.getContextualTip(context);
            const quote = educationService.getFinancialQuote();

            // Get weekly learning plan based on user's goals
            const learningPlan = educationService.generateWeeklyLearningPlan(
                goals.length === 0 ? 'basic' : 'intermediate'
            );

            return {
                type: 'text',
                content: `💡 *Tips Keuangan*\n\n` +
                        `${tip.title}\n` +
                        `${tip.content}\n\n` +
                        `📝 *Detail:*\n${tip.detail}\n\n` +
                        `📚 *Rencana Belajar Minggu Ini:*\n` +
                        learningPlan.topics.map(t => 
                            `${t.day}: ${t.topic}\n${t.activity}`
                        ).join('\n\n') + '\n\n' +
                        `💭 *Quote of the Day:*\n` +
                        `"${quote.text}"\n` +
                        `- ${quote.author}`
            };
        } catch (error) {
            logger.error('Error getting financial tips:', error);
            return {
                type: 'text',
                content: 'Maaf, terjadi kesalahan dalam memuat tips keuangan.'
            };
        }
    }
}

module.exports = new GoalCommands();
