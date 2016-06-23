
// Here are the require() statements.
var express = require("express");
var app     = express();
var irc     = require("irc");
var path    = require('path');  // This is so we don't have to specify the full path to the .js or config files.

var config_file = require(__dirname + "/" + "config.json");

var session_id_array    = new Array(0);
var ping_times_array    = new Array(0);
var irc_handles_array   = new Array(0);
var message_queue_array = new Array(0);  // Entries here will also be arrays.
var add_listeners_flag = 0;

//--------------------------------------------------------------

// This starts the Node server on the specified port.
app.listen(config_file.port,function() {
  console.log("Server started on port " + config_file.port);
});

//-----------------------------------------------------------
// Subroutines
var push_to_message_queue_array = function(session_id, message) {
  if (typeof(message_queue_array[session_id_array.indexOf(session_id)]) == "undefined")
    message_queue_array[session_id_array.indexOf(session_id)] = new Array(0);
  message_queue_array[session_id_array.indexOf(session_id)].push(message);
}

//----------------------------------------------------------
// These are the Express.js routing functions.

// This is the default, the client.html page.
app.get('/',function(req,res) {
  console.log("html requested");
  res.sendFile(path.join(__dirname + '/client.html'));
});

// Return a session ID to the browser for use in future requests.
app.get('/session_id', function(req,res) {
  var session_id = Math.random() + "";
  //while (session_id_array.indexOf(session_id) > -1)
  //  session_id = Math.random();  // Collision unlikely, but put the above check back in soon.
  session_id_array.push(session_id);  // Create the entry for this browser connection.  Later we should see about reusing old entries.
  ping_times_array[session_id_array.indexOf(session_id)] = new Date().getTime() / 1000;
  console.log("Assigned session ID: " + session_id);
  res.json({"sessionId": session_id});
});

// This returns the entire config file to the web page so it can use some of the settings.
app.get('/config_file', function(req,res) {
  config_file        = require(__dirname + "/" + "config.json");
  res.json(config_file);
});

// This returns the last channel message whenever called, or blank for none.
app.get('/last_channel_message', function(req,res) {
  var session_id = req.param('session_id') + "";
  var message_to_return = "";
  //console.log("Checking message queue for session " + session_id);
  if (typeof(message_queue_array[session_id_array.indexOf(session_id)]) == "undefined") {
    console.log("message_queue_array entry undefined, so returning blank message.");
  }
  else {
      if (message_queue_array[session_id_array.indexOf(session_id)].length > 0) {
         message_to_return = message_queue_array[session_id_array.indexOf(session_id)].shift();
      }
  }
  res.json({"lastChannelMessage": message_to_return});
});

// This receives pings from the browser and notes when the last one was received, so dead connections can be killed.
app.get('/ping', function(req,res) {
  var session_id = req.param('session_id') + "";
  console.log("Received PING with session ID " + session_id + " from browser client.");
  // Make note of last ping time for this session.
  ping_times_array[session_id_array.indexOf(session_id)] = new Date().getTime() / 1000;  // Set last ping time for this session.
  res.json({"status": "OK"});
});

// This sends a message to the channel.
app.get('/send_channel_message', function(req,res) {
  var session_id      = req.param('session_id') + "";
  var message_to_send = req.param('message'   );
  console.log("Sending to server: " + message_to_send);
  irc_handles_array[session_id_array.indexOf(session_id)].say(config_file.ircChannel, message_to_send);
  res.json({"status": "OK"});
});

// This connects to the server with a given nickname.
app.get('/connect', function(req,res) {
  var session_id = req.param('session_id') + "";
  var nickname   = req.param('nickname'  );
  console.log("Connecting to server " + config_file.ircServer + " with nickname " + nickname);
  irc_handles_array[session_id_array.indexOf(session_id)] = new irc.Client(config_file.ircServer, nickname, { debug: true, channels: [config_file.ircChannel] });
  push_to_message_queue_array(session_id, "Connected to " + config_file.ircServer  + " now."    );
  push_to_message_queue_array(session_id, "Joining the "  + config_file.ircChannel + " channel.");
  irc_handles_array[session_id_array.indexOf(session_id)].addListener('error', function(message) {
      console.error('ERROR: %s: %s', message.command, message.args.join(' '));
  });
  //
  irc_handles_array[session_id_array.indexOf(session_id)].addListener('message#blah', function(from, message) {
      console.log('<%s> %s', from, message);
  });
  irc_handles_array[session_id_array.indexOf(session_id)].addListener('message', function(from, to, message) {
      var hold_session_id = session_id;
      console.log('%s => %s: %s', from, to, message);
      if (to.match(/^[#&]/)) {
          // channel message
          push_to_message_queue_array(hold_session_id, from + ": " + message);
      }
      else {
          // private message
          console.log('private message');
      }
  });
  irc_handles_array[session_id_array.indexOf(session_id)].addListener('pm', function(nick, message) {
      console.log('Got private message from %s: %s', nick, message);
  });
  irc_handles_array[session_id_array.indexOf(session_id)].addListener('join', function(channel, who) {
      console.log('%s has joined %s', who, channel);
  });
  irc_handles_array[session_id_array.indexOf(session_id)].addListener('part', function(channel, who, reason) {
      console.log('%s has left %s: %s', who, channel, reason);
  });
  irc_handles_array[session_id_array.indexOf(session_id)].addListener('kick', function(channel, who, by, reason) {
      console.log('%s was kicked from %s by %s: %s', who, channel, by, reason);
  });
  //
  res.json({"status": "OK"});
});

