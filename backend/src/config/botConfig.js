module.exports = {
    // WhatsApp Bot Configuration
    whatsapp: {
        clientId: "financial-bot",
        puppeteerOptions: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        },
        reconnectInterval: 5000, // 5 seconds
        qrCodeTimeout: 60000,    // 1 minute
        sessionPath: '.wwebjs_auth'
    },

    // NLP Configuration
    nlp: {
        // Confidence threshold for intent classification
        intentThreshold: 0.7,
        
        // Language settings
        language: 'id',  // Indonesian
        
        // Context expiry time
        contextExpiry: 5 * 60 * 1000,  // 5 minutes
        
        // Maximum conversation history to maintain
        maxConversationHistory: 10
    },

    // Financial Settings
    financial: {
        // Default budget categories
        categories: [
            'Makanan & Minuman',
            'Transportasi',
            'Utilitas',
            'Komunikasi',
            'Belanja',
            'Pendapatan',
            'Investasi',
            'Kesehatan',
            'Hiburan',
            'Lainnya'
        ],

        // Budget warning thresholds
        budgetWarnings: {
            high: 80,    // Percentage for high warning
            critical: 95 // Percentage for critical warning
        },

        // Goal settings
        goals: {
            minDuration: 7,      // Minimum goal duration in days
            maxDuration: 3650,   // Maximum goal duration in days (10 years)
            defaultPriority: 'medium',
            milestoneIntervals: [25, 50, 75, 100] // Percentage intervals for milestones
        },

        // Report settings
        reports: {
            defaultPeriod: 'monthly',
            maxHistoryMonths: 12,
            pdfTemplate: 'default',
            chartColors: {
                income: 'rgb(34, 197, 94)',
                expense: 'rgb(239, 68, 68)',
                neutral: 'rgb(59, 130, 246)'
            }
        }
    },

    // Notification Settings
    notifications: {
        // Budget notifications
        budget: {
            checkInterval: '0 9 * * *',     // Daily at 9 AM
            warningThreshold: 80,           // Percentage
            criticalThreshold: 95           // Percentage
        },

        // Goal notifications
        goals: {
            checkInterval: '0 10 * * *',    // Daily at 10 AM
            reminderDays: [7, 3, 1],        // Days before deadline
            progressUpdates: 'weekly'        // Frequency of progress updates
        },

        // Report notifications
        reports: {
            monthly: '0 8 1 * *',           // 1st day of month at 8 AM
            weekly: '0 8 * * 1',            // Every Monday at 8 AM
            daily: '0 20 * * *'             // Daily at 8 PM
        },

        // Subscription notifications
        subscription: {
            checkInterval: '0 11 * * *',    // Daily at 11 AM
            expiryWarningDays: [7, 3, 1]    // Days before expiry to notify
        }
    },

    // Security Settings
    security: {
        jwt: {
            accessTokenExpiry: '15m',
            refreshTokenExpiry: '7d',
            issuer: 'financial-bot'
        },
        
        password: {
            minLength: 8,
            requireSpecialChar: true,
            requireNumber: true,
            requireUppercase: true
        },

        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        },

        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }
    },

    // Educational Content Settings
    education: {
        // Difficulty levels for financial education
        levels: ['basic', 'intermediate', 'advanced'],
        
        // Learning paths
        paths: {
            basic: ['budgeting', 'saving', 'debt-management'],
            intermediate: ['investment', 'tax-planning', 'insurance'],
            advanced: ['portfolio-management', 'estate-planning', 'retirement']
        },

        // Content refresh intervals
        refreshIntervals: {
            tips: '1d',
            lessons: '7d',
            articles: '30d'
        }
    },

    // Error Messages
    errors: {
        auth: {
            invalidCredentials: 'Username atau password tidak valid',
            sessionExpired: 'Sesi Anda telah berakhir. Silakan login kembali',
            unauthorized: 'Anda tidak memiliki akses ke fitur ini'
        },
        transaction: {
            invalidAmount: 'Jumlah tidak valid',
            invalidCategory: 'Kategori tidak valid',
            notFound: 'Transaksi tidak ditemukan'
        },
        goal: {
            invalidTarget: 'Target tidak valid',
            invalidDate: 'Tanggal tidak valid',
            notFound: 'Goal tidak ditemukan'
        },
        budget: {
            invalidAmount: 'Jumlah budget tidak valid',
            periodConflict: 'Periode budget bertabrakan',
            notFound: 'Budget tidak ditemukan'
        },
        general: {
            serverError: 'Terjadi kesalahan pada server',
            validationError: 'Data yang dimasukkan tidak valid',
            notFound: 'Data tidak ditemukan'
        }
    },

    // Development Tools
    development: {
        // Logger settings
        logger: {
            level: process.env.LOG_LEVEL || 'info',
            format: 'json',
            timestamps: true
        },

        // Debug mode settings
        debug: {
            enabled: process.env.DEBUG === 'true',
            verboseErrors: process.env.NODE_ENV !== 'production',
            logNLPResults: true,
            logUserActions: true
        }
    }
};
