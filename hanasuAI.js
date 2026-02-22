const {logger} = require('./modules/logger.js');
const proc = require('process');
const version = process.env.HANASU_VERSION || "dev";
//HanasuAI can start now
console.log("HanasuAI v" + version + " is starting up...");

//import config
const config = require('./config/config.js');
//check if confog was loaded correctly
const channelconfig = config.loadChannelConfig();
if(!channelconfig)
{
	logger.error("ERR: No channelconfig file detected. Creating default one. Please edit and restart the bot.");
	proc.exit();
}

//imports
const tmi = require('tmi.js');
const DeeplTranslator = require('./modules/deeplTranslator.js');
const AzureTranslator = require('./modules/azureTranslator.js');
const Stats = require('./modules/stats.js');
const ChatMessage = require('./modules/chatmessage.js');
const { checkSecretPhrase, getMidMentionReply, greetUser } = require('./modules/easterEggs.js');
//some ugly hackery stuff to get the import working.. idk a better way yet.
var franc
(async () => {
	franc = (await import('franc-min')).franc;	
})();

// Create a client with our options
const client = new tmi.client(config.tmiconf);

// Register  event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

//Create the Translator instance for Deepl
const deepLTranslator = new DeeplTranslator();
deepLTranslator.setClient(client);
deepLTranslator.setAPIConfig(config.DeeplConfig);
deepLTranslator.setBotowner(config.Botowner);

//Create the Translator instance for Azure
const azureTranslator = new AzureTranslator();
if (config.AzureTranslatorConfig) {
    azureTranslator.setClient(client);
    azureTranslator.setAPIConfig(config.AzureTranslatorConfig);
    azureTranslator.setBotowner(config.Botowner);
}

const commandPrefixes = ['!', '！']; //command prefixes for the bot

// mention cooldown stuff
const mentionCooldowns = new Map(); // key: channel name, value: timestamp
const MENTION_COOLDOWN_MS = 10000; // 10 seconds cooldown
// function to check if hanasuai was tagged in the middle of a message
function wasTaggedMidMessage(message) 
{
    const botName = config.BotName?.toLowerCase() || "hanasuai"; // fallback if not set
    const words = message.toLowerCase().split(/\s+/);
    return words.length > 1 && words.slice(1).some(word => word.includes(botName));
}

//function to handle auto translation
function handelAutoTranslate(msg, target, recipient, channelname, autoUserLanguage)
{
	//ignore empty messages.
	if(!msg.replace(/\s/g, '').length)
		return;		

	//temporarily replace all non english user.
	//If a user was tagged in the message (user starting with @) and the name was written in Japanese Character like @こんばんは, HanasuAI thought the whole Message
	//was japanese and tryed to translate this into english. Eventho the message was english in the first pace.
	//It's only temp because Deepl handels Proper noun quite good. No need to remove them completly
	//This Regex matches an @ at the beginning of a word followed by 1 to many non-word character like a-z A-Z or 0-9. The last \B ends the word.
	let msgWithoutLocalNames = msg.replace(/\B@\W+\B/g, "");

	// also remove names that are written in latin characters, like @HanasuAI or @HanasuAI123 as franc got confused with them as well.
	msgWithoutLocalNames = msg.replace(/\B@\w+/g, ""); 

	//detect the language that was used in the message
	const detectLang = franc(msgWithoutLocalNames, { minLength: 5 });
	const defaultLanguage = channelconfig[channelname].defaultLanguage;

	//choose the correct target language 
	const targetLanguage = autoUserLanguage ? autoUserLanguage : config.autoTranslateLanguageMappings[defaultLanguage](detectLang);
	
	//check if the english message has at least 5 character.
	//This way I can ignore most messages like "hehe" "xD" or something like this. No need to translate them.
	//This also makes sure that messages only containing unicode, so emojis only messages will not translated.
	if(detectLang !== "jpn" && !/[A-Za-z ]{5,}/.test(msg))
		return;

    // Use Deepl by default, or Azure if configured for this channel
    if (channelconfig[channelname].useAzureTranslator && config.AzureTranslatorConfig) {
        azureTranslator.translateToChat(target, recipient, msg, targetLanguage, channelconfig[channelname].italic);
    } else {
        deepLTranslator.translateToChat(target, recipient, msg, targetLanguage, channelconfig[channelname].italic);
    }
	Stats.incrementCounter(target.substring(1), targetLanguage);
}

