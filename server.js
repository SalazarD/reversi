
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

		if(room !== 'lobby'){
			send_game_update(socket, room, 'initial update');
		}




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




	socket.on('play_token', function(payload){
		log('play_token with '+ JSON.stringify(payload));
		//Check if a payload was sent
		if(('undefined' === typeof payload) || !payload){
			var error_message = 'play_token had no payload, command aborted';
			log(error_message);
			socket.emit('play_token_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}
		//check who the nessage traces to
		var player = players[socket.id];
		if(('undefined' === typeof player) || !player){
			var error_message = 'server does not recognize you, command aborted';
			log(error_message);
			socket.emit('play_token_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}

		var username = players[socket.id].username;
		if(('undefined' === typeof username) || !username){
			var error_message = 'play_token cant identify message sender, command aborted';
			log(error_message);
			socket.emit('play_token_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}
		var game_id = players[socket.id].room;
		if(('undefined' === typeof game_id) || !game_id){
			var error_message = 'play_token cant find game board, command aborted';
			log(error_message);
			socket.emit('play_token_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}
		var row = payload.row;
		if(('undefined' === typeof row) || row < 0 || row > 7){
			var error_message = 'play_token did not specify a valid row, command aborted';
			log(error_message);
			socket.emit('play_token_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}
		var column = payload.column;
		if(('undefined' === typeof column) || column < 0 || column > 7){
			var error_message = 'play_token did not specify a valid column, command aborted';
			log(error_message);
			socket.emit('play_token_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}
		var color = payload.color;
		if(('undefined' === typeof color) || !color || (color != 'white' && color != 'black')){
			var error_message = 'play_token did not specify a valid color, command aborted';
			log(error_message);
			socket.emit('play_token_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}
		var game = games[game_id];
		if(('undefined' === typeof game) || !game){
			var error_message = 'play_token did not specify a valid game, command aborted';
			log(error_message);
			socket.emit('play_token_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}

		/*if playting out of order*/
		if(color !== game.whose_turn){
			var error_message = 'play_token message played out of turn, command aborted';
			log(error_message);
			socket.emit('play_token_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}
		/*if wrong socket is playing the color*/
		if((game.whose_turn === 'white') && (game.player_white.socket != socket.id) &&
		   (game.whose_turn === 'black') && (game.player_black.socket != socket.id))  {
			var error_message = 'play_token message played out of turn, command aborted';
			log(error_message);
			socket.emit('play_token_response', {
				result: 'fail',
				message: error_message
				});
			return;
		}

		var success_data = {
			result: 'success'
		};
			socket.emit('play_token_response', success_data);
		
		/* execute the move*/

		if(color == 'white'){
			game.board[row][column] ='w';
			flip_board('w', row, column, game.board);
			game.whose_turn = 'black';
			game.legal_moves = calculate_valid_moves('b',game.board);
		}
		else if(color == 'black'){
			game.board[row][column] ='b';
			flip_board('b', row, column, game.board);
			game.whose_turn = 'white';
			game.legal_moves = calculate_valid_moves('w',game.board);

		}

		var d = new Date();
		game.last_move_time = d.getTime();

		send_game_update(socket,game_id, 'played a token');

	});

});







/*******************************/
/* Code for game state*/

var games =[];


function create_new_game(){
	var new_game = {};
	new_game.player_white ={};
	new_game.player_black ={};
	new_game.player_white.socket ='';
	new_game.player_black.socket ='';
	new_game.player_white.username ='';
	new_game.player_black.username ='';

	var d = new Date();
	new_game.last_move_time = d.getTime();
	new_game.whose_turn = 'black';
	
	new_game.board=[
		[' ', ' ',' ',' ',' ',' ',' ',' '],
		[' ', ' ',' ',' ',' ',' ',' ',' '],
		[' ', ' ',' ',' ',' ',' ',' ',' '],
		[' ', ' ',' ','w','b',' ',' ',' '],
		[' ', ' ',' ','b','w',' ',' ',' '],
		[' ', ' ',' ',' ',' ',' ',' ',' '],
		[' ', ' ',' ',' ',' ',' ',' ',' '],
		[' ', ' ',' ',' ',' ',' ',' ',' ']
		

	];

	new_game.legal_moves = calculate_valid_moves('b', new_game.board);

	return new_game;

}

/* check if there is a color 'who' on the line starting at r,c or anywhere further by adding dr and dc to r,c */

function check_line_match(who,dr,dc,r,c,board){
	if(board[r][c] === who){
		return true;
	}
	if(board[r][c] === ' '){
		return false;
	}
	if((r+dr < 0) || (r+dr > 7)){
		return false;
	}
	if((c+dc < 0) || (c+dc > 7)){
		return false;
	}
	return check_line_match(who,dr,dc,r+dr,c+dc, board);

}



/* check if r, c contains the opposite of 'who' and if the line indicated by adding dr to r and dc to c ends in the who color*/

function valid_move(who, dr, dc, r, c, board){
	var other;
	if(who === 'b'){
		other = 'w';
	}
	else if(who === 'w'){
		other = 'b';
	}
	else{
		log('Houston we have a color problem: '+who);
	}
	if((r+dr < 0) || (r+dr > 7)){
		return false;
	}
	if((c+dc < 0) || (c+dc > 7)){
		return false;
	}
	if(board[r+dr][c+dc]!=other){
		return false;
	}
	if((r+dr+dr< 0) || (r+dr+dr > 7)){
		return false;
	}
	if((c+dc+dc < 0) || (c+dc+dc > 7)){
		return false;
	}
	return(check_line_match(who,dr,dc,r+dr+dr,c+dc+dc, board));
}


function calculate_valid_moves(who, board){
	var valid = [
		[' ', ' ',' ',' ',' ',' ',' ',' '],
		[' ', ' ',' ',' ',' ',' ',' ',' '],
		[' ', ' ',' ',' ',' ',' ',' ',' '],
		[' ', ' ',' ',' ',' ',' ',' ',' '],
		[' ', ' ',' ',' ',' ',' ',' ',' '],
		[' ', ' ',' ',' ',' ',' ',' ',' '],
		[' ', ' ',' ',' ',' ',' ',' ',' '],
		[' ', ' ',' ',' ',' ',' ',' ',' ']
		];

	for(var row = 0; row < 8; row++){
		for(var column = 0; column < 8; column++){
			if(board[row][column] === ' '){
				nw = valid_move(who, -1, -1, row, column, board);
				nn = valid_move(who, -1,  0, row, column, board);
				ne = valid_move(who, -1,  1, row, column, board);
				ww = valid_move(who,  0, -1, row, column, board);
				ee = valid_move(who,  0,  1, row, column, board);
				sw = valid_move(who,  1, -1, row, column, board);
				ss = valid_move(who,  1,  0, row, column, board);
				se = valid_move(who,  1,  1, row, column, board);

				if(nw || nn || ne || ww || ee || sw || ss || se){
					valid[row][column] = who;
				}
			}
		}
	}
	return valid;
}



function flip_line(who, dr, dc, r, c, board){

	if((r+dr < 0) || (r+dr > 7)){
		return false;
	}
	if((c+dc < 0) || (c+dc > 7)){
		return false;
	}
	if(board[r+dr][c+dc]=== ' '){
		return false;
	}
	if(board[r+dr][c+dc]=== who){
		return true;
	}
	else{
		if(flip_line(who,dr,dc,r+dr,c+dc,board)){
			board[r+dr][c+dc] = who;
			return true;
		}
		else{
			return false;
		}
	}

}


function flip_board(who, row, column, board){
	flip_line(who, -1, -1, row, column, board);
	flip_line(who, -1,  0, row, column, board);
	flip_line(who, -1,  1, row, column, board);
	flip_line(who,  0, -1, row, column, board);
	flip_line(who,  0,  1, row, column, board);
	flip_line(who,  1, -1, row, column, board);
	flip_line(who,  1,  0, row, column, board);
	flip_line(who,  1,  1, row, column, board);
}








function send_game_update(socket, game_id, message){
	
	/*check to see if the game already exists*/

	if(('undefined'=== typeof games|[game_id]) || !games[game_id]){
		/*no game exists yet*/
		console.log('no game exists. Creating '+game_id+' for ' + socket.id);
		games[game_id] = create_new_game();
	}


	/* make sure it is only two people */

var roomObject;
var numClients;
do{
	roomObject = io.sockets.adapter.rooms[game_id];
	numClients = roomObject.length;
	if(numClients > 2){
		console.log('too many clients in room: '+game_id+' #: ' +numClients);
		if(games[game_id].player_white.socket == roomObject.sockets[0]){
			games[game_id].player_white.socket = '';
			games[game_id].player_white.username = '';
		}
		if(games[game_id].player_black.socket == roomObject.sockets[0]){
			games[game_id].player_black.socket = '';
			games[game_id].player_black.username = '';
		}
		/* kick one of the extra sockets */
		var sacrifice = Object.keys(roomObject.sockets)[0];
		io.of('/').connected[sacrifice].leave(game_id);

		

	}
}
while((numClients-1) > 2);

	/* assign this socket a color */
	if((games[game_id].player_white.socket != socket.id) && (games[game_id].player_black.socket != socket.id)){
		console.log('Player is not assigned a color: '+socket.id);
		/*if there is not a color to give*/
		if((games[game_id].player_white.socket != '') && (games[game_id].player_black.socket != '')){
			games[game_id].player_white.socket = '';
			games[game_id].player_black.socket = '';
			games[game_id].player_white.username = '';
			games[game_id].player_black.username = '';
		}
	}

	if(games[game_id].player_white.socket == ''){
		if(games[game_id].player_black.socket != socket.id){
			games[game_id].player_white.socket = socket.id;
			games[game_id].player_white.username = players[socket.id].username;
		}
	}
	if(games[game_id].player_black.socket == ''){
		if(games[game_id].player_white.socket != socket.id){
			games[game_id].player_black.socket = socket.id;
			games[game_id].player_black.username = players[socket.id].username;
		}
	}



	/* send game update */

	var success_data = {
		result: 'success',
		game: games[game_id],
		message: message,
		game_id: game_id
	};

	io.in(game_id).emit('game_update', success_data);
	

	/*check to see if the game is over*/
	var row,column;
	var count = 0;
	var black = 0;
	var white = 0;
	for (row =0; row < 8; row++){
		for (column =0; column < 8; column++){
			if(games[game_id].legal_moves[row][column] != ' '){
				count++;
			}
			if(games[game_id].board[row][column] === 'b'){
				black++;
			}
			if(games[game_id].board[row][column] === 'w'){
				white++;
			}
		}

	}

	if (count == 0){
		/* send game over*/
		var winner = 'tie game';
		if(black > white){
			winner = 'black';
		}
		if(black < white){
			winner = 'white';
		}
		var success_data = {
			result: 'success',
			game: games[game_id],
			who_won: winner,
			game_id: game_id
		};
		io.in(game_id).emit('game_over', success_data);
		/* remove old games after an hr */
		setTimeout(function(id){
			return function(){
				delete games[id];
			
			} },(game_id),60*60*1000);
			
		
	}

}








