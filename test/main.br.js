var assert = require('assert'),
    t = require('u-test'),
    Cb = require('y-callback'),
    sidb = require('../main');

t('Normal DB operations',function*(){
  var db = yield sidb.open('normal',{
    version: 1,
    stores: {
      pets: {
        primaryKey: {
          autoIncrement: true,
          keyPath: 'id'
        },
        name: 'name',
        age: 'age'
      }
    }
  });

  var trx = db.readwrite('pets'),
      {pets} = trx;

  yield pets.add({name: 'figaro', age: 5});
  yield pets.add({name: 'pluto', age: 2});
  var whiskers = yield pets.put({name: 'whiskers', age: 1});

  assert.strictEqual( ( yield pets.age.eq(5).get() ).name, 'figaro' );
  assert.strictEqual( ( yield pets.age.eq(2).get() ).name, 'pluto' );
  assert.strictEqual( ( yield pets.age.eq(1).get() ).name, 'whiskers' );

  yield pets.age.eq(5).update(pet => {
    pet.name = 'paws';
    return pet;
  });

  assert.strictEqual( ( yield pets.age.eq(5).get() ).name, 'paws' );
  assert.strictEqual( ( yield pets.age.eq(2).get() ).name, 'pluto' );
  assert.strictEqual( ( yield pets.age.eq(1).get() ).name, 'whiskers' );

  yield pets.age.gt(1).delete();

  assert.strictEqual( ( yield pets.age.eq(5).get() ), undefined );
  assert.strictEqual( ( yield pets.age.eq(2).get() ), undefined );
  assert.strictEqual( ( yield pets.age.eq(1).get() ).name, 'whiskers' );

  yield pets.add({name: 'figaro', age: 5});
  yield pets.add({name: 'pluto', age: 2});

  assert.strictEqual( ( yield pets.age.eq(5).get() ).name, 'figaro' );
  assert.strictEqual( ( yield pets.age.eq(2).get() ).name, 'pluto' );
  assert.strictEqual( ( yield pets.age.eq(1).get() ).name, 'whiskers' );

  assert.deepEqual(
    ( yield pets.age.ge(2).getAll() ).map(pet => pet.name),
    ['pluto','figaro']
  );

  assert.deepEqual(
    ( yield pets.age.le(2).getAll() ).map(pet => pet.name),
    ['whiskers', 'pluto']
  );

  assert.deepEqual(
    ( yield pets.age.lt(2).getAll() ).map(pet => pet.name),
    ['whiskers']
  );

  assert.deepEqual(
    ( yield pets.age.between(0,5).getAll() ).map(pet => pet.name),
    ['whiskers', 'pluto']
  );

  assert.deepEqual(yield pets.age.getAllKeys(), [
    yield pets.age.eq(1).getKey(),
    yield pets.age.eq(2).getKey(),
    yield pets.age.eq(5).getKey()
  ]);

  var names = [];
  yield pets.age.forEach(pet => names.push(pet.name));
  assert.deepEqual(names, ['whiskers', 'pluto', 'figaro']);

  var cursor = yield pets.name.openKeyCursor();

  assert.strictEqual(cursor.key, 'figaro');
  yield cursor.advance(2);

  assert.strictEqual(cursor.key, 'whiskers');
  assert.strictEqual(cursor.primaryKey, whiskers);

  assert.strictEqual(yield pets.age.between(0,5).count(), 2);
  yield pets.eq(whiskers).delete();
  assert.strictEqual(yield pets.age.between(0,5).count(), 1);

  yield pets.delete();
  yield trx.done();

  yield db.readonly('pets').run(function*(){
    var {pets} = this;

    assert.strictEqual( ( yield pets.age.eq(5).get() ), undefined );
    assert.strictEqual( ( yield pets.age.eq(2).get() ), undefined );
    assert.strictEqual( ( yield pets.age.eq(1).get() ), undefined );

    assert.deepEqual(this.storeNames, ['pets']);
    this.abort();
    yield this.done();

  });

  var removal = db.remove();

  yield db.versionChanged();
  db.close();
  yield db.done();

  yield removal;

});

