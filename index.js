const Discord = require('discord.js');
const Report = require('./report.js');

//Requires process.env.REPORTS_CATEGORY_ID
//Requires process.env.HOME_GUILD


class AnonReports {
  constructor(client) {
    this.discordClient = client;
    this.discordClient.on('commandPrefixUsed', (message) => {this.parseCommand(message)});
    this.discordClient.on('privateMessage', (message) => {this.parsePrivateMessage(message)});
    this.discordClient.on('message', (message) => {this.parseMessage(message)});
    this.activeReports = [];
  }

  parseCommand(message) {
    const args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    switch(command) {
      case 'test':
        this.createAnonChannel().catch(console.error());
        break;
    }
  }

  parseMessage(message) {
    if (message.author.bot) return;
    if(this.activeReports.some(report => report.reportChannelID == message.channel.id)) {
      this.passMessageToReporter(this.getActiveReportByChannelID(message.channel.id), message);
    }
  }

  parsePrivateMessage(message) {
    const args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    switch(command) {
      case 'report':
        if (args[0].toLowerCase() === 'open') {
          this.openNewReport(message);
          return;
        }
        if (args[0].toLowerCase() === 'close') {
          this.closeReport(message);
          return;
        }
        break;
    }
    if(this.activeReports.some(report => report.reporterID == message.author.id)) {
      this.passMessageToChannel(this.getActiveReportByReporterID(message.author.id), message);
    }
  }

  passMessageToChannel(activeReport, message) {
    this.getActiveChannelByID(activeReport.reportChannelID).send(message);
  }

  passMessageToReporter(activeReport, message) {
    this.getReporterByID(activeReport.reporterID).send(message);
  }

  openNewReport(message) {
    //TODO: Need to have the report then saved to mongodb
    let newReport = new Report(message.author.id);
    this.createAnonChannel().then(async (channel) => {
      channel.send(`Anything I post in this channel has been sent from the user who created this report`);
      newReport.setChannelID(channel.id);
      message.reply(`You have created an anonymous report to the admins. Until you use the command \`${process.env.PREFIX}report close\`, anything you send me will be sent to the admins.`);
    });
    this.activeReports.push(newReport);
  }

  closeReport(message) {
    //TODO: Need to have the report removed from mongodb
    this.activeReports = this.activeReports.filter(report => report.reporterID != message.author.id);
    message.reply(`You have closed the anonymous report. I will no longer convey your messages to the admins`);
  }

  createAnonChannel(userID) {
    let reportNumber = this.getReportCategory().children.size + 1;
    let channelName = `Anonymous_Report-${reportNumber}`;
    let topic = `This channel is only for discussing the anonymous report #${reportNumber}`;
    return this.createChannel(channelName, this.getReportCategory(), topic, 100-reportNumber);
  }

  getActiveReportByReporterID(reporterID) {
    return this.activeReports.find(report => report.reporterID == reporterID);
  }

  getActiveReportByChannelID(channelID) {
    return this.activeReports.find(report => report.reportChannelID == channelID);
  }

  getActiveChannelByID(channelID) {
    return this.getHomeGuild().channels.cache.get(channelID);
  }

  getReporterByID(reporterID) {
    return this.getHomeGuild().members.cache.get(reporterID);
  }

  getReportCategory() {
    return this.getHomeGuild().channels.cache.get(process.env.REPORTS_CATEGORY_ID);
  }

  getHomeGuild(){
    return this.discordClient.guilds.cache.get(process.env.HOME_GUILD);
  }

  createChannel(name, parent, topic, position) {
    let options = {type: 'text'};
    if( parent != null) options.parent = parent;
    if( topic != null) options.topic = topic;
    if( position != null) options.position = position;
    return this.getHomeGuild().channels.create(name, options).catch(console.error);
  }

}

module.exports = AnonReports;