'use strict';
let examples=[
{en:'I have many cats.',es:'Yo tengo muchos gatos.',words:['Yo','tengo','muchos','gatos'],distractors:['tienes','somos','perros','gato','tiene','hay','unas','grandes','soy','ellos','pocos','casa','tenemos']},
{en:'She eats an apple.',es:'Ella come una manzana.',words:['Ella','come','una','manzana'],distractors:['Él','comen','un','manzanas','bebe','ellos','tengo','la','comemos','peras','comer','soy']},
{en:'We live in Denmark.',es:'Nosotros vivimos en Dinamarca.',words:['Nosotros','vivimos','en','Dinamarca'],distractors:['Yo','vivo','son','de','Alemania','vivir','tenemos','ellos','viven','un','estamos','casa']},
{en:'Tomorrow I will study Spanish.',es:'Mañana estudiaré español.',words:['Mañana','estudiaré','español'],distractors:['ayer','estudio','inglés','estudiamos','hoy','hablaré','estudias','francés','soy','estudiaba','mañanas']},
{en:'The children are playing in the park.',es:'Los niños juegan en el parque.',words:['Los','niños','juegan','en','el','parque'],distractors:['Las','niñas','juega','con','la','casa','somos','jugamos','están','árbol','ellos','de']}
];
const $=id=>document.getElementById(id);let round=0,step=0,pos=4,board=[],busy=false,voiceOn=true,timeout=null,epoch=0,paused=false;
function shuffled(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function neighbors(p){const r=Math.floor(p/3),c=p%3;return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([y,x])=>y>=0&&y<3&&x>=0&&x<3).map(([y,x])=>y*3+x)}
function makeBoard(){const ex=examples[round];const adj=neighbors(pos);const answerCell=adj[Math.floor(Math.random()*adj.length)];const choices=shuffled((ex.distractors||[]).filter(w=>w!==ex.words[step]));board=Array(9).fill('');let k=0;for(let i=0;i<9;i++){if(i===pos)continue;board[i]=i===answerCell?ex.words[step]:choices.length?choices[k++%choices.length]:"…"}render()}
const catSVG=`<svg class="sprite" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" shape-rendering="crispEdges"><path fill="#d97722" d="M5 7h5v4h3V8h6v3h3V7h5v13h-2v5h-4v3H9v-3H5z"/><path fill="#f5a34d" d="M8 12h16v11H8z"/><path fill="#152238" d="M10 15h4v4h-4zm9 0h4v4h-4z"/><path fill="#fce6bb" d="M14 20h5v4h-5z"/><path fill="#ee7e93" d="M15 20h3v2h-3z"/><path fill="#f2b5ad" d="M7 9h2v3H7zm17 0h2v3h-2z"/><path fill="#e68b35" d="M25 24h4v-3h2v7h-4v-2h-2z"/><path stroke="#ffe4bb" stroke-width="1" d="M12 22H4m17 0h8"/></svg>`;
const mouseSVG=`<svg class="sprite" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" shape-rendering="crispEdges"><path fill="#8494ab" d="M5 8h7v4h7V8h7v8h2v9H4v-9h1z"/><path fill="#b9c7d8" d="M7 10h4v5H7zm13 0h4v5h-4zM7 16h18v8H7z"/><path fill="#233047" d="M10 17h3v3h-3zm10 0h3v3h-3z"/><path fill="#f2a1b2" d="M15 21h3v3h-3z"/><path stroke="#dbe7f1" stroke-width="1" d="M14 24H3m16 0h10"/><path fill="#9ba9bb" d="M26 24h4v2h2v3h-4v-2h-2z"/></svg>`;
const sadCatSVG=`<svg class="sadcat" viewBox="0 0 64 64" shape-rendering="crispEdges" aria-label="Sad orange pixel cat" xmlns="http://www.w3.org/2000/svg"><path fill="#512c28" d="M7 9h12v7h7v-4h12v4h7V9h12v32h-5v9h-8v5H18v-5h-8v-9H7z"/><path fill="#ee8a2b" d="M10 12h7v10h9v-6h12v6h9V12h7v29h-6v9H16v-9h-6z"/><path fill="#ffb35d" d="M15 26h34v17h-5v5H20v-5h-5z"/><path fill="#f6c29d" d="M12 15h5v8h-5zm35 0h5v8h-5z"/><path fill="#a94c37" d="M18 15h5v7h-5zm23 0h5v7h-5z"/><path fill="#513b40" d="M18 30h10v3H18zm18 0h10v3H36z"/><path fill="#241e31" d="M20 33h8v3h-8zm16 0h8v3h-8z"/><path fill="#f4f6fa" d="M21 36h6v5h-6zm16 0h6v5h-6z"/><path fill="#67d5f5" d="M24 39h5v9h-5zm12 0h5v9h-5z"/><path fill="#f9d2a8" d="M27 40h10v8H27z"/><path fill="#8b4d46" d="M29 41h6v3h-6zm-2 6h10v2H27z"/><path fill="#fff0ce" d="M12 43h9v3h-9zm31 0h9v3h-9z"/><path fill="#e56f28" d="M16 49h9v5h-9zm23 0h9v5h-9z"/></svg>`;
function walkCat(from,to,dir){return new Promise(resolve=>{
 const game=document.querySelector('.game'),grid=$('grid'),a=grid.children[from],b=grid.children[to];
 if(!a||!b){resolve();return}
 const root=game.getBoundingClientRect(),r1=a.getBoundingClientRect(),r2=b.getBoundingClientRect();
 const x1=r1.left-root.left+r1.width/2,y1=r1.top-root.top+r1.height/2;
 const x2=r2.left-root.left+r2.width/2,y2=r2.top-root.top+r2.height/2;
 const walker=document.createElement('div');walker.className='walker'+(dir==='left'?' left':'');walker.innerHTML=catSVG;
 walker.style.left=x1+'px';walker.style.top=y1+'px';game.append(walker);a.classList.add('walking');
 const finish=()=>{walker.remove();a.classList.remove('walking');resolve()};
 if(walker.animate){const anim=walker.animate([{left:x1+'px',top:y1+'px'},{left:x2+'px',top:y2+'px'}],{duration:350,easing:'ease-in-out',fill:'forwards'});anim.onfinish=finish;anim.oncancel=finish}
 else{walker.style.transition='left .35s ease-in-out,top .35s ease-in-out';requestAnimationFrame(()=>{walker.style.left=x2+'px';walker.style.top=y2+'px'});setTimeout(finish,370)}
})}
function render(){const ex=examples[round];$('english').textContent=ex.en;$('progress').textContent=`${round+1} / ${examples.length} · ${step}/${ex.words.length}`;$('sentence').replaceChildren();ex.words.forEach((w,i)=>{const span=document.createElement('span');span.className='token'+(i<step?' done':'');span.textContent=i<step?w:'?';$('sentence').append(span)});$('grid').replaceChildren();for(let i=0;i<9;i++){const d=document.createElement('div');d.className='tile'+(i===pos?' player':'')+(neighbors(pos).includes(i)?' reachable':'');d.innerHTML=(i===pos?catSVG:mouseSVG)+(i===pos?'':`<span class="word"></span>`);if(i!==pos)d.querySelector('.word').textContent=board[i];$('grid').append(d)}}
function speak(text){if(voiceOn&&shellSession)return shellSession.speak(text);if(!voiceOn||!('speechSynthesis' in window))return Promise.resolve();return new Promise(resolve=>{const u=new SpeechSynthesisUtterance(text);u.lang=selectedLocale;const match=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase()===selectedLocale.toLowerCase())||speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith(selectedLocale.slice(0,2).toLowerCase()));if(match)u.voice=match;u.rate=.84;let done=false;const finish=()=>{if(!done){done=true;resolve()}};u.onend=finish;u.onerror=finish;window.speechSynthesis.cancel();window.speechSynthesis.speak(u);setTimeout(finish,Math.max(2500,text.length*180))})}
function overlay(content){$('overlayContent').replaceChildren();$('overlayContent').append(content);$('overlay').hidden=false}
function hideOverlay(){$('overlay').hidden=true}
function showNope(){const el=document.createElement('div');el.className='nope-face';el.innerHTML=sadCatSVG+'<span class="big nope">NOPE</span>';overlay(el);clearTimeout(timeout);timeout=setTimeout(hideOverlay,430)}
async function finishSentence(lastWord){busy=true;const token=++epoch;const ex=examples[round];const wrap=document.createElement('div');const line=document.createElement('div');line.className='complete';line.textContent=ex.es;wrap.append(line);overlay(wrap);$('status').textContent='Listening to the final word…';await speak(lastWord);if(token!==epoch)return;await new Promise(r=>setTimeout(r,300));if(token!==epoch)return;$('status').textContent='Listening to the full sentence…';await speak(ex.es);if(token!==epoch)return;await new Promise(r=>setTimeout(r,1300));if(token!==epoch)return;round=(round+1)%examples.length;step=0;pos=4;busy=false;hideOverlay();makeBoard();$('status').textContent='New sentence. Find the first word!'}
async function move(dir){
 if(busy||paused)return;
 const r=Math.floor(pos/3),c=pos%3;
 const delta={up:[-1,0],down:[1,0],left:[0,-1],right:[0,1]}[dir];if(!delta)return;
 const y=r+delta[0],x=c+delta[1];if(y<0||y>2||x<0||x>2)return;
 const dest=y*3+x,word=board[dest],good=word===examples[round].words[step];
 busy=true;const token=epoch,origin=pos;
 await walkCat(origin,dest,dir);if(token!==epoch)return;
 if(good){pos=dest;step++;$('status').textContent=`✓ ${word}`;
  if(step>=examples[round].words.length){render();finishSentence(word)}
  else{makeBoard();await speak(word);if(token===epoch)busy=false}
 }else{
  const target=$('grid').children[dest];target?.classList.add('escape');
  showNope();$('status').textContent='Wrong mouse! Try another direction.';
  await new Promise(resolve=>setTimeout(resolve,440));if(token!==epoch)return;
  await walkCat(dest,origin,dir==='left'?'right':dir==='right'?'left':dir==='up'?'down':'up');
  if(token===epoch){busy=false;render()}
 }
}
function restart(){shellSession?.cancel();paused=false;$('pause').textContent='Pause';epoch++;if('speechSynthesis' in window)window.speechSynthesis.cancel();clearTimeout(timeout);hideOverlay();busy=false;round=0;step=0;pos=4;makeBoard();$('status').textContent='Catch the correct mouse to build the sentence.'}
document.addEventListener('keydown',e=>{if($('preview').hidden===false)return;if(e.key.toLowerCase()==='p'){e.preventDefault();togglePause();return}const map={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};if(map[e.key]){e.preventDefault();move(map[e.key])}});// Swipe on the grid: one cardinal move per gesture, never diagonal.
let touchStart=null;
$('grid').addEventListener('touchstart',e=>{
  if(e.touches.length!==1){touchStart=null;return}
  touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};
},{passive:true});
$('grid').addEventListener('touchend',e=>{
  if(!touchStart||!e.changedTouches.length)return;
  const dx=e.changedTouches[0].clientX-touchStart.x;
  const dy=e.changedTouches[0].clientY-touchStart.y;
  touchStart=null;
  if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;
  move(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));
},{passive:true});
$('grid').addEventListener('touchcancel',()=>{touchStart=null});
function togglePause(){
 if(busy)return;
 paused=!paused;
 $('pause').textContent=paused?'Resume':'Pause';
 $('status').textContent=paused?'Paused':'Swipe to help the cat catch the correct mouse.';
 if(paused){const el=document.createElement('div');el.className='big';el.textContent='PAUSED';overlay(el)}
 else hideOverlay();
}
$('pause').addEventListener('click',togglePause);
$('restart').addEventListener('click',restart);
function setSound(on){voiceOn=on;$('sound-icon').textContent=voiceOn?'🔊':'🔇';$('sound-label').textContent=voiceOn?'Sound On':'Sound Off';$('sound').setAttribute('aria-pressed',String(voiceOn));if(!voiceOn&&'speechSynthesis'in window)window.speechSynthesis.cancel();}
$('sound').addEventListener('click',()=>{setSound(!voiceOn);shellSession?.sound(voiceOn);});

let selectedLocale = 'es-ES';
let shellSession = null;
const game = document.querySelector('main');
$('play').addEventListener('click', () => {
  $('preview').hidden = true;
  game.hidden = false;
  restart();
  $('pause').focus();
});
$('menu').addEventListener('click', () => {
  if (shellSession) { shellSession.menu(); return; }
  restart();
  game.hidden = true;
  $('preview').hidden = false;
  $('play').focus();
});
