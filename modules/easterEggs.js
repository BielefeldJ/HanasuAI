const fs = require('fs');
const path = require('path');
const {logger} = require('./logger.js');

// Update the configPath to point to the config folder
const configPath = path.join(__dirname, '..', 'config', 'eastereggsconfig.json');
let config = {};

// Load config at startup
function loadConfig() 
{
	try 
	{
		const raw = fs.readFileSync(configPath, 'utf-8');
		config = JSON.parse(raw);
		if (!config.secretPhrases || !config.midMentionReplies || !config.userGreetings) 
		{
			throw new Error('Invalid config structure');
		}
		logger.log('EASTEREGG INFO: Loaded eastereggsconfig.json');
	} catch (e) 
	{
		logger.error('EASTEREGG ERR: Failed to load eastereggsconfig.json:', e);
		config = { secretPhrases: {}, midMentionReplies: [], userGreetings: {} };
	}
}
loadConfig();

function escapeRegex(str) 
{
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function checkSecretPhrase(message) 
{
	const normalized = message.toLowerCase().trim();
	for (const phrase in config.secretPhrases) 
	{
		const regex = new RegExp(`\\b${escapeRegex(phrase)}\\b`);
		if (regex.test(normalized)) 
		{
			const { responses, probability } = config.secretPhrases[phrase];
			if (Math.random() < probability) 
			{
				const randomIndex = Math.floor(Math.random() * responses.length);
				return responses[randomIndex];
			}
		}
	}
	return null;
}

function getMidMentionReply() 
{
	const replies = config.midMentionReplies || [];
	if (replies.length === 0) 
		return null;

	const i = Math.floor(Math.random() * replies.length);
	return replies[i];
}

const greetedToday = new Map(); // Format: { user: 'YYYY-MM-DD' }

function greetUser(user) 
{
	const greetings = (config.userGreetings || {})[user];
	if (!greetings) 
		return null;

	const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
	const lastGreeted = greetedToday.get(user);

	if (lastGreeted === today) 
		return;

	greetedToday.set(user, today);
	return greetings[Math.floor(Math.random() * greetings.length)];
}

module.exports = { checkSecretPhrase, getMidMentionReply, greetUser };
