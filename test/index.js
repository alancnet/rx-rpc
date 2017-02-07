'use strict';
const rx = require('rxjs');
const Observable = rx.Observable;
const chai = require('chai');
chai.config.includeStack = true;
global.expect = chai.expect;


const RxRpc = require('..').RxRpc;
describe('something', () => {
    it('should return non-observable data types as Observable.of', () => {
        const logic = {
            echo(v) {
                return v;
            }
        };
        const left = new RxRpc({provider: logic});
        const right = new RxRpc({provider: logic});
        left.couple(right);
        var ret = null;
        left.call('echo', 1).forEach(r => ret = r);
        expect(ret).to.equal(1);
    });

    it('should pipe returned observables', () => {
        const logic = {
            echo(v) {
                return Observable.of(v).repeat().take(100);
            }
        };
        const left = new RxRpc({provider: logic});
        const right = new RxRpc({provider: logic});
        left.couple(right);
        var ret = [];
        left.call('echo', 1).take(5).forEach(r => ret.push(r));
        expect(ret.join(',')).to.equal('1,1,1,1,1');
    });

    it('should pipe passed observables', () => {
        const left = new RxRpc({provider: {

        }});
        const right = new RxRpc({provider: {
            splitStrings(obsOfStrings) {
                return obsOfStrings.map(str => Observable.from(str.split('')));
            }
        }});

        left.couple(right);
        let count = 0;
        left.call('splitStrings', Observable.from(['Hello', 'World'])).subscribe(result => {
            result.forEach(c => count++);
        })
        expect(count).to.equal(10);

    })
    it('should remove completed observables', () => {
        const left = new RxRpc({provider: {

        }});
        const right = new RxRpc({provider: {
            splitStrings(obsOfStrings) {
                return obsOfStrings.map(str => Observable.from(str.split('')));
            }
        }});

        left.couple(right);
        let count = 0;
        left.call('splitStrings', Observable.from(['Hello', 'World'])).subscribe(result => {
            result.forEach(c => count++);
        })
        expect(Object.keys(right.observables).length).to.equal(0);
        expect(Object.keys(left.streams).length).to.equal(0);
        expect(Object.keys(right.subscriptions).length).to.equal(0);

    })
})
