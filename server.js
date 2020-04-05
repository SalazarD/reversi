
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


/*socket id register*/
var players = [];


var io = require('socket.io').listen(app);

io.sockets.on('connection', function(socket){
	log('Client connection by '+socket.id);

	function log(){
		var array = ['*** Server Log Message: '];
		for(var i = 0; i < arguments.length; i++){
			array.push(arguments[i]);
			console.log(arguments[i]);
		}
		socket.emit('log', array);
		socket.broadcast.emit('log', array);
	}
	
	
	
	socket.on('join_room', function(payload){
		log('\'join_room\' command'+ JSON.stringify(payload));

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
		/*check for username*/
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
		/* store new player data*/

		players[socket.id] = {};
		players[socket.id].username = username;
		players[socket.id].room = room;




		socket.join(room);

		var roomObject = io.sockets.adapter.rooms[room];
		
		/*tell everyone someone joined*/
		var numClients = roomObject.length;
		var success_data = {
			result: 'success',
			room: room,
			username: username,
			socket_id: socket.id,
			membership: numClients
		};
		io.in(room).emit('join_room_response', success_data);

		for(var socket_in_room in roomObject.sockets){
			var success_data = {
			result: 'success',
			room: room,
			username: players[socket_in_room].username,
			socket_id: socket_in_room,
			membership: numClients

			};
			socket.emit('join_room_response', success_data);
		}

		log('join_room success');




	});

	socket.on('disconnect', function(){
		log('Client disconnected '+JSON.stringify(players[socket.id]));
		if('undefined' !== typeof players[socket.id] && players[socket.id]){
			var username = players[socket.id].username;
			var room = players[socket.id].room;
			var payload = {
							username: username,
							socket_id: socket.id
			};
			delete players[socket.id];
			io.in(room).emit('player_disconnected', payload);
		}

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
		var username = players[socket.id].username;
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
		io.in(room).emit('send_message_response', success_data);
		log('Message sent to room '+ room + ' by '+ username);
	});


	//invite message handler

	socket.on('invite', function(payload){
		log('invite with '+ JSON.stringify(payload));
		//Check if a payload was sent
		if(('undefined' === typeof payload) || !payload){
			var error_message = 'invite had no payload, command aborted';
			log(error_message);
			socket.emit('invite_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}
		//check who the nessage traces to
		var username = players[socket.id].username;
		if(('undefined' === typeof username) || !username){
			var error_message = 'invite cant identify username, command aborted';
			log(error_message);
			socket.emit('invite_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}
		var requested_user = payload.requested_user;
		if(('undefined' === typeof requested_user) || !requested_user){
			var error_message = 'invite cant identify requested_user, command aborted';
			log(error_message);
			socket.emit('invite_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}

		var room = players[socket.id].room;
		var roomObject = io.sockets.adapter.rooms[room];
		//make sure user is inside the room
		if(!roomObject.sockets.hasOwnProperty(requested_user)){
			var error_message = 'invite requested user that wasnt in the room, command aborted';
			log(error_message);
			socket.emit('invite_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}

		//if ok then respond to inviter that it was success

		var success_data = {
			result: 'success',
			socket_id: requested_user
		};
		socket.emit('invite_response', success_data);

		//tell invitee they have been invited

		var success_data = {
			result: 'success',
			socket_id: socket.id
		};
		socket.to(requested_user).emit('invited', success_data);

		log('invite successful');

		
	});

	socket.on('uninvite', function(payload){
		log('uninvite with '+ JSON.stringify(payload));
		//Check if a payload was sent
		if(('undefined' === typeof payload) || !payload){
			var error_message = 'uninvite had no payload, command aborted';
			log(error_message);
			socket.emit('uninvite_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}
		//check who the nessage traces to
		var username = players[socket.id].username;
		if(('undefined' === typeof username) || !username){
			var error_message = 'uninvite cant identify username, command aborted';
			log(error_message);
			socket.emit('uninvite_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}
		var requested_user = payload.requested_user;
		if(('undefined' === typeof requested_user) || !requested_user){
			var error_message = 'uninvite cant identify requested_user, command aborted';
			log(error_message);
			socket.emit('uninvite_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}

		var room = players[socket.id].room;
		var roomObject = io.sockets.adapter.rooms[room];
		//make sure user is inside the room
		if(!roomObject.sockets.hasOwnProperty(requested_user)){
			var error_message = 'invite requested user that wasnt in the room, command aborted';
			log(error_message);
			socket.emit('invite_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}

		//if ok then respond to uninviter that it was success

		var success_data = {
			result: 'success',
			socket_id: requested_user
		};
		socket.emit('uninvite_response', success_data);

		//tell uninvitee they have been invited

		var success_data = {
			result: 'success',
			socket_id: socket.id
		};
		socket.to(requested_user).emit('uninvited', success_data);

		log('uninvite successful');

		
	});


	socket.on('game_start', function(payload){
		log('game_start with '+ JSON.stringify(payload));
		//Check if a payload was sent
		if(('undefined' === typeof payload) || !payload){
			var error_message = 'game_start had no payload, command aborted';
			log(error_message);
			socket.emit('game_start_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}
		//check who the nessage traces to
		var username = players[socket.id].username;
		if(('undefined' === typeof username) || !username){
			var error_message = 'game_start cant identify username, command aborted';
			log(error_message);
			socket.emit('game_start_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}
		var requested_user = payload.requested_user;
		if(('undefined' === typeof requested_user) || !requested_user){
			var error_message = 'game_start cant identify requested_user, command aborted';
			log(error_message);
			socket.emit('game_start_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}

		var room = players[socket.id].room;
		var roomObject = io.sockets.adapter.rooms[room];
		//make sure user is inside the room
		if(!roomObject.sockets.hasOwnProperty(requested_user)){
			var error_message = 'game_start requested user that wasnt in the room, command aborted';
			log(error_message);
			socket.emit('game_start_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}

		//if ok then respond to game_starter that it was success

var game_id = Math.floor((1+Math.random())*0x10000).toString(16).substring(1);
		var success_data = {
			result: 'success',
			socket_id: requested_user,
			game_id: game_id
		};
		socket.emit('game_start_response', success_data);

		//tell other player to play

		var success_data = {
			result: 'success',
			socket_id: socket.id,
			game_id: game_id
		};
		socket.to(requested_user).emit('game_start_response', success_data);

		log('game_start successful');

		
	});





});








