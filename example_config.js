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

const deepl_apikey = "APIKEYHERE";

const botowner = "TWITCHUSERNAME";

module.exports = {tmiconf,deepl_apikey,botowner};
