const mongoose = require('mongoose');

module.exports = new mongoose.Schema({
  reporterID: String,
  reportChannelID: String,
  open: Boolean
});