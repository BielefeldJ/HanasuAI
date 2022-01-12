const fs = require('fs');
const {LOGGING} = require('./config.js');

//check if logging to file is true
const out = LOGGING.enable ? [fs.createWriteStream(LOGGING.logfile), fs.createWriteStream(LOGGING.errlogfile)] : [process.stdout,process.stderr];
//create logger
const logger = new console.Console(out[0], out[1]);
require('console-stamp')(logger, {stdout: out[0], stderr: out[1]});	

module.exports={logger};