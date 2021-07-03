import { MessageEmbed, TextChannel } from "discord.js";
import DiscordRPG from "../src";

const client = new DiscordRPG({ 
  commandPrefix: "sb!",
  owner: ["264010327023288323"],
});

client.setDBFile("data.db")
  .then(() => {

    // define custom schema
    client.db?.run(`
      CREATE TABLE IF NOT EXISTS player (
       player_id TEXT UNIQUE PRIMARY KEY,
       gold      DEFAULT 0,
       xp        DEFAULT 0
      )
    `)

  })


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

// embed message with image
client.registerCommand({ name: "profile" }, async (msg, args) => {
  const player = await client.db?.get(
    `SELECT * FROM player WHERE player_id = ?`, msg.author.id
  )!;

  const embed = new MessageEmbed()
    .setThumbnail(msg.author.displayAvatarURL())
    .setColor("#ccc")
    .addField("Name", msg.member?.displayName)
    .addField("Gold", player.gold, true)
    .addField("XP", player.xp, true);

  msg.embed(embed);
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
    const random = (min: number, max: number) => Math.floor(Math.random() * max) + min;
    const gold = random(1, 10);
    const xp = random(1, 10);
    const playerID = msg.author.id;
    client.db?.run(`
      UPDATE player 
      SET xp = xp + ?, gold = gold + ?
      WHERE player_id = ?
    `, xp, gold, playerID);
    
    msg.say(`Caught a fish and earned ${gold} gold and ${xp} xp`);
  })

// register player
client.dispatcher.addInhibitor(msg => {

  const id = msg.author.id;
  const sql1 = `
    SELECT player_id
    FROM player
    WHERE player_id = ?
  `;
  const sql2 = `
    INSERT INTO player (player_id)
    VALUES (?)
  `;

  client.db?.get(sql1, id)
    .then(player => {
      // if user is not in the database
      if (!player) {
        // add user to the db
        client.db?.run(sql2, id);
      }
    })


  return false;
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

  if (channel && msg.channel.toString() !== channel) {
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

