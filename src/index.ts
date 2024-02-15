import {
	Client,
	Events,
	GatewayIntentBits
} from "discord.js";
import fs from "fs";
import os from "os";

const configContent = JSON.parse(fs.readFileSync(".config.json", "utf-8"));
const token: string = configContent.token!;
const client_id: string = configContent.client_id!;

if (!token) {
	throw new Error("token is not defined in .config.json");
}
if (!client_id) {
	throw new Error("client_id is not defined in .config.json");
}

console.log("Bot is starting...");

const authLink = `https://discord.com/api/oauth2/authorize?client_id=${client_id}&permissions=0&scope=bot%20applications.commands`;

console.log(`Invite link: ${authLink}`);

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMembers,
	],
});

client.once(Events.ClientReady, (readyClient) => {
	console.log(`BreadBot activated! Running on ${os.hostname()}`);

	readyClient.guilds.cache.forEach((guild) => {
		console.log("----");
		guild.channels.cache.forEach((channel) => {
			console.log(guild.name, channel.name);
		});
	});
});

client.login(token);
