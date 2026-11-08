import WebSocket from 'ws'; import fs from 'fs';
const B='http://127.0.0.1:4104'; const u=process.argv[2]||'a';
const tok=fs.readFileSync(`/tmp/claude-0/r54data/${u}.cj`,'utf8').split('\n').find(l=>l.includes('qa_s')).split('\t')[6].trim();
const ws=new WebSocket(B.replace('http','ws')+'/ws',{headers:{Cookie:'qa_s='+tok,Origin:B}});
ws.on('open',()=>ws.send(JSON.stringify({id:1,t:process.argv[3]||'shop:get',...JSON.parse(process.argv[4]||'{}')})));
ws.on('message',raw=>{const m=JSON.parse(String(raw));if(m.r===1){console.log(process.argv[5]?eval(process.argv[5]):JSON.stringify(m).slice(0,500));ws.close();}});
