import { TextChannel } from "discord.js";
import DiscordRPG from "../src";

const client = new DiscordRPG({ 
  commandPrefix: "sb!",
  owner: ["264010327023288323"],
});

client.setDBFile("data.db");

client.once("ready", () => {
  console.log(`${client.user?.username} is ready`);
})

// normal command
client.registerCommand({ name: "name" }, (msg, args) => {
  msg.say(`My name is ${client.user?.username}`);
  const guild = msg.guild.name;
  const channel = (msg.channel as TextChannel).name;
  msg.say(`Im in ${guild} on channel ${channel}`);
})

// ban command
client.registerCommand({ name: "ban", ownerOnly: true }, (msg, args) => {
  const [mention] = args;
  client.provider.set(msg.guild, `ban-${mention}`, true);
  msg.say(`${mention} has been banned`);
})

// set channel
client.registerCommand({ name: "setchannel", ownerOnly: true }, (msg, args) => {
  const channel = msg.channel;
  client.provider.set(msg.guild, "channel", channel.toString());
  msg.say(`Successfully set channel ${channel}`);
})

// throttled command
client.registerCommand({ 
  name: "fish", 
  throttling: { usages: 1, duration: 5 } }, 
  (msg, args) => {
    msg.say("Caught a fish");
  })

// prevent banned members to use the bot
client.dispatcher.addInhibitor(msg => {
  const author = msg.author.id;
  const isBanned = client.provider.get(msg.guild, `ban-${author}`);
  if (isBanned) {
    return {
      reason: "blacklisted",
      response: msg.reply("You are banned"),
    }
  }

  return false;
})

// only allow command to be run on selected channel only (which was run by
// sb!setchannel command)
client.dispatcher.addInhibitor(msg => {
  const channel = client.provider.get(msg.guild, "channel");

  if (channel && msg.channel !== channel) {
    const response = msg.reply(
      `Commands on this channel is disabled. Please use ${channel}.`
    )

    return {
      reason: "invalid channel",
      response,
    }
  }

  return false;
})

client.login(process.env.BOT_TOKEN);

