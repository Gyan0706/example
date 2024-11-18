const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define user schema
const userSchema = new Schema({
  user: { type: String, required: true },    // Username
  email: { type: String, required: true },   // Email
  password: { type: String, required: true }, // Password
  financialInfo: { type: Schema.Types.ObjectId, ref: 'FinancialInfo' } // Reference to financial data
});

module.exports = mongoose.model('User', userSchema);
