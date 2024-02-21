import { BoardRunner, GraphDescriptor, InputValues, Schema } from "@google-labs/breadboard";
import * as mermaidCli from "@mermaid-js/mermaid-cli";
import {
	ActionRowBuilder,
	ChannelType,
	ChatInputCommandInteraction,
	Client,
	Events,
	GatewayIntentBits,
	Guild,
	GuildBasedChannel,
	Interaction,
	Message,
	MessagePayload,
	MessagePayloadOption,
	ModalActionRowComponentBuilder,
	ModalBuilder,
	ModalSubmitInteraction,
	Partials,
	REST,
	Routes,
	SlashCommandBuilder,
	TextChannel,
	TextInputBuilder,
	TextInputComponent,
	TextInputStyle,
	User,
} from "discord.js";
import "dotenv/config";
import express from "express";
import fs from "fs";
import os from "os";
import path from "path";
import { PuppeteerLaunchOptions } from "puppeteer";
import { is, validate } from "typia";
const app = express();
let botReady = false;
const PORT = process.env.PORT || 8080;

const instanceName = process.env.K_REVISION || os.hostname();

// puppeteer.defaultProduct()
// const revision = require('puppeteer/package').puppeteer.chromium_revision;

// Downloader.createDefault().downloadRevision('win64', revision, () => undefined)
// 	.then(() => { console.log('Done!'); })
// 	.catch(err => { console.log('Error', err); });


const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
if (!DISCORD_CLIENT_ID) {
	throw new Error("Missing DISCORD_CLIENT_ID");
}
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) {
	throw new Error("Missing DISCORD_TOKEN");
}
const HEARTBEAT_SERVER = process.env.HEARTBEAT_SERVER;
const HEARTBEAT_CHANNEL = process.env.HEARTBEAT_CHANNEL;

const client = new Client({
	intents: [
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
	],
	partials: [Partials.Channel, Partials.Message],
});

app.get("/healthz", (req, res) => {
	if (client.isReady()) {
		res.status(200).send("BreadBot is Go");
	} else {
		res.status(500).send("Bot not ready");
	}
});

app.get("/", (req, res) => {
	if (client.isReady()) {
		res.status(200).send("BreadBot is Go");
	} else {
		res.status(500).send("Bot not ready");
	}
});

app.get("/start", (req, res) => {
	if (botReady) {
		res.status(200).send("Ready");
	} else {
		res.status(500).send("Startup in progress");
	}
});


const loadBoardCommand = new SlashCommandBuilder()
	.setName("load")
	.setDescription("Loads a board from a url")
	.addStringOption((option) =>
		option
			.setName("url")
			.setDescription("The url of the board")
			.setRequired(true)
	);

type SlashCommandDefinition = Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
type Action = (interaction: SlashCommandDefinition) => Promise<void> | void;
type CommandAndHandler<T> ={
	command: SlashCommandDefinition
	handler: Action
}


async function setCommand(
	client_id: string,
	token: string,
	commands: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">[]
) {
	const result = await new REST()
		.setToken(token)
		// .put(Routes.applicationCommand(client_id) {
		.put(Routes.applicationCommands(client_id), {
			body: commands.map((command) => command.toJSON()),
		});


	// const results = commands.map(async (command) => {
	// 	const result = await new REST()
	// 		.setToken(token)
	// 		.patch(Routes.applicationCommand(client_id, command.name), {
	// 			body: command.toJSON(),
	// 		});
	// 	return result;
	// })
	// console.log({ results });
	// return results;
}

await setCommand(DISCORD_CLIENT_ID, DISCORD_TOKEN, [
	loadBoardCommand,
	new SlashCommandBuilder()
		.setName("run")
		.setDescription("Runs a board from a URL")
		.addStringOption((option) =>
			option
				.setName("url")
				.setDescription("The url of the board")
				.setRequired(true)
		),
]);

