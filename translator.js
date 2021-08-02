const config = require('./config.js');
const tmi = require('tmi.js');
const https = require('https');
//this class holds functions for the deepl API
//The class uses the client to send the answers from the API directly to the chat
const DEEPL_API_URL = "https://api-free.deepl.com/v2/"; //outside the class, because const is not allowed in class?
class Translator{
	constructor(client)
	{
		this.client = client;
	}

	translate(target, user, recipient, inputtext, lang)
	{
		const url = DEEPL_API_URL + `translate?auth_key=${config.deepl_apikey}&text=${inputtext}&target_lang=${lang}`;

		const req = https.get(url,res => {

			//API error handling 
			const { statusCode } = res; 
			let error;
			//everything not status code 200 is an error.
			if (statusCode !== 200) 
			{
				error = new Error('Translate request Failed.\n' +
								`Error Code: ${statusCode}`);
			}
			if (error) 
			{
				//send error message to chat
				this.client.say(target, `${error.message} Please send this message to @ProfDrBielefeld.`);
				console.error(error.message);
				// Consume response data to free up memory
				res.resume();
				return;
			}
			//Evaluate response data
			let data = [];
			//write answer to data
			res.on('data', chunk => {
				data.push(chunk);
			});		
			res.on('end', () => {
				//parse answer to JSON
				let answer = JSON.parse(Buffer.concat(data).toString());
				//get the first JSON object from the date.
				answer = answer.translations[0];
				if(recipient)
				{
					answer.text = recipient + " " + answer.text;
				}
				//send answer to twitch chat
				this.client.say(target,`${answer.text}`);

			});
		}).on('error', err => {		
			console.err('Error: ', err.message);
		});
		req.end();
	} 

	characterUsed(target)
	{
		const url = DEEPL_API_URL + `usage?auth_key=${config.deepl_apikey}`;

		const req = https.get(url,res => {

			//API error handling 
			const { statusCode } = res; 
			let error;
			//everything not status code 200 is an error.
			if (statusCode !== 200) 
			{
				error = new Error('Usage request Failed.\n' +
								`Error Code: ${statusCode}`);
			}
			if (error) 
			{
				//send error message to chat
				this.client.say(target, `${error.message} Please send this message to @ProfDrBielefeld.`);
				console.error(error.message);
				// Consume response data to free up memory
				res.resume();
				return;
			}
			//Evaluate response data
			let data = [];
			//write answer to data
			res.on('data', chunk => {
				data.push(chunk);
			});		
			res.on('end', () => {
				//parse answer to JSON
				let answer = JSON.parse(Buffer.concat(data).toString());
				// answer contains character_count and character_count
				this.client.say(target,`Number of translated characters this month // 今月の翻訳文字数 : ${answer.character_count}`);
			});
		}).on('error', err => {
			console.err('Error: ', err.message);		
		});;
		req.end()
	} 
}

module.exports = Translator;