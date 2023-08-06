const fs = require('fs');
// Define configuration options for HanashAI

//Config for tmi.js
const tmiconf = {
	identity: {
		username: "USERNAME", //twitch username
		password: "OAUTHTOKEN" //oauthtoken 
	},
	channels: []
};

//Config for deepl
const deeplconfig = {
	apikey: 'APIKEY', // Key for the deepl API
	serviceUrl: 'https://api-free.deepl.com/v2/' //URL of the deepl.com API (free tier)
	//serviceUrl: 'https://api.deepl.com/v2/'  //for deepl pro
}

//Twitch username of the Botowner
const Botowner = "TWITCHUSERNAME";

//File name where the bot logs the statistics
const StatisticsFile = "stats.json";
//File name were the bot loads/saves channel specific settings from/to
const ChannelConfigFile = "config/channelconfig.json";

//List of users whose messages are ignored if automatic translation is enabled. for every channel
const AutoTranslateIgnoredUserGlobal = ['streamelements','streamlabs','nightbot'];

//Default config that will be added to every new user. 
const defaultChannelConfig = {
	autotranslate: false,
	ignoreduser: [],
}

function loadChannelConfig() {
	try {
		const data = fs.readFileSync(ChannelConfigFile, 'utf8');
		const channelconfig = JSON.parse(data);
		tmiconf.channels = Object.keys(channelconfig); //set all channels from config file to tmijs
		return channelconfig;
	} catch (err) {
		//save default config to file
		const defaultConfig = {
			"CHANNELNAME": {
				...defaultChannelConfig
			},
		};
		saveChannelConfig(defaultConfig);
		return false;
	}
}

function saveChannelConfig(channelconfig) {
	try {
		fs.writeFileSync(ChannelConfigFile, JSON.stringify(channelconfig));
		return true;
	} catch (err) {
		return false;
	}
}

module.exports = {tmiconf, DeeplConfig, Botowner, StatisticsFile, AutoTranslateIgnoredUserGlobal, saveChannelConfig, loadChannelConfig,defaultChannelConfig};