client.on(Events.ClientReady, (client) => {
	botReady = true;
	console.log("Ready");
	client.guilds.cache.forEach((guild: Guild) => {
		// print name of server and number of channels
		console.log(guild.name, ":", guild.channels.cache.size, "channels");
		// console.debug("----");
		guild.channels.cache.forEach(
			async (channel: GuildBasedChannel): Promise<void> => {
				// console.debug(guild.name, "-", channel.name);
				if (
					guild.name === HEARTBEAT_SERVER &&
					channel.name === HEARTBEAT_CHANNEL &&
					channel.type === ChannelType.GuildText
				) {
					await channel.send(
						[
							"```",
							`BreadBot ready at ${new Date().toISOString()}`,
							`Running on ${os.hostname()}`,
							process.env.K_SERVICE
								? `K_SERVICE:       ${process.env.K_SERVICE}`
								: undefined,
							process.env.K_REVISION
								? `K_REVISION:      ${process.env.K_REVISION}`
								: undefined,
							process.env.K_CONFIGURATION
								? `K_CONFIGURATION: ${process.env.K_CONFIGURATION}`
								: undefined,
							"```",
						].join("\n")
					);
					await startupTest(channel);
	// await puppeteer.createBrowserFetcher().download(puppeteerBrowsers.ChromeReleaseChannel.STABLE, (progress) => {
	// await puppeteer.createBrowserFetcher({
	// 	product: "chrome"
	// }).download("latest", (progress) => {
	// 	console.debug(progress);
	// });

					// testPuppeteer
					// const testMessage = await channel.send("Downloading chrome");
					// await puppeteerBrowsers.install({
					// 	cacheDir: path.join(os.tmpdir(), "puppeteer"),
					// 	browser: puppeteerBrowsers.Browser.CHROME,
					// 	buildId: "121.0.6167.184",
					// 	unpack: true,
					// 	platform: puppeteerBrowsers.BrowserPlatform.MAC_ARM,
					// 	downloadProgressCallback: (progress) => {
					// 		console.debug(progress);
					// 	}
					// }).then((installed) => {
					// 	console.log({ puppeteerBrowsers: { installed } });
					// }).catch((error: any) => {
					// 	console.error({ puppeteerBrowsers: { error } });
					// });

					// 	// })
					// 	// await puppeteer.createBrowserFetcher().download(puppeteerBrowsers.ChromeReleaseChannel.STABLE).then(async (download) => {
					// 	const message = JSON.stringify({
					// 		message: "Downloaded chrome",
					// 		download,
					// 	}, null, 2);
					// 	console.debug(message);
					// 	await testMessage.edit(["```", message, "```"].join("\n"));
					// }).catch(async (error: any) => {
					// 	const message = JSON.stringify({
					// 		message: "Failed to download chrome",
					// 		error,
					// 	}, null, 2);
					// 	console.error(message);
					// 	await testMessage.edit(["```", message, "```"].join("\n"));
					// });

					// const puppeteerLaunchMessage = await channel.send("Launching puppeteer");
					// await puppeteer.launch({
					// 	headless: "new",
					// }).then(async (browser) => {
					// 	const message = JSON.stringify({
					// 		message: "Launched puppeteer",
					// 		browser,
					// 	}, null, 2);
					// 	console.debug(message);
					// 	await puppeteerLaunchMessage.edit(["```", message, "```"].join("\n"));
					// 	// await browser.close();
					// }).catch(async (error: any) => {
					// 	const message = JSON.stringify({
					// 		message: "Failed to launch puppeteer",
					// 		error,
					// 	}, null, 2);
					// 	console.error(message);
					// 	await puppeteerLaunchMessage.edit(["```", message, "```"].join("\n"));
					// })
				}
			}
		);
	});
});

client.on(Events.MessageCreate, async (message): Promise<void> => {
	console.log({ message });
});

type OutputExtension = "md" | "markdown" | "svg" | "png" | "pdf";
type MermaidOutput = `${string}.${OutputExtension}`;

