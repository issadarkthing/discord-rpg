### Installing
```bash
$ npm install @jiman24/discord-rpg
```

### Setup
[discord-rpg](https://github.com/issadarkthing/discord-rpg) 
extends node's discord [commando](https://github.com/discordjs/Commando)
framework. So if you feel the documentation here is incomplete, you can refer to
their [documentation](https://discord.js.org/#/docs/commando).
```js
const DiscordRPG = require('@jiman24/discord-rpg');

const client = new DiscordRPG({ 
  commandPrefix: "sb!", // setup default command prefix
  owner: ["264010327023288323"], // add your discord id here
});

//... rest of the code goes here

// make sure to put this last
client.login("secret-token-here");
```

#### Setup database
To setup a sqlite database, you need to give a filename as sqlite works as a
file. The setup has been abstracted so that you can start away use the database.
`client.db` returns [sqlite3](https://github.com/mapbox/node-sqlite3)'s
`Database` which you can run custom sql statement. `client.db?` has `?` at the
end is javascript's [optional
chaining](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining)
which means if this member of an object exists return it, if not return early
`undefined`.
```js
client.setDBFile("data.db").then(() => {

    // define custom schema
    client.db?.run(`
      CREATE TABLE IF NOT EXISTS player (
       player_id TEXT UNIQUE PRIMARY KEY,
       gold      DEFAULT 0,
       xp        DEFAULT 0
      )
    `)

  })
```

### Adding command
`discord-rpg` also provide simpler way to add command. Unlike `commando` where
you have to extend `Command` class in order to add a command, you can just use
`client.registerCommand`. The first parameter is command information where you
can pass additional info about the command for example adding alias or add
description about a command.

```js
// normal command
client.registerCommand({ name: "name" }, (msg, args) => {
  msg.say(`My name is ${client.user?.username}`);
  const guild = msg.guild.name; // to access which guild the command is run
  const channel = msg.channel.name; // access which channel the command run
  msg.say(`Im in ${guild} on channel ${channel}`); // send message
})


// adding alias to a command. aliases expects an array of strings where you add
// multiple aliases for a command
client.registerCommand({ name: "sample", aliases: ["s"] }, (msg, args) => {
  msg.say("I'm sample command");
})
```

### Embed message
Embed message is already provided by
[discord.js](https://github.com/discordjs/discord.js) and it's already simple
and powerful. To read further, you can read the documentation
[here](https://discord.js.org/#/docs/main/stable/class/MessageEmbed).
```js
const {MessageEmbed} = require("discord.js");

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

  msg.embed(embed); // finally send the embed message
})
```

### Implement ban command
You can access the arguments passed to a command by indexing second argument
`args`.
```js
// ban command
client.registerCommand({ name: "ban", ownerOnly: true }, (msg, args) => {
  const [mention] = args; // array destructuring to get first element in the array
  client.provider.set(msg.guild, `ban-${mention}`, true); // simple key value db
  msg.say(`${mention} has been banned`);
})
```

### Set a channel
Sometimes you want your bot to only be accessible in a particular channel.
`client.dispatcher.addInhibitor` adds functions to run before the actual command
is executed, this is necessary for us to prevent user from using our bot outside
the selected channel. To read more, you can follow this
[link](https://discord.js.org/#/docs/commando/master/class/CommandDispatcher?scrollTo=addInhibitor).
```js
// set channel
client.registerCommand({ name: "setchannel", ownerOnly: true }, (msg, args) => {
  const channel = msg.channel;
  client.provider.set(msg.guild, "channel", channel.toString());
  msg.say(`Successfully set channel ${channel}`);
})

// only allow command to be run on selected channel only (which was set by
// sb!setchannel command)
client.dispatcher.addInhibitor(msg => {
  const channel = client.provider.get(msg.guild, "channel"); // get selected channel

  if (channel && msg.channel.toString() !== channel) {
    const response = msg.reply(
      `Commands on this channel is disabled. Please use ${channel}.`
    )

    // returning this object prevents the actual command to be run
    return {
      reason: "invalid channel",
      response,
    }
  }

  return false;
})
```

### Throttled command
Throttled command prevents user from executing command excessively. You can set
how many usage per time.
```js
// throttled command
client.registerCommand({ 
  name: "fish", 
  throttling: { usages: 1, duration: 5 } },  // set throttle
  (msg, args) => {
    const random = (min, max) => Math.floor(Math.random() * max) + min;
    const gold = random(1, 10);
    const xp = random(1, 10);
    const playerID = msg.author.id;

    // update user profile in the database
    client.db?.run(`
      UPDATE player 
      SET xp = xp + ?, gold = gold + ?
      WHERE player_id = ?
    `, xp, gold, playerID);
    
    msg.say(`Caught a fish and earned ${gold} gold and ${xp} xp`);
  })
```

### Register player upon using any command
This can be implemented by adding
[inhibitor](https://discord.js.org/#/docs/commando/master/class/CommandDispatcher?scrollTo=addInhibitor).

```js
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
```

### Full source code
```js
const { MessageEmbed, TextChannel } = require("discord.js");
const DiscordRPG = require("@jiman24/discord-rpg");

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
  const channel = msg.channel.name;
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
    const random = (min, max) => Math.floor(Math.random() * max) + min;
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

client.login("your-bot-token");

```

### API
`DiscordRPG` extends `Client` from
[commando.js](https://discord.js.org/#/docs/commando/master/general/welcome).

##### DiscordRPG#db

Returns `Database` instance from
[node-sqlite3](https://github.com/mapbox/node-sqlite3/wiki/API) 
which you can use to execute SQL statements.

##### DiscordRPG#setDBFile(filename)

Creates db file if not exists, and read from the specificied file name if
exists. This method returns promise which you can use to create table after
connection between db and js runtime has been made.

##### DiscordRPG#registerCommand(commandInfo, command)

Command info is details about your command such as `name`. You can read more
regarding `commandInfo`
[here](https://discord.js.org/#/docs/commando/master/typedef/CommandInfo).

Command is a function that accepts two arguments. First argument `msg` is an
instance of
[Message](https://discord.js.org/#/docs/main/stable/search?query=Message#/docs/main/stable/search?query=Message#/docs/main/stable/search?query=Message)
that triggers the command- from there, you can access both
[Guild](https://discord.js.org/#/docs/main/stable/class/Message?scrollTo=guild#/docs/main/stable/class/Message?scrollTo=guild#/docs/main/stable/class/Message?scrollTo=guild) and
[Channel](https://discord.js.org/#/docs/main/stable/class/Message?scrollTo=guild) of where the command was executed.

`DiscordRPG#registerCommand` has been simplified so you can add commands without
having to specify command groups and having to create a whole class.

### Documentation
Finally, if you think there are missing documentation here and there you can
checkout the following links:

- [discord.js](https://discord.js.org)
- [commando](https://discord.js.org/#/docs/commando/master/general/welcome)
- [node-sqlite3](https://github.com/mapbox/node-sqlite3)

