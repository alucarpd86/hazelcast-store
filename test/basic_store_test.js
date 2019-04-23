"use strict";
const session = require("express-session");
const HazelcastStore = require('../lib/hazelcast-store')(session);
const HazelcastClient = require('hazelcast-client').Client;
const HazelcastConfig = require('hazelcast-client').Config;
const clientConfig = new HazelcastConfig.ClientConfig();
clientConfig.groupConfig.name = "hazel";
clientConfig.groupConfig.password = "cast";
clientConfig.networkConfig.addresses = ['127.0.0.1:5701'];
const uuidv1 = require('uuid/v1');
const expect = require('chai').expect;

describe("hazelcast-store basic tests", function () {

    const testSession = {
        "cookie": {
            "path": "/",
            "httpOnly": true,
            "secure": true,
            "maxAge": 1000
        },
        "name": "sid"
    };

    const options = {
        ttl: 15*60*1000,
        disableTTL: false
    };

    let store;
    let client;
    const id = uuidv1();
    const deleteId = uuidv1();

    before("should prepare default empty store with new client", (done) => {
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

    it("should test the default store configuration", () => {
        expect(typeof store.client).to.be.equal("object");
        expect(store.options.ttl).to.be.equal(options.ttl);
        expect(store.options.disableTTL).to.be.equal(options.disableTTL);
        expect(store.options.maps.length).to.be.equal(1);
    });

    it("should set a session", function (done) {
        store.set(id, testSession, function (error) {
            expect(error).to.be.null;
            done();
        });
    });

    it("should get an existing session", function (done) {
        store.get(id, function (error, session) {
            expect(error).to.be.null;
            expect(session).to.be.deep.equal(testSession);
            done();
        });
    });

    it("should get null for a non existing session", function (done) {
        store.get('xxx', function (error, session) {
            expect(error).to.be.null;
            expect(session).to.be.null;
            done();
        });
    });

    it("should clear reduce size to zero", function (done) {
        store.clear(function(error) {
            expect(error).to.be.null;
            store.length(function(err, size) {
                expect(err).to.be.null;
                expect(size).to.be.equal(0);
                done();
            });
        })
    });

    it("should all match length", function (done) {
        store.all(function(error, sessions) {
            expect(error).to.be.null;
            expect(sessions).to.be.not.null;
            store.length(function(err, size) {
                expect(err).to.be.null;
                expect(size).to.be.equal(sessions.length);
                done();
            });
        })
    });

    it("should destroy an existing session", function (done) {
        store.set(deleteId, testSession, function(e) {
            expect(e).to.be.null;
            store.get(deleteId, function (err, session) {
                expect(err).to.be.null;
                expect(session).to.be.deep.equal(testSession);

                store.destroy(deleteId, function (erro) {
                    expect(erro).to.be.null;

                    store.get(deleteId, function (error, session) {
                        expect(error).to.be.null;
                        expect(session).to.be.null;
                        done();
                    });
                });
            });
        });
    });

});