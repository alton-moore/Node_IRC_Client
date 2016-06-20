
// Here are the require() statements.
var express = require("express");
var app     = express();
var net     = require("net");
var irc     = require("irc");
var path    = require('path');  // This is so we don't have to specify the full path to the config file.

var config_file = require(__dirname + "/" + "config.json");

var last_channel_message = "";

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
  res.json({"lastChannelMessage": last_channel_message});
  last_channel_message = "";
  });

// This sends a message to the channel.
app.get('/send_channel_message', function(req,res) {
  var message_to_send = req.param('message');
  console.log("Sending to server: " + message_to_send);
  irc_client.say(config_file.ircChannel, message_to_send);
  res.end("OK");
});

//-----------------------------------------------------------
// Connect to IRC server now.

var irc_client = new irc.Client(config_file.ircServer, config_file.nickname, {
    debug: true,
    channels: [config_file.ircChannel]
});

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
        last_channel_message = message;
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

