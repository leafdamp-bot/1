/* Physical evidence first; instructions teach controls, never give the solution. */
'use strict';
const bellData={red:{name:'红',pitch:2,hz:523.25,rect:[39,15,7,31]},blue:{name:'蓝',pitch:3,hz:783.99,rect:[47.2,15,6.5,31]},yellow:{name:'黄',pitch:1,hz:392,rect:[55.2,15,7,31]}};
const bellEvidence={
 bellRubbing:['彩窗石框的残刻','门闩只收完整的五声。最沉的一声，既是开端，也是归处。'],
 bellInscription:['匠人留在锁箱上的铭文','最高的一声只出现一次；除首尾外，另外两声来自同一只铃，紧挨在最高声两侧。']
};
const bookData={red:{name:'红',glyph:'☀',rune:'日纹'},green:{name:'绿',glyph:'<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2 32 15H26L36 28H23V38H17V28H4L14 15H8Z"/></svg>',rune:'树纹'},blue:{name:'蓝',glyph:'≈',rune:'水纹'},yellow:{name:'黄',glyph:'☾',rune:'月纹'}};
const bookEvidence={
 shelfWindow:['窗台下的划痕','月纹那册守在最左端。树纹那册与日纹那册相邻，树在日的左边。'],
 shelfHorse:['木马底部的旧纸条','水纹那册与日纹那册之间，恰好夹着另一本书。']
};
function readSceneEvidence(key,data){mark(key);note(data[0],data[1]);panel('<h2>'+data[0]+'</h2><p class="found-evidence">'+data[1]+'</p><p>已拓进线索手账。把它和场景里其他发现一起想一想。</p><button class="primary" id="evidence-close">收好拓片</button>');modal.setAttribute('data-mode','clue');$('#evidence-close').onclick=close;}
function bellCluesReady(){return Object.keys(bellEvidence).every(flag)}
function bellTrialReady(){return ['red','blue','yellow'].every(c=>(state.flags.bellTrials||[]).includes(c))}
function bellOrderOK(a){if(a.length!==5)return false;const pitches=a.map(c=>bellData[c]?.pitch);return pitches[0]===1&&pitches[4]===1&&pitches.filter(p=>p===3).length===1&&pitches[2]===3&&pitches[1]===2&&pitches[3]===2}
function ringSceneBell(color){
 const b=bellData[color];if(!b||sceneExitReady())return;
 const el=$('[data-world="scene-bell-'+color+'"]');el?.classList.remove('bell-rung');void el?.offsetWidth;el?.classList.add('bell-rung');tone(b.hz,.8,'sine',.16);heroMotion('act');
 if(state.flags.bellRecording){const a=state.flags.bellPhrase||[];if(a.length>=5){say('五个位置已满。可以撤回一声，或拉门闩试这一句。');return}a.push(color);state.flags.bellPhrase=a;save();drawBellControls();say('门闩记下了第 '+a.length+' 声。');}
 else {const heard=state.flags.bellTrials||[];if(!heard.includes(color))heard.push(color);state.flags.bellTrials=heard;save();drawBellControls();say(b.name+'铃 · 试音刻度 '+['','I','II','III'][b.pitch]+'。刻度越大，音越高；这不是演奏顺序。');}
}
function beginBellPhrase(){if(!bellCluesReady()){say('谱句有缺损。石框与锁箱上似乎各留着一段刻字。');return}if(!bellTrialReady()){say('还没分清三只铃的声音。先逐个试音，刻度也能帮助比较高低。');return}state.flags.bellRecording=true;state.flags.bellPhrase=[];save();drawBellControls();say('门闩开始收音。按你推理出的完整乐句敲五声，再试门闩。');}
function undoBellPhrase(){const a=state.flags.bellPhrase||[];a.pop();state.flags.bellPhrase=a;save();drawBellControls()}
function trialBellMode(){state.flags.bellRecording=false;save();drawBellControls();say('切回试音。试音不会改变已经录下的乐句。')}
function checkBellPhrase(){if(!state.flags.bellRecording){say('先按“开始录入”，试音不会被门闩记录。');return}if(!bellCluesReady()||!bellTrialReady()){say('还缺少完整谱句或试音记录。');return}if((state.flags.bellPhrase||[]).length!==5){say('门闩没有动。五个位置还没填满。');return}if(!bellOrderOK(state.flags.bellPhrase)){say('门闩没有松开。试着同时检查两处铭文的条件；录下的乐句保留，可以撤回。');sfx('no');return}mark('bellsSolved');state.flags.bellCloseup=false;give('gatekey');solve('五声回响落在同一条旋律上，石拱门的门闩松开了。')}
function drawBellControls(){const el=$('#scene-bell-controls');if(!el)return;const a=state.flags.bellPhrase||[],record=!!state.flags.bellRecording;el.innerHTML='<div class="phrase-slots" aria-label="已录乐句">'+Array.from({length:5},(_,i)=>'<span style="--tone:'+({red:'#aa5145',blue:'#42759c',yellow:'#b49a42'}[a[i]]||'transparent')+'">'+(a[i]?bellData[a[i]].name:'·')+'</span>').join('')+'</div><p class="discovery-status">'+(record?'录入中 · '+a.length+' / 5 声':'试音 · 已分辨 '+(state.flags.bellTrials||[]).length+' / 3 只铃')+'</p><div class="discovery-actions"><button id="bell-trial-mode">试音</button><button id="bell-record">开始录入</button><button id="bell-undo">撤回一声</button><button id="bell-submit">试门闩</button></div>';$('#bell-trial-mode').onclick=trialBellMode;$('#bell-record').onclick=beginBellPhrase;$('#bell-undo').onclick=undoBellPhrase;$('#bell-submit').onclick=checkBellPhrase;}
function shelfCluesReady(){return Object.keys(bookEvidence).every(flag)}
function shelfOrderOK(a){if(a.length!==4||new Set(a).size!==4)return false;return a.indexOf('yellow')===0&&a.indexOf('red')-a.indexOf('green')===1&&Math.abs(a.indexOf('red')-a.indexOf('blue'))===2}
let shelfHeld=null;
function shelfSwap(id){if(sceneExitReady())return;const layout=state.flags.shelfLayout||['red','green','blue','yellow'];if(shelfHeld===null){shelfHeld=id;drawShelf();return}if(shelfHeld!==id){const history=state.flags.shelfHistory||[];history.push(layout.slice());const a=layout.indexOf(shelfHeld),b=layout.indexOf(id);[layout[a],layout[b]]=[layout[b],layout[a]];state.flags.shelfLayout=layout;state.flags.shelfHistory=history;save();sfx('wood')}shelfHeld=null;drawShelf();}
function undoShelf(){const h=state.flags.shelfHistory||[];if(h.length)state.flags.shelfLayout=h.pop();state.flags.shelfHistory=h;shelfHeld=null;save();drawShelf()}
function resetShelf(){const h=state.flags.shelfHistory||[];h.push((state.flags.shelfLayout||['red','green','blue','yellow']).slice());state.flags.shelfLayout=['red','green','blue','yellow'];state.flags.shelfHistory=h;shelfHeld=null;save();drawShelf()}
function checkShelf(){if(!shelfCluesReady()){say('机关没有说明排列要求。先找齐房间里两处留下的痕迹。');return}if(!shelfOrderOK(state.flags.shelfLayout||['red','green','blue','yellow'])){say('书架没有移动。再比一比两份拓片与书脊上的纹章；现在的排列会保留。');sfx('no');return}mark('shelfSolved');state.flags.shelfCloseup=false;give('lamp');solve('最后一册压下了暗扣，书架侧梯露了出来。暗格里有一盏手灯。')}
function drawShelf(){const rack=$('#scene-book-rack');if(!rack)return;const layout=state.flags.shelfLayout||['red','green','blue','yellow'];for(const color of Object.keys(bookData)){const b=rack.querySelector('[data-shelf-book="'+color+'"]');if(!b)continue;b.style.left=(layout.indexOf(color)*25)+'%';b.classList.toggle('held',shelfHeld===color);b.setAttribute('aria-pressed',String(shelfHeld===color));b.setAttribute('aria-label',bookData[color].rune+'书，第'+(layout.indexOf(color)+1)+'位')};}
function enterStudy(kind){state.flags[kind+'Closeup']=true;save();render();heroMotion('act')}
function leaveStudy(kind){state.flags[kind+'Closeup']=false;save();render();shelfHeld=null}
const beforeDiscoveryRender=render;
render=function(){beforeDiscoveryRender();document.querySelectorAll('.discovery-mechanism').forEach(el=>el.remove());const i=state.index;
 scene.classList.toggle('studying-bells',i===10&&!!state.flags.bellCloseup);scene.classList.toggle('studying-shelf',i===12&&!!state.flags.shelfCloseup);
 if(i===10){$('#hotspots').innerHTML='';if(state.flags.bellCloseup){
  for(const [color,b]of Object.entries(bellData)){const x=50+(b.rect[0]-50)*2;worldObject('scene-bell-'+color,[x,5,b.rect[2]*2,55],inertArt,'试敲'+b.name+'铃',()=>ringSceneBell(color),'physical-bell');}
  attachSceneMechanism('discovery-mechanism bell-console',[25,70,52,23],'<div id="scene-bell-controls"></div>');drawBellControls();
  const back=attachSceneMechanism('discovery-mechanism study-back',[4,84,19,10],'<button id="bell-study-back">← 退回门亭</button>');$('#bell-study-back').onclick=()=>leaveStudy('bell');
 }else{
  worldObject('bell-closeup',[38,13,26,34],inertArt,'靠近查看铃架',()=>enterStudy('bell'));
  worldObject('bell-stone',[12,12,20,41],inertArt,'查看彩窗石框的残刻',()=>readSceneEvidence('bellRubbing',bellEvidence.bellRubbing));worldObject('bell-box',[45,51,12,16],inertArt,'查看锁箱侧面的铭文',()=>readSceneEvidence('bellInscription',bellEvidence.bellInscription));
 }}
 if(i===12){$('#hotspots').innerHTML='';if(state.flags.shelfCloseup){
  const rack=attachSceneMechanism('discovery-mechanism shelf-rack',[29,31,42,38],'<div id="scene-book-rack">'+Object.entries(bookData).map(([color,b])=>'<button class="rack-book '+color+'" data-shelf-book="'+color+'">'+propImage('book')+'<b>'+b.glyph+'</b></button>').join('')+'</div>');rack.querySelectorAll('[data-shelf-book]').forEach(b=>b.onclick=()=>shelfSwap(b.dataset.shelfBook));attachSceneMechanism('discovery-mechanism shelf-console',[28,74,44,16],'<p class="discovery-status">选中一册，再点另一册交换 · 纹章随书移动</p><div class="discovery-actions"><button id="shelf-undo">撤回交换</button><button id="shelf-reset">重新摆放</button><button id="shelf-submit">推动书架</button></div>');$('#shelf-undo').onclick=undoShelf;$('#shelf-reset').onclick=resetShelf;$('#shelf-submit').onclick=checkShelf;drawShelf();
  attachSceneMechanism('discovery-mechanism study-back',[4,84,19,10],'<button id="shelf-study-back">← 退回树屋</button>');$('#shelf-study-back').onclick=()=>leaveStudy('shelf');
 }else{worldObject('shelf-closeup',[33,39,13,17],inertArt,'靠近查看藏书架',()=>enterStudy('shelf'));worldObject('shelf-window',[42,30,12,7],inertArt,'查看窗台下的划痕',()=>readSceneEvidence('shelfWindow',bookEvidence.shelfWindow));worldObject('shelf-horse',[3,43,18,12],inertArt,'查看木马底部',()=>readSceneEvidence('shelfHorse',bookEvidence.shelfHorse));}
 }
};
const beforeDiscoveryObserve=observe;observe=function(){if(state.index===10){say('彩窗没有标出演奏顺序。近看石框与锁箱，找找能拼起来的刻字。');return}if(state.index===12){say('四本书的颜色不是密码。书脊的纹章，与房间里留下的痕迹可能有关。');return}beforeDiscoveryObserve()};
const beforeDiscoveryPuzzle=puzzle;puzzle=function(){if(state.index===10){enterStudy('bell');return}if(state.index===12){enterStudy('shelf');return}beforeDiscoveryPuzzle()};
Object.assign(levels[10],{title:'门亭 · 残缺的回响',goal:'调查石框与锁箱，分辨三只铃的声音，让门闩认出失落的乐句。',hint:['彩窗只是装饰；真正的刻字在石框边缘与锁箱侧面。先逐个试音。','把两段刻字放在一起读：先判断两端，再确定中间三声。录入后一次检查整句。','五声依次敲：黄、红、蓝、红、黄。先收齐两段铭文并试过三只铃，再按“开始录入”。']});
Object.assign(levels[12],{title:'树屋 · 失序的藏书',goal:'寻找两处房间线索，按书脊纹章重排四册藏书，打开侧梯。',hint:['窗台下与木马底部各藏着一段痕迹。排列依据是书脊纹章，不是颜色。','先确定最左位置，再把相邻的一对看成整体，最后核对“中间隔一本”的条件。','从左到右：月纹、 水纹、树纹、日纹，也就是黄、蓝、绿、红。先找齐两份线索，再交换书本并推动书架。']});
// Keep retained saves intact; retire outdated clue text when these rooms are inspected again.
sceneRules.bells=['拼合两处铭文，推理出完整乐句，让门闩松开。','直接点墙上三只铃试音；点“开始录入”后敲击会被记下。可以撤回，最后点“试门闩”。','音高刻度用于比较高低，不代表先后。错误乐句不会逐声指出哪里正确。'];
sceneRules.books=['让四册藏书同时符合找到的纹章条件。','先点一册，再点另一册交换位置。可撤回，按“推动书架”检查整组。','“紧挨左边”表示相邻；“隔一本”表示中间还有一册。没有试错次数限制。'];
sceneRules.wipe[2]='例如两颗石子的数值相加为 6，每颗就是 3；示例与本幕刻字无关。';
sceneRules.fish=['取出深处的钥匙，打开后门。','点击物品调查。在布包先选一样道具，再点另一样，可尝试组合；选好后点场景目标使用。','错误尝试不会消耗道具。先观察工具特点，再决定怎样伸到够不着的地方。'];
sceneRules.knots=['让挡路的蛛网安全离开门洞。','调查场景中可拿取的物品，也可以在布包里尝试组合。先选道具，再点目标使用。','场景里的动物也会对声音和物品作出反应，留意动作。'];
sceneRules.bridge=['修稳缺损的小桥，抵达对岸。','先观察损坏位置，再选择布包道具点那里。每次只使用当前选中的一件。','道具是否合适与使用次序，都需要根据现场状况判断。'];
sceneRules.plant=['解开工具箱，带走可以使用的物件。','点三个圆盘轮换图案。调查周围物品，把发现与圆盘联系起来。','排列的依据藏在场景变化中；菜单不会给出图案答案。'];
sceneRules.gears[2]='显示的是当前齿数和转速。每枚齿轮只能用一次，利用读数观察它们如何相互影响。';
// Two gentle nudges, then an explicit opt-in for the complete solution.
$('#hint').onclick=()=>{if(sceneExitReady()){say('障碍已解除，点场景出口继续。');return}const hints=current().hint;if(hintStep<2){say(hints[Math.min(hintStep, hints.length-1)]);hintStep++;sfx('tap');return}panel('<h2>要看完整解法吗？</h2><p>接下来会直接显示这一幕的操作解法。也可以收起，继续自己观察。</p><div class="micro-actions"><button id="keep-exploring" class="secondary">继续自己找</button><button id="reveal-solution" class="primary">显示完整解法</button></div>');modal.setAttribute('data-mode','guide');$('#keep-exploring').onclick=close;$('#reveal-solution').onclick=()=>{const answer=hints[hints.length-1];close();say(answer);panel('<h2>本幕完整解法</h2><p class="revealed-solution">'+answer+'</p><button class="primary" id="solution-close">收起解法</button>');modal.setAttribute('data-mode','guide');$('#solution-close').onclick=close;};};
// Migrate only superseded discoveries; keep completed scenes and inventory intact.
state.notes=state.notes.filter(n=>!['给风的乐谱','书架留言'].includes(n.title));
if(state.items.includes('towel')||state.unlocked>0||state.done[0]||flag('clean'))state.flags.cabinetTowelTaken=true;
save();render();fitStage();
