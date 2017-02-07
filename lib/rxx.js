const rx = require('rxjs');
const Observable = rx.Observable;
const BehaviorSubject = rx.BehaviorSubject;

function toBehavior(obs) {
    const behavior = new BehaviorSubject();
    obs.subscribe(
        next => behavior.next(next),
        error => behavior.error(error)
    );
    return behavior;
}

module.exports.toBehavior = toBehavior;
