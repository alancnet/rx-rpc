const rx = require('rx');
const Observable = rx.Observable;
const BehaviorSubject = rx.BehaviorSubject;

function toBehavior(obs) {
    const behavior = new BehaviorSubject();
    obs.subscribe(
        next => behavior.onNext(next),
        error => behavior.onError(error)
    );
    return behavior;
}

module.exports.toBehavior = toBehavior;
