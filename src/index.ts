import {
  Client,
  Command,
  CommandInfo,
  CommandoClientOptions,
  CommandoMessage,
  SQLiteProvider,
} from "discord.js-commando";
import { open, Database } from "sqlite";
import sqlite3 from "sqlite3";
import crypto from "crypto";

interface RPGCommandInfo extends Partial<CommandInfo> {
  name: string;
}

class DiscordRPG extends Client {

  db?: Database;
  constructor(options?: CommandoClientOptions) {
    super(options);
    this.registry.registerGroup("general").registerDefaults();
  }

  // set sqlite3 database file
  async setDBFile(filename: string) {
    const db = await open({ filename, driver: sqlite3.Database });
    this.db = db;
    this.setProvider(new SQLiteProvider(db));
  }

  // register a command
  registerCommand(
    info: RPGCommandInfo, 
    cmd: (msg: CommandoMessage, args: string[]) => void,
  ) {

    const id = crypto.randomUUID();

    class Wrapper extends Command {

      constructor(client: Client) {
        super(client, {
          description: "empty",
          group: "general", 
          memberName: id,
          argsType: "multiple",
          ...info, 
        });
      }

      async run(msg: CommandoMessage, args: string[]) {
        cmd(msg, args);
        return null;
      }
    }

    this.registry.registerCommand(Wrapper);
  }
}

export default DiscordRPG;