t('Version change', function*(){
  var onblocked = Cb();
  var db1 = yield sidb.open('vchange', {

    stores: {
      sample: {
        index: 'index1',
        primaryKey: {
          keyPath: 'sample',
          autoIncrement: true
        }
      }
    },

    postupgrade: function(trx, oldVersion){
      assert(!oldVersion);
      assert(!!trx.sample);
      assert(trx.sample.autoIncrement);
      assert.strictEqual(trx.sample.keyPath, 'sample');
      assert.strictEqual(trx.sample.index.keyPath, 'index1');
    }

  });


  var db2 = sidb.open('vchange', {

    version: 2,

    stores: {
      sample: {
        index: 'index2',
        primaryKey: {
          keyPath: 'sample',
          autoIncrement: false
        }
      }
    },

    onblocked,

    preupgrade: function(trx, oldVersion){
      assert.strictEqual(oldVersion,1);
      assert(!!trx.sample);
      assert(trx.sample.autoIncrement);
      assert.strictEqual(trx.sample.keyPath, 'sample');
      assert.strictEqual(trx.sample.index.keyPath, 'index1');
    },

    postupgrade: function(trx, oldVersion){
      assert.strictEqual(oldVersion,1);
      assert(!!trx.sample);
      assert(!trx.sample.autoIncrement);
      assert.strictEqual(trx.sample.keyPath, 'sample');
      assert.strictEqual(trx.sample.index.keyPath, 'index2');
    }

  });

  yield onblocked;
  db1.close();
  (yield db2).close();

  (yield sidb.open('vchange', {

    version: 3,

    stores: {
      sample2: {
        index: 'index2',
        primaryKey: {
          keyPath: 'sample',
          autoIncrement: false
        }
      }
    },

    preupgrade: function(trx, oldVersion){
      assert.strictEqual(oldVersion,2);
      assert(!!trx.sample);
      assert(!trx.sample.autoIncrement);
      assert.strictEqual(trx.sample.keyPath, 'sample');
      assert.strictEqual(trx.sample.index.keyPath, 'index2');

      trx.sample.rename('sample2');
    },

    postupgrade: function(trx, oldVersion){
      assert.strictEqual(oldVersion,2);
      assert(!trx.sample);
      assert(!!trx.sample2);
      assert(!trx.sample2.autoIncrement);
      assert.strictEqual(trx.sample2.keyPath, 'sample');
      assert.strictEqual(trx.sample2.index.keyPath, 'index2');
    }

  })).close();

  (yield sidb.open('vchange', {

    version: 4,

    stores: {
      sample: {
        index: 'index2',
        primaryKey: {
          keyPath: 'sample',
          autoIncrement: false
        }
      }
    },

    preupgrade: function(trx, oldVersion){
      assert.strictEqual(oldVersion,3);
      assert(!!trx.sample2);
      assert(!trx.sample);
      assert(!trx.sample2.autoIncrement);
      assert.strictEqual(trx.sample2.keyPath, 'sample');
      assert.strictEqual(trx.sample2.index.keyPath, 'index2');
    },

    postupgrade: function(trx, oldVersion){
      assert.strictEqual(oldVersion,3);
      assert(!!trx.sample);
      assert(!trx.sample2);
      assert(!trx.sample.autoIncrement);
      assert.strictEqual(trx.sample.keyPath, 'sample');
      assert.strictEqual(trx.sample.index.keyPath, 'index2');
    }

  })).close();

  (yield sidb.open('vchange', {

    version: 5,

    stores: {
      sample: {
        index2: 'index2',
        primaryKey: {
          keyPath: 'sample',
          autoIncrement: false
        }
      }
    },

    preupgrade: function(trx, oldVersion){
      assert.strictEqual(oldVersion,4);
      assert(!!trx.sample);
      assert(!trx.sample2);
      assert(!trx.sample.autoIncrement);
      assert.strictEqual(trx.sample.keyPath, 'sample');
      assert.strictEqual(trx.sample.index.keyPath, 'index2');
    },

    postupgrade: function(trx, oldVersion){
      assert.strictEqual(oldVersion,4);
      assert(!!trx.sample);
      assert(!trx.sample2);
      assert(!trx.sample.autoIncrement);
      assert(!trx.sample.index);
      assert.strictEqual(trx.sample.keyPath, 'sample');
      assert.strictEqual(trx.sample.index2.keyPath, 'index2');
    }

  })).close();

  (yield sidb.open('vchange', {

    version: 6,

    stores: {
      sample: {
        index2: 'index3',
        primaryKey: {
          keyPath: 'sample',
          autoIncrement: false
        }
      }
    },

    preupgrade: function(trx, oldVersion){
      assert.strictEqual(oldVersion,5);
      assert(!!trx.sample);
      assert(!trx.sample2);
      assert(!trx.sample.autoIncrement);
      assert.strictEqual(trx.sample.keyPath, 'sample');
      assert.strictEqual(trx.sample.index2.keyPath, 'index2');
    },

    postupgrade: function(trx, oldVersion){
      assert.strictEqual(oldVersion,5);
      assert(!!trx.sample);
      assert(!trx.sample2);
      assert(!trx.sample.autoIncrement);
      assert(!trx.sample.index);
      assert.strictEqual(trx.sample.keyPath, 'sample');
      assert.strictEqual(trx.sample.index2.keyPath, 'index3');
    }

  })).close();

  (yield sidb.open('vchange', {

    version: 7,

    stores: {
      sample: {
        index2: 'index3'
      }
    },

    preupgrade: function(trx, oldVersion){
      assert.strictEqual(oldVersion,6);
      assert(!!trx.sample);
      assert(!trx.sample2);
      assert(!trx.sample.autoIncrement);
      assert(!trx.sample.index);
      assert.strictEqual(trx.sample.keyPath, 'sample');
      assert.strictEqual(trx.sample.index2.keyPath, 'index3');
    },

    postupgrade: function(trx, oldVersion){
      assert.strictEqual(oldVersion,6);
      assert(!!trx.sample);
      assert(!trx.sample2);
      assert(!trx.sample.autoIncrement);
      assert(!trx.sample.index);
      assert.strictEqual(trx.sample.keyPath, null);
      assert.strictEqual(trx.sample.index2.keyPath, 'index3');
    }

  })).close();

});

t('LiveStore', function*(){
  var db = yield sidb.open('live', {
    stores: {liveStore: {}}
  });

  var h1 = yield db.live('liveStore').get('sample');
  var h2 = yield db.live('liveStore').get('sample');

  assert.strictEqual(h1.value, undefined);
  yield h1.is(h2);

  h1.value = 'foo';
  yield h1.is(h2);

  h2.value = 'bar';
  yield h1.is(h2);

  db.close();

  db = yield sidb.open('live', {
    stores: {liveStore: {}}
  });

  h1 = yield db.live('liveStore').get('sample');
  h2 = yield db.live('liveStore').get('sample');

  assert.strictEqual(h1.value, 'bar');
  yield h1.is(h2);

});
