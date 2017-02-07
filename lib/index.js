'use strict';
const rx = require('rxjs');
const Subject = rx.Subject;
const Observable = rx.Observable;
const uuid = require('uuid');
const rxx = require('./rxx');
const _ = require('lodash');

class RxRpc {
    constructor(options) {
        this.provider = options.provider;
        this.input = new Subject();
        this.output = new Subject();
        this.observables = {};
        this.subscriptions = {};
        this.streams = {};
        const me = this;
        this.input.filter(x => x.hasOwnProperty('name')).map(cmd =>{
            return ({
                key: cmd.key,
                value: this.convert(
                    this.provider[cmd.name].apply(
                        me.provider,
                        cmd.args.map(a => me.unconvert(a))
                    )
                )
            })
        }).subscribe(this.output);
        this.input.filter(x => x.hasOwnProperty('$$rxrpc'))
            .forEach(x => {
                const cmd = x.$$rxrpc[0];
                const id = x.$$rxrpc[1];
                const val = x.$$rxrpc[2];
                const stream = this.streams[id];
                const observable = this.observables[id];
                const subscription = this.subscriptions[id];

                switch (cmd) {
                    case 'next': stream && stream.next(this.unconvert(val)); break;
                    case 'error': stream && stream.error(this.unconvert(val)); break;
                    case 'completed': stream && stream.complete(); break;

                    case 'subscribe':
                        if (observable) {
                            this.subscriptions[id] = observable.subscribe(
                                next => this.output.next({$$rxrpc:['next', id, this.convert(next)]}),
                                error => this.output.next({$$rxrpc:['error', id, this.convert(error)]}),
                                completed => this.output.next({$$rxrpc:['completed', id]})
                            );
                        }
                        break;
                    case 'unsubscribe':
                        if (subscription) {
                            subscription.unsubscribe();
                            delete this.subscriptions[id];
                        }
                        break;
                }
            });
        if (options.input) options.input.subscribe(this.input);

        // this.output.forEach(o => console.log('output', o));
        // this.input.forEach(o => console.log('input', o));
    }
    /**
    Call a function on the peer using the supplied arguments
    @param {string} name - Name of command on remote provider.
    @param {...any} arg - Arguments passed to command.
    @returns {Observable} Stream of single response.
    */
    call(name, arg) {
        const args = [];
        for (let i = 1; i < arguments.length; i++)
            args.push(arguments[i]);
        return this.apply(name, args);
    }

    /**
    Call a function on the peer using the supplied list of arguments
    @param {string} name - Name of command on remote provider.
    @param {Array.} args - Array of parameters to command.
    @returns {Observable} Stream of single response.
    */
    apply(name, args) {
        if (!args) args = [];
        const key = uuid();
        const ret = rxx.toBehavior(
            this.input
                .filter(res => res.key === key)
                .map(res => this.unconvert(res.value))
                .take(1)
        ).filter(x => x).take(1);
        const convertedArgs = args.map(a => this.convert(a))
        this.output.next({key, name, args: convertedArgs});
        return ret.flatMap(obsOrVal => {
            if (typeof obsOrVal.subscribe === 'function') {
                return obsOrVal;
            } else {
                return Observable.of(obsOrVal);
            }
        });
    }

    /**
    Connects two RxRpc instances as peers.
    @param {RxRpc} other - Other instance to peer to.
    */
    couple(other) {
        this.output.forEach(o => other.input.next(o));
        other.output.forEach(o => this.input.next(o));
    }

    /** Converts any observables within obj to an $observable reference */
    convert(obj) {
        return _.cloneDeepWith(obj, o => {
            if (o && typeof o.subscribe == 'function') {
                // Observable
                const key = uuid();
                this.observables[key] = o.do(null,null,() => {
                    delete this.observables[key];
                });
                return {$observable: key};
            }
        })
    }
    /** Converts any $observable reference within obj to an observable */
    unconvert(obj) {
        return _.cloneDeepWith(obj, o => {
            if (o && o.$observable) {
                return this.linkObservable(o.$observable)
            }
        })
    }
    /** Creates an observable linked to the peer's observable. */
    linkObservable(id) {
        return Observable.create(observer => {
            // Subscribe to incoming stream
            this.streams[id] = observer;

            // Notify peer of subscription
            this.output.next({$$rxrpc: ['subscribe', id]});

            // When user disposes of stream
            return () => {
                this.output.next({$$rxrpc: ['unsubscribe', id]});
                delete this.streams[id];
            };
        }).share();
    }
}

module.exports = {
    RxRpc
};
