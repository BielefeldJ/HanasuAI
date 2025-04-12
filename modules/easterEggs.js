
const secretPhrases = {
	"it's over 9000": "My language circuits are... OVER 9000!!",
	"ping": ".... . .-.. .-.. --- / .-- --- .-. .-.. -.. (Morse: Hello world)",
	"i'm sad": "Sending virtual hugs across all languages. 💖"
};

const midMentionReplies = [
	"Heeey! You talking to me? :3",
	"I'm always listening... 👀",
	"You rang, hooman? 😏",
	"Did someone whisper my name? 😏",
	"Hmph. I *guess* I’ll respond since you asked nicely.",
	"Did you say something? I was busy being awesome."
];
  
function checkSecretPhrase(message) 
{
	const normalized = message.toLowerCase().trim();
	for (const phrase in secretPhrases) 
	{
		if (normalized.includes(phrase))
			return secretPhrases[phrase];
	}
	return null;
}

function getMidMentionReply() {
	const i = Math.floor(Math.random() * midMentionReplies.length);
	return midMentionReplies[i];
}
  
module.exports = {checkSecretPhrase, getMidMentionReply};
  