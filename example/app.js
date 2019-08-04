var express = require('express');
var session = require('express-session');
// !!! WHEN IMPORT THE STORE YOU NEED TO PASS THE EXPRESS STORE
var ClusteredStore = require('../lib/hazelcast-store')(session);

var app = express();
app.set('trust proxy', 1);

// !!! YOU NEED TO INITIALIZE THE HAZELCAST CLIENT BEFORE CREATING THE STORE
let Client = require('hazelcast-client').Client;
let Config = require('hazelcast-client').Config;
let config = new Config.ClientConfig();
config.groupConfig.name = "hazel";
config.groupConfig.password = "cast";
Client.newHazelcastClient(config)
    .then(function(client) {

        // !!! INITIALIZE THE STORE AND SET THE HAZELCAST CLIENT
        var hazelcastStore = new ClusteredStore();
        hazelcastStore.setClient(client);

        // !!! ADD THE SESSION MANAGER WITH THE CUSTOM STORE TO EXPRESS
        app.use(session({
            store: hazelcastStore,
            secret: 'my secret',
            resave: false,
            saveUninitialized: true,
            cookie: { maxAge: 60000 }
        }));

        app.get('/', function(req, res) {
            if (req.session.views) {
                req.session.views++;
                res.setHeader('Content-Type', 'text/html');
                res.write('<p>views: ' + req.session.views + '</p>');
                res.write('<p>expires in: ' + (req.session.cookie.maxAge / 1000) + 's</p>');
                res.end();
            } else {
                req.session.views = 1;
                res.end('welcome to the session demo. refresh!')
            }
        });

        app.listen(3000, () => {
            console.log('SERVER UP');
        });
    });