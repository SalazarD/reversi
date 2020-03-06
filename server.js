
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


/*SETUP WEBSOCKET*/

var io = require('socket.io').listen(app);

io.sockets.on('connection', function(socket){
	function log(){
		var array = ['*** Server Log Message: '];
		for(var i = 0; i < arguments.length; i++){
			array.push(arguments[i]);
			console.log(arguments[i]);
		}
		socket.emit('log', array);
		socket.broadcast.emit('log', array);
	}
	
	log('A web site has connected to the server');
	
	socket.on('disconnect', function(socket){
		log('A web site has disconnected from the server');
	});
	socket.on('join_room', function(payload){
		log('server recieved a command', 'join_room',payload);
		if(('undefined' === typeof payload) || !payload){
			var error_message = 'join_room had no payload, command aborted';
			log(error_message);
			socket.emit('join_room_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}
		var room = payload.room;
		if(('undefined' === typeof room) || !room){
			var error_message = 'join_room had no room, command aborted';
			log(error_message);
			socket.emit('join_room_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}
		var username = payload.username;
		if(('undefined' === typeof username) || !username){
			var error_message = 'join_room had no username, command aborted';
			log(error_message);
			socket.emit('join_room_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}

		socket.join(room);

		var roomObject = io.sockets.adapter.rooms[room];
		if(('undefined' === typeof roomObject) || !roomObject){
			var error_message = 'join_room could not create room, command aborted';
			log(error_message);
			socket.emit('join_room_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}

		var numClients = roomObject.length;
		var success_data = {
			result: 'success',
			room: room,
			username: username,
			membership: (numClients + 1)
		};
		io.sockets.in(room).emit('join_room_response', success_data);
		log('Room ' + room + ' was just joined by ' + username);



	});

	socket.on('send_message', function(payload){
		log('server recieved a command', 'send_ message',payload);
		if(('undefined' === typeof payload) || !payload){
			var error_message = 'send_message had no payload, command aborted';
			log(error_message);
			socket.emit('send_message_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}
		var room = payload.room;
		if(('undefined' === typeof room) || !room){
			var error_message = 'send_message had no room, command aborted';
			log(error_message);
			socket.emit('send_message_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}
		var username = payload.username;
		if(('undefined' === typeof username) || !username){
			var error_message = 'send_message had no username, command aborted';
			log(error_message);
			socket.emit('send_message_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}
		var message = payload.message;
		if(('undefined' === typeof message) || !message){
			var error_message = 'send_message had no username, command aborted';
			log(error_message);
			socket.emit('send_message_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}

		var success_data = {
			result: 'success',
			room: room,
			username: username,
			message: message
		};
		io.sockets.in(room).emit('send_message_response', success_data);
		log('Message sent to room '+ room + ' by '+ username);
	});





});








