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
    }
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
        if (RegExp(`\\b${phrase}\\b`).test(normalized)) {
            const { responses, probability } = secretPhrases[phrase];
            if (Math.random() < probability) {
                const randomIndex = Math.floor(Math.random() * responses.length);
                return responses[randomIndex];
            }
        }
    }
    return null;
}

function getMidMentionReply() {
    const i = Math.floor(Math.random() * midMentionReplies.length);
    return midMentionReplies[i];
}
  
module.exports = {checkSecretPhrase, getMidMentionReply};
