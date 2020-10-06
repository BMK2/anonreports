const Discord = require('discord.js');
const ReportSchema = require('./ReportSchema.js');

class Report {
  constructor(discordClient, reporterID) {
    this.discordClient = discordClient;
    this.reporterID = reporterID;
    this.reportChannelID;
  }

  setChannelID(channelID) {
    this.reportChannelID = channelID;
  }

  save() {
    const ReportModel = this.discordClient.db.botDB.model('AnonReport', ReportSchema);
    try {
      ReportModel.findOne({reportChannelID: this.reportChannelID}, function(error, dbReport) {
        if(dbReport) {
          ReportModel.updateOne({reportChannelID: this.reportChannelID}, {
            reporterID: this.reporterID,
            reportChannelID: this.reportChannelID
          }, (error, result) => {
            if(error) console.error(`Error updating new report on the database: ${error}`);
          });
        } else {
          let dbReport = new ReportModel({
            reporterID: this.reporterID,
            reportChannelID: this.reportChannelID
          });
          dbReport.save((error) => {if(error) console.error(`Error saving new report to database: ${error}`);});
        }
      }.bind(this));
    } catch (error) {
      console.error(`Error saving new report to databse: ${error}`);
    }
  }

}

module.exports = Report;