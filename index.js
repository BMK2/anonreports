const Discord = require('discord.js');
const Report = require('./Report.js');
const mongoose = require('mongoose');
const ReportSchema = require('./ReportSchema.js');
const write = require('write');


//Requires process.env.REPORTS_CATEGORY_ID
//Requires process.env.HOME_GUILD

//TODO: Implement a check for ?report export to make sure the command is used in a report channel

class AnonReports {
  constructor(client) {
    console.log("         --==Anonymous Reports by BotsMK2==--");
    this.discordClient = client;
    this.discordClient.on('commandPrefixUsed', (message) => {this.parseCommand(message)});
    this.discordClient.on('privateMessage', (message) => {this.parsePrivateMessage(message)});
    this.discordClient.on('message', (message) => {this.parseMessage(message)});
    this.anonymousReports = [];
    this.loadReports();
  }

  parseCommand(message) {
    const args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    if(command === 'report') {
      switch(args[0].toLowerCase()) {
        case 'export':
          console.log(`Exporting a single anonymous report`);
          this.exportChannel(message).then((textFile) => {
            console.log(textFile.path);
            message.channel.send({files: [{attachment: textFile.path, name: `${message.channel.name}_EXPORT.txt`}]});
          });
          break;
        case 'exportall':
          console.log(`Exporting ${this.anonymousReports.length} existing anonymous reports`);
          break;
        case 'reopen':
          console.log(`The admins have reopened an anonymous report`);
          this.adminReopenedReport(message);
          break;
        case 'close':
          console.log(`The admins have closed an anonymous report`);
          this.adminClosedReport(message);
          break;
      }
    }
  }

  parseMessage(message) {
    if (message.author.bot) return;
    if(this.anonymousReports.some(report => report.open && report.reportChannelID == message.channel.id)) {
      this.passMessageToReporter(this.getReportByChannelID(message.channel.id), message);
    }
  }

  parsePrivateMessage(message) {
    if (message.content.indexOf(process.env.PREFIX) !== 0) {
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
              this.userClosedReport(message);
            }
            return;
          }
          break;
      }
    }
    if(this.anonymousReports.some(report => report.open && report.reporterID == message.author.id)) {
      this.passMessageToChannel(this.getActiveReportByReporterID(message.author.id), message);
    }
  }

  passMessageToChannel(activeReport, message) {
    let reportChannel = this.getActiveChannelByID(activeReport.reportChannelID);
    reportChannel.send(message.content);
    for(let attachment of message.attachments) {
      reportChannel.send(attachment);
    }
  }

  passMessageToReporter(activeReport, message) {
    const messageEmbed = new Discord.MessageEmbed();
    messageEmbed.setAuthor(message.author.username, message.author.avatarURL());
    messageEmbed.setDescription(message.content);
    let reporter = this.getReporterByID(activeReport.reporterID);
    for(let attachment of message.attachments) {
      let image = attachment[1];
      messageEmbed.setImage(image.attachment);
      console.log(image);
    }
    reporter.send({embed: messageEmbed});
    // for(let attachment of message.attachments) {
    //   reporter.send(attachment);
    // }
  }

  openNewReport(message) {
    //TODO: Need to have the report then saved to mongodb
    let newReport = new Report(this.discordClient, message.author.id);
    this.createAnonChannel().then(async (channel) => {channel.send(`Anything I post in this channel has been sent from the user who created this report`);
      newReport.setChannelID(channel.id);
      message.reply(`You have created an anonymous report to the admins. Until you use the command \`${process.env.PREFIX}report close\`, anything you send me will be sent to the admins.`);
      newReport.save();
    });
    this.anonymousReports.push(newReport);
  }

  adminReopenedReport(message) {
    message.reply(`You have reopened this anonymous report. The reporter will begin receiving any message sent to this channel and will be able to send messages to this channel as well. They have been notified of this.`);
    this.getReporterByID(this.getReportByChannelID(message.channel.id).reporterID).send(`The admins have reopened this report. They will now begin receiving any message you send in this DM and will be able to message you through the report channel.`);
    this.getReportByChannelID(message.channel.id).open = true;
    this.getReportByChannelID(message.channel.id).save()
  }

  adminClosedReport(message) {
    this.getReportByChannelID(message.channel.id).open = false;
    this.getReportByChannelID(message.channel.id).save()
    message.reply(`You have closed this anonymous report. The reporter will no longer receive any messages sent to this channel nor be able to send messages to this channel. They have been notified as well.`);
    this.getReporterByID(this.getReportByChannelID(message.channel.id).reporterID).send(`The admins have closed this report. They will no longer receive any message sent to this channel nor can they message you through the report channel.`);
  }

  userClosedReport(message) {
    this.getActiveReportByReporterID(message.author.id).open = false;
    this.getActiveReportByReporterID(message.author.id).save()
    this.getActiveChannelByID(this.getActiveReportByReporterID(message.author.id).reportChannelID).send(`The reporter has closed this report and will no longer receive any messages sent to this channel`);
    message.reply(`You have closed the anonymous report. I will no longer convey your messages to the admins`);
  }

  createAnonChannel() {
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
        savedReport.open = doc.open;
        this.anonymousReports.push(savedReport);
      });
      console.log(`Loaded ${this.anonymousReports.length} anonymous reports from the database`);
    }.bind(this));
  }

  hasActiveReport(reporterID) {
    return this.anonymousReports.some(report => report.open && report.reporterID == reporterID);
  }

  getActiveReportByReporterID(reporterID) {
    return this.anonymousReports.find(report => report.open && report.reporterID == reporterID);
  }

  getReportByChannelID(channelID) {
    return this.anonymousReports.find(report => report.reportChannelID == channelID);
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

  formatTimestamp(timestampAsString) {
    // Create a new JavaScript Date object based on the timestamp
    var date = new Date(timestampAsString);
    let formattedTime = `${date.getMonth()}/${date.getDate()}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}`;
    return formattedTime;
  }

  createChannel(name, parent, topic, position) {
    let options = {type: 'text'};
    if( parent != null) options.parent = parent;
    if( topic != null) options.topic = topic;
    if( position != null) options.position = position;
    return this.getHomeGuild().channels.create(name, options).catch(console.error);
  }

  async exportChannel(message) {
    //Returns {path: path to file, data: content of the file}
    let channelToExport = message.channel;
    let allMessages = await channelToExport.messages.fetch();
    
    let exportedMessages = `Export of Anonymous Report Channel: ${message.channel.name}${String.fromCharCode(10)}`;
    allMessages.forEach((history, historyID, collection) => {
      if(history.content != '') {
        exportedMessages = exportedMessages + `[${this.formatTimestamp(history.createdTimestamp)}] <${history.author.username}>: ${history.content}${String.fromCharCode(10)}`;
      }
      history.attachments.forEach((value, key, map) => {
        exportedMessages = exportedMessages + `[${this.formatTimestamp(history.createdTimestamp)}] <${history.author.username}>: ${value.attachment}${String.fromCharCode(10)}`;
      });
    });
    let textFile = await write(`reportExports/${message.channel.name}_EXPORT.txt`, exportedMessages, {overwrite: true, newline: true});
    return textFile;
  }
}

module.exports = AnonReports;