const {logger} = require('./logger.js');
//HanasuAI can start now
console.log("HanasuAI is starting..");

//imports
//import config
const config = require('./config.js');
const tmi = require('tmi.js');
const proc = require('process');
const Translator = require('./translator.js');
const Stats = require('./stats.js');
const IBMTranslatorV3 = require('ibm-watson/language-translator/v3');
const { IamAuthenticator } = require('ibm-watson/auth');

// Create a client with our options
const client = new tmi.client(config.tmiconf);

// Register  event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

//Create the Translator for deepl
Translator.setClient(client);
Translator.setAPIConfig(config.deeplconfig);
Translator.setBotowner(config.botowner);

//Create the Translator IBM
Translator.registerAutoTranslator(new IBMTranslatorV3(config.ibmconfig));
//Set default channel for autotranslation
var autotranslatechannel = [...config.AutoTranslateChannel];
logger.log(`INFO: Auto translation enabled for the following channels: ${autotranslatechannel}`);

// Valid commands start with !
const commandPrefix = '!';
//all JP characters (Hiragana,Katakana, Common, uncommon and rare kanji )
const jpcharacters = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/;

// Called every time a message comes in. Handler for all commands
function onMessageHandler (target, user, msg, self) {
	if (self) { return; } // Ignore messages from the bot

	//check if autotranslation is enabled for target channel
	const autotranslate = autotranslatechannel.includes(target);

	//If someone hits reply in the chat, the chat will automaticly add the targeted user as first word, starting with an @
	//If this is the case, remove the first word to check if the user used a command while using the reply feature.
	let recipient = null;
	if(msg.substr(0,1) === '@')
    {
		recipient = msg.substr(0, msg.indexOf(" "));
        msg = msg.substr(msg.indexOf(" ") + 1);
    }

	//remove emotes from message, because they can mess up the translation. (Thanks to stefanjudis for this idea/example code on how to handle emotes)
	//This also prevents the bot from trying to translate messages, that are filled with emotes only.
	//"user" includes all meta informations about the user, that sends the message. It also includes informations about the used emotes! Example emote [id, positions]: "425618": ["0-2"]
	if(user.emotes) 
	{
		//array to save all emotes that needs to be deleted later.
		let emotesToDelete=[];
		//iterate of emotes to find all positions 
		//using sequential loop to get all emotes.
		for(positions of Object.values(user.emotes))
		{
			const position = positions[0]; //We only need the first position for every emote, as we can relpace all emotes of this kind
			const [start, end] = position.split("-");
			//using match(/./gu) to get unicode emojis as one character. Twitch sees these at 1 character. JS String not.
			//with this, I put all characters in an array, so the start and end positions are correct again.
			emotesToDelete.push(msg.match(/./gu).slice(parseInt(start),parseInt(end)+1).join(''));		
		}

		//replace all emotes with an empty string
		//using sequential loop to get all emotes. 
		for(emote of emotesToDelete){			
			//NodeJS doesn't know replaceAll. So we need to use Regex. 	
			//escape special character as some of them are used in emotes like ":)" or ":("	
			msg = msg.replace(new RegExp(emote.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),'');
		};
	}

	//If no command Prefix: handle autotranslation if enabled.
	if (msg.substr(0, 1) !== commandPrefix) 
	{
		if(autotranslate && !config.AutoTranslateIgnoredUser.includes(user.username))
		{		
			if(jpcharacters.test(msg))
			{
				Translator.autotranslate(target,recipient,msg,'en');
				Stats.incrementCounter(target.substring(1),'EN-US');
			}
			else
			{
				Translator.autotranslate(target,recipient,msg,'ja');
				Stats.incrementCounter(target.substring(1),'JA');
			}
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
		else if(commandName === 'broadcast' && hasParameter) //sends a message to all channels
		{
			for(channel of config.tmiconf.channels)	
				client.say(channel,inputtext);
			return;
		}
	}
	//commands streamer + botowner
	if(isBroadcaster || isBotOwner)
	{
		if(commandName === 'automode' && hasParameter)
		{
			if(inputtext === 'off')
			{ 	if(autotranslate)
				{
					autotranslatechannel = autotranslatechannel.filter(t => t !== target);				
					client.say(target,"Disabled auto-translation! | ????????????????????????????????????????????????");
					logger.log("AUTOMODE INFO: Disabled auto-translation for " + target);
				}
				else
					client.say(target,"Auto-translation is already disabled. | ????????????????????????????????????????????????");

			}
			else if (inputtext === 'on')
			{
				if(!autotranslate) //to avoid double activation
				{
					autotranslatechannel.push(target);
					client.say(target,"Enabled auto-translation! | ????????????????????????????????????????????????????????????");
					logger.log("AUTOMODE INFO: Enabled auto-translation for " + target);
				}
				else
					client.say(target,"Auto-translation is already enabled. | ??????????????????????????????????????????");

			}
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
	if (commandName === 'jp' && hasParameter) 
	{
		try 
		{
			Translator.translateToChat(target,recipient,encodeURIComponent(inputtext),'JA');
			Stats.incrementCounter(target.substring(1),'JA');			
		} catch (error) 
		{
			logger.error('Error translating this message to Japanese: ' + inputtext);
			logger.error(error);
		}

		return;
	}
	else if(commandName === 'en' && hasParameter)
	{		
		try 
		{
			Translator.translateToChat(target,recipient,encodeURIComponent(inputtext),'EN-US');
			Stats.incrementCounter(target.substring(1),'EN-US');			
		} catch (error) 
		{
			logger.error('Error translating this message to English: ' + inputtext);
			logger.error(error);			
		}

		return;
	}
	else if(commandName === 'infoen')
	{
		let infoMsg = "Hey, my name is HanasuAI. I can translate messages for you! ";
		if(!autotranslate)
			infoMsg = infoMsg + "Just type !jp for Japanese translation or !en for English translation. I will detect the your input language automatically";
		else
			infoMsg = infoMsg + "Currently I'm running in auto-translate mode.";
		if(recipient)
			infoMsg = recipient + " " + infoMsg;
		else if(hasParameter)
			infoMsg = inputtext + " " + infoMsg;

		client.say(target, infoMsg);
		return;
	}
	else if (commandName === 'infojp')
	{
		let infoMsg = "???????????????????????? HanasuAI (??????????????????)?????????";						
		if(!autotranslate)
			infoMsg = infoMsg + "??????????????????????????????????????????????????????????????????????????????????????????????????????!jp??????????????????????????????!en???????????????????????????????????????????????????????????????????????????????????????";		
		else
			infoMsg = infoMsg + "?????????????????????????????????????????????????????????";	
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
			client.say(target, `This month I have already translated ${channelstats.toJP}x into Japanese ???????? and ${channelstats.toEN} times into English ???????? for ${target.substring(1)}.`);
		});
		return;
	}
	else if (commandName === 'jstats')
	{
		Stats.getChannelStats(target.substring(1), channelstats => {
			client.say(target, `????????????${target.substring(1)} ???????????????????????${channelstats.toJP}???????????????????????${channelstats.toEN}????????????????????????`);
		});
		return;
	}
	else if(commandName === 'statsg')
	{
		Stats.getStatsGlobal((month, total) => {
			client.say(target, `I have translated ${month.toJP}x into Japanese ???????? and ${month.toEN}x into English ???????? this month. `+ 
								`Since I started counting ${total.toJP}x into Japanese ???????? and ${total.toEN}x into English ???????? .`);
		});
		return;
	}
	else if(commandName === 'jstatsg')
	{
		Stats.getStatsGlobal((month, total) => {
			client.say(target, `????????????${month.toJP}x??????????????????????????${month.toEN}x????????????????????????????????????????? `+ 
								`???????????????????????????????????????????????????${total.toJP}x??????????????????????????${total.toEN}x????????????????????????????????????????????`);
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
	logger.log(`* Connected to ${addr}:${port}`);
}

//cach Exception and write them to the logfile
proc.on('uncaughtException', function(err) {
	console.error('uncaughtException!!');
	console.error((err && err.stack) ? err.stack : err);
  });
