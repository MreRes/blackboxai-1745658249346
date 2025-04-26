const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    validate: {
      validator: function(v) {
        return v !== 0; // Amount cannot be zero
      },
      message: 'Amount cannot be zero'
    }
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: [true, 'Transaction type is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  source: {
    type: String,
    required: [true, 'Source is required'],
    trim: true,
    enum: ['web', 'whatsapp']
  },
  sourceNumber: {
    type: String,
    trim: true,
    // Required only if source is whatsapp
    required: function() {
      return this.source === 'whatsapp';
    }
  },
  attachments: [{
    type: String, // URL or path to attachment
    trim: true
  }],
  tags: [{
    type: String,
    trim: true
  }],
  location: {
    type: String,
    trim: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringDetails: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      required: function() {
        return this.isRecurring;
      }
    },
    endDate: {
      type: Date
    }
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  },
  lastModifiedBy: {
    type: String,
    required: true,
    enum: ['user', 'admin', 'system']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1 });
transactionSchema.index({ user: 1, type: 1 });
transactionSchema.index({ sourceNumber: 1 });

// Virtual for formatted amount with currency
transactionSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR'
  }).format(this.amount);
});

// Virtual for formatted date
transactionSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Static method to get user's total income
transactionSchema.statics.getTotalIncome = async function(userId, startDate, endDate) {
  const match = {
    user: userId,
    type: 'income'
  };
  
  if (startDate && endDate) {
    match.date = {
      $gte: startDate,
      $lte: endDate
    };
  }

  const result = await this.aggregate([
    { $match: match },
    { $group: {
      _id: null,
      total: { $sum: '$amount' }
    }}
  ]);

  return result.length > 0 ? result[0].total : 0;
};

// Static method to get user's total expenses
transactionSchema.statics.getTotalExpenses = async function(userId, startDate, endDate) {
  const match = {
    user: userId,
    type: 'expense'
  };
  
  if (startDate && endDate) {
    match.date = {
      $gte: startDate,
      $lte: endDate
    };
  }

  const result = await this.aggregate([
    { $match: match },
    { $group: {
      _id: null,
      total: { $sum: '$amount' }
    }}
  ]);

  return result.length > 0 ? result[0].total : 0;
};

// Static method to get spending by category
transactionSchema.statics.getSpendingByCategory = async function(userId, startDate, endDate) {
  const match = {
    user: userId,
    type: 'expense'
  };
  
  if (startDate && endDate) {
    match.date = {
      $gte: startDate,
      $lte: endDate
    };
  }

  return await this.aggregate([
    { $match: match },
    { $group: {
      _id: '$category',
      total: { $sum: '$amount' }
    }},
    { $sort: { total: -1 } }
  ]);
};

// Method to check if transaction can be edited/deleted
transactionSchema.methods.canModify = function(currentDate) {
  // Can only modify transactions within 24 hours
  const hours = Math.abs(currentDate - this.date) / 36e5;
  return hours <= 24;
};

module.exports = mongoose.model('Transaction', transactionSchema);
