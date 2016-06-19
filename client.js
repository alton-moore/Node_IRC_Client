
// Here are the require() statements.
var express = require("express");
var app     = express();
var net     = require("net");
var irc     = require("irc");

//----------------------------------------------------------
// These are the Express.js routing functions.

// This returns the entire config file to the web page so it can use some of the settings.
app.get('/config_file', function(req,res) {
  config_file        = require(__dirname + "/" + "config.json");
  res.json(config_file);
  });

// This is the default, the index.html page.
app.get('/',function(req,res) {
  console.log("html requested");
  res.sendFile(path.join(__dirname + '/' + use_case_name + '-violations.html'));
  });

// This returns the last reported violation count whenever called.
app.get('/current_violations', function(req,res) {
  res.json({"currentViolationCount":current_violation_count / update_frequency});
  });

//-----------------------------------------------------------
// Connect to IRC server now.

var irc_client = new irc.Client('irc.alton-moore.net', 'AltonNode', {
    debug: true,
    channels: ['#alton', '#nkx']
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
        if (message.match(/hello/i)) {
            irc_client.say(to, 'Hello there ' + from);
        }
        if (message.match(/dance/)) {
            setTimeout(function() { irc_client.say(to, '\u0001ACTION dances: :D\\-<\u0001'); }, 1000);
            setTimeout(function() { irc_client.say(to, '\u0001ACTION dances: :D|-<\u0001');  }, 2000);
            setTimeout(function() { irc_client.say(to, '\u0001ACTION dances: :D/-<\u0001');  }, 3000);
            setTimeout(function() { irc_client.say(to, '\u0001ACTION dances: :D|-<\u0001');  }, 4000);
        }
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
