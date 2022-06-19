const out = [process.stdout,process.stderr];
//create logger
const logger = new console.Console(out[0], out[1]);
require('console-stamp')(logger, {stdout: out[0], stderr: out[1]});	

module.exports={logger};