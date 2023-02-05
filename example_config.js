// Define configuration options for HanashAI

//Config for tmi.js
const tmiconf = {
	identity: {
		username: "USERNAME", //twitch username
		password: "OAUTHTOKEN" //oauthtoken 
	},
	channels: [
		'CHANNEL_NAME' //channel name, where the bot should join
	]
};


//List of users whose messages are ignored if automatic translation is enabled.
const AutoTranslateIgnoredUser = ['streamelements','streamlabs','nightbot'];
//List of channels, where the autotranslate function should be enabled by default
//NOTE: channel names have to have a '#' infront of them!
const AutoTranslateChannel = ['#channel']

//Config for deepl
const deeplconfig = {
	apikey: 'APIKEY', // Key for the deepl API
	serviceUrl: 'SERVICEURL' //URL of the deepl.com API
}

//Twitch username of the Botowner
const botowner = "TWITCHUSERNAME";

//File name where the bot logs the statistics
const StatisticsFile = "stats.json";

module.exports = {tmiconf,deeplconfig,botowner,StatisticsFile,AutoTranslateIgnoredUser,AutoTranslateChannel};
