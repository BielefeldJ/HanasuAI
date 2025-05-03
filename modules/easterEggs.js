const secretPhrases = {
	"it's over 9000": { 
		responses: ["My language circuits are... OVER 9000!!", "Power levels are off the charts!"], 
		probability: 1.0 
	},
	"ping": { 
		responses: [".--. --- -. --. (Pong but in morse :P)", "Pong!"], 
		probability: 1.0 
	},
	"i'm sad": { 
		responses: ["Sending virtual hugs across all languages. 💖", "Cheer up! You're amazing! 🌟"], 
		probability: 1.0 
	},
	"wasn't able to identify the song": {
		responses: ["I’m not a music expert, but I can still dance! 💃", "Maybe it’s a secret song? 🤫", "You need a drink?"],
		probability: 0.1
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
	"Did you just summon me? I’m here to translate! ✨",
	"So this is how it feels to be mentiont... Interesting.",
];
			  
function getMidMentionReply() {
	const i = Math.floor(Math.random() * midMentionReplies.length);
	return midMentionReplies[i];
}

const userGreetings = {
	profbielefeld: ["Hey Prof <3", "There he is, my favorite creator ♥"],
	tuinkabouter1965: ["Hey Tuinkabouter! <3", "Oh welcome, Tuinkabouter! ♥"],
};
  
const greetedToday = new Map(); // Format: { user: 'YYYY-MM-DD' }
  
function greetUser(user) 
{
	const greetings = userGreetings[user];
	if (!greetings)
		return null;

	const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
	const lastGreeted = greetedToday.get(user);
  
	if (lastGreeted === today)
		return;
  
	greetedToday.set(user, today);
	return greetings[Math.floor(Math.random() * greetings.length)];  
}
  
module.exports = {checkSecretPhrase, getMidMentionReply, greetUser};
