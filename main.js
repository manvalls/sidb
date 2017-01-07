var DataBase = require('./main/DataBase'),
    Transaction = require('./main/Transaction'),
    Store = require('./main/Store'),
    Cb = require('y-callback'),
    walk = require('y-walk');

exports.open = walk.wrap(function*(name, options = {}){
  var req, res, trx, store, db, e;

  if(!('version' in options)) options.version = 1;
  req = indexedDB.open(name, options.version);

  if(options.onblocked){
    req.options = options;
    req.onblocked = onblocked;
  }

  res = yield {
    success: req.onsuccess = Cb(),
    error: req.onerror = Cb(),
    upgrade: req.onupgradeneeded = Cb()
  };

  if(res.error) throw res.error;
  db = new DataBase(req.result);

  if(res.upgrade){

    e = res.upgrade[0];
    trx = new Transaction(req.transaction);
    for(store of db.storeNames) trx[store] = new Store(req.transaction.objectStore(store), trx);

    if(options.preupgrade) yield walk(options.preupgrade, [trx, e.oldVersion], options);
    yield walk(upgrade, [trx, options, db]);
    if(options.postupgrade) yield walk(options.postupgrade, [trx, e.oldVersion], options);

    yield req.onsuccess;
    db = new DataBase(req.result);

  }

  return db;
});

function onblocked(e){
  this.options.onblocked(e);
}

function* upgrade(trx, options, db){
  var stores, store, info, index;

  if(options.stores){
    stores = options.stores;

    for(store of db.storeNames){
      if(!stores[store]) trx[store].remove();
      else{
        info = (stores[store] || {}).primaryKey || {};
        if(typeof info == 'string') info = {keyPath: info};
        if(!(
          info.keyPath == trx[store].keyPath &&
          !!(info.autoIncrement) == trx[store].autoIncrement
        )) trx[store].remove();
      }
    }

    for(store of Object.keys(stores)){

      if([...db.storeNames].indexOf(store) == -1){
        info = (stores[store] || {}).primaryKey;
        if(typeof info == 'string') info = {keyPath: info};

        if(info) trx.createStore(store, info);
        else trx.createStore(store);
      }

      for(index of trx[store].indexNames){
        if(!(stores[store] || {})[index]) trx[store][index].remove();
        else{
          info = (stores[store] || {})[index];
          if(typeof info == 'string') info = {keyPath: info};
          if(!(
            info.keyPath == trx[store][index].keyPath &&
            !!(info.unique) == trx[store][index].unique &&
            !!(info.multiEntry) == trx[store][index].multiEntry
          )) trx[store][index].remove();
        }
      }

      for(index of Object.keys(stores[store] || {})) if(index != 'primaryKey'){
        info = (stores[store] || {})[index];
        if(typeof info == 'string') info = {keyPath: info};
        trx[store].createIndex(index, info);
      }

    }

  }

}
