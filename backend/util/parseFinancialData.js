const fs = require('fs');
const FinancialInfo = require('../models/FinancialInfo'); // Assuming your schema is in financialInfo.js

// Function to parse the financial data and create the financialInfo document
async function createFinancialInfoFromFile(filepath) {
  try {
    const fileContent = await fs.promises.readFile(filepath, 'utf8');
    const financialData = JSON.parse(fileContent);

    // Prepare the data for the schema
    const financialInfoData = {
      MonthlyIncome: financialData[0].MonthlyIncome,
      MonthlyExpend: financialData[0].MonthlyExpend,
      LoanRequest: financialData[0].LoanRequest,
      outstandingDebt: financialData[0].outstandingDebt,
      totalAssets: financialData[0].totalAssets,
      totalLiabilities: financialData[0].totalLiabilities,
      loanHistory: new Map() // Initialize loanHistory as a Map
    };

    // Handle dynamic number of loan histories
    Object.entries(financialData[0].loanHistory).forEach(([key, loan]) => {
      // Add each loan to the Map with the appropriate key
      financialInfoData.loanHistory.set(key, {
        LoanType: loan.LoanType,
        LoanAmount: loan.LoanAmount,
        loanStatus: loan.loanStatus,
        startDate: loan.startDate,
        endDate: loan.endDate,
        interestRate: loan.interestRate,
        regularityLack: loan.regularityLack
      });
    });

    // Create a new FinancialInfo document
    const financialInfoDoc = new FinancialInfo(financialInfoData);
    await financialInfoDoc.save();
    console.log('Financial info created successfully!');
    return financialInfoDoc;
  } catch (error) {
    console.error('Error creating financial info:', error);
    throw error;
  }
}

module.exports = { createFinancialInfoFromFile };