function isValidURL(url: string): boolean {
	try {
		new URL(url);
		return true;
	} catch (error) {
		return false;
	}
}
function extractFileNameAndExtension(url: string): {
	name: string;
	extension: string;
} {
	// Extract the last part of the URL (after the last '/')
	const lastSegment = url.split("/").pop();
	if (!lastSegment) {
		return { name: "", extension: "" };
	}

	// Find the last '.' to separate the name and extension
	const lastDotIndex = lastSegment.lastIndexOf(".");

	// If there's no '.', return the whole segment as the name
	if (lastDotIndex === -1) {
		return { name: lastSegment, extension: "" };
	}

	// Extract the name and extension
	const name = lastSegment.substring(0, lastDotIndex);
	const extension = lastSegment.substring(lastDotIndex + 1);

	return { name, extension };
}

async function executeLoadBoardCommand(
	interaction: ChatInputCommandInteraction
): Promise<void> {
	const command = interaction.commandName;
	const options = interaction.options;
	const user: User = interaction.user;
	const userId = user.id;
	let response = await interaction.reply("Checking...");
	const url = options.getString("url") || "";
	if (!isValidURL(url)) {
		const message = `Invalid URL: \`${url}\``;
		await respond(interaction, message);
		console.warn({
			message,
			interaction,
		});
		return;
	}
	if (!isJsonUrl(url)) {
		const message = `That URL does not end with .json: \`${url}\``;
		await respond(interaction, message);
		console.warn({ interaction, message });
		return;
	}
	let json: Object;
	try {
		json = await (await fetch(url)).json();
	} catch (error: any) {
		const message = [
			`I couldn't load that ${url}`,
			toJsonCodeFence(error.message),
		].join("\n");
		await respond(interaction, message);
		console.warn({ interaction, error });
		return;
	}

	if (!isBGL(json)) {
		const message = `Uh oh, that doesn't look like a board:\n${url}`;
		await respond(interaction, message);
		console.warn({ interaction, message });
		return;
	}
	await response.edit(`Loading ${url}`);

	const { name, extension } = extractFileNameAndExtension(url);
	const boardMetaDataMarkdown = generateBoardMetadataMarkdown(url, json);

	let message: Message = await respondInChannel(
		interaction,
		[
			boardMetaDataMarkdown,
			"⌛️ `json`",
			"⌛️ `markdown`",
			"⌛️ `mermaid`",
			`<@${userId}>`,
			`running on ${instanceName}`,
		].join("\n")
	);

	const tempFilename = `${name}.json`;
	const { jsonFile, tempDir } = mkTempFile("breadbot", tempFilename);
	fs.writeFileSync(jsonFile, JSON.stringify(json, bigIntHandler, "\t"));
	message = await editMessage(message, {
		content: [
			boardMetaDataMarkdown,
			"✅ `json` ",
			"⌛️ `markdown`",
			"⌛️ `mermaid`",
			`<@${userId}>`,
			`running on ${instanceName}`,
		].join("\n"),
		files: [jsonFile],
	});

	const runner = await BoardRunner.fromGraphDescriptor(json);
	const boardMermaid = runner.mermaid();
	const mmdFile = path.join(tempDir, `${name}.mmd`);
	fs.writeFileSync(mmdFile, boardMermaid);

	const markdown = [url, "```mermaid", boardMermaid, "```"].join("\n");
	const markdownFile = path.join(tempDir, `${name}.md`);
	fs.writeFileSync(markdownFile, markdown);
	message = await editMessage(message, {
		content: [
			boardMetaDataMarkdown,
			"✅ `json` ",
			"✅ `markdown`",
			"⌛️ `mermaid`",
			`<@${userId}>`,
			`running on ${instanceName}`,
		].join("\n"),
		files: [jsonFile, markdownFile],
	});

	const outputFormat: OutputExtension = "png";
	const imageFile: MermaidOutput = path.join(
		tempDir,
		`${name}.${outputFormat}`
	) as MermaidOutput;
	try {
		const timeStarted = Date.now();
		await mermaidCli.run(mmdFile, imageFile, {
			outputFormat,
			puppeteerConfig: {
				headless: true,
				args: [
					"--no-sandbox",
					// '--disable-setuid-sandbox',
					"--disable-dev-shm-usage",
					// '--disable-gpu',
				],
				timeout: minutesToMs(5),
				executablePath: "/usr/bin/chromium-browser",
			} satisfies PuppeteerLaunchOptions,
		});
		const timeElapsed = Date.now() - timeStarted;

		console.log({ tempFile: imageFile });

		message = await editMessage(message, {
			content: [
				boardMetaDataMarkdown,
				`<@${userId}>`,
				`running on ${instanceName}`,
				`rendered in ${timeElapsed / 1000}S (${timeElapsed}ms)`,
			].join("\n"),
			files: [jsonFile, markdownFile, imageFile],
		});
	} catch (error: any) {
		message = await editMessage(message, {
			content: [
				`<@${userId}>`,
				boardMetaDataMarkdown,
				"✅ `json` ",
				"✅ `markdown`",
				"❌ `mermaid`",
				`running on ${instanceName}`,
				"```json",
				JSON.stringify(
					{
						error,
					},
					null,
					"\t"
				),
				"```",
			].join("\n"),
			files: [jsonFile, markdownFile],
		});
	}
}

client.on(Events.InteractionCreate, async (interaction): Promise<void> => {
	// ignore messages from bot itself
	if (interaction.user.id === client.user?.id) {
		console.debug({
			ignored: interaction
		});
		return;
	}

	console.log({ interaction });

	if (interaction.isChatInputCommand()) {
		if (interaction.commandName === "load") {
			await executeLoadBoardCommand(interaction);
		} else if (interaction.commandName === "run") {
			await runBoardCommandHandler(interaction);
		}
	} else {
		// await sendDebug(interaction, { debug });
	}
});

function mkTempFile(prefix: string, tempFilename: string) {
	const tempDir = mkTempDir(prefix);
	const jsonFile = path.join(tempDir, tempFilename);
	return { jsonFile, tempDir };
}

function mkTempDir(prefix: string) {
	return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

async function editMessage(
	message: Message<boolean>,
	messageContent: MessagePayloadOption
) {
	const payload: MessagePayload = new MessagePayload(
		message.channel,
		messageContent
	);
	message = await message.edit(payload);
	return message;
}

function generateBoardMetadataMarkdown(url: string, graph: GraphDescriptor) {
	const { name, extension } = extractFileNameAndExtension(url);
	const filename = `${name}.${extension}`;

	const stringBuilder: string[] = [];

	stringBuilder.push(`# [${graph.title || filename}](${graph.url || url})`);

	if (graph.description) {
		stringBuilder.push(`> ${graph.description}`);
	}

	if (graph.$schema) {
		stringBuilder.push(`[$chema](${graph.$schema})`);
	}

	const nodeCount = graph.nodes.length;
	const edgeCount = graph.edges.length;
	const kitCount = graph.kits?.length || 0;
	const graphs: number = graph.graphs
		? Object.keys(graph.graphs).length + 1
		: 1;

	const stats = [
		"```",
		`nodes:  ${nodeCount}`,
		`edges:  ${edgeCount}`,
		`kits:   ${kitCount}`,
		`graphs: ${graphs}`,
		"```",
	].join("\n");
	stringBuilder.push(stats);

	return stringBuilder.join("\n");
}

async function sendDebug(interaction: Interaction, response?: Object) {
	const message = { interaction, ...response };
	const codeFence = toJsonCodeFence(message);
	console.debug({ message });
	await respond(interaction, codeFence);
}

async function respond(interaction: Interaction, message: string) {
	try {
		if (interaction.isRepliable()) {
			return await interaction.reply(message);
		} else {
			return await respondInChannel(interaction, message);
		}
	} catch (error: any) {
		return await respondInChannel(interaction, message);
	}
}

async function respondInChannel(
	interaction: Interaction,
	message: string,
	options: Omit<MessagePayloadOption, "content"> = {}
): Promise<Message> {
	if (!interaction.channel) {
		throw new Error("No channel to respond in");
	}
	const payload = new MessagePayload(interaction.channel, {
		content: message,
		ephemeral: true,
		...options,
	});
	return await interaction.channel.send(payload);
}

function bigIntHandler(key: any, value: { toString: () => any }) {
	return typeof value === "bigint" ? value.toString() : value;
}

function truncateObject(
	obj: any,
	maxLength: number,
	preserveKeys: string[] = [],
	lessImportantKeys: string[] = [],
	currentDepth: number = 0
): Object {
	let jsonString = JSON.stringify(obj, bigIntHandler, "\t");

	if (jsonString.length <= maxLength) {
		return obj;
	}

	// Function to recursively truncate objects
	function truncateRecursively(
		currentObj: any,
		currentMaxLength: number,
		depth: number
	) {
		const keys = Object.keys(currentObj);
		for (const key of keys) {
			// Skip preserved keys or if length is within limit
			if (preserveKeys.includes(key) || jsonString.length <= currentMaxLength) {
				continue;
			}

			// Handle less important keys differently based on depth
			if (depth > 0 && lessImportantKeys.includes(key)) {
				delete currentObj[key];
				jsonString = JSON.stringify(obj, bigIntHandler, "\t");
				if (jsonString.length <= currentMaxLength) {
					break;
				}
				continue;
			}

			const value = currentObj[key];
			if (typeof value === "string") {
				// Truncate strings
				currentObj[key] = value.substring(
					0,
					value.length - (jsonString.length - currentMaxLength)
				);
			} else if (typeof value === "object" && value !== null) {
				// Recursively handle nested objects
				truncateRecursively(
					value,
					currentMaxLength -
						jsonString.length +
						JSON.stringify(value, bigIntHandler).length,
					depth + 1
				);
			} else {
				// For other types, consider removing or reducing precision
				delete currentObj[key];
			}

			jsonString = JSON.stringify(obj, bigIntHandler, "\t");
			if (jsonString.length <= currentMaxLength) {
				break;
			}
		}
	}

	// Start the truncation process
	truncateRecursively(obj, maxLength, currentDepth);

	return obj;
}

function toJsonCodeFence(obj: any) {
	return [
		"```json",
		JSON.stringify(
			truncateObject(
				obj,
				1000,
				["title", "description", "$schema", "configuration"],
				["description"]
			),
			bigIntHandler,
			"\t"
		),
		"```",
	].join("\n");
}

function isJsonUrl(url: string): boolean {
	return isValidURL(url) && url.endsWith(".json");
}

function isBGL(json: any): json is GraphDescriptor {
	const valid = is<GraphDescriptor>(json);
	if (!valid) {
		const validation = validate<GraphDescriptor>(json);
		console.debug({ validation });
	}
	return valid;
}

type ChromeVersion = {
	channel: string;
	version: string;
	revision: string;
};

// export type ChromiumVersion = {
// 	channel: string;
// 	chromium_main_branch_position: number;
// 	hashes: Hashes;
// 	milestone: number;
// 	platform: string;
// 	previous_version: string;
// 	time: number;
// 	version: string;
// };

// export type Hashes = {
// 	angle: string;
// 	chromium: string;
// 	dawn: string;
// 	devtools: string;
// 	pdfium: string;
// 	skia: string;
// 	v8: string;
// 	webrtc: string;
// };

export type ChromeVersions = {
	timestamp: string;
	channels: Record<ChromeChannel, ChromeVersion>;
};

// export interface Channels {
// 	Stable: Stable;
// 	Beta: Beta;
// 	Dev: Dev;
// 	Canary: Canary;
// }

// export interface Stable {
// 	channel: string;
// 	version: string;
// 	revision: string;
// }

// export interface Beta {
// 	channel: string;
// 	version: string;
// 	revision: string;
// }

// export interface Dev {
// 	channel: string;
// 	version: string;
// 	revision: string;
// }

// export interface Canary {
// 	channel: string;
// 	version: string;
// 	revision: string;
// }

type ChromeChannel = "Stable" | "Beta" | "Dev" | "Canary";
// type Paltform = "Linux" | "Mac" | "Windows";

// https://chromiumdash.appspot.com/fetch_releases?channel=Stable&platform=Linux&num=1
async function getLatestChromiumVersionData(
	channel: ChromeChannel = "Stable"
): Promise<ChromeVersion> {
	const url =
		"https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json";
	const json: ChromeVersions = await fetch(url).then(
		async (response) => await response.json()
	);
	return json.channels[channel];
}
async function getChromeRevision(
	channel: ChromeChannel = "Stable"
): Promise<string> {
	const version = await getLatestChromiumVersionData(channel);
	return version.revision;
}

setInterval(() => {
	if (!client.isReady()) {
		console.error("Bot is not responsive, exiting...");
		process.exit(1);
	}
}, minutesToMs(1));

function minutesToMs(arg0: number): number {
	return 1000 * 60 * arg0;
}

client.login(DISCORD_TOKEN);

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});

