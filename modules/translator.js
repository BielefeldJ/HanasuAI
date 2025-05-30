const axios = require('axios');
const { logger } = require('./logger.js');

// This class holds functions for the Deepl API and sends answers directly to the chat client.
class Translator {
    constructor() {
        this.errorTimeout = false;
        this.client = null;
        this.APIKEY = null;
        this.URL = null;
        this.botowner = null;
    }

    setClient(client) {
        this.client = client;
        logger.log("TRANSLATOR INFO: Twitch client set.");
    }

    setAPIConfig(config) {
        this.APIKEY = config.apikey;
        this.URL = config.serviceUrl;
        logger.log("TRANSLATOR INFO: Deepl config set.");
    }

    setBotowner(botowner) {
        this.botowner = botowner;
        logger.log("TRANSLATOR INFO: Botowner set.");
    }

    // Translates given text and sends it to twitch chat
    translateToChat(target, recipient, inputtext, lang, italic) {
        const translateBody = JSON.stringify({
            "text": [ `${inputtext}` ],
            "target_lang": `${lang}`,
            "formality": "prefer_less",
            "preserve_formatting": true
        });

        this.sendAPIRequest("POST", "translate", translateBody)
            .then(translated => {
                if (translated.getstatusCode() === 200) {
                    let chatmessage = translated.answer();
                    if (recipient)
                        chatmessage = `${recipient} ${chatmessage}`;
                    const chatCommand = italic ? "/me " : "";
                    this.client.say(target, `${chatCommand}${chatmessage}`);
                } else if (translated.getstatusCode() === 456) {
                    let errmsg = `I reached my Cost Control limit. I am not allowed to translate anymore 😢. At least until the reset (7th of every month) or if @${this.botowner} increases my limit... I am sorry 🙇‍♀️`;
                    if (!this.errorTimeout) {
                        this.errorTimeout = true;
                        this.client.say(target, `${errmsg}`);
                        setTimeout(() => { this.errorTimeout = false; }, 600000); // 10 minutes
                    }
                    logger.error(errmsg);
                } else {
                    let errmsg = `Translate request Failed. Error Code: ${translated.getstatusCode()}`;
                    if (!this.errorTimeout) {
                        this.errorTimeout = true;
                        this.client.say(target, `${errmsg} Please send this message to @${this.botowner}.`);
                        setTimeout(() => { this.errorTimeout = false; }, 20000);
                    }
                    logger.error(errmsg);
                }
            });
    }

    // Sends the usage of the API to chat
    sendAPIUsageToChat(target) {
        this.sendAPIRequest("GET", "usage", null)
            .then(usage => {
                if (usage.getstatusCode() === 200) {
                    let statsMsg = `API usage this month ✏️📈 : ${usage.rawdata().character_count} out of 500000 characters used.`;
                    this.client.say(target, statsMsg);
                } else {
                    let errmsg = `Usage request Failed. Error Code: ${usage.getstatusCode()}`;
                    this.client.say(target, `${errmsg}`);
                    logger.error(errmsg);
                }
            });
    }

    // Sends the request to the API
    sendAPIRequest(method, path, body) {
        const requestOptions = {
            method: method,
            url: this.URL + path,
            headers: {
                "Authorization": `DeepL-Auth-Key ${this.APIKEY}`,
                "Content-Type": "application/json"
            },
            data: body
        };

        return axios(requestOptions)
            .then(response => {
                if (response.status === 200)
                    return new Translator.ApiData(response.data, response.status);
                else
                    return new Translator.ApiData(null, response.status);
            })
            .catch(error => {
                const status = error.response ? error.response.status : 500;
                logger.error("AXIOS ERROR: " + error);
                if (error.response && error.response.data)
                    logger.error("AXIOS ERROR: " + error.response.data);
                return new Translator.ApiData(null, status);
            });
    }
}

// Helper class for API responses
Translator.ApiData = function(apidata, statusCode) {
    this.resdata = apidata;
    this.statusCode = statusCode;
};

Translator.ApiData.prototype.rawdata = function () {
    return this.resdata;
};

Translator.ApiData.prototype.answer = function() {
    return this.resdata && this.resdata.translations && this.resdata.translations[0]
        ? this.resdata.translations[0].text
        : '';
};

Translator.ApiData.prototype.getstatusCode = function() {
    return this.statusCode;
};

module.exports = Translator;
