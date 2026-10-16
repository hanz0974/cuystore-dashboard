import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createBotApi } from './bot-api.mjs';

const token = '123456789:AA_example_token_for_tests_only_12345';
const otherToken = '987654321:AA_another_token_for_tests_only_123';
function makeRequest(url, { method = 'POST', body = {}, headers = {}, raw } = {}) {
  const req = Readable.from([Buffer.from(raw ?? JSON.stringify(body))]);
  Object.assign(req, { url, method, headers: { host: '127.0.0.1:5174', origin: 'http://127.0.0.1:5174', 'content-type':'application/json', ...headers } });
  return req;
}
async function call(api, url, options) {
  const res = { statusCode: 200, headers:{}, setHeader(key,value) { this.headers[key] = value; }, end(text) { this.text = text; } };
  await api(makeRequest(url,options),res);
  return { code: res.statusCode, body: JSON.parse(res.text), headers: res.headers };
}
function setup({ failure, webhook = '', env = {} } = {}) {
  const calls = [];
  const request = async (url, options) => {
    const method = url.split('/').at(-1); calls.push({url,method,body:JSON.parse(options.body)});
    if (failure) return failure(url,method);
    return {ok:true,status:200,json:async()=>({ok:true,result:method === 'getMe' ? {id:123456789,is_bot:true,first_name:'Cuystore Test',username:'cuystore_test_bot'} : method === 'getWebhookInfo' ? {url:webhook,pending_update_count:3} : {message_id:1}})};
  };
  return { api:createBotApi({request,env,now:()=>'2026-10-16T06:00:00.000Z'}),calls };
}
test('connect verifies bot and webhook, returns identity without credentials, disconnect clears memory', async () => {
  const {api,calls} = setup({webhook:'https://private.invalid/hook-secret'});
  const result = await call(api,'/api/bot/connect',{body:{token,adminChatId:'123456789'}});
  assert.equal(result.code,200); assert.equal(result.body.connected,true); assert.equal(result.body.bot.username,'cuystore_test_bot');
  assert.equal(result.body.webhookActive,true); assert.equal(result.body.adminChatId,'123456789');
  assert.deepEqual(calls.map(c=>c.method),['getMe','getWebhookInfo']);
  assert.ok(!JSON.stringify(result).includes(token)); assert.ok(!JSON.stringify(result).includes('hook-secret'));
  assert.equal(result.headers['Cache-Control'],'no-store');
  await call(api,'/api/bot/disconnect');
  const status = await call(api,'/api/bot/status',{method:'GET'});
  assert.equal(status.body.configured,false); assert.equal(calls.length,2);
});
test('connect can use server env and explicit test sends only to configured admin', async () => {
  const {api,calls} = setup({env:{TELEGRAM_BOT_TOKEN:token}});
  await call(api,'/api/bot/connect',{body:{useEnv:true,adminChatId:'123456789'}});
  assert.equal(calls.some(c=>c.method==='sendMessage'),false);
  assert.equal((await call(api,'/api/bot/test')).code,200);
  assert.equal(calls.at(-1).body.chat_id,'123456789');
  assert.equal(calls.at(-1).method,'sendMessage');
});
test('invalid token and admin ID, cross-origin, DNS rebinding, and non-JSON requests never reach Telegram', async () => {
  const {api,calls} = setup();
  assert.equal((await call(api,'/api/bot/connect',{body:{token:'bad'}})).code,400);
  assert.equal((await call(api,'/api/bot/connect',{body:{token,adminChatId:'@someone'}})).code,400);
  for (const headers of [{origin:'https://evil.invalid'},{host:'evil.invalid:5174'},{'sec-fetch-site':'cross-site'},{'content-type':'text/plain'}]) assert.ok((await call(api,'/api/bot/connect',{body:{token},headers})).code>=400);
  assert.equal((await call(api,'/api/bot/connect',{raw:'{'})).code,400);
  assert.equal((await call(api,'/api/bot/connect',{raw:' '.repeat(9000)})).code,413);
  assert.equal(calls.length,0);
});
test('failed token replacement preserves previous connection and upstream errors are redacted', async () => {
  let fail = false;
  const api = createBotApi({env:{},request:async()=> {
    if(fail) throw new Error(`failed request https://api.telegram.org/bot${otherToken}/getMe`);
    return {ok:true,status:200,json:async()=>({ok:true,result:{id:123456789,is_bot:true,first_name:'Test',username:'test_bot'}})};
  }});
  await call(api,'/api/bot/connect',{body:{token}}); fail = true;
  const result = await call(api,'/api/bot/connect',{body:{token:otherToken}});
  assert.equal(result.code,502); assert.ok(!JSON.stringify(result).includes(otherToken));
  assert.equal((await call(api,'/api/bot/status',{method:'GET'})).body.connected,true);
  assert.equal((await call(api,'/api/bot/check')).code,502);
  assert.equal((await call(api,'/api/bot/status',{method:'GET'})).body.connected,false);
});
test('test message requires connection and admin recipient; rejected token does not connect', async () => {
  const {api} = setup();
  assert.equal((await call(api,'/api/bot/test')).code,409);
  await call(api,'/api/bot/connect',{body:{token}});
  assert.equal((await call(api,'/api/bot/test')).code,400);
  const rejected = setup({failure:()=>({ok:false,status:401,json:async()=>({ok:false,error_code:401,description:token})})});
  const result=await call(rejected.api,'/api/bot/connect',{body:{token}});
  assert.equal(result.code,401); assert.ok(!JSON.stringify(result).includes(token));
  assert.equal((await call(rejected.api,'/api/bot/status',{method:'GET'})).body.connected,false);
});
test('serialize connect and disconnect so an older check cannot restore disconnected credentials', async () => {
  let release;
  const wait = new Promise(resolve=>{release=resolve;});
  const api=createBotApi({env:{},request:async()=>{await wait;return {ok:true,status:200,json:async()=>({ok:true,result:{id:123456789,is_bot:true,first_name:'Test',username:'test_bot'}})};}});
  const pending=call(api,'/api/bot/connect',{body:{token}});
  assert.equal((await call(api,'/api/bot/disconnect')).code,409);
  release(); assert.equal((await pending).code,200);
  assert.equal((await call(api,'/api/bot/disconnect')).body.connected,false);
});
