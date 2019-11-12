'use strict';

/*!
 * Hazelcast - Express Session Store
 * Copyright(c) 2019 Matteo Bruni
 * MIT Licensed
 */

// Express session store implementation: https://github.com/expressjs/session#user-content-session-store-implementation

const util = require('util');
const oneDay = 86400000;
const defaultOptions = {
    disableTTL: false,
    ttl: oneDay,
    maps: [
        { mapName: "Sessions" }
    ]
};

function getTTL(store, sess) {
    let maxAge = sess.cookie.maxAge;
    return store.ttl || (typeof maxAge === 'number'
        ? Math.floor(maxAge)
        : oneDay);
}

/**
 * Return the `HazelcastStore` extending `express`'s session Store.
 *
 * @param {object} express session
 * @return {Function}
 * @api public
 */
module.exports = function (session) {

    let Store = session.Store;

    function HazelcastStore (options) {
        if (!(this instanceof HazelcastStore))
            throw new TypeError('Cannot call HazelcastStore constructor as a function');

        this.options = Object.assign(defaultOptions, options);
        this.client = null;
        Store.call(this, this.options);
    }

    util.inherits(HazelcastStore, Store);

    /**
     * Sets the hazelcast client after the HazelcastStore creation
     * This method loads all map object from the HZ client
     */
    HazelcastStore.prototype.setClient = function (hazelcastClientInstance) {
        this.client = hazelcastClientInstance;
        //Load all maps in the maps object
        let promises = [];
        this.options.maps.forEach((obj) => {
            let returnVal = this.client.getMap(obj.mapName);
            if (typeof returnVal.then == 'function')
                promises.push(returnVal);//Hazelcast 0.10 and above
            else
                promises.push(Promise.resolve(returnVal)); //Hazelcast 0.9 and older
        });
        return Promise.all(promises)
            .then((maps) => {
                maps && maps.forEach((map, index) => {
                    this.options.maps[index].map = map;
                });
            });
    };

    /**
     * Get all the sessions as array.
     */
    HazelcastStore.prototype.all = function (fn) {
        if (!this.client)
            throw new Error('No hazelcast client found!');

        return this.options.maps[0].map.values()
            .then(function (data) {
                fn && fn(null, data.toArray());
            })
            .catch(function (err) {
                fn && fn(err);
            });
    };

    /**
     * Destroy the session associated with the given `sid`.
     */
    HazelcastStore.prototype.destroy = function (sid, fn) {
        if (!this.client)
            throw new Error('No hazelcast client found!');

        let allPromises = [];
        this.get(sid)
            .then((data) => {
                this.options.maps.forEach((obj) => {
                    allPromises.push(obj.map.delete(sid));//XXX qui devo sistemare
                });

                return Promise.all(allPromises)
                    .then(() => {
                        fn && fn(null);
                    })
                    .catch(function (err) {
                        fn && fn(err);
                    });
            })
            .catch(function (err) {
                fn && fn(err);
            });
    };

    /**
     * Clear all sessions for all maps.
     */
    HazelcastStore.prototype.clear = function (fn) {
        if (!this.client)
            throw new Error('No hazelcast client found!');

        let allPromises = [];
        this.options.maps.forEach((obj) => {
            allPromises.push(obj.map.clear());
        });

        return Promise.all(allPromises)
            .then(() => {
                fn && fn(null);
            })
            .catch(function (err) {
                fn && fn(err);
            });
    };

    /**
     * Count the number of sessions.
     */
    HazelcastStore.prototype.length = function (fn) {
        if (!this.client)
            throw new Error('No hazelcast client found!');

        return this.options.maps[0].map.size()
            .then((size) => {
                fn && fn(null, size);
            })
            .catch(function (err) {
                fn && fn(err);
            });
    };

    /**
     * Get the session by the given `sid`.
     */
    HazelcastStore.prototype.get = function (sid, fn) {
        return this.getFromMap(sid, 0, fn);
    };

    HazelcastStore.prototype.getFromMap = function (sid, index, fn) {
        if (!this.client)
            throw new Error('No hazelcast client found!');

        return this.options.maps[index].map.get(sid)
            .then(function (data) {
                fn && fn(null, data);
            })
            .catch(function (err) {
                fn && fn(err);
            });
    };

    /**
     * Save in HZ the given `sess` object associated with the given `sid`.
     */
    HazelcastStore.prototype.set = function (sid, sess, fn) {
        if (!this.client)
            throw new Error('No hazelcast client found!');

        let ttl;
        if (!this.options.disableTTL) {
            ttl = getTTL(this, sess);
        }

        let allPromises = [];
        this.options.maps.forEach((obj) => {
            let key = obj.key?sess[obj.key]:sid;
            let value = obj.bean?obj.bean(sess):sess;
            allPromises.push(obj.map.set(key, value, ttl));//XX qui devo sistemare
        });

        return Promise.all(allPromises)
            .then(() => {
                fn && fn(null);
            })
            .catch(function (err) {
                fn && fn(err);
            });
    };

    /**
     * Update the TTL of the fiven `sid`.
     */
    HazelcastStore.prototype.touch = function (sid, sess, fn) {
        return this.set(sid, sess, fn);
    };

    return HazelcastStore;
};

