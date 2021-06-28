const schedule = require('node-schedule');
const tmi = require('tmi.js');
const fs = require('fs');
const proc = require('process');
const https = require('https');
const config = require('./config.js');

//use logfiles
var access = fs.createWriteStream('access.log')
var error = fs.createWriteStream('error.log');

// redirect stdout / stderr
proc.stdout.write = access.write.bind(access);
proc.stderr.write = error.write.bind(error); 


// Valid commands start with !
const commandPrefix = '!';


// Create a client with our options
const client = new tmi.client(config.tmiconf);

// Register  event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

// Called every time a message comes in. Handler for all commands
function onMessageHandler (target, user, msg, self) {
	if (self) { return; } // Ignore messages from the bot

	// This isn't a command since it has no prefix:
	if (msg.substr(0, 1) !== commandPrefix) 
	{
		return;
	}
	
	let commandName, inputtext, hasParameter

	if(msg.indexOf(" ")<0)
	{
		commandName = msg.slice(1).toLowerCase();
		hasParameter = false;
	}
	else
	{
		// The command name is the first substring one and remove the !:
		commandName = msg.substr(0, msg.indexOf(" ")).slice(1).toLowerCase();
		//The message that should be translated and remove the first space 
		inputtext = msg.substr(msg.indexOf(" ")).slice(1);
		hasParameter = true;
	}


	//Used to check if a user is a mod or not
	let isMod = user.mod || user['user-type'] === 'mod';
	let isBroadcaster = target.slice(1) === user.username; //check if user broadcaster by comparing current channel with the username of the sender
	let isModUp = isMod || isBroadcaster;

	let isBotOwner = user.username === config.botowner; //twitch username of the botowner

	//used to check if the user send parameter
	

	console.log(`[${target} | ${user.username} | (${user['message-type']})] ${commandName} receved as command!`);

	//commands only the Botowner can execute
	if(isBotOwner)
	{
		if(commandName === 'heybot') //ping command to check if the bot is sill running 
		{
			client.say(target,"I am still up and running!");	
			return;		
		}	
		else if(commandName === 'shutdown') //shutdown the bot
		{
			client.say(target,"Byebye o/");			
			proc.exit();			
		}
		
	}
	// User commands
	if (commandName === 'jp' && hasParameter) 
	{
		translate(target,encodeURIComponent(inputtext),'JA');
		return;
	}
	else if(commandName === 'en' && hasParameter)
	{
		translate(target,encodeURIComponent(inputtext),'EN-US');
		return;
	}
	else if(commandName === 'es' && hasParameter)
	{
		translate(target,encodeURIComponent(inputtext),"ES");
		return;
	}
	else if(commandName === 'banana')
	{
		client.say(target,'djsweeBanana djsweeBanana djsweeBanana djsweeBanana djsweeBanana djsweeBanana djsweeBanana djsweeBanana djsweeBanana djsweeBanana djsweeBanana djsweeBanana djsweeBanana djsweeBanana djsweeBanana djsweeBanana djsweeBanana djsweeBanana djsweeBanana ');
		return;
	}
	else if(commandName === 'suki')
	{
		client.say(target,'Bananasan, daisuki 💖💖 djsweeSuki djsweeSuki djsweeSuki djsweeSuki djsweeSuki djsweeSuki ');
		return;
	}
	else if(commandName === 'infoen')
	{
		client.say(target,"Hey, my name is HanasuAI. I can translate messages for you! Just type !jp for Japanese translation. I will detect the your input language automatically");
	}
}

function translate(target, inputtext, lang)
{

	const url = `https://api-free.deepl.com/v2/translate?auth_key=${config.deepl_apikey}&text=${inputtext}&target_lang=${lang}`;

	const req =https.get(url,res => {
		let data = [];

		//write answer to data
		res.on('data', chunk => {
			data.push(chunk);
		  });
		
		res.on('end', () => {
			//parse answer to JSON
			answer = JSON.parse(Buffer.concat(data).toString());
			//get the first JSON object from the date.
			answer = answer.translations[0];
			//send answer to twitch chat
			client.say(target,`${answer.text}`);
		});

	});
	req.on('error', err => {		
		client.say(target, `Error translating. ${err.code} @ProfDrBielefeld`);
		console.err('Error: ', err.message);
	});

	req.end();
} 

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {	
	console.log(`* Connected to ${addr}:${port}`);
}

//cach Exception and write them to the logfile
proc.on('uncaughtException', function(err) {
	console.error((err && err.stack) ? err.stack : err);
  });
