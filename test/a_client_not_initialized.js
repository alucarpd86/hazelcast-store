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

describe("hazelcast-store missing config", function () {

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

    let store1;
    let client;
    const id = uuidv1();
    const error = 'No hazelcast client found!';
    const typeError = 'Cannot call HazelcastStore constructor as a function';

    beforeEach("should prepare default empty store with new client", (done) => {
        store1 = new HazelcastStore(options);
        HazelcastClient
            .newHazelcastClient(clientConfig)
            .then(function (hzInstance) {
                client = hzInstance;
                done();
            })
            .catch((err) => {
                console.error("Fail to start hazelcast");
                console.error(err.message);
                console.error(err.stack);
            });
    });

    afterEach("should stop the hzClient", () => {
        if (client)
            client.shutdown();
    });

    it("should throw error for missing initialization", () => {
        expect(store1.all.bind(store1)).to.throw(error);
        expect(store1.destroy.bind(store1, id)).to.throw(error);
        expect(store1.clear.bind(store1)).to.throw(error);
        expect(store1.length.bind(store1)).to.throw(error);
        expect(store1.get.bind(store1, id)).to.throw(error);
        expect(store1.set.bind(store1, id, testSession)).to.throw(error);
        expect(store1.touch.bind(store1, id, testSession)).to.throw(error);

        expect(HazelcastStore.bind(HazelcastStore)).to.throw(typeError);
    });

});