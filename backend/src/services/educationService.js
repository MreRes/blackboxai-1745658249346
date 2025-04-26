const logger = require('../utils/logger');

class EducationService {
    constructor() {
        this.financialTips = {
            budgeting: [
                {
                    title: "Aturan 50/30/20",
                    content: "Bagi pengeluaran Anda: 50% kebutuhan, 30% keinginan, dan 20% tabungan.",
                    detail: "Kebutuhan meliputi: sewa, listrik, makan\nKeinginan meliputi: hiburan, hobi\nTabungan untuk: dana darurat, investasi"
                },
                {
                    title: "Tracking Harian",
                    content: "Catat setiap pengeluaran, sekecil apapun. Pengeluaran kecil bisa jadi besar jika terakumulasi.",
                    detail: "Gunakan fitur catat transaksi bot ini untuk memudahkan tracking pengeluaran Anda."
                }
            ],
            saving: [
                {
                    title: "Dana Darurat",
                    content: "Siapkan dana darurat minimal 3-6 kali pengeluaran bulanan.",
                    detail: "Dana darurat penting untuk menghadapi situasi tidak terduga seperti: kehilangan pekerjaan, sakit, atau keadaan darurat lainnya."
                },
                {
                    title: "Automasi Tabungan",
                    content: "Atur auto-debit untuk tabungan begitu gajian. Treat it like a bill payment.",
                    detail: "Dengan auto-debit, Anda tidak perlu khawatir lupa menabung dan terhindar dari godaan menggunakan uang tersebut."
                }
            ],
            investment: [
                {
                    title: "Diversifikasi",
                    content: "Jangan taruh semua telur dalam satu keranjang. Diversifikasi investasi Anda.",
                    detail: "Contoh diversifikasi:\n- Deposito\n- Reksadana\n- Saham\n- Emas\n- Properti"
                },
                {
                    title: "Investasi Berkala",
                    content: "Terapkan Dollar Cost Averaging (DCA) untuk mengurangi risiko timing market.",
                    detail: "Investasi rutin dengan jumlah tetap setiap bulan lebih baik daripada investasi sekaligus dalam jumlah besar."
                }
            ],
            debt: [
                {
                    title: "Hindari Utang Konsumtif",
                    content: "Gunakan utang hanya untuk hal produktif, hindari utang untuk konsumsi.",
                    detail: "Utang produktif: pendidikan, modal usaha\nUtang konsumtif: gadget, liburan"
                },
                {
                    title: "Debt Snowball Method",
                    content: "Fokus melunasi utang terkecil dulu sambil membayar minimum payment untuk utang lain.",
                    detail: "Metode ini memberi motivasi karena Anda bisa melihat progress pelunasan utang lebih cepat."
                }
            ],
            income: [
                {
                    title: "Multiple Income Streams",
                    content: "Kembangkan beberapa sumber pendapatan untuk keamanan finansial.",
                    detail: "Contoh side income:\n- Freelance\n- Online shop\n- Investasi\n- Sewa properti"
                },
                {
                    title: "Upgrade Skills",
                    content: "Investasi dalam pengembangan diri untuk meningkatkan nilai di pasar kerja.",
                    detail: "Ikuti kursus, sertifikasi, atau pendidikan lanjutan yang relevan dengan karir Anda."
                }
            ]
        };

        this.financialLessons = {
            basic: [
                {
                    title: "Pengenalan Keuangan Pribadi",
                    content: "Pelajari dasar-dasar mengelola keuangan pribadi",
                    modules: [
                        "Pentingnya Pencatatan Keuangan",
                        "Membuat Anggaran Sederhana",
                        "Mengelola Arus Kas"
                    ]
                }
            ],
            intermediate: [
                {
                    title: "Perencanaan Keuangan",
                    content: "Strategi menyusun rencana keuangan jangka panjang",
                    modules: [
                        "Goal Setting Finansial",
                        "Manajemen Risiko Keuangan",
                        "Perencanaan Pensiun"
                    ]
                }
            ],
            advanced: [
                {
                    title: "Strategi Investasi",
                    content: "Memahami berbagai instrumen investasi",
                    modules: [
                        "Analisis Risiko dan Return",
                        "Portofolio Management",
                        "Market Analysis"
                    ]
                }
            ]
        };
    }

    getRandomTip(category = null) {
        try {
            let tips;
            if (category && this.financialTips[category]) {
                tips = this.financialTips[category];
            } else {
                tips = Object.values(this.financialTips).flat();
            }
            
            return tips[Math.floor(Math.random() * tips.length)];
        } catch (error) {
            logger.error('Error getting random tip:', error);
            return null;
        }
    }

