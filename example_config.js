// Define configuration options
const tmiconf = {
	identity: {
		username: "USERNAME", //twitch username
		password: "OAUTHTOKEN" //oauthtoken 
	},
	channels: [
		CHANNEL_NAME //channel name, where the bot should join
	]
};

//Logging settings
LOGGING.enable = true; //true = logging to file; false = logging to console
LOGGING.logfile = "HanasuAI.log";  //file name for the logfile
LOGGING.errlogfile = "err.log"; // file name for the err log file

const deepl_apikey = "APIKEYHERE";
const botowner = "TWITCHUSERNAME";

module.exports = {tmiconf,deepl_apikey,botowner,LOGGING};
