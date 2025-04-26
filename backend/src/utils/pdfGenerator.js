const PDFDocument = require('pdfkit');
const moment = require('moment');
const { logger } = require('./logger');

class PDFGenerator {
  constructor() {
    this.doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: 'Financial Report',
        Author: 'WhatsApp Finance Bot'
      }
    });
  }

  // Generate header with logo and title
  async generateHeader(title) {
    try {
      this.doc
        .fontSize(20)
        .text('WhatsApp Finance Bot', 50, 45)
        .fontSize(16)
        .text(title, 50, 70)
        .moveDown();
    } catch (error) {
      logger.error('Error generating PDF header:', error);
      throw error;
    }
  }

  // Generate financial summary section
  async generateSummary(data) {
    try {
      this.doc
        .fontSize(14)
        .text('Financial Summary', 50, 120)
        .moveDown();

      // Create summary table
      const summaryData = [
        ['Total Income:', `Rp ${data.totalIncome.toLocaleString('id-ID')}`],
        ['Total Expenses:', `Rp ${data.totalExpenses.toLocaleString('id-ID')}`],
        ['Net Balance:', `Rp ${(data.totalIncome - data.totalExpenses).toLocaleString('id-ID')}`],
        ['Period:', `${moment(data.startDate).format('DD MMM YYYY')} - ${moment(data.endDate).format('DD MMM YYYY')}`]
      ];

      let yPosition = 150;
      summaryData.forEach(([label, value]) => {
        this.doc
          .fontSize(12)
          .text(label, 50, yPosition)
          .text(value, 200, yPosition);
        yPosition += 20;
      });

      this.doc.moveDown(2);
    } catch (error) {
      logger.error('Error generating PDF summary:', error);
      throw error;
    }
  }

  // Generate budget overview section
  async generateBudgetOverview(budgetData) {
    try {
      this.doc
        .fontSize(14)
        .text('Budget Overview', 50, this.doc.y)
        .moveDown();

      // Create budget table
      const tableTop = this.doc.y;
      const tableHeaders = ['Category', 'Limit', 'Spent', 'Remaining', '%'];
      const columnWidths = [150, 100, 100, 100, 50];

      // Draw headers
      let xPosition = 50;
      tableHeaders.forEach((header, i) => {
        this.doc
          .fontSize(12)
          .text(header, xPosition, tableTop);
        xPosition += columnWidths[i];
      });

      // Draw data rows
      let yPosition = tableTop + 20;
      budgetData.categories.forEach(category => {
        if (yPosition > 700) { // Check if we need a new page
          this.doc.addPage();
          yPosition = 50;
        }

        const remaining = category.limit - category.spent;
        const percentage = ((category.spent / category.limit) * 100).toFixed(1);

        xPosition = 50;
        [
          category.name,
          `Rp ${category.limit.toLocaleString('id-ID')}`,
          `Rp ${category.spent.toLocaleString('id-ID')}`,
          `Rp ${remaining.toLocaleString('id-ID')}`,
          `${percentage}%`
        ].forEach((text, i) => {
          this.doc
            .fontSize(10)
            .text(text, xPosition, yPosition);
          xPosition += columnWidths[i];
        });

        yPosition += 20;
      });

      this.doc.moveDown(2);
    } catch (error) {
      logger.error('Error generating PDF budget overview:', error);
      throw error;
    }
  }

  // Generate transaction history section
  async generateTransactionHistory(transactions) {
    try {
      this.doc
        .addPage()
        .fontSize(14)
        .text('Transaction History', 50, 50)
        .moveDown();

      // Create transactions table
      const tableTop = this.doc.y;
      const tableHeaders = ['Date', 'Type', 'Category', 'Description', 'Amount'];
      const columnWidths = [80, 60, 100, 160, 100];

      // Draw headers
      let xPosition = 50;
      tableHeaders.forEach((header, i) => {
        this.doc
          .fontSize(12)
          .text(header, xPosition, tableTop);
        xPosition += columnWidths[i];
      });

      // Draw data rows
      let yPosition = tableTop + 20;
      transactions.forEach(transaction => {
        if (yPosition > 700) { // Check if we need a new page
          this.doc.addPage();
          yPosition = 50;
        }

        xPosition = 50;
        [
          moment(transaction.date).format('DD/MM/YY'),
          transaction.type,
          transaction.category,
          transaction.description,
          `Rp ${transaction.amount.toLocaleString('id-ID')}`
        ].forEach((text, i) => {
          this.doc
            .fontSize(10)
            .text(text, xPosition, yPosition, {
              width: columnWidths[i] - 10,
              align: i === 4 ? 'right' : 'left'
            });
          xPosition += columnWidths[i];
        });

        yPosition += 20;
      });
    } catch (error) {
      logger.error('Error generating PDF transaction history:', error);
      throw error;
    }
  }

  // Generate footer with page numbers
  generateFooter() {
    const pages = this.doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      this.doc.switchToPage(i);
      
      // Footer text
      this.doc
        .fontSize(8)
        .text(
          `Generated on ${moment().format('DD MMM YYYY HH:mm')} - Page ${i + 1} of ${pages.count}`,
          50,
          800,
          { align: 'center' }
        );
    }
  }

  // Main method to generate complete financial report
  async generateReport(data, includeTransactions = true) {
    try {
      // Generate report title and header
      await this.generateHeader(`Financial Report - ${data.user.username}`);

      // Generate summary section
      await this.generateSummary(data);

      // Generate budget overview if available
      if (data.budget) {
        await this.generateBudgetOverview(data.budget);
      }

      // Generate transaction history if requested
      if (includeTransactions && data.transactions.length > 0) {
        await this.generateTransactionHistory(data.transactions);
      }

      // Add footer with page numbers
      this.generateFooter();

      // End the document
      this.doc.end();

      return this.doc;
    } catch (error) {
      logger.error('Error generating PDF report:', error);
      throw error;
    }
  }
}

module.exports = PDFGenerator;