//function to handle botowner commands
function botownerCommand(command, target, channelname)
{
	if(command.commandName === 'shutdown') //shutdown the bot
	{
		client.say(target,"Byebye o/");			
		proc.exit();			
	}
	else if(command.commandName === 'api') //sends the API usage of the month in chat
	{
		deepLTranslator.sendAPIUsageToChat(target);
		return;
	}		
	else if(command.commandName === 'broadcast' && command.hasParameter) //sends a message to all channels
	{
		for(channel of config.tmiconf.channels)	
			client.say(channel,command.inputtext);
		return;
	}
	else if(command.commandName === "joinchannel" && command.hasParameter) //adds the bot to some twitch channel
	{
		const userToJoin = getUsernameFromInput(command.inputtext); //no need for null check as client.join should go into catch.
		client.join(userToJoin).then((data) => {
			
			const channelname = data[0].substring(1);
			channelconfig[channelname] = {...config.defaultChannelConfig}; //add default config to new entry

			config.saveChannelConfig(channelconfig); //save new config file.

			Stats.addChannelToStatsData(channelname); //add user to stats system.

			client.say(target, `Joined channel ${data[0]}!`);
			logger.log( `Joined channel ${data[0]}!`);
		}).catch((err) => 
		{
			client.say(target,`Could not join channel ${userToJoin}. Please check logs.`);
			logger.log(`ERROR joining channel ${userToJoin}: ${err}`);
		});
		return;
	}
	else if(command.commandName === "removechannel" && command.hasParameter) //removes the bot from a twitchchannel
	{
		const userToRemove = getUsernameFromInput(command.inputtext); //no need for null check as client.join should go into catch.
		client.part(userToRemove).then((data) => 
		{
			const channelname = data[0].substring(1);
			delete channelconfig[channelname]; //remove entry from config.

			config.saveChannelConfig(channelconfig); //save new file
			client.say(target, `I left from channel ${data[0]}!`);
			logger.log( `Disconnected from channel ${data[0]}!`);
		}).catch((err) => 
		{
			client.say(target,`Could not disconnect from channel ${userToRemove}. Please check logs.`);
			logger.log(`ERROR disconnecting from channel ${userToRemove}: ${err}`);
		});
		return;
	}
	else if(command.commandName === "version") //get the current version of the bot
	{
		client.say(target,`My current version is ${version}. ♥`);
		return;
	}
	else if(command.commandName === "settranslator" && command.hasParameter) //change the translator for a channel
	{
		const value = command.inputtext.trim().toLowerCase();
		if (value === "azure" || value === "deepl") 
		{
			channelconfig[channelname].useAzureTranslator = (value === "azure");
			config.saveChannelConfig(channelconfig);
			client.say(target, `Translator for this channel set to ${value === "azure" ? "Azure" : "DeepL"}.`);
			logger.log(`Set translator for ${channelname} to ${value}`);
		} else 
			client.say(target, "Please specify either 'azure' or 'deepl'. Example: !settranslator azure");
		return;
	}
}

//function to handle broadcaster commands
function broadcasterCommand(command, target, channelname)
{
	if(command.commandName === 'defaultlanguage') //change the default language for the channel
	{
		if(command.hasParameter && config.autoTranslateLanguageMappings.hasOwnProperty(command.inputtext))
		{
			client.say(target,`Changed default language to ${command.inputtext}`);
			channelconfig[channelname].defaultLanguage = command.inputtext;
			config.saveChannelConfig(channelconfig);
		}
		else		
			client.say(target, `Please provide a default language. (${Object.keys(config.autoTranslateLanguageMappings).join(", ")})`);		

		return;
	}
	else if(command.commandName === "it") //toggle italic mode
	{
		channelconfig[channelname].italic = !channelconfig[channelname].italic;
		config.saveChannelConfig(channelconfig);
		client.say(target, `Using /me is now ${channelconfig[channelname].italic ? "enabled" : "disabled"}.`);
		return;
	}
}

