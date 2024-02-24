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
	defaultLanguage: "jpn",
	bannedWords: [],
	autouser : [],
	italic : false
}

//THIS IS FIXED IN THE CODE!! Only change this if you know what you are doing!!
//It's for validating the user input for the !defaultlanguage command
const supportedLanguages = ['eng','jpn']; 


// mapping for the language codes
// key is the command that HanasuAI understands
// value is the language code for the deepl API
const languageMappings = {
	'jp': 'JA',
	'en': 'EN-US',
	'円': 'EN-US',
	'es': 'ES',
	'fr': 'FR'
};

//function to load the channelconfig from file also updates the config entries if new entries are added to the defaultChannelConfig
function loadChannelConfig() {
	try {
		const data = fs.readFileSync(ChannelConfigFile, 'utf8');
		const channelconfig = JSON.parse(data);
		tmiconf.channels = Object.keys(channelconfig); //set all channels from config file to tmijs
		return checkChannelConfig(channelconfig);
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

//function to save the channelconfig to file
function saveChannelConfig(channelconfig) {
	try {
		fs.writeFileSync(ChannelConfigFile, JSON.stringify(channelconfig));
		return true;
	} catch (err) {
		return false;
	}
}

//function to iterate over the channelconfig and check for missing entries from defaultChannelConfig
function checkChannelConfig(channelconfig)
{
	let needSave = false;
	Object.keys(channelconfig).forEach((channel) => {
		for (const key in defaultChannelConfig) {
			if (!channelconfig[channel].hasOwnProperty(key)) {
				channelconfig[channel][key] = defaultChannelConfig[key];
				needSave = true;
			}
		}
	});
	if(needSave)
		saveChannelConfig(channelconfig);
	return channelconfig;
}

module.exports = {tmiconf, DeeplConfig, Botowner, StatisticsFile, AutoTranslateIgnoredUserGlobal, saveChannelConfig, loadChannelConfig, defaultChannelConfig, supportedLanguages, languageMappings};