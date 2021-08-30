# HanasiAI Chatbot for Twitch
HanasuAI is a bot for translating text messages using the deepl API. The bot automatically detects the language of the message and translates it into the language specified with the command. 

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/BielefeldJ/HanasuAI/blob/main/LICENSE)
[![tmi.js Version](https://img.shields.io/badge/tmi.js-1.8.3-success)](https://www.npmjs.org/package/tmi.js)


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

### Botowner ###
Command | Description | Usage
----------------|--------------|-------
`!shutdown` | Shutdown the bot | `!shutdown`
`!api`	| Sends API usage to chat | `!api`


List of requirements
-------------
* [tmi.js](https://github.com/tmijs/tmi.js)
* [DeeplAPI](https://www.deepl.com/pro?cta=header-prices/)
* process
* nodejs
    
