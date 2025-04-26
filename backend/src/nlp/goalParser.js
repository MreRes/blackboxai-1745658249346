const moment = require('moment');
const logger = require('../utils/logger');
const languageProcessor = require('./languageProcessor');

class GoalParser {
    constructor() {
        this.goalTypes = {
            'tabungan': 'savings',
            'nabung': 'savings',
            'menabung': 'savings',
            'simpan': 'savings',
            'dana darurat': 'emergency_fund',
            'emergency': 'emergency_fund',
            'darurat': 'emergency_fund',
            'investasi': 'investment',
            'invest': 'investment',
            'saham': 'investment',
            'reksadana': 'investment',
            'pendidikan': 'education',
            'sekolah': 'education',
            'kuliah': 'education',
            'beli': 'purchase',
            'pembelian': 'purchase',
            'cicilan': 'debt_payment',
            'utang': 'debt_payment',
            'hutang': 'debt_payment',
            'bayar': 'debt_payment'
        };

        this.timeKeywords = {
            'hari': 'days',
            'minggu': 'weeks',
            'bulan': 'months',
            'tahun': 'years',
            'besok': moment().add(1, 'day'),
            'lusa': moment().add(2, 'days'),
            'minggu depan': moment().add(1, 'week'),
            'bulan depan': moment().add(1, 'month'),
            'tahun depan': moment().add(1, 'year')
        };

        this.priorityKeywords = {
            'penting': 'high',
            'urgent': 'high',
            'prioritas': 'high',
            'utama': 'high',
            'sedang': 'medium',
            'biasa': 'medium',
            'normal': 'medium',
            'rendah': 'low',
            'santai': 'low',
            'tidak penting': 'low'
        };
    }

    extractGoalInfo(text) {
        try {
            const normalizedText = text.toLowerCase();
            
            return {
                type: this.extractGoalType(normalizedText),
                name: this.extractGoalName(normalizedText),
                targetAmount: this.extractTargetAmount(normalizedText),
                targetDate: this.extractTargetDate(normalizedText),
                priority: this.extractPriority(normalizedText)
            };
        } catch (error) {
            logger.error('Error extracting goal info:', error);
            return {};
        }
    }

    extractGoalType(text) {
        for (const [keyword, type] of Object.entries(this.goalTypes)) {
            if (text.includes(keyword)) {
                return type;
            }
        }
        return null;
    }

    extractGoalName(text) {
        // Remove common command words
        let cleanText = text.replace(/tambah goal|buat goal|target|goal baru/g, '').trim();
        
        // Remove amount patterns
        cleanText = cleanText.replace(/Rp\.?\s?\d+(?:\.\d{3})*(?:,\d{2})?/g, '').trim();
        cleanText = cleanText.replace(/\d+\s?(?:ribu|rb|juta|jt|k|m)\b/gi, '').trim();
        
        // Remove date patterns
        cleanText = cleanText.replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/, '').trim();
        cleanText = cleanText.replace(/\d{1,2}\s(?:hari|minggu|bulan|tahun)/, '').trim();
        
        // Extract remaining meaningful words
        const words = cleanText.split(' ').filter(word => 
            !Object.keys(this.goalTypes).includes(word) &&
            !Object.keys(this.timeKeywords).includes(word) &&
            !Object.keys(this.priorityKeywords).includes(word)
        );

        return words.join(' ').trim() || null;
    }

    extractTargetAmount(text) {
        return languageProcessor.extractAmount(text);
    }

    extractTargetDate(text) {
        // Try to extract explicit date
        const dateMatch = text.match(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/);
        if (dateMatch) {
            const date = moment(dateMatch[0], ['DD/MM/YYYY', 'DD/MM/YY', 'DD/MM']);
            if (date.isValid()) {
                return date.toDate();
            }
        }

        // Try to extract relative time
        const timeMatch = text.match(/(\d+)\s*(hari|minggu|bulan|tahun)/);
        if (timeMatch) {
            const [_, amount, unit] = timeMatch;
            return moment().add(amount, this.timeKeywords[unit]).toDate();
        }

        // Check for time keywords
        for (const [keyword, value] of Object.entries(this.timeKeywords)) {
            if (text.includes(keyword)) {
                return moment.isMoment(value) ? value.toDate() : moment().add(1, value).toDate();
            }
        }

        // Default to 1 month if no date specified
        return moment().add(1, 'month').toDate();
    }

    extractPriority(text) {
        for (const [keyword, priority] of Object.entries(this.priorityKeywords)) {
            if (text.includes(keyword)) {
                return priority;
            }
        }
        return 'medium';
    }

    extractUpdateInfo(text) {
        try {
            // Extract amount
            const amount = this.extractTargetAmount(text);

            // Extract goal name
            let goalName = text
                .replace(/update goal|perbarui goal|progress goal/g, '')
                .replace(/Rp\.?\s?\d+(?:\.\d{3})*(?:,\d{2})?/g, '')
                .replace(/\d+\s?(?:ribu|rb|juta|jt|k|m)\b/gi, '')
                .trim();

            // Clean up goal name
            goalName = goalName.split(' ')
                .filter(word => !Object.keys(this.timeKeywords).includes(word))
                .join(' ')
                .trim();

            return {
                goalName,
                amount
            };
        } catch (error) {
            logger.error('Error extracting update info:', error);
            return {};
        }
    }

    extractGoalNameFromText(text) {
        try {
            // Remove command words
            let goalName = text
                .replace(/hapus goal|batalkan goal|selesai goal/g, '')
                .trim();

            // Clean up goal name
            goalName = goalName.split(' ')
                .filter(word => 
                    !Object.keys(this.goalTypes).includes(word) &&
                    !Object.keys(this.timeKeywords).includes(word) &&
                    !Object.keys(this.priorityKeywords).includes(word)
                )
                .join(' ')
                .trim();

            return goalName || null;
        } catch (error) {
            logger.error('Error extracting goal name:', error);
            return null;
        }
    }

    formatGoalResponse(goalInfo) {
        const parts = [];

        if (goalInfo.type) {
            parts.push(`Jenis: ${this.getGoalTypeInIndonesian(goalInfo.type)}`);
        }
        if (goalInfo.targetAmount) {
            parts.push(`Target: Rp ${goalInfo.targetAmount.toLocaleString('id-ID')}`);
        }
        if (goalInfo.targetDate) {
            parts.push(`Tenggat: ${moment(goalInfo.targetDate).format('DD MMMM YYYY')}`);
        }
        if (goalInfo.priority) {
            parts.push(`Prioritas: ${this.getPriorityInIndonesian(goalInfo.priority)}`);
        }

        return parts.join('\n');
    }

    getGoalTypeInIndonesian(type) {
        const types = {
            'savings': 'Tabungan',
            'emergency_fund': 'Dana Darurat',
            'investment': 'Investasi',
            'education': 'Pendidikan',
            'purchase': 'Pembelian',
            'debt_payment': 'Pembayaran Utang'
        };
        return types[type] || type;
    }

    getPriorityInIndonesian(priority) {
        const priorities = {
            'high': 'Tinggi',
            'medium': 'Sedang',
            'low': 'Rendah'
        };
        return priorities[priority] || priority;
    }
}

module.exports = new GoalParser();
