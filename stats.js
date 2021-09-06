const config = require('./config');
const fs = require('fs');
const schedule = require('node-schedule');

//Module to save stats per channel and global
var Statistics = {};

//function creates a new statsobject for a given channel
Statistics.addChannelToStatsData = (channel) => {
	let statsobject = {
		channel : channel,
		toJP : 0,
		toEN : 0,
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
		fs.writeFileSync(config.StatisticsFile, data)
	}
	catch(err)
	{
		console.err('ERROR WRITING TO STATSFILE SYNC' + err);
	}
}
Statistics.writeStatsToFileAsync = () =>
{
	let data = JSON.stringify(Statistics.statsdata, null, 2);
	fs.writeFile(config.StatisticsFile, data, (err) => {
		if (err) console.err('ERROR WRITING TO STATSFILE ASYNC' + err);;
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
		let data = fs.readFileSync(config.StatisticsFile); //read stats file
		Statistics.statsdata = JSON.parse(data);
		//check if there are stats for a channel, thats not in the config anymore, remove object, if not in config
		Statistics.statsdata.perChannel.forEach(channelstats => {			
			if (!config.tmiconf.channels.includes(channelstats.channel)) 
			{
				console.log('INFO STATS INIT: Removing Channel' + channelstats.channel + ' becaust its is not in config anymore.')
				let index = Statistics.statsdata.perChannel.indexOf(channelstats);
				if (index > -1)
					Statistics.statsdata.perChannel.splice(index, 1);

				index = Statistics.statsdata.channellist.indexOf(channelstats.channel);
				if (index > -1)
					Statistics.statsdata.channellist.splice(index, 1);
			}		
		});
		//checks if channel given in config already have a stats object. If not, create one
		config.tmiconf.channels.forEach(channel => {
			if(!Statistics.statsdata.channellist.includes(channel))
			{	
				console.log('INFO STATS INIT: Adding ' + channel + ' becaust it does not have stats yet.');
				Statistics.addChannelToStatsData(channel);
			}
		});
		//write new Statsobject to file;
		Statistics.writeStatsToFileSync();
		console.log('INFO STATS INIT: Load complete.')
		return;
	}
	catch(err)
	{
		//if no file found, init statsdata and add channels from config.
		if(err.code === 'ENOENT')
		{
			console.log('INFO STATS INIT: No stats file found. Creating one.')
			//create empty StatsData object
			Statistics.statsdata = {
				channellist : [],
				perChannel : [],
				Month : {
					toJP : 0,
					toEN : 0
				},
				Total : {
					toJP : 0,
					toEN : 0,
				}
			}
			//add all channels from config
			config.tmiconf.channels.forEach(channel => {
				Statistics.addChannelToStatsData(channel);
			});
			//write to file.
			Statistics.writeStatsToFileSync();
			console.log('INFO STATS INIT: Load complete.')
			return;
		}
		else
			console.error('ERROR INIT STATS MODULE: ' + err)
	}
}

//call init function
initStats();

//funcion to increment the counter for the channel this function got called and its given language
//target = channel the command was used on
//lang = language of wich counter should be counted
Statistics.incrementCounter = (target, lang) => {
	Statistics.getChannelStats(target, channelstats =>	{
		switch(lang)
		{
			case 'JA':
				channelstats.toJP++;
				Statistics.statsdata.Month.toJP++;
				Statistics.statsdata.Total.toJP++;
				break;
			case 'EN-US': 
				channelstats.toEN++;
				Statistics.statsdata.Month.toEN++;
				Statistics.statsdata.Total.toEN++;
				break;
		}
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
	//reset on every channel
	Statistics.statsdata.perChannel.forEach(channel => {
		channel.toEN = 0;
		channel.toJP = 0;
	});
	//reset Month
	Statistics.statsdata.Month.toJP = 0;
	Statistics.statsdata.Month.toEN = 0;
}

//This function will be executed every 1. day of the month based on the time zone, this bot is running
schedule.scheduleJob('0 0 1 * *', () => {
	Statistics.resetChannelStats();
  });

module.exports = Statistics;