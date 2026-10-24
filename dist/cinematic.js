/* Opening film and recurring real-material animal/food actors. */
'use strict';
const filmAssets=['assets/fast/cinematic/lounge.webp','assets/fast/room.webp','assets/fast/cinematic/squirrel-run-a.webp','assets/fast/cinematic/squirrel-run-b.webp','assets/fast/cinematic/squirrel-alert.webp','assets/fast/cinematic/squirrel-reach.webp','assets/fast/cinematic/cookie.webp','assets/fast/cinematic/hero-eating.webp','assets/fast/hero-actions.webp','assets/fast/hero-hd.webp'];
const squirrelMarkup=(cls='',pose='alert')=>`<div class="real-squirrel ${cls}" data-pose="${pose}" role="img" aria-label="写实红松鼠"><div class="squirrel-art"></div><img class="squirrel-cookie" src="assets/fast/cinematic/cookie.webp" alt="巧克力曲奇" hidden></div>`;
let openingRun=null;
function finishOpening(run){if(openingRun!==run)return;openingRun=null;cancelAnimationFrame(run.raf);document.removeEventListener('visibilitychange',run.visibility);run.layer.remove();document.body.classList.remove('cinema-active');run.focus?.focus?.();if(run.newGame){state.started=true;state.openingSeen=true;save();render();heroWalker.x=20;heroWalker.target=20;heroWalker.active=false;syncHeroPosition();say('松鼠钻走了……先拿上木柜里的毛巾，再检查右侧房门上的九宫格锁。')}else say('开场重看完毕，继续你的旅途。')}
async function playOpening(newGame=false){
 if(openingRun)return;
 close();openBag(false);menuOpen(false);const focus=document.activeElement;
 const layer=document.createElement('section');layer.className='opening-film';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label','开场动画：被抢走的饼干');layer.innerHTML=`<img class="film-bg film-lounge" src="assets/fast/cinematic/lounge.webp" alt="雨后起居室"><img class="film-bg film-kitchen" src="assets/fast/room.webp" alt="第一关厨房"><div class="film-hero" data-pose="eat"><div class="film-hero-art"></div></div>${squirrelMarkup('film-squirrel','run')}<div class="film-light"></div><span class="film-heading">序章 · 一块饼干</span><button class="film-pause" aria-label="暂停开场动画">暂停</button><button class="film-skip">跳过动画 →</button><p class="film-caption" aria-live="polite">正在准备开场……</p><div class="film-progress"></div>`;
 scene.appendChild(layer);document.body.classList.add('cinema-active');
 const run={layer,newGame,focus,raf:0,time:0,last:0,paused:false,beat:'',visibility:()=>{run.last=0}};openingRun=run;
 layer.querySelector('.film-skip').onclick=()=>finishOpening(run);
 const pause=layer.querySelector('.film-pause');pause.onclick=()=>{run.paused=!run.paused;run.last=0;pause.textContent=run.paused?'继续':'暂停';pause.setAttribute('aria-label',run.paused?'继续开场动画':'暂停开场动画');layer.querySelectorAll('.film-hero-art,.squirrel-art').forEach(el=>el.style.animationPlayState=run.paused?'paused':'running')};
 layer.querySelector('.film-skip').focus();document.addEventListener('visibilitychange',run.visibility);
 if(musicEnabled)startAudio();enterImmersive();
 try{await Promise.all(filmAssets.map(src=>new Promise(resolve=>{const i=new Image();i.onload=i.onerror=resolve;i.src=src;if(i.complete)resolve()})))}catch{}
 if(openingRun!==run)return;
 const hero=layer.querySelector('.film-hero'),squirrel=layer.querySelector('.film-squirrel'),cookie=squirrel.querySelector('.squirrel-cookie'),caption=layer.querySelector('.film-caption'),kitchen=layer.querySelector('.film-kitchen');
 function tick(now){if(openingRun!==run)return;if(run.last&&!run.paused&&!document.hidden)run.time+=Math.max(0,(now-run.last)/1000);run.last=now;const f=OpeningTimeline.frame(run.time);hero.style.width=f.room==='kitchen'?'20%':'26%';hero.style.left=f.heroX+'%';hero.style.bottom=f.heroBottom+'%';hero.dataset.pose=f.heroPose;squirrel.style.left=f.squirrelX+'%';squirrel.style.bottom=f.squirrelBottom+'%';squirrel.dataset.pose=f.squirrelPose;cookie.hidden=!f.cookie;kitchen.style.opacity=f.blend;layer.querySelector('.film-progress').style.width=(run.time/OpeningTimeline.duration*100)+'%';if(run.beat!==f.beat){run.beat=f.beat;layer.querySelector('.film-heading').textContent=f.beat;caption.textContent=f.caption;if(f.beat==='饼干被抢走了'){sfx('bird');sfx('wood')}if(f.beat==='追上那只松鼠'||f.beat==='第一章 · 雨后厨房')sfx('step');if(f.beat==='微光游记 · 冒险开始')sfx('wood')}if(f.heroPose==='eat'&&Math.floor(run.time*3)%4===0&&run.lastCrunch!==Math.floor(run.time)){run.lastCrunch=Math.floor(run.time);sfx('wood')}if(f.done){finishOpening(run);return}run.raf=requestAnimationFrame(tick)}
 run.raf=requestAnimationFrame(tick);
}

const originalStart=$('#start').onclick;$('#start').onclick=()=>{if(!state.started)playOpening(true);else originalStart()};
const replay=document.createElement('button');replay.className='intro-replay';replay.textContent='重看开场 · 被抢走的饼干';replay.onclick=()=>playOpening(false);$('.intro-card').appendChild(replay);
const replayMenu=document.createElement('button');replayMenu.className='cinema-replay-button';replayMenu.textContent='重看开场';replayMenu.setAttribute('aria-label','重看开场动画');replayMenu.onclick=()=>playOpening(false);$('#adventure-menu').appendChild(replayMenu);
const openingReset=resetGame;resetGame=function(){if(openingRun)finishOpening(openingRun);openingReset();playOpening(true)};
const picnicWin=win;win=function(){picnicWin();const success=modal.querySelector('.success');if(success)success.insertAdjacentHTML('afterbegin',`<div class="picnic-art">${squirrelMarkup('','eat')}<img class="picnic-cookie" src="assets/fast/cinematic/cookie.webp" alt="找回的曲奇饼干"></div>`)};
render();

if(state.started){$('#intro').style.display='flex';$('#start').innerHTML=state.completed?'再看看冒险结局 →':'继续微光游记 →'}
