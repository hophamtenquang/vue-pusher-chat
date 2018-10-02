"use strict";

require('dotenv').config();
const express    = require('express');
const path       = require('path');
const bodyParser = require('body-parser');
const session    = require('express-session');
const Pusher     = require('pusher');
const dateTime = require('node-datetime');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://hophamtenquang:RedmiNote3@quang-shop-shard-00-00-xwowg.mongodb.net:27017,quang-shop-shard-00-01-xwowg.mongodb.net:27017,quang-shop-shard-00-02-xwowg.mongodb.net:27017/cart-shop?ssl=true&replicaSet=quang-shop-shard-0&authSource=admin&retryWrites=true";

// Session middleware
app.use(session({
    secret: 'somesuperdupersecret',
    resave: true,
    saveUninitialized: true
}))

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));


// Create an instance of Pusher
const pusher = new Pusher({
    appId:     process.env.PUSHER_APP_ID,
    key:       process.env.PUSHER_APP_KEY,
    secret:    process.env.PUSHER_APP_SECRET,
    cluster:   process.env.PUSHER_APP_CLUSTER,
    encrypted: true
});

app.get('/', (req, res) => {
    res.sendFile('index.html');
});

app.post('/join-chat', (req, res) => {
    // store username in session
    req.session.username = req.body.username;

    res.json('Joined');
});

app.post('/pusher/auth', (req, res) => {
    const socketId = req.body.socket_id;
    const channel = req.body.channel_name;

    // Retrieve username from session and use as presence channel user_id
    const presenceData = {
        user_id: req.session.username
    };

    const auth = pusher.authenticate(socketId, channel, presenceData);

    res.send(auth);
});

app.get('/old-messages', (req, res) => {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db("group_chat");
    //Sort the result by name:
    var sort = { time: 1 };
    dbo.collection("messages").find().sort(sort).toArray(function(err, result) {
      if (err) throw err;
      res.send(result);
      db.close();
    });
  });
});

app.post('/send-message', (req, res) => {
    let now = dateTime.create();
    let now_formatted = now.format('Y-m-d H:M:S');
    let message = {
        username: req.body.username,
        message:  req.body.message,
        time: now_formatted
    };
    pusher.trigger('presence-groupChat', 'message_sent', message);

    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db("group_chat");
      dbo.collection("messages").insertOne(message, function(err, res) {
        if (err) throw err;
        console.log("1 document inserted");
        db.close();
      });
    });

    res.send('Message sent');
});

app.post('/typing', (req, res) => {
    pusher.trigger('presence-groupChat', 'typing', {
        username: req.body.username,
    });

    res.send('Typing');
});

app.post('/stop-typing', (req, res) => {
    pusher.trigger('presence-groupChat', 'stop_typing', {
        username: req.body.username,
    });

    res.send('Stop Typing');
});

app.listen(3000, () => {
    console.log('Server is up on 3000')
});
