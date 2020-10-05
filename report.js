class Report {
  constructor(reporterID) {
    this.reporterID = reporterID;
    this.reportChannelID;
  }

  setChannelID(channelID) {
    this.reportChannelID = channelID;
  }

}

module.exports = Report;