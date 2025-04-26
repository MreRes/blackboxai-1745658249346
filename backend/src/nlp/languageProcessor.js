const natural = require('natural');
const logger = require('../utils/logger');

class LanguageProcessor {
    constructor() {
        // Initialize spell checker
        this.spellChecker = new natural.Spellcheck();

        // Common Indonesian slang dictionary
        this.slangDictionary = {
            // Money-related
            'duit': 'uang',
            'doku': 'uang',
            'gopek': '500',
            'ceban': '10000',
            'sejuta': '1000000',
            'seceng': '100',
            'sopi': '1000',
            
            // Transaction-related
            'tf': 'transfer',
            'trf': 'transfer',
            'trx': 'transaksi',
            'bayar': 'pembayaran',
            'byr': 'bayar',
            
            // Amount-related
            'rb': 'ribu',
            'jt': 'juta',
            'k': '000',
            'M': '000000',
            
            // Time-related
            'hr': 'hari',
            'bln': 'bulan',
            'thn': 'tahun',
            'kmrn': 'kemarin',
            'bsk': 'besok',
            
            // Common words
            'yg': 'yang',
            'dgn': 'dengan',
            'utk': 'untuk',
            'dr': 'dari',
            'krn': 'karena',
            'tdk': 'tidak',
            'gk': 'tidak',
            'ga': 'tidak',
            'gak': 'tidak',
            'bgt': 'banget',
            'sdh': 'sudah',
            'udh': 'sudah',
            'blm': 'belum',
            'skrg': 'sekarang',
            
            // Financial terms
            'saldo': 'saldo',
            'rek': 'rekening',
            'cc': 'kartu kredit',
            'atm': 'ATM',
            'dp': 'uang muka',
            'cicil': 'cicilan',
            'bnga': 'bunga',
            'gaji': 'gaji',
            'thr': 'tunjangan hari raya'
        };

        // Regional variations
        this.regionalVariations = {
            'duid': 'uang',    // Javanese
            'pipis': 'uang',   // Sundanese
            'fulus': 'uang',   // Betawi
            'kepeng': 'uang',  // Balinese
            'pitis': 'uang'    // Minang
        };

        // Initialize word distance calculator
        this.metaphone = natural.Metaphone;
        this.soundEx = natural.SoundEx;

        // Add custom words to spell checker
        this.addCustomWords();
    }

    // Add custom financial terms to spell checker
    addCustomWords() {
        const customWords = [
            'transfer', 'transaksi', 'saldo', 'rekening', 'kredit',
            'debit', 'cicilan', 'angsuran', 'deposito', 'investasi',
            'obligasi', 'saham', 'dividen', 'pajak', 'bunga'
        ];

        customWords.forEach(word => {
            this.spellChecker.addWord(word);
        });
    }

    // Process text before NLP analysis
    preprocess(text) {
        // Convert to lowercase
        let processed = text.toLowerCase();

        // Replace regional variations
        for (const [variation, standard] of Object.entries(this.regionalVariations)) {
            processed = processed.replace(new RegExp(`\\b${variation}\\b`, 'g'), standard);
        }

        // Replace slang terms
        for (const [slang, formal] of Object.entries(this.slangDictionary)) {
            processed = processed.replace(new RegExp(`\\b${slang}\\b`, 'g'), formal);
        }

        // Handle number formatting
        processed = this.processNumbers(processed);

        return processed;
    }

    // Process numbers and currency amounts
    processNumbers(text) {
        // Replace 'k' with '000'
        text = text.replace(/(\d+)k\b/gi, (match, number) => `${number}000`);
        
        // Replace 'jt' or 'M' with proper zeros
        text = text.replace(/(\d+)(?:jt|M)\b/gi, (match, number) => `${number}000000`);
        
        // Handle decimal separators
        text = text.replace(/(\d+),(\d+)/g, '$1.$2');
        
        // Remove currency symbols and spaces
        text = text.replace(/rp\.?\s*/gi, '');
        
        return text;
    }

    // Correct spelling
    correctSpelling(word) {
        if (this.spellChecker.isCorrect(word)) {
            return word;
        }

        const suggestions = this.spellChecker.getCorrections(word, 1);
        return suggestions.length > 0 ? suggestions[0] : word;
    }

    // Find similar words using phonetic algorithms
    findSimilarWords(word) {
        const metaphoneValue = this.metaphone.process(word);
        const soundexValue = this.soundEx.process(word);
        
        const similar = new Set();
        
        // Check against slang dictionary
        for (const [slang, formal] of Object.entries(this.slangDictionary)) {
            if (this.metaphone.process(slang) === metaphoneValue ||
                this.soundEx.process(slang) === soundexValue) {
                similar.add(formal);
            }
        }
        
        return Array.from(similar);
    }

    // Extract amount from text
    extractAmount(text) {
        const processed = this.preprocess(text);
        
        // Regular expressions for different amount formats
        const patterns = [
            /(\d+(?:\.\d{3})*(?:,\d{2})?)/,  // Standard format
            /(\d+)\s*(?:ribu|rb)/i,           // Thousands
            /(\d+)\s*(?:juta|jt)/i,           // Millions
            /(\d+)\s*(?:k)/i,                 // Thousands (k)
            /(\d+)\s*(?:M)/i                  // Millions (M)
        ];

        for (const pattern of patterns) {
            const match = processed.match(pattern);
            if (match) {
                let amount = match[1].replace(/\./g, '');
                
                // Convert to actual number
                if (processed.includes('ribu') || processed.includes('rb') || processed.includes('k')) {
                    amount = parseFloat(amount) * 1000;
                } else if (processed.includes('juta') || processed.includes('jt') || processed.includes('M')) {
                    amount = parseFloat(amount) * 1000000;
                }
                
                return parseFloat(amount);
            }
        }
        
        return null;
    }

    // Extract date from text
    extractDate(text) {
        const processed = this.preprocess(text);
        
        // Handle relative dates
        if (processed.includes('kemarin')) {
            return new Date(Date.now() - 86400000);
        } else if (processed.includes('besok')) {
            return new Date(Date.now() + 86400000);
        }
        
        // Try to parse specific date formats
        const datePattern = /(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}|\d{2}))?/;
        const match = processed.match(datePattern);
        
        if (match) {
            const [_, day, month, year] = match;
            const fullYear = year ? (year.length === 2 ? '20' + year : year) : new Date().getFullYear();
            return new Date(fullYear, month - 1, day);
        }
        
        return new Date();
    }

    // Log unknown terms for future improvements
    logUnknownTerm(term) {
        logger.info(`Unknown term encountered: ${term}`);
        // Could be extended to store in database for analysis
    }

    // Add new slang terms
    addSlangTerm(slang, formal) {
        this.slangDictionary[slang] = formal;
        logger.info(`Added new slang term: ${slang} -> ${formal}`);
    }

    // Add new regional variation
    addRegionalVariation(variation, standard) {
        this.regionalVariations[variation] = standard;
        logger.info(`Added new regional variation: ${variation} -> ${standard}`);
    }
}

module.exports = new LanguageProcessor();
