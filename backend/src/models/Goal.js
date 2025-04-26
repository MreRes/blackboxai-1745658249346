const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    targetDate: {
        type: Date,
        required: true
    },
    targetAmount: {
        type: Number,
        required: true,
        min: 0
    },
    achieved: {
        type: Boolean,
        default: false
    },
    achievedDate: Date,
    notes: String
});

const strategySchema = new mongoose.Schema({
    steps: [{
        type: String
    }],
    adjustments: [{
        type: String
    }]
});

const goalSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['savings', 'debt_payment', 'investment', 'purchase', 'emergency_fund', 'education'],
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    targetAmount: {
        type: Number,
        required: true,
        min: 0
    },
    currentAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    targetDate: {
        type: Date,
        required: true
    },
    monthlyTarget: {
        type: Number,
        required: true,
        min: 0
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['active', 'paused', 'completed', 'cancelled'],
        default: 'active'
    },
    category: {
        type: String,
        trim: true
    },
    feasibility: {
        type: Number,
        min: 0,
        max: 100
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    strategy: strategySchema,
    milestones: [milestoneSchema],
    notifications: [{
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'milestone', 'completion']
    }],
    linkedAccounts: [{
        type: String,
        trim: true
    }],
    tags: [{
        type: String,
        trim: true
    }],
    notes: String,
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Middleware to update progress and lastUpdated
goalSchema.pre('save', function(next) {
    this.progress = (this.currentAmount / this.targetAmount) * 100;
    this.lastUpdated = new Date();
    next();
});

// Instance methods
goalSchema.methods.isOnTrack = function() {
    const elapsed = (new Date() - this.startDate) / (1000 * 60 * 60 * 24 * 30); // months
    const expectedAmount = this.monthlyTarget * elapsed;
    return this.currentAmount >= expectedAmount;
};

goalSchema.methods.getRemainingAmount = function() {
    return this.targetAmount - this.currentAmount;
};

goalSchema.methods.getTimeRemaining = function() {
    return Math.max(0, this.targetDate - new Date());
};

goalSchema.methods.getNextMilestone = function() {
    return this.milestones.find(m => !m.achieved);
};

goalSchema.methods.addTransaction = async function(amount) {
    this.currentAmount += amount;
    
    // Update milestones
    this.milestones.forEach(milestone => {
        if (!milestone.achieved && this.currentAmount >= milestone.targetAmount) {
            milestone.achieved = true;
            milestone.achievedDate = new Date();
        }
    });

    // Check if goal is completed
    if (this.currentAmount >= this.targetAmount) {
        this.status = 'completed';
    }

    return this.save();
};

// Static methods
goalSchema.statics.findActiveGoals = function(userId) {
    return this.find({
        userId,
        status: 'active'
    });
};

goalSchema.statics.findUpcomingMilestones = function(userId, days = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.find({
        userId,
        status: 'active',
        'milestones.targetDate': {
            $gte: new Date(),
            $lte: futureDate
        },
        'milestones.achieved': false
    });
};

goalSchema.statics.getGoalsSummary = async function(userId) {
    const goals = await this.find({ userId });
    
    return {
        total: goals.length,
        active: goals.filter(g => g.status === 'active').length,
        completed: goals.filter(g => g.status === 'completed').length,
        onTrack: goals.filter(g => g.status === 'active' && g.isOnTrack()).length,
        totalTargetAmount: goals.reduce((sum, g) => sum + g.targetAmount, 0),
        totalCurrentAmount: goals.reduce((sum, g) => sum + g.currentAmount, 0),
        averageProgress: goals.length ? 
            goals.reduce((sum, g) => sum + g.progress, 0) / goals.length : 0
    };
};

// Indexes
goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ userId: 1, targetDate: 1 });
goalSchema.index({ userId: 1, type: 1 });

const Goal = mongoose.model('Goal', goalSchema);

module.exports = Goal;
