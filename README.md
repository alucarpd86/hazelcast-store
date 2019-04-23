**hazelcast-store** in an implementation of [express session store](https://github.com/expressjs/session#compatible-session-stores) based on the [hazelcast-nodejs-client](https://github.com/hazelcast/hazelcast-nodejs-client).

This module allow to replicate an HTTP session among all nodejs processes, even on different machines
This module allow to propagate the HTTP session on more than one shared map, with different serialization beans

### Create an instance of `HazelcastStore`
> In order to initialize the module you need to
- initialize the express-session module
- initialize an instance of the `HazelcastStore`
- connect an hazelcast-client to an active hazelcast cluster
- when the hazelcast client is ready you can pass it to the `HazelcastStore` via the method setClient
- finally you can initialize the session middleware of expressjs

```js
const session = require('express-session');
const HazelcastStore = require('hazelcast-store')(session);
const hazelcastStore = new HazelcastStore();

const HazelcastClient = require('hazelcast-client').Client;
const HazelcastConfig = require('hazelcast-client').Config;
const clientConfig = new HazelcastConfig.ClientConfig();
clientConfig.networkConfig.addresses = ['127.0.0.1:5701'];

HazelcastClient.newHazelcastClient(clientConfig)
    .then((hzInstance) => {
        hazelcastStore.setClient(hzInstance);
        app.use(session({ store: hazelcastStore, secret: 'mySecret', name: 'myCookieName' }));
    });
```

> This module has a set of options available
```js
const defaultOptions = {
    disableTTL: false,
    ttl: 86400000,
    maps: [
        { mapName: "Sessions" }
    ]
};
```

- disableTTL: by default is false and the TTL specified in the ttl configuration or in maxAge cookie parameter will beused.
- ttl: by default 86400000 (24h) millis. It the time to live of the sessions, if cookie maxAge is not specified.
- maps: is an array of elements that represent the maps that should be used as storage for the HTTP session. At least one map should be specified. By default will be created a map called "Sessions".

This module implements all required and optional method suggested in [express session store implementation](https://github.com/expressjs/session#session-store-implementation):
- store.all
- store.destroy
- store.clear
- store.length
- store.get
- store.set
- store.touch

This module has been tested with:
- express-store: 1.15.0 and above
- hazelcast-client: 0.10.0. It works also with older version of hazelcast because this module handle correctly the change of method `hzClient.getMap(mapName)` from synchronous method to promise.

### Advanced Usage

This module support the sinchronization of HTTP session among a list of hazelcast maps with different bean serialization.
If the configuration contains something like:
```js
let options = {
    maps: [
        { 
            mapName: "Sessions" 
        },
        { 
            mapName: "MyCustomSessions",
            bean: MyConstructorBean 
        }
    ]
};
```
this library will set the HTTP session value in the first map `Sessions` and in the replica map `MyCustomSession` with a value obtained via the custom constructor:
```js
MyConstructorBean(session)
```
instead of the entire content of the session
```js
session
```

In this way you can customize the content of the HTTP session map.