//function to handle mod commands
function modCommand(command, target, channelname)
{
	if(command.commandName === 'hanasu') //ping command to check if the bot is sill running + uptime
	{
		var time = process.uptime();
		var uptime = (time + "").toHHMMSS();
		client.say(target,`Hey, I am still here. Running since ${uptime}!`);	
		return;		
	}	
	else if (command.commandName === 'automode') 
	{
		channelconfig[channelname].autotranslate = !channelconfig[channelname].autotranslate;
		config.saveChannelConfig(channelconfig);
		
		const autoTranslationEnabled = channelconfig[channelname].autotranslate;
		const message = autoTranslationEnabled ? "Enabled auto-translation! | オートトランスレーションを有効にしました" : "Disabled auto-translation! | オートトランスレーションの無効化";

		client.say(target, message);
		logger.log(`AUTOMODE INFO: ${autoTranslationEnabled ? "Enabled" : "Disabled"} auto-translation for ${target}`);
		
		return;
	}
	else if(command.commandName === 'ignoreuser' && command.hasParameter) 
	{
		const userToIgnore = getUsernameFromInput(command.inputtext);

		if(!userToIgnore) 
		{
			client.say(target,"Please provide a valid twitch username. (Not a displayname!)");
			return;
		}
		const ignoredUsers = channelconfig[channelname].ignoreduser;
		const added = toggleItemInList(ignoredUsers, userToIgnore);

		if (added) 
		{
			client.say(target, `Added user ${userToIgnore} to the ignorelist.`);
			logger.log(`Added user ${userToIgnore} to the ignore list for ${target}`);
		} else 
		{
			client.say(target, `Removed user ${userToIgnore} from the ignorelist.`);
			logger.log(`Removed user ${userToIgnore} from the ignore list for ${target}`);
		}
		config.saveChannelConfig(channelconfig);
		return;
	}
	else if(command.commandName === "banword" && command.hasParameter) 
	{
		const bannedWords = channelconfig[channelname].bannedWords;
		const added = toggleItemInList(bannedWords, command.inputtext);

		if (added) {
			client.say(target, `Added "${command.inputtext}" to the banned words list.`);
			logger.log(`Added ${command.inputtext} to the banned word list for ${target}`);
		} else {
			client.say(target, `Removed "${command.inputtext}" from the banned words list.`);
			logger.log(`Removed ${command.inputtext} from the banned word list for ${target}`);
		}
		config.saveChannelConfig(channelconfig);
		return;
	}
	else if(command.commandName === "autouser") 
	{
		const commandParts = command.inputtext.split(" ");

		if(commandParts.length < 1) {
			client.say(target,"Please provide a twitch username and a language code. Example: !autouser HanasuAI en");
			return;
		}

		const autoTranslateUser = getUsernameFromInput(commandParts[0]);
		
		if(!autoTranslateUser) {
			client.say(target,"Please provide a valid twitch username. (Not a displayname!)");
			return;
		}

		const autoTranslateUserLanguage = commandParts[1]; //get the second part of the command as language code. Example: !autouser HanasuAI en -> autoTranslateUserLanguage = "en"
		
		if(autoTranslateUser && !autoTranslateUserLanguage) //if no language code was provided, remove the user from the auto translate list
		{
			if(channelconfig[channelname].autouser.hasOwnProperty(autoTranslateUser)) {
				delete channelconfig[channelname].autouser[autoTranslateUser];
				client.say(target, `Removed user ${autoTranslateUser} from the auto translation list.`);
				logger.log(`Removed user ${autoTranslateUser} from the auto translate list for ${target}`);
				config.saveChannelConfig(channelconfig);
				return;
			}
		}

		if(!autoTranslateUserLanguage || !config.commandLanguageMappings.hasOwnProperty(autoTranslateUserLanguage)) {
			client.say(target, `Please provide a valid language code. (${Object.keys(config.commandLanguageMappings).join(", ")})`);
			return;
		}

		//set the language for the user in the config. If the user is not in the list, it will be added. If the user is already in the list, it will be updated with the new language code.
		const targetLanguageCode = config.commandLanguageMappings[autoTranslateUserLanguage];
		channelconfig[channelname].autouser[autoTranslateUser] = targetLanguageCode; 

		client.say(target, `Added user ${autoTranslateUser} to the auto translation list for ${targetLanguageCode}.`);
		logger.log(`Added user ${autoTranslateUser} to the auto translation list for ${target} with language ${targetLanguageCode}`);

		config.saveChannelConfig(channelconfig);
		return;
	}
}

