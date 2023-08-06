# HanasuAI Chatbot for Twitch
[HanasuAI](https://www.twitch.tv/hanasuai/about) is a bot for translating text messages using the deepl API. The bot automatically detects the language of the message and translates it into the language specified with the command. 
HanasuAI also has an auto-translating function. The bot translates every message into Japanese or English, depending on what language was used in the message.

[![tmi.js Version](https://img.shields.io/badge/tmi.js-1.8.3-success)](https://www.npmjs.org/package/tmi.js)

Install NodeJS
-------------
* Install nodejs 
* Download this repository 
* Rename example_config.json -> config.json; example_channelconfig.json -> channelconfig.json
* Edit config.json and channelconfig.json
* Run `node hanasuAI.js`

Install Docker
-------------
* Download / Copy the docker-compose.yml into a folder if your choice *recommended* 
* Create or copy the config.js and channelconfig.js into the same folder as the docker-compose.yml
* Edit both config files
* Run `docker compose up -d`

Commands List
-------------

### User ###

Command | Cescription | Usage
----------------|--------------|-------
`!stats` | Send the number of translations of the channel | `!stats`
`!jstats` | Send the number of translations of the channel in Japanese| `!jstats`
`!statsg` | Send the number of translations across all channel | `!statsg`
`!jstatsg` | Send the number of translations across all channel in Japanese | `!jstatsg`
`!infoen` | shows a "how to use" message in English | `!infoen`
`!infojp` | shows a "how to use" message in Japanese | `!infojp`
`!jp` | translate a text into Japanese | `!jp <text>`
`!en` | translate a text into English | `!en <text>`


### Mods ###
Command | Description | Usage
----------------|--------------|-------
`!hanasu` | A command to check if the bot is running + shows uptime | `!hanasu`

### Streamer ###
Command | Description | Usage
----------------|--------------|-------
`!automode` | enables or disables the auto-translation feature | `!automode on\|off`

### Botowner ###
Command | Description | Usage
----------------|--------------|-------
`!shutdown` | Shutdown the bot | `!shutdown`
`!api`	| Sends Deepl API usage to chat | `!api`
`!broadcast` | Sends a message to every channel that uses HanasuAI | `!broadcast <text>`
`!joinchannel` | Activates the bot on a twitch channel aka joins it | `!joinchannel <channelname>`
`!removechannel` | Removes the bot from a twitch channel | `!removechannel <channelname>`


Help 
-------------
* I get the message: "error: No response from Twitch."

If this is the case, either your TmiConf (oauth token in confog.json) is incorrect or you have a typo in your channel name. (channelconfig.json)

List of requirements
-------------
* [tmi.js](https://github.com/tmijs/tmi.js)
* [Deepl API](https://www.deepl.com/pro?cta=header-prices/)
* [node-schedule](https://github.com/node-schedule/node-schedule)
* fs
* https
* process
* nodejs
    
