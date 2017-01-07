var promise = require('./requestToPromise'),
    Index = require('./Index'),
    source = Symbol();

class Store extends Index{

  constructor(src, ...parents){
    var index;

    super(src, ...parents);
    this[source] = src;

    for(index of src.indexNames) this[index] = new Index(src.index(index), this);

  }

  add(){
    return promise( this[source].add(...arguments) );
  }

  put(){
    return promise( this[source].put(...arguments) );
  }

  createIndex(name, {keyPath, unique = false, multiEntry = false} = {}){
    var idx = this[source].createIndex(name, keyPath, {unique, multiEntry});
    return this[name] = new Index(idx, this);
  }

  get indexNames(){
    return this[source].indexNames;
  }

}

/*/ exports /*/

module.exports = Store;