function userCommand(command, target, channelname)
{
	if(command.commandName === 'infoen')
	{
		let infoMsg = "Hey, my name is HanasuAI. I can translate messages for you! ";
		if(!channelconfig[channelname].autotranslate)
			infoMsg = infoMsg + "Just type !jp for Japanese translation or !en for English translation. I will automatically detect your input language. For more languages: !language";
		else
			infoMsg = infoMsg + "Currently I'm running in auto-translate mode.";
		if(command.recipient)
			infoMsg = command.recipient + " " + infoMsg;
		else if(command.hasParameter)
			infoMsg = command.inputtext + " " + infoMsg;

		client.say(target, infoMsg);
		return;
	}
	else if (command.commandName === 'infojp')
	{
		let infoMsg = "やあ！私の名前は HanasuAI (話すエーアイ)です。";						
		if(!channelconfig[channelname].autotranslate)
			infoMsg = infoMsg + "あなたのためにメッセージを翻訳することができます。日本語の翻訳には「!jp」、英語の翻訳には「!en」と入力してください。入力された言語を自動的に検出します。";		
		else
			infoMsg = infoMsg + "現在、自動翻訳モードで動作しています。";	
		if(command.recipient)
			infoMsg = command.recipient + " " + infoMsg;
		else if(command.hasParameter)
			infoMsg = command.inputtext + " " + infoMsg;

		client.say(target, infoMsg);
		return;
	}
	else if(command.commandName === 'language')
	{
		client.say(target, "I can translate to Japanese 🇯🇵, English 🇺🇸, Spanish 🇪🇸, French 🇫🇷 and German 🇩🇪. Just type !jp, !en, !es, !fr or !de before your message.");
		return;
	}
	else if(command.commandName === 'stats')
	{		
		Stats.getChannelStats(channelname, channelstats => {
			client.say(target, `This month I translated ${channelstats.toJP}x to Japanese 🇯🇵 and ${channelstats.toEN} times to English 🇺🇸 for ${target.substring(1)}.`);
		});
		return;
	}
	else if (command.commandName === 'jstats')
	{
		Stats.getChannelStats(channelname, channelstats => {
			client.say(target, `今月は、${channelname} の日本語🇯🇵に${channelstats.toJP}回、英語🇺🇸に${channelstats.toEN}回翻訳しました。`);
		});
		return;
	}
	else if(command.commandName === 'statsg')
	{
		Stats.getStatsGlobal((month, total) => {
			client.say(target, `This month I translated ${month.toJP}x into Japanese 🇯🇵 and ${month.toEN}x into English 🇺🇸. `+ 
								`Since I started counting, I have translated ${total.toJP}x to Japanese 🇯🇵 and ${total.toEN}x to English 🇺🇸.`);
		});
		return;
	}
	else if(command.commandName === 'jstatsg')
	{
		Stats.getStatsGlobal((month, total) => {
			client.say(target, `今月は、${month.toJP}xを日本語🇯🇵に、${month.toEN}xを英語🇺🇸に翻訳しました。 `+ 
								`数え始めてから${total.toJP}xを日本語🇯🇵に、${total.toEN}xを英語🇺🇸に翻訳しました。`);
		});
		return;
	}
}

function translateCommand(command, target, italic)
{
	//get the language code for the command
	const targetLanguage = config.commandLanguageMappings[command.commandName];

	if (targetLanguage && command.hasParameter) //translate the message to the target language
	{
		try 
		{
			deepLTranslator.translateToChat(target, command.recipient, command.inputtext, targetLanguage, italic);
			Stats.incrementCounter(target.substring(1), targetLanguage);			
		} catch (error) 
		{
			logger.error(`Error translating this message to ${languageCode}: ${command.inputtext}`);
			logger.error(error);
		}

		return;
	}	
}

