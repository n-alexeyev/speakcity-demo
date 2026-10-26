// ============================================================================
// Speak City · Coach module  (modules/coach.js)
// Adds the features from the "Spanish learners" ad brief on top of the demo,
// without changing how the demo behaves when the module is not used.
//
//  1. Pronunciation drill: a phrase card (English · target phrase · spelled-out
//     pronunciation), the spoken word lights up yellow, first try gets "Casi",
//     the retry gets a green check.
//  2. 3-minute conversation timer inside a place.
//  3. Honest score card after a conversation: score /30, three sub-scores,
//     transcript with the weak words marked, Retry and Continue buttons.
//     Each Retry climbs 12 → 19 → 27.
//  4. NPC names from the brief: café Lucas, pharmacy Emilio, ticket kiosk Imma.
//  5. Auto "shots" for the ad (record with Render video, or capture.py):
//       ?mode=cta-score   plaza + score card climbing 12 → 19 → 27   (0:51)
//       ?mode=cta-cuts    walking into café / pharmacy / ticket kiosk (0:58)
//       ?mode=cta-timer   clock spins to 3 MIN → score card + Retry  (1:01)
//       ?mode=cta-drill   café drill: Vale → Casi → ¡Eso! ✓
//     In ?mode=play the café runs drill + timer + score card for real taps.
//     ?coach=0 switches the whole module off.
//
// Hooks in index.html (3 small edits, all marked "coach hook"):
//   <script src="modules/coach.js"></script> placed BEFORE the main script,
//   boot:  spawn((window.SCX&&SCX.boot())||(...original director...))
//   draw:  last line of draw() calls  window.SCX&&SCX.overlay()
// Everything else uses the demo's own globals (g, W, H, scene, STOPS, ...),
// read lazily at call time.
// ============================================================================
(function(){
'use strict';
const Q=new URLSearchParams(location.search);
if(Q.get('coach')==='0')return;
const MODE=Q.get('mode')||'auto';
const SHOTS={'cta-score':'Ad shot · score climbs (0:51)','cta-cuts':'Ad shot · places = levels (0:58)','cta-timer':'Ad shot · 3 MIN + score (1:01)','cta-drill':'Ad shot · café drill'};
// add the shots to the Mode select (the main script sets its value right after)
{const s=document.getElementById('s_mode');if(s)for(const[k,v]of Object.entries(SHOTS)){const o=document.createElement('option');o.value=k;o.textContent=v;s.appendChild(o);}}

// ------------------------------------------------------------------ content
const DRILL={ // phrase card per dialogue language
 es:{en:'Sounds good',tl:['Vale'],pr:['BAH-leh'],casi:'Casi',ok:'¡Eso!'},
 fr:{en:'Sounds good',tl:["D'accord"],pr:['dah-KOR'],casi:'Presque',ok:'Voilà !'},
 it:{en:'Sounds good',tl:['Va','bene'],pr:['vah','BEH-neh'],casi:'Quasi',ok:'Esatto!'},
 de:{en:'Sounds good',tl:['Alles','klar'],pr:['AH-less','klar'],casi:'Fast',ok:'Genau!'}};
const NAMES={cafe:'Lucas',pharmacy:'Emilio',kiosk:'Imma'};
const LADDER=[12,19,27];                      // score climbs with each retry
const SUB={12:[4,4,4],19:[6,6,7],27:[9,9,9]}; // pronunciation, grammar, fluency (/10)
const WEAK={es:[['leche','LEH-cheh'],['cruasán','krwah-SAHN']],fr:[['crème','krehm'],['croissant','krwah-SAHN']],it:[['cappuccino','kahp-poo-CHEE-noh'],['cornetto','kor-NET-toh']],de:[['Milchkaffee','MILKH-kah-fay'],['Croissant','krwah-SAHN']]};
const TIP={es:'Tip: “¿Me pones un café con leche?” sounds more local than “Un café con leche”.',fr:'Tip: “Je vais prendre un café crème” sounds more natural.',it:'Tip: “Mi fa un cappuccino?” sounds more local.',de:'Tip: “Ich hätte gern einen Milchkaffee” sounds more natural.'};

// ------------------------------------------------------------------ state
const X={drill:null,timer:null,card:null,clock:null,climb:null,tries:0,btns:[]};
const lang=()=>(typeof CFG!=='undefined'&&DRILL[CFG.lang])?CFG.lang:'es';

function applyNames(){for(const[k,n]of Object.entries(NAMES))if(STOPS[k])STOPS[k].npc=n;STOPS.kiosk.label='Tickets';EMO.kiosk='🎟️';}
function loadLucas(){CFG.barista='lucas';return new Promise(r=>{const i=new Image();i.onload=()=>{IMG.cafe_npc=i;r();};i.onerror=()=>r();i.src='assets/sc/cafe_npc_lucas.png';});}
function buildCity(){for(const b of B){b.t0=-9;b.landed=true;}pinsT0=-9;hud.show=-9;}

// ------------------------------------------------------------------ drill (generator, used by the shot and by play mode)
function* drillRun(){const d=DRILL[lang()];X.drill={t0:now,word:-1,syl:-1,state:'idle',chk:0};
  const lightWords=function*(dur){const n=d.tl.length;for(let i=0;i<n;i++){X.drill.word=i;X.drill.syl=-1;yield* wait(dur/n);}X.drill.word=-1;};
  const lightSyl=function*(w,dur){const n=d.pr[w].split('-').length;for(let s=0;s<n;s++){X.drill.word=w;X.drill.syl=s;yield* wait(dur/n);}X.drill.word=-1;X.drill.syl=-1;};
  yield* wait(.5);
  scene.npcLine={text:d.tl.join(' ')+'.',t0:now};yield* lightWords(.8);yield* wait(.3);
  // first try: close, but not quite
  scene.mic=1;scene.me={text:d.tl.join(' ')+'.',t0:now,speaking:true};yield* lightWords(.9);scene.me.speaking=false;scene.me.tText=now;scene.mic=0;yield* wait(.3);
  X.drill.state='casi';X.drill.tCasi=now;scene.npcLine={text:d.casi+'. '+d.pr.join(' ')+'.',t0:now};yield* wait(.45);
  yield* lightSyl(d.tl.length-1,1.0);yield* wait(.2);scene.me=null;
  // retry: green check
  scene.mic=1;scene.me={text:d.tl.join(' ')+'.',t0:now,speaking:true};yield* lightWords(.9);scene.me.speaking=false;scene.me.tText=now;scene.mic=0;
  X.drill.state='ok';X.drill.chk=now;scene.npcLine={text:d.ok,t0:now};scene.ok=now;burst('coin',W/2,H*.74,10);yield* wait(1.3);
  scene.me=null;scene.ok=0;X.drill=null;}

// ------------------------------------------------------------------ café scene with drill + timer + score card (play mode)
function* enterSceneCoach(b){const st=STOPS[b.t];const d0=doorPt(b,.15);
  yield* walkTo(d0[0],d0[1],2.2);b.glow=1;yield* tween(.35,t=>hero.alpha=1-t);hero.visible=false;
  const p=P(...doorPt(b,0),.6);iris={x:p[0],y:p[1],t0:now,dir:1};yield* wait(.55);
  scene={b,st,t0:now,msgs:[],mic:0,npcT:now};iris={x:W/2,y:H/2,t0:now,dir:-1};X.timer={t0:now,limit:180};yield* wait(.5);iris=null;
  let again=true;
  while(again){
    if(b.t==='cafe')yield* drillRun();
    for(const[npc,me]of L[b.t]){scene.npcLine={text:npc,t0:now};yield* wait(1.05);
      scene.mic=1;scene.me={text:me,t0:now,speaking:true};yield* wait(.95);scene.me.speaking=false;scene.me.tText=now;scene.mic=0;yield* wait(.5);
      scene.ok=now;burst('coin',W/2,H*.74,10);yield* wait(.8);scene.me=null;scene.ok=0;}
    scene.npcLine=null;
    const score=LADDER[Math.min(X.tries,LADDER.length-1)],prev=X.tries?LADDER[Math.min(X.tries-1,LADDER.length-1)]:null;X.tries++;
    X.card={t0:now,score,prev,b,choice:null,interactive:true};
    while(!X.card.choice)yield;
    again=X.card.choice==='retry';X.card=null;if(again){X.timer.t0=now;yield* wait(.3);}}
  X.timer=null;scene.stamp=now;cam.shake=.5;yield* wait(.9);burst('gem',W/2,H*.42,3);yield* wait(.6);
  iris={x:W/2,y:H/2,t0:now,dir:1};yield* wait(.5);scene=null;completeStop(b);
  iris={x:p[0],y:p[1],t0:now,dir:-1};hero.visible=true;yield* tween(.4,t=>{hero.alpha=t;});iris=null;b.glow=0;
  const back=CURVE[hero.ci];yield* walkTo(back[0],back[1],2.4);}

// ------------------------------------------------------------------ ad shots
function* shotScore(){buildCity();cam.z=cam.gz=.82;lookAt(16.5,15.5);cam.x=cam.gx;cam.y=cam.gy;
  ROUTE.slice(0,5).forEach(r=>doneSet.add(r.t));hud.done=hud.prog=5;hero.visible=true;hero.t0=-9;hero.x=FC[0]+2.6;hero.y=FC[1]+2.6;
  yield* wait(.3);cam.gz=.9;X.climb={t0:now,steps:[[.35,LADDER[0]],[1.35,LADDER[1]],[2.35,LADDER[2]]]};yield* wait(4.2);window.__done=true;}
function* shotCuts(){buildCity();const order=['cafe','pharmacy','kiosk'],greet={cafe:'¡Hola! ¿Qué te pongo?',pharmacy:'Buenas tardes. Dígame.',kiosk:'¡Hola! ¿A dónde vas?'};
  for(const k of order){const b=byT(k);cam.z=cam.gz=1.6;lookAt(b.x+b.w/2,b.y+b.d/2);cam.x=cam.gx;cam.y=cam.gy;b.glow=1;
    yield* wait(.15);const p=P(...doorPt(b,0),.6);iris={x:p[0],y:p[1],t0:now-.15,dir:1};cam.gz=2.2;yield* wait(.35);
    scene={b,st:STOPS[b.t],t0:now,msgs:[],mic:0,npcT:now};iris={x:W/2,y:H/2,t0:now-.1,dir:-1};
    scene.npcLine={text:lang()==='es'?greet[k]:L[k][0][0],t0:now+.1};yield* wait(.4);iris=null;yield* wait(.25);scene=null;b.glow=0;}
  window.__done=true;}
function* shotTimer(){buildCity();cam.z=cam.gz=1.2;lookAt(byT('cafe').x,byT('cafe').y);cam.x=cam.gx;cam.y=cam.gy;
  X.clock={t0:now};yield* wait(1.25);X.card={t0:now,score:LADDER[1],prev:LADDER[0],b:byT('cafe'),choice:null,interactive:false,press:2.2};yield* wait(3.0);window.__done=true;}
function* shotDrill(){buildCity();const b=byT('cafe');scene={b,st:STOPS.cafe,t0:now,msgs:[],mic:0,npcT:now};X.timer={t0:now-23,limit:180};
  yield* drillRun();yield* wait(.4);window.__done=true;}

// ------------------------------------------------------------------ drawing helpers
const ORANGE='#EC6A2C',YEL='#FFC83D',GREEN='#2FA866',RED='#D7311F',PR='#8A5A3C';
function fit(text,weight,size,maxW){g.font=`${weight} ${size}px ${FONT}`;while(g.measureText(text).width>maxW&&size>11){size--;g.font=`${weight} ${size}px ${FONT}`;}return size;}
function drawDrill(){const D=X.drill;if(!D||!scene)return;const d=DRILL[lang()];const pop=eBack(clamp((now-D.t0)/.35));
  const x=40,y=132,w=W-80,h=164;g.save();g.translate(W/2,y+h/2);g.scale(pop,pop);g.translate(-W/2,-(y+h/2));
  const gr=g.createLinearGradient(x,y,x+w,y+h);gr.addColorStop(0,'#F7A928');gr.addColorStop(1,ORANGE);g.shadowColor='rgba(0,0,0,.3)';g.shadowBlur=18;
  g.fillStyle=gr;rr(x,y,w,h,24);g.fill();g.shadowColor='transparent';
  if(D.chk){const f=clamp(1-(now-D.chk)/.7);if(f>0){g.globalAlpha=f;g.fillStyle=GREEN;rr(x,y,w,h,24);g.fill();g.globalAlpha=1;}}
  g.fillStyle='#fff';rr(x+5,y+5,w-10,h-10,20);g.fill();
  g.textAlign='left';g.textBaseline='alphabetic';
  fit(d.en,800,19,w-60);const ew=g.measureText(d.en).width;g.fillStyle='#1d1d1f';g.fillText(d.en,W/2-ew/2,y+40);g.fillRect(W/2-ew/2,y+46,ew,2);
  const fs=fit(d.tl.join(' '),800,38,w-50),sp=g.measureText(' ').width,ws=d.tl.map(s=>g.measureText(s).width);let cx=W/2-(ws.reduce((a,b)=>a+b,0)+sp*(ws.length-1))/2;
  d.tl.forEach((s,i)=>{if(i===D.word){g.fillStyle=YEL;rr(cx-6,y+96-fs*.86,ws[i]+12,fs*1.1,9);g.fill();}g.fillStyle=RED;g.fillText(s,cx,y+96);cx+=ws[i]+sp;});
  fit(d.pr.join(' '),'italic 600',19,w-60);const psp=g.measureText(' ').width,pw=d.pr.map(s=>g.measureText(s).width);let px=W/2-(pw.reduce((a,b)=>a+b,0)+psp*(pw.length-1))/2;
  d.pr.forEach((s,i)=>{if(i===D.word&&D.syl>=0){let sx=px;s.split('-').forEach((part,k,arr)=>{const piece=part+(k<arr.length-1?'-':'');g.fillStyle=k===D.syl?'#1d1d1f':PR;g.fillText(piece,sx,y+134);
        if(k===D.syl)ydot(sx+g.measureText(part).width/2,y+148);sx+=g.measureText(piece).width;});}
    else{g.fillStyle=i===D.word?'#1d1d1f':PR;g.fillText(s,px,y+134);if(i===D.word)ydot(px+pw[i]/2,y+148);}px+=pw[i]+psp;});
  if(D.state==='casi'){const e=eBack(clamp((now-D.tCasi)/.3));g.save();g.font=`800 14px ${FONT}`;const cl=d.casi+' · try again',cw=g.measureText(cl).width+28;g.translate(W/2,y+h);g.scale(e,e);g.fillStyle=ORANGE;rr(-cw/2,-15,cw,30,15);g.fill();g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(cl,0,1);g.restore();}
  if(D.chk){const e=eBack(clamp((now-D.chk)/.35));g.save();g.translate(x+w-12,y+12);g.scale(e,e);g.fillStyle='#fff';g.beginPath();g.arc(0,0,24,0,7);g.fill();g.fillStyle=GREEN;g.beginPath();g.arc(0,0,19,0,7);g.fill();
    g.strokeStyle='#fff';g.lineWidth=5;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(-9,1);g.lineTo(-3,7);g.lineTo(9,-7);g.stroke();g.restore();}
  g.restore();}
function ydot(x,y){g.fillStyle=YEL;g.beginPath();g.arc(x,y,4.5,0,7);g.fill();}
function drawTimer(){if(!X.timer||!scene||X.card)return;const left=Math.max(0,X.timer.limit-(now-X.timer.t0)),m=Math.floor(left/60),s=Math.floor(left%60);
  const txt=`${m}:${String(s).padStart(2,'0')}`;g.save();g.fillStyle='rgba(40,30,20,.55)';rr(W/2-46,90,92,30,15);g.fill();
  g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.arc(W/2-24,105,8,0,7);g.stroke();g.beginPath();g.moveTo(W/2-24,105);g.lineTo(W/2-24+Math.sin(now*2)*5,105-Math.cos(now*2)*5);g.stroke();
  g.fillStyle='#fff';g.font=`700 15px ${MONO}`;g.textAlign='left';g.textBaseline='middle';g.fillText(txt,W/2-10,106);g.restore();
}
function bigNumber(val,x,y,size,col){g.fillStyle=col;g.font=`800 ${size}px ${FONT}`;g.textAlign='right';g.textBaseline='alphabetic';g.fillText(val,x,y);}
function drawClimb(){const C0=X.climb;if(!C0)return;const t=now-C0.t0;const a=eBack(clamp(t/.4));
  let val=C0.steps[0][1],prev=null,tick=0;for(const[s,v]of C0.steps)if(t>=s){prev=val===v?prev:val;val=v;tick=s;}
  const shown=prev==null?val:Math.round(lerp(prev,val,eOut(clamp((t-tick)/.45))));
  const w=320,h=190,x=W/2-w/2,y=H*.62;g.save();g.translate(W/2,y+h/2);g.scale(a,a);g.translate(-W/2,-(y+h/2));
  g.shadowColor='rgba(60,40,20,.3)';g.shadowBlur=24;g.fillStyle='#FFFDF8';rr(x,y,w,h,26);g.fill();g.shadowColor='transparent';
  g.fillStyle=C.mute;g.font=`700 11px ${MONO}`;g.textAlign='left';g.fillText('CONVERSATION SCORE · CAFÉ',x+22,y+32);
  bigNumber(shown,x+150,y+108,64,C.ink);g.fillStyle=C.mute;g.font=`800 24px ${FONT}`;g.textAlign='left';g.fillText('/30',x+154,y+108);
  if(prev!=null&&t-tick<1.2){const e=clamp((t-tick)/.3);g.globalAlpha=e*(1-clamp((t-tick-.8)/.4));g.fillStyle=GREEN;g.font=`800 20px ${FONT}`;g.fillText('+'+(val-prev),x+220,y+80-e*10);g.globalAlpha=1;}
  // three weeks as bars
  C0.steps.forEach(([s,v],i)=>{const on=t>=s,bx=x+40+i*90,bh=on?lerp(4,(v/30)*44,eOut(clamp((t-s)/.4))):4;g.fillStyle=on?(i===2?C.teal:'#C9DCCF'):'#EAE0CC';rr(bx,y+168-bh,58,bh,6);g.fill();
    g.fillStyle=C.mute;g.font=`700 10px ${MONO}`;g.textAlign='center';g.fillText('WEEK '+(i+1),bx+29,y+182);});
  g.restore();}
function drawClock(){const K0=X.clock;if(!K0)return;const t=now-K0.t0,out=X.card?clamp((now-X.card.t0)/.4):0;
  g.save();g.fillStyle=`rgba(27,20,13,${.72*clamp(t/.3)})`;g.fillRect(0,0,W,H);
  const cy=lerp(H*.42,118,eInOut(out)),R=lerp(120,46,eInOut(out));g.translate(W/2,cy);g.scale(eBack(clamp(t/.35)),eBack(clamp(t/.35)));
  g.fillStyle='#FFFDF8';g.beginPath();g.arc(0,0,R,0,7);g.fill();g.strokeStyle=ORANGE;g.lineWidth=R*.08;g.beginPath();g.arc(0,0,R*.92,0,7);g.stroke();
  // 3-minute arc fills while the hand spins
  const sp=eOut(clamp((t-.15)/.9));g.strokeStyle='rgba(236,106,44,.25)';g.lineWidth=R*.5;g.beginPath();g.arc(0,0,R*.45,-Math.PI/2,-Math.PI/2+sp*Math.PI*2*(3/12));g.stroke();
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.strokeStyle='#1d1d1f';g.lineWidth=i%3?R*.02:R*.04;g.beginPath();g.moveTo(Math.sin(a)*R*.72,-Math.cos(a)*R*.72);g.lineTo(Math.sin(a)*R*.82,-Math.cos(a)*R*.82);g.stroke();}
  const ang=sp*(Math.PI*2*3+Math.PI/2);g.strokeStyle='#1d1d1f';g.lineCap='round';g.lineWidth=R*.06;g.beginPath();g.moveTo(0,0);g.lineTo(Math.sin(ang)*R*.62,-Math.cos(ang)*R*.62);g.stroke();
  g.fillStyle=ORANGE;g.beginPath();g.arc(0,0,R*.07,0,7);g.fill();
  if(sp>.95&&out<.5){const e=eBack(clamp((t-1.05)/.3));g.save();g.scale(e,e);g.fillStyle=ORANGE;rr(-62,R+18,124,46,23);g.fill();g.fillStyle='#fff';g.font=`800 24px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText('3 MIN',0,R+42);g.restore();}
  g.restore();}
function drawScoreCard(){const S=X.card;if(!S)return;const t=now-S.t0,e=eOut(clamp(t/.45));const lg=lang(),d=DRILL[lg],lvl=LADDER.indexOf(S.score);
  if(!X.clock){g.fillStyle=`rgba(27,20,13,${.55*e})`;g.fillRect(0,0,W,H);}
  const x=24,w=W-48,h=600,y=H-h-24+(1-e)*H*.6;g.save();
  g.shadowColor='rgba(0,0,0,.35)';g.shadowBlur=26;g.fillStyle='#FFFDF8';rr(x,y,w,h,28);g.fill();g.shadowColor='transparent';
  // header: npc avatar + place
  const npc=IMG[S.b.t+'_npc'];g.save();g.beginPath();g.arc(x+46,y+46,24,0,7);g.fillStyle='#F3E6CF';g.fill();g.clip();if(npc){const s=110/npc.width*(S.b.t==='cafe'?1.4:1);g.drawImage(npc,x+46-npc.width*s/2,y+46-npc.height*s*(S.b.t==='cafe'?.29:.17),npc.width*s,npc.height*s);}g.restore();
  g.fillStyle=C.ink;g.font=`800 18px ${FONT}`;g.textAlign='left';g.textBaseline='alphabetic';g.fillText(STOPS[S.b.t].label+' · '+(NAMES[S.b.t]||STOPS[S.b.t].npc),x+82,y+42);
  g.fillStyle=C.mute;g.font=`700 11px ${MONO}`;g.fillText('3-MIN CONVERSATION · LVL '+(STOPS[S.b.t].lvl||12),x+82,y+60);
  // big score
  const cnt=Math.round(lerp(S.prev??0,S.score,eOut(clamp((t-.3)/.8))));bigNumber(cnt,x+w-70,y+66,48,C.ink);g.fillStyle=C.mute;g.font=`800 18px ${FONT}`;g.textAlign='left';g.fillText('/30',x+w-66,y+66);
  if(S.prev!=null&&t>.9){g.fillStyle=GREEN;g.font=`800 13px ${FONT}`;g.textAlign='right';g.fillText('+'+(S.score-S.prev)+' since last try',x+w-24,y+88);}
  // sub-scores
  const sub=SUB[S.score]||[7,7,7];['Pronunciation','Grammar','Fluency'].forEach((n,i)=>{const yy=y+112+i*30;g.fillStyle=C.ink;g.font=`600 14px ${FONT}`;g.textAlign='left';g.fillText(n,x+24,yy+5);
    g.fillStyle='#EAE0CC';rr(x+150,yy-5,w-220,10,5);g.fill();g.fillStyle=sub[i]>=8?C.teal:sub[i]>=6?'#E0A93A':ORANGE;rr(x+150,yy-5,(w-220)*sub[i]/10*eOut(clamp((t-.4)/.6)),10,5);g.fill();
    g.fillStyle=C.ink;g.font=`800 14px ${FONT}`;g.textAlign='right';g.fillText(sub[i]+'/10',x+w-24,yy+5);});
  // transcript
  g.fillStyle=C.mute;g.font=`700 11px ${MONO}`;g.textAlign='left';g.fillText('TRANSCRIPT',x+24,y+222);g.fillStyle='#EAE0CC';g.fillRect(x+24,y+230,w-48,1);
  const cafe=S.b.t==='cafe',rows=cafe?[['npc',d.tl.join(' ')+'.'],['me',d.tl.join(' ')+'.',lvl<2?d.tl[d.tl.length-1]:null,d.pr[d.pr.length-1]]]:[];
  const weak=WEAK[lg];(L[S.b.t]||[]).forEach(([n,m],i)=>{rows.push(['npc',n]);const wk=cafe&&weak[i]&&lvl<=i;rows.push(['me',m,wk?weak[i][0]:null,wk?weak[i][1]:null]);});
  let ry=y+256;g.save();g.beginPath();g.rect(x,y+234,w,h-340);g.clip();
  for(const[who,text,bad,hint]of rows){const npcRow=who==='npc';g.font=`700 10px ${MONO}`;g.fillStyle=npcRow?C.terra:C.teal;g.fillText(npcRow?(NAMES[S.b.t]||'NPC').toUpperCase():'YOU',x+24,ry);
    g.font=`600 15px ${FONT}`;g.fillStyle=C.ink;const tx=x+92;g.fillText(text,tx,ry);
    if(bad){const i0=text.indexOf(bad);if(i0>=0){const bx=tx+g.measureText(text.slice(0,i0)).width,bw=g.measureText(bad).width;g.strokeStyle=ORANGE;g.lineWidth=2.5;g.beginPath();for(let k=0;k<=bw;k+=4)g.lineTo(bx+k,ry+4+Math.sin(k*.8)*1.5);g.stroke();
      g.font=`700 11px ${FONT}`;g.fillStyle=ORANGE;g.fillText('say '+hint,Math.min(bx,x+w-130),ry+18);ry+=12;}}
    else if(!npcRow){g.fillStyle=GREEN;g.font=`800 14px ${FONT}`;g.textAlign='right';g.fillText('✓',x+w-24,ry);g.textAlign='left';}
    ry+=30;}
  g.restore();
  // honest tip
  g.fillStyle='#F6EEDF';rr(x+20,y+h-104,w-40,40,12);g.fill();g.fillStyle=C.ink;g.font=`600 12.5px ${FONT}`;g.textAlign='left';
  const tip=TIP[lg];const tl=wrap(tip,w-64);tl.slice(0,2).forEach((l,i)=>g.fillText(l,x+32,y+h-87+i*15+(tl.length===1?7:0)));
  // buttons
  const bw=(w-60)/2,by=y+h-54;const pressed=S.press&&t>S.press?eOut(clamp((t-S.press)/.15)):0;
  X.btns=[{id:'retry',x:x+20,y:by,w:bw,h:40},{id:'next',x:x+40+bw,y:by,w:bw,h:40}];
  g.save();const s1=1-pressed*.06;g.translate(x+20+bw/2,by+20);g.scale(s1,s1);g.translate(-(x+20+bw/2),-(by+20));
  g.fillStyle=pressed?'#F3DDD2':'#fff';g.strokeStyle=C.terra;g.lineWidth=2;rr(x+20,by,bw,40,20);g.fill();g.stroke();g.fillStyle=C.terra;g.font=`800 15px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText('↻  Retry',x+20+bw/2,by+21);g.restore();
  g.fillStyle=C.terra;rr(x+40+bw,by,bw,40,20);g.fill();g.fillStyle='#fff';g.font=`800 15px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText('Continue',x+40+bw*1.5,by+21);
  g.restore();}

// ------------------------------------------------------------------ taps on the score card (play mode)
function tapHandler(e){if(!X.card||!X.card.interactive||now-X.card.t0<.5)return;const r=cv.getBoundingClientRect(),sx=(e.clientX-r.left)/r.width*W,sy=(e.clientY-r.top)/r.height*H;
  for(const b of X.btns)if(sx>b.x&&sx<b.x+b.w&&sy>b.y&&sy<b.y+b.h){X.card.choice=b.id==='retry'?'retry':'next';e.stopPropagation();}}

// ------------------------------------------------------------------ public API (called from the demo's hooks)
window.SCX={
  boot(){if(SHOTS[MODE]||MODE==='play')applyNames();
    if(SHOTS[MODE]){const rb=document.getElementById('render');rb.hidden=false;rb.onclick=()=>{const p=new URLSearchParams(location.search);p.set('mode',document.getElementById('s_mode').value);p.set('rec','1');p.set('lang',document.getElementById('s_lang').value);location.search=p.toString();};
      const gen={'cta-score':shotScore,'cta-cuts':shotCuts,'cta-timer':shotTimer,'cta-drill':shotDrill}[MODE];
      return(function*(){let ok=false;loadLucas().then(()=>ok=true);while(!ok)yield;yield* gen();})();}
    if(MODE==='play'){loadLucas();cv.addEventListener('pointerdown',tapHandler,true);enterScene=enterSceneCoach;}
    return null;},
  overlay(){drawDrill();drawTimer();drawClimb();drawClock();drawScoreCard();},
  state:X};
})();
