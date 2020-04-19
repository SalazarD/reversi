
function getURLParameters(whichParam){

	var pageURL = window.location.search.substring(1);
	var pageURLVariables = pageURL.split('&');
	for(var i = 0; i < pageURLVariables.length; i++){ 
		var parameterName = pageURLVariables[i].split('=');
		if(parameterName[0] == whichParam){
			return parameterName[1];
		}
	}

}

var username = getURLParameters('username');
if('undefined' == typeof username || !username){
	username = 'Anonymous_'+Math.random();
}

var chat_room = getURLParameters('game_id');

if('undefined' == typeof chat_room || !chat_room){
	chat_room ='lobby';
}


/* connect to socket server */

/*on log message recieved*/
var socket = io.connect(); 
socket.on('log', function(array){
	console.log.apply(console, array);
});



/* on someone join room*/
socket.on('join_room_response', function(payload){
	if(payload.result == 'fail'){
		alert(payload.message);
		return;
	}
	/* ignore our own join message*/
	if(payload.socket_id == socket.id){
		return;
	}

	/* add a new row to the lobby table*/
	var dom_elements = $('.socket_'+payload.socket_id);
	if(dom_elements.length==0){
		var nodeA = $('<div></div>');
		nodeA.addClass('socket_'+payload.socket_id);
		var nodeB = $('<div></div>');
		nodeB.addClass('socket_'+payload.socket_id);
		var nodeC = $('<div></div>');
		nodeC.addClass('socket_'+payload.socket_id);

		nodeA.addClass('w-100');
		nodeB.addClass('col-9 text-right');
		nodeB.append('<h4>'+payload.username+'</h4>');
		nodeC.addClass('cold-3 text-left');
		var buttonC = makeInviteButton(payload.socket_id);
		nodeC.append(buttonC);

		nodeA.hide();
		nodeB.hide();
		nodeC.hide();
		$('#players').append(nodeA,nodeB,nodeC);
		nodeA.slideDown(1000);
		nodeB.slideDown(1000);
		nodeC.slideDown(1000);

	}
	else{
		uninvite(payload.socket_id);
		var buttonC = makeInviteButton(payload.socket_id);
		$('.socket_'+payload.socket_id+' button').replaceWith(buttonC);
		dom_elements.slideDown(1000);
	}



	var newHTML = '<p>'+payload.username+' just entered the room</p>';
	var newNode =$(newHTML);
	newNode.hide();
	$('#messages').prepend(newNode);
	newNode.slideDown(1000);


	//$('#messages').append('<p> New user joined the room: '+payload.username+'</p>');
});





/* on someone leave room*/

socket.on('player_disconnected', function(payload){
	if(payload.result == 'fail'){
		alert(payload.message);
		return;
	}
	/* ignore our own join message*/
	if(payload.socket_id == socket.id){
		return;
	}

	/* remove a row from the lobby table*/
	var dom_elements = $('.socket_'+payload.socket_id);
	if(dom_elements.length!=0){
		dom_elements.slideUp(1000);
		}



	var newHTML = '<p>'+payload.username+' just left the room</p>';
	var newNode =$(newHTML);
	newNode.hide();
	$('#messages').prepend(newNode);
	newNode.slideDown(1000);

	
});


function invite(who){
	var payload = {};
	payload.requested_user = who;
	console.log('*** CLient Log Message: \'invite\' payload: '+JSON.stringify(payload));
	socket.emit('invite', payload);
}






socket.on('invite_response', function(payload){
	if(payload.result == 'fail'){
		alert(payload.message);
		return;
	}
	var newNode = makeInvitedButton(payload.socket_id);
	$('.socket_'+payload.socket_id+' button').replaceWith(newNode);

});

socket.on('invited', function(payload){
	if(payload.result == 'fail'){
		alert(payload.message);
		return;
	}
	var newNode = makePlayButton(payload.socket_id);
	$('.socket_'+payload.socket_id+' button').replaceWith(newNode);

});







function uninvite(who){
	var payload = {};
	payload.requested_user = who;
	console.log('*** CLient Log Message: \'uninvite\' payload: '+JSON.stringify(payload));
	socket.emit('uninvite', payload);
}



socket.on('uninvite_response', function(payload){
	if(payload.result == 'fail'){
		alert(payload.message);
		return;
	}
	var newNode = makeInviteButton(payload.socket_id);
	$('.socket_'+payload.socket_id+' button').replaceWith(newNode);

});

socket.on('uninvited', function(payload){
	if(payload.result == 'fail'){
		alert(payload.message);
		return;
	}
	var newNode = makeInviteButton(payload.socket_id);
	$('.socket_'+payload.socket_id+' button').replaceWith(newNode);

});

