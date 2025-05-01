const secretPhrases = {
    "it's over 9000": { response: "My language circuits are... OVER 9000!!", probability: 1.0 },
    "ping": { response: ".... . .-.. .-.. --- / .-- --- .-. .-.. -.. (Morse: Hello world)", probability: 1.0 },
    "i'm sad": { response: "Sending virtual hugs across all languages. 💖", probability: 1.0 }
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
            const { response, probability } = secretPhrases[phrase];
            if (Math.random() < probability) {
                return response;
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
