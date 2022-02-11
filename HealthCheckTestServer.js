//I use this script to test the healthcheck function of HanasuAI.
//this file is a modifyed example server from ipc-healthcheck
//you can find the example on how to use the server at https://github.com/BielefeldJ/ipc-healthcheck/blob/main/example-server.js 

const HealthcheckServer = require('ipc-healthcheck/healthcheck-server');
const healthcheckserver = new HealthcheckServer('twitchbots',100,1000 ,false);
healthcheckserver.on('serviceCrashed', (name) => {
	console.log('Service crashed: ' + name);
});
healthcheckserver.on('serviceNotify', (errmeg,service) => {
	console.log(`Service ${service.name} with id ${service.id} send the following error: ${errmeg}`);
});

//Starts the HealthcheckServer
healthcheckserver.startServer();

process.on('SIGINT', () => {
	//Stops the HealthcheckServer Server.
	healthcheckserver.stopServer();
	console.info('Shutdown example Server.');
  });

