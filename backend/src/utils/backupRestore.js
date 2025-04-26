const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const { logger } = require('./logger');

// Models
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

class BackupRestore {
  constructor() {
    this.models = {
      users: User,
      transactions: Transaction,
      budgets: Budget
    };
    
    // Create backup directory if it doesn't exist
    this.backupDir = path.join(__dirname, '../../backups');
    fs.mkdir(this.backupDir, { recursive: true }).catch(err => {
      logger.error('Error creating backup directory:', err);
    });
  }

  // Generate timestamp for backup files
  getTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  // Create backup filename
  getBackupFilename(collection = 'all') {
    return path.join(
      this.backupDir,
      `backup_${collection}_${this.getTimestamp()}.json`
    );
  }

  // Backup single collection
  async backupCollection(model, collection) {
    try {
      logger.info(`Starting backup of ${collection}...`);
      
      const data = await model.find({}).lean();
      const filename = this.getBackupFilename(collection);
      
      await fs.writeFile(filename, JSON.stringify(data, null, 2));
      
      logger.info(`Backup of ${collection} completed: ${filename}`);
      return filename;
    } catch (error) {
      logger.error(`Error backing up ${collection}:`, error);
      throw error;
    }
  }

  // Backup all collections
  async backupAll() {
    try {
      logger.info('Starting full backup...');
      
      const backup = {};
      for (const [collection, model] of Object.entries(this.models)) {
        backup[collection] = await model.find({}).lean();
      }

      const filename = this.getBackupFilename();
      await fs.writeFile(filename, JSON.stringify(backup, null, 2));
      
      logger.info(`Full backup completed: ${filename}`);
      return filename;
    } catch (error) {
      logger.error('Error during full backup:', error);
      throw error;
    }
  }

  // List available backups
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      return files.filter(file => file.startsWith('backup_') && file.endsWith('.json'))
        .map(file => ({
          filename: file,
          path: path.join(this.backupDir, file),
          timestamp: file.split('_')[2].replace('.json', '').replace(/-/g, ':'),
          collection: file.split('_')[1]
        }));
    } catch (error) {
      logger.error('Error listing backups:', error);
      throw error;
    }
  }

  // Restore single collection
  async restoreCollection(model, collection, backupPath) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      logger.info(`Starting restore of ${collection}...`);
      
      const backupData = JSON.parse(
        await fs.readFile(backupPath, 'utf8')
      );

      // Clear existing data
      await model.deleteMany({}, { session });

      // Insert backup data
      if (Array.isArray(backupData)) {
        await model.insertMany(backupData, { session });
      }

      await session.commitTransaction();
      logger.info(`Restore of ${collection} completed`);
    } catch (error) {
      await session.abortTransaction();
      logger.error(`Error restoring ${collection}:`, error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Restore all collections
  async restoreAll(backupPath) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      logger.info('Starting full restore...');
      
      const backup = JSON.parse(
        await fs.readFile(backupPath, 'utf8')
      );

      // Validate backup data
      for (const collection of Object.keys(this.models)) {
        if (!backup[collection]) {
          throw new Error(`Backup is missing ${collection} collection`);
        }
      }

      // Clear existing data
      for (const model of Object.values(this.models)) {
        await model.deleteMany({}, { session });
      }

      // Restore each collection
      for (const [collection, model] of Object.entries(this.models)) {
        await model.insertMany(backup[collection], { session });
      }

      await session.commitTransaction();
      logger.info('Full restore completed');
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error during full restore:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Validate backup file
  async validateBackup(backupPath) {
    try {
      const data = JSON.parse(
        await fs.readFile(backupPath, 'utf8')
      );

      // Check if it's a single collection or full backup
      if (Array.isArray(data)) {
        // Single collection backup
        return { valid: true, type: 'single' };
      } else {
        // Full backup - validate structure
        const requiredCollections = Object.keys(this.models);
        const missingCollections = requiredCollections.filter(
          collection => !data[collection]
        );

        if (missingCollections.length > 0) {
          return {
            valid: false,
            type: 'full',
            error: `Missing collections: ${missingCollections.join(', ')}`
          };
        }

        return { valid: true, type: 'full' };
      }
    } catch (error) {
      logger.error('Error validating backup:', error);
      return { valid: false, error: error.message };
    }
  }

  // Clean up old backups
  async cleanupOldBackups(daysToKeep = 30) {
    try {
      const backups = await this.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      for (const backup of backups) {
        const backupDate = new Date(backup.timestamp);
        if (backupDate < cutoffDate) {
          await fs.unlink(backup.path);
          logger.info(`Deleted old backup: ${backup.filename}`);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old backups:', error);
      throw error;
    }
  }
}

module.exports = new BackupRestore();
