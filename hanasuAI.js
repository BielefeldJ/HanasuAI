const {logger} = require('./modules/logger.js');
//HanasuAI can start now
console.log("HanasuAI is starting..");


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
const proc = require('process');
const Translator = require('./modules/translator.js');
const Stats = require('./modules/stats.js');
const ChatMessage = require('./modules/chatmessage.js');
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

//Create the Translator for deepl
Translator.setClient(client);
Translator.setAPIConfig(config.DeeplConfig);
Translator.setBotowner(config.Botowner);

const commandPrefixes = ['!', '！']; //command prefixes for the bot

function handelAutoTranslate(msg, target, recipient, channelname)
{
	//ignore empty messages.
	if(!msg.replace(/\s/g, '').length)
		return;		
	
	//temporarily replace all non english user.
	//If a user was tagged in the message (user starting with @) and the name was written in Japanese Character like @こんばんは, HanasuAI thought the whole Message
	//was japanese and tryed to translate this into english. Eventho the message was english in the first pace.
	//It's only temp because Deepl handels Proper noun quite good. No need to remove them completly
	//This Regex matches an @ at the beginning of a word followed by 1 to many non-word character like a-z A-Z or 0-9. The last \B ends the word.
	let msgWithoutLocalNames = msg.replace(/\B@\W+\B/g, "")
	
	//detect the language that was used in the message
	const detectLang = franc(msgWithoutLocalNames, { minLength: 5 });
	const defaultLanguage = channelconfig[channelname].defaultLanguage;
	
	//language Mapping.
	// If the default language is eng and the detected language is eng as well -> translate to Japanes. If not -> english
	//mapping if the following formalt:  ISO 639-3 ? deepl language code : deepl language code
	//as franc uses ISO 639-3 and deepl has it's own language codes
	const languageMappings = {
		eng: { targetLanguage: detectLang === "eng" ? "JA" : "EN-US" },
		jpn: { targetLanguage: detectLang === "jpn" ? "EN-US" : "JA" },
	};
	
	const { targetLanguage } = languageMappings[defaultLanguage];
	
	//check if the english message has at least 5 character.
	//This way I can ignore most messages like "hehe" "xD" or something like this. No need to translate them.
	//This also makes sure that messages only containing unicode, so emojis only messages will not translated.
	if(detectLang !== "jpn" && !/[A-Za-z ]{5,}/.test(msg))
		return;

	Translator.translateToChat(target, recipient, msg, targetLanguage);
	Stats.incrementCounter(target.substring(1), targetLanguage);
}

