"use strict";

var CustomSessionBean = function(options){
    //Serializable bean definition
    var self = this;
    this.getFactoryId = function() {
        return 1;
    };
    this.getClassId = function() {
        return 1;
    };
    this.getVersion = function() {
        return 1;
    };

    this.username = options.username || null;
    this.password = options.password || null;

    //logica di read/write dei campi
    this.writePortable = function(dataOutput) {
        dataOutput.writeUTF("username", self.username);
        dataOutput.writeUTF("password", self.password);
    };
    this.readPortable = function(dataInput) {
        self.username = dataInput.readUTF("username");
        self.password = dataInput.readUTF("password");
    };
    return self;
};

const session = require("express-session");
const HazelcastStore = require('../lib/hazelcast-store')(session);
const HazelcastClient = require('hazelcast-client').Client;
const HazelcastConfig = require('hazelcast-client').Config;
const clientConfig = new HazelcastConfig.ClientConfig();
clientConfig.groupConfig.name = "hazel";
clientConfig.groupConfig.password = "cast";
clientConfig.networkConfig.addresses = ['127.0.0.1:5701'];
clientConfig.serializationConfig.portableVersion = 1;
clientConfig.serializationConfig.portableFactories[1] = {
    create: function(type){
        switch(type){
            case 1:
                return new CustomSessionBean({});
        }
    }
};
const uuidv1 = require('uuid/v1');
const expect = require('chai').expect;

describe("hazelcast-store custom bean tests", function (maps = []) {

    const testSession = {
        "cookie": {
            "path": "/",
            "httpOnly": true,
            "secure": true,
            "maxAge": 1000
        },
        "name": "sid",
        "username": "myCustomUser",
        "password": "myCustomPassword"
    };

    const options = {
        ttl: 15*60*1000,
        disableTTL: false,
        maps: [
            { mapName: "Sessions"},
            { mapName: "MyCustomSessions", bean: CustomSessionBean }
        ]
    };

    let store;
    let client;
    const id = uuidv1();

    before("should prepare empty store with new client and custom bean configured", (done) => {
        store = new HazelcastStore(options);
        HazelcastClient
            .newHazelcastClient(clientConfig)
            .then(function (hzInstance) {
                client = hzInstance;
                return store.setClient(hzInstance)
                    .then(done);
            })
            .catch((err) => {
                console.error("Fail to start hazelcast");
                console.error(err.message);
                console.error(err.stack);
            });
    });

    after("should stop the hzClient", () => {
        if (client)
            client.shutdown();
    });

    it("should set a session and retrieve the session from the replica map", function (done) {
        store.set(id, testSession, function (error) {
            expect(error).to.be.null;
            store.getFromMap(id, 1, function(err, session) {
                expect(err).to.be.null;
                expect(session).to.be.not.null;
                expect(session.username).to.be.equal("myCustomUser");
                expect(session.password).to.be.equal("myCustomPassword");
                expect(session.getFactoryId).to.be.not.undefined;
                done();
            });
        });
    });

});