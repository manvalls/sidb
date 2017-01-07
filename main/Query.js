var promise = require('./requestToPromise'),
    Cursor = require('./Cursor'),
    walk = require('y-walk'),
    source = Symbol(),
    args = Symbol();

class Query{

  constructor(src, ...query){
    this[source] = src;
    this[args] = query;
  }

  openCursor(){
    return Cursor.get( this[source].openCursor(...this[args], ...arguments) );
  }

  openKeyCursor(){
    return Cursor.get( this[source].openKeyCursor(...this[args], ...arguments) );
  }

  get(){
    return promise( this[source].get(...this[args], ...arguments) );
  }

  getKey(){
    return promise( this[source].getKey(...this[args], ...arguments) );
  }

  getAll(){
    return promise( this[source].getAll(...this[args], ...arguments) );
  }

  getAllKeys(){
    return promise( this[source].getAllKeys(...this[args], ...arguments) );
  }

  count(){
    return promise( this[source].count(...this[args], ...arguments) );
  }

  delete(){
    var length = this[args].length || arguments.length;

    if(length && typeof this[source].delete == 'function'){
      return promise( this[source].delete(...this[args], ...arguments) );
    }

    if(!length && typeof this[source].clear == 'function'){
      return promise( this[source].clear(...this[args], ...arguments) );
    }

    return walk(deleteAll, [this]);
  }

  update(handler, thisArg){
    return walk(updateAll, [this, handler, thisArg]);
  }

  forEach(handler, thisArg){
    return walk(forEach, [this, handler, thisArg]);
  }

}

function* deleteAll(query){
  var cursor = yield query.openCursor();

  while(!cursor.ended){
    yield cursor.delete();
    yield cursor.continue();
  }

}

function* updateAll(query, handler, thisArg){
  var cursor = yield query.openCursor();

  while(!cursor.ended){
    yield cursor.update(yield walk(handler, [cursor.value, cursor.key, cursor.primaryKey], thisArg));
    yield cursor.continue();
  }

}

function* forEach(query, handler, thisArg){
  var cursor = yield query.openCursor();

  while(!cursor.ended){
    yield walk(handler, [cursor.value, cursor.key, cursor.primaryKey], thisArg);
    yield cursor.continue();
  }

}

/*/ exports /*/

module.exports = Query;
