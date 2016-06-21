
// Here are the require() statements.
var express = require("express");
var app     = express();
//var net     = require("net");
var irc     = require("irc");
var path    = require('path');  // This is so we don't have to specify the full path to the .js or config files.

var config_file = require(__dirname + "/" + "config.json");

var nickname;
var irc_client;
var message_queue_array = new Array(0);

//--------------------------------------------------------------

// This starts the Node server on the specified port.
app.listen(config_file.port,function() {
  console.log("Server started on port " + config_file.port);
});

//----------------------------------------------------------
// These are the Express.js routing functions.

// This is the default, the client.html page.
app.get('/',function(req,res) {
  console.log("html requested");
  res.sendFile(path.join(__dirname + '/client.html'));
});

// This returns the entire config file to the web page so it can use some of the settings.
app.get('/config_file', function(req,res) {
  config_file        = require(__dirname + "/" + "config.json");
  res.json(config_file);
});

// This returns the last channel message whenever called, or blank for none.
app.get('/last_channel_message', function(req,res) {
  if (message_queue_array.length > 0)
    res.json({"lastChannelMessage": message_queue_array.shift()});
  else
    res.json({"lastChannelMessage": ""});
});

// This receives pings from the browser and notes when the last one was received, so dead connections can be killed.
app.get('/ping', function(req,res) {
  console.log("Received PING from browser client.");
  // Make notes of last ping time.
  res.json({"status": "OK"});
});

// This sends a message to the channel.
app.get('/send_channel_message', function(req,res) {
  var message_to_send = req.param('message');
  console.log("Sending to server: " + message_to_send);
  irc_client.say(config_file.ircChannel, message_to_send);
  res.json({"status": "OK"});
});

// This connects to the server with a given nickname.
app.get('/connect', function(req,res) {
  var nickname = req.param('nickname');
  console.log("Connecting to server " + config_file.ircServer + " with nickname " + nickname);
  irc_client = new irc.Client(config_file.ircServer, nickname, {
      debug: true,
      channels: [config_file.ircChannel]
  });
  message_queue_array.push("Connected to " + config_file.ircServer  + " now."    );
  message_queue_array.push("Joining the "  + config_file.ircChannel + " channel.");
  irc_client.addListener('error', function(message) {
      console.error('ERROR: %s: %s', message.command, message.args.join(' '));
  });
  irc_client.addListener('message#blah', function(from, message) {
      console.log('<%s> %s', from, message);
  });
  irc_client.addListener('message', function(from, to, message) {
      console.log('%s => %s: %s', from, to, message);
      if (to.match(/^[#&]/)) {
          // channel message
          message_queue_array.push(from + ": " + message);
      }
      else {
          // private message
          console.log('private message');
      }
  });
  irc_client.addListener('pm', function(nick, message) {
      console.log('Got private message from %s: %s', nick, message);
  });
  irc_client.addListener('join', function(channel, who) {
      console.log('%s has joined %s', who, channel);
  });
  irc_client.addListener('part', function(channel, who, reason) {
      console.log('%s has left %s: %s', who, channel, reason);
  });
  irc_client.addListener('kick', function(channel, who, by, reason) {
      console.log('%s was kicked from %s by %s: %s', who, channel, by, reason);
  });
  //
  res.json({"status": "OK"});
});


