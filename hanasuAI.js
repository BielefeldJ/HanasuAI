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

// Valid commands start with !
const commandPrefix = '!'; //！
const jpcommandPrefix = '！';

// Called every time a message comes in. Handler for all commands
function onMessageHandler (target, user, msg, self) {
	if (self) { return; } // Ignore messages from the bot

	//target.substring because the target channel has a leading #. So we remove that.
	const channelname = target.substring(1);

	//check if user is allowed to use HanasuAI or not.
	if(channelconfig[channelname].ignoreduser.includes(user.username))
		return;

	//check if autotranslation is enabled for target channel 
	const autotranslate = channelconfig[channelname].autotranslate;

	//remove emotes from message, because they can mess up the translation. (Thanks to stefanjudis for this idea/example code on how to handle emotes)
	//This also prevents the bot from trying to translate messages, that are filled with emotes only.
	//"user" includes all meta informations about the user, that sends the message. It also includes informations about the used emotes! Example emote [id, positions]: "425618": ["0-2"]
	if(user.emotes) 
	{
		//array to save all emotes that needs to be deleted later.
		let emotesToDelete=[];
		//iterate of emotes to find all positions 
		//using sequential loop to get all emotes.
		for(const positions of Object.values(user.emotes))
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

	//remove URL and e-mail addresses from the message. 
	//Regex for URL and E-Mail addresses
	const urlRegex = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[.\!\/\\w]*))?)/
	msg = msg.replace(urlRegex,"");

	//remove banned words from the message
	const bannedWords = channelconfig[channelname].bannedWords;
	const bannedWordRegex = new RegExp(`\\b(${bannedWords.join('|')})\\b`, 'gi');
	//replace all banned words with nothing
	msg = msg.replace( bannedWordRegex, '');
	//remove all the extra spaces 
	msg = msg.replace(/\s+/g, ' ').trim();

	//If someone hits reply in the chat, the chat will automaticly add the targeted user as first word, starting with an @
	//If this is the case, remove the first word to check if the user used a command while using the reply feature.
	//this has to be after the emote section. If not, the position of the emotes would be wrong, because the original message has already been edited
	let recipient = null;
	if(msg.substr(0,1) === '@')
    {
		recipient = msg.substr(0, msg.indexOf(" "));
        msg = msg.substr(msg.indexOf(" ") + 1);
    }

	//If no command Prefix: handle autotranslation if enabled.
	if (msg.substr(0, 1) !== commandPrefix && msg.substr(0,1) !== jpcommandPrefix)  
	{
		//ignore empty messages.
		if(!msg.replace(/\s/g, '').length)
			return;

		//check if autotranslate is enabled
		if(!autotranslate)
			return;
		
		//check if user is on ignorelist 
		if(config.AutoTranslateIgnoredUserGlobal.includes(user.username))
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
		if(detectLang !== "jpn" && /^(?![A-Za-z ]{6})/.test(msg))
			return;

		Translator.translateToChat(target, recipient, encodeURIComponent(msg), targetLanguage);
		Stats.incrementCounter(target.substring(1), targetLanguage);
		
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
		//prevent command injection!
		if(inputtext.substr(0,1) === '!' || inputtext.substr(0,1) === '/')
		{
			logger.log(`INFO: Command injection found! ${user.username} tryed to use ${inputtext}!`);
			return;
		}
		hasParameter = true;
	}
	//Used to check if a user is a mod or not
	let isMod = user.mod || user['user-type'] === 'mod';
	let isBroadcaster = target.slice(1) === user.username; //check if user broadcaster by comparing current channel with the username of the sender
	let isModUp = isMod || isBroadcaster;

	let isBotOwner = user.username === config.Botowner; //twitch username of the botowner	

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
		else if(commandName === "joinchannel" && hasParameter) //adds the bot to some twitch channel
		{
			const userToJoin = getUsernameFromInput(inputtext); //no need for null check as client.join should go into catch.
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
		else if(commandName === "removechannel" && hasParameter) //removes the bot from a twitchchannel
		{
			const userToRemove = getUsernameFromInput(inputtext); //no need for null check as client.join should go into catch.
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
	//commands streamer + botowner
	if(isBroadcaster || isBotOwner)
	{
		if(commandName === 'automode' && hasParameter)
		{
			if(inputtext === 'off')
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
			else if (inputtext === 'on')
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
		else if(commandName === 'defaultlanguage' && hasParameter)
		{
			if(config.supportedLanguages.includes(inputtext))
			{
				client.say(target,`Changed default language to ${inputtext}`);
				channelconfig[channelname].defaultLanguage = inputtext;
				config.saveChannelConfig(channelconfig);
			}
			else
				client.say("Please provide a default language. (eng, jpn)");

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
		else if(commandName === 'ignoreuser' && hasParameter)
		{
			const userToIgnore = getUsernameFromInput(inputtext);
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
		else if(commandName == "banword" && hasParameter)
		{
			const bannedWords = channelconfig[channelname].bannedWords;
			const index = bannedWords.indexOf(inputtext);

			if(index !== -1)
			{
				bannedWords.splice(index, 1);
				client.say(target, `Removed "${inputtext}" from the banned words list.`);
				logger.log(`Removed ${inputtext} from the banned word list for ${target}`);
			}
			else
			{
				bannedWords.push(inputtext);
				client.say(target, `Added "${inputtext}" to the banned words list.`);
				logger.log(`Added ${inputtext} to the banned word list for ${target}`);
			}
			config.saveChannelConfig(channelconfig);
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
	else if((commandName === 'en' || commandName === '円') && hasParameter)
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
	else if (commandName === 'es' && hasParameter) 
	{
		try 
		{
			Translator.translateToChat(target,recipient,encodeURIComponent(inputtext),'ES');		
		} catch (error) 
		{
			logger.error('Error translating this message to Spanish: ' + inputtext);
			logger.error(error);
		}

		return;
	}
	else if (commandName === 'fr' && hasParameter) 
	{
		try 
		{
			Translator.translateToChat(target,recipient,encodeURIComponent(inputtext),'FR');		
		} catch (error) 
		{
			logger.error('Error translating this message to French: ' + inputtext);
			logger.error(error);
		}

		return;
	}
	else if(commandName === 'infoen')
	{
		let infoMsg = "Hey, my name is HanasuAI. I can translate messages for you! ";
		if(!autotranslate)
			infoMsg = infoMsg + "Just type !jp for Japanese translation or !en for English translation. I will automatically detect your input language.";
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
		let infoMsg = "やあ！私の名前は HanasuAI (話すエーアイ)です。";						
		if(!autotranslate)
			infoMsg = infoMsg + "あなたのためにメッセージを翻訳することができます。日本語の翻訳には「!jp」、英語の翻訳には「!en」と入力してください。入力された言語を自動的に検出します。";		
		else
			infoMsg = infoMsg + "現在、自動翻訳モードで動作しています。";	
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
			client.say(target, `This month I translated ${channelstats.toJP}x to Japanese 🇯🇵 and ${channelstats.toEN} times to English 🇺🇸 for ${target.substring(1)}.`);
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
			client.say(target, `This month I translated ${month.toJP}x into Japanese 🇯🇵 and ${month.toEN}x into English 🇺🇸. `+ 
								`Since I started counting, I have translated ${total.toJP}x to Japanese 🇯🇵 and ${total.toEN}x to English 🇺🇸.`);
		});
		return;
	}
	else if(commandName === 'jstatsg')
	{
		Stats.getStatsGlobal((month, total) => {
			client.say(target, `今月は、${month.toJP}xを日本語🇯🇵に、${month.toEN}xを英語🇺🇸に翻訳しました。 `+ 
								`数え始めてから${total.toJP}xを日本語🇯🇵に、${total.toEN}xを英語🇺🇸に翻訳しました。`);
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
