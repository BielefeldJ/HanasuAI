const secretPhrases = {
	"it's over 9000": { 
		responses: ["My language circuits are... OVER 9000!!", "Power levels are off the charts!"], 
		probability: 1.0 
	},
	"ping": { 
		responses: [".... . .-.. .-.. --- / .-- --- .-. .-.. -.. (Morse: Hello world)", "Pong!"], 
		probability: 1.0 
	},
	"i'm sad": { 
		responses: ["Sending virtual hugs across all languages. 💖", "Cheer up! You're amazing! 🌟"], 
		probability: 1.0 
	},
	"I wasn't able to identify the song.": {
		responses: ["I’m not a music expert, but I can still dance! 💃", "Maybe it’s a secret song? 🤫", "You need a drink?"],
		probability: 0.2
	}
};

function checkSecretPhrase(message) 
{
	const normalized = message.toLowerCase().trim();
	for (const phrase in secretPhrases) 
	{
		if (RegExp(`\\b${phrase}\\b`).test(normalized)) 
		{
			const { responses, probability } = secretPhrases[phrase];
			if (Math.random() < probability) 
			{
				const randomIndex = Math.floor(Math.random() * responses.length);
				return responses[randomIndex];
			}
		}
	}
	return null;
}
			
const midMentionReplies = [
	"Heeey! You talking to me? :3",
	"I'm always listening... 👀",
	"You rang, hooman? 😏",
	"Did someone whisper my name? 😏",
	"Hmph. I *guess* I’ll respond since you asked nicely.",
	"Did you say something? I was busy being awesome.",
	"Did you just call me? I’m flattered! 💖",
	"Did you need something? I’m all ears! 👂",
	"Did you just summon me? I’m here to translate! ✨"
];
			  
function getMidMentionReply() {
	const i = Math.floor(Math.random() * midMentionReplies.length);
	return midMentionReplies[i];
}
  
module.exports = {checkSecretPhrase, getMidMentionReply};
