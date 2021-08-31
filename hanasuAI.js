const tmi = require('tmi.js');
const fs = require('fs');
const proc = require('process');
const config = require('./config.js');
const Translator = require('./translator.js');
const Stats = require('./stats.js');


if(LOGGING.enable)
{
	//use logfiles
	var access = fs.createWriteStream(LOGGING.logfile);
	var error = fs.createWriteStream(LOGGING.errlogfile);

	// redirect stdout / stderr
	proc.stdout.write = access.write.bind(access);
	proc.stderr.write = error.write.bind(error); 
}

// Valid commands start with !
const commandPrefix = '!';

// Create a client with our options
const client = new tmi.client(config.tmiconf);

// Register  event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

//Create the Translator
Translator.setClient(client);
Translator.setAPIKey(config.deepl_apikey);

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
	//If no command Prefix: check if message is JP, if yes, translate to eng if not, translate to JP
	if (msg.substr(0, 1) !== commandPrefix) 
	{
		var jp = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/;
		if(jp.test(msg))
		{
			Translator.translateToChat(target,recipient,encodeURIComponent(inputtext),'EN-US');
			Stats.incrementCounter(target.substring(1),'EN-US');
			return;
		}
		else
		{
			Translator.translateToChat(target,recipient,encodeURIComponent(inputtext),'JA');
			Stats.incrementCounter(target.substring(1),'JA');
			return;
		}
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
		else if(commandName === 'api') //sends the API usage of the month in chat
		{
			Translator.sendAPIUsageToChat(target);
			return;
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
	else if(commandName === 'infoen')
	{
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
		Stats.getChannelStats(target.substring(1), channelstats => {
			client.say(target, `This month I have already translated ${channelstats.toJP}x into Japanese 🇯🇵 and ${channelstats.toEN} times into English 🇺🇸 for ${target.substring(1)}.`);
		});
		return;
	}
	else if (commandName === 'jstats')
	{
		Stats.getChannelStats(target.substring(1), channelstats => {
			client.say(target, `今月は、${target.substring(1)} の日本語🇯🇵に${channelstats.toJP}回、英語🇺🇸に${channelstats.toEN}回翻訳しました。`);
		});
		return;
	}
	else if(commandName === 'statsg')
	{
		Stats.getStatsGlobal((month, total) => {
			client.say(target, `I have translated ${month.toJP}x into Japanese 🇯🇵 and ${month.toEN}x into English 🇺🇸 this month. `+ 
								` Since I started counting ${total.toJP}x into Japanese 🇯🇵 and ${total.toEN}x into English 🇺🇸 in total.`);
		});
		return;
	}
	else if(commandName === 'jstatsg')
	{
		Stats.getStatsGlobal((month, total) => {
			client.say(target, `今月は、${month.toJP}xを日本語🇯🇵に、${month.toEN}xを英語🇺🇸に翻訳しました。 `+ 
								`とカウントするようになってからは、${total.toJP}xを日本語🇯🇵に、${total.toEN}xを英語🇺🇸に合計しています。`);
		});
		return;
	}
}

//function for formating time.
String.prototype.toHHMMSS = function () {
    var sec_num = parseInt(this, 10);
	var days 	= Math.floor(sec_num / 86400);
    var hours   = Math.floor((sec_num - (days * 86400)) / 3600);
    var minutes = Math.floor((sec_num - (days * 86400) - (hours * 3600)) / 60);
    var seconds = sec_num - (days * 86400) - (hours * 3600) - (minutes * 60);

	if (days 	< 10) {days    = "0"+days;}
    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    var time    = days + ' days, ' + hours + ' hours, ' + minutes + ' minutes and ' + seconds + ' seconds';
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
