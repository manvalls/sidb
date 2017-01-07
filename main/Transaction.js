var Resolver = require('y-resolver'),
    walk = require('y-walk'),
    Store = require('./Store'),
    transaction = Symbol(),
    done = Symbol();

class Transaction{

  constructor(trx){

    this[transaction] = trx;
    this[done] = new Resolver();

    trx.addEventListener('complete', {handleEvent: handleEvent, done: this[done]}, false);
    trx.addEventListener('abort', {handleEvent: handleEvent, done: this[done]}, false);
    trx.addEventListener('error', {handleEvent: handleError, done: this[done]}, false);

  }

  createStore(name){
    var store = this[transaction].db.createObjectStore(...arguments);
    return this[name] = new Store(store, this);
  }

  abort(){
    this[transaction].abort();
    this[done].accept();
  }

  get storeNames(){
    return this[transaction].objectStoreNames;
  }

  done(){
    return this[done].yielded;
  }

  run(cb,args, thisArg){
    return walk(cb, args || [], thisArg || this);
  }

}

function handleEvent(e){
  this.done.accept(e);
}

function handleError(e){
  this.done.reject(e);
}

/*/ exports /*/

module.exports = Transaction;
