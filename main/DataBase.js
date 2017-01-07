var Resolver = require('y-resolver'),
    Transaction = require('./Transaction'),
    Store = require('./Store'),
    promise = require('./requestToPromise'),
    database = Symbol(),
    done = Symbol(),
    versionChanged = Symbol();

class DataBase{

  constructor(db){

    this[database] = db;
    this[done] = new Resolver();
    this[versionChanged] = new Resolver();

    db.addEventListener('close', {handleEvent: handleEvent, done: this[done]}, false);
    db.addEventListener('abort', {handleEvent: handleEvent, done: this[done]}, false);
    db.addEventListener('error', {handleEvent: handleError, done: this[done]}, false);

    db.addEventListener('versionchange', {handleEvent: handleEvent, done: this[versionChanged]}, false);

  }

  readonly(...stores){
    var trx = this[database].transaction(stores, 'readonly'),
        transaction = new Transaction(trx),
        store;

    for(store of stores) transaction[store] = new Store(trx.objectStore(store), transaction);
    return transaction;
  }

  readwrite(...stores){
    var trx = this[database].transaction(stores, 'readwrite'),
        transaction = new Transaction(trx),
        store;

    for(store of stores) transaction[store] = new Store(trx.objectStore(store), transaction);
    return transaction;
  }

  get storeNames(){
    return this[database].objectStoreNames;
  }

  close(){
    this[database].close();
    this[done].accept();
  }

  remove(){
    return promise( indexedDB.deleteDatabase(this[database].name) );
  }

  versionChanged(){
    return this[versionChanged].yielded;
  }

  done(){
    return this[done].yielded;
  }

}

function handleEvent(e){
  this.done.accept(e);
}

function handleError(e){
  this.done.reject(e);
}

/*/ exports /*/

module.exports = DataBase;