    getContextualTip(context) {
        try {
            // Determine appropriate tip based on user's financial context
            if (context.savingsRate < 20) {
                return this.getRandomTip('saving');
            }
            if (context.hasDebt) {
                return this.getRandomTip('debt');
            }
            if (context.overBudget) {
                return this.getRandomTip('budgeting');
            }
            if (context.highSavings) {
                return this.getRandomTip('investment');
            }
            
            return this.getRandomTip();
        } catch (error) {
            logger.error('Error getting contextual tip:', error);
            return null;
        }
    }

    getLesson(level, index) {
        try {
            return this.financialLessons[level][index];
        } catch (error) {
            logger.error('Error getting lesson:', error);
            return null;
        }
    }

    formatTipMessage(tip) {
        if (!tip) return null;

        return `💡 *Tips Keuangan: ${tip.title}*\n\n` +
               `${tip.content}\n\n` +
               `📝 *Detail:*\n${tip.detail}`;
    }

    formatLessonMessage(lesson) {
        if (!lesson) return null;

        return `📚 *${lesson.title}*\n\n` +
               `${lesson.content}\n\n` +
               `📑 *Modul:*\n` +
               lesson.modules.map(module => `• ${module}`).join('\n');
    }

    getFinancialQuote() {
        const quotes = [
            {
                text: "Jangan menabung dari sisa pengeluaran, tapi keluarkan dari sisa tabungan.",
                author: "Warren Buffett"
            },
            {
                text: "Kebebasan finansial adalah ketika aset pasif menghasilkan lebih dari pengeluaran.",
                author: "Robert Kiyosaki"
            },
            {
                text: "Investasi dalam diri sendiri membayar dividen terbaik.",
                author: "Benjamin Franklin"
            }
        ];

        return quotes[Math.floor(Math.random() * quotes.length)];
    }

    generateWeeklyLearningPlan(userLevel = 'basic') {
        const plan = {
            title: "Rencana Belajar Mingguan",
            topics: []
        };

        switch (userLevel) {
            case 'basic':
                plan.topics = [
                    {
                        day: "Senin",
                        topic: "Pencatatan Keuangan Harian",
                        activity: "Praktek mencatat pengeluaran"
                    },
                    {
                        day: "Rabu",
                        topic: "Membuat Anggaran",
                        activity: "Menyusun anggaran bulanan"
                    },
                    {
                        day: "Jumat",
                        topic: "Review Mingguan",
                        activity: "Evaluasi pengeluaran minggu ini"
                    }
                ];
                break;

            case 'intermediate':
                plan.topics = [
                    {
                        day: "Senin",
                        topic: "Analisis Arus Kas",
                        activity: "Identifikasi pola pengeluaran"
                    },
                    {
                        day: "Rabu",
                        topic: "Strategi Menabung",
                        activity: "Setup auto-debit tabungan"
                    },
                    {
                        day: "Jumat",
                        topic: "Perencanaan Investasi",
                        activity: "Research instrumen investasi"
                    }
                ];
                break;

            case 'advanced':
                plan.topics = [
                    {
                        day: "Senin",
                        topic: "Analisis Portfolio",
                        activity: "Review dan rebalancing portfolio"
                    },
                    {
                        day: "Rabu",
                        topic: "Tax Planning",
                        activity: "Optimasi pajak investasi"
                    },
                    {
                        day: "Jumat",
                        topic: "Risk Management",
                        activity: "Setup proteksi aset"
                    }
                ];
                break;
        }

        return plan;
    }

    getResourceLinks() {
        return {
            articles: [
                {
                    title: "Panduan Lengkap Mengelola Keuangan",
                    url: "https://example.com/article1"
                },
                {
                    title: "Tips Investasi untuk Pemula",
                    url: "https://example.com/article2"
                }
            ],
            calculators: [
                {
                    title: "Kalkulator Dana Pensiun",
                    url: "https://example.com/calc1"
                },
                {
                    title: "Kalkulator KPR",
                    url: "https://example.com/calc2"
                }
            ],
            tools: [
                {
                    title: "Template Anggaran Bulanan",
                    url: "https://example.com/tool1"
                },
                {
                    title: "Worksheet Perencanaan Keuangan",
                    url: "https://example.com/tool2"
                }
            ]
        };
    }
}

module.exports = new EducationService();