function botownerCommand(command, target, channelname)
{
	if(command.commandName === 'shutdown') //shutdown the bot
	{
		client.say(target,"Byebye o/");			
		proc.exit();			
	}
	else if(command.commandName === 'api') //sends the API usage of the month in chat
	{
		Translator.sendAPIUsageToChat(target);
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
			logger.log(`ERROR joining channel ${userToRemove}: ${err}`);
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
}

function broadcasterCommand(command, target, autotranslate, channelname)
{
	if(command.commandName === 'automode' && command.hasParameter) //enable or disable auto translation for the channel
	{
		if(command.inputtext === 'off')
		{ 	if(autotranslate)
			{
				channelconfig[channelname].autotranslate = false;	
				config.saveChannelConfig(channelconfig);			
				client.say(target,"Disabled auto-translation! | オートトランスレーションの無効化");
				logger.log("AUTOMODE INFO: Disabled auto-translation for " + target);
			}
			else
				client.say(target,"Auto-translation is already disabled. | 自動翻訳がすでに無効になっている");

		}
		else if (command.inputtext === 'on')
		{
			if(!autotranslate) //to avoid double activation
			{
				channelconfig[channelname].autotranslate = true;
				config.saveChannelConfig(channelconfig);
				client.say(target,"Enabled auto-translation! | オートトランスレーションを有効にしました");
				logger.log("AUTOMODE INFO: Enabled auto-translation for " + target);
			}
			else
				client.say(target,"Auto-translation is already enabled. | 自動翻訳がすでに起動している");

		}
		return;
	}	
	else if(command.commandName === 'defaultlanguage' && command.hasParameter) //change the default language for the channel
	{
		if(config.supportedLanguages.includes(command.inputtext))
		{
			client.say(target,`Changed default language to ${command.inputtext}`);
			channelconfig[channelname].defaultLanguage = command.inputtext;
			config.saveChannelConfig(channelconfig);
		}
		else
			client.say("Please provide a default language. (eng, jpn)");

		return;
	}
}

function modCommand(command, target, channelname)
{
	if(command.commandName === 'hanasu') //ping command to check if the bot is sill running + uptime
	{
		var time = process.uptime();
		var uptime = (time + "").toHHMMSS();
		client.say(target,`Hey, I am still here. Running since ${uptime}!`);	
		return;		
	}	
	else if(command.commandName === 'ignoreuser' && command.hasParameter) //add or remove a user from the ignorelist
	{
		const userToIgnore = getUsernameFromInput(command.inputtext);

		if(!userToIgnore)
		{
			client.say(target,"Please provide a valid twitch username. (Not a displayname!)");
			return;
		}
		const ignoredUsers = channelconfig[channelname].ignoreduser;
		const index = ignoredUsers.indexOf(userToIgnore);

		if(index !== -1)
		{
			// Remove user from the ignoreduser array using splice
			ignoredUsers.splice(index, 1);
			client.say(target, `Removed user ${userToIgnore} from the ignorelist.`);
			logger.log(`Removed user ${userToIgnore} from the ignore list for ${target}`);
		}
		else
		{
			ignoredUsers.push(userToIgnore);
			client.say(target, `Added user ${userToIgnore} to the ignorelist.`);
			logger.log(`Added user ${userToIgnore} to the ignore list for ${target}`);
		}
		config.saveChannelConfig(channelconfig);
		return;
	}
	else if(command.commandName === "banword" && command.hasParameter) //add or remove a word from the banned words list
	{
		const bannedWords = channelconfig[channelname].bannedWords;
		const index = bannedWords.indexOf(command.inputtext);

		if(index !== -1)
		{
			bannedWords.splice(index, 1);
			client.say(target, `Removed "${command.inputtext}" from the banned words list.`);
			logger.log(`Removed ${command.inputtext} from the banned word list for ${target}`);
		}
		else
		{
			bannedWords.push(command.inputtext);
			client.say(target, `Added "${command.inputtext}" to the banned words list.`);
			logger.log(`Added ${command.inputtext} to the banned word list for ${target}`);
		}
		config.saveChannelConfig(channelconfig);
		return;
	}
	else if(command.commandName === "autouser" && command.hasParameter) //add or remove a user from the auto translate list
	{
		const autoTranslateUser = getUsernameFromInput(command.inputtext);

		if(!autoTranslateUser)
		{
			client.say(target,"Please provide a valid twitch username. (Not a displayname!)");
			return;
		}

		const autotranslateUserList = channelconfig[channelname].autouser;
		const index = autotranslateUserList.indexOf(autoTranslateUser);

		if(index !== -1)
		{
			// Remove user from the ignoreduser array using splice
			autotranslateUserList.splice(index, 1);
			client.say(target, `Removed user ${autoTranslateUser} from the auto translation.`);
			logger.log(`Removed user ${autoTranslateUser} from the auto translate list for ${target}`);
		}
		else
		{
			autotranslateUserList.push(autoTranslateUser);
			client.say(target, `Added user ${autoTranslateUser} to the auto translation list.`);
			logger.log(`Added user ${autoTranslateUser} to the auto translation list for ${target}`);
		}
		config.saveChannelConfig(channelconfig);
		return;
	}
}

function userCommand(command, target, autotranslate)
{
	if(command.commandName === 'infoen')
	{
		let infoMsg = "Hey, my name is HanasuAI. I can translate messages for you! ";
		if(!autotranslate)
			infoMsg = infoMsg + "Just type !jp for Japanese translation or !en for English translation. I will automatically detect your input language.";
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
		if(!autotranslate)
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
	else if(command.commandName === 'stats')
	{		
		Stats.getChannelStats(target.substring(1), channelstats => {
			client.say(target, `This month I translated ${channelstats.toJP}x to Japanese 🇯🇵 and ${channelstats.toEN} times to English 🇺🇸 for ${target.substring(1)}.`);
		});
		return;
	}
	else if (command.commandName === 'jstats')
	{
		Stats.getChannelStats(target.substring(1), channelstats => {
			client.say(target, `今月は、${target.substring(1)} の日本語🇯🇵に${channelstats.toJP}回、英語🇺🇸に${channelstats.toEN}回翻訳しました。`);
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

function translateCommand(command, target)
{
	if (command.commandName === 'jp' && command.hasParameter) 
	{
		try 
		{
			Translator.translateToChat(target, command.recipient, command.inputtext,'JA');
			Stats.incrementCounter(target.substring(1),'JA');			
		} catch (error) 
		{
			logger.error('Error translating this message to Japanese: ' + command.inputtext);
			logger.error(error);
		}

		return;
	}
	else if((command.commandName === 'en' || command.commandName === '円') && command.hasParameter)
	{		
		try 
		{
			Translator.translateToChat(target, command.recipient, command.inputtext,'EN-US');
			Stats.incrementCounter(target.substring(1),'EN-US');			
		} catch (error) 
		{
			logger.error('Error translating this message to English: ' + command.inputtext);
			logger.error(error);			
		}

		return;
	}
	else if (command.commandName === 'es' && command.hasParameter) 
	{
		try 
		{
			Translator.translateToChat(target, command.recipient, command.inputtext,'ES');		
		} catch (error) 
		{
			logger.error('Error translating this message to Spanish: ' + command.inputtext);
			logger.error(error);
		}

		return;
	}
	else if (command.commandName === 'fr' && command.hasParameter ) 
	{
		try 
		{
			Translator.translateToChat(target, command.recipient, command.inputtext,'FR');		
		} catch (error) 
		{
			logger.error('Error translating this message to French: ' + command.inputtext);
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
	chatMessage.removeEmotes(user.emotes);
	
	chatMessage.cleanMessage(channelconfig[channelname]?.bannedWords || []); //remove URLs and banned words from the message
	
	//If someone hits reply in the chat, the chat will automaticly add the targeted user as first word, starting with an @
	//If this is the case, remove the first word to check if the user used a command while using the reply feature.
	//this has to be after the emote section. If not, the position of the emotes would be wrong, because the original message has already been edited
	let recipient = chatMessage.getRecipient();

	//check if autotranslation is enabled for target channel 
	const autoTranslateChannel = channelconfig[channelname].autotranslate;		
	//check if auto translation is enabled for a user
	const autoTranslateUser = channelconfig[channelname].autouser.includes(user.username);		
	const canAutoTranslate = autoTranslateChannel || autoTranslateUser;

	//If no command Prefix: handle autotranslation if enabled.
	if (chatMessage.isCommand())  
	{
		const command = chatMessage.createCommand();

		//prevent command injection!	
		if(['!', '/'].includes(command.inputtext.charAt(0)))
		{
			logger.log(`INFO: Command injection found! ${username} tryed to use ${command.inputtext}!`);
			return;			
		}

		//Used to check if a user is a mod or not
		const isBotOwner = user.username === config.Botowner; //twitch username of the botowner	
		const isBroadcaster = target.slice(1) === user.username || isBotOwner; //check if user broadcaster by comparing current channel with the username of the sender
		const isMod = user.mod || user['user-type'] === 'mod'|| isBroadcaster || isBotOwner; //check if user is a mod
	
		//commands only the Botowner can execute
		if(isBotOwner)
		{
			botownerCommand(command, target, channelname);
		}
		//commands streamer + botowner
		if(isBroadcaster)
		{
			broadcasterCommand(command, target, autoTranslateChannel, channelname);
		}
		//commands mods and owner can execute
		if(isMod)
		{
			modCommand(command, target, channelname);
		}
		// User commands	
		userCommand(command, target, autoTranslateChannel);
		translateCommand(command, target);		
	}	
	else
	{
		if(!canAutoTranslate)
			return;

		//check if user is on ignorelist 
		if(config.AutoTranslateIgnoredUserGlobal.includes(user.username))
			return;
	
		handelAutoTranslate(msg, target, recipient, channelname);		
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
