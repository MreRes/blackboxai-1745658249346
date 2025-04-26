const mongoose = require('mongoose');
const config = require('../config');

const budgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  period: {
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    }
  },
  categories: [{
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true
    },
    limit: {
      type: Number,
      required: [true, 'Category limit is required'],
      min: [0, 'Category limit cannot be negative']
    },
    spent: {
      type: Number,
      default: 0,
      min: [0, 'Spent amount cannot be negative']
    },
    alerts: {
      warning: {
        type: Number,
        default: config.budgetAlerts.warning, // Default 25%
        min: [0, 'Warning threshold cannot be negative'],
        max: [100, 'Warning threshold cannot exceed 100']
      },
      critical: {
        type: Number,
        default: config.budgetAlerts.critical, // Default 10%
        min: [0, 'Critical threshold cannot be negative'],
        max: [100, 'Critical threshold cannot exceed 100']
      }
    },
    isAlertActive: {
      type: Boolean,
      default: true
    },
    lastAlertSent: {
      type: Date
    }
  }],
  totalLimit: {
    type: Number,
    required: [true, 'Total budget limit is required'],
    min: [0, 'Total budget limit cannot be negative']
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: [0, 'Total spent amount cannot be negative']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
budgetSchema.index({ user: 1, 'period.startDate': -1 });
budgetSchema.index({ user: 1, isActive: 1 });

// Virtual for remaining budget
budgetSchema.virtual('remaining').get(function() {
  return this.totalLimit - this.totalSpent;
});

// Virtual for budget progress percentage
budgetSchema.virtual('progress').get(function() {
  return (this.totalSpent / this.totalLimit) * 100;
});

// Virtual for days remaining in budget period
budgetSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const end = new Date(this.period.endDate);
  const diffTime = Math.abs(end - now);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to update spent amount for a category
budgetSchema.methods.updateCategorySpent = async function(categoryName, amount) {
  const category = this.categories.find(cat => cat.name === categoryName);
  if (!category) {
    throw new Error('Category not found');
  }

  category.spent += amount;
  this.totalSpent += amount;
  
  // Check if alerts should be triggered
  if (category.isAlertActive) {
    const remainingPercentage = ((category.limit - category.spent) / category.limit) * 100;
    
    if (remainingPercentage <= category.alerts.critical) {
      return {
        type: 'critical',
        message: `Critical: ${category.name} budget is at ${remainingPercentage.toFixed(1)}%`
      };
    } else if (remainingPercentage <= category.alerts.warning) {
      return {
        type: 'warning',
        message: `Warning: ${category.name} budget is at ${remainingPercentage.toFixed(1)}%`
      };
    }
  }

  await this.save();
  return null;
};

// Method to check if budget period is active
budgetSchema.methods.isInPeriod = function(date = new Date()) {
  return date >= this.period.startDate && date <= this.period.endDate;
};

// Static method to get active budget for user
budgetSchema.statics.getActiveBudget = async function(userId) {
  const now = new Date();
  return await this.findOne({
    user: userId,
    isActive: true,
    'period.startDate': { $lte: now },
    'period.endDate': { $gte: now }
  });
};

// Static method to get budget summary
budgetSchema.statics.getBudgetSummary = async function(userId, startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        'period.startDate': { $gte: startDate },
        'period.endDate': { $lte: endDate }
      }
    },
    {
      $unwind: '$categories'
    },
    {
      $group: {
        _id: '$categories.name',
        totalLimit: { $sum: '$categories.limit' },
        totalSpent: { $sum: '$categories.spent' }
      }
    },
    {
      $project: {
        category: '$_id',
        limit: '$totalLimit',
        spent: '$totalSpent',
        remaining: { $subtract: ['$totalLimit', '$totalSpent'] },
        percentage: {
          $multiply: [
            { $divide: ['$totalSpent', '$totalLimit'] },
            100
          ]
        }
      }
    },
    {
      $sort: { percentage: -1 }
    }
  ]);
};

module.exports = mongoose.model('Budget', budgetSchema);
