/* Entry-only pursuit. Puzzle redraws do not restart or resurrect the squirrel. */
'use strict';
let squirrelVisit=null,squirrelPlayActive=false;
function stopSquirrelVisit(){if(!squirrelVisit)return;cancelAnimationFrame(squirrelVisit.raf);squirrelVisit.actor?.remove();document.querySelectorAll('.found-cookies').forEach(el=>el.remove());squirrelVisit=null;}
function renderSquirrelChase(){
 const index=state.index;
 if(!squirrelPlayActive||!state.started||![14,17,29].includes(index)){stopSquirrelVisit();return;}
 if(squirrelVisit&&(squirrelVisit.source!==state||squirrelVisit.index!==index))stopSquirrelVisit();
 if(index===29&&state.done[29]){
  if(!squirrelVisit||squirrelVisit.mode!=='picnic'){
   stopSquirrelVisit();scene.insertAdjacentHTML('beforeend',squirrelMarkup('scene-companion','eat'));
   const actor=scene.querySelector('.scene-companion');squirrelVisit={source:state,index,actor,raf:0,mode:'picnic'};
   scene.insertAdjacentHTML('beforeend','<img class="found-cookies" src="assets/cinematic/cookie.webp" alt="终于找回的曲奇饼干">');
  }return;
 }
 if(squirrelVisit)return;
 document.querySelectorAll('.scene-companion,.found-cookies').forEach(el=>el.remove());
 scene.insertAdjacentHTML('beforeend',squirrelMarkup('scene-companion chase-squirrel','alert'));
 const actor=scene.querySelector('.scene-companion'),cookie=actor.querySelector('.squirrel-cookie');cookie.hidden=false;
 const visit={source:state,index,actor,raf:0,time:0,last:0,escaped:false,mode:'chase'};squirrelVisit=visit;
 const place=f=>{actor.style.left=f.x+'%';actor.style.bottom=f.bottom+'%';actor.dataset.pose=f.pose;actor.setAttribute('aria-label',f.pose==='alert'?'松鼠发现了失眠夜':'松鼠叼着饼干向出口逃跑');};
 place(OpeningTimeline.chaseFrame(0,index));
 function tick(now){
  if(squirrelVisit!==visit||visit.source!==state||visit.index!==state.index)return;
  const obscured=document.hidden||openingRun||typeof insideMicro==='function'&&insideMicro()||$('#intro').style.display!=='none';
  actor.hidden=!!obscured;
  if(!obscured&&visit.last)visit.time+=Math.min(.08,Math.max(0,(now-visit.last)/1000));
  visit.last=now;const f=OpeningTimeline.chaseFrame(visit.time,index);place(f);
  if(f.done){visit.escaped=true;actor.remove();visit.raf=0;return;}
  visit.raf=requestAnimationFrame(tick);
 }
 visit.raf=requestAnimationFrame(tick);
}
const beforeSquirrelRender=render;render=function(){beforeSquirrelRender();renderSquirrelChase();};
const beforeSquirrelGo=go;go=function(index){if(index!==state.index&&index>=0&&index<=state.unlocked&&index<30)stopSquirrelVisit();squirrelPlayActive=true;return beforeSquirrelGo(index);};
const beforeSquirrelStart=$('#start').onclick;$('#start').onclick=()=>{squirrelPlayActive=true;return beforeSquirrelStart();};
const beforeSquirrelReset=resetGame;resetGame=function(){stopSquirrelVisit();squirrelPlayActive=true;return beforeSquirrelReset();};
