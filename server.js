/* Include the static file webserver library */
var static = require('node-static');

/* Include http server library */
var http = require('http');

/*Assume heroku*/
var port = process.env.PORT;
var directory = __dirname + '/public';

/* If no heroku, then change the port and directory*/
if(typeof port == 'undefined' || !port){
	directory = './public';
	port = 8080;
}

/* Setup static webserver for file delivery */
var file = new static.Server(directory);

/* Construct http server for getting files from file server */
var app = http.createServer(function(request, response){
		request.addListener('end',function(){
			file.serve(request,response);
			}
		).resume();
	}
).listen(port);

console.log('server is running');