// Called every time a message comes in. Handler for all commands
function onMessageHandler (target, user, msg, self) 
{
	if (self) // Ignore messages from the bot
	 return;  
	 
	 //target.substring because the target channel has a leading #. So we remove that.
	 const channelname = target.substring(1);
	 
	 //ignore messages HanasuAI gets via PM because the user isn't in config
	 if(!channelconfig.hasOwnProperty(channelname))
	 return;
	
	//check if user is allowed to use HanasuAI or not.
	const blockedUser = channelconfig[channelname].ignoreduser.includes(user.username);	
	if(blockedUser)
		return;	

	// Create a new ChatMessage object
	const chatMessage = new ChatMessage(msg, commandPrefixes);

	//"user" includes all meta informations about the user, that sends the message. It also includes the emotes used.
	//remove emotes before getting the recipient! emotes are deleted by checking fixed positions in the message string. 
	chatMessage.removeEmotes(user.emotes);

	//If someone hits reply in the chat, the chat will automaticly add the targeted user as first word, starting with an @
	//If this is the case, remove the first word to check if the user used a command while using the reply feature.
	//this has to be after the emote section. If not, the position of the emotes would be wrong, because the original message has already been edited
	let recipient = chatMessage.getRecipient();

	//If no command Prefix: handle autotranslation if enabled.
	if (chatMessage.isCommand())  
	{
		const command = chatMessage.createCommand();

		//prevent command injection!	
		const trimmedInput = command.inputtext.trim();
		if (trimmedInput.startsWith('!') || trimmedInput.startsWith('/')) 
		{
			logger.log(`INFO: Command injection found! ${user.username} tried to use ${trimmedInput}!`);
			return;
		}

		//Used to check if a user is a mod or not
		const isBotOwner = user.username === config.Botowner; //twitch username of the botowner	
		const isBroadcaster = target.slice(1) === user.username || isBotOwner; //check if user broadcaster by comparing current channel with the username of the sender
		const isMod = user.mod || user['user-type'] === 'mod'|| isBroadcaster || isBotOwner; //check if user is a mod
	
		//execute the command based on the user role
		//exploiting the fact that switch cases fall through if no break is used
		switch(true)
		{
			case isBotOwner:
				botownerCommand(command, target, channelname);
			case isBroadcaster:
				broadcasterCommand(command, target, channelname);
			case isMod:	
				modCommand(command, target, channelname);
			default:
				userCommand(command, target, channelname);
				if(config.commandLanguageMappings.hasOwnProperty(command.commandName)) //check if the command is a translation command
				{		
					//remove URLs and banned words from the message
					chatMessage.cleanMessage(channelconfig[channelname]?.bannedWords || []); 		
					translateCommand(command, target, channelconfig[channelname].italic);
				}
		}		
	}	
	else
	{		
		chatMessage.cleanMessage(channelconfig[channelname]?.bannedWords || []); //remove URLs and banned words from the message		

		//check if autotranslation is enabled for target channel 
		const autoTranslateChannel = channelconfig[channelname].autotranslate;		
		//check if auto translation is enabled for a user
		const autoTranslateUser = channelconfig[channelname].autouser.hasOwnProperty(user.username);		
		const canAutoTranslate = autoTranslateChannel || autoTranslateUser;
		
		//check if user is on ignorelist 
		if(config.AutoTranslateIgnoredUserGlobal.includes(user.username))
			return;

		//Easter eggs and greetings stuff
		const greeting = greetUser(user.username);
		if (greeting)
			client.say(target, `@${user.username} ${greeting}`);

		const message = chatMessage.getMessage();
		const easter = checkSecretPhrase(message);
		if (easter)
			client.say(target, `@${user.username} ${easter}`);

		if (wasTaggedMidMessage(message)) 
		{
			const now = Date.now();
			const lastMention = mentionCooldowns.get(target) || 0;
		
			if (now - lastMention > MENTION_COOLDOWN_MS) 
			{
				mentionCooldowns.set(target, now);		
				client.say(target, `@${user.username} ${getMidMentionReply()}`);
			}
		}

		if(!canAutoTranslate)
			return;

		const targetLanguage = channelconfig[channelname].autouser[user.username];	
		handelAutoTranslate(message, target, recipient, channelname, targetLanguage);		
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

function getUsernameFromInput(input)
{
	//Twitch display names are always the username. Usernames on Twitch are always lowercase
	username = input.toLowerCase(); 
	
	 // If the sender tagged the user, remove the "@" at the beginning of the username
	if (username.startsWith('@')) 
		username = username.slice(1);
	
	// Check if the username only contains lowercase letters, numbers, and underscores
	if(/^[a-z0-9_]*$/.test(username))
		return username;
	else
		return null;
}

function toggleItemInList(list, item) {
    const index = list.indexOf(item);
    if (index !== -1) {
        list.splice(index, 1);
        return false; // removed
    } else {
        list.push(item);
        return true; // added
    }
}
