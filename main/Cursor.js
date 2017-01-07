var walk = require('y-walk'),
    Resolver = require('y-resolver'),
    promise = require('./requestToPromise'),
    cursor = Symbol(),
    resolver = Symbol();

class Cursor{

  static get(cursorRequest){
    var res = new Resolver();
    walk(getCursor, [cursorRequest, res]);
    return res.yielded;
  }

  advance(){
    return call(this, 'advance', arguments);
  }

  continue(){
    return call(this, 'continue', arguments);
  }

  continuePrimaryKey(){
    return call(this, 'continuePrimaryKey', arguments);
  }

  update(){
    assertNotEnded(this);
    return promise( this[cursor].update(...arguments) );
  }

  delete(){
    assertNotEnded(this);
    return promise( this[cursor].delete(...arguments) );
  }

  get key(){
    assertNotEnded(this);
    return this[cursor].key;
  }

  get primaryKey(){
    assertNotEnded(this);
    return this[cursor].primaryKey;
  }

  get value(){
    assertNotEnded(this);
    return this[cursor].value;
  }

  get ended(){
    return !this[cursor];
  }

}

function assertNotEnded(c){
  if(!c[cursor]) throw new Error('The cursor has ended');
}

function call(c, method, args){
  assertNotEnded(c);
  c[cursor][method](...args);
  c[resolver] = new Resolver();
  return c[resolver].yielded;
}

function* getCursor(cursorRequest, res){
  var c = new Cursor(),
      np;

  c[resolver] = res;
  np = promise(cursorRequest);

  do{
    c[cursor] = yield np;
    np = promise(cursorRequest);
    c[resolver].accept(c);
  }while(c[cursor]);

}

/*/ exports /*/

module.exports = Cursor;
