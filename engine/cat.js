'use strict';
let examples=[
{en:'I have many cats.',es:'Yo tengo muchos gatos.',words:['Yo','tengo','muchos','gatos'],distractors:['tienes','somos','perros','gato','tiene','hay','unas','grandes','soy','ellos','pocos','casa','tenemos']},
{en:'She eats an apple.',es:'Ella come una manzana.',words:['Ella','come','una','manzana'],distractors:['Él','comen','un','manzanas','bebe','ellos','tengo','la','comemos','peras','comer','soy']},
{en:'We live in Denmark.',es:'Nosotros vivimos en Dinamarca.',words:['Nosotros','vivimos','en','Dinamarca'],distractors:['Yo','vivo','son','de','Alemania','vivir','tenemos','ellos','viven','un','estamos','casa']},
{en:'Tomorrow I will study Spanish.',es:'Mañana estudiaré español.',words:['Mañana','estudiaré','español'],distractors:['ayer','estudio','inglés','estudiamos','hoy','hablaré','estudias','francés','soy','estudiaba','mañanas']},
{en:'The children are playing in the park.',es:'Los niños juegan en el parque.',words:['Los','niños','juegan','en','el','parque'],distractors:['Las','niñas','juega','con','la','casa','somos','jugamos','están','árbol','ellos','de']}
];
const $=id=>document.getElementById(id);let round=0,step=0,pos=4,board=[],busy=false,voiceOn=true,timeout=null,epoch=0,paused=false;
const lifecycle=BTSentenceLifecycle.create({
 canPause:()=>!document.querySelector('main').hidden,
 label:on=>{$('pause').textContent=on?'Resume':'Pause';$('pause').setAttribute('aria-pressed',String(on))},
 cancelVoice:()=>{shellSession?.cancel();window.speechSynthesis?.cancel()},
 pause:()=>{paused=true;touchStart=null;activeJump?.pause()},
 resume:()=>{paused=false;touchStart=null;activeJump?.resume()}
});
async function ready(token){return token===epoch&&await lifecycle.checkpoint()&&token===epoch}
function shuffled(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function neighbors(p){const r=Math.floor(p/3),c=p%3;return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([y,x])=>y>=0&&y<3&&x>=0&&x<3).map(([y,x])=>y*3+x)}
function makeBoard(){const ex=examples[round];const adj=neighbors(pos);const answerCell=adj[Math.floor(Math.random()*adj.length)];const choices=shuffled((ex.distractors||[]).filter(w=>w!==ex.words[step]));board=Array(9).fill('');let k=0;for(let i=0;i<9;i++){if(i===pos)continue;board[i]=i===answerCell?ex.words[step]:choices.length?choices[k++%choices.length]:"…"}render()}
const catSVG=`<svg class="sprite" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" shape-rendering="crispEdges">
<path fill="#181d29" d="M12 3h5v3h4v5h4v3h14v-3h5V6h4V3h5v25h-3v7h-5v7h4v12h-3v7H16v-4h-5V43h4v-8h-5v-7H8V11h4zM49 39h7v-8h6v18h-3v7H47v-6h7v-6h-5z"/>
<path fill="#a6521d" d="M13 11h5v5h7v3h14v-3h8v-5h3v16h-4v8H17v-8h-5zM18 36h24v6h4v12h-5v4H20v-4h-5V44h3zM55 35h4v14h-4v4h-7v-4h7z"/>
<path fill="#df852c" d="M14 8h3v7h5v5h21v-5h5V8h2v18h-5v8H17v-8h-5V16h2zM20 35h20v7h4v11H18V42h2z"/>
<path fill="#f4ad4e" d="M17 19h29v9h-4v6H20v-5h-5v-8h2zM19 42h7v12h-7zM36 42h6v12h-6z"/>
<path fill="#e8a0a1" d="M14 9h3v6h4v4h-7zM48 9h2v10h-8v-4h6z"/>
<path fill="#8b451f" d="M26 17h4v7h-4zm7 0h4v7h-4zM12 25h7v3h-7zm0 6h9v3h-8zm30-6h8v3h-8zm-1 6h8v3h-8zM18 43h5v3h-5zm0 7h5v3h-5zm20-7h6v3h-6zm0 7h6v3h-6zM55 39h4v4h-4zm-6 10h6v4h-6z"/>
<path fill="#fff1d5" d="M20 24h9v10h-9zm15 0h9v10h-9zM25 31h13v7H25zM24 37h14v7h-3v5h-8v-5h-3zM19 54h9v4h-9zm15 0h9v4h-9z"/>
<path fill="#1d2935" d="M23 25h5v8h-5zm13 0h5v8h-5zM30 34h3v3h-3zm-5 3h5v2h-5zm8 0h5v2h-5zM28 49h3v9h-3zm4 0h3v9h-3z"/>
<path fill="#ffffff" d="M23 25h2v3h-2zm13 0h2v3h-2z"/>
<path fill="#dc8b94" d="M29 32h6v3h-2v2h-2v-2h-2z"/>
<path fill="#f5dec0" d="M15 33h8v1h-8zm0 3h8v1h-8zm25-3h9v1h-9zm0 3h9v1h-9z"/>
</svg>`;
const mouseSVG=`<svg class="sprite" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" shape-rendering="crispEdges">
<path fill="#30394c" d="M20 22v-8h4V8h12v3h6v10h4v5h5v7h6v8h-5v7h-7v8H23v-3h-8v-4h-5V35h4v-8h6z"/>
<path fill="#e59a9d" d="M13 46H8v8h5v3h19v3h6v3h-4v-3H12v-3H5v-5H2v-8h5v-5h6v4H8v3h5z"/>
<path fill="#8997ac" d="M17 29h7V18h4v-6h9v5h3v9h6v7h6v8h-5v6H36v6H23v-4h-8V37h2z"/>
<path fill="#c1cbd7" d="M20 30h12v-4h10v7h8v8h-7v7H30v4h-7v-5h-8v-9h5z"/>
<path fill="#a9b5c4" d="M17 33h6v12h-6zm8-17h3v-4h8v4h4v9h-5v3h-8v-4h-2z"/>
<path fill="#efb0b1" d="M28 17h8v3h2v5h-4v2h-6v-3h-2v-4h2z"/>
<path fill="#718198" d="M23 38h5v3h4v7h-4v4h-5v-4h4v-7h-4zM35 48h6v5h-6z"/>
<path fill="#252b39" d="M41 31h5v7h-5zm9 9h6v3h-6zm-5 5h7v2h-7z"/>
<path fill="#ffffff" d="M41 31h2v3h-2z"/>
<path fill="#f0a2ac" d="M53 37h6v4h-6zM22 53h11v3H22zm14-1h9v4h-9z"/>
<path fill="#dae2e9" d="M54 41h9v1h-9zm-1 3h9v1h-9zm1-6h9v1h-9z"/>
</svg>`;
const sadCatSVG=`<svg class="sadcat" viewBox="0 0 64 64" shape-rendering="crispEdges" aria-label="Sad orange pixel cat" xmlns="http://www.w3.org/2000/svg"><path fill="#512c28" d="M7 9h12v7h7v-4h12v4h7V9h12v32h-5v9h-8v5H18v-5h-8v-9H7z"/><path fill="#ee8a2b" d="M10 12h7v10h9v-6h12v6h9V12h7v29h-6v9H16v-9h-6z"/><path fill="#ffb35d" d="M15 26h34v17h-5v5H20v-5h-5z"/><path fill="#f6c29d" d="M12 15h5v8h-5zm35 0h5v8h-5z"/><path fill="#a94c37" d="M18 15h5v7h-5zm23 0h5v7h-5z"/><path fill="#513b40" d="M18 30h10v3H18zm18 0h10v3H36z"/><path fill="#241e31" d="M20 33h8v3h-8zm16 0h8v3h-8z"/><path fill="#f4f6fa" d="M21 36h6v5h-6zm16 0h6v5h-6z"/><path fill="#67d5f5" d="M24 39h5v9h-5zm12 0h5v9h-5z"/><path fill="#f9d2a8" d="M27 40h10v8H27z"/><path fill="#8b4d46" d="M29 41h6v3h-6zm-2 6h10v2H27z"/><path fill="#fff0ce" d="M12 43h9v3h-9zm31 0h9v3h-9z"/><path fill="#e56f28" d="M16 49h9v5h-9zm23 0h9v5h-9z"/></svg>`;
let activeJump = null;
function walkCat(from, to, dir) {
 return new Promise(resolve => {
  const game = document.querySelector('.game'), grid = $('grid');
  const origin = grid.children[from], target = grid.children[to];
  if (!origin || !target) { resolve(); return; }
  const root = game.getBoundingClientRect(), first = origin.getBoundingClientRect(), last = target.getBoundingClientRect();
  const x1 = first.left - root.left + first.width / 2, y1 = first.top - root.top + first.height / 2;
  const x2 = last.left - root.left + last.width / 2, y2 = last.top - root.top + last.height / 2;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lift = reduced ? 0 : Math.min(46, Math.max(18, first.height * .25));
  const walker = document.createElement('div');
  walker.className = 'walker' + (dir === 'left' ? ' left' : '') + (reduced ? ' reduced' : '');
  walker.innerHTML = catSVG;
  walker.style.left = x1 + 'px'; walker.style.top = y1 + 'px';
  game.append(walker); origin.classList.add('walking');
  let finished = false, timer;
  const finish = () => {
   if (finished) return;
   finished = true; timer?.cancel();
   walker.remove(); origin.classList.remove('walking');
   if (activeJump?.finish === finish) activeJump = null;
   resolve();
  };
  if (walker.animate) {
   const frames = [0, .2, .5, .8, 1].map(progress => ({
    left: (x1 + (x2 - x1) * progress) + 'px',
    top: (y1 + (y2 - y1) * progress - Math.sin(Math.PI * progress) * lift) + 'px',
    offset: progress,
   }));
   const animation = walker.animate(frames, {duration: reduced ? 100 : 420, easing: 'linear', fill: 'forwards'});
   activeJump = {finish, cancel: () => animation.cancel(), pause:()=>animation.pause(), resume:()=>animation.play()};
   animation.onfinish = finish; animation.oncancel = finish;
  } else {
   walker.style.left = x2 + 'px'; walker.style.top = y2 + 'px';
   activeJump = {finish, cancel: finish, pause(){}, resume(){}};
   timer = lifecycle.after(finish, 100);
  }
 });
}
function render(){const ex=examples[round];$('english').textContent=ex.en;$('progress').textContent=`${round+1} / ${examples.length} · ${step}/${ex.words.length}`;$('sentence').replaceChildren();ex.words.forEach((w,i)=>{const span=document.createElement('span');span.className='token'+(i<step?' done':'');span.textContent=i<step?w:'?';$('sentence').append(span)});$('grid').replaceChildren();for(let i=0;i<9;i++){const d=document.createElement('div');d.className='tile'+(i===pos?' player':'')+(neighbors(pos).includes(i)?' reachable':'');d.innerHTML=(i===pos?catSVG:mouseSVG)+(i===pos?'':`<span class="word"></span>`);if(i!==pos)d.querySelector('.word').textContent=board[i];$('grid').append(d)}}
function speak(text){return lifecycle.speak(text,{enabled:voiceOn,session:shellSession,locale:selectedLocale,rate:.84})}
function overlay(content){$('overlayContent').replaceChildren();$('overlayContent').append(content);$('overlay').hidden=false}
function hideOverlay(){$('overlay').hidden=true}
function showNope(){const el=document.createElement('div');el.className='nope-face';el.innerHTML=sadCatSVG+'<span class="big nope">NOPE</span>';overlay(el);timeout?.cancel();timeout=lifecycle.after(hideOverlay,430)}
async function finishSentence(lastWord){
 busy=true;const token=++epoch,interruption=lifecycle.interruptions;const ex=examples[round];
 const wrap=document.createElement('div'),line=document.createElement('div');line.className='complete';line.textContent=ex.es;wrap.append(line);overlay(wrap);
 $('status').textContent='Listening to the final word…';await speak(lastWord);if(!await ready(token))return;
 if(!await lifecycle.wait(300)||!await ready(token))return;
 if(interruption===lifecycle.interruptions){$('status').textContent='Listening to the full sentence…';await speak(ex.es);if(!await ready(token))return}
 if(!await lifecycle.wait(1300)||!await ready(token))return;
 round=(round+1)%examples.length;step=0;pos=4;busy=false;hideOverlay();makeBoard();$('status').textContent='New sentence. Find the first word!';
}
async function move(dir){
 if(busy||paused)return;
 const r=Math.floor(pos/3),c=pos%3;
 const delta={up:[-1,0],down:[1,0],left:[0,-1],right:[0,1]}[dir];if(!delta)return;
 const y=r+delta[0],x=c+delta[1];if(y<0||y>2||x<0||x>2)return;
 const dest=y*3+x,word=board[dest],good=word===examples[round].words[step];
 busy=true;const token=epoch,origin=pos;
 await walkCat(origin,dest,dir);if(!await ready(token))return;
 if(good){pos=dest;step++;$('status').textContent=`✓ ${word}`;
  if(step>=examples[round].words.length){render();finishSentence(word)}
  else{makeBoard();await speak(word);if(await ready(token))busy=false}
 }else{
  const target=$('grid').children[dest];target?.classList.add('escape');
  showNope();$('status').textContent='Wrong mouse! Try another direction.';
  if(!await lifecycle.wait(440)||!await ready(token))return;
  await walkCat(dest,origin,dir==='left'?'right':dir==='right'?'left':dir==='up'?'down':'up');
  if(await ready(token)){busy=false;render()}
 }
}
function restart(){epoch++;activeJump?.cancel();lifecycle.begin();paused=false;$('pause').textContent='Pause';epoch++;if('speechSynthesis' in window)window.speechSynthesis.cancel();timeout?.cancel();hideOverlay();busy=false;round=0;step=0;pos=4;makeBoard();$('status').textContent='Catch the correct mouse to build the sentence.'}
document.addEventListener('keydown',e=>{if($('preview').hidden===false)return;if(e.key.toLowerCase()==='p'){e.preventDefault();if(!e.repeat)togglePause();return}const map={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};if(map[e.key]){e.preventDefault();move(map[e.key])}});// Swipe on the grid: one cardinal move per gesture, never diagonal.
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
function togglePause(){lifecycle.toggle()}
$('pause').addEventListener('click',togglePause);
$('restart').addEventListener('click',restart);
function setSound(on){voiceOn=on;$('sound-icon').textContent=voiceOn?'🔊':'🔇';$('sound-label').textContent=voiceOn?'Sound On':'Sound Off';$('sound').setAttribute('aria-pressed',String(voiceOn));if(!voiceOn)lifecycle.cancelSpeech();}
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
  stopCat();
  if (shellSession) { shellSession.menu(); return; }
  game.hidden = true;
  $('preview').hidden = false;
  $('play').focus();
});

function stopCat(){epoch++;activeJump?.cancel();lifecycle.stop();touchStart=null;busy=false}
window.addEventListener('pagehide',stopCat);
