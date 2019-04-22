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
    client: null,
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

    var Store = session.Store;

    function HazelcastStore (options) {
        if (!(this instanceof HazelcastStore))
            throw new TypeError('Cannot call HazelcastStore constructor as a function');

        this.options = Object.assign(defaultOptions, options);

        Store.call(this, this.options);
    }

    util.inherits(HazelcastStore, Store);

    /**
     * Sets the hazelcast client after the HazelcastStore creation
     * This method loads all map object from the HZ client
     */
    HazelcastStore.prototype.setClient = function (hazelcastClientInstance) {
        this.options.client = hazelcastClientInstance;
        //Load all maps in the maps object
        var promises = [];
        this.options.maps.forEach((obj) => {
            promises.push(this.options.client.getMap(obj.mapName));
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
        if (!this.options.client)
            throw new Error('No hazelcast client found!');

        this.options.maps[0].map.values()
            .then(function (data) {
                return fn && fn(null, data.toArray());
            })
            .catch(function (err) {
                return fn && fn(err);
            });
    };

    /**
     * Destroy the session associated with the given `sid`.
     */
    HazelcastStore.prototype.destroy = function (sid, fn) {
        if (!this.options.client)
            throw new Error('No hazelcast client found!');

        var allPromises = [];
        this.options.maps.forEach((obj) => {
            allPromises.push(obj.map.delete(sid));
        });

        return Promise.all(allPromises)
            .then(() => {
                fn && fn(null);
            })
            .catch(function (err) {
                return fn && fn(err);
            });
    };

    /**
     * Clear all sessions for all maps.
     */
    HazelcastStore.prototype.clear = function (fn) {
        if (!this.options.client)
            throw new Error('No hazelcast client found!');

        var allPromises = [];
        this.options.maps.forEach((obj) => {
            allPromises.push(obj.map.clear());
        });

        return Promise.all(allPromises)
            .then(() => {
                fn && fn(null);
            })
            .catch(function (err) {
                return fn && fn(err);
            });
    };

    /**
     * Count the number of sessions.
     */
    HazelcastStore.prototype.length = function (fn) {
        if (!this.options.client)
            throw new Error('No hazelcast client found!');

        this.options.maps[0].map.size()
            .then((size) => {
                fn && fn(null, size);
            })
            .catch(function (err) {
                return fn && fn(err);
            });
    };

    /**
     * Get the session by the given `sid`.
     */
    HazelcastStore.prototype.get = function (sid, fn) {
        if (!this.options.client)
            throw new Error('No hazelcast client found!');

        this.options.maps[0].map.get(sid)
            .then(function (data) {
                return fn && fn(null, data);
            })
            .catch(function (err) {
                return fn && fn(err);
            });
    };

    /**
     * Save in HZ the given `sess` object associated with the given `sid`.
     */
    HazelcastStore.prototype.set = function (sid, sess, fn) {
        if (!this.options.client)
            throw new Error('No hazelcast client found!');

        let ttl;
        if (!this.options.disableTTL) {
            ttl = getTTL(this, sess);
        }

        var allPromises = [];
        this.options.maps.forEach((obj) => {
            allPromises.push(obj.map.set(sid, obj.bean?obj.bean(sess):sess, ttl));
        });

        return Promise.all(allPromises)
            .then(() => {
                fn && fn(null);
            })
            .catch(function (err) {
                return fn && fn(err);
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