async function startupTest(channel: TextChannel) {
	const url =
		"https://raw.githubusercontent.com/breadboard-ai/breadboard/main/boards/components/convert-string-to-json/index.json";
	const json: Object = await fetch(url).then(
		async (response) => await response.json()
	);
	const { name, extension } = extractFileNameAndExtension(url);

	if (!isBGL(json)) {
		throw new Error("Invalid board");
	}
	const testMessage = await channel.send("Runing startup test...");

	const { jsonFile, tempDir } = mkTempFile("breadbot", `${name}.json`);
	fs.writeFileSync(jsonFile, JSON.stringify(json, bigIntHandler, "\t"));

	await testMessage.edit({
		files: [jsonFile],
	});

	const runner = await BoardRunner.fromGraphDescriptor(json);
	const boardMermaid = runner.mermaid();
	const mmdFile = path.join(tempDir, `${name}.mmd`);
	fs.writeFileSync(mmdFile, boardMermaid);

	await testMessage.edit({
		files: [jsonFile, mmdFile],
	});

	const mermaidMarkdown = [
		"```mermaid",
		boardMermaid,
		"```",
	].join("\n");
	const markdownFile = path.join(tempDir, `${name}.md`);
	fs.writeFileSync(markdownFile, mermaidMarkdown);

	await testMessage.edit({
		files: [jsonFile, mmdFile, markdownFile],
	});

	const outputFormat: OutputExtension = "png";
	const imageFile: MermaidOutput = path.join(
		tempDir,
		`${name}.${outputFormat}`
	) as MermaidOutput;

	// const timeStarted = Date.now();

	// const browser = await puppeteer.launch({
	// 	// headless: "new",
	// 	headless: true,
	// 	timeout: 5 * 60 * 1000,
	// 	executablePath: process.env.CHROME_BIN || "/usr/bin/chromium-browser",
	// 	args: [
	// 		'--no-sandbox',
	// 		// '--disable-setuid-sandbox',
	// 		'--disable-dev-shm-usage',
	// 		// '--disable-gpu',
	// 	],
	// });
	// // const result = await mermaidCli.renderMermaid(browser, boardMermaid, "png")
	// const result = await mermaidCli.renderMermaid(
	// 	browser as any,
	// 	boardMermaid,
	// 	"png"
	// );
	// const timeElapsed = Date.now() - timeStarted;
	// await browser.close();
	// fs.writeFileSync(imageFile, result.data);


	const result = await mermaidCli.run(mmdFile, imageFile, {
		outputFormat,
		puppeteerConfig: {
			headless: true,
			args: [
				"--no-sandbox",
				// '--disable-setuid-sandbox',
				"--disable-dev-shm-usage",
				// '--disable-gpu',
			],
			// timeout: minutesToMs(5),
			// executablePath: "/usr/bin/chromium-browser",
		} satisfies PuppeteerLaunchOptions,
	});
	await testMessage.edit({
		files: [
			jsonFile,
			mmdFile,
			imageFile
		],
		content: [
			// `${timeElapsed}ms`,
			// `${timeElapsed / 1000}s`,
		].join("\n")
	});
}

