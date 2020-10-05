const Discord = require('discord.js');

//Requires process.env.REPORTS_CATEGORY_ID
class AnonReports {
  constructor(client) {
    this.discordClient = client;
    this.discordClient.on('commandPrefixUsed', (message) => {this.parseCommand(message)});
    this.discordClient.on('privateMessage', (message) => {this.parsePrivateMessage(message)});

    let activeMessages = [];
  }

  parseCommand(message) {
    const args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    switch(command) {
      case 'test':
        this.createAnonChannel().then(async (channel) => {
          let invite = await channel.createInvite({maxAge: 0, unique: true, reason: 'A user has created a report; see it here'});
          channel.send(invite.url);
        });
        break;
    }
  }

  parsePrivateMessage(message) {
    const args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    switch(command) {
      case 'report':
        this.createAnonChannel().then(async (channel) => {
          let invite = await channel.createInvite({maxAge: 0, unique: true, reason: 'A user has created a report; see it here'});
          message.reply(`You have created an anonymous report to the admins. Here is the invite to the channel ${invite.url}`);
        });
        break;
    }
  }



  createAnonChannel() {
    let reportNumber = this.getReportCategory().children.size + 1;
    let channelName = `Anonymous_Report-${reportNumber}`;
    let topic = `This channel is only for discussing the anonymous report #${reportNumber}`;
    return this.createChannel(channelName, this.getReportCategory(), topic, 100-reportNumber);
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