function game_start(who){
	var payload = {};
	payload.requested_user = who;
	console.log('*** CLient Log Message: \'game_start\' payload: '+JSON.stringify(payload));
	socket.emit('game_start', payload);
}



socket.on('game_start_response', function(payload){
	if(payload.result == 'fail'){
		alert(payload.message);
		return;
	}
	var newNode = makeEngagedButton(payload.socket_id);
	$('.socket_'+payload.socket_id+' button').replaceWith(newNode);

	// jump to new page
	window.location.href = 'game.html?username='+username+'&game_id='+payload.game_id;

});










function send_message(){
	var payload = {};
	payload.room = chat_room;
	
	payload.message = $('#send_message_holder').val();
	//console.log('***Client log message: \'send_message\' payload: 'JSON.stringify(payload));
	socket.emit('send_message', payload);
	$('#send_message_holder').val('');

}


socket.on('send_message_response', function(payload){
	if(payload.result == 'fail'){
		alert(payload.message);
		return;
	}
	var newHTML = '<p><b>'+payload.username+' says: </b> '+payload.message+'</p>';
	var newNode = $(newHTML);
	newNode.hide();
	$('#messages').prepend(newNode);
	newNode.slideDown(1000);


});




function makeInviteButton(socket_id){
	var newHTML = '<button type=\'button\' class=\'btn btn-outline-primary\'>Invite</button>';
	var newNode = $(newHTML);
	newNode.click(function(){
		invite(socket_id);
	});

	return(newNode);
}
function makeInvitedButton(socket_id){
	var newHTML = '<button type=\'button\' class=\'btn btn-primary\'>Invited</button>';
	var newNode = $(newHTML);
	newNode.click(function(){
		uninvite(socket_id);
	});
	return(newNode);
}
function makePlayButton(socket_id){
	var newHTML = '<button type=\'button\' class=\'btn btn-success\'>Play</button>';
	var newNode = $(newHTML);
	newNode.click(function(){
		game_start(socket_id);
	});
	return(newNode);
}
function makeEngagedButton(){
	var newHTML = '<button type=\'button\' class=\'btn btn-danger\'>Engaged</button>';
	var newNode = $(newHTML);
	return(newNode);
}



$(function(){
	var payload ={};
	payload.room = chat_room;
	payload.username = username;
	//console.log('***Client log message: \'join room\' payload: 'JSON.stringify(payload));
	socket.emit('join_room', payload);

	$('#quit').append('<a href="lobby.html?username='+username+'"class="btn btn-danger btn-default active" role="button" aria pressed="true">Quit</a>'); 



});

var old_board =[
['?','?','?','?','?','?','?','?',],
['?','?','?','?','?','?','?','?',],
['?','?','?','?','?','?','?','?',],
['?','?','?','?','?','?','?','?',],
['?','?','?','?','?','?','?','?',],
['?','?','?','?','?','?','?','?',],
['?','?','?','?','?','?','?','?',],
['?','?','?','?','?','?','?','?',]
];

var my_color = ' ';
var interval_timer;


