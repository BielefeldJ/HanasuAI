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

//Config for IBM Watson Service
const { IamAuthenticator } = require('ibm-watson/auth');
const ibmconfig = {
	version: 'VERSION', //the Version of the service API
	authenticator: new IamAuthenticator({
	  apikey: 'APIKEY', //Key for the service API 
	}),
	serviceUrl: 'SERVICEURL', //URL of the API Endpoint
	headers: {
		'X-Watson-Learning-Opt-Out': 'true' //To prevent IBM usage of your data for an API request, set the X-Watson-Learning-Opt-Out header parameter to true.
	}
}

//List of users whose messages are ignored if automatic translation is enabled.
const AutoTranslateIgnoredUser = ['streamelements','streamlabs','nightbot'];

//Logging settings
LOGGING.enable = true; //true = logging to file; false = logging to console
LOGGING.logfile = "HanasuAI.log";  //file name for the logfile
LOGGING.errlogfile = "err.log"; // file name for the err log file

//Config for deepl
const deeplconfig = {
	apikey: 'APIKEY', // Key for the deepl API
	serviceUrl: 'SERVICEURL' //URL of the deepl.com API
}

//Twitch username of the Botowner
const botowner = "TWITCHUSERNAME";

//File name where the bot logs the statistics
const StatisticsFile = "stats.json";

module.exports = {tmiconf,ibmconfig,deeplconfig,botowner,LOGGING,StatisticsFile,AutoTranslateIgnoredUser};
