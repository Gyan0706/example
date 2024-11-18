const mongoose = require('mongoose');

const loanHistorySchema = new mongoose.Schema({
  LoanType: String,
  LoanAmount: Number,
  loanStatus: String,
  startDate: String,
  endDate: String,
  interestRate: Number,
  regularityLack: {
    type: Map,
    of: Map,
  }
},{ _id: false });

const financialInfoSchema = new mongoose.Schema({
  MonthlyIncome: Number,
  MonthlyExpend: Number,
  LoanRequest: Number,
  outstandingDebt: Number,
  totalAssets: Number,
  totalLiabilities: Number,
  loanHistory: {
    type: Map,
    of: loanHistorySchema
  }
});

const FinancialInfo = mongoose.model('FinancialInfo', financialInfoSchema);
module.exports = FinancialInfo;