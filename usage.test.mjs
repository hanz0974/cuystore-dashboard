import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createUsageStore} from './usage.mjs';
import {createBot} from './bot.mjs';
test('usage survives reload, isolates users and marks missing fields',()=>{
 const dir=mkdtempSync(join(tmpdir(),'bot-usage-'));
 try {
 const path=join(dir,'usage.json'); const s=createUsageStore(path);
 s.record(42,{prompt_tokens:100,completion_tokens:20,total_tokens:120});
 s.record(42,{input_tokens:5,output_tokens:2}); s.record(42,{});
 s.record(99,{prompt_tokens:900,completion_tokens:100});
 const report=createUsageStore(path).report(42);
 assert.match(report,/Input tercatat: 105/); assert.match(report,/Output tercatat: 22/);
 assert.match(report,/Total tercatat: 127/); assert.match(report,/tidak lengkap: 1/);
 writeFileSync(path,'invalid'); assert.throws(()=>createUsageStore(path),/Tidak bisa membaca/);
 } finally {rmSync(dir,{recursive:true,force:true});}
});
test('usage counted before Telegram delivery; reset preserves usage; unauthorized blocked',async()=>{
 const store=createUsageStore(); const sent=[]; let fail=true;
 const bot=createBot({TELEGRAM_ALLOWED_USER_IDS:'42',NINE_ROUTER_MODEL:'x'},async(url,options)=>{
 const body=JSON.parse(options.body); let data={ok:true,result:{}};
 if(url.endsWith('/chat/completions')) data={choices:[{message:{content:'answer'}}],usage:{prompt_tokens:10,completion_tokens:5,total_tokens:15}};
 if(url.endsWith('/sendMessage')) {if(body.text==='answer' && fail) throw Error('delivery'); sent.push(body.text);}
 return {ok:true,status:200,json:async()=>data};
 },store);
 const m=(text,id=42)=>({text,from:{id},chat:{id,type:'private'}});
 await assert.rejects(bot.handle(m('hello'))); fail=false;
 await bot.handle(m('/reset')); await bot.handle(m('/usage'));
 assert.match(sent.at(-1),/Total tercatat: 15/);
 await bot.handle(m('/usage',99)); assert.doesNotMatch(sent.at(-1),/Total tercatat/);
});
