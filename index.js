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
      case 'report':
        this.createAnonChannel();
        break;
    }
  }

  parsePrivateMessage(message) {
    const args = message.content.slice(process.env.PREFIX.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();


  }

  createAnonChannel() {
    let reportNumber = this.getReportCategory().children.size + 1;
    let channelName = `Anonymous_Report-${reportNumber}`;
    let topic = `This channel is only for discussing the anonymous report #${reportNumber}`;
    this.createChannel(channelName, this.getReportCategory(), topic, 100-reportNumber);
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
    this.getHomeGuild().channels.create(name, options).then(channel => {
      console.log(`Created ${channel.name} at position ${channel.position}`);
    }).catch(console.error);
  }

}

module.exports = AnonReports;