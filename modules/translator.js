const axios = require('axios');
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

	//building request body
	const translateBody = JSON.stringify({
		"text": [
		  `${inputtext}`
		],
		"target_lang": `${lang}`,
		"formality": "less",
		"preserve_formatting": true
	});

	Translator.sendAPIRequest("POST", "translate", translateBody, translated => {
		if(translated.getstatusCode() === 200)
		{
			let chatmessage = translated.answer();
			if(recipient)			
				chatmessage = recipient + " " + chatmessage;			
			Translator.client.say(target,chatmessage);
		}
		else
		{
			let errmsg = `Translate request Failed. Error Code: ${translated.getstatusCode()}`;
			//send error message to chat
			Translator.client.say(target, `${errmsg} Please send this message to @${Translator.botowner}.`);
			logger.error(errmsg);
		}
	});
}

//function to send the usage of the API to chat. 
//target = twitch channel target 
Translator.sendAPIUsageToChat = (target) => {	

	Translator.sendAPIRequest("GET","usage", null, usage => {
		if(usage.getstatusCode() === 200)
		{
			let statsMsg = `API usage this month ✏️📈 : ${usage.rawdata().character_count} out of 500000 characters used.`;
			Translator.client.say(target,statsMsg);
		}
		else
		{
			let errmsg = `Usage request Failed. Error Code: ${usage.getstatusCode()}`;
			//send error message to chat
			Translator.client.say(target, `${errmsg}`);
			logger.error(errmsg);
		}			
	});
}

//Sends the request to the API
Translator.sendAPIRequest = (method, path, body, callback) =>
{
	let requestOptions = {
		method: method,
		url: Translator.URL + path,
		headers: {	"Authorization": `DeepL-Auth-Key ${Translator.APIKEY}`,
					"Content-Type": "application/json"},
		data: `${body}`,
	};

	axios(requestOptions)
	.then(response => {
		if(response.status === 200)		
			callback(new Translator.apiData(response.data ,response.status))
		else
			callback(new Translator.apiData(null,response.status));
	})
	.catch(error => {
		callback(new Translator.apiData(null, error.response.status));	
		logger.error("AXIOS ERROR: " + error);
	});	
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
