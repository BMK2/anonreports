const Discord = require('discord.js');
const Report = require('./Report.js');
const mongoose = require('mongoose');
const ReportSchema = require('./ReportSchema.js');


//Requires process.env.REPORTS_CATEGORY_ID
//Requires process.env.HOME_GUILD


class AnonReports {
  constructor(client) {
    this.discordClient = client;
    this.discordClient.on('commandPrefixUsed', (message) => {this.parseCommand(message)});
    this.discordClient.on('privateMessage', (message) => {this.parsePrivateMessage(message)});
    this.discordClient.on('message', (message) => {this.parseMessage(message)});
    this.activeReports = [];
    this.loadReports();
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
          if(this.hasActiveReport(message.author.id)) {
            message.reply(`You already have a report open`);
          } else {
            this.openNewReport(message);
          }
          return;
        }
        if (args[0].toLowerCase() === 'close') {
          if(!this.hasActiveReport(message.author.id)) {
            message.reply(`You don't currently have a report open`);
          } else {
            this.closeReport(message);
          }
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
    const messageEmbed = new Discord.MessageEmbed();
    messageEmbed.setAuthor(message.author.username, message.author.avatarURL());
    messageEmbed.setDescription(message);
    this.getReporterByID(activeReport.reporterID).send({embed: messageEmbed});
    for(let attachment of message.attachments) {
      this.getReporterByID(activeReport.reporterID).send(attachment);
    }
  }

  openNewReport(message) {
    //TODO: Need to have the report then saved to mongodb
    let newReport = new Report(this.discordClient, message.author.id);
    this.createAnonChannel().then(async (channel) => {
      channel.send(`Anything I post in this channel has been sent from the user who created this report`);
      newReport.setChannelID(channel.id);
      message.reply(`You have created an anonymous report to the admins. Until you use the command \`${process.env.PREFIX}report close\`, anything you send me will be sent to the admins.`);
      newReport.save();
    });
    this.activeReports.push(newReport);
  }

  closeReport(message) {
    //TODO: Need to have the report removed from mongodb
    this.getActiveChannelByID(this.getActiveReportByReporterID(message.author.id).reportChannelID)
      .send(`The reporter has closed their ticket and will no longer receive any messages sent to this channel`);
    this.activeReports = this.activeReports.filter(report => report.reporterID != message.author.id);
    message.reply(`You have closed the anonymous report. I will no longer convey your messages to the admins`);
  }

  createAnonChannel(userID) {
    let reportNumber = this.getReportCategory().children.size + 1;
    let channelName = `Anonymous_Report-${reportNumber}`;
    let topic = `This channel is only for discussing the anonymous report #${reportNumber}`;
    return this.createChannel(channelName, this.getReportCategory(), topic, 100-reportNumber);
  }

  loadReports() {
    const ReportModel = this.discordClient.db.botDB.model('AnonReports', ReportSchema);
    ReportModel.find(function(error, docs) {
      docs.forEach(doc => {
        let savedReport = new Report(this.discordClient, doc.reporterID);
        savedReport.setChannelID(doc.reportChannelID);
        this.activeReports.push(savedReport);
      });
      console.log(`Loaded ${this.activeReports.length} anonymous reports from the database`);
    }.bind(this));
  }

  hasActiveReport(reporterID) {
    return this.activeReports.some(report => report.reporterID == reporterID);
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