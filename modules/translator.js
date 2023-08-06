const https = require('https');
const {logger} = require('./logger.js');

//this module holds functions for the deepl API
//The module uses the client to send the answers from the API directly to the chat

//Init translator
var Translator = {};

//set twitch chat client
Translator.setClient = (client) => {
	Translator.client = client;
	logger.log("TRANSLATOR INFO: Twitch client set.");
}

//sets API key and URL from config
Translator.setAPIConfig = (config) => {
	Translator.APIKEY = config.apikey;
	Translator.URL = config.serviceUrl;
	logger.log("TRANSLATOR INFO: Deepl config set.");
}

//sets the user who will be displayed on error
Translator.setBotowner = (botowner) => {
	Translator.botowner = botowner;
	logger.log("TRANSLATOR INFO: Botowner set.");
}

//function that translates given text and sends it to twitch chat
//target = Twitch channel to send the message
//recipient = if someone taged a person before the command
//inputtext = text to be translated
//lang = target language
Translator.translateToChat = (target, recipient, inputtext, lang) => {

	//building request url
	const url = Translator.URL + `translate?auth_key=${Translator.APIKEY}&text=${inputtext}&target_lang=${lang}`;

	Translator.sendAPIRequest(url, translated => {
		if(translated.getstatusCode() === 200)
		{
			let chatmessage = translated.answer();
			if(recipient)			
				chatmessage = recipient + " " + chatmessage;			
			Translator.client.say(target,chatmessage);
		}
		else
		{
			let errmsg = `Translate request Failed. Error Code: ${statusCode}`;
			//send error message to chat
			Translator.client.say(target, `${errmsg} Please send this message to @${Translator.botowner}.`);
			logger.error(errmsg);
		}
	});
}

//function to send the usage of the API to chat. 
//target = twitch channel target 
Translator.sendAPIUsageToChat = (target) => {
	const url = Translator.URL + `usage?auth_key=${Translator.APIKEY}`;
	Translator.sendAPIRequest(url, usage => {
		if(usage.getstatusCode() === 200)
		{
			let statsMsg = `API usage this month ✏️📈 : ${usage.rawdata().character_count} out of 500000 characters used.`;
			Translator.client.say(target,statsMsg);
		}
		else
		{
			let errmsg = `Usage request Failed. Error Code: ${statusCode}`;
			//send error message to chat
			Translator.client.say(target, `${errmsg}`);
			logger.error(errmsg);
		}			
	});
}

//Sends the request to the API
Translator.sendAPIRequest = (url, callback) =>
{
	const req = https.get(url, res => {

		//API error handling
		const {statusCode} = res;
		if(statusCode !== 200)
		{
			callback(new Translator.apiData(null,statusCode));
			// Consume response data to free up memory
			res.resume();
			return;		
		}

		//collecting res data
		let resdata = [];
		res.on('data', chunk =>
		{
			resdata.push(chunk);
		});

		//eval data and send to chat
		res.on('end', () =>{
			//parse res to JSON
			let answer = JSON.parse(Buffer.concat(resdata).toString());
			callback(new Translator.apiData(answer,statusCode));			
		});
	}).on('error', err => {
		logger.error('Error: ', err.message);
	});
	req.end();
}

Translator.apiData = function(apidata,statusCode){
	this.resdata = apidata;
	this.statusCode = statusCode;
}

Translator.apiData.prototype.rawdata = function () {
	return this.resdata;
}

Translator.apiData.prototype.answer = function() {
	return this.resdata.translations[0].text;
}

Translator.apiData.prototype.getstatusCode = function() {
	return this.statusCode;
}

module.exports = Translator;
