var {Hybrid} = require('y-setter'),
    walk = require('y-walk'),
    storage = (global.localStorage || {}),
    hybrids = global['Jj7AXnIc1lWd9yT'] = global['Jj7AXnIc1lWd9yT'] || new Map(),
    database = Symbol(),
    databaseName = Symbol(),
    name = Symbol();

class LiveStore{

  constructor(db, dbName, store){
    this[database] = db;
    this[databaseName] = dbName;
    this[name] = store;
  }

  get(key){
    var storageKey = `sidb-live-${this[databaseName]}-${this[name]}`,
        h = new Hybrid(),
        data = {
          db: this[database],
          store: this[name],
          key: key,
          model: h
        };

    if(!hybrids.has(storageKey)) hybrids.set(storageKey, new Set());
    hybrids.get(storageKey).add(data);

    this[database].done().add(h);
    h.frozen().listen(clear, [data, storageKey]);

    return walk(getAndWatch, [data, storageKey]);
  }

}

function* getAndWatch(data, storageKey){
  yield walk(getFromDB, [data]);
  data.model.observe(data.model.value, watcher, storageKey, data);
  return data.model;
}

function* getFromDB({db, store, key, model}){
  model.value = yield db.readonly(store)[store].get(key);
}

function updateAll({key, skip}){
  var data;
  for(data of hybrids.get(key) || []) if(data != skip) walk(getFromDB, [data]);
}

function* watcher(v, ov, d, storageKey, data){
  var {db, store, key} = data,
      st = db.readwrite(store)[store];

  if(st.keyPath) yield st.put(v);
  else yield st.put(v, key);
  updateAll({key: storageKey, skip: data});
  storage[storageKey] = Date.now();
}

function clear(data, storageKey){
  var list = hybrids.get(storageKey) || new Set();
  list.delete(data);
  if(!list.size) hybrids.delete(storageKey);
}

if(!global['SCrGTGsKOkb9msW']){

  for(let key of Object.keys(storage)){
    if(key.match(/^sidb-live-/) && parseInt(storage[key]) < Date.now() - 1e7) delete storage[key];
  }

  window.addEventListener('storage',updateAll,false);
  global['SCrGTGsKOkb9msW'] = true;

}

/*/ exports /*/

module.exports = LiveStore;
