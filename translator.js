const config = require('./config');
const https = require('https');

//this module holds functions for the deepl API
//The module uses the client to send the answers from the API directly to the chat

//Init translator
var Translator = {};

function initTranslator() {
	Translator.encounter = 0;
	Translator.jpcounter = 0;
}
initTranslator();
//set twitch chat client
Translator.setClient = (client) => {
	Translator.client = client;
}

//set api client for deepl
Translator.setAPIKey = (apikey) => {
	Translator.APIKEY = apikey;
}

//counter suff for stats
Translator.incJPCounter = () =>{
	Translator.jpcounter++;
}

Translator.incENCounter = () =>{
	Translator.encounter++;
}

const DEEPL_API_URL = "https://api-free.deepl.com/v2/";

//function that translates given text and sends it to twitch chat
//target = Twitch channel to send the message
//recipient = if someone taged a person before the command
//inputtext = text to be translated
//lang = target language
Translator.translateToChat = (target, recipient, inputtext, lang) => {

	switch(lang)
	{
		case 'JA':
			Translator.incJPCounter();
			break;
		case 'EN-US':
			Translator.incENCounter();
			break;
	}
	//building request url
	const url = DEEPL_API_URL + `translate?auth_key=${Translator.APIKEY}&text=${inputtext}&target_lang=${lang}`;

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
			Translator.client.say(target, `${errmsg} Please send this message to @${config.botowner}.`);
			console.error(errmsg);
		}
	});
}

//function to send statistices on how often the bot is used to the twitch chat
//target = twitch channel target to send the message to
Translator.sendStatsToChat = (target) => {
	const url = DEEPL_API_URL + `usage?auth_key=${Translator.APIKEY}`;
	Translator.sendAPIRequest(url, usage => {
		if(usage.getstatusCode() === 200)
		{
			let statsMsg =  `Translated to Japanese 🇯🇵 : ${Translator.jpcounter} times since start; ` +
							`Translated to English 🇺🇸 : ${Translator.encounter} times since start; ` +
							`API usage this month ✏️📈 : ${usage.rawdata().character_count} / 500000`;
			Translator.client.say(target,statsMsg);
		}
		else
		{
			let errmsg = `Usage request Failed. Error Code: ${statusCode}`;
			//send error message to chat
			Translator.client.say(target, `${errmsg} Please send this message to @${config.botowner}.`);
			console.error(errmsg);s
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
		console.err('Error: ', err.message);
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
