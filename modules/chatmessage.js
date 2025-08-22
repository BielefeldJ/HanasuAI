class ChatMessage {

	#message;
	#commandPrefixes;
	#recipient;

	constructor(message, commandPrefixes) {
		this.#message = message;
		this.#commandPrefixes = commandPrefixes;
	}

	getMessage() 
	{
		return this.#message;
	}

	cleanMessage(bannedWords) 
	{
		this.#removeURLs();
		this.#removeBannedWords(bannedWords);
		this.#removeCommandPrefixes();
		//remove all the extra spaces 
		this.#message = this.#message.replace(/\s+/g, ' ').trim();
	}

	//remove banned words from the message
	#removeBannedWords(bannedWords)
	{
		if (bannedWords.length > 0)
		{
			const bannedWordRegex = new RegExp(`\\b(${bannedWords.join('|')})\\b`, 'gi');
			this.#message = this.#message.replace( bannedWordRegex, '');
		}
	}

	//remove URLs from the message
	#removeURLs()
	{
		const urlRegex = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[.\!\/\\w]*))?)/
		this.#message = this.#message.replace(urlRegex, '');
	}

	//remove command prefixes from the message
	#removeCommandPrefixes()
	{
		//if the message starts with a command prefix, remove the first word
		if(this.isCommand())
			this.#message = this.#message.substring(this.#message.indexOf(" ") +1);
	}

	//remove emotes from message, because they can mess up the translation. (Thanks to stefanjudis for this idea/example code on how to handle emotes)
	//This also prevents the bot from trying to translate messages, that are filled with emotes only.
	removeEmotes(emotes) 
	{
		// It also includes informations about the used emotes! Example emote [id, positions]: "425618": ["0-2"]
		if(!emotes) 
			return;

		//array to save all emotes that needs to be deleted later.
		var emotesToDelete=[];
		//iterate of emotes to find all positions 
		//using sequential loop to get all emotes.
		for(const positions of Object.values(emotes))
		{
			const position = positions[0]; //We only need the first position for every emote, as we can relpace all emotes of this kind
			const [start, end] = position.split("-");
			//using match(/./gu) to get unicode emojis as one character. Twitch sees these at 1 character. JS String not.
			//with this, I put all characters in an array, so the start and end positions are correct again.
			emotesToDelete.push(this.#message.match(/./gu).slice(parseInt(start),parseInt(end)+1).join(''));		
		}

		//replace all emotes with an empty string
		//using sequential loop to get all emotes. 
		for(let emote of emotesToDelete){			
			//NodeJS doesn't know replaceAll. So we need to use Regex. 	
			//escape special character as some of them are used in emotes like ":)" or ":("	
			this.#message = this.#message.replace(new RegExp(emote.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),'');
		};
	}

	getRecipient() 
	{
		const tagIndex = this.#message.indexOf('@');

		if(tagIndex === 0)
		{
			const firstSpaceIndex = this.#message.indexOf(' ');
			this.#recipient = firstSpaceIndex !== -1 ? this.#message.substring(tagIndex, firstSpaceIndex) : this.#message;
			this.#message = firstSpaceIndex !== -1 ? this.#message.substring(firstSpaceIndex + 1) : '';
		}

		return this.#recipient;
	}
	
	isCommand() 
	{
		// Valid commands start with !
		return this.#commandPrefixes.includes(this.#message.charAt(0));
	}

	createCommand()
	{
		const command = {
			commandName: "",
			inputtext: "",
			hasParameter: false,
			recipient : null
		};

		command.recipient = this.getRecipient(); //get the recipient of the message if there is one

		const spaceIndex = this.#message.indexOf(" ");

		//used to check if the user send parameter
		if(spaceIndex < 0)
		{
			command.commandName = this.#message.slice(1).toLowerCase();
			command.hasParameter = false;
		}
		else
		{
			// The command name is the first substring one and remove the !:
			command.commandName = this.#message.substring(1, spaceIndex).toLowerCase();
			//The message that should be translated and remove the first space 
			command.inputtext = this.#message.substring(spaceIndex +1);
			command.hasParameter = true;					
		}
		
		return command;
	}
}

module.exports = ChatMessage;