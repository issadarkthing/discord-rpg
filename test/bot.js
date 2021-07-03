"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dist_1 = __importDefault(require("../dist"));
const client = new dist_1.default();
client.registerCommand({ name: "sample" }, (msg, args) => {
    msg.say("hello world");
});
client.login(process.env.BOT_TOKEN);
