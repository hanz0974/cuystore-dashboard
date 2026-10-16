import test from 'node:test';
import assert from 'node:assert/strict';
import { initialMenu, menuError, moveMenuButton, safeMenuUrl } from './menu-model.mjs';

test('reject unsafe links, credentials, duplicate IDs, and incomplete stored buttons', () => {
  assert.equal(menuError(initialMenu), '');
  for (const url of ['javascript:alert(1)', 'data:text/html,hello', 'https://user:secret@example.com', 'not-a-link']) assert.equal(safeMenuUrl(url), false);
  assert.equal(safeMenuUrl('https://t.me/cuystore_bot'), true);
  const link = { ...initialMenu.buttons[0], action:'link', url:'javascript:alert(1)' };
  assert.ok(menuError({ columns:2, buttons:[link] }));
  assert.ok(menuError({ columns:2, buttons:[initialMenu.buttons[0],initialMenu.buttons[0]] }));
  assert.ok(menuError({ columns:2, buttons:[{id:'invalid', label:'Invalid', action:'catalog', visible:true}] }));
});
test('moving preserves hidden state and content without mutating saved menu', () => {
  const config = structuredClone(initialMenu); config.buttons[1].visible = false;
  const moved = moveMenuButton(config, 'howto', -1);
  assert.equal(moved.buttons[0].id, 'howto'); assert.equal(moved.buttons[0].visible, false);
  assert.equal(config.buttons[0].id, 'catalog');
  assert.equal(moveMenuButton(config,'catalog',-1),config);
  assert.equal(moveMenuButton(config,'unknown',1),config);
});
test('require complete content for hidden and visible menu buttons, and allow empty menu', () => {
  assert.equal(menuError({columns:1,buttons:[]}), '');
  assert.ok(menuError({columns:4,buttons:[]}));
  assert.ok(menuError({columns:2,buttons:[{...initialMenu.buttons[1],message:' ',visible:false}]}));
  assert.ok(menuError({columns:2,buttons:Array.from({length:21},(_,i)=>({...initialMenu.buttons[0],id:String(i)}))}));
});
