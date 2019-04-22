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

describe("hazelcast-store ttl tests", function () {

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
        ttl: 1000,
        disableTTL: false
    };

    let store;
    let client;
    const id = uuidv1();

    before("should prepare default empty store with new client", (done) => {
        store = new HazelcastStore(options);
        HazelcastClient
            .newHazelcastClient(clientConfig)
            .then((hzInstance) => {
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

    describe("test a short TTL", function () {

        it("should session still exist", (done) => {
            expect(store.options.ttl).to.be.equal(1000);
            store.set(id, testSession, (err) => {
                expect(err).to.be.null;
                store.get(id, (error, session) => {
                    expect(error).to.be.null;
                    expect(session).to.be.deep.equal(testSession);
                    done();
                });
            });
        });

        it("should session exist after a 1.5 second timeout because of touch", function(done) {
            this.timeout(10000);
            setTimeout(() => {
                store.touch(id, testSession, (error) => {
                    expect(error).to.be.null;
                });
            },900);
            setTimeout(() => {
                store.get(id, (error, session) => {
                    expect(error).to.be.null;
                    expect(session).to.be.not.null;
                    done();
                });
            }, 1500);
        });

        it("should session not exist after 3 second timeout", function(done) {
            this.timeout(10000);
            setTimeout(() => {
                store.get(id, (error, session) => {
                    expect(error).to.be.null;
                    expect(session).to.be.null;
                    done();
                });
            }, 3000);
        });

    });
});