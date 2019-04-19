var Store = require('express-session').Store;

var defaultOpts = {

};

function ClusteredStore(opts) {
    Store.call(this);
    this.opts = Object.assign({}, defaultOpts, opts);
}

module.exports = ClusteredStore;