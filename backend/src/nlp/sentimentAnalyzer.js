const natural = require('natural');
const fs = require('fs');
const path = require('path');

class SentimentAnalyzer {
    constructor() {
        this.financialTerms = {
            positive: [
                'untung', 'laba', 'profit', 'hemat', 'tabungan', 'investasi',
                'bonus', 'diskon', 'cashback', 'pendapatan', 'gajian'
            ],
            negative: [
                'rugi', 'hutang', 'cicilan', 'tagihan', 'denda', 'telat',
                'mahal', 'boros', 'defisit', 'bangkrut', 'kridit'
            ],
            neutral: [
                'transfer', 'saldo', 'rekening', 'transaksi', 'mutasi',
                'anggaran', 'budget', 'biaya', 'dana', 'uang'
            ]
        };

        // Initialize tokenizer for Bahasa Indonesia
        this.tokenizer = new natural.WordTokenizer();
        
        // Initialize sentiment analyzer
        this.analyzer = new natural.SentimentAnalyzer('Indonesian', natural.PorterStemmerId, 'afinn');
    }

    // Analyze financial sentiment from text
    analyzeSentiment(text) {
        const tokens = this.tokenizer.tokenize(text.toLowerCase());
        let score = 0;
        let financialTerms = [];

        tokens.forEach(token => {
            // Check financial terms
            if (this.financialTerms.positive.includes(token)) {
                score += 1;
                financialTerms.push({ term: token, type: 'positive' });
            } else if (this.financialTerms.negative.includes(token)) {
                score -= 1;
                financialTerms.push({ term: token, type: 'negative' });
            } else if (this.financialTerms.neutral.includes(token)) {
                financialTerms.push({ term: token, type: 'neutral' });
            }
        });

        // Get general sentiment
        const generalSentiment = this.analyzer.getSentiment(tokens);

        return {
            score,
            generalSentiment,
            financialTerms,
            sentiment: this.getSentimentCategory(score),
            analysis: this.getAnalysis(score, generalSentiment)
        };
    }

    // Get sentiment category based on score
    getSentimentCategory(score) {
        if (score > 1) return 'very_positive';
        if (score > 0) return 'positive';
        if (score === 0) return 'neutral';
        if (score > -2) return 'negative';
        return 'very_negative';
    }

    // Generate analysis based on sentiment scores
    getAnalysis(financialScore, generalSentiment) {
        let analysis = [];

        // Financial stress analysis
        if (financialScore < -1) {
            analysis.push({
                type: 'financial_stress',
                message: 'Terdeteksi indikasi stress keuangan. Mungkin Anda perlu memeriksa anggaran dan pengeluaran.',
                suggestion: 'Coba periksa budget Anda atau konsultasikan dengan kami untuk saran pengelolaan keuangan.'
            });
        }

        // Spending behavior analysis
        if (financialScore < 0 && generalSentiment < 0) {
            analysis.push({
                type: 'spending_behavior',
                message: 'Pola pengeluaran menunjukkan kecenderungan negatif.',
                suggestion: 'Pertimbangkan untuk membuat rencana penghematan atau anggaran yang lebih ketat.'
            });
        }

        // Positive financial behavior
        if (financialScore > 0) {
            analysis.push({
                type: 'positive_behavior',
                message: 'Anda menunjukkan pola keuangan yang positif.',
                suggestion: 'Pertahankan kebiasaan baik ini dan pertimbangkan untuk meningkatkan investasi.'
            });
        }

        return analysis;
    }

    // Add custom financial terms
    addFinancialTerms(terms, category) {
        if (this.financialTerms[category]) {
            this.financialTerms[category] = [...new Set([...this.financialTerms[category], ...terms])];
            return true;
        }
        return false;
    }

    // Learn from user interactions
    learnFromInteraction(text, userResponse) {
        // Implement machine learning to improve sentiment analysis based on user interactions
        // This is a placeholder for future implementation
        console.log('Learning from interaction:', { text, userResponse });
    }
}

module.exports = new SentimentAnalyzer();
