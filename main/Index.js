var Query = require('./Query'),
    source = Symbol(),
    parents = Symbol();

class Index extends Query{

  constructor(src, ...p){
    super(src);
    this[source] = src;
    this[parents] = p;
  }

  ge(value){
    return new Query(this[source], IDBKeyRange.lowerBound(value));
  }

  gt(value){
    return new Query(this[source], IDBKeyRange.lowerBound(value, true));
  }

  le(value){
    return new Query(this[source], IDBKeyRange.upperBound(value));
  }

  lt(value){
    return new Query(this[source], IDBKeyRange.upperBound(value, true));
  }

  eq(value){
    return new Query(this[source], IDBKeyRange.only(value));
  }

  between(lowerValue, upperValue, {leftBound = 'closed', rightBound = 'open'} = {}){
    return new Query(this[source], IDBKeyRange.bound(
      lowerValue,
      upperValue,
      leftBound == 'open',
      rightBound != 'closed'
    ));
  }

  remove(){
    var name = this[source].name,
        parent;

    if(this[source].objectStore) this[source].objectStore.deleteIndex(name);
    else if(this[source].transaction) this[source].transaction.db.deleteObjectStore(name);
    for(parent of this[parents]) delete parent[name];
  }

  rename(newName){
    var parent, oldName;

    oldName = this[source].name;
    this[source].name = newName;

    for(parent of this[parents]) delete parent[name];
    for(parent of this[parents]) parent[newName] = this;
  }

  get keyPath(){
    return this[source].keyPath;
  }

  get unique(){
    return this[source].unique || this[source].unique == null;
  }

  get multiEntry(){
    return !!(this[source].multiEntry);
  }

  get autoIncrement(){
    return !!(this[source].autoIncrement);
  }

}

/*/ exports /*/

module.exports = Index;
