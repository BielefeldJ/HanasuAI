const tmi = require('tmi.js');
const fs = require('fs');
const proc = require('process');
const config = require('./config.js');
const Translator = require('./translator.js');

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

//Create the Translator
const translator = new Translator(client);

// Register  event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

// Called every time a message comes in. Handler for all commands
function onMessageHandler (target, user, msg, self) {
	if (self) { return; } // Ignore messages from the bot

	//If someone hits reply in the chat, the chat will automaticly add the targeted user as first word, starting with an @
	//If this is the case, remove the first word to check if the user used a command while using the reply feature.
	let recipient = null;
	if(msg.substr(0,1) === '@')
    {
		recipient = msg.substr(0, msg.indexOf(" "));
        msg = msg.substr(msg.indexOf(" ") + 1);
    }
	// This isn't a command since it has no prefix:
	if (msg.substr(0, 1) !== commandPrefix) 
	{
		return;
	}
	
	let commandName, inputtext, hasParameter
	//used to check if the user send parameter
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

	console.log(`[${target} | ${user.username} | (${user['message-type']})] ${commandName} receved as command!`);

	//commands only the Botowner can execute
	if(isBotOwner)
	{
		if(commandName === 'shutdown') //shutdown the bot
		{
			client.say(target,"Byebye o/");			
			proc.exit();			
		}		
	}
	//commands mods and owner can execute
	if(isModUp || isBotOwner)
	{
		if(commandName === 'hanasu') //ping command to check if the bot is sill running + uptime
		{
			var time = process.uptime();
			var uptime = (time + "").toHHMMSS();
			client.say(target,`Hey, I am still here. Running since ${uptime}!`);	
			return;		
		}
	}
	// User commands
	if (commandName === 'jp' && hasParameter) 
	{
		translator.translate(target,user,recipient,encodeURIComponent(inputtext),'JA');
		return;
	}
	else if(commandName === 'en' && hasParameter)
	{
		translator.translate(target,user,recipient,encodeURIComponent(inputtext),'EN-US');
		return;
	}
	else if(commandName === 'es' && hasParameter)
	{
		translator.translate(target,user,recipient,encodeURIComponent(inputtext),"ES");
		return;
	}
	else if(commandName === 'infoen')
	{
		console.log(`3 log ${inputtext}`);
		let infoMsg = "Hey, my name is HanasuAI. I can translate messages for you! " +
						"Just type !jp for Japanese translation or !en for English translation. " + 
		 				"I will detect the your input language automatically";
		if(recipient)
			infoMsg = recipient + " " + infoMsg;
		else if(hasParameter)
			infoMsg = inputtext + " " + infoMsg;

		client.say(target, infoMsg);
		return;
	}
	else if (commandName === 'infojp')
	{
		let infoMsg = "やあ！私の名前は HanasuAI (話すエーアイ)です。" +
						"あなたのためにメッセージを翻訳することができます。日本語の翻訳には「!jp」、英語の翻訳には「!en」と入力してください。" +
						"入力された言語を自動的に検出します。";
		if(recipient)
			infoMsg = recipient + " " + infoMsg;
		else if(hasParameter)
			infoMsg = inputtext + " " + infoMsg;

		client.say(target, infoMsg);
		return;
	}
	else if(commandName === 'stats')
	{
		translator.characterUsed(target);
		return;
	}	
}

//function for formating time.
String.prototype.toHHMMSS = function () {
    var sec_num = parseInt(this, 10);
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    var time    = hours+' hours, '+minutes+' minutes and '+seconds + ' seconds';
    return time;
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {	
	console.log(`* Connected to ${addr}:${port}`);
}

//cach Exception and write them to the logfile
proc.on('uncaughtException', function(err) {
	console.error('uncaughtException!!');
	console.error((err && err.stack) ? err.stack : err);
  });
