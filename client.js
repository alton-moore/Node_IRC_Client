
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

//--------------------------------------------------------------

// This starts the Node server on the specified port.
app.listen(config_file.port,function() {
    console.log("Server started on port " + config_file.port);
});

var deleteClient = function(index) {
    if (index == -1) {
        console.log("  Client connection already deleted.");
    }
    else {
        console.log("  Deleting client at index " + index + " with session id " + session_id_array[index]);
        irc_handles_array[index].disconnect();
        //
        session_id_array.splice(   index,1);
        ping_times_array.splice(   index,1);
        irc_handles_array.splice(  index,1);
        message_queue_array.splice(index,1);
    }
}

var checkPings = function() {
    // Because each routine should be atomic, we can both check and clean the arrays here without worry.
    console.log("Checking " + session_id_array.length + " sessions for ping timeouts.");
    for (i=0; i < session_id_array.length; i++) {
        while ((i < session_id_array.length) && ((new Date().getTime() / 1000) - ping_times_array[i] > 35)) {
            console.log("  Ping timeout for session ID: " + session_id_array[i] + " -- Disconnecting and removing from arrays.");
            irc_handles_array[i].disconnect();
            deleteClient(i);
        }
    }
    setTimeout (function() { checkPings(); }, 10000);  // Repeat this every 10 seconds.
}
setTimeout (function() { checkPings(); }, 10000);  // Repeat this every 10 seconds.

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

// This returns the entire config file to the web page so it can use some of the settings.
app.get('/config_file', function(req,res) {
    config_file        = require(__dirname + "/" + "config.json");
    res.json(config_file);
});

// This returns the last channel message whenever called, or blank for none.
app.get('/last_channel_message', function(req,res) {
    var session_id = req.param('session_id') + "";
    var message_to_return = "";
    if (typeof(message_queue_array[session_id_array.indexOf(session_id)]) == "undefined") {  // This if statement can probably be taken out soon.
        console.log("message_queue_array entry undefined, so returning blank message.");
    }
    else {
        if (message_queue_array[session_id_array.indexOf(session_id)].length > 0) {
            message_to_return = message_queue_array[session_id_array.indexOf(session_id)].shift();
        }
    }
    if (session_id_array.indexOf(session_id) == -1) {  // Checking an invalid session?  If so, then give notice.
        res.json({"status":"NOT FOUND"});
    }
    else {
        ping_times_array[session_id_array.indexOf(session_id)] = new Date().getTime() / 1000;  // Set last ping time for this session.
        res.json({"status":"OK","lastChannelMessage":message_to_return});
    }
});

// This sends a message to the channel.
app.get('/send_channel_message', function(req,res) {
    var session_id      = req.param('session_id') + "";
    var message_to_send = req.param('message'   );
    console.log("Sending to server: " + message_to_send);
    if (session_id_array.indexOf(session_id) > -1) {  // Valid session ID passed to us?  This is mainly a security check, in case anyone writes directly to this endpoint.
        irc_handles_array[session_id_array.indexOf(session_id)].say(config_file.ircChannel, message_to_send);
        res.json({"status":"OK"});
    }
    else {
        res.json({"status":"NOT FOUND"});
    }
});

// This provides a session ID and connects to the server with a given nickname.
app.get('/connect', function(req,res) {
    var nickname   = req.param('nickname'  );
    // Create a session ID.
    var session_id = Math.random() + "";
    while (session_id_array.indexOf(session_id) > -1)  // Seesion ID already on file in array?
        session_id = Math.random();  // Collision unlikely, but check to be sure.
    session_id_array.push(session_id);  // Create the entry for this browser connection.
    ping_times_array[session_id_array.indexOf(session_id)] = new Date().getTime() / 1000;
    message_queue_array[session_id_array.indexOf(session_id)] = new Array(0);
    console.log("Assigned session ID: " + session_id);
    //
    console.log("Connecting to server " + config_file.ircServer + " with nickname " + nickname);
    irc_handles_array[session_id_array.indexOf(session_id)] = new irc.Client(config_file.ircServer, nickname, { debug: true, channels: [config_file.ircChannel] });
    push_to_message_queue_array(session_id, "Connected to server " + config_file.ircServer  + ", channel " + config_file.ircChannel);
    irc_handles_array[session_id_array.indexOf(session_id)].addListener('error', function(message) {  // This adds an error handler of sorts for this connection.
        console.error('error: %s: %s', message.command, message.args.join(' '));
    });
    //
    irc_handles_array[session_id_array.indexOf(session_id)].addListener('netError', function(message) {
        console.error('netError: %s  Zapping client entry for session %s', message, session_id);
        deleteClient(session_id_array.indexOf(session_id));
    });
    irc_handles_array[session_id_array.indexOf(session_id)].addListener('abort', function(message) {
        console.error('abort: %s  Zapping client entry for session %s', message, session_id);
        deleteClient(session_id_array.indexOf(session_id));
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
    res.json({"status":"OK","sessionId":session_id});  // Everything went well, so return OK status and newly created session ID.
});

