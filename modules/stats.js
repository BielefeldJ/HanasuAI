const config = require('../config/config');
const fs = require('fs');
const schedule = require('node-schedule');
const {logger} = require('./logger.js');

const STATSPATH = 'stats/'

//Module to save stats per channel and global
var Statistics = {};

// Builds a map from language code -> counter key name
// e.g. { 'JA': 'toJP', 'EN-US': 'toEN', 'ES': 'toES', 'FR': 'toFR' }
function getCounterKeyMap() {
	const map = {};
	for (const [cmdKey, langCode] of Object.entries(config.commandLanguageMappings)) 
	{
		if (!map[langCode] && /^[a-zA-Z]+$/.test(cmdKey)) 
			map[langCode] = 'to' + cmdKey.toUpperCase();		
	}
	return map;
}

//function creates a new statsobject for a given channel
Statistics.addChannelToStatsData = (channel) => {
	let statsobject = { channel : channel };

	for (const key of Object.values(getCounterKeyMap())) 
	{
		statsobject[key] = 0;
	}
	
	Statistics.statsdata.channellist.push(channel);
	Statistics.statsdata.perChannel.push(statsobject);
};


//==============================================================
//write stats to file
Statistics.writeStatsToFileSync = () =>
{
	let data = JSON.stringify(Statistics.statsdata, null, 2);
	try{
		fs.writeFileSync(STATSPATH + config.StatisticsFile, data)
	}
	catch(err)
	{
		logger.error('ERROR WRITING TO STATSFILE SYNC' + err);
	}
}
Statistics.writeStatsToFileAsync = () =>
{
	let data = JSON.stringify(Statistics.statsdata, null, 2);
	fs.writeFile(STATSPATH + config.StatisticsFile, data, (err) => {
		if (err) logger.error('ERROR WRITING TO STATSFILE ASYNC' + err);
	});	
}
//==============================================================

//init function checks if stats file already exists.
//if yes, read file and check for missing channel
//if no, create stats object based on channel listed in configfile.
function initStats()
{
	try
	{
		let data = fs.readFileSync(STATSPATH + config.StatisticsFile); //read stats file
		Statistics.statsdata = JSON.parse(data);
		//check if there are stats for a channel, thats not in the config anymore, remove object, if not in config
		const counterKeyMap = getCounterKeyMap();
		Statistics.statsdata.perChannel.forEach(channelstats => {			
			if (!config.tmiconf.channels.includes(channelstats.channel)) 
			{
				logger.log('INFO STATS INIT: Removing Channel ' + channelstats.channel + ' becaust its is not in config anymore.')
				let index = Statistics.statsdata.perChannel.indexOf(channelstats);
				if (index > -1)
					Statistics.statsdata.perChannel.splice(index, 1);

				index = Statistics.statsdata.channellist.indexOf(channelstats.channel);
				if (index > -1)
					Statistics.statsdata.channellist.splice(index, 1);
			} else {
				// ensure existing channel stats have all counter keys 
				for (const key of Object.values(counterKeyMap)) 
				{

					if (channelstats[key] === undefined) 
						channelstats[key] = 0;
				}				
			}		
		});
		// ensure Month and Total have all counter keys 
		for (const key of Object.values(counterKeyMap)) 
		{
			if (Statistics.statsdata.Month[key] === undefined) 
				Statistics.statsdata.Month[key] = 0;

			if (Statistics.statsdata.Total[key] === undefined) 
				Statistics.statsdata.Total[key] = 0;
		}
		//checks if channel given in config already have a stats object. If not, create one
		config.tmiconf.channels.forEach(channel => {
			if(!Statistics.statsdata.channellist.includes(channel))
			{	
				logger.log('INFO STATS INIT: Adding ' + channel + ' becaust it does not have stats yet.');
				Statistics.addChannelToStatsData(channel);
			}
		});
		//write new Statsobject to file;
		Statistics.writeStatsToFileSync();
		logger.log('INFO STATS INIT: Load complete.')
		return;
	}
	catch(err)
	{
		//if no file found, init statsdata and add channels from config.
		if(err.code === 'ENOENT')
		{
			logger.log('INFO STATS INIT: No stats file found. Creating one.')
			//create empty StatsData object
			const counterKeyMap = getCounterKeyMap();
			const monthObj = {};
			const totalObj = {};
			for (const key of Object.values(counterKeyMap)) 
			{
				monthObj[key] = 0;
				totalObj[key] = 0;
			}

			Statistics.statsdata = {
				channellist : [],
				perChannel : [],
				Month : monthObj,
				Total : totalObj
			}
			//add all channels from config
			config.tmiconf.channels.forEach(channel => {
				Statistics.addChannelToStatsData(channel);
			});
			//write to file.
			Statistics.writeStatsToFileSync();
			logger.log('INFO STATS INIT: Load complete.')
			return;
		}
		else
			logger.error('ERROR INIT STATS MODULE: ' + err)
	}
}

//call init function
initStats();

//funcion to increment the counter for the channel this function got called and its given language
//target = channel the command was used on
//lang = language of which counter should be counted
Statistics.incrementCounter = (target, lang) => {
	const counterKeyMap = getCounterKeyMap();
	const counterKey = counterKeyMap[lang];
	if (!counterKey) 
	{
		logger.log('STATS INFO: No counter key found for language: ' + lang);
		return;
	}
	Statistics.getChannelStats(target, channelstats =>	{
		channelstats[counterKey] = (channelstats[counterKey] || 0) + 1;
		Statistics.statsdata.Month[counterKey] = (Statistics.statsdata.Month[counterKey] || 0) + 1;
		Statistics.statsdata.Total[counterKey] = (Statistics.statsdata.Total[counterKey] || 0) + 1;
	});
	Statistics.writeStatsToFileAsync();
}

//returns the Statistics for a given channel from the statsdata object
Statistics.getChannelStats = (channelname, callback) => {
	Statistics.statsdata.perChannel.forEach(channelstats => {
		if(channelstats.channel === channelname)
			callback(channelstats);
	});
}

Statistics.getStatsGlobal = (callback) => {
	callback(Statistics.statsdata.Month,Statistics.statsdata.Total)
}

//function reserts the counter of every channel and the stats of the month
Statistics.resetChannelStats = () => {
	const counterKeyMap = getCounterKeyMap();
	//reset on every channel
	Statistics.statsdata.perChannel.forEach(channel => {
		for (const key of Object.values(counterKeyMap)) 
		{
			channel[key] = 0;
		}
	});
	//reset Month
	for (const key of Object.values(counterKeyMap)) 
	{
		Statistics.statsdata.Month[key] = 0;
	}
}

//This function will be executed every 1. day of the month based on the time zone, this bot is running
schedule.scheduleJob('0 0 1 * *', () => {
	var date = new Date();
	date.setDate(date.getDate() - 1); 
	date = date.toISOString().split('T')[0].split('-');
	var newname = STATSPATH + date[0] + '-' + date[1] + '-' + config.StatisticsFile;
	fs.renameSync(STATSPATH + config.StatisticsFile,newname);
	Statistics.resetChannelStats();
	Statistics.writeStatsToFileSync();
	logger.log('STATS INFO: Monthly counter reset triggered.')
});

module.exports = Statistics;