const axios = require('axios');
const { logger } = require('./logger.js');

// This class holds functions for the Microsoft Azure Translator API and sends answers directly to the chat client.
class AzureTranslator {
    constructor() {
        this.errorTimeout = false;
        this.client = null;
        this.APIKEY = null;
        this.ENDPOINT = null;
        this.REGION = null;
        this.botowner = null;
    }

    setClient(client) {
        this.client = client;
        logger.log("AZURE TRANSLATOR INFO: Twitch client set.");
    }

    setAPIConfig(config) {
        this.APIKEY = config.apikey;
        this.ENDPOINT = config.endpoint;
        this.REGION = config.region;
        logger.log("AZURE TRANSLATOR INFO: Azure config set.");
    }

    setBotowner(botowner) {
        this.botowner = botowner;
        logger.log("AZURE TRANSLATOR INFO: Botowner set.");
    }

    // Translates given text and sends it to twitch chat
    async translateToChat(target, recipient, inputtext, lang, italic) {
        try {
            const translation = await this.sendAPIRequest(inputtext, lang);
            if (translation && translation.text) {
                const chatCommand = italic ? "/me " : "";
                this.client.say(target, `${chatCommand}${translation.text}`);
            } else {
                let errmsg = `Azure Translate request failed.`;
                if (!this.errorTimeout) {
                    this.errorTimeout = true;
                    this.client.say(target, `${errmsg} Please send this message to @${this.botowner}.`);
                    setTimeout(() => { this.errorTimeout = false; }, 20000);
                }
                logger.error(errmsg);
            }
        } catch (error) {
            let errmsg = `Azure Translate request failed: ${error.message}`;
            if (!this.errorTimeout) {
                this.errorTimeout = true;
                this.client.say(target, `${errmsg} Please send this message to @${this.botowner}.`);
                setTimeout(() => { this.errorTimeout = false; }, 20000);
            }
            logger.error(errmsg);
        }
    }

    // Sends the request to the Azure Translator API
    async sendAPIRequest(text, toLang) {
        const url = `${this.ENDPOINT}/translate?api-version=3.0&to=${toLang}`;
        const headers = {
            'Ocp-Apim-Subscription-Key': this.APIKEY,
            'Ocp-Apim-Subscription-Region': this.REGION,
            'Content-type': 'application/json',
        };
        const body = [{ Text: text }];
        try {
            const response = await axios.post(url, body, { headers });
            if (response.status === 200 && response.data && response.data[0] && response.data[0].translations[0]) {
                return { text: response.data[0].translations[0].text };
            } else {
                logger.error("AZURE TRANSLATOR ERROR: Unexpected response format.");
                return null;
            }
        } catch (error) {
            logger.error("AZURE TRANSLATOR AXIOS ERROR: " + error);
            return null;
        }
    }
}

module.exports = AzureTranslator;
