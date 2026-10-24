/* Every puzzle removes a concrete barrier; passage itself completes the scene. */
'use strict';
const sceneExits=[
 [[91,13,8,71],'door','房门','九宫格门锁锁着房门。'],
 [[89,39,10,35],'path','右侧通道','水路断裂，地面的积水挡住通道；接水并洗好毛巾后再走。'],
 [[90,18,9,59],'door','窗边侧门','雾中留言与暗匣密码控制侧门的门闩。'],
 [[85,13,13,65],'door','储物间木门','配重机关卡着门闩，蜂蜜与砝码还没有平衡。'],
 [[84,9,13,66],'door','走廊房门','钟下密码锁牵着房门的锁舌。'],
 [[54,12,23,55],'door','花园后门','钥匙在藤篮底部，木门尚未打开。'],
 [[73,19,11,28],'door','花园拱门','高处蛛网横在门洞前，蜘蛛还在网中央。'],
 [[84,63,12,24],'path','温室侧道','苗床的配重栓还没有收到恰好四升水。'],
 [[87,31,12,45],'path','工具棚侧道','工具箱的锁杆卡着桥板，棚口踏板尚未放行。'],
 [[85,46,12,25],'path','溪边台阶','踏石的安全路线没有亮起，暂时不能跨过溪流。'],
 [[72,20,18,49],'door','石拱门','风铃顺序控制拱门闩，铃声还没有对上。'],
 [[78,4,13,30],'door','桥对岸木门','桥面缺损、绳结松开，对岸木门也锁着。'],
 [[90,14,9,55],'path','书架侧梯','书本顺序不对，暗梯被书架挡住。'],
 [[88,33,11,42],'path','工坊升降道','齿轮转速不对，升降踏板无法接到出口。'],
 [[80,30,15,29],'path','吊篮升降处','吊篮刹车没有松开，无法抵达下一层。'],
 [[44,13,17,48],'path','星光通道','星环缺口没有对齐，出口的光闩没有亮起。'],
 [[88,28,11,43],'path','八音盒暗门','齿轮和发条未装好，乐曲无法松开暗门。'],
 [[87,23,12,50],'path','月夜露台','宝箱的联动锁还扣着通往月夜露台的通道。'],
 [[69,42,17,31],'path','卷叶小径','卷叶挡住小径，叶脉透光机关还没有展开。'],
 [[77,34,18,31],'path','溪流对岸','三位旅伴还没有安全到达对岸，叶舟不能靠岸。'],
 [[32,28,14,25],'path','蚁巢入口','岔路没有连通，巡逻蚁尚未走出完整路线。'],
 [[78,34,17,35],'path','育幼室后洞','温湿度不合适，幼蚁保护门还关着。'],
 [[74,33,18,34],'path','粮仓后隧道','谷粒没有压中粮槽，后隧道被根须闸挡住。'],
 [[44,43,19,30],'path','通往树冠的洞口','没有献上谷粒、排好印记，守卫蚁不肯放行。'],
 [[82,23,15,26],'path','蛛丝桥对岸','旅伴和萤灯还没有全部渡桥，前方不能通行。'],
 [[79,36,16,31],'path','升梯上层','四层木盘还没有搬妥，树皮升梯未接上上层。'],
 [[77,31,20,22],'path','鸟窝侧枝','巢材排列不合规矩，鸟儿护着侧枝不让通过。'],
 [[80,44,16,27],'path','羽毛坡道上端','种子太多导致羽毛失衡，坡道无法承重。'],
 [[79,29,17,24],'path','星枝末端','材质暗码没对上，枝头星闸尚未开启。'],
 [[55,47,23,25],'path','月夜野餐','三枚星片和九宫顶冠尚未点亮，伙伴们还在等待。']
];
function sceneExitReady(i=state.index){return !!(state.done[i]||state.flags.sceneExitReady?.[i])}
function prepareSceneExit(message){if(state.done[state.index]){say('这处障碍已经解除，点击出口继续前进。');return}state.flags.sceneExitReady=state.flags.sceneExitReady||{};state.flags.sceneExitReady[state.index]=true;save();render();sfx('win');heroMotion('happy');say((message||'障碍解除了。')+' 现在点'+sceneExits[state.index][2]+'，走向下一张地图。')}
solve=prepareSceneExit;
function leaveScene(){const i=state.index,exit=sceneExits[i];if(!sceneExitReady()){if(i===0){puzzle();return}say(exit[3]);sfx('no');return}if(i===0&&!state.items.includes('towel')){say('中央木柜里露着一块旧毛巾，先带上它，洗衣间会用到。');return}const el=$('[data-world="scene-exit"]');if(el)el.classList.add('exit-opening');sfx('unlock');worldAction('leave-scene',el,()=>{state.done[i]=true;state.unlocked=Math.max(state.unlocked,Math.min(29,i+1));save();if(i===29){state.completed=true;save();render();win()}else{go(i+1);say('来到了'+levels[i+1].title.split(' · ')[0]+'。'+levels[i+1].goal)}},950)}
const beforeExitRender=render;render=function(){beforeExitRender();document.querySelectorAll('.scene-exit').forEach(el=>el.remove());if(insideMicro())return;const [rect,kind,name,reason]=sceneExits[state.index],ready=sceneExitReady();const art=kind==='door'?'<i class="exit-door-leaf"></i>':'<i class="exit-path-glow"></i>';const el=worldObject('scene-exit',rect,art+`<span class="exit-caption">${ready?'前往':'查看'} · ${name} ${ready?'→':'⌁'}</span>`,(ready?'通过':'检查')+name,leaveScene,'scene-exit '+kind+' '+(ready?'exit-ready':'exit-blocked'));if(kind==='door'){const leaf=el.querySelector('.exit-door-leaf'),[x,y,w,h]=rect;leaf.style.backgroundImage=`url("assets/${current().asset}.webp")`;leaf.style.backgroundSize=(10000/w)+'% '+(10000/h)+'%';leaf.style.backgroundPosition=(x/(100-w)*100)+'% '+(y/(100-h)*100)+'%'}
$('#next-scene').disabled=!ready;$('#next-scene').setAttribute('aria-label',ready?'通过场景出口继续':'先解除出口障碍');$('#next-scene').innerHTML=ready?'去出口 →':'出口受阻';document.querySelectorAll('.scene-result').forEach(e=>e.textContent=ready?'✓ 障碍已解除 · 点击出口继续':'');};
$('#next-scene').onclick=()=>{const p=sceneExits[state.index][0];walk(p[0]+p[2]/2,leaveScene)};
const oldExitPuzzle=puzzle;puzzle=function(){if(state.index===0&&sceneExitReady())return leaveScene();oldExitPuzzle()};
render();fitStage();if(state.started){$('#intro').style.display='flex';$('#start').innerHTML=state.completed?'再看看冒险结局 →':'继续微光游记 →'}