socket.on('game_update', function(payload){
	//console.log('***Client log message: \'game_update\'\n\t payload: 'JSON.stringify(payload));
	/* check for board update*/
	if(payload.result == 'fail'){
		console.log(payload.message);
		window.location.href = 'lobby.html?username='+username;
		alert(payload.message);
		return;
	}

	var board = payload.game.board;
	if('undefined' == typeof board || !board){
		console.log('internal error: recieved a malformed board update from server');
		return;
	}

	/* update my color*/

	if(socket.id == payload.game.player_white.socket){
		my_color = 'white';
	}
	else if(socket.id == payload.game.player_black.socket){
		my_color = 'black';

	}
	else{
		/*something is wrong*/
		/*send client back to lobby*/
		window.location.href = 'lobby.html?username='+username;
		return;
	}
	var temp;
	if(payload.game.whose_turn === 'black'){
		temp='green';
	}
	else{
		temp='red';
	}

	if(my_color == 'white'){

	$('#my_color').html('<h3 id="my_color">I am '+'red'+'</h3>');
	$('#my_color').append('<h4 It is '+temp+'\'s turn. Elapsed time <span id="elapsed"></span></h4>');
	}
	if(my_color == 'black'){

	$('#my_color').html('<h3 id="my_color">I am '+'green'+'</h3>');
	$('#my_color').append('<h4> It is '+temp+'\'s turn. Elapsed time <span id="elapsed"></span></h4>');

	}

	clearInterval(interval_timer);
	interval_timer = setInterval(function(last_time){
		return function(){
			var d = new Date();
			var elapsedmilli = d.getTime() - last_time;
			var minutes = Math.floor(elapsedmilli / (60 * 1000));
			var seconds = Math.floor((elapsedmilli % (60 * 1000)) / 1000);
			if(seconds < 10){
				$('#elapsed').html(minutes+':0'+seconds);
			}
			else{
				$('#elapsed').html(minutes+':'+seconds);
			}
		}}(payload.game.last_move_time)
		, 1000);
	

	/* animate board changes */

	var blacksum = 0;
	var whitesum = 0;

	var row,column;
	for (row = 0; row <8; row++){
		for (column = 0; column < 8; column++){

			if(board[row][column] == 'b'){
				blacksum++;
			}
			if(board[row][column] == 'w'){
				whitesum++;
			}


			/* if board space has changed*/
			if(old_board[row][column] != board[row][column]){
				if(old_board[row][column] == '?' && board[row][column] == ' '){
					$('#'+row+'_'+column).html('<img src="assets/images/empty.gif" alt="empty square"/>');
				}
				else if(old_board[row][column] == '?' && board[row][column] == 'w'){
					$('#'+row+'_'+column).html('<img src="assets/images/red.gif" alt="red square"/>');
				}
				else if(old_board[row][column] == '?' && board[row][column] == 'b'){
					$('#'+row+'_'+column).html('<img src="assets/images/green.gif" alt="green square"/>');
				}
				else if(old_board[row][column] == ' ' && board[row][column] == 'w'){
					$('#'+row+'_'+column).html('<img src="assets/images/red.gif" alt="red square"/>');
				}
				else if(old_board[row][column] == ' ' && board[row][column] == 'b'){
					$('#'+row+'_'+column).html('<img src="assets/images/green.gif" alt="green square"/>');
				}
				else if(old_board[row][column] == 'w' && board[row][column] == ' '){
					$('#'+row+'_'+column).html('<img src="assets/images/red_to_empty.gif" alt="empty square"/>');
				}
				else if(old_board[row][column] == 'b' && board[row][column] == ' '){
					$('#'+row+'_'+column).html('<img src="assets/images/green_to_empty.gif" alt="empty square"/>');
				}
				else if(old_board[row][column] == 'w' && board[row][column] == 'b'){
					$('#'+row+'_'+column).html('<img src="assets/images/green.gif" alt="green square"/>');
				}
				else if(old_board[row][column] == 'b' && board[row][column] == 'w'){
					$('#'+row+'_'+column).html('<img src="assets/images/red.gif" alt="red square"/>');
				}
				else if(old_board[row][column] == 'b' && board[row][column] == 'b'){
					$('#'+row+'_'+column).html('<img src="assets/images/green.gif" alt="green square"/>');
				}
				else if(old_board[row][column] == 'w' && board[row][column] == 'w'){
					$('#'+row+'_'+column).html('<img src="assets/images/red.gif" alt="red square"/>');
				}
				else
				{
					$('#'+row+'_'+column).html('<img src="assets/images/error.gif" alt="error square"/>');
				}
			}
			/* set up interaction*/
			$('#'+row+'_'+column).off('click');
			$('#'+row+'_'+column).removeClass('hovered_over');
			if(payload.game.whose_turn === my_color){
				if(payload.game.legal_moves[row][column] === my_color.substr(0,1)){
					$('#'+row+'_'+column).addClass('hovered_over');
					$('#'+row+'_'+column).click(function(r,c){
						return function(){
							var payload ={};
							payload.row = r;
							payload.column = c;
							payload.color = my_color;
							console.log('*** Client log message: \'play token\' payload: ' +JSON.stringify(payload));
							socket.emit('play_token', payload);
						};
					}(row,column));
				}
			}

		}
	}
	 

	$('#blacksum').html(blacksum);
	$('#whitesum').html(whitesum);


old_board = board;

});

socket.on('play_token_response', function(payload){
	//console.log('***Client log message: \'play_token response\'\n\t payload: 'JSON.stringify(payload));
	/* check for good response*/
	if(payload.result == 'fail'){
		console.log(payload.message);
		alert(payload.message);
		return;
	}
});

socket.on('game_over', function(payload){
	//console.log('***Client log message: \'game_over\'\n\t payload: 'JSON.stringify(payload));
	/* check for good response*/
	if(payload.result == 'fail'){
		console.log(payload.message);
		return;
	}
	/* jump to a new page*/
	$('#game_over').html('<h1> Game Over </h1><h2>' +payload.who_won+ ' won!</h2>');
	$('#game_over').append('<a href="lobby.html?username='+username+'"class="btn btn-success btn-lg active" role="button" aria pressed="true"> Return to the lobby</a>'); 

});