// function runBoard(interaction: ChatInputCommandInteraction<import("discord.js").CacheType>) {
async function runBoardCommandHandler(
	interaction: ChatInputCommandInteraction
) {
	const options = interaction.options;
	const user: User = interaction.user;
	const url = options.getString("url") || "";
	// Commented out because showing a modal must be the first response to an interaction
	// https://discordjs.guide/interactions/modals.html#building-and-responding-with-modals:~:text=Showing%20a%20modal%20must%20be%20the%20first%20response%20to%20an%20interaction.%20You%20cannot%20defer()%20or%20deferUpdate()%20then%20show%20a%20modal%20later
	// const reply = await interaction.reply({
	// 	content: "Processing...",
	// }); 

	if (!isValidURL(url)) {
		const message = `Invalid URL: \`${url}\``;
		await respond(interaction, message);
		console.warn({
			message,
			interaction,
		});
		// await reply.delete();
		return;
	}

	if (!isJsonUrl(url)) {
		const message = `That URL does not end with .json: \`${url}\``;
		await respond(interaction, message);
		console.warn({
			message,
			interaction,
		});
		// await reply.delete();
		return;
	}

	const json: Object = await fetch(url).then(
		async (response) => await response.json()
	);
	if (!isBGL(json)) {
		const message = `Uh oh, that doesn't look like a board:\n${url}`;
		await respond(interaction, message);
		console.warn({
			message,
			interaction,
		});
		// await reply.delete();
		return;
	}

	// Testing with https://gist.githubusercontent.com/TinaNikou/946225dc7f364d9823b20e68419f1422/raw/32fe884d998211263e6693b012962ba873125e0e/TestBoard.json
	const runner = await BoardRunner.fromGraphDescriptor(json);
	for await (const runResult of runner.run()) {
		if (runResult.type === "input") {
			const invocationId = runResult.invocationId.toString()
			const modal = new ModalBuilder()
				.setCustomId(invocationId)
				.setTitle("Inputs");

			const schema = runResult.inputArguments["schema"] as Schema
			
			const components = Array<TextInputBuilder>()
			
			for (const key in schema.properties) {
				console.log("key", key);
				const component = new TextInputBuilder()
					.setCustomId(key)
					.setLabel(key)
					.setStyle(TextInputStyle.Short)
					.setRequired(true)
				components.push(component)
			}

			const actionRows = Array<ActionRowBuilder<TextInputBuilder>>()

			components.forEach((element) => {
				actionRows.push(new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(element))
			})

			actionRows.forEach((actionRow) => {
				modal.addComponents(actionRow);
			})

			const inputData = await interaction
				.showModal(modal)
				.then(async (message) => {
					// create a promise to be resolved when the modal is submitted
					const promise = new Promise<ModalSubmitInteraction>((resolve) => {
						client.on(Events.InteractionCreate, async (interaction) => {
							if (
								interaction.isModalSubmit() &&
								interaction.customId === invocationId
							) {
								await interaction.reply({ content: 'Your submission was received successfully!' }); // does there need to be a reply so that the modal can close?
								resolve(interaction);
							}
						});
					});
					// wait for the modal to be submitted
					const modalSubmit = await promise;
					console.log({ modalSubmit });

					const modalValuesFromFields: InputValues = {}

					const modalFields: Array<string>= Array<string>()

					modalSubmit.fields.fields.forEach((textInput: TextInputComponent, field: string) => {
						modalFields.push(field)
					});

					modalFields.forEach(field => {
						console.log(`Field '${field}'`)
						const textInputValue = modalSubmit.fields.getTextInputValue(field)

						console.log(`Value '${textInputValue}'`)
						modalValuesFromFields[field] = textInputValue
					});

					console.log("modalValuesFromFields: " + JSON.stringify(modalValuesFromFields, null, 2))
					
					runResult.inputs = modalValuesFromFields;

				});
		} else if (runResult.type === "output") {
			// TODO output handling
			
			if (runResult.node.id === "outputOne") {
				console.log("outputOne", JSON.stringify(runResult.outputs, null, 2));

				respondInChannel(interaction, JSON.stringify(runResult.outputs.outputMessageOne, null, 2))
				respondInChannel(interaction, toJsonCodeFence(runResult.outputs))

			} else if (runResult.node.id === "outputTwo") {
				console.log("outputTwo", JSON.stringify(runResult.outputs, null, 2));

				respondInChannel(interaction, JSON.stringify(runResult.outputs.outputMessageTwo, null, 2))
				respondInChannel(interaction, toJsonCodeFence(runResult.outputs))

			}
		}
	}
}
