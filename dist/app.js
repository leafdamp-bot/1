'use strict';

/* engine.js */
(function(root){
class Walker {
 constructor(x=22,speed=46){this.x=x;this.target=x;this.speed=speed;this.direction=1;this.active=false}
 moveTo(x){this.target=Math.max(3,Math.min(86,x));const d=this.target-this.x;if(Math.abs(d)<.35){this.active=false;return false}this.direction=d<0?-1:1;this.active=true;return true}
 step(seconds){if(!this.active)return this.x;const d=this.target-this.x,amount=this.speed*Math.max(0,seconds);if(Math.abs(d)<=amount){this.x=this.target;this.active=false}else this.x+=Math.sign(d)*amount;return this.x}
}
const E={Walker,rotate:m=>((m<<1)&15)|(m>>3),solvedTiles:a=>a.length===9&&a.every((v,i)=>v===(i===8?0:i+1)),gearOK:a=>a[0]===8&&a[1]===12&&a[2]===16,
pipeOK(a){if(!(a[0]&8)||!(a[8]&2))return false;let q=[0],seen=new Set([0]);const dirs=[[-1,0,1,4],[0,1,2,8],[1,0,4,1],[0,-1,8,2]];while(q.length){let i=q.shift(),r=Math.floor(i/3),c=i%3;for(let[dr,dc,bit,opp]of dirs){if(!(a[i]&bit))continue;let nr=r+dr,nc=c+dc;if(nr<0||nr>2||nc<0||nc>2){if(!((i===0&&bit===8)||(i===8&&bit===2)))return false;continue}let j=nr*3+nc;if(!(a[j]&opp))return false;if(!seen.has(j)){seen.add(j);q.push(j)}}}return seen.size===9},
tileMoves(a){let i=a.indexOf(0),out=[];for(let j=0;j<9;j++)if(Math.abs(Math.floor(i/3)-Math.floor(j/3))+Math.abs(i%3-j%3)===1)out.push(j);return out},
shuffleTiles(){let a=[1,2,3,4,5,6,7,8,0],last=-1;for(let n=0;n<36;n++){let moves=E.tileMoves(a).filter(i=>i!==last),j=moves[Math.floor(Math.random()*moves.length)],z=a.indexOf(0);[a[j],a[z]]=[a[z],a[j]];last=z}return E.solvedTiles(a)?[1,2,3,4,0,6,7,5,8]:a},
validateBook:a=>a.join(',')==='green,blue,red,yellow',
};root.GameEngine=E;if(typeof module!=='undefined')module.exports=E;
})(typeof window!=='undefined'?window:globalThis);

;

/* scene-assets.js */
/* Scene images finish loading before the new scene becomes interactive. */
(()=>{
  'use strict';
  const cache=new Map();
  let active='',sequence=0,idle=0;
  const imageLoad=(src,priority='high',request=src)=>{
    if(cache.has(src)){
      const entry=cache.get(src);entry.image.fetchPriority=priority;
      cache.delete(src);cache.set(src,entry);return entry;
    }
    const image=new Image();image.decoding='async';image.fetchPriority=priority;
    const entry={image,status:'pending',request,promise:null};
    entry.promise=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>fail(new Error('image timeout')),15000);
      function fail(error){clearTimeout(timer);image.onload=image.onerror=null;entry.status='error';if(cache.get(src)===entry)cache.delete(src);reject(error);}
      image.onerror=()=>fail(new Error('image unavailable'));
      image.onload=async()=>{clearTimeout(timer);if(!image.naturalWidth){fail(new Error('empty image'));return;}try{await image.decode();}catch{}entry.status='ready';resolve(image);};
      image.src=request;
    });
    cache.set(src,entry);
    while(cache.size>4){const key=[...cache.keys()].find(key=>key!==active&&key!==src);if(!key)break;cache.delete(key);}
    return entry;
  };
  function overlay(root){
    let layer=root.querySelector('.scene-load-mask');
    if(!layer){layer=document.createElement('div');layer.className='scene-load-mask';layer.hidden=true;layer.innerHTML='<span class="scene-load-star" aria-hidden="true">✧</span><p role="status" aria-live="polite"></p><button type="button" hidden>重新载入这一幕</button>';root.appendChild(layer);}
    return layer;
  }
  function prefetch(src){
    if(!src||src===active||cache.has(src))return;
    if(idle){if(window.cancelIdleCallback)cancelIdleCallback(idle);else clearTimeout(idle);}
    const run=()=>{idle=0;if(!document.hidden&&!document.body.classList.contains('cinema-active'))imageLoad(src,'low').promise.catch(()=>{});};
    idle=window.requestIdleCallback?requestIdleCallback(run,{timeout:2000}):setTimeout(run,900);
  }
  function show(image,src,title,next,request=src){
    const root=image.closest('.scene');
    if(!root){image.src=src;return Promise.resolve();}
    const layer=overlay(root);
    if(image.dataset.sceneLoaded===src){prefetch(next);return Promise.resolve();}
    if(image.dataset.scenePending===src)return image._scenePromise;
    const token=++sequence;active=src;image.dataset.scenePending=src;
    root.classList.add('scene-loading');root.setAttribute('aria-busy','true');
    layer.hidden=false;layer.classList.remove('failed');layer.querySelector('p').textContent='正在前往'+title.split(' · ')[0]+'…';
    const retry=layer.querySelector('button');retry.hidden=true;
    const entry=imageLoad(src,'high',request);
    image._scenePromise=entry.promise.then(async()=>{
      if(token!==sequence)return;
      image.src=entry.request;
      try{await image.decode();}catch{}
      if(token!==sequence)return;
      image.dataset.sceneLoaded=src;delete image.dataset.scenePending;
      root.classList.remove('scene-loading');root.removeAttribute('aria-busy');layer.hidden=true;
      prefetch(next);
    }).catch(()=>{
      if(token!==sequence)return;
      delete image.dataset.scenePending;layer.classList.add('failed');
      layer.querySelector('p').textContent='这一幕还没有载入，请重试。';retry.hidden=false;
      retry.onclick=()=>{cache.delete(src);const fresh=src+(src.includes('?')?'&':'?')+'sceneRetry='+Date.now();show(image,src,title,next,fresh);};
    });
    return image._scenePromise;
  }
  window.SceneAssets={show,prefetch};
})();

;

/* game.js */
'use strict';
const $=s=>document.querySelector(s), scene=$('#scene'), modal=$('#modal'),E=GameEngine;
const chapters=['雨后厨房','庭院追踪','树屋的秘密','月光庭院','午夜钟楼'];
const items={towel:['🧣','旧毛巾'],thread:['🧵','细线'],magnet:['🧲','磁铁'],key:['🗝️','铜钥匙'],rope:['🪢','绳子'],water:['🚿','四升清水'],plank:['🪵','桥板'],gatekey:['🔑','庭院钥匙'],lamp:['🔦','小手灯'],gears:['⚙️','齿轮组'],windkey:['🔑','发条钥匙'],lantern:['🏮','月光提灯'],lens:['🔎','月光透镜'],moonflower:['🌼','月光花'],moonstone:['🔮','月光石'],crank:['🔧','钟楼摇柄'],shard:['✦','星星碎片'],star:['⭐','星星徽章']};
function propImage(id,extra=''){return `<img class="item-art ${extra}" src="assets/fast/props/${id}.webp" alt="" draggable="false" decoding="async">`}
for(const id of Object.keys(items))items[id][0]=propImage(id);
const puzzleProps={tiles:'plank',pipes:'water',wipe:'towel',balance:'balance',code:'key',fish:'magnet',knots:'rope',jugs:'jug',plant:'moonflower',bells:'bell',bridge:'plank',books:'book',gears:'gear',stars:'lens',musicbox:'windkey',chest:'star',lantern:'lantern',lanternToggle:'lantern',reflection:'lens',mirrors:'lens',firefly:'moonstone',phases:'moonstone',towerBrake:'crank',towerGears:'gear',towerMemory:'bell',constellation:'shard',clockSet:'windkey',nightFinal:'star'};
function puzzleArt(){const id=puzzleProps[current().type];return id?propImage(id,'study-art'):'✧'}
const levels=[
{asset:'room',title:'厨房 · 卡住的木柜',goal:'解开正前方木柜的门锁，找到一块毛巾。',type:'tiles',icon:'▦',target:[31,48,17,16],clue:[32,42,15,6],targetLabel:'查看木柜门锁',clueLabel:'查看木柜抽屉线索',hint:['看房间正前方的木柜，点击双开柜门中间的门锁。','九宫格里有1—8八块木片，按从左到右、从上到下排列，空格留在右下。','木块只能滑向相邻空位。先排好1、2、3，再整理第二行，最后处理底行。']},
{asset:'washroom',title:'洗衣间 · 断开的水路',goal:'接通水管，把毛巾洗干净。',type:'pipes',icon:'💧',target:[64,9,21,38],clue:[3,20,17,15],targetLabel:'检查墙上水管',clueLabel:'检查水龙头',hint:['右侧的管道断了，水龙头没有水。','每点一块，管道就顺时针转一次。让水从左上格左侧流入，右下格右侧流出。','路线：上排向右，第二排向左，第三排再向右，蛇形走满九格。']},
{asset:'windowroom',title:'窗边 · 水雾后的字',goal:'用干净毛巾擦出窗上的留言。',type:'wipe',icon:'☀️',target:[30,13,48,48],clue:[8,42,14,16],hint:['玻璃后面藏着字，先选择口袋里的毛巾。','点窗户，按住水雾来回擦拭。','擦出的时间需要记下，之后的钟表柜会用到它。']},
{asset:'pantry',title:'储物间 · 蜂蜜的重量',goal:'让天平平衡，打开线轴暗格。',type:'balance',icon:'⚖️',target:[34,32,30,32],clue:[5,18,23,30],hint:['天平左边放着三罐蜂蜜，每罐重两格。','右边的砝码分别重 1、2、4 格。','左边共 6 格，选 2 和 4，便能让暗格弹开。']},
{asset:'study',title:'走廊 · 停住的钟',goal:'结合窗边留言，打开钟下的抽屉。',type:'code',icon:'🕰️',target:[33,41,29,24],clue:[38,9,21,31],hint:['抽屉密码与钟停下来的时间有关。','在窗边找到的留言已收进线索本。小时在前，分钟在后。','钟停在 7:25，去掉冒号，就是 725。']},
{asset:'backdoor',title:'后门 · 篮底的亮光',goal:'组合细线和磁铁，捞出钥匙打开门。',type:'fish',icon:'🧺',target:[6,41,31,27],clue:[48,9,29,57],targetLabel:'查看藤篮里的钥匙',clueLabel:'查看后门',hint:['篮底的金属钥匙够不着。','先选磁铁，再点口袋里的细线，把它们系在一起。','用带线磁铁吸篮底钥匙，再用钥匙开右侧后门。']},
{asset:'garden',title:'花园 · 被缠住的绳子',goal:'解开三个互相牵动的绳扣。',type:'knots',icon:'🪢',target:[10,46,16,15],clue:[2,9,19,18],hint:['长椅上的绳子被三个绳扣扣住了。','按一个绳扣，会同时改变它和右边那个绳扣。','初始是：紧、紧、松。只要按最左的绳扣，就能全部松开。']},
{asset:'greenhouse',title:'温室 · 四升的约定',goal:'用三升和五升容器，量出四升水。',type:'jugs',icon:'🚿',target:[5,22,24,47],clue:[38,32,27,26],hint:['种植说明要求恰好四升水，但只有三升与五升的壶。','装满五升，倒满三升；倒空三升，再把剩下两升倒过去。','再装满五升，给三升壶补一升，五升壶就剩四升。']},
{asset:'shed',title:'工具棚 · 会开花的密码',goal:'给植物浇水，读出工具箱的密码。',type:'plant',icon:'🌻',target:[72,26,22,43],clue:[39,13,25,16],targetLabel:'查看窗边植物',clueLabel:'查看工具箱图案锁',hint:['窗边的植物卷着叶子，像是很久没喝水。','选择四升清水，浇给它，再看看展开的叶片。','叶片上的顺序是叶子、太阳、花。用它打开工具箱，取出桥板。']},
{asset:'stream',title:'溪边 · 石头的回声',goal:'观察水光的节奏，按顺序踏亮石块。',type:'memory',icon:'💦',target:[26,48,54,33],clue:[32,11,39,26],hint:['溪流会依次照亮四块石头，声音也会一起响。','先点“再听一次”，记住亮起的顺序再照做。','从左到右编号 1—4，顺序是 2、4、1、3。']},
{asset:'gatehouse',title:'门亭 · 给风的乐谱',goal:'把墙上的颜色变成铃声，取得钥匙。',type:'bells',icon:'🔔',target:[32,20,37,43],clue:[3,15,23,31],hint:['看看左边墙上的彩色圆点。','把颜色顺序转换成相同颜色的小铃。','依次敲红、蓝、黄、红。']},
{asset:'bridge',title:'小桥 · 最后一步',goal:'修桥并开门，沿脚印前往树屋。',type:'bridge',icon:'🌉',target:[44,27,35,43],clue:[58,3,19,33],targetLabel:'检查缺损的桥面',clueLabel:'查看对岸木门',hint:['桥面缺了一块，口袋里还有桥板和绳子。','先放桥板，再绑绳子。桥修好后才能开对岸木门。','选桥板点桥，选绳子再点桥，最后选庭院钥匙点木门。']},
{asset:'attic',title:'树屋 · 书架的秘密',goal:'按留言重排书本，找到一盏手灯。',type:'books',icon:'📚',target:[34,38,11,18],clue:[3,6,23,25],targetLabel:'查看彩色书本',clueLabel:'查看书架上的留言',hint:['书架暗格需要四本书的顺序正确。','绿书在蓝书前，蓝书紧挨着红书左边，黄书在最右边。','从左到右：绿、蓝、红、黄。']},
{asset:'workshop',title:'钟表工坊 · 齿轮的步伐',goal:'配好齿轮，让输出轴每分钟转六圈。',type:'gears',icon:'⚙️',target:[31,29,35,33],clue:[3,13,23,35],hint:['输入轴每分钟十二圈，输出轴需要六圈。','输入齿轮与输出齿轮的齿数比应为 1:2，中间齿轮只负责传动。','左边放 8 齿，中间放 12 齿，右边放 16 齿。']},
{asset:'balcony',title:'阳台 · 松鼠的暗号',goal:'重复树影闪过的符号，放下吊篮。',type:'squirrel',icon:'🐿️',target:[34,33,29,30],clue:[76,34,19,45],hint:['喂食盒上的三个符号会按次序亮起。','用眼睛或耳朵记住四次闪光，再照着点击。','顺序是月亮、太阳、星星、月亮。']},
{asset:'observatory',title:'观星台 · 光的方向',goal:'用手灯照亮星盘，校准三层星环。',type:'stars',icon:'🔭',target:[12,35,32,33],clue:[59,19,24,32],hint:['星盘太暗，先选择书架暗格里找到的手灯。','外环每次转 45 度，中环 90 度，内环 120 度。让三条缺口都朝上。','初始角度分别为 90、180、240 度；外环点六次，中环两次，内环一次。']},
{asset:'musicroom',title:'音乐角 · 沉睡的旋律',goal:'装回齿轮，上紧发条，让八音盒唱歌。',type:'musicbox',icon:'🎶',target:[29,31,40,34],clue:[71,19,22,34],hint:['八音盒需要完整的齿轮传动和发条钥匙。','先选择齿轮组安装，再选择阳台找到的发条钥匙。','装好之后点“上紧发条”，暗格会弹出最后的徽章。']},
{asset:'treasury',title:'宝藏间 · 一起分享',goal:'嵌入星星，解开最后的联动圆盘。',type:'chest',icon:'🍪',target:[29,36,42,33],clue:[31,24,37,10],targetLabel:'查看宝箱机关',clueLabel:'查看宝箱雕纹',hint:['宝箱凹槽要先放入星星徽章，符号顺序藏在线索本里。','每个圆盘会带动右边那个圆盘一起转动，最右会带动最左。','先复位；点中间两次，再点右边一次，就会排成月亮、星星、太阳。']}
];
levels.push(
{asset:'night-porch',title:'月夜门廊 · 第一盏灯',goal:'转动手摇装置，点亮提灯照路。',type:'lantern',icon:'🏮',target:[5,38,32,30],clue:[59,21,22,31],hint:['夜色深了，长椅上有一盏没亮的提灯。','按住手摇柄给提灯充能，直到刻度满格。','持续按住约两秒，灯会亮起来，照出前往庭院的路。']},
{asset:'night-lanterns',title:'灯笼小径 · 互借的光',goal:'让三盏彼此联动的灯笼同时亮起。',type:'lanternToggle',icon:'🏮',target:[30,34,37,31],clue:[13,8,66,27],hint:['控制台每个按钮会切换它和右侧的灯。','三盏灯的初始状态是亮、暗、暗。让它们全亮。','只按中间那个按钮，第二、三盏就会同时亮起。']},
{asset:'night-pond',title:'月下池塘 · 倒影的数字',goal:'把水面倒影翻正，读出岸边暗锁。',type:'reflection',icon:'🌙',target:[53,41,28,31],clue:[26,47,31,29],hint:['水面上有一组倒过来的数字。','拖动倒影卡片翻转轴，让字朝向自己。','翻正后是 413；输入岸边暗锁，取得月光透镜。']},
{asset:'night-greenhouse',title:'夜温室 · 借来的月光',goal:'调整三面小镜子，把光送到月光花。',type:'mirrors',icon:'🪞',target:[29,35,41,31],clue:[5,37,24,27],hint:['镜子可以在斜向左、斜向右之间切换。','光先横着进来，要经过三次反射，最后从右侧照到花。','三面镜子从左到右设为：斜右、斜左、斜右。']},
{asset:'night-fireflies',title:'萤火草地 · 五次闪光',goal:'跟随五次萤火闪光，找到月光石。',type:'firefly',icon:'✨',target:[5,29,35,32],clue:[43,32,31,27],hint:['观察盒的四个窗格会闪五次光。','看光或听音都可以，点“播放暗号”再记一次。','从左到右：1、3、2、4、1。']},
{asset:'night-gate',title:'月亮拱门 · 一个月的旅程',goal:'放入月光石，按月亮渐圆的顺序开门。',type:'phases',icon:'🌔',target:[33,29,34,36],clue:[5,25,17,33],hint:['门锁有一枚月光石凹槽和三个圆盘。','先放月光石，再让月亮从细到圆排列。','顺序是：眉月、半月、满月。']},
{asset:'tower-hall',title:'钟楼大厅 · 沉睡的升降梯',goal:'解除三道相连的刹车，取得钟楼摇柄。',type:'towerBrake',icon:'🛗',target:[34,27,31,43],clue:[6,39,27,28],hint:['三个刹车扣互相牵动。让它们全部松开。','每次按下，会切换当前扣和右侧邻扣。','初始为紧、松、紧，按最右的扣一次即可。']},
{asset:'tower-gears',title:'传动室 · 四分之一的速度',goal:'接上摇柄，让输出轴每分钟转三圈。',type:'towerGears',icon:'⚙️',target:[30,35,39,32],clue:[7,16,23,29],hint:['输入轴每分钟十二圈，输出只需要三圈。','输入和输出的齿数之比必须是 1:4。','选择左 6 齿、中 12 齿、右 24 齿，再转动摇柄。']},
{asset:'tower-bells',title:'钟室 · 五声邀请',goal:'照着五声钟的节奏拉绳，取出第一枚星片。',type:'towerMemory',icon:'🔔',target:[25,31,49,44],clue:[72,48,20,25],hint:['钟楼会响五声钟，绳上的颜色会一起亮。','按播放，记住颜色的先后。','顺序：红、红、蓝、黄、蓝。']},
{asset:'tower-roof',title:'观星露台 · 连成一条星路',goal:'根据星图顺序，依次点亮四颗星。',type:'constellation',icon:'🌌',target:[31,34,36,34],clue:[5,41,23,28],hint:['星图按光芒数从少到多标记四颗星。','每颗星旁的小点代表顺序，从一个点到四个点。','按左上、右下、右上、左下点星，取得第二枚星片。']},
{asset:'tower-clock',title:'钟面之后 · 约定的时刻',goal:'把时针和分针调到星图留下的时间。',type:'clockSet',icon:'🕙',target:[31,36,39,32],clue:[72,43,22,27],hint:['观星台的星图背面写着约定时间，已记入线索本。','按小时和分钟按钮调节，再拉动校时杆。','调成 10:10，可得到第三枚星片。']},
{asset:'tower-finale',title:'最高处 · 月光野餐',goal:'嵌入三枚星片，点亮最后五颗星。',type:'nightFinal',icon:'🌕',target:[28,35,43,34],clue:[71,32,23,31],hint:['放入从钟室、观星台和钟面里得到的三枚星片。','每个按钮会切换自己和左右邻星。要让五颗都亮起来。','先复位，再依次按第 1、3、5 个按钮，五颗星会全部点亮。']}
);

let testSession=false;
let state={index:0,unlocked:0,done:{},items:[],notes:[],flags:{},started:false,completed:false},selected=null,hintStep=0,bubbleTimer,toastTimer,walkTimer,modalSession=0;
try{const s=JSON.parse(localStorage.getItem('little-way-out-18-v1'));if(s&&s.index>=0&&s.index<30&&s.unlocked>=s.index&&s.unlocked<30&&Array.isArray(s.items))state=s}catch{}
const save=()=>{if(testSession)return;try{localStorage.setItem('little-way-out-18-v1',JSON.stringify(state))}catch{}};
const flag=k=>!!state.flags[k];const mark=k=>{state.flags[k]=true;save()};let current=()=>levels[state.index];
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200)}
function say(t){$('#bubble').textContent=t;$('#bubble').style.opacity=1;$('#status').textContent=t;clearTimeout(bubbleTimer);bubbleTimer=setTimeout(()=>$('#bubble').style.opacity=0,4800)}
function give(id){if(!state.items.includes(id)){state.items.push(id);selected=id;save();render();sfx('item');sceneEffect('pickup',items[id][0]);heroMotion('act');toast('放入口袋 · '+items[id][1])}}
function use(id){heroMotion('act');if(id==='water')sceneEffect('pipes');if(id==='gears')sceneEffect('gears');state.items=state.items.filter(x=>x!==id);if(selected===id)selected=null;save();render()}
function need(id,msg){if(selected===id)return true;say(state.items.includes(id)?`先选口袋里的${items[id][1]}，再点这里。`:msg);sfx('no');return false}
function note(title,body){if(!state.notes.some(x=>x.title===title)){state.notes.push({title,body});save();toast('已记入线索本 · '+title)}}
function close(){modalSession++;modal.hidden=true;modal.innerHTML=''}
function panel(html){modalSession++;modal.innerHTML=`<section class="panel"><button class="close" aria-label="关闭">×</button>${html}</section>`;modal.hidden=false;$('.close').onclick=close;setTimeout(()=>modal.querySelector('input,button:not(.close)')?.focus(),0)}
function solve(message){if(state.done[state.index])return;state.done[state.index]=true;state.unlocked=Math.max(state.unlocked,Math.min(29,state.index+1));save();render();sfx('win');heroMotion('happy');sceneEffect(current().type);say((message||'机关解开了，前面的路通了！')+(state.index<29?' 点击左上角选择下一关。':''));toast(state.index===29?'全部三十个场景完成！':'过关成功！点击左上角选择下一关');if(state.index===29){state.completed=true;save();win()}}
// One position source and one animation loop: retarget from the rendered position.
const heroWalker=new E.Walker(22);
let heroFrame=0,heroLastTime=0,heroArrived=null,heroSceneWidth=0,heroWidth=0;
function syncHeroPosition(){const h=$('#hero');heroSceneWidth=scene.clientWidth||scene.getBoundingClientRect().width;heroWidth=h.offsetWidth||heroSceneWidth*.2;drawHeroPosition()}
function drawHeroPosition(){if(!heroSceneWidth)return;const x=heroSceneWidth*heroWalker.x/100,h=$('#hero');h.style.transform=`translate3d(${x}px,0,0)`;$('#shadow').style.transform=`translate3d(${x+heroWidth/2-heroSceneWidth*.06}px,0,0)`;$('#bubble').style.transform=`translate3d(${heroSceneWidth*Math.max(5,Math.min(68,heroWalker.x))/100}px,0,0)`}
function tickHero(timestamp){const dt=heroLastTime?Math.max(0,(timestamp-heroLastTime)/1000):0;heroLastTime=timestamp;heroWalker.step(dt);drawHeroPosition();if(heroWalker.active){heroFrame=requestAnimationFrame(tickHero)}else{heroFrame=0;heroLastTime=0;$('#hero').classList.remove('walk');const done=heroArrived;heroArrived=null;if(done)done()}}
function walk(x,onArrive){const h=$('#hero');syncHeroPosition();heroArrived=typeof onArrive==='function'?onArrive:null;h.classList.remove('reverse','act','happy');if(!heroWalker.moveTo(x-4)){h.classList.remove('walk');const done=heroArrived;heroArrived=null;if(done)done();return}h.setAttribute('data-facing',heroWalker.direction<0?'left':'right');h.style.setProperty('--face-x',heroWalker.direction);h.classList.add('walk');if(!heroFrame){heroLastTime=0;heroFrame=requestAnimationFrame(tickHero);sfx('step')}}
window.addEventListener('resize',()=>requestAnimationFrame(syncHeroPosition));document.addEventListener('visibilitychange',()=>{heroLastTime=0});
function preloadNext(){}
function render(){preloadNext();const l=current(),chapter=Math.floor(state.index/6);document.querySelector('.chapter').innerHTML=`<span>第${['一','二','三','四','五'][chapter]}关</span> ${chapters[chapter]}`;document.querySelector('.chapter').onclick=map;document.querySelector('.chapter').setAttribute('role','button');document.querySelector('.chapter').tabIndex=0;document.querySelector('.chapter').onkeydown=e=>{if(e.key==='Enter')map()};SceneAssets.show($('.room'),'assets/fast/'+l.asset+'.webp',l.title,levels[state.index+1]?'assets/fast/'+levels[state.index+1].asset+'.webp':null);$('.room').alt=l.title+'，写实场景';$('.scene-tag').innerHTML=`<span>${String(state.index+1).padStart(2,'0')}</span><div>${l.title}<small>${l.goal}</small></div>`;$('#progress').textContent=`第 ${chapter+1} 关 · 场景 ${state.index%6+1} / 6 · 已解开 ${Object.keys(state.done).length} / 30`;$('#inventory').innerHTML='';for(let n=0;n<Math.max(4,state.items.length);n++){const id=state.items[n],b=document.createElement('button');b.className='slot'+(!id?' empty':'')+(id&&selected===id?' selected':'');b.disabled=!id;if(id){b.innerHTML=items[id][0]+`<small>${id==='magnet'&&flag('tied')?'带线磁铁':items[id][1]}</small>`;b.setAttribute('aria-label','选择'+items[id][1]);b.onclick=()=>{if((selected==='magnet'&&id==='thread')||(selected==='thread'&&id==='magnet')){use('thread');mark('tied');selected='magnet';render();sfx('item');say('细线系好了！磁铁现在可以放下去再拉回来。');return}selected=selected===id?null:id;render();sfx('tap');say(selected?'拿好了'+items[id][1]+'。':'先看看场景里的线索。')}}else b.setAttribute('aria-label','空口袋');$('#inventory').appendChild(b)}$('#hotspots').innerHTML='';addHotspot(l.target,l.targetLabel||'主要机关',()=>{if(state.done[state.index]&&l.type!=='tiles'){say('这里已经解开，点击左上角选择下一关。');return}puzzle()});addHotspot(l.clue,l.clueLabel||'观察线索',()=>{if((l.type==='fish'&&flag('fished'))||(l.type==='bridge'&&flag('bridgeTied')))puzzle();else observe()});const tag=document.createElement('div');tag.className='scene-result';tag.textContent=state.done[state.index]?(state.index===29?'✓ 全部通关':'✓ 已完成 · 点击左上角选择下一关'):'';$('#hotspots').appendChild(tag);scene.classList.toggle('night',state.index>=18);$('#prev-scene').disabled=state.index===0;$('#next-scene').disabled=!state.done[state.index]||state.index===29;$('#next-scene').classList.toggle('ready',!!state.done[state.index]&&state.index<29);$('#next-scene').innerHTML=state.index===29?'终点':state.index%6===5?'下一关 →':'继续 →';$('#scene-count').textContent=`${state.index%6+1} / 6`;$('#intro').style.display=state.started?'none':'flex';requestAnimationFrame(fitStage)}
function addHotspot(pos,label,fn){let b=document.createElement('button');b.className='hotspot';b.setAttribute('aria-label',label);b.dataset.action=label==='主要机关'?'puzzle':'clue';b.innerHTML='<span>'+label+'</span>';Object.assign(b.style,{left:pos[0]+'%',top:pos[1]+'%',width:pos[2]+'%',height:pos[3]+'%'});b.onclick=e=>{e.stopPropagation();sfx('tap');const at=state.index;walk(pos[0]+pos[2]/2,()=>{if(state.index!==at||!modal.hidden)return;heroMotion('act');sceneEffect('tap',undefined,pos);setTimeout(()=>{if(state.index===at&&modal.hidden)fn()},350)})};$('#hotspots').appendChild(b)}
function go(i){if(i<0||i>state.unlocked||i>29)return;close();state.index=i;hintStep=0;selected=null;save();render();scene.classList.remove('fade-in');void scene.offsetWidth;scene.classList.add('fade-in');walk(18);say(current().goal);sfx('bird')}
function map(){panel('<h2>失眠夜的冒险地图</h2><p>解除场景障碍，再点击出口走进下一张地图。</p><div class="map-grid">'+levels.map((l,i)=>`<button data-scene="${i}" ${i>state.unlocked?'disabled':''} class="${i===state.index?'here':''}"><small>第${Math.floor(i/6)+1}关 · ${i%6+1}/6</small><span>${i>state.unlocked?'🔒':state.done[i]?'✓':l.icon} ${l.title.split(' · ')[0]}</span></button>`).join('')+'</div>');modal.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>go(+b.dataset.scene))}
function journal(){panel('<span class="big">📒</span><h2>线索本</h2><div class="notes">'+(state.notes.length?state.notes.map(n=>`<article><b>${n.title}</b><p>${n.body}</p></article>`).join(''):'<p>观察场景里的关键线索，它们会自动记在这里。</p>')+'</div>')}
function observe(){const t=current().type;const info={tiles:['房门木锁','九宫格木片上刻着 1—8。沿相邻空格滑动，排成从左到右、从上到下的顺序，空格留在右下。'],pipes:['洗衣间水路','管道入口在左上格左侧，出口在右下格右侧。让水沿九格管道流过，不留漏口。'],wipe:['窗边便签','水雾后藏着字。用干净毛巾擦开，才能看清。'],balance:['蜂蜜标签','三罐蜂蜜，每罐重 2 格。砝码是 1、2、4 格，只有平衡时线轴暗格才会弹开。'],code:['停住的时间','钟停在 7:25。窗边留下的便签告诉你，这个时间要怎样写成密码。'],fish:['门前脚印','松鼠的脚印通向花园。藤篮底部有金属亮光，但直接扔下磁铁会捞不回来。'],knots:['绳扣说明','按下一个绳扣，会同时切换它和右边的绳扣。最右的绳扣会牵动最左。全部松开才能取绳。'],jugs:['温室说明','嫩芽需要恰好 4 升水。水桶标着 3 升与 5 升，可以装满、倒空、互相倾倒。'],plant:['工具箱的图案锁','锁上有三个图案轮。窗边的植物像是缺水；先给它四升清水，展开的叶片会提示图案顺序。'],memory:['水光与回声','四块石头会依次亮起，伴随不同音高。看清顺序，再重复一次。'],bells:['给风的乐谱','墙上从左到右是：红、蓝、黄、红。铃铛上也有相同颜色。'],bridge:['断桥','桥面少了一块木板。放好以后还必须用绳子固定，才能走到对岸用钥匙开门。'],books:['书架留言','绿书在蓝书前。蓝书紧挨红书的左边。黄书在最右边。四本书各用一次。'],gears:['传动图纸','输入轴每分钟 12 圈，输出轴需要 6 圈。三枚齿轮分别是 8、12、16 齿，中间齿轮只改变传动方向。'],squirrel:['喂食盒说明','看符号闪光，听四个音，再按相同顺序重复。它会解开吊篮的刹车。'],stars:['星环刻度','外环每次转 45°，中环每次转 90°，内环每次转 120°。把三条缺口都转到正上方。'],musicbox:['八音盒底座','传动机构和发条都缺失了。装好齿轮组，再用小钥匙上弦。'],chest:['宝箱齿轮','一个圆盘会带动右边的邻盘同步转动。最右的带动最左。目标顺序记录在线索本中。']};const [title,body]=info[t]||[current().title.split(' · ')[1],current().hint[1]];if(['balance','code','bells','books','gears','stars'].includes(t))note(title,body);panel(`<h2>${title}</h2><p>${body}</p><button class="primary" id="observe-close">我记住了</button>`);$('#observe-close').onclick=close}
function puzzle(){const type=current().type;({tiles,pipes,wipe,balance,code,fish,knots,jugs,plant,memory:()=>memory(false),bells,bridge,books,gears,squirrel:()=>memory(true),stars,musicbox,chest,lantern,lanternToggle,reflection,mirrors,firefly:()=>extraMemory('firefly'),phases,towerBrake,towerGears,towerMemory:()=>extraMemory('bell'),constellation,clockSet,nightFinal}[type])()}
function title(icon,h,p){return `<h2>${h}</h2><p>${p}</p>`}
function tiles(){panel(title('▦','九宫格木锁','点击与空位上下或左右相邻的木片。目标：1、2、3 / 4、5、6 / 7、8、空位。')+'<div class="tile-board" aria-label="三乘三九宫格滑块"></div><p id="tile-moves">已移动 0 步</p><div class="micro-actions"><button class="secondary" id="tile-undo" disabled>撤回一步</button><button class="secondary" id="tile-again">重新打乱</button></div>');let a=E.shuffleTiles(),history=[];const draw=()=>{$('.tile-board').innerHTML=a.map((v,i)=>`<button data-tile="${i}" class="${v?'':'blank'}" aria-label="${v?'木片'+v:'空位'}">${v||''}</button>`).join('');$('#tile-moves').textContent='已移动 '+history.length+' 步';$('#tile-undo').disabled=!history.length;modal.querySelectorAll('[data-tile]').forEach(b=>b.onclick=()=>{let i=+b.dataset.tile,z=a.indexOf(0);if(!E.tileMoves(a).includes(i))return;history.push(a.slice());[a[i],a[z]]=[a[z],a[i]];sfx('wood');draw();if(E.solvedTiles(a)){close();if(state.done[state.index]){say('九宫格复原成功！可以通过左上角地图继续冒险。');toast('九宫格复原成功');return}if(typeof prepareSceneExit==='function'){solve('九宫格复原了，右侧房门锁松开了。点房门推开它。')}else{give('towel');solve('九宫格复原了，木柜打开！拿着毛巾去洗衣间吧。')}}})};draw();$('#tile-undo').onclick=()=>{if(!history.length)return;a=history.pop();draw();sfx('wood')};$('#tile-again').onclick=()=>{a=E.shuffleTiles();history=[];draw()}}

// Self-contained metal strokes: SVG object-bounding-box gradients disappear on straight lines.
function pipeVisual(mask){
 const ports=[[1,30,0,30,18,'上'],[2,60,30,42,30,'右'],[4,30,60,30,42,'下'],[8,0,30,18,30,'左']].filter(p=>mask&p[0]);
 const [a,b]=ports;if(!a||!b)return '';
 const d=(a[0]<<2)%15===b[0]?`M${a[1]} ${a[2]} L${b[1]} ${b[2]}`:`M${a[1]} ${a[2]} L${a[3]} ${a[4]} Q30 30 ${b[3]} ${b[4]} L${b[1]} ${b[2]}`;
 return '<svg viewBox="0 0 60 60" aria-hidden="true" focusable="false">'+[['pipe-edge','#273d35',20],['pipe-body','#8eaa98',15],['pipe-shine','#e2ebd5',5]].map(([cls,color,w])=>`<path class="${cls}" d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="butt" stroke-linejoin="round"/>`).join('')+'</svg>';
}
function pipes(){
 panel(title('💧','让水流起来','点管道使它顺时针转动。水从左上格左侧流入、右下格右侧流出，九块管道必须全部接通。')+'<div class="pipe-puzzle"><div class="pipe-labels pipe-inlet"><span>水源 →</span></div><div class="pipe-board"></div><div class="pipe-labels pipe-outlet"><span>→ 出口</span></div></div><button class="primary" id="water-check">打开水阀</button><p id="pipe-msg" role="status">直管能连两头，弯管能拐弯。管口相对才算接上；接好后还要去水槽洗毛巾。</p>');
 let a=[5,5,9,12,5,6,12,5,5];
 const draw=()=>{
  $('.pipe-board').innerHTML=a.map((m,i)=>`<button data-pipe="${i}" data-pipe-mask="${m}" aria-label="转动第${i+1}块管道" aria-description="${[[1,'上'],[2,'右'],[4,'下'],[8,'左']].filter(x=>m&x[0]).map(x=>x[1]).join('、')}相通；点击顺时针转动">${pipeVisual(m)}</button>`).join('');
  modal.querySelectorAll('[data-pipe]').forEach(b=>b.onclick=()=>{a[+b.dataset.pipe]=E.rotate(a[+b.dataset.pipe]);sfx('metal');draw();$('#pipe-msg').textContent='已转动第'+(+b.dataset.pipe+1)+'块。让相邻管口对齐，再打开水阀检查。'});
 };
 draw();$('#water-check').onclick=()=>{if(E.pipeOK(a)){close();if(typeof waterRestored==='function'){waterRestored();return}mark('clean');note('干净的毛巾','水路接通了。旧毛巾已经洗净，可以擦玻璃。');solve('水流出来了！把毛巾洗净，去窗边看看。');sfx('water')}else{$('#pipe-msg').textContent='水路还没接通。水源在左上格左侧，出口在右下格右侧；检查管口有没有对齐或朝向外墙。';sfx('no')}};
}
function wipe(){if(!need('towel','需要在木柜里找到毛巾。'))return;if(!flag('clean')){say('毛巾还没洗干净。');return}panel(title('☀️','水雾后的留言','按住并来回滑动，擦去水雾。')+'<div class="window-clue">时 → 分<div class="fog">按住擦拭</div></div><p id="wipe-progress">还看不清后面的字……</p>');let n=0,down=false,last=null;const area=$('.window-clue'),f=$('.fog');area.onpointerdown=e=>{down=true;last=[e.clientX,e.clientY];area.setPointerCapture(e.pointerId);sfx('wipe')};area.onpointerup=()=>down=false;area.onpointermove=e=>{if(!down)return;const d=Math.hypot(e.clientX-last[0],e.clientY-last[1]);last=[e.clientX,e.clientY];n+=Math.min(d,40);f.style.opacity=Math.max(0,1-n/550);if(n>=550){area.onpointermove=null;area.innerHTML='时 → 分';$('#wipe-progress').textContent='“钟停的那一刻。小时在前，分钟在后，去掉冒号。”';use('towel');note('窗边留言','钟停的那一刻，就是密码。小时在前，分钟在后，去掉冒号。');solve('留言记好了。下一站去储物间，听见暗格的声音了吗？')}}}
function balance(){panel(title('⚖️','三罐蜂蜜的重量','左边三罐蜂蜜，每罐 2 格。选择右边的砝码，使两边平衡。')+'<div class="scale-visual"><span class="honey-jars">'+propImage('honey').repeat(3)+'<small>2 + 2 + 2</small></span><b>'+propImage('balance')+'</b><span id="weight-sum">0<small>右盘重量</small></span></div><div class="puzzle-buttons">'+[1,2,4].map(n=>`<button data-weight="${n}">${n}<small>格</small></button>`).join('')+'</div><button class="primary" id="weigh">检查平衡</button><p id="scale-msg">暗格连着天平的机关。</p>');let set=new Set();modal.querySelectorAll('[data-weight]').forEach(b=>b.onclick=()=>{let n=+b.dataset.weight;if(set.has(n))set.delete(n);else set.add(n);b.classList.toggle('picked',set.has(n));$('#weight-sum').innerHTML=[...set].reduce((a,b)=>a+b,0)+'<small>右盘重量</small>';sfx('metal')});$('#weigh').onclick=()=>{if([...set].reduce((a,b)=>a+b,0)===6){close();give('thread');solve('天平平衡了，暗格里滚出一轴细线！')}else{$('#scale-msg').textContent='天平还歪着，再调整一下砝码。';sfx('no')}}}
function code(){panel(title('🕰️','停住的钟','观察停住的钟，结合窗边留言，将时间写成三位密码。')+'<div class="clock"><span class="hour"></span><span class="minute"></span></div><div class="code">'+[1,2,3].map(n=>`<input aria-label="密码第${n}位" inputmode="numeric" maxlength="1" autocomplete="off">`).join('')+'</div><button class="primary" id="unlock">打开抽屉</button><p id="code-msg">不确定写法时，可以打开下方线索本。</p>');const ins=[...modal.querySelectorAll('input')];ins.forEach((el,i)=>{el.oninput=()=>{el.value=el.value.replace(/\D/g,'').slice(-1);if(el.value)ins[i+1]?.focus();sfx('tap')};el.onkeydown=e=>{if(e.key==='Enter')$('#unlock').click();if(e.key==='Backspace'&&!el.value)ins[i-1]?.focus()}});$('#unlock').onclick=()=>{if(ins.map(e=>e.value).join('')==='725'){close();give('magnet');solve('抽屉开了！磁铁可以和细线组合，去后门看看。');sfx('unlock')}else{$('#code-msg').textContent='咔嗒……没开。再看看时间和便签。';sfx('no')}}}
function fish(){if(!flag('fished')){if(!need('magnet','需要磁铁和细线。'))return;if(!flag('tied')){say('先选磁铁，再选细线，把它们组合。');return}panel(title('🧲','篮底的钥匙','按住磁铁，慢慢放到篮底。再往上拖，把钥匙带回来。')+'<div class="fish-well"><div class="fish-rope"></div><button id="fishing-magnet" aria-label="拖动磁铁">'+propImage('magnet')+'</button><span id="fish-key">'+propImage('key')+'</span></div><p id="fish-msg">先往下，再往上。</p>');let caught=false,down=false;const m=$('#fishing-magnet'),well=$('.fish-well');m.onpointerdown=e=>{down=true;m.setPointerCapture(e.pointerId)};m.onpointerup=()=>down=false;m.onpointermove=e=>{if(!down)return;const r=well.getBoundingClientRect(),y=Math.max(0,Math.min(r.height-48,e.clientY-r.top-20));m.style.top=y+'px';$('.fish-rope').style.height=y+'px';if(y>r.height-75&&!caught){caught=true;$('#fish-key').style.opacity=0;$('#fish-msg').textContent='吸住了！把磁铁拖回上方。';sfx('metal')}if(caught&&y<20){mark('fished');use('magnet');give('key');close();say('钥匙捞上来了！选钥匙，再点右边木门。');render()}};return}if(!need('key','钥匙已经放入口袋。'))return;use('key');solve('后门打开了！第一关完成，松鼠就在花园里。');sfx('unlock')}
function knots(){panel(title('🪢','松开绳扣','紧扣和右侧邻扣会一起切换；最右扣会牵动最左。让三个扣子全部松开。')+'<div class="knot-row"></div><button class="secondary" id="knot-reset">复位</button>');let a=[1,1,0];const draw=()=>{$('.knot-row').innerHTML=a.map((v,i)=>`<button data-knot="${i}" aria-label="绳扣${i+1}，${v?'紧':'松'}">${propImage('rope')}<small>${v?'紧':'松'}</small></button>`).join('');modal.querySelectorAll('[data-knot]').forEach(b=>b.onclick=()=>{let i=+b.dataset.knot;a[i]^=1;a[(i+1)%3]^=1;sfx('wood');draw();if(a.every(v=>!v)){close();give('rope');solve('绳子解开了！带着它继续追踪。')}})};draw();$('#knot-reset').onclick=()=>{a=[1,1,0];draw()}}
function jugs(){panel(title('🚿','恰好四升','用 3 升与 5 升的壶互相倾倒，量出恰好 4 升水。')+'<div class="jug-row"><div><div class="jug" id="jug-a"></div><b id="jug-a-label"></b><small>容量 3 L</small></div><div><div class="jug" id="jug-b"></div><b id="jug-b-label"></b><small>容量 5 L</small></div></div><div class="jug-controls"><button data-jug="fillA">装满 3L</button><button data-jug="fillB">装满 5L</button><button data-jug="emptyA">倒空 3L</button><button data-jug="emptyB">倒空 5L</button><button data-jug="AtoB">3L → 5L</button><button data-jug="BtoA">5L → 3L</button></div><p id="jug-msg">倒水不会浪费机会，放心试试看。</p>');let a=0,b=0;const draw=()=>{$('#jug-a').style.setProperty('--fill',a/3*100+'%');$('#jug-b').style.setProperty('--fill',b/5*100+'%');$('#jug-a-label').textContent=a+' L';$('#jug-b-label').textContent=b+' L';if(b===4){close();give('water');solve('刚好四升！带去工具棚，让卷起的叶子舒展开。')}};modal.querySelectorAll('[data-jug]').forEach(el=>el.onclick=()=>{let n;switch(el.dataset.jug){case'fillA':a=3;break;case'fillB':b=5;break;case'emptyA':a=0;break;case'emptyB':b=0;break;case'AtoB':n=Math.min(a,5-b);a-=n;b+=n;break;case'BtoA':n=Math.min(b,3-a);b-=n;a+=n;break}sfx('water');draw()});draw()}
function plant(){if(!flag('bloom')){if(!need('water','需要从温室量来四升清水。'))return;use('water');mark('bloom');note('展开的叶片','工具箱的图案依次为：叶子、太阳、花。');sfx('water')}panel(title('🌻','叶片上的三个符号','植物喝饱了水，叶片舒展开。上面露出：叶子 → 太阳 → 花。')+'<div class="symbol-keys"></div><button class="primary" id="plant-lock">打开工具箱</button><p id="plant-msg">点击圆盘切换图案。</p>');let a=[0,0,0],sym=['🌼','🍃','☀️'];const draw=()=>{$('.symbol-keys').innerHTML=a.map((v,i)=>`<button data-plant="${i}" aria-label="转动图案锁${i+1}">${sym[v]}</button>`).join('');modal.querySelectorAll('[data-plant]').forEach(b=>b.onclick=()=>{a[+b.dataset.plant]=(a[+b.dataset.plant]+1)%3;sfx('wood');draw()})};draw();$('#plant-lock').onclick=()=>{if(a.join('')==='120'){close();give('plank');solve('工具箱打开了，里面有一块结实的桥板！')}else{$('#plant-msg').textContent='图案没对上，再看看展开的叶片。';sfx('no')}}}
function memory(isSquirrel){const sym=isSquirrel?['☾','★','☀']:['①','②','③','④'],seq=isSquirrel?[0,2,1,0]:[1,3,0,2],freq=[523,659,784,1046];panel(title(isSquirrel?'🐿️':'💦',isSquirrel?'松鼠的暗号':'溪流的回声','先观察四次闪光，再按相同顺序点击。声音和光会同时提示。')+`<div class="memory-row ${isSquirrel?'three':''}">`+sym.map((v,i)=>`<button data-memory="${i}" aria-label="${isSquirrel?['月亮','星星','太阳'][i]:'石块'+(i+1)}">${v}</button>`).join('')+'</div><p id="memory-msg">准备好后，点“播放暗号”。</p><button class="primary" id="memory-play">播放暗号</button>');let answer=[],playing=false,ready=false,session=modalSession;const flash=i=>{const b=modal.querySelector(`[data-memory="${i}"]`);if(!b)return;b.classList.add('lit');tone(freq[i],.4,'sine',.15);setTimeout(()=>b?.classList.remove('lit'),430)};$('#memory-play').onclick=()=>{if(playing)return;answer=[];ready=false;playing=true;$('#memory-msg').textContent='仔细看，也可以听。';seq.forEach((v,i)=>setTimeout(()=>{if(modalSession===session)flash(v)},i*750+300));setTimeout(()=>{if(modalSession!==session)return;playing=false;ready=true;$('#memory-msg').textContent='轮到你了。'},seq.length*750+350)};modal.querySelectorAll('[data-memory]').forEach(b=>b.onclick=()=>{if(!ready||playing)return;let i=+b.dataset.memory;flash(i);answer.push(i);if(i!==seq[answer.length-1]){ready=false;$('#memory-msg').textContent='刚才的顺序不同。再播放一次试试。';sfx('no')}else if(answer.length===seq.length){ready=false;setTimeout(()=>{if(modalSession!==session)return;close();if(isSquirrel){give('windkey');solve('吊篮缓缓落下，里面是一把发条钥匙。')}else{note('溪边的脚印','石头按顺序亮起，安全的小径通向门亭。');solve('水光顺着石头连起来了！通往门亭的路出现了。')}},450)}})}
function bells(){panel(title('🔔','给风的四个音','观察墙上的彩色圆点，按相同颜色顺序敲响小铃。')+'<div class="bell-keys">'+['red','yellow','blue'].map((v,i)=>`<button data-note="${v}" aria-label="${['红','黄','蓝'][i]}铃">${propImage('bell')}<span class="bell-ribbon"></span></button>`).join('')+'</div><p id="bell-msg">○ ○ ○ ○</p><button class="secondary" id="bell-reset">重新开始</button>');const seq=['red','blue','yellow','red'];let a=[];$('#bell-reset').onclick=()=>{a=[];$('#bell-msg').textContent='○ ○ ○ ○'};modal.querySelectorAll('[data-note]').forEach(b=>b.onclick=()=>{let v=b.dataset.note;tone({red:523,yellow:659,blue:784}[v],.5,'sine',.15);a.push(v);if(a.some((x,i)=>x!==seq[i])){a=[];$('#bell-msg').textContent='这个顺序不对，重新敲一次。';sfx('no');return}$('#bell-msg').textContent=a.map(x=>({red:'🔴',yellow:'🟡',blue:'🔵'}[x])).join(' ');if(a.length===4){close();give('gatekey');solve('铃声唤醒暗格，找到庭院钥匙！')}})}
function bridge(){if(!flag('boardPlaced')){if(!need('plank','需要工具棚里的桥板。'))return;use('plank');mark('boardPlaced');say('桥板放好了，还要用绳子绑牢。');sfx('wood');return}if(!flag('bridgeTied')){if(!need('rope','还需要花园长椅上的绳子。'))return;use('rope');mark('bridgeTied');say('绑紧了！现在选庭院钥匙，再点桥对岸的木门。');sfx('wood');return}if(!need('gatekey','门亭里的钥匙可以开门。'))return;use('gatekey');solve('木门打开了！第二关完成，去树屋找小松鼠。');sfx('unlock')}
function books(){panel(title('📚','谁应该站在前面','绿在蓝前；蓝紧挨红的左边；黄在最右。依次点选书本，把它们排进四个位置。')+'<div class="book-result">□　□　□　□</div><div class="book-row">'+['red','green','blue','yellow'].map((c,i)=>`<button data-book="${c}" style="--book:${['#bd5d4c','#598772','#507da6','#c8aa49'][i]}" aria-label="${['红','绿','蓝','黄'][i]}书">${propImage('book')}<span class="book-color-label">${['红','绿','蓝','黄'][i]}</span></button>`).join('')+'</div><button class="secondary" id="book-reset">重排</button><p id="book-msg">每本书只用一次。</p>');let a=[];const reset=()=>{a=[];modal.querySelectorAll('[data-book]').forEach(b=>b.disabled=false);$('.book-result').textContent='□　□　□　□'};$('#book-reset').onclick=reset;modal.querySelectorAll('[data-book]').forEach(b=>b.onclick=()=>{a.push(b.dataset.book);b.disabled=true;sfx('wood');$('.book-result').textContent=a.map(v=>({red:'红',green:'绿',blue:'蓝',yellow:'黄'}[v])).concat(Array(4-a.length).fill('□')).join('　');if(a.length===4){if(E.validateBook(a)){close();give('lamp');solve('书架后的小格打开了，找到一盏手灯。')}else $('#book-msg').textContent='书架没有动，重新排一次吧。'}})}
function gears(){panel(title('⚙️','把速度降到一半','输入轴 12 圈/分钟，输出需要 6 圈。三枚齿轮各用一次，点击三个轴座选择齿数。')+'<div class="gear-row">'+[0,1,2].map(i=>`<button data-gear="${i}">${propImage('gear')}<b>8</b><small>${['输入','中间','输出'][i]}</small></button>`).join('')+'</div><p id="rpm">输出速度：12 圈/分钟</p><button class="primary" id="gear-test">试着转动</button><p id="gear-msg">中间的齿轮负责传动。</p>');let a=[8,8,8],opts=[8,12,16];modal.querySelectorAll('[data-gear]').forEach(b=>b.onclick=()=>{let i=+b.dataset.gear;a[i]=opts[(opts.indexOf(a[i])+1)%3];b.querySelector('b').textContent=a[i];$('#rpm').textContent='输出速度：'+(12*a[0]/a[2]).toFixed(1)+' 圈/分钟';sfx('metal')});$('#gear-test').onclick=()=>{if(E.gearOK(a)){close();give('gears');solve('齿轮转得稳稳的！带去八音盒吧。')}else{$('#gear-msg').textContent=new Set(a).size!==3?'每枚齿轮只能用一次。':'输出还不合适，输入与输出的齿数比要为 1:2。';sfx('no')}}}
function stars(){if(!flag('lampOn')){if(!need('lamp','书架暗格里的手灯可以照亮星盘。'))return;mark('lampOn');sfx('tap')}panel(title('🔭','对准天空的缺口','转动三个星环，让缺口都朝正上方。外环 45°，中环 90°，内环 120°。')+'<div class="star-rings"><button data-ring="0" aria-label="转动外环"><i></i></button><button data-ring="1" aria-label="转动中环"><i></i></button><button data-ring="2" aria-label="转动内环"><i></i></button><span>✦</span></div><div class="ring-values"></div><button class="primary" id="star-check">校准星盘</button><p id="star-msg">环上的亮点就是缺口的位置。</p>');let a=[90,180,240],step=[45,90,120];const draw=()=>{modal.querySelectorAll('[data-ring]').forEach((b,i)=>b.style.transform='rotate('+a[i]+'deg)');$('.ring-values').textContent=`外环 ${a[0]}° · 中环 ${a[1]}° · 内环 ${a[2]}°`};modal.querySelectorAll('[data-ring]').forEach(b=>b.onclick=()=>{let i=+b.dataset.ring;a[i]=(a[i]+step[i])%360;draw();sfx('metal')});draw();$('#star-check').onclick=()=>{if(a.every(x=>x===0)){close();use('lamp');note('星盘投出的图案','三层星环对齐后，墙上依次出现：月亮 → 星星 → 太阳。它是最后宝箱的符号顺序。');solve('光穿过星盘，墙上投出月亮、星星、太阳！已记入线索本。')}else{$('#star-msg').textContent='还有缺口没朝上，再转一转。';sfx('no')}}}
function musicbox(){if(!flag('gearsInstalled')){if(!need('gears','需要钟表工坊的齿轮组。'))return;use('gears');mark('gearsInstalled');say('齿轮装好了。选发条钥匙，再点八音盒上弦。');sfx('metal');return}if(!need('windkey','需要阳台吊篮里的发条钥匙。'))return;panel(title('🎶','让旋律醒过来','按住小钥匙，慢慢把发条上紧。')+'<button class="winding-key" id="wind" aria-label="按住上紧发条">'+propImage('windkey')+'</button><div class="wind-track"><i></i></div><p id="wind-msg">按住钥匙，听听它的心跳。</p>');let n=0,timer=null,session=modalSession;const stop=()=>{clearInterval(timer);timer=null};$('#wind').onpointerdown=e=>{if(timer)return;$('#wind').setPointerCapture(e.pointerId);timer=setInterval(()=>{if(session!==modalSession){stop();return}n+=3;$('.wind-track i').style.width=n+'%';$('#wind').style.rotate=n*3+'deg';if(n%12===0)sfx('metal');if(n>=100){stop();close();use('windkey');give('star');sfx('music');solve('八音盒唱起来了，暗格弹出最后的星星徽章！')}},70)};$('#wind').onpointerup=stop;$('#wind').onpointercancel=stop}
function chest(){if(!flag('starInlay')){if(!need('star','需要八音盒里的星星徽章。'))return;use('star');mark('starInlay');sfx('metal')}panel(title('🧰','最后的联动圆盘','每个圆盘带动右边邻盘一起转动，最右带动最左。目标顺序在星盘线索里。')+'<div class="symbol-keys"></div><button class="secondary" id="disk-reset">复位圆盘</button><button class="primary" id="chest-open">打开宝箱</button><p id="chest-msg">让月亮、星星、太阳依次排好。</p>');let a=[0,0,0],sym=['☀','☾','★'];const draw=()=>{$('.symbol-keys').innerHTML=a.map((v,i)=>`<button data-disk="${i}" aria-label="转动圆盘${i+1}">${sym[v]}</button>`).join('');modal.querySelectorAll('[data-disk]').forEach(b=>b.onclick=()=>{let i=+b.dataset.disk;a[i]=(a[i]+1)%3;a[(i+1)%3]=(a[(i+1)%3]+1)%3;draw();sfx('metal')})};draw();$('#disk-reset').onclick=()=>{a=[0,0,0];draw()};$('#chest-open').onclick=()=>{if(a.join('')==='120'){close();solve('箱子里只有饼干碎屑和一张路线图，脚印通向月光下的草丛。继续追上松鼠。')}else{$('#chest-msg').textContent='还没对上。留意每次转动会带动邻盘。';sfx('no')}}}
function win(){sfx('win');panel('<div class="success">'+title('🐿️ 🍪','找到啦，一起吃吧！','午夜钟声轻轻响起。松鼠已摆好饼干和热茶，月光洒在最高的露台上。冒险终于变成了一场朋友间的野餐。')+'<p>5 大关 · 30 个场景，全部完成。<br>谢谢你陪失眠夜走过这场小冒险。</p><button class="primary" id="again">再玩一次 ↻</button></div>');$('#again').onclick=resetGame}
function resetGame(){close();state={index:0,unlocked:0,done:{},items:[],notes:[],flags:{},started:true,completed:false};selected=null;hintStep=0;save();render();say(current().goal)}
$('#hint').onclick=()=>{if(state.done[state.index]){say('这里已经解开了，点“继续”去下一个场景。');return}let a=current().hint;say(a[Math.min(hintStep++,a.length-1)]);scene.classList.add('reveal');setTimeout(()=>scene.classList.remove('reveal'),2200);sfx('tap')};
$('#help').onclick=()=>panel(title('✦','怎么和失眠夜一起冒险','共 5 大关，每关 6 个场景。解开当前场景后，“继续”箭头才会亮起。')+'<p>点击场景里的物品寻找机关。先选择口袋里的道具，再点击物品使用。磁铁和细线可以在口袋里组合。</p><p>线索会自动存进 📒 线索本。点上方关卡名称打开地图，只能回看已经开放的场景。点场景中的入口可以进入内室，返回外侧后继续探索。部分机关需要把内室找到的道具带回来使用。卡住时可连续点提示，逐步获得帮助。</p><p>音乐默认开启，首次点按游戏即播放；点 ♪ 可关闭声音。游戏自动铺满页面，进度自动保存在本机。</p>');
$('#reset').onclick=()=>{panel(title('↻','重新开始冒险？','这会清除当前三十个场景的探索进度。')+'<button class="primary" id="confirm-reset">重新开始</button>');$('#confirm-reset').onclick=resetGame};
$('#journal').onclick=journal;$('#prev-scene').onclick=()=>go(state.index-1);$('#next-scene').onclick=()=>{if(state.done[state.index])go(state.index+1)};
modal.addEventListener('click',e=>{if(e.target===modal)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
scene.addEventListener('click',e=>{if(e.target.closest('button,.intro'))return;const r=scene.getBoundingClientRect();walk((e.clientX-r.left)/r.width*100)});
function enterImmersive(){document.body.classList.add('immersive');fitStage()}
function syncFullscreenButton(){const active=!!(document.fullscreenElement||document.webkitFullscreenElement),button=$('#full');button.setAttribute('aria-label',active?'退出全屏':'进入全屏');button.setAttribute('title',active?'退出全屏':'进入全屏');button.setAttribute('aria-pressed',String(active));}
async function toggleFullscreen(){
 const root=document.documentElement;
 try{
  if(document.fullscreenElement||document.webkitFullscreenElement){
   const exit=document.exitFullscreen||document.webkitExitFullscreen;if(exit)await exit.call(document);
  }else{
   const request=root.requestFullscreen||root.webkitRequestFullscreen;
   if(request)await request.call(root);else{enterImmersive();toast('已铺满页面；当前浏览器不支持系统全屏。');}
  }
 }catch{enterImmersive();toast('当前浏览器未允许系统全屏，已保持页面铺满。');}
 syncFullscreenButton();fitStage();
}
document.addEventListener('fullscreenchange',()=>{syncFullscreenButton();fitStage()});
document.addEventListener('webkitfullscreenchange',()=>{syncFullscreenButton();fitStage()});

function fitStage(){const el=$('.scene');if(document.body.classList.contains('immersive')){const wrap=$('.game-wrap'),top=$('.topline').offsetHeight,bottom=$('.bottom').offsetHeight;const phone=window.innerHeight<=500&&window.innerWidth>window.innerHeight;const available=phone?window.innerHeight:Math.max(100,wrap.clientHeight-top-bottom);el.style.width=Math.min(wrap.clientWidth,available*16/9)+'px'}else el.style.width=''}
$('#full').onclick=()=>toggleFullscreen();
window.addEventListener('resize',fitStage);window.visualViewport?.addEventListener('resize',fitStage);document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement){fitStage()}});
function heroMotion(kind){const h=$('#hero');h.classList.remove('act','happy');h.classList.add(kind);setTimeout(()=>h.classList.remove(kind),1700)}
function sceneEffect(type,emoji,position){const l=current(),p=position||l.target;let kind='spark',symbol=emoji||'✧';if(type==='pickup')kind='pickup';else if(['pipes','jugs','plant','reflection'].includes(type)){kind='flow';symbol=''}else if(['gears','towerGears','stars'].includes(type)){kind='gear';symbol=propImage('gear')}else if(['bells','towerMemory'].includes(type)){kind='ring';symbol=propImage('bell')}else if(['squirrel','towerBrake'].includes(type)){kind='lift';symbol=propImage('rope')}else if(['fish','phases','bridge'].includes(type)){kind='open-door';symbol=''}else if(type==='musicbox'){kind='note';symbol='♪ ♫'}let el=document.createElement('div');el.className='action-fx '+kind;el.style.left=p[0]+p[2]/2+'%';el.style.top=p[1]+p[3]/2+'%';el.innerHTML='<span class="fx-object">'+symbol+'</span>';scene.appendChild(el);setTimeout(()=>el.remove(),2000);if(type!=='tap'){let burst=document.createElement('div');burst.className='reward-burst';scene.appendChild(burst);setTimeout(()=>burst.remove(),1000)}}
function holdCharge(icon,heading,description,finish){panel(title(icon,heading,description)+'<button class="winding-key" id="charge" aria-label="按住转动摇柄">'+propImage('crank')+'</button><div class="wind-track"><i></i></div><p>按住摇柄，让能量慢慢填满。</p>');let n=0,t=null,session=modalSession;const stop=()=>{clearInterval(t);t=null};$('#charge').onpointerdown=e=>{if(t)return;$('#charge').setPointerCapture(e.pointerId);t=setInterval(()=>{if(session!==modalSession){stop();return}n+=3;$('.wind-track i').style.width=n+'%';$('#charge').style.rotate=n*6+'deg';if(n%12===0)sfx('metal');if(n>=100){stop();close();finish()}},65)};$('#charge').onpointerup=stop;$('#charge').onpointercancel=stop}
function lantern(){holdCharge('🏮','夜里的第一盏灯','转动手摇发电柄，把提灯点亮。',()=>{give('lantern');mark('nightLight');solve('提灯亮了！沿着光照出的花园小径前进。')})}
function togglePuzzle(heading,initial,goal,neighbors,finish,labels){panel(title('✦',heading,'每个按钮会同时切换相邻的机关。让所有圆点都亮起来。')+'<div class="toggle-row"></div><button class="secondary" id="toggle-reset">复位</button>');let a=initial.slice();const draw=()=>{$('.toggle-row').innerHTML=a.map((v,i)=>`<button data-toggle="${i}" class="${v?'on':''}" aria-label="${labels?.[i]||'机关'+(i+1)}，${v?'亮':'暗'}">${v?'✦':'○'}<small>${labels?.[i]||i+1}</small></button>`).join('');modal.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>{for(let i of neighbors(+b.dataset.toggle))a[i]^=1;sfx('tap');draw();if(a.every((v,i)=>v===goal[i])){close();finish()}})};draw();$('#toggle-reset').onclick=()=>{a=initial.slice();draw()}}
function lanternToggle(){togglePuzzle('互相借光的灯笼',[1,0,0],[1,1,1],i=>[i,(i+1)%3],()=>solve('三盏灯连成一线，照亮了通往池塘的小路。'),['红灯','蓝灯','黄灯'])}
function reflection(){panel(title('🌙','翻转水中的倒影','点击卡片将倒影翻正，再输入岸边的三位密码。')+'<button class="reflection-card mirrored" aria-label="翻转倒影数字">413</button><div class="code">'+[1,2,3].map(n=>`<input aria-label="倒影密码第${n}位" maxlength="1" inputmode="numeric">`).join('')+'</div><button class="primary" id="reflection-lock">打开暗锁</button><p id="reflection-msg">倒影和本来的字，方向恰好相反。</p>');$('.reflection-card').onclick=()=>{$('.reflection-card').classList.toggle('mirrored');sfx('water')};let ins=[...modal.querySelectorAll('input')];ins.forEach((b,i)=>b.oninput=()=>{b.value=b.value.replace(/\D/g,'').slice(-1);if(b.value)ins[i+1]?.focus()});$('#reflection-lock').onclick=()=>{if(ins.map(x=>x.value).join('')==='413'){close();give('lens');solve('暗锁打开了。带着月光透镜，去温室试试。')}else{$('#reflection-msg').textContent='再翻转倒影看看，读的是正过来的数字。';sfx('no')}}}
function mirrors(){if(!flag('lensPlaced')){if(!need('lens','需要从池塘暗锁里取得月光透镜。'))return;use('lens');mark('lensPlaced')}panel(title('🪞','把月光送到花上','点镜子改变倾斜方向。让月光沿镜子折返，最后落在右侧月光花上。')+'<div class="mirror-track"><span class="light-source">☾</span><div class="mirror-row"></div><span class="light-flower">'+propImage('moonflower')+'</span><svg class="beam" viewBox="0 0 300 100"><polyline points="0,30 55,30 55,75 155,75 155,30 245,30 245,75 300,75"/></svg></div><button class="primary" id="mirror-test">打开光闸</button><p id="mirror-msg">先观察光线转向。</p>');let a=[0,0,0];const draw=()=>{$('.mirror-row').innerHTML=a.map((v,i)=>`<button data-mirror="${i}" aria-label="转动镜子${i+1}" class="${v?'slash':'backslash'}"><i></i></button>`).join('');modal.querySelectorAll('[data-mirror]').forEach(b=>b.onclick=()=>{a[+b.dataset.mirror]^=1;sfx('metal');draw()})};draw();$('#mirror-test').onclick=()=>{if(a.join('')==='101'){$('.beam').classList.add('lit');$('.light-flower').classList.add('bloom');let session=modalSession;setTimeout(()=>{if(session!==modalSession)return;close();give('moonflower');note('月光花的香气','把月光花带到拱门，香气能唤醒月亮锁。');solve('月光落在花上，沉睡的花瓣慢慢打开了。')},900)}else{$('#mirror-msg').textContent='光还没到花上。试着让入射光在镜子上转向。';sfx('no')}}}
function extraMemory(mode){const fire=mode==='firefly',sym=fire?['①','②','③','④']:['🔴','🟡','🔵'],seq=fire?[0,2,1,3,0]:[0,0,2,1,2],freq=[523,659,784,1046];panel(title(fire?'✨':'🔔',fire?'五次萤火闪光':'五声钟的邀请','先看五次闪光，或听五个音，再按相同顺序重复。')+'<div class="memory-row">'+sym.map((v,i)=>`<button data-extra="${i}" aria-label="${fire?'窗格'+(i+1):['红绳','黄绳','蓝绳'][i]}">${v}</button>`).join('')+'</div><p id="extra-msg">准备好后播放暗号。</p><button class="primary" id="extra-play">播放暗号</button>');let ready=false,playing=false,a=[],session=modalSession;function flash(i){let b=modal.querySelector(`[data-extra="${i}"]`);if(!b)return;b.classList.add('lit');tone(freq[i],.45,'sine',.13);setTimeout(()=>b.classList.remove('lit'),450)}$('#extra-play').onclick=()=>{if(playing)return;playing=true;ready=false;a=[];$('#extra-msg').textContent='看光，也可以听声音。';seq.forEach((v,i)=>setTimeout(()=>{if(session===modalSession)flash(v)},i*760+200));setTimeout(()=>{if(session!==modalSession)return;playing=false;ready=true;$('#extra-msg').textContent='现在照着重复一次。'},seq.length*760+250)};modal.querySelectorAll('[data-extra]').forEach(b=>b.onclick=()=>{if(!ready)return;let i=+b.dataset.extra;flash(i);a.push(i);if(i!==seq[a.length-1]){ready=false;$('#extra-msg').textContent='顺序还差一点，播放后再试一次。';sfx('no')}else if(a.length===seq.length){ready=false;setTimeout(()=>{if(session!==modalSession)return;close();if(fire){give('moonstone');solve('萤火虫聚成光点，照出草丛中的月光石。')}else{getShard('bellShard');solve('五声钟落下，一枚星星碎片从暗格里滑出。')}},450)}})}
function phases(){if(!flag('moonGateReady')){if(!need('moonstone','需要萤火草地里的月光石。'))return;use('moonstone');use('moonflower');mark('moonGateReady');sfx('metal')}panel(title('🌔','从细到圆的月亮','点击三个月相盘，让月亮按逐渐变圆的顺序排列。')+'<div class="symbol-keys"></div><button class="primary" id="phase-open">打开月亮门</button><p id="phase-msg">眉月 → 半月 → 满月</p>');let a=[2,2,2],sym=['🌒','🌓','🌕'];const draw=()=>{$('.symbol-keys').innerHTML=a.map((v,i)=>`<button data-phase="${i}" aria-label="转动月相盘${i+1}">${sym[v]}</button>`).join('');modal.querySelectorAll('[data-phase]').forEach(b=>b.onclick=()=>{a[+b.dataset.phase]=(a[+b.dataset.phase]+1)%3;sfx('metal');draw()})};draw();$('#phase-open').onclick=()=>{if(a.join('')==='012'){close();solve('月亮门打开了！第四关完成，远处的钟楼正等着你。')}else{$('#phase-msg').textContent='月亮还没有从细到圆排好。';sfx('no')}}}
function towerBrake(){togglePuzzle('升降梯的三道刹车',[1,0,1],[0,0,0],i=>[i,(i+1)%3],()=>{give('crank');solve('刹车全部松开，升降梯带你找到钟楼摇柄。')},['左刹车','中刹车','右刹车'])}
function towerGears(){if(!flag('crankReady')){if(!need('crank','需要大厅里取得的钟楼摇柄。'))return;use('crank');mark('crankReady')}panel(title('⚙️','四分之一的速度','输入每分钟十二圈，输出需要三圈。将 6、12、24 齿的齿轮各放一次。')+'<div class="gear-row">'+[0,1,2].map(i=>`<button data-tgear="${i}">${propImage('gear')}<b>6</b><small>${['输入','中间','输出'][i]}</small></button>`).join('')+'</div><p id="tower-rpm">输出：12 圈/分钟</p><button class="primary" id="tower-gear-check">转动摇柄</button><p id="tgear-msg">输入、输出的齿数比，应与速度的比相反。</p>');let a=[6,6,6],opts=[6,12,24];modal.querySelectorAll('[data-tgear]').forEach(b=>b.onclick=()=>{let i=+b.dataset.tgear;a[i]=opts[(opts.indexOf(a[i])+1)%3];b.querySelector('b').textContent=a[i];$('#tower-rpm').textContent='输出：'+(12*a[0]/a[2]).toFixed(1)+' 圈/分钟';sfx('metal')});$('#tower-gear-check').onclick=()=>{if(a.join('')==='61224'){close();solve('齿轮稳定转动，通往钟室的楼梯降下来了。')}else{$('#tgear-msg').textContent='需要每个齿轮各用一次，而且输出速度正好为 3。';sfx('no')}}}
function getShard(key){if(flag(key))return;mark(key);state.flags.shards=Math.min(3,(state.flags.shards||0)+1);give('shard');save();toast('星星碎片 '+state.flags.shards+' / 3')}
function constellation(){panel(title('🌌','从少到多的星路','按每颗星旁边小光点的数量，从一个点到四个点依次点亮。')+'<div class="constellation"><svg viewBox="0 0 300 150"><polyline id="star-path" points=""/></svg>'+[[30,25,1],[235,25,3],[35,110,4],[240,110,2]].map(([x,y,n],i)=>`<button style="left:${x/3}%;top:${y/1.5}%" data-cstar="${i}" aria-label="${n}个光点的星"><span>✦</span><small>${'·'.repeat(n)}</small></button>`).join('')+'</div><p id="const-msg">星光会连成一条路。</p><button class="secondary" id="const-reset">重连星图</button>');let a=[],points=['50,40','255,40','55,125','260,125'],seq=[0,3,1,2];const reset=()=>{a=[];$('#star-path').setAttribute('points','');modal.querySelectorAll('[data-cstar]').forEach(b=>b.classList.remove('lit'))};$('#const-reset').onclick=reset;modal.querySelectorAll('[data-cstar]').forEach(b=>b.onclick=()=>{const i=+b.dataset.cstar;a.push(i);if(i!==seq[a.length-1]){reset();$('#const-msg').textContent='光芒数的顺序不同，从一个点重新开始。';sfx('no');return}b.classList.add('lit');$('#star-path').setAttribute('points',a.map(n=>points[n]).join(' '));tone([523,659,784,1046][a.length-1],.4,'sine',.12);if(a.length===4){close();getShard('roofShard');note('星图背面的约定','钟楼的约定时间是 10:10。把小时与分钟都调到这个时刻。');solve('星路连起来了！找到第二枚星片，背面写着 10:10。')}})}
function clockSet(){panel(title('🕙','把时间调到约定时刻','小时每次走一格，分钟每次走五分钟。调整好，再拉动校时杆。')+'<div class="clock interactive-clock"><span class="hour"></span><span class="minute"></span></div><div class="clock-controls"><button id="hour-plus">小时 +1</button><button id="minute-plus">分钟 +5</button></div><p id="clock-digital">03:00</p><button class="primary" id="clock-test">拉动校时杆</button><p id="clock-msg">星图的背面留下了时间。</p>');let h=3,m=0;const draw=()=>{$('.interactive-clock .hour').style.transform=`translate(-50%,-100%) rotate(${h*30+m/2}deg)`;$('.interactive-clock .minute').style.transform=`translate(-50%,-100%) rotate(${m*6}deg)`;$('#clock-digital').textContent=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')};draw();$('#hour-plus').onclick=()=>{h=(h+1)%12;draw();sfx('metal')};$('#minute-plus').onclick=()=>{m=(m+5)%60;draw();sfx('metal')};$('#clock-test').onclick=()=>{if(h===10&&m===10){close();getShard('clockShard');solve('钟面亮起来了！最后一枚星片，通往最高处的门开了。')}else{$('#clock-msg').textContent='还没到约定时刻。再看看线索本里的 10:10。';sfx('no')}}}
function nightFinal(){if((state.flags.shards||0)<3){say('还需要三枚星星碎片。');return}if(!flag('finalInlay')){if(!need('shard','选择口袋里的星星碎片。'))return;use('shard');mark('finalInlay')}togglePuzzle('最后五颗星',[1,1,0,1,1],[1,1,1,1,1],i=>[(i+4)%5,i,(i+1)%5],()=>{use('lantern');solve('午夜钟声响起，月光下的野餐开始了。')},['1','2','3','4','5'])}

let musicEnabled=true,ctx=null,audioOn=false,audioTimer=null,ambientGain=null,noiseSource=null,beat=0;
function tone(freq,duration=.2,type='sine',volume=.1,delay=0){if(!audioOn||!ctx)return;let osc=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime+delay;osc.type=type;osc.frequency.setValueAtTime(freq,t);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.02);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+duration+.05)}
function sfx(type){if(!audioOn)return;switch(type){case'tap':tone(500,.07,'sine',.035);break;case'item':[659,880,1174].forEach((f,i)=>tone(f,.28,'sine',.12,i*.09));break;case'no':tone(180,.14,'triangle',.08);tone(145,.2,'triangle',.06,.12);break;case'unlock':[220,440,660,880].forEach((f,i)=>tone(f,.35,'triangle',.09,i*.09));break;case'win':[523,659,784,1046,1318].forEach((f,i)=>tone(f,.8,'sine',.1,i*.16));break;case'wood':tone(130,.09,'triangle',.1);tone(95,.13,'triangle',.06,.12);break;case'metal':tone(1600,.28,'sine',.07);tone(2300,.15,'sine',.03,.04);break;case'water':[1200,800,1400].forEach((f,i)=>tone(f,.12,'sine',.035,i*.15));break;case'bird':[1900,2400,2150,2800].forEach((f,i)=>tone(f,.1,'sine',.025,i*.12));break;case'cricket':tone(4200,.06,'sine',.012);tone(4600,.06,'sine',.009,.13);break;case'step':for(let i=0;i<4;i++)tone(90+i%2*25,.07,'triangle',.025,i*.25);break;case'wipe':tone(250,.2,'triangle',.02);break;case'music':[659,784,880,1046,880,784,659,523].forEach((f,i)=>tone(f,.6,'sine',.09,i*.23));}}
async function startAudio(){if(!musicEnabled||(audioOn&&ctx?.state==='running'))return;try{if(!ctx){ctx=new(window.AudioContext||window.webkitAudioContext)();ctx.onstatechange=()=>{audioOn=musicEnabled&&ctx.state==='running';$('#sound').setAttribute('data-audio-state',ctx.state)}}await ctx.resume();if(!musicEnabled){await ctx.suspend();return}audioOn=ctx.state==='running';$('#sound').setAttribute('data-audio-state',ctx.state);$('#sound').classList.add('active');$('#sound').setAttribute('aria-label','关闭声音');if(!noiseSource){const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+Math.random()*.04-.02)/1.02;data[i]=last*4}noiseSource=ctx.createBufferSource();noiseSource.buffer=buffer;noiseSource.loop=true;ambientGain=ctx.createGain();ambientGain.gain.value=.05;let filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1800;noiseSource.connect(filter);filter.connect(ambientGain);ambientGain.connect(ctx.destination);noiseSource.start()}ambientGain.gain.value=.05;clearInterval(audioTimer);audioTimer=setInterval(()=>{if(!audioOn||document.hidden)return;const melody=[523.25,0,659.25,783.99,0,659.25,587.33,0,440,0,523.25,659.25,0,587.33,523.25,0];const f=melody[beat%melody.length];if(f)tone(f,1.4,'sine',.065);if(beat%4===0){tone([130.81,146.83,110,130.81][Math.floor(beat/4)%4],2.5,'sine',.02)}if(beat%13===0)sfx(state.index>=18?'cricket':Math.floor(state.index/6)===1?'bird':Math.floor(state.index/6)===0?'water':'music');beat++},560);tone(523.25,1.2,'sine',.065);tone(659.25,1.2,'sine',.04,.2)}catch{audioOn=false;$('#sound').setAttribute('data-audio-state','blocked');toast('点菜单中的 ♪ 可重新开启声音')}}
function syncSoundButton(){$('#sound').classList.toggle('active',musicEnabled);$('#sound').setAttribute('aria-label',musicEnabled?'关闭声音':'开启声音');$('#sound').setAttribute('aria-pressed',String(musicEnabled))}
syncSoundButton();
$('#sound').onclick=()=>{musicEnabled=!musicEnabled;syncSoundButton();if(musicEnabled)startAudio();else{audioOn=false;clearInterval(audioTimer);if(ambientGain)ambientGain.gain.value=0;ctx?.suspend()}};
function unlockDefaultAudio(e){if(!e.target?.closest?.('#sound')&&musicEnabled&&!audioOn)startAudio()}
document.addEventListener('click',unlockDefaultAudio,true);
document.addEventListener('touchend',unlockDefaultAudio,{passive:true});
document.addEventListener('keydown',unlockDefaultAudio);
$('#start').onclick=()=>{state.started=true;save();render();if(musicEnabled)startAudio();enterImmersive();if(state.completed)win();else say(current().goal)};
document.addEventListener('visibilitychange',()=>{if(ctx){if(document.hidden)ctx.suspend();else if(musicEnabled)startAudio()}});
render();if(state.started){$('#intro').style.display='flex';$('#start').innerHTML=state.completed?'再看看冒险结局 →':'继续小冒险 →'}

;

/* storybook.js */
/* Storybook presentation layer; puzzle rules and persisted progress stay in game.js. */
'use strict';
const storyIcons={map:'<svg viewBox="0 0 36 36" aria-hidden="true"><path d="m3 7 10-4 10 5 10-4v25l-10 4-10-5-10 4zM13 3v25M23 8v25"/><path d="m8 19 5-5 8 7 6-7" stroke-dasharray="2 3"/></svg>',moon:'<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M23 3C9 2 2 16 11 25c8 8 19 1 19-7-8 6-20-4-7-15z"/></svg>'};
function openBag(open){document.body.classList.toggle('bag-open',open);$('#bag-toggle').setAttribute('aria-expanded',String(open));$('#bag-drawer').setAttribute('aria-hidden',String(!open));$('#bag-toggle').setAttribute('aria-label',open?'收起随身布包':'打开随身布包')}
function menuOpen(open){document.body.classList.toggle('menu-open',open);$('#menu-toggle').setAttribute('aria-expanded',String(open));$('#menu-toggle').setAttribute('aria-label',open?'收起冒险菜单':'打开冒险菜单')}
$('#bag-toggle').onclick=()=>{openBag(!document.body.classList.contains('bag-open'));sfx('wood')};$('#bag-close').onclick=()=>openBag(false);$('#menu-toggle').onclick=()=>menuOpen(!document.body.classList.contains('menu-open'));
$('#equipped').onclick=()=>{selected=null;render();sfx('tap')};
const storyBaseRender=render;
render=function(){storyBaseRender();const l=current(),chapter=Math.floor(state.index/6);$('.chapter').innerHTML=storyIcons.map+`<span><small>旅途 · 第${['一','二','三','四','五'][chapter]}章</small>${chapters[chapter]}</span>`;$('.chapter').setAttribute('aria-label',`打开冒险地图，${chapters[chapter]}`);$('.scene-tag').innerHTML=`<span class="location-number">${String(state.index%6+1).padStart(2,'0')}</span><div><em>${state.index>=18?'MOONLIT ADVENTURE':'A GLIMMER JOURNEY'}</em><h2>${l.title.split(' · ')[1]}</h2><small>${l.title.split(' · ')[0]}</small></div>`;$('#bag-count').textContent=String(state.items.length);$('#bag-count').hidden=!state.items.length;$('#equipped').hidden=!selected;if(selected)$('#equipped').innerHTML=`<b>${items[selected][0]}</b><span>${selected==='magnet'&&flag('tied')?'带线磁铁':items[selected][1]}</span><i>×</i>`;$('#note-dot').classList.toggle('has-notes',state.notes.length>0);for(const b of document.querySelectorAll('#inventory .slot')){const fn=b.onclick;if(fn)b.onclick=()=>{fn();if(selected!=='magnet'&&selected!=='thread')openBag(false)}}$('#scene-count').innerHTML=Array.from({length:6},(_,i)=>`<i class="${i===state.index%6?'current':state.done[chapter*6+i]?'passed':''}"></i>`).join('');$('#next-scene').setAttribute('aria-label',state.done[state.index]?'前往下一个场景':'解开当前场景后继续');$('#hint').setAttribute('data-hint-step',String(hintStep));document.body.classList.toggle('night-ui',state.index>=18);document.body.classList.toggle('has-started',state.started);};
const storyBasePanel=panel;
panel=function(html){openBag(false);menuOpen(false);storyBasePanel(html);const mapMode=html.includes('map-grid'),bookMode=html.includes('book-spread')||html.includes('class="notes"'),observeMode=html.includes('observe-close')||html.includes('found-evidence'),guideMode=html.includes('完整解法')||html.includes('这一幕怎么玩')||html.includes('冒险？')||html.includes('怎么和')||html.includes('success')||html.includes('test-login');let mode=mapMode?'atlas':bookMode?'journal':observeMode?'clue':guideMode?'guide':'puzzle';modal.setAttribute('data-mode',mode);modal.setAttribute('data-material',/tiles|books|plant|knots|bridge/.test(current().type)?'wood':/pipes|gears|towerGears|fish/.test(current().type)?'metal':'brass');if(mode==='puzzle'||mode==='clue'){scene.classList.add('is-inspecting');const p=mode==='clue'?current().clue:current().target;$('.room').style.transformOrigin=(p[0]+p[2]/2)+'% '+(p[1]+p[3]/2)+'%';const label=mode==='clue'?'一处小小的发现':current().title.split(' · ')[0]+' · 靠近看看';modal.querySelector('.panel').insertAdjacentHTML('afterbegin',`<div class="inspection-caption"><span>✧</span> ${label}</div>`)} };
const storyBaseClose=close;
close=function(){storyBaseClose();scene.classList.remove('is-inspecting');modal.removeAttribute('data-mode');};
const storyBaseFit=fitStage;
fitStage=function(){const wrap=$('.game-wrap'),w=wrap.clientWidth,h=wrap.clientHeight;if(!w||!h)return;scene.style.width=Math.min(w,h*16/9)+'px';syncHeroPosition();};
const storyBaseNeed=need;
need=function(id,msg){const ok=storyBaseNeed(id,msg);if(!ok&&state.items.includes(id))openBag(true);return ok};
const storyBaseGive=give;
give=function(id){const had=state.items.includes(id);storyBaseGive(id);if(had)return;const p=current().target,r=scene.getBoundingClientRect(),dest=$('#bag-toggle').getBoundingClientRect(),el=document.createElement('span');el.className='loot-flight';el.innerHTML=items[id][0];const x=r.left+r.width*(p[0]+p[2]/2)/100,y=r.top+r.height*(p[1]+p[3]/2)/100;el.style.left=x+'px';el.style.top=y+'px';el.style.setProperty('--fly-x',dest.left+dest.width/2-x+'px');el.style.setProperty('--fly-y',dest.top+dest.height/2-y+'px');document.body.appendChild(el);setTimeout(()=>{el.remove();$('#bag-toggle').classList.add('received');setTimeout(()=>$('#bag-toggle').classList.remove('received'),700)},900)};
const bookSketch='<svg class="book-sketch" viewBox="0 0 220 180" aria-hidden="true"><path d="M25 150c32-9 56-9 82-1s60 11 92-2M56 137V64l57-38 55 38v74M48 64l64-43 63 44M80 140V91h28v51M126 84h25v26h-25zM36 138c-23-24 2-42 12-52M181 143c25-18 18-41 9-48"/><path d="M37 112c-15-2-20-14-15-24 11 1 21 8 15 24zm150 12c17-1 24-12 21-22-13 0-21 8-21 22z"/><circle cx="163" cy="27" r="12"/><path d="m112 53 4 7-4 7-4-7z"/></svg>';
journal=function(page=0){if(typeof page!=='number')page=0;const pages=Math.max(1,Math.ceil(state.notes.length/2)),n=Math.max(0,Math.min(page,pages-1)),notes=state.notes.slice(n*2,n*2+2);panel(`<div class="book-spread"><aside class="book-left"><span class="book-kicker">FIELD NOTES / VOL. 01</span><h2>旅途手账</h2><p>把发现的小秘密，<br>一页一页收好。</p>${bookSketch}<span class="book-owner">失眠夜的冒险收藏</span><small>走过 ${Object.keys(state.done).length} 个场景 · 留下 ${state.notes.length} 条线索</small></aside><div class="book-right"><span class="page-label">线索拾遗</span><div class="notes">${notes.length?notes.map((note,i)=>`<article><span class="note-number">${String(n*2+i+1).padStart(2,'0')}</span><b>${note.title}</b><p>${note.body}</p></article>`).join(''):'<article class="empty-note"><span>✧</span><p>还没有收集到线索。<br>留意房间里那些不起眼的角落。</p></article>'}</div><div class="book-pagination"><button id="book-prev" ${n===0?'disabled':''} aria-label="手账上一页">←</button><span>${n+1} / ${pages}</span><button id="book-next" ${n===pages-1?'disabled':''} aria-label="手账下一页">→</button></div></div></div>`);$('#book-prev').onclick=()=>journal(n-1);$('#book-next').onclick=()=>journal(n+1)};
$('#journal').onclick=()=>journal(0);$('#prev-scene').addEventListener('click',()=>openBag(false));$('#next-scene').addEventListener('click',()=>openBag(false));document.addEventListener('keydown',e=>{if(e.key==='Escape'){openBag(false);menuOpen(false)}});document.addEventListener('click',e=>{if(!e.target.closest('header')&&document.body.classList.contains('menu-open'))menuOpen(false)});
render();fitStage();
window.addEventListener('resize',()=>fitStage());window.visualViewport?.addEventListener('resize',()=>fitStage());

;

/* micro-engine.js */
/* Pure rules for the miniature-world mechanisms. */
(function(root){const M={
 runs(a){const r=[];let n=0;for(const v of [...a,0]){if(v)n++;else if(n){r.push(n);n=0}}return r.length?r:[0]},
 nonogram(a,target){return a.every((v,i)=>v===target[i])},
 riverSafe(s){return !((s[1]===s[2]&&s[0]!==s[1])||(s[2]===s[3]&&s[0]!==s[2]))},
 riverMove(s,cargo){if(cargo!==null&&s[cargo+1]!==s[0])return null;const n=s.slice();n[0]^=1;if(cargo!==null)n[cargo+1]^=1;return M.riverSafe(n)?n:null},
 routeStep(path,to){const from=path.at(-1);return !path.includes(to)&&Math.abs((from%4)-(to%4))+Math.abs(Math.floor(from/4)-Math.floor(to/4))===1},
 routeOK(path){return path.length===16&&path.at(-1)===12&&path.indexOf(3)<path.indexOf(4)&&path.indexOf(4)<path.indexOf(11)},
 climate(a){return[3*a[0]+2*a[1]+a[2],a[0]+3*a[1]+2*a[2]]},
 sokobanMove(s,dx,dy){const p=s.p,x=p%7,y=Math.floor(p/7),nx=x+dx,ny=y+dy,n=ny*7+nx,walls=[16,30];if(nx<1||nx>5||ny<1||ny>5||walls.includes(n))return null;const boxes=s.boxes.slice(),b=boxes.indexOf(n);if(b>=0){const tx=nx+dx,ty=ny+dy,t=ty*7+tx;if(tx<1||tx>5||ty<1||ty>5||walls.includes(t)||boxes.includes(t))return null;boxes[b]=t}return{p:n,boxes}},
 bridgeMove(s,chosen){if(chosen.length<1||chosen.length>2||chosen.some(i=>s.sides[i]!==s.light))return null;const n={sides:s.sides.slice(),light:s.light^1,time:s.time+Math.max(...chosen.map(i=>[1,2,5,8][i]))};chosen.forEach(i=>n.sides[i]^=1);return n},
 hanoiMove(pegs,from,to){if(from===to||!pegs[from].length)return null;const disk=pegs[from].at(-1);if(pegs[to].length&&pegs[to].at(-1)<disk)return null;const n=pegs.map(x=>x.slice());n[from].pop();n[to].push(disk);return n},
 sudokuOK(a){if(a.some(x=>!x))return false;const good=g=>new Set(g).size===4;for(let i=0;i<4;i++){if(!good(a.slice(i*4,i*4+4))||!good([0,1,2,3].map(j=>a[j*4+i])))return false}for(let r=0;r<4;r+=2)for(let c=0;c<4;c+=2)if(!good([a[r*4+c],a[r*4+c+1],a[(r+1)*4+c],a[(r+1)*4+c+1]]))return false;return true},
 pegMoves(bits){const moves=[],index=(r,c)=>r>=0&&r<5&&c>=0&&c<=r?r*(r+1)/2+c:-1;for(let r=0;r<5;r++)for(let c=0;c<=r;c++){const from=index(r,c);if(!(bits&(1<<from)))continue;for(const [dr,dc] of [[0,1],[1,0],[1,1],[0,-1],[-1,0],[-1,-1]]){const over=index(r+dr,c+dc),to=index(r+2*dr,c+2*dc);if(over>=0&&to>=0&&(bits&(1<<over))&&!(bits&(1<<to)))moves.push([from,over,to])}}return moves},
 pegApply(bits,m){return bits^(1<<m[0])^(1<<m[1])^(1<<m[2])},
 feedback(code,guess){let exact=0,shared=0;const a={},b={};for(let i=0;i<code.length;i++){if(code[i]===guess[i])exact++;a[code[i]]=(a[code[i]]||0)+1;b[guess[i]]=(b[guess[i]]||0)+1}for(const k in a)shared+=Math.min(a[k],b[k]||0);return[exact,shared-exact]},
 magicOK(a){if(new Set(a).size!==9)return false;for(let i=0;i<3;i++)if(a[i*3]+a[i*3+1]+a[i*3+2]!==15||a[i]+a[i+3]+a[i+6]!==15)return false;return a[0]+a[4]+a[8]===15&&a[2]+a[4]+a[6]===15}
};root.MicroEngine=M;if(typeof module!=='undefined')module.exports=M})(typeof globalThis!=='undefined'?globalThis:this);

;

/* micro-puzzles.js */
'use strict';
const M=MicroEngine;
const microControls=()=>'<div class="micro-actions"><button class="secondary" id="micro-undo">撤回一步</button><button class="secondary" id="micro-reset">重新布置</button></div>';
function microMessage(text){const el=$('#micro-msg');if(el)el.textContent=text}
function microTitle(id,name,description){return '<h2>'+name+'</h2><p>'+description+'</p>'}
function finishMicro(message,reward){if(reward)reward();solve(message)}
// Wiping reveals evidence; the player must then solve three simultaneous relationships.
wipe=function(){if(!need('towel','先在木柜里找到毛巾。'))return;if(!flag('clean')){say('先去洗衣间接通水路，洗净毛巾。');return}const clues=['两片叶子 + 一个太阳 = 15','一个太阳 + 一颗星星 = 13','一片叶子 + 一颗星星 = 10','锁的顺序：星星 → 叶子 → 太阳'];let revealed=[false,false,false,false];panel(microTitle('towel','雾窗上的四条证词','点开四处雾痕，读出刻字。同一种图案代表同一个数，推算三位锁码。')+'<div class="glass-evidence">'+clues.map((_,i)=>`<button data-pane="${i}" aria-label="清理第${i+1}处雾痕">擦开雾痕 ${i+1}</button>`).join('')+'</div><div class="code">'+[0,1,2].map(i=>`<input aria-label="窗锁密码第${i+1}位" inputmode="numeric" maxlength="1">`).join('')+'</div><button class="primary" id="window-unlock" disabled>打开窗边暗匣</button><p id="micro-msg">先找到全部证词，不能只看其中一条。</p>');modal.querySelectorAll('[data-pane]').forEach(b=>b.onclick=()=>{const i=+b.dataset.pane;revealed[i]=true;b.textContent=clues[i];b.classList.add('revealed');sfx('wipe');$('#window-unlock').disabled=!revealed.every(Boolean)});$('#window-unlock').onclick=()=>{const code=[...modal.querySelectorAll('input')].map(x=>x.value).join('');if(code==='647'){close();use('towel');note('窗边的刻字','叶子=4，太阳=7，星星=6。暗匣牵动侧门的锁闩，解开符号等式后侧门才能打开。');solve('推算正确！暗匣的牵线松开，窗边侧门可以打开了。')}else{microMessage('三条等式要同时成立。试着先把太阳和星星用叶子表示。');sfx('no')}}};
function leafgrid(){
 const target=[0,1,1,1,1,0,1,0,0,0,1,0,1,0,0,1,0,1,0,0,1,1,0,0,0];
 const rows=Array.from({length:5},(_,r)=>M.runs(target.slice(r*5,r*5+5))),cols=Array.from({length:5},(_,c)=>M.runs([0,1,2,3,4].map(r=>target[r*5+c])));
 if(state.flags.leafPatternVersion!==2){delete state.flags.leafBoard;state.flags.leafPatternVersion=2;}
 const stored=state.flags.leafBoard;let a=Array.isArray(stored)&&stored.length===25&&stored.every(v=>v===0||v===1)?stored.slice():Array(25).fill(0),history=[],practice=Array(5).fill(0);
 const matches=(line,clue)=>M.runs(line).join(',')===clue.join(',');
 panel(microTitle('lens','露珠里的叶脉','让叶片透出指定的光纹，卷叶才会展开。点一下格子亮起，再点一下变暗。')+
 '<details class="leaf-lesson" '+(flag('leafLessonDone')?'':'open')+'><summary>第一次玩？先用一行试一试</summary><p><b>“1、2”不是格子编号：</b>它表示先有 1 个亮格，隔开至少 1 个暗格，再有连续 2 个亮格。其他格子留暗。</p><div class="leaf-example" aria-label="示例：亮、暗、亮、亮、暗"><b>1、2</b>'+[1,0,1,1,0].map(v=>'<i class="'+(v?'lit':'')+'">'+(v?'亮':'暗')+'</i>').join('')+'</div><p>在下面 5 格里，自己拼出一行符合“1、2”的光纹：</p><div class="leaf-practice">'+practice.map((_,i)=>`<button data-leaf-demo="${i}" aria-label="练习第${i+1}格，暗" aria-pressed="false">暗</button>`).join('')+'</div><p id="leaf-demo-msg" role="status">这只是练习，不会改变下方的正式棋盘。</p><button class="secondary" id="leaf-lesson-done">懂了，收起练习</button></details>'+
 '<div class="leaf-board-help"><b>正式棋盘 · 5 × 5</b><p>左边的数字管这一横行；上面的数字管这一竖列。<br><b>5</b> = 整行或整列全亮；<b>1、1</b> = 两个单独亮格，中间至少隔一暗格。<br>行、列要同时符合。亮格不一定连成一片。</p><span>亮格 = 透光 · 暗格 = 遮光 · ✓ = 当前这一行 / 列符合</span></div>'+
 '<div class="nonogram leaf-board"><small class="leaf-axis">列 ↓<br>行 →</small>'+cols.map((x,c)=>`<small data-leaf-col="${c}" aria-label="第${c+1}列线索${x.join('、')}"><span>${x.join('<br>')}</span><b class="line-mark"></b></small>`).join('')+rows.map((x,r)=>`<small data-leaf-row="${r}" aria-label="第${r+1}行线索${x.join('、')}"><span>${x.join('、')}</span><b class="line-mark"></b></small>`+Array.from({length:5},(_,c)=>`<button data-leaf="${r*5+c}" aria-label="叶脉第${r+1}行第${c+1}列，暗" aria-pressed="false"></button>`).join('')).join('')+'</div><p id="leaf-line-status" role="status"></p><button class="primary" id="leaf-check">检查光纹，展开卷叶</button>'+microControls()+'<p id="micro-msg" role="status">先比较长亮段的所有可能位置，找出必定重叠的格子，再交叉检查行列。填完后点“检查光纹”。</p>');
 const draw=()=>{
  modal.querySelectorAll('[data-leaf]').forEach(b=>{const i=+b.dataset.leaf;b.classList.toggle('filled',!!a[i]);b.setAttribute('aria-pressed',String(!!a[i]));b.setAttribute('aria-label',`叶脉第${Math.floor(i/5)+1}行第${i%5+1}列，${a[i]?'亮':'暗'}`)});
  let count=0;
  for(let i=0;i<5;i++)for(const axis of ['row','col']){const line=axis==='row'?a.slice(i*5,i*5+5):[0,1,2,3,4].map(r=>a[r*5+i]),ok=matches(line,axis==='row'?rows[i]:cols[i]),el=$(`[data-leaf-${axis}="${i}"]`);el.classList.toggle('line-ok',ok);el.querySelector('.line-mark').textContent=ok?'✓':'';if(ok)count++}
  $('#leaf-line-status').textContent=`当前符合 ${count} / 10 条行列线索`;
  microMessage(count===10?'全部行列线索已满足！点“检查光纹，展开卷叶”完成机关。':'先比较长亮段的所有可能位置，找出必定重叠的格子，再交叉检查行列。填完后点“检查光纹”。');
  state.flags.leafBoard=a.slice();save();
 };
 modal.querySelectorAll('[data-leaf]').forEach(b=>b.onclick=()=>{history.push(a.slice());a[+b.dataset.leaf]^=1;draw()});
 modal.querySelectorAll('[data-leaf-demo]').forEach(b=>b.onclick=()=>{const i=+b.dataset.leafDemo;practice[i]^=1;b.classList.toggle('filled',!!practice[i]);b.textContent=practice[i]?'亮':'暗';b.setAttribute('aria-pressed',String(!!practice[i]));b.setAttribute('aria-label',`练习第${i+1}格，${practice[i]?'亮':'暗'}`);const ok=matches(practice,[1,2]);$('#leaf-demo-msg').textContent=ok?'对了！一格亮 → 至少一格暗 → 连续两格亮。正式棋盘的每行、每列都这样读。':'试着先点亮第 1 格，再点亮第 3、4 格：一格亮，隔开一暗格，再连亮两格。';if(ok)mark('leafLessonDone')});
 $('#leaf-lesson-done').onclick=()=>{mark('leafLessonDone');$('.leaf-lesson').open=false;$('.leaf-board-help').scrollIntoView?.({block:'nearest',behavior:'smooth'})};
 $('#micro-undo').onclick=()=>{if(history.length)a=history.pop();draw();microMessage('已撤回一步。格子状态也会在关闭后保留。')};
 $('#micro-reset').onclick=()=>{history.push(a.slice());a=Array(25).fill(0);draw();microMessage('正式棋盘已清空。误点可以撤回。')};
 $('#leaf-check').onclick=()=>{
  if(M.nonogram(a,target)){close();finishMicro('叶片上的光纹对齐了，卷叶展开。带上透镜，从小径继续追松鼠。',()=>give('lens'));return}
  for(const axis of ['行','列'])for(let i=0;i<5;i++){const line=axis==='行'?a.slice(i*5,i*5+5):[0,1,2,3,4].map(r=>a[r*5+i]),clue=axis==='行'?rows[i]:cols[i];if(!matches(line,clue)){const actual=M.runs(line);microMessage(`先检查第 ${i+1} ${axis}：要求 ${clue.join('、')}，你现在是${actual[0]===0?'全暗':actual.join('、')}。数字数的是连续亮格，每两段之间至少隔一暗格。其他格子不会被清空。`);return}}
 };
 draw();
}
function ferry(){let a=[0,0,0,0],selectedCargo=null,history=[];const names=['甲虫','蚜虫','嫩叶'];panel(microTitle('water','一片叶子的摆渡','每次船只能带你和一件货物。你不在的一岸，甲虫会抓蚜虫，蚜虫会吃嫩叶。把它们全部送到对岸。')+'<div class="river-board"><div id="river-near"></div><div class="river-water"><span id="river-boat">叶舟</span></div><div id="river-far"></div></div><button class="primary" id="river-cross">划到对岸</button>'+microControls()+'<p id="micro-msg"></p>');const draw=()=>{for(let side=0;side<2;side++)$(side?'#river-far':'#river-near').innerHTML='<small>'+(side?'对岸':'出发岸')+(a[0]===side?' · 你在这里':'')+'</small>'+names.map((n,i)=>a[i+1]===side?`<button data-cargo="${i}" class="${selectedCargo===i?'picked':''}" ${a[0]!==side?'disabled':''}>${propImage(['beetle','aphid','leaf'][i])}<span>${n}</span></button>`:'').join('');modal.querySelectorAll('[data-cargo]').forEach(b=>b.onclick=()=>{selectedCargo=selectedCargo===+b.dataset.cargo?null:+b.dataset.cargo;draw()});$('#river-boat').style.transform=`translateX(${a[0]?60:-60}%)`;microMessage('已渡河 '+history.length+' 次。'+(selectedCargo===null?'当前空船，可独自返回。':'携带：'+names[selectedCargo]))};$('#river-cross').onclick=()=>{const n=M.riverMove(a,selectedCargo);if(!n){microMessage('这样离岸会留下互相伤害的组合，先换一件货物。');sfx('no');return}history.push(a);a=n;selectedCargo=null;sfx('water');draw();if(a.every(Boolean)){close();finishMicro('三位乘客都安全到了对岸，蚜虫赠送一颗谷粒。',()=>give('seed'))}};$('#micro-undo').onclick=()=>{if(history.length)a=history.pop();selectedCargo=null;draw()};$('#micro-reset').onclick=()=>{a=[0,0,0,0];history=[];selectedCargo=null;draw()};draw()}
function anttrail(){if(!flag('rootRoute')){say('岔道没有路标。先进入树根支道，寻找巡逻蚁留下的路线拓片。');return}if(state.items.includes('lens')){use('lens');mark('lensUsed')}let path=[0];const marks={0:'起点',3:'①',4:'②',11:'③',12:'出口'};panel(microTitle('lens','巡逻蚁的完整路线','从起点出发，上下左右走，不能重复格子；走遍全部 16 格，依次经过 ①②③，最后从出口离开。')+'<div class="micro-grid trail-grid"></div>'+microControls()+'<p id="micro-msg">先从左上出发。路线可以撤回，不会丢失线索。</p>');const draw=()=>{$('.trail-grid').innerHTML=Array.from({length:16},(_,i)=>`<button data-trail="${i}" class="${path.includes(i)?'visited':''} ${i===path.at(-1)?'current':''}" aria-label="蚁道格${i+1}${marks[i]||''}">${marks[i]||path.includes(i)?(marks[i]||'·'):''}</button>`).join('');modal.querySelectorAll('[data-trail]').forEach(b=>b.onclick=()=>{const i=+b.dataset.trail;if(!M.routeStep(path,i)){microMessage('只能走到相邻、尚未经过的格子。');return}path.push(i);draw();if(path.length===16){if(M.routeOK(path)){close();finishMicro('路线接回了蚁巢，育幼室的门打开。')}else microMessage('格子走完了，但路标顺序或出口不对。撤回几步重新规划。')}})};$('#micro-undo').onclick=()=>{if(path.length>1)path.pop();draw()};$('#micro-reset').onclick=()=>{path=[0];draw()};draw()}
function climate(){let a=[0,0,0];const names=['叶窗','水槽','菌灯'];panel(microTitle('lantern','育幼室的双重刻度','三处装置各有 0—4 档。目标温度 17、湿度 16。每升一档：叶窗 +3温/+1湿；水槽 +2温/+3湿；菌灯 +1温/+2湿。')+'<div class="climate-readings"><span id="heat"></span><span id="humidity"></span></div><div class="climate-controls">'+names.map((n,i)=>`<button data-climate="${i}">${n}<b>0</b><small>点击升档</small></button>`).join('')+'</div><button class="primary" id="climate-check">稳定育幼室</button><p id="micro-msg">温度和湿度必须同时达标，不能只顾一边。</p>');const draw=()=>{const [h,w]=M.climate(a);$('#heat').textContent='温度 '+h+' / 17';$('#humidity').textContent='湿度 '+w+' / 16';modal.querySelectorAll('[data-climate]').forEach((b,i)=>b.querySelector('b').textContent=a[i])};modal.querySelectorAll('[data-climate]').forEach(b=>b.onclick=()=>{const i=+b.dataset.climate;a[i]=(a[i]+1)%5;draw();sfx('metal')});$('#climate-check').onclick=()=>{if(M.climate(a).join(',')==='17,16'){close();finishMicro('温湿度稳定下来，蚁卵安全了。')}else microMessage('读数尚未同时达标。试试从温度中减去湿度，分析三种装置的差值。')};draw()}
function seedstore(){if(!flag('fungusRope')){say('谷粒太重。先去后方的菌圃储藏室找一段菌丝绳，固定搬运装置。');return}if(state.items.includes('rope'))use('rope');let a={p:26,boxes:[23,24,25]},history=[];panel(microTitle('seed','把谷粒送进粮槽','把三颗谷粒推到三处圆形粮槽。你只能推，不能拉；别把谷粒推到无法移动的角落。')+'<div class="micro-grid store-grid"></div><div class="direction-pad"><button data-move="0,-1" aria-label="向上搬运">↑</button><button data-move="-1,0" aria-label="向左搬运">←</button><button data-move="0,1" aria-label="向下搬运">↓</button><button data-move="1,0" aria-label="向右搬运">→</button></div>'+microControls()+'<p id="micro-msg">三处发光圆槽是目标。岩壁会阻挡路线，随时可以撤回。</p>');const draw=()=>{$('.store-grid').innerHTML=Array.from({length:49},(_,i)=>{const wall=i%7===0||i%7===6||i<7||i>=42||[16,30].includes(i);return `<span class="store-cell ${wall?'wall':''} ${[15,17,32].includes(i)?'goal':''}">${a.boxes.includes(i)?propImage('seed'):i===a.p?'<i class="mini-explorer">你</i>':''}</span>`}).join('')};modal.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{const [x,y]=b.dataset.move.split(',').map(Number),n=M.sokobanMove(a,x,y);if(n){history.push(a);a=n;draw();sfx('wood');if(a.boxes.every(i=>[15,17,32].includes(i))){close();finishMicro('粮槽压下机关，找到第一枚星片。',()=>getShard('microGranaryShard'))}}else sfx('no')});$('#micro-undo').onclick=()=>{if(history.length)a=history.pop();draw()};$('#micro-reset').onclick=()=>{a={p:26,boxes:[23,24,25]};history=[];draw()};draw()}
function queenorder(){if(!need('seed','摆渡时得到的谷粒，可以作为拜见蚁后的礼物。'))return;let a=[];const names=['叶片','月石','谷粒','月光花','羽毛'];panel(microTitle('seed','蚁后的五枚印记','叶片紧挨谷粒右边；月光花在羽毛右边隔一格；月石在羽毛右边；谷粒不在两端。每枚印记只用一次。')+'<div class="order-slots"></div><div class="order-bank">'+names.map((n,i)=>`<button data-order="${i}">${n}</button>`).join('')+'</div>'+microControls()+'<p id="micro-msg">按推理出的从左到右顺序放入。</p>');const draw=()=>{$('.order-slots').innerHTML=Array.from({length:5},(_,i)=>'<span>'+(a[i]===undefined?'空槽':names[a[i]])+'</span>').join('');modal.querySelectorAll('[data-order]').forEach((b,i)=>b.disabled=a.includes(i))};modal.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>{a.push(+b.dataset.order);draw();if(a.length===5){if(a.join('')==='41320'){close();use('seed');finishMicro('蚁后收下谷粒，赠予第二枚星片和通往树冠的路线。',()=>getShard('microQueenShard'))}else microMessage('至少有一条条件没有满足。撤回末尾几枚再排。')}});$('#micro-undo').onclick=()=>{a.pop();draw()};$('#micro-reset').onclick=()=>{a=[];draw()};draw()}
function silkbridge(){let a={sides:[0,0,0,0],light:0,time:0},chosen=[],history=[];const times=[1,2,5,8],names=['轻足蚁','巡逻蚁','蜗牛','甲虫'];panel(microTitle('lantern','萤灯只能亮十五分钟','桥每次最多走两位，必须带灯；两位同行按较慢者计时。有人要带灯回来。四位全部过桥，总用时不超过 15。')+'<div class="bridge-readout"></div><div class="crossing-bank"></div><button class="primary" id="bridge-cross">带灯过桥</button>'+microControls()+'<p id="micro-msg">先安排快的两位，想想谁负责送灯。</p>');const draw=()=>{$('.bridge-readout').textContent=`已用 ${a.time} / 15 分钟 · 灯在${a.light?'对岸':'起点'}`;$('.crossing-bank').innerHTML=names.map((n,i)=>`<button data-cross="${i}" ${a.sides[i]!==a.light?'disabled':''} class="${chosen.includes(i)?'picked':''}">${propImage(['ant','ant','snail','beetle'][i])}<span>${n}</span><b>${times[i]} 分钟</b><small>${a.sides[i]?'对岸':'起点'}</small></button>`).join('');modal.querySelectorAll('[data-cross]').forEach(b=>b.onclick=()=>{const i=+b.dataset.cross;if(chosen.includes(i))chosen=chosen.filter(v=>v!==i);else if(chosen.length<2)chosen.push(i);draw()})};$('#bridge-cross').onclick=()=>{const n=M.bridgeMove(a,chosen);if(!n){microMessage('选择与灯同岸的一位或两位同行者。');return}if(n.time>15){microMessage('这次安排会超过十五分钟。撤回几步，换个送灯顺序。');return}history.push(a);a=n;chosen=[];draw();if(a.sides.every(Boolean)){close();finishMicro('四位旅伴全部过桥，萤灯刚好够用。')}};$('#micro-undo').onclick=()=>{if(history.length)a=history.pop();chosen=[];draw()};$('#micro-reset').onclick=()=>{a={sides:[0,0,0,0],light:0,time:0};history=[];chosen=[];draw()};draw()}
function barkhanoi(){let a=[[4,3,2,1],[],[]],from=null,history=[];panel(microTitle('plank','树洞里的四层升梯','把左边四层木盘搬到右边。一次只搬最上面一层，大盘不能压在小盘上。先选起点，再选落点。')+'<div class="hanoi-pegs"></div>'+microControls()+'<p id="micro-msg">三个支架都可以暂存木盘。</p>');const draw=()=>{$('.hanoi-pegs').innerHTML=a.map((stack,i)=>`<button data-peg="${i}" class="${from===i?'picked':''}" aria-label="${['左','中','右'][i]}支架，${stack.length}层"><span class="hanoi-pole"></span>${stack.map((n,j)=>`<i class="wood-disk" style="width:${30+n*14}%;bottom:${8+j*20}px">${n}</i>`).join('')}</button>`).join('');modal.querySelectorAll('[data-peg]').forEach(b=>b.onclick=()=>{const to=+b.dataset.peg;if(from===null){if(a[to].length)from=to;draw();return}const n=M.hanoiMove(a,from,to);from=null;if(!n){microMessage('大盘不能压在小盘上。换一个落点。');draw();return}history.push(a);a=n;draw();microMessage('已搬动 '+history.length+' 次。');if(a[2].length===4){close();finishMicro('升梯架稳了，树洞里找到一根完整羽毛。',()=>give('feather'))}})};$('#micro-undo').onclick=()=>{if(history.length)a=history.pop();from=null;draw()};$('#micro-reset').onclick=()=>{a=[[4,3,2,1],[],[]];from=null;history=[];draw()};draw()}
const nestSolution=[1,2,3,4,3,4,1,2,2,1,4,3,4,3,2,1],nestGivens=[0,1,4,5,10,15];
function nestsudoku(){if(!flag('nestTablet')){say('鸟窝的摆放规矩藏在羽绒内室，先进去看看刻在蛋壳上的图示。');return}const initial=nestSolution.map((v,i)=>nestGivens.includes(i)?v:0);let a=initial.slice(),history=[];const icons=['','seed','moonflower','water','feather'];panel(microTitle('feather','鸟窝的四种材料','每一行、每一列、每个粗线围起的 2×2 小格，都要各有一份谷粒、月光花、露水和羽毛。点空格轮换材料；刻好的格子不能改。')+'<div class="micro-grid nest-sudoku"></div><button class="primary" id="nest-check">检查巢材</button>'+microControls()+'<p id="micro-msg">相同材料不能在同一组出现两次。</p>');const draw=()=>{$('.nest-sudoku').innerHTML=a.map((v,i)=>`<button data-nest="${i}" ${nestGivens.includes(i)?'disabled':''} class="${nestGivens.includes(i)?'given':''}" aria-label="巢材第${Math.floor(i/4)+1}行第${i%4+1}列，${v||'空'}">${v?propImage(icons[v]):'·'}</button>`).join('');modal.querySelectorAll('[data-nest]').forEach(b=>b.onclick=()=>{const i=+b.dataset.nest;history.push(a.slice());a[i]=(a[i]+1)%5;draw()})};$('#nest-check').onclick=()=>{if(M.sudokuOK(a)){close();finishMicro('巢材摆放妥当，鸟儿让出通向羽毛坡道的路。')}else microMessage('还有空格或重复材料。先检查只缺一件材料的行、列和小方格。')};$('#micro-undo').onclick=()=>{if(history.length)a=history.pop();draw()};$('#micro-reset').onclick=()=>{a=initial.slice();history=[];draw()};draw()}
function featherpegs(){if(!need('feather','先在树洞升梯里找到完整羽毛，铺平这段坡道。'))return;let bits=(1<<15)-2,selected=null,history=[];panel(microTitle('seed','羽毛上的十五颗种子','种子沿直线跳过相邻一颗，落在空穴，拿走被跳过的种子。上下斜线和横线都可跳。最后只留一颗。')+'<div class="peg-triangle"></div>'+microControls()+'<p id="micro-msg">先点要移动的种子，再点它要落入的空穴。</p>');const draw=()=>{$('.peg-triangle').innerHTML=Array.from({length:5},(_,r)=>'<div>'+Array.from({length:r+1},(_,c)=>{const i=r*(r+1)/2+c;return `<button data-seedpeg="${i}" class="${selected===i?'picked':''} ${bits&(1<<i)?'occupied':'empty'}" aria-label="种子穴${i+1}，${bits&(1<<i)?'有种子':'空'}">${bits&(1<<i)?propImage('seed'):''}</button>`}).join('')+'</div>').join('');modal.querySelectorAll('[data-seedpeg]').forEach(b=>b.onclick=()=>{const i=+b.dataset.seedpeg;if(bits&(1<<i)){selected=i;draw();return}const move=M.pegMoves(bits).find(m=>m[0]===selected&&m[2]===i);if(!move){microMessage('需要沿一条直线，恰好跳过一颗相邻种子。');return}history.push(bits);bits=M.pegApply(bits,move);selected=null;draw();if((bits&(bits-1))===0){close();use('feather');finishMicro('只留下一颗种子，羽毛平衡下来，露出通往树顶的路。')}else if(!M.pegMoves(bits).length)microMessage('暂时没有可跳的位置。撤回几步重新安排。')})};$('#micro-undo').onclick=()=>{if(history.length)bits=history.pop();selected=null;draw()};$('#micro-reset').onclick=()=>{bits=(1<<15)-2;history=[];selected=null;draw()};draw()}
function starcode(){const code=[2,4,0,3],icons=['seed','feather','moonstone','lens','moonflower'];let guess=[0,1,2,3],history=[];panel(microTitle('lens','星枝上的材质暗码','四个位置由五种材料选出，每种最多一次。点格子换材料，提交后根据反馈推断：正位=材料与位置都对；错位=材料对、位置不对。')+'<div class="code-materials"></div><button class="primary" id="material-check">试验这组材料</button><div class="material-history"></div><p id="micro-msg">反馈只给数量，需要结合前后几次尝试推理。</p>');const draw=()=>{$('.code-materials').innerHTML=guess.map((v,i)=>`<button data-material="${i}" aria-label="暗码位置${i+1}，材料${v+1}">${propImage(icons[v])}</button>`).join('');modal.querySelectorAll('[data-material]').forEach(b=>b.onclick=()=>{const i=+b.dataset.material;guess[i]=(guess[i]+1)%5;draw()});$('.material-history').innerHTML=history.map(h=>'<div>'+h.guess.map(v=>propImage(icons[v])).join('')+`<span>正位 ${h.f[0]} · 错位 ${h.f[1]}</span></div>`).join('')};$('#material-check').onclick=()=>{if(new Set(guess).size<4){microMessage('每种材料只能出现一次。');return}const f=M.feedback(code,guess);if(f[0]===4){close();finishMicro('星枝映出正确的材质，第三枚星片落入掌心。',()=>getShard('microCanopyShard'))}else{history.unshift({guess:guess.slice(),f});draw();microMessage('已记录反馈。没有次数限制，可以逐步排除。')}};draw()}
function shellmagic(){if((state.flags.shards||0)<3){say('还需要粮仓、蚁后与星枝的三枚星片。先沿来路补齐线索。');return}let a=[4,8,2,9,5,1,3,6,7],selected=null,history=[];panel(microTitle('star','蛋壳顶冠的九宫和','把 1—9 九块木片排好，让每行、每列和两条对角线的和都为 15。先点一块，再点另一块交换。')+'<div class="micro-grid magic-grid"></div><div class="magic-totals"></div>'+microControls()+'<p id="micro-msg">中间的 5 已经固定。想想角落和边缘应该放哪些数。</p>');const draw=()=>{$('.magic-grid').innerHTML=a.map((v,i)=>`<button data-magic="${i}" ${i===4?'disabled':''} class="${selected===i?'picked':''}" aria-label="木片${v}">${v}</button>`).join('');modal.querySelectorAll('[data-magic]').forEach(b=>b.onclick=()=>{const i=+b.dataset.magic;if(selected===null){selected=i;draw();return}history.push(a.slice());[a[selected],a[i]]=[a[i],a[selected]];selected=null;draw();if(M.magicOK(a)){close();use('shard');solve('三枚星片嵌进顶冠，蚁巢和鸟窝的旅伴都赶来参加月夜野餐。')}});$('.magic-totals').textContent='行和：'+[0,1,2].map(r=>a[r*3]+a[r*3+1]+a[r*3+2]).join(' / ')};$('#micro-undo').onclick=()=>{if(history.length)a=history.pop();selected=null;draw()};$('#micro-reset').onclick=()=>{a=[4,8,2,9,5,1,3,6,7];history=[];selected=null;draw()};draw()}
const microPuzzles={leafgrid,ferry,anttrail,climate,seedstore,queenorder,silkbridge,barkhanoi,nestsudoku,featherpegs,starcode,shellmagic};
const previousPuzzle=puzzle;puzzle=function(){const fn=microPuzzles[current().type];if(fn)fn();else previousPuzzle()};

;

/* micro-world.js */
'use strict';
chapters[3]='夜露蚁国';chapters[4]='树冠星巢';
items.seed=[propImage('seed'),'金色谷粒'];items.feather=[propImage('feather'),'完整羽毛'];
const microScenes=[
['micro-dew','露珠草海 · 透光的叶脉','进入卷叶内侧，解开叶脉的明暗排列。','leafgrid','lens',[15,31,27,35],[58,15,25,25],['点卷叶入口，再点内部机关。左侧数字看横行，上方数字看竖列；先打开“一行练习”学会怎样读数字。','把每段光纹分别靠左、靠右试想，重叠的位置一定亮，再用竖列缩小范围。','五行依次是：暗亮亮亮亮；暗亮暗暗暗；亮暗亮暗暗；亮暗亮暗暗；亮亮暗暗暗。']],
['micro-ferry','叶舟渡口 · 三位乘客','安全把甲虫、蚜虫与嫩叶渡过小溪。','ferry','water',[21,45,32,30],[64,32,22,25],['船只能带一件货物，你离开的一岸不能留下会互相伤害的组合。','先运蚜虫；甲虫过河后，要把蚜虫带回来。','蚜虫去→空船回→甲虫去→蚜虫回→嫩叶去→空船回→蚜虫去。']],
['micro-crossroads','蚁道岔口 · 一次也不重复','先进入树根支道找到路线拓片，再规划巡逻路线。','anttrail','lens',[55,28,27,42],[8,28,24,43],['树根支道里的拓片说明：走遍全部 16 格，①②③依次经过，最后到左下出口。','可以先沿上排到①，再折回下一排到②，然后向右到③。','按四行蛇形走：第一行向右、第二行向左、第三行向右、第四行向左。']],
['micro-nursery','蚁卵育幼室 · 两种刻度','调节三个装置，同时稳定温度与湿度。','climate','lantern',[12,38,30,28],[60,12,24,31],['叶窗、水槽、菌灯各有0—4档，每档对温湿度的影响不同。','温度减湿度等于1，即 2×叶窗−水槽−菌灯=1。再结合温度17。','叶窗3档、水槽3档、菌灯2档。']],
['micro-granary','谷粒粮仓 · 只能推不能拉','进入菌圃储藏室找绳子，再把三颗谷粒推入粮槽。','seedstore','seed',[5,28,30,44],[57,32,24,43],['先进入后方的菌圃储藏室，把菌丝绳带回来。','先移动中间的谷粒，为另外两颗腾出通路；岩壁后侧需要留出能绕行的位置。','从初始位置依次走：上、左、下、右、下、下、左、左、上、上、左、右、下、下、左、左、上、上。']],
['micro-queen','蚁后门厅 · 五枚印记','以谷粒为礼，推理五枚印记的唯一顺序。','queenorder','seed',[49,26,29,40],[7,36,25,29],['献上谷粒后，点地面刻痕阅读五枚实物的关系。','先把相邻的一对看作整体，再结合间隔条件排除位置。','顺序：羽毛、月石、月光花、谷粒、叶片。']],
['canopy-silk','蛛丝渡桥 · 十五分钟','带着萤灯安排四位旅伴通过蛛丝桥。','silkbridge','lantern',[22,18,58,25],[2,19,18,32],['同行按较慢者计时，灯每次都必须随人移动，桥最多容纳两位。','不要让最快的一位来回带每个慢者。先让两位快者配合送灯。','1和2去（2），1回（1），5和8去（8），2回（2），1和2去（2），共15。']],
['canopy-lift','树皮升梯 · 四层木盘','走进树洞夹层，把四层升梯搬到右支架。','barkhanoi','plank',[43,29,27,39],[39,43,30,22],['一次只能搬最上面一层，大盘不能压在小盘上。','先借右支架，把上面三层全部移到中间；再把最大盘移到右边。','先把三层从左搬到中，把第四层移右；最后把中间三层按同样规则移到右。最少15步。']],
['canopy-nest','鸟窝边缘 · 四种巢材','进入羽绒内室读蛋壳图示，再推理巢材的位置。','nestsudoku','feather',[37,40,33,29],[75,31,21,39],['羽绒内室的蛋壳图示解释了每行、每列与每个2×2格的规则。','先看只缺一种材料的行或列；不要只满足行而忘了小方格。','四行依次为：谷花露羽；露羽谷花；花谷羽露；羽露花谷。']],
['canopy-feather','羽毛坡道 · 留下一颗','用完整羽毛搭稳坡道，跳走多余的种子。','featherpegs','seed',[21,32,46,37],[70,17,23,34],['只有跳过相邻的一颗种子，落进空穴，才能拿走中间那颗。横线与两种斜线都能跳。','第一步可以把第三排最左边的种子跳到顶端空穴。注意为最后几步保留连通区域。','卡住时撤回，不要把最后几颗分散到三个角。总共需要13次有效跳跃。']],
['canopy-stars','星枝瞭望台 · 材质暗码','根据正位、错位反馈，推断四个位置的材料。','starcode','lens',[9,15,25,35],[70,27,22,32],['五种材料中选四种，每种最多一次。正位和错位都是数量，不能直接指出是哪一格。','一次尽量只改动一到两个位置，对比反馈来排除；没有次数上限。','正确顺序：月光石、月光花、谷粒、透镜。']],
['canopy-finale','鸟巢顶冠 · 九宫的约定','进入蛋壳穹室，将三枚星片嵌入九宫机关。','shellmagic','star',[40,35,30,38],[73,24,22,35],['每行、每列和两条对角线都要等于15，九个数各用一次。','中心必须是5，四个角放偶数，四条边的中间放奇数。','一种排法：8、1、6 / 3、5、7 / 4、9、2。']]
];
levels.splice(18,12,...microScenes.map(([asset,title,goal,type,art,target,clue,hint])=>({asset:'micro/'+asset,title,goal,type,icon:'✦',art,target,clue,hint})));
Object.assign(puzzleProps,{leafgrid:'lens',ferry:'water',anttrail:'lens',climate:'lantern',seedstore:'seed',queenorder:'seed',silkbridge:'lantern',barkhanoi:'plank',nestsudoku:'feather',featherpegs:'seed',starcode:'lens',shellmagic:'star'});
const subScenes={
 18:{id:'leaf',asset:'sub-dew',name:'卷叶内侧',entrance:[14,34,29,36],mode:'puzzle',target:[36,24,30,45],clue:[6,30,24,35],text:'点叶片机关，按行、列数字点亮格子。数字 5 表示五格全亮；1、1 表示两个分开的单格。机关里有可点按的练习。'},
 20:{id:'roots',asset:'sub-roots',name:'树根支道',entrance:[7,29,26,40],mode:'clue',target:[40,35,28,35],clue:[6,30,26,35],text:'巡逻路线必须走遍16格，不重复；先过右上①，再过第二排左侧②，再过第三排右侧③，最后由左下出口离开。',flag:'rootRoute',note:'巡逻蚁的路线拓片'},
 22:{id:'fungus',asset:'sub-fungus',name:'菌圃储藏室',entrance:[57,32,24,43],mode:'item',target:[41,39,26,32],clue:[6,30,22,32],text:'在菌床边找到一段结实的菌丝绳，可以带回粮仓固定搬运装置。',flag:'fungusRope',note:'菌丝绳与粮槽',item:'rope'},
 25:{id:'hollow',asset:'sub-hollow',name:'树洞夹层',entrance:[7,16,27,44],mode:'puzzle',target:[37,29,30,42],clue:[6,25,23,37],text:'三根木桩能暂存木盘。最大盘在底层，小盘必须始终在大盘上面。'},
 26:{id:'down',asset:'sub-nest',name:'羽绒内室',entrance:[75,31,21,39],mode:'clue',target:[40,28,31,45],clue:[7,29,25,35],text:'蛋壳上的图示说：每行、每列、每个粗线围起的2×2小格，都要各有一份谷粒、月光花、露水和羽毛。',flag:'nestTablet',note:'蛋壳上的巢材图示'},
 29:{id:'shell',asset:'sub-shell',name:'蛋壳穹室',entryLabel:'进入巢内深处',entrance:[64,54,24,29],mode:'puzzle',target:[38,29,31,41],clue:[5,30,25,35],text:'蚁巢粮仓、蚁后和星枝上找到的三枚星片，要一起嵌入九宫顶冠。每条线的和都是15。'}
};
const baseCurrent=current;
function insideMicro(){return !!(state.microView&&state.microView.scene===state.index&&subScenes[state.index])}
current=function(){const l=baseCurrent();if(!insideMicro())return l;const sub=subScenes[state.index];return {...l,asset:'micro/'+sub.asset,title:l.title.split(' · ')[0]+' · '+sub.name,target:sub.target,clue:sub.clue,goal:sub.text}};
function microNavigate(enter){const at=state.index;close();scene.classList.add('view-changing');setTimeout(()=>{if(state.index!==at){scene.classList.remove('view-changing');return}state.microView=enter?{scene:state.index,id:subScenes[state.index].id}:null;save();render();walk(18);say(enter?'走进'+subScenes[state.index].name+'。'+current().goal:levels[state.index].goal);requestAnimationFrame(()=>scene.classList.remove('view-changing'))},240)}
function inspectSub(){const sub=subScenes[state.index];if(!sub)return;const fresh=sub.flag&&!flag(sub.flag);if(sub.flag)mark(sub.flag);if(sub.item&&fresh)give(sub.item);if(sub.note)note(sub.note,sub.text);panel(microTitle(sub.item||levels[state.index].art,sub.name+'的发现',sub.text)+'<p>可以点“返回外侧”，把发现带回主场景。</p><button class="primary" id="micro-found">收好发现</button>');$('#micro-found').onclick=close}
const oldObserve=observe;observe=function(){if(state.index<18)return oldObserve();const l=levels[state.index];if(insideMicro())return inspectSub();note(l.title+' · 观察',l.hint[0]);panel(microTitle(l.art,'仔细观察',l.hint[0])+'<button class="primary" id="micro-observe-close">记入手账</button>');$('#micro-observe-close').onclick=close};
const beforeMicroRender=render;render=function(){beforeMicroRender();document.querySelectorAll('.sub-back').forEach(el=>el.remove());const sub=subScenes[state.index];if(state.index<18)return;const l=levels[state.index];$('#hotspots').innerHTML='';if(sub){if(insideMicro()){
 addHotspot(sub.target,sub.mode==='puzzle'?'探索内部机关':sub.mode==='item'?'拿取菌丝绳':'读取内部线索',()=>sub.mode==='puzzle'?puzzle():inspectSub());
 addHotspot(sub.clue,'观察内部细节',inspectSub);
 const back=document.createElement('button');back.className='sub-back';back.textContent='← 返回'+l.title.split(' · ')[0];back.onclick=()=>{walk(18,()=>microNavigate(false))};scene.appendChild(back);
 $('.scene-tag small').textContent='内室 · '+l.title.split(' · ')[0];
 }else{
 if(sub.mode!=='puzzle')addHotspot(l.target,'探索主要机关',puzzle);
 addHotspot(sub.entrance,sub.entryLabel||'进入'+sub.name,()=>microNavigate(true));const portal=$('#hotspots').children[$('#hotspots').children.length-1];portal.classList.add('portal');
 if(sub.mode==='puzzle')addHotspot(l.clue,'观察场景线索',observe);
 }}else{addHotspot(l.target,'探索主要机关',puzzle);addHotspot(l.clue,'观察场景线索',observe)}
 const tag=document.createElement('div');tag.className='scene-result';tag.textContent=state.done[state.index]?(state.index===29?'✓ 全部通关':'✓ 已完成 · 点击左上角选择下一关'):'';$('#hotspots').appendChild(tag);
};
const oldGo=go;go=function(i){if(i<0||i>state.unlocked)return;state.microView=null;oldGo(i)};
const oldWin=win;win=function(){sfx('win');panel('<div class="success">'+microTitle('star','月夜野餐，终于到达','星片点亮鸟巢顶冠。松鼠、蚁群和鸟儿围在一起，饼干和花蜜在月光下变成了丰盛的野餐。')+'<p>5 大关 · 30 个主场景 · 6 个可进入的内室。<br>谢谢你陪失眠夜走过这段微小又辽阔的旅程。</p><button class="primary" id="again">再玩一次 ↻</button></div>');$('#again').onclick=resetGame};
levels[2].goal='擦开四处雾痕，推算窗边暗匣的密码。';levels[2].hint=['四处雾痕下面有三条等式和一条排列顺序，需要一起读。','两叶+太阳=15，太阳+星=13，叶+星=10。先用叶表示其余两种图案。','叶=4、太阳=7、星=6；锁码按星、叶、太阳排列，是647。'];
render();fitStage();

;

/* cinematic-engine.js */
/* Pure opening-film timeline. Coordinates are percentages of the 16:9 stage. */
(function(root){
 const mix=(a,b,p)=>a+(b-a)*Math.max(0,Math.min(1,p));
 function frame(t){
  t=Math.max(0,Math.min(21,t));
  const f={room:'lounge',blend:0,heroX:29,heroBottom:12,heroPose:'eat',squirrelX:-24,squirrelBottom:12,squirrelPose:'run',squirrelFacing:1,cookie:false,caption:'失眠夜：雨停了，先吃一块饼干。',beat:'早餐时光',done:t>=21};
  if(t<4){f.heroPose=Math.floor(t*2)%2?'chew':'eat';}
  else if(t<6.7){let p=(t-4)/2.7;f.heroPose='chew';f.squirrelX=mix(-24,29,p);f.squirrelBottom=12+Math.sin(p*Math.PI)*8;f.caption='窗边传来窸窸窣窣的声音……';f.beat='不速之客';}
  else if(t<8.1){let p=(t-6.7)/1.4;f.heroPose='chew';f.squirrelX=mix(29,30,p);f.squirrelBottom=12+Math.sin(p*Math.PI)*6;f.squirrelPose=p<.55?'reach':'hold';if(p>=.55)f.heroPose='surprise';f.caption='失眠夜：诶？我的饼干！';f.beat='饼干被抢走了';}
  else if(t<11.6){let p=(t-8.1)/3.5;f.heroPose=t<8.6?'surprise':'run';f.heroX=mix(29,100,(t-8.6)/3);f.squirrelX=mix(30,111,p);f.cookie=true;f.caption='失眠夜：等等，那是我的！';f.beat='追上那只松鼠';}
  else if(t<12.5){f.blend=(t-11.6)/.9;f.heroX=105;f.squirrelX=115;f.heroPose='run';f.cookie=true;f.caption='脚步声一路拐进了厨房。';f.beat='雨后厨房';}
  else if(t<17.4){let p=(t-12.5)/4.9;f.room='kitchen';f.blend=1;f.heroBottom=8;f.heroX=mix(-24,20,p);f.heroPose='run';f.squirrelX=mix(10,97,p);f.squirrelBottom=12+Math.max(0,Math.sin((t-15.5)*Math.PI))*((t>15.5)?8:0);f.cookie=true;f.caption='失眠夜：别跑，我看见你了！';f.beat='第一章 · 雨后厨房';}
  else{f.room='kitchen';f.blend=1;f.heroBottom=8;f.heroX=20;f.heroPose='idle';f.squirrelX=mix(97,121,(t-17.4)/.8);f.cookie=true;f.caption='失眠夜：咦，钻到哪里去了？先找找右侧房门上的机关。';f.beat='微光游记 · 冒险开始';}
  return f;
 }
 function chaseFrame(t,index){
  const start=index===14?[72,17]:index===17?[76,14]:[70,23];
  const p=Math.max(0,Math.min(1,(t-.6)/1.9));
  return {x:mix(start[0],112,p),bottom:start[1]+(index===14?12:5)*p+Math.sin(p*Math.PI*4)*2,pose:t<.6?'alert':'run',cookie:true,done:t>=2.5};
 }
 const api={duration:21,frame,chaseDuration:2.5,chaseFrame};if(typeof module==='object'&&module.exports)module.exports=api;root.OpeningTimeline=api;
})(typeof globalThis==='undefined'?this:globalThis);

;

/* cinematic.js */
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

;

/* world-actions.js */
/* Physical scene interactions: pickup, tool assembly, environment changes and harmless red herrings. */
'use strict';
const worldArt=(id,cls='')=>`<img class="world-art ${cls}" src="assets/fast/world/${id}.webp" alt="" draggable="false">`;
Object.assign(items,{shears:[worldArt('shears'),'修枝剪'],pole:[worldArt('pole'),'细长木杆'],lashedShears:[`<span class="assembled-shears">${worldArt('shears')}${propImage('rope')}</span>`,'绑好绳的修枝剪'],longShears:[`<span class="long-shears">${worldArt('pole')}${worldArt('shears')}</span>`,'长柄修枝剪']});
let worldTakingTowel=false;
function openKitchenCabinet(){if(flag('cabinetOpen'))return;worldAction('cabinet',$('[data-world="kitchen-cabinet"]'),()=>{mark('cabinetOpen');render();say('柜门拉开了，深处压着一角旧布。')},650)}
function takeCabinetTowel(){if(!flag('cabinetOpen')){say('木柜还关着，先拉开柜门。');return}if(flag('cabinetTowelTaken')||state.items.includes('towel')){say('这块旧布已经取走了。');return}mark('cabinetTowelTaken');give('towel');say('拿到旧毛巾了。右侧房门的九宫格木锁还没有解开。')}
function waterRestored(){mark('waterOn');render();say('水接通了！水槽里流出了水。拿毛巾到水龙头下洗一洗。');sfx('water')}
function worldFeedback(text,el,sound='wood'){say(text);sfx(sound);if(el){el.classList.remove('world-wiggle');void el.offsetWidth;el.classList.add('world-wiggle')}}
const worldBusy=new Set();
function worldAction(key,el,action,ms=750){const at=state.index,st=state,token=at+':'+key;if(worldBusy.has(token))return;worldBusy.add(token);heroMotion('act');if(el)el.classList.add('world-working');setTimeout(()=>{worldBusy.delete(token);if(state!==st||state.index!==at)return;action()},ms)}
function washAtSink(){if(!flag('waterOn')){worldFeedback('水龙头里没有水。沿着右上方的水管找找断口。');return}if(!need('towel','先回厨房找到毛巾。'))return;worldAction('wash',$('[data-world="sink"]'),()=>{mark('clean');note('干净的毛巾','水流带走了污渍，可以用来擦窗。');solve('毛巾洗干净了！把它带去窗边。')},1100);sfx('water')}
function worldPickup(id,flagName,text){if(flag(flagName)){say(text||'已经收进布包了。');return}mark(flagName);give(id);say(text||('拿到了'+items[id][1]+'。'))}
function combineWorldTools(a,b){const pair=new Set([a,b]);if(pair.has('shears')&&pair.has('rope')){if(!state.items.includes(a)||!state.items.includes(b))return true;use('shears');use('rope');give('lashedShears');say('把绳子绕紧剪刀柄，留出一段可以远处拉动的绳头。');return true}if(pair.has('lashedShears')&&pair.has('pole')){if(!state.items.includes(a)||!state.items.includes(b))return true;use('lashedShears');use('pole');give('longShears');say('修枝剪固定在长杆顶端了。拉绳就能剪断高处的丝线。');return true}return false}
function rustleSpider(){if(flag('spiderAway')){worldFeedback('铃还在摇，蜘蛛已经沿丝退到一边了。',$('[data-world="garden-bell"]'),'metal');return}const spider=$('[data-world="spider"]');if(spider)spider.classList.add('spider-retreat');worldAction('spider',spider,()=>{mark('spiderAway');render();say('铃声让蜘蛛沿丝退到了墙边。现在可以清理空网了。')},1000);sfx('metal')}
function clearWeb(){if(flag('webCleared')){say('通路已经清理干净。');return}if(selected!=='longShears'){worldFeedback(selected==='shears'?'修枝剪太短，够不到拱门上方的支撑丝。':'网的支撑丝在门洞高处，伸手够不到。也许能把工具接长。',$('[data-world="web"]'));return}if(!flag('spiderAway')){worldFeedback('蜘蛛还在网中央。先让它自己离开，别碰伤它。',$('[data-world="web"]'));return}sfx('wood');worldAction('cut-web',$('[data-world="web"]'),()=>{mark('webCleared');use('longShears');give('rope');render();solve('剪断高处支撑丝，蛛网垂落，门前的路通了！剩下的绳子留着修桥。')},1100)}
function liftBasketKey(){if(flag('fished')){say('钥匙已经捞出来了，选它去开木门。');return}if(!need('magnet','篮子太深，钥匙在最底下。需要磁铁和线。'))return;if(!flag('tied')){say('直接扔下去，磁铁也拿不回来了。先把细线系到磁铁上。');return}sfx('metal');worldAction('fishing',$('[data-world="basket-key"]'),()=>{mark('fished');use('magnet');give('key');render();say('钥匙跟着磁铁升上来了！现在去开右侧木门。')},1400)}
function openBackDoor(){if(flag('backDoorOpen')){if(typeof leaveScene==='function')leaveScene();return}if(!flag('fished')){worldFeedback('木门锁住了。篮底好像有一点金属反光。',$('[data-world="back-door"]'));return}if(!need('key','需要从藤篮里捞出的铜钥匙。'))return;worldAction('door',$('[data-world="back-door"]'),()=>{use('key');mark('backDoorOpen');solve('门打开了，沿松鼠的脚印去花园吧。');sfx('unlock')},800)}
function jugSelect(which){const selectedJug=state.flags.worldJugSelected;if(selectedJug&&selectedJug!==which){let a=state.flags.worldJug3||0,b=state.flags.worldJug5||0;if(selectedJug===3){let n=Math.min(a,5-b);a-=n;b+=n}else{let n=Math.min(b,3-a);b-=n;a+=n}state.flags.worldJug3=a;state.flags.worldJug5=b;state.flags.worldJugSelected=null;save();sfx('water');render();say(`水倒好了：三升壶 ${a} 升，五升壶 ${b} 升。`)}else{state.flags.worldJugSelected=which;save();render();say(`拿起${which}升壶。点水箱接满，点另一只壶互倒，点排水口倒空。`)}}
function jugFill(){const n=state.flags.worldJugSelected;if(!n){say('先拿起一只水壶，再来水箱接水。');return}state.flags['worldJug'+n]=n;save();sfx('water');render();say(`${n}升壶装满了。`)}
function jugDrain(){const n=state.flags.worldJugSelected;if(!n){say('石缝接着排水沟，可以倒空水壶。');return}state.flags['worldJug'+n]=0;state.flags.worldJugSelected=null;save();render();sfx('water');say(`${n}升壶里的水倒空了。`)}
function jugFinish(){const n=state.flags.worldJugSelected;if(!n){say('苗床牌子上写着：只收四升。先拿起水壶。');return}if(state.flags['worldJug'+n]!==4){worldFeedback('水量不对，苗床只需要恰好四升。先留在壶里，继续调整。',$('[data-world="jug-bed"]'),'water');return}worldAction('deliver-water',$('[data-world="jug-bed"]'),()=>{give('water');mark('worldWaterMeasured');solve('四升水已经装好，可以带去工具棚救活卷叶的植物。')},700);sfx('water')}
function waterShedPlant(){if(flag('plantWatered')){say('展开的三片叶子依次留下了叶、日、花的纹样。看看工具箱上的三个圆盘。');return}if(!need('water','植物卷着叶子，花盆标签写着：四升清水。'))return;worldAction('water-plant',$('[data-world="shed-plant"]'),()=>{use('water');mark('plantWatered');note('展开的叶片','叶片纹样从左到右：叶、日、花。');render();say('叶片舒展开了！上面的纹样与工具箱圆盘一样。')},1100);sfx('water')}
function turnShedWheel(i){if(!flag('plantWatered')){say('三个圆盘可以转动，但正确顺序藏在尚未展开的叶片上。');return}if(flag('shedOpen'))return;const a=state.flags.shedWorldCode||[0,0,0];a[i]=(a[i]+1)%3;state.flags.shedWorldCode=a;save();sfx('wood');if(a.join('')==='012'){mark('shedOpen');render();sfx('unlock');say('木扣弹开了。桥板在工具箱下方的架子上，可以拿出来了。')}else{render();say('圆盘转动了一格。')}}
function takeShedPlank(){if(!flag('shedOpen')){say('木架被工具箱的锁杆卡着，暂时抽不出桥板。');return}if(state.done[8])return;give('plank');solve('桥板抽出来了！带上它去修前面的断桥。')}
function worldObject(id,p,art,label,action,extra=''){const b=document.createElement('button');b.className='world-object '+extra;b.setAttribute('data-world',id);b.setAttribute('aria-label',label);b.style.left=p[0]+'%';b.style.top=p[1]+'%';b.style.width=p[2]+'%';b.style.height=p[3]+'%';b.innerHTML=art+`<span class="world-label">${label}</span>`;b.onclick=e=>{e?.stopPropagation?.();const at=state.index,st=state,view=state.microView;walk(p[0]+p[2]/2,()=>{if(state===st&&state.index===at&&state.microView===view&&modal.hidden)action(b)})};scene.appendChild(b);return b}
const inertArt='<span class="world-hit"></span>';
const worldBaseRender=render;render=function(){worldBaseRender();document.querySelectorAll('.world-object,.world-decoration').forEach(el=>el.remove());const i=state.index;if(i===0&&!state.items.includes('towel')&&!flag('cabinetTowelTaken')){if(!flag('cabinetOpen'))worldObject('kitchen-cabinet',[32,50,18,18],inertArt,'拉开中央木柜',openKitchenCabinet);else worldObject('cabinet-towel',[34,53,13,10],'<span class="cabinet-inner">'+propImage('towel')+'</span>','拿取柜内的旧布',takeCabinetTowel,'cabinet-reveal');}
if(i===1){if(flag('waterOn')){worldObject('water-stream',[5.9,31,2.4,13],'<i class="water-ribbon"></i>','流动的清水',washAtSink,'water-decoration')}worldObject('sink',[3,28,24,25],inertArt,'把毛巾放到水槽',washAtSink);worldObject('wash-basket',[1,60,18,18],inertArt,'检查洗衣筐',b=>worldFeedback('只有待洗衣物，下面没有暗格。',b));}
if(i===5){$('#hotspots').innerHTML='';worldObject('basket-key',[7,49,19,18],flag('fished')?'':propImage('key'),'检查藤篮底部',liftBasketKey,'basket-depth');if(!flag('backDoorOpen'))worldObject('back-door',[53,22,21,40],inertArt,'尝试打开后门',openBackDoor,flag('backDoorOpen')?'door-open':'');worldObject('back-hat',[6,2,11,17],inertArt,'看看草帽',b=>worldFeedback('草帽里落着几片干叶，没有钥匙。',b));worldObject('back-boots',[31,43,10,20],inertArt,'检查雨靴',b=>worldFeedback('靴子太重，套在手上也够不到篮底。',b));worldObject('back-plant',[19,22,10,15],inertArt,'摸摸花盆',b=>worldFeedback('花盆太沉，搬过去反而会压住篮子。',b));}
if(i===6){$('#hotspots').innerHTML='';if(!flag('webCleared'))worldObject('web',[71,17,15,30],worldArt('web'),'检查拱门蛛网',clearWeb,'web-obstacle');worldObject('spider',flag('spiderAway')?[84,16,3,5]:[77,28,3,5],worldArt('spider'),'观察蜘蛛',()=>say(flag('spiderAway')?'蜘蛛在墙边重新找落脚点。':'蜘蛛的腿随着铜铃轻微振动，听觉似乎很灵敏。'),'garden-spider');if(!flag('gardenShears'))worldObject('shears',[26,49,10,10],worldArt('shears'),'拿起修枝剪',()=>worldPickup('shears','gardenShears'));if(!flag('gardenPole'))worldObject('pole',[39,74,23,10],worldArt('pole'),'拿起细长木杆',()=>worldPickup('pole','gardenPole'));if(!flag('gardenRope'))worldObject('garden-rope',[11,46,13,12],inertArt,'拿起长椅绳子',()=>worldPickup('rope','gardenRope','绳子很结实。布包里先选一样工具，再点另一样，试着把它们绑在一起。'));worldObject('garden-bell',[88,4,10,17],inertArt,'轻摇铜铃',rustleSpider);worldObject('garden-pot',[30,42,9,24],inertArt,'挪动大花盆',b=>worldFeedback('花盆下只有潮湿的泥土。它太沉，没法垫脚。',b));worldObject('garden-board',[14,73,22,17],inertArt,'试试旧木板',b=>worldFeedback('木板已经腐朽，一踩就会裂开，不能拿它搭高。',b));worldObject('garden-sign',[4,7,17,20],inertArt,'看看褪色标牌',b=>worldFeedback('墙上的颜色是风铃旧标记，和挡路的蛛网无关。',b));}
if(i===7){$('#hotspots').innerHTML='';const a=state.flags.worldJug3||0,b=state.flags.worldJug5||0,active=state.flags.worldJugSelected;for(const [n,v,x]of [[3,a,30],[5,b,43]])worldObject('jug-'+n,[x,60,11,24],propImage('jug')+`<i class="jug-volume" style="height:${v/n*50}%"></i><b class="jug-number">${v} / ${n} 升</b>`,`${n}升水壶，现有${v}升`,()=>jugSelect(n),active===n?'jug-held':'');worldObject('jug-source',[5,25,18,25],inertArt,'从水箱接水',jugFill);worldObject('jug-drain',[58,78,18,12],'<i class="drain-lines"></i>','倒入排水口',jugDrain);worldObject('jug-bed',[40,23,25,24],inertArt,'查看四升苗床',jugFinish);worldObject('jug-colors',[79,39,14,10],inertArt,'拨动彩色把手',b=>worldFeedback('这是空苗柜的通风把手，转动它不能改变水量。',b));worldObject('jug-pot',[35,48,8,9],inertArt,'看看空花盆',b=>worldFeedback('花盆底下有排水孔，装水会漏掉。',b));}
if(i===8){$('#hotspots').innerHTML='';worldObject('shed-plant',[73,19,20,45],flag('plantWatered')?'<span class="plant-leaf leaf-a">'+propImage('leaf')+'</span><span class="plant-leaf leaf-b">'+propImage('leaf')+'</span><span class="leaf-clue">叶 · 日 · 花</span>':inertArt,'查看卷叶植物',waterShedPlant,flag('plantWatered')?'plant-unfolded':'');const a=state.flags.shedWorldCode||[0,0,0];for(let n=0;n<3;n++)worldObject('shed-wheel-'+n,[42+n*5.4,22,5,10],'<span class="etched-symbol">'+['叶','日','花'][a[n]]+'</span>','转动工具箱第'+(n+1)+'个圆盘',()=>turnShedWheel(n),'shed-wheel');worldObject('shed-plank',[41,51,19,6],inertArt,'抽出架子上的桥板',takeShedPlank,flag('shedOpen')?'plank-loose':'');worldObject('shed-trowel',[16,5,5,24],inertArt,'拿铲子试一试',b=>worldFeedback('铲子只能松土，植物缺的是清水。硬撬木锁会损坏桥板。',b));worldObject('shed-soil',[11,41,13,10],inertArt,'查看空陶盆',b=>worldFeedback('空盆里只有土，不是浇水的容器。',b));}
// Bind combination choices after the inventory has been rendered.
for(const slot of document.querySelectorAll('#inventory .slot')){const handler=slot.onclick;if(!handler)continue;const id=Object.keys(items).find(k=>slot.getAttribute('aria-label')==='选择'+items[k][1]);slot.onclick=()=>{if(selected&&id&&combineWorldTools(selected,id))return;handler()}}};
const worldOldPuzzle=puzzle;puzzle=function(){if(state.index===1&&flag('waterOn')&&!state.done[1])return washAtSink();if(state.index===5)return liftBasketKey();if(state.index===6)return clearWeb();if(state.index===7){say('水壶就在眼前。先拿一只壶，再点水箱接水，或点另一只壶互倒。');return}if(state.index===8)return waterShedPlant();worldOldPuzzle()};
Object.assign(levels[0],{title:'厨房 · 门上的九宫格',goal:'在厨房寻找能带走的东西，解开右侧房门的锁，继续追赶松鼠。',target:[91,33,8,17],targetLabel:'检查房门九宫格锁',clueLabel:'查看柜旁留下的木锁说明',hint:['下一间房的门就在画面最右侧。九宫格装在房门锁上；中央木柜里可以拿毛巾。','九宫格木片只能滑入相邻空位，目标是1、2、3 / 4、5、6 / 7、8、空。','复原九宫格后，再点右边房门推门通过。记得拿上木柜里的毛巾。']});
Object.assign(levels[1],{goal:'接通水管，再把毛巾放到真正的水槽里洗净。',hint:['先检查右上方断开的水管。','水接通后，选择布包里的毛巾，再点左侧水槽。','接通水路只完成了一半，亲手洗净毛巾才会开放下一场景。']});
Object.assign(levels[5],{goal:'把细线系上磁铁，在藤篮里捞出钥匙，再开后门。',hint:['钥匙在左侧藤篮底部，帽子、雨靴和花盆都不能帮你捞出来。','在布包里把磁铁与细线组合；选带线磁铁，再点藤篮。','钥匙升上来后，选铜钥匙，再点右侧木门。']});
Object.assign(levels[6],{title:'花园 · 蛛网挡住的路',goal:'找工具、组合长柄剪，让蜘蛛离开后清理门洞。',hint:['蛛网高处的支撑丝够不着。长椅、地面和花盆旁边有可以利用的东西。','把绳子绑上修枝剪，再与长木杆组合；观察蜘蛛对铜铃的反应。','拿绳、剪刀、木杆。先绳+剪刀，再绑绳剪刀+木杆。摇右上铜铃，选长柄剪剪蛛网。']});
Object.assign(levels[7],{goal:'直接拿起三升壶和五升壶，在水箱、排水口之间量出四升。',hint:['先点一只壶拿起它。点水箱接满，点另一只壶互倒，点地上排水口倒空。','水不会凭空丢失，倒错了可以随时倒空重来。苗床只收四升。','装满5→倒到3→倒空3→5中余2倒入3→再装满5→补满3，5中剩4，点苗床。']});
Object.assign(levels[8],{goal:'浇水让叶片展开，直接转动工具箱圆盘，亲手抽出桥板。',hint:['卷着的叶片藏着图案，先把四升清水浇到右侧植物上。','看展开的叶片，在场景中央工具箱上转动三个圆盘。','圆盘排成叶、日、花，再点工具箱下层架子上的桥板。']});
render();fitStage();if(state.started){$('#intro').style.display='flex';$('#start').innerHTML=state.completed?'再看看冒险结局 →':'继续微光游记 →'}

;

/* exit-flow.js */
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
const beforeExitRender=render;render=function(){beforeExitRender();document.querySelectorAll('.scene-exit').forEach(el=>el.remove());if(insideMicro())return;const [rect,kind,name,reason]=sceneExits[state.index],ready=sceneExitReady();const art=kind==='door'?'<i class="exit-door-leaf"></i>':'<i class="exit-path-glow"></i>';const el=worldObject('scene-exit',rect,art+`<span class="exit-caption">${ready?'前往':'查看'} · ${name} ${ready?'→':'⌁'}</span>`,(ready?'通过':'检查')+name,leaveScene,'scene-exit '+kind+' '+(ready?'exit-ready':'exit-blocked'));if(kind==='door'){const leaf=el.querySelector('.exit-door-leaf'),[x,y,w,h]=rect;leaf.style.backgroundImage=`url("assets/fast/${current().asset}.webp")`;leaf.style.backgroundSize=(10000/w)+'% '+(10000/h)+'%';leaf.style.backgroundPosition=(x/(100-w)*100)+'% '+(y/(100-h)*100)+'%'}
$('#next-scene').disabled=!ready;$('#next-scene').setAttribute('aria-label',ready?'通过场景出口继续':'先解除出口障碍');$('#next-scene').innerHTML=ready?'去出口 →':'出口受阻';document.querySelectorAll('.scene-result').forEach(e=>e.textContent=ready?'✓ 障碍已解除 · 点击出口继续':'');};
$('#next-scene').onclick=()=>{const p=sceneExits[state.index][0];walk(p[0]+p[2]/2,leaveScene)};
const oldExitPuzzle=puzzle;puzzle=function(){if(state.index===0&&sceneExitReady())return leaveScene();oldExitPuzzle()};
render();fitStage();if(state.started){$('#intro').style.display='flex';$('#start').innerHTML=state.completed?'再看看冒险结局 →':'继续微光游记 →'}

;

/* living-world.js */
/* Individually animated wildlife and three mechanisms placed in the actual map. */
'use strict';
const aliveBackgrounds={19:'micro-ferry',20:'micro-crossroads',21:'micro-nursery',23:'micro-queen',26:'canopy-nest',29:'canopy-finale'};
for(const [i,name]of Object.entries(aliveBackgrounds))levels[+i].asset='micro/'+name+'-alive';
function faunaActor(kind,x,y,width,delay=0,carry=false,extra=''){const el=document.createElement('button');el.className='fauna-actor '+kind+' '+extra;el.setAttribute('aria-label',kind==='worker-ant'?'观察行走的工蚁':'观察枝上的小鸟');el.style.left=x+'%';el.style.top=y+'%';el.style.width=width+'%';el.style.setProperty('--fauna-delay',delay+'s');el.innerHTML='<span class="fauna-direction"><i class="fauna-sprite"></i>'+(carry?propImage('seed','ant-cargo'):'')+'</span>';el.onclick=()=>{say(kind==='worker-ant'?'工蚁一边触碰触角，一边把谷粒运向巢穴。别挡住它们的路线。':'小鸟转头望向你，又轻轻扑了一下翅膀。');sfx(kind==='worker-ant'?'wood':'bird')};scene.appendChild(el);return el}
function worldTrailStep(i){if(!flag('rootRoute')){say('先去树根支道找到路线拓片，才能判断通往蚁巢的正确方向。');return}const path=state.flags.worldAntPath||[0];if(!M.routeStep(path,i)){worldFeedback('这里只能走到相邻且没有经过的土块。');return}path.push(i);state.flags.worldAntPath=path;save();if(path.length===16&&M.routeOK(path)){if(state.items.includes('lens'))use('lens');prepareSceneExit('巡逻蚁沿你排出的路线进入蚁巢，入口让开了。')}else{render();if(path.length===16)say('路走完了，但路标或出口顺序不对，可以撤回。')}}
function worldTrailUndo(reset=false){state.flags.worldAntPath=reset?[0]:(state.flags.worldAntPath||[0]).slice(0,-1);if(!state.flags.worldAntPath.length)state.flags.worldAntPath=[0];save();render()}
function worldQueenClue(){panel('<h2>门前的刻痕</h2><p>五枚实物各用一次，从左到右摆进凹槽。四条关系必须同时成立：</p><p>叶片紧挨谷粒的右边。<br>月光花在羽毛右边，中间恰好隔一格。<br>月石在羽毛右边，不一定相邻。<br>谷粒不在两端。</p><p>可以拿回末枚，也可以重新摆放。放齐后机关才会检查。</p><button class="primary" id="queen-clue-close">回地面摆放</button>');$('#queen-clue-close').onclick=close;}
function worldQueenGift(){if(flag('queenGift')){say('蚁后已经收下谷粒。把五枚印记放入身前的凹槽。');return}if(!need('seed','蚁后守着通往树冠的洞口，先带一颗谷粒作礼物。'))return;use('seed');mark('queenGift');render();say('蚁后收下谷粒，让你靠近五枚印记。')}
function worldQueenChoose(i){if(!flag('queenGift')){say('守卫蚁拦住了印记。先把谷粒送到蚁后面前。');return}const a=state.flags.worldQueenOrder||[];if(a.includes(i)||a.length>=5)return;a.push(i);state.flags.worldQueenOrder=a;save();if(a.length===5&&a.join('')==='41320'){getShard('microQueenShard');prepareSceneExit('印记排对了，蚁后让开了通往树冠的洞口。')}else{render();if(a.length===5)say('至少有一条关系没有满足，拿回最后一枚再试。')}}
function worldQueenUndo(reset=false){state.flags.worldQueenOrder=reset?[]:(state.flags.worldQueenOrder||[]).slice(0,-1);save();render()}
function worldNestClick(i){if(!flag('nestTablet')){say('先进入羽绒内室，看看蛋壳上的巢材规则。');return}if(nestGivens.includes(i))return;const a=state.flags.worldNestBoard||nestSolution.map((v,j)=>nestGivens.includes(j)?v:0);const history=state.flags.worldNestHistory||[];history.push(a.slice());a[i]=(a[i]+1)%5;state.flags.worldNestBoard=a;state.flags.worldNestHistory=history;save();render();sfx('wood')}
function worldNestUndo(reset=false){const initial=nestSolution.map((v,i)=>nestGivens.includes(i)?v:0),h=state.flags.worldNestHistory||[];state.flags.worldNestBoard=reset?initial:h.length?h.pop():initial;state.flags.worldNestHistory=reset?[]:h;save();render()}
function worldNestCheck(){if(!flag('nestTablet')){say('先读羽绒内室里的规则。');return}if(M.sudokuOK(state.flags.worldNestBoard||[])){prepareSceneExit('巢材摆放妥当，小鸟收拢翅膀，让开侧枝。')}else say('还有空槽或重复材料；每行、每列和每个小方格都要检查。')}
function attachSceneMechanism(kind,rect,html){const el=document.createElement('div');el.className='map-mechanism '+kind;el.setAttribute('data-map-mechanism',kind);el.style.left=rect[0]+'%';el.style.top=rect[1]+'%';el.style.width=rect[2]+'%';el.style.height=rect[3]+'%';el.innerHTML=html;scene.appendChild(el);return el}
const beforeLivingRender=render;render=function(){beforeLivingRender();document.querySelectorAll('.fauna-actor,.map-mechanism').forEach(el=>el.remove());const i=state.index;if(i>=18&&i<=23){faunaActor('worker-ant',4,43,8,-2,true);faunaActor('worker-ant',64,82,7,-7,false,'ant-return');faunaActor('worker-ant',17,26,5,-4,true);if(i===23)faunaActor('worker-ant',66,32,15,-1,false,'ant-queen')}
if(i===26){faunaActor('robin',80,12,13,-i);}
if(i===19){const aphid=worldObject('moving-aphid',[82,30,5,8],propImage('aphid'),'观察叶上的蚜虫',b=>worldFeedback('蚜虫正在慢慢啃食叶缘，过河时要把它和叶片分开照看。',b),'aphid-alive')}
if(insideMicro())return;
if(i===20){$('#hotspots').querySelectorAll('button').forEach(el=>{if(el.getAttribute('aria-label')==='探索主要机关')el.remove()});const path=state.flags.worldAntPath||[0],marks={0:'起',3:'①',4:'②',11:'③',12:'出口'};const el=attachSceneMechanism('map-ant-path',[43,40,38,43],'<div class="soil-route">'+Array.from({length:16},(_,n)=>`<button data-map-trail="${n}" class="${path.includes(n)?'visited':''} ${n===path.at(-1)?'current':''}" aria-label="地图蚁道第${n+1}格">${marks[n]||''}${n===path.at(-1)?'<i class="route-ant"></i>':''}</button>`).join('')+'</div><div class="map-controls"><button data-route-undo>撤回脚步</button><button data-route-reset>重走</button></div>');el.querySelectorAll('[data-map-trail]').forEach(b=>b.onclick=()=>worldTrailStep(+b.dataset.mapTrail));el.querySelector('[data-route-undo]').onclick=()=>worldTrailUndo();el.querySelector('[data-route-reset]').onclick=()=>worldTrailUndo(true);}
if(i===23){if(state.flags.queenPatternVersion!==2){state.flags.queenPatternVersion=2;state.flags.worldQueenOrder=[];save();}$('#hotspots').innerHTML='';worldObject('queen-gift',[66,30,17,20],inertArt,'向蚁后送上谷粒',worldQueenGift);const names=['叶片','月石','谷粒','月光花','羽毛'],arts=['leaf','moonstone','seed','moonflower','feather'],a=state.flags.worldQueenOrder||[];const el=attachSceneMechanism('map-queen-order',[36,54,43,29],'<div class="ground-slots">'+Array.from({length:5},(_,j)=>`<span>${a[j]===undefined?'':propImage(arts[a[j]])}</span>`).join('')+'</div><div class="ground-bank">'+names.map((n,j)=>`<button data-map-order="${j}" ${a.includes(j)?'disabled':''} aria-label="放置${n}">${propImage(arts[j])}<small>${n}</small></button>`).join('')+'</div><div class="map-controls"><button data-order-clue>读地面刻痕</button><button data-order-undo>拿回末枚</button><button data-order-reset>重新摆放</button></div>');el.querySelectorAll('[data-map-order]').forEach(b=>b.onclick=()=>worldQueenChoose(+b.dataset.mapOrder));el.querySelector('[data-order-clue]').onclick=worldQueenClue;el.querySelector('[data-order-undo]').onclick=()=>worldQueenUndo();el.querySelector('[data-order-reset]').onclick=()=>worldQueenUndo(true);}
if(i===26){const a=state.flags.worldNestBoard||nestSolution.map((v,j)=>nestGivens.includes(j)?v:0),icons=['','seed','moonflower','water','feather'];const el=attachSceneMechanism('map-nest-materials',[41,34,36,45],'<div class="woven-nest-grid">'+a.map((v,j)=>`<button data-map-nest="${j}" ${nestGivens.includes(j)?'disabled':''} aria-label="摆放巢材第${j+1}槽">${v?propImage(icons[v]):''}</button>`).join('')+'</div><div class="map-controls"><button data-nest-check>请鸟儿检查</button><button data-nest-undo>拿回一步</button><button data-nest-reset>重摆</button></div>');el.querySelectorAll('[data-map-nest]').forEach(b=>b.onclick=()=>worldNestClick(+b.dataset.mapNest));el.querySelector('[data-nest-check]').onclick=worldNestCheck;el.querySelector('[data-nest-undo]').onclick=()=>worldNestUndo();el.querySelector('[data-nest-reset]').onclick=()=>worldNestUndo(true);}
};
const beforeLivingPuzzle=puzzle;puzzle=function(){if(!insideMicro()){if(state.index===20){say(flag('rootRoute')?'直接在地面排出巡逻路线：走遍16格，依次经过①②③，最后到出口。':'先进入左侧树根支道，拿到路线拓片。');return}if(state.index===23)return worldQueenGift();if(state.index===26){say(flag('nestTablet')?'巢材就在窝边的编织格里，直接摆放，再请鸟儿检查。':'先进入羽绒内室阅读蛋壳图示。');return}}beforeLivingPuzzle()};
levels[20].goal='先取路线拓片，再直接在地面引导巡逻蚁，最后进入蚁巢。';levels[23].goal='向蚁后献上谷粒，再把地面五枚印记按规则放好，让守卫放行。';levels[23].hint=['先选谷粒，点蚁后献礼，再摆印记。','点地面刻痕阅读四条关系，先试着放间隔最远的一组，再排相邻的一组。','从左到右：羽毛、月石、月光花、谷粒、叶片。'];levels[26].goal='读内室规则，直接摆好窝边巢材，让鸟儿让开侧枝。';
render();fitStage();if(state.started){$('#intro').style.display='flex';$('#start').innerHTML=state.completed?'再看看冒险结局 →':'继续微光游记 →'}

;

/* rules-guide.js */
'use strict';
// Explain inputs and winning conditions without revealing the answer.
const sceneRules={
 tiles:['把 1—8 从左到右、从上到下排好，空格留在右下。','点紧挨空格的木片，它就会滑进去；斜着的、离空格远的不能动。','木片在空格左边，就能向右滑一格。先排上排，乱了可以重新打乱。'],
 pipes:['先接通九格水管，再在水龙头下洗毛巾。','点场景里的水管，每次顺时针转 90°。从左上入口连到右下出口，接口要彼此相接。','入口通水后，先在布包选毛巾，再点水池；水管接好不等于毛巾洗好了。'],
 wipe:['擦开四块雾痕，用三条等式推算暗匣的三位密码。','点每块雾痕显示刻字。相同图案始终是同一个数，按刻字给出的图案顺序输入三位数。','若“叶+叶=8”，每片叶就是 4；不要把图案数量直接当密码。'],
 balance:['让天平两侧总重量相同。','点砝码放上右盘，再点取下。看清每块砝码的重量，组合出左盘的总重。','重 1 和重 4 的砝码一起是 5，不是两块就算 2。'],
 code:['用窗边便签和钟面读出三位锁码。','打开线索手账查看密码读法，依次填写三个数字，再点开锁。','时间 8:40 按“小时在前，分钟在后，去冒号”的读法写成 840。'],
 fish:['用带线磁铁取钥匙，再打开后门。','在布包依次点磁铁和细线组合；选组合好的磁铁点藤篮，取钥匙后再选钥匙点门。','先拿到工具，再对场景目标使用。单独的磁铁没有线，不能把篮底钥匙拉回来。'],
 knots:['把蜘蛛引开，用长柄剪剪开挡路的蛛网。','找剪刀、绳子和长杆，在布包组合成长柄剪。先点铃铛引开蜘蛛，再选长柄剪点蛛网。','道具可在布包里组合；蜘蛛还在网上时不要直接去剪。'],
 jugs:['让 5 升壶里恰好剩 4 升，再交付清水。','先点一只壶选中，再点水箱装满、另一只壶倒水，或排水口倒空。点交付完成。','倒进另一只壶时，倒到对方满或自己空就停；不是把两壶水量对调。'],
 plant:['浇水后读叶片图案，打开工具箱取桥板。','在布包选四升清水，点植物。读展开叶片的先后顺序，再点三个转轮轮换图案。','图案的顺序也要对应，三个图案都出现但排错位置仍不能开锁。'],
 memory:['复现石块闪光的先后顺序。','先播放并观察，播放结束后按相同顺序点石块；忘了可重新播放。','若看到左、右、左，就点左、右、左，重复出现的也要再点。'],
 bells:['按墙上线索的颜色顺序敲铃。','先观察墙上圆点，回到铃铛机关，从第一个圆点开始逐一敲对应颜色。','同一种颜色可能出现多次，不是每只铃只敲一次。'],
 bridge:['铺桥板、绑牢绳子，再用钥匙开对岸门。','在布包选桥板点桥，再选绳子点桥；桥稳后选庭院钥匙点门。','要逐次选择并使用道具；只铺木板还不能安全通过。'],
 books:['让四本书同时满足留言中的位置条件。','先读留言，点书架中的书调整位置；每本书用一次。','“蓝紧挨红的左边”表示蓝和红必须相邻，中间不能夹别的书。'],
 gears:['选择齿轮，让输出轴达到要求转速。','点齿轮位轮换齿数，看清输入和输出要求，再测试传动。','输入齿数是输出的一半时，输出转速就是输入的一半；中间轮不改变这个比值。'],
 squirrel:['记住符号闪光，按同样顺序重复。','先播放，等闪光结束，再逐一点击符号。可重复播放，没有次数限制。','看的是先后顺序，不是每种符号出现了几次。'],
 stars:['让三层星环的缺口都朝正上方。','先选手灯照亮星盘，再点外、中、内环。每次转动角度不同，要分别调整。','正上方是 0°，转满 360°也回到正上方。'],
 musicbox:['安装齿轮组与发条钥匙，让八音盒运行。','先从布包选齿轮组使用，再选发条钥匙安装，最后按住上弦按钮直到刻度填满。','按住持续蓄力，快速点一下不会上满发条。'],
 chest:['放入徽章，让联动圆盘排成线索中的顺序。','先选星星徽章安装，再点圆盘轮换符号。每点一个，还会带动右侧那个一起转。','最右圆盘的右侧是最左圆盘。一次操作会改变两个位置。'],
 leafgrid:['点亮格子，让全部五行、五列符合边上的数字。','左侧看横行，上方看竖列。点击亮起，再点变暗。填好后点检查；可撤回、重置。','数字 1、2 表示一格亮，隔至少一暗格，再连续亮两格；不是第 1、2 格。'],
 ferry:['把甲虫、蚜虫和嫩叶全送到对岸，且无人受伤。','点与你同岸的乘客选中，再点划船。再点乘客可取消选择，空船也能返回。','你不在时，不能让甲虫和蚜虫单独同岸，也不能让蚜虫和嫩叶单独同岸。'],
 anttrail:['走遍 16 格，每格一次，依次经过①②③，最后到出口。','先去树根支道读拓片，再回外侧点相邻地格。只能上下左右走，走错可撤回。','不能斜走、跳格或回到已经经过的格子；提前到出口还不算完成。'],
 climate:['让温度恰好 17，湿度恰好 16。','点叶窗、水槽、菌灯升一档；到 4 后再点回 0。每档都会同时影响温度和湿度。','例如叶窗升 2 档，合计增加 6 温度、2 湿度。两项都达标后点检查。'],
 seedstore:['把三颗谷粒全部推到发光的圆形粮槽。','先去菌圃找绳子。用方向键让“你”走到谷粒后方，继续向前就会推它一格。','只能推不能拉；推到墙角可能出不来，遇到这种情况用撤回，不用重开整关。'],
 queenorder:['先献上谷粒，再让五枚地面印记满足排列条件。','选谷粒点蚁后送礼，接着按从左到右的顺序点印记。可拿回末枚或重新摆放。','点“读地面刻痕”查看条件。“隔一格”表示中间留一个位置；每种只能放一次。'],
 silkbridge:['把四位旅伴和灯全部送过桥，总时间不超过 15 分钟。','点选与灯同岸的一位或两位，再点过桥。要有人携灯返回，才能接下一批。','耗时 2 和 8 的旅伴同行算 8 分钟，不是 10；返回也要计时。'],
 barkhanoi:['把左边四层木盘完整搬到右支架。','先点有木盘的支架选起点，再点另一个支架作落点，只会移动最上面那一层。','大盘不能压小盘。中间支架是临时位置，不是最终目标。'],
 nestsudoku:['每行、每列、每个粗线 2×2 格，都各有四种不同材料。','先进入羽绒内室读规则，再回外侧点空格轮换：谷粒→月光花→露水→羽毛→空。刻好的格子不能改。','一行四种都不同还不够，也要检查它们所在的列与 2×2 小格，最后点检查。'],
 featherpegs:['让棋盘上最后只剩一颗种子。','先点有种子的孔，再点同一直线、隔一颗种子的空孔。被跳过的种子会消失。','移动一格不算跳；必须跨过恰好一颗种子，落点原来是空孔。横线和两种斜线都能跳。'],
 starcode:['用五种材料中的四种，猜对四个位置，每种最多一次。','点四个位置轮换材料，再提交。根据历史中的正位、错位数量继续调整。','“正位 1、错位 2”表示一份材料位置也对，两份材料对但位置不对；不会指出具体哪一格。'],
 shellmagic:['让每行、每列和两条对角线的和都等于 15。','先收齐三枚星片进入蛋壳穹室。点一块木片选中，再点另一块交换；中间 5 固定不动。','只让三行等于 15 还不够，三列和两条对角线也要同时满足。']
};
function rulesMarkup(open=false){const r=sceneRules[current().type];if(!r)return '';return '<details class="puzzle-rulebook" '+(open?'open':'')+'><summary>怎么玩 · 目标与操作</summary><p><b>要做什么：</b>'+r[0]+'</p><p><b>怎么操作：</b>'+r[1]+'</p><p class="rule-example"><b>举个例子：</b>'+r[2]+'</p></details>'}
const panelBeforeRules=panel;
panel=function(html){panelBeforeRules(html);if(modal.getAttribute('data-mode')==='puzzle'&&!html.includes('puzzle-rulebook')&&!html.includes('leaf-lesson')&&!html.includes('micro-found')&&!html.includes('micro-observe-close'))modal.querySelector('.panel').insertAdjacentHTML('beforeend',rulesMarkup())};
$('#help').onclick=()=>{panel('<h2>这一幕怎么玩</h2><p>'+current().title+'</p>'+rulesMarkup(true)+'<p>解开机关后，点场景里真正的门或道路继续追松鼠。道具要先在布包里选中，再点场景目标使用。点左上角可以回看已开放的场景；进入内室后用“返回外侧”出来。</p><p>“听听她的想法”提供逐步提示，线索手账保存已经发现的内容。音乐默认开启；铺满按钮使用页面布局，不进入系统全屏。</p>');modal.setAttribute('data-mode','guide')};

;

/* discovery.js */
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

;

/* challenge-engine.js */
/* State-only rules; the scene layer owns animation, inventory and persistence. */
'use strict';
const ChallengeEngine=(()=>{
 const rushDefs=[['桥板','h',2],['A','h',2],['B','h',2],['C','v',2],['D','v',2],['E','h',2],['F','v',2],['G','h',2],['H','v',2],['I','v',3]];
 const rushStart=[[2,0],[0,1],[4,4],[3,1],[1,3],[5,4],[3,2],[5,1],[2,5],[0,4]];
 function rushMove(a,i,d){if(!rushDefs[i]||![1,-1].includes(d))return null;const [,axis,n]=rushDefs[i],z=a.map(p=>p.slice());z[i][axis==='h'?1:0]+=d;const occupied=new Set();for(let j=0;j<z.length;j++){const [r,c]=z[j],[,ax,len]=rushDefs[j];for(let t=0;t<len;t++){const rr=r+(ax==='v'?t:0),cc=c+(ax==='h'?t:0),key=rr*6+cc;if(rr<0||rr>=6||cc<0||cc>=6||occupied.has(key))return null;occupied.add(key)}}return z}
 function lightMask(i){const r=Math.floor(i/4),c=i%4;return [[r,c],[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([a,b])=>a>=0&&a<4&&b>=0&&b<4).reduce((n,[a,b])=>n|(1<<(a*4+b)),0)}
 function raftMove(a,i){const v=a[i];if(!v)return null;const d=v===1?1:-1;let j=i+d;if(a[j]!==0){j=i+d*2;if(a[i+d]!==-v||a[j]!==0)return null}const b=a.slice();[b[i],b[j]]=[b[j],b[i]];return b}
 const tiltSize=8,tiltStart=[56,0],tiltGoal=7;
 const walls=[1,3,5,9,10,12,13,14,20,29,34,35,36,37,38,40,44,45,51,55,61,63],plates=[18,49,11];
 function tiltMove(a,d){if(!Number.isInteger(d)||d<0||d>3)return null;let [p,m]=a;const [dr,dc]=[[-1,0],[0,1],[1,0],[0,-1]][d];for(;;){let r=Math.floor(p/tiltSize)+dr,c=p%tiltSize+dc;if(r<0||r>=tiltSize||c<0||c>=tiltSize||walls.includes(r*tiltSize+c))break;p=r*tiltSize+c;const k=plates.indexOf(p),next=m===0?0:m===1?1:m===3?2:3;if(k===next)m|=1<<k}return [p,m]}
 function ringMove(a,i){if(![0,1,2].includes(i))return a.slice();const b=a.slice();b[i]=(b[i]+1)%7;b[(i+1)%3]=(b[(i+1)%3]+1)%7;return b}
 function weighing(a,target){return a.reduce((n,v,i)=>n+(v===1?1:v===2?-1:0)*(i===target?9:10),0)}
 function possibleJars(log){return Array.from({length:9},(_,i)=>i).filter(t=>log.every(e=>Math.sign(weighing(e.trays,t))===e.result))}
 const gearOptions=[8,12,16,20,24,30];
 function gearOK(a){return a.length===4&&new Set(a).size===4&&a.every(v=>gearOptions.includes(v))&&12*a[0]*a[2]===5*a[1]*a[3]}
 return {rushDefs,rushStart,rushMove,lightMask,raftMove,tiltSize,tiltStart,tiltGoal,walls,plates,tiltMove,ringMove,weighing,possibleJars,gearOptions,gearOK};
})();
if(typeof module!=='undefined')module.exports=ChallengeEngine;

;

/* challenges.js */
/* Former copy-the-answer puzzles now operate as persistent scene mechanisms. */
'use strict';
const C=ChallengeEngine;
const challengeRooms={
 3:{name:'储物间 · 两次称量',intro:'九罐蜂蜜中，只有一罐被松鼠偷吃过，重量更轻。用天平找出它，取回压在罐底的线轴。',controls:'点蜂蜜罐，在“左盘 → 右盘 → 架上”之间移动。两盘必须放同样多的罐，最多称两次。记录会保留；推理确定后，选中一罐检查罐底。'},
 4:{name:'走廊 · 联动灯锁',intro:'抽屉与房门接在同一组灯锁上。让十六盏灯全部熄灭，才能释放锁舌。',controls:'按一盏灯，会同时切换它和上下左右的灯。熄灭的也可以按；边缘以外没有灯。可以撤回或复位，不限步数。'},
 8:{name:'工具棚 · 卡住的滑轨',intro:'桥板被交错的木条卡在工具箱滑轨里。移开挡路的木条，把金色桥板送到右侧缺口。',controls:'先选木条，再用方向键沿它自身的滑轨移动一格。木条不能旋转、重叠或穿过其他木条。复位与撤回都不会消耗道具。'},
 9:{name:'溪边 · 错位的浮桥',intro:'两组浮板的缆绳缠住了石阶。让向右的三块与向左的三块交换岸边，绳索才能松开。',controls:'点浮板，它只能向箭头方向前进一步，或越过一块方向相反的浮板落入空位。不能后退；走进死路可以撤回。'},
 13:{name:'钟表工坊 · 双级传动',intro:'升降道要求输出轴每分钟恰好转五圈。六枚齿轮中选四枚，安装到双级传动架上。',controls:'点轴座轮换齿轮，每枚齿轮只能用一次。A带动B，B与C固定在同一根轴上一起转，C再带动D。齿轮上的数字是齿数；输入为12圈/分钟。观察试转读数，再调整两级搭配。'},
 14:{name:'阳台 · 吊篮的滚珠刹车',intro:'沿木盘上的曲折轨道前进：按①→②→③压下三枚铜扣，最后停进右上承接孔，才能放下吊篮。',controls:'点方向键倾斜木盘，滚珠会一直滚到墙边或挡块前。铜扣只按①→②→③的顺序生效，提前经过后面的铜扣不会压下；已压下的保持生效。三枚都亮后，滚珠必须停在右上承接孔。可撤回与复位。'},
 15:{name:'观星台 · 联动星环',intro:'三个星环各有七格。让三道缺口同时回到顶部，才会打开星光通道。',controls:'转外环会带动中环，转中环会带动内环，转内环会带动外环。每次前进一格。先观察联动，再安排转动次数；可撤回与复位。'}
};
let challengeHeld=null;
function challengeState(){const all=state.flags.challengeState||(state.flags.challengeState={}),i=state.index;if(i===14&&all[i]&&all[i].version!==2)delete all[i];if(!all[i])all[i]=i===3?{target:Math.floor(Math.random()*9),trays:Array(9).fill(0),log:[],inspect:null}:i===4?{board:0x184a,history:[]}:i===8?{board:C.rushStart.map(p=>p.slice()),history:[]}:i===9?{board:[1,1,1,0,-1,-1,-1],history:[]}:i===13?{board:[8,8,8,8],history:[]}:i===14?{version:2,board:C.tiltStart.slice(),history:[]}: {board:[3,5,4],history:[]};return all[i]}
function openChallenge(){if(!challengeRooms[state.index]||sceneExitReady())return;if(state.index===8&&!flag('plantWatered')){say('滑轨被干硬的藤根咬住了。先观察右侧卷叶植物。');return}if(state.index===15&&!flag('lampOn')){if(!need('lamp','星盘太暗，需要书架暗格里找到的手灯。'))return;mark('lampOn')}challengeHeld=null;state.flags.challengeView=state.index;challengeState();save();render();heroMotion('act')}
function closeChallenge(){state.flags.challengeView=null;challengeHeld=null;save();render()}
function challengeDone(message,reward){state.flags.challengeView=null;challengeHeld=null;if(reward&&!state.items.includes(reward))give(reward);solve(message)}
function challengeUndo(reset=false){const a=challengeState();if(reset){a.history.push(JSON.parse(JSON.stringify(a.board)));a.board=state.index===4?0x184a:state.index===8?C.rushStart.map(p=>p.slice()):state.index===9?[1,1,1,0,-1,-1,-1]:state.index===13?[8,8,8,8]:state.index===14?C.tiltStart.slice():[3,5,4]}else if(a.history.length)a.board=a.history.pop();a.previous=null;save();drawChallenge();sfx('wood')}
function challengeUpdate(next){const a=challengeState();if(next===null||next===undefined||JSON.stringify(next)===JSON.stringify(a.board)){challengeMessage('这一步被挡住了。换个方向或撤回，重新安排通路。');sfx('no');return}a.history.push(JSON.parse(JSON.stringify(a.board)));a.previous=a.board;a.board=next;save();drawChallenge();sfx('wood');heroMotion('act');
 if(state.index===4&&next===0)challengeDone('灯锁全部熄灭，房门锁舌收回，抽屉里露出一枚磁铁。','magnet');
 if(state.index===8&&next[0][1]===4){mark('shedOpen');state.flags.challengeView=null;render();say('桥板到达滑轨缺口，棚口踏板放行。回到架子前，亲手抽出桥板。');sfx('unlock')}
 if(state.index===9&&next.join(',')==='-1,-1,-1,0,1,1,1')challengeDone('浮板交换了岸边，缆绳松开，通向门亭的石阶露出来了。');
 if(state.index===14&&next[0]===C.tiltGoal&&next[1]===7)challengeDone('滚珠依次压下三枚铜扣，落进承接孔。吊篮降下，拿到了发条钥匙。','windkey');
 if(state.index===15&&next.every(v=>v===0)){use('lamp');note('星盘投出的图案','光穿过星环，墙上依次映出月亮、星星、太阳。');challengeDone('三个缺口同时对齐，光闩打开了。投影已经记进手账。')}
}
function challengeMessage(s){const el=$('#challenge-msg');if(el)el.textContent=s;else say(s)}
function challengeJar(i){const a=challengeState();a.trays[i]=(a.trays[i]+1)%3;a.inspect=i;save();drawChallenge()}
function challengeWeigh(){const a=challengeState(),l=a.trays.filter(v=>v===1).length,r=a.trays.filter(v=>v===2).length;if(!l||l!==r){challengeMessage('两边要放同样多的罐，至少各一罐。不同数量无法比较出哪一罐更轻。');return}if(a.log.length>=2){challengeMessage('两次称量已经用完。可以查看记录推理，或清空记录重新实验。');return}a.log.push({trays:a.trays.slice(),result:Math.sign(C.weighing(a.trays,a.target))});save();drawChallenge();sfx('metal');challengeMessage('天平已停稳，比较结果记在下方。下一次称量前可以重新摆罐。')}
function challengeInspect(){const a=challengeState();if(a.inspect===null){challengeMessage('先点选你判断出的蜂蜜罐。');return}const remaining=C.possibleJars(a.log);if(remaining.length!==1){challengeMessage('现在的称量记录还不能唯一确定是哪一罐。重新安排比较，排除剩下的可能。');return}if(a.inspect!==remaining[0]){challengeMessage('这罐不符合两次称量的记录，再检查哪一侧更轻。');return}challengeDone('确实是这一罐！罐底的线轴压住门闩，取下后木门松开了。','thread')}
function challengeWeighReset(){const a=challengeState();a.trays=Array(9).fill(0);a.log=[];a.inspect=null;save();drawChallenge();challengeMessage('记录已清空，同一罐蜂蜜仍然更轻。可以换一种分组重新比较。')}
function challengeDirections(fn){return '<div class="challenge-directions">'+[['↑',0,'上'],['←',3,'左'],['↓',2,'下'],['→',1,'右']].map(([s,n,name])=>'<button data-ch-dir="'+n+'" aria-label="'+name+'移">'+s+'</button>').join('')+'</div>'}
function drawChallenge(){const view=$('#challenge-work');if(!view)return;const i=state.index,a=challengeState();let html='';
 if(i===3){html='<div class="honey-study"><div class="honey-grid">'+a.trays.map((v,n)=>'<button data-ch-jar="'+n+'" aria-pressed="'+(a.inspect===n)+'" class="'+(a.inspect===n?'chosen':'')+'">'+propImage('honey')+'<b>'+String.fromCharCode(65+n)+'</b><small>'+['架上','左盘','右盘'][v]+'</small></button>').join('')+'</div><div class="weigh-record">'+propImage('balance')+'<p>已称 '+a.log.length+' / 2 次 · 当前选中 '+(a.inspect===null?'—':String.fromCharCode(65+a.inspect))+'</p><ol>'+a.log.map(e=>'<li>'+e.trays.map((v,n)=>v===1?String.fromCharCode(65+n):'').join('')+' 对 '+e.trays.map((v,n)=>v===2?String.fromCharCode(65+n):'').join('')+'：'+['左盘更轻','两盘平衡','右盘更轻'][e.result+1]+'</li>').join('')+'</ol><div class="challenge-actions"><button id="ch-weigh">称一次</button><button id="ch-inspect">检查选中罐底</button><button id="ch-weigh-reset">清空记录</button></div></div></div>';}
 if(i===4){html='<div class="challenge-board light-lock">'+Array.from({length:16},(_,n)=>'<button data-ch-light="'+n+'" class="'+(a.board>>n&1?'on':'off')+'" aria-label="第'+(n+1)+'盏灯，'+(a.board>>n&1?'亮':'灭')+'"><i></i><small>'+(n+1)+'</small></button>').join('')+'</div>';}
 if(i===8){html='<div class="challenge-board rush-track"><i class="rush-exit">出口 →</i>'+C.rushDefs.map(([name,ax,len],n)=>{const [r,c]=a.board[n],old=a.previous?.[n]||a.board[n];return '<button data-ch-piece="'+n+'" class="rush-piece '+(n===0?'goal-piece ':'')+(challengeHeld===n?'chosen':'')+'" style="left:'+c/6*100+'%;top:'+r/6*100+'%;width:'+(ax==='h'?len:1)/6*100+'%;height:'+(ax==='v'?len:1)/6*100+'%;--old-left:'+old[1]/6*100+'%;--old-top:'+old[0]/6*100+'%" aria-label="选择'+(n===0?'桥板':'木条'+name)+'">'+propImage('plank')+'<b>'+name+'</b><small>'+(ax==='h'?'↔':'↕')+'</small></button>'}).join('')+'</div>'+challengeDirections();}
 if(i===9){html='<div class="raft-river"><div class="raft-slots">'+a.board.map((v,n)=>'<button data-ch-raft="'+n+'" class="'+(v?'raft':'empty')+'" aria-label="第'+(n+1)+'处'+(v===1?'向右浮板':v===-1?'向左浮板':'空位')+'">'+(v?propImage(v===1?'plank':'leaf')+'<b>'+(v===1?'→':'←')+'</b>':'<span>空</span>')+'</button>').join('')+'</div><p>左岸 ←　交换两组浮板　→ 右岸</p></div>';}
 if(i===13){html='<div class="compound-drive"><div class="gear-bank">可用齿轮 · '+C.gearOptions.join(' / ')+' 齿 · 每枚仅一枚</div><div class="compound-gears">'+a.board.map((v,n)=>'<button data-ch-gear="'+n+'" aria-label="轴座'+['A','B','C','D'][n]+'，'+v+'齿">'+propImage('gear')+'<b>'+v+'</b><small>'+['A 输入','B 从动','C 同轴','D 输出'][n]+'</small></button>').join('')+'</div><div class="drive-diagram">A ⇢ B ═ 同轴 ═ C ⇢ D</div><p>输入 12 圈/分钟 · 输出要求 5 圈/分钟</p><button id="ch-drive-test">试转传动架</button><p id="ch-drive-rpm">装好后试转，观察输出读数。</p></div>';}
 if(i===14){const size=C.tiltSize;html='<div class="challenge-board tilt-tray" style="--tilt-size:'+size+'">'+Array.from({length:size*size},(_,n)=>{const plate=C.plates.indexOf(n);return '<span class="tilt-cell '+(C.walls.includes(n)?'wall':'')+' '+(plate>=0?'plate':'')+' '+((a.board[1]&(1<<plate))&&plate>=0?'pressed':'')+' '+(n===C.tiltGoal?'goal':'')+'">'+(n===C.tiltGoal?'◎':plate>=0?['①','②','③'][plate]:'')+'</span>'}).join('')+'<i class="tray-ball" style="left:'+(a.board[0]%size)/size*100+'%;top:'+Math.floor(a.board[0]/size)/size*100+'%;--old-left:'+((a.previous||a.board)[0]%size)/size*100+'%;--old-top:'+Math.floor((a.previous||a.board)[0]/size)/size*100+'%">'+propImage('moonstone')+'</i></div>'+challengeDirections();}
 if(i===15){html='<div class="challenge-board coupled-stars">'+a.board.map((v,n)=>'<div class="coupled-ring ring-'+n+'" style="--angle:'+(v*360/7)+'deg;--from-angle:'+((a.previous&&a.previous[n]!==v?v-1:v)*360/7)+'deg"><i></i></div>').join('')+'<b class="star-north">✦</b><span>顶部光闩</span></div><div class="challenge-actions">'+['外环 + 中环','中环 + 内环','内环 + 外环'].map((s,n)=>'<button data-ch-ring="'+n+'">转'+s+'</button>').join('')+'</div>';}
 view.innerHTML=html;const history=$('#ch-undo');if(history)history.disabled=!a.history?.length;
 view.querySelectorAll('[data-ch-jar]').forEach(b=>b.onclick=()=>challengeJar(+b.dataset.chJar));if(i===3){$('#ch-weigh').onclick=challengeWeigh;$('#ch-inspect').onclick=challengeInspect;$('#ch-weigh-reset').onclick=challengeWeighReset}
 view.querySelectorAll('[data-ch-light]').forEach(b=>b.onclick=()=>challengeUpdate(a.board^C.lightMask(+b.dataset.chLight)));
 view.querySelectorAll('[data-ch-piece]').forEach(b=>b.onclick=()=>{challengeHeld=+b.dataset.chPiece;a.previous=null;drawChallenge();challengeMessage('选中'+C.rushDefs[challengeHeld][0]+'，用方向键沿箭头移动。')});
 view.querySelectorAll('[data-ch-raft]').forEach(b=>b.onclick=()=>challengeUpdate(C.raftMove(a.board,+b.dataset.chRaft)));
 view.querySelectorAll('[data-ch-dir]').forEach(b=>b.onclick=()=>{const d=+b.dataset.chDir;if(i===14){challengeUpdate(C.tiltMove(a.board,d));return}if(challengeHeld===null){challengeMessage('先选中一根木条。');return}const ax=C.rushDefs[challengeHeld][1];if((ax==='h'&&d%2===0)||(ax==='v'&&d%2===1)){challengeMessage('只能沿木条箭头方向移动，不能转弯。');return}challengeUpdate(C.rushMove(a.board,challengeHeld,d===1||d===2?1:-1))});
 view.querySelectorAll('[data-ch-gear]').forEach(b=>b.onclick=()=>{const next=a.board.slice(),n=+b.dataset.chGear;next[n]=C.gearOptions[(C.gearOptions.indexOf(next[n])+1)%C.gearOptions.length];challengeUpdate(next)});
 if(i===13)$('#ch-drive-test').onclick=()=>{if(new Set(a.board).size!==4){challengeMessage('同一枚齿轮不能放在两个位置，请从六枚齿轮中选择四枚不同的。');return}const rpm=12*a.board[0]*a.board[2]/(a.board[1]*a.board[3]);$('#ch-drive-rpm').textContent='实际输出：'+rpm.toFixed(2)+' 圈/分钟';sfx('metal');if(C.gearOK(a.board))challengeDone('两级传动稳定到要求转速，升降道接上出口。收好齿轮组，后面还能用到。','gears');else challengeMessage('试转读数已显示。试着分别改变前后两级，观察速度怎样变化。')};
 view.querySelectorAll('[data-ch-ring]').forEach(b=>b.onclick=()=>challengeUpdate(C.ringMove(a.board,+b.dataset.chRing)));
}
function renderChallenge(){const i=state.index,d=challengeRooms[i];if(!d||state.flags.challengeView!==i||sceneExitReady())return;const el=document.createElement('section');el.className='challenge-view';el.setAttribute('aria-label',d.name);el.style.setProperty('--challenge-photo','url("assets/fast/'+levels[i].asset+'.webp")');el.innerHTML='<header><div><small>失眠夜的现场调查</small><h2>'+d.name+'</h2></div><button id="ch-back">← 回到场景</button></header><p class="challenge-goal">'+d.intro+'</p><details class="challenge-rules"><summary>操作与规则</summary><p>'+d.controls+'</p></details><div id="challenge-work"></div><footer><p id="challenge-msg" role="status">'+(i===3?'每罐的外观相同，只有称量能提供线索。':'尝试会保留，可以撤回；离开后再回来也不会丢失进度。')+'</p>'+(i===3?'':'<div class="challenge-actions"><button id="ch-undo">撤回一步</button><button id="ch-reset">复位机关</button></div>')+'</footer>';el.onclick=e=>e.stopPropagation();document.body.appendChild(el);$('#ch-back').onclick=closeChallenge;if(i!==3){$('#ch-undo').onclick=()=>challengeUndo();$('#ch-reset').onclick=()=>challengeUndo(true)}drawChallenge()}
const beforeChallengeRender=render;render=function(){beforeChallengeRender();document.querySelectorAll('.challenge-view').forEach(e=>e.remove());const i=state.index;if(challengeRooms[i]){$('#hotspots').innerHTML='';if(i!==8)worldObject('challenge-entry',levels[i].target,inertArt,'靠近查看'+challengeRooms[i].name.split(' · ')[1],openChallenge);else{document.querySelectorAll('[data-world="shed-plant"],[data-world="shed-wheel-0"],[data-world="shed-wheel-1"],[data-world="shed-wheel-2"]').forEach(e=>e.remove());worldObject('shed-plant',[73,19,20,45],flag('plantWatered')?'<span class="plant-leaf leaf-a">'+propImage('leaf')+'</span>':inertArt,'查看卷叶植物',waterShedPlant,flag('plantWatered')?'plant-unfolded':'');worldObject('challenge-entry',[40,18,20,22],inertArt,'靠近查看工具箱滑轨',openChallenge)}renderChallenge()}};
const beforeChallengePuzzle=puzzle;puzzle=function(){if(challengeRooms[state.index])return openChallenge();beforeChallengePuzzle()};
const beforeChallengeObserve=observe;observe=function(){if(challengeRooms[state.index]){say(challengeRooms[state.index].intro);return}beforeChallengeObserve()};
waterShedPlant=function(){if(flag('plantWatered')){say('叶片已经舒展，藤根从工具箱轨道上松开了。靠近中央工具箱看看。');return}if(!need('water','卷叶植物的藤根干硬，咬住了工具箱滑轨。花盆标签写着：四升清水。'))return;worldAction('water-plant',$('[data-world="shed-plant"]'),()=>{use('water');mark('plantWatered');render();say('浇水后叶片展开，藤根回软，工具箱的滑轨终于能推动了。')},1100);sfx('water')};
turnShedWheel=function(){openChallenge()};
const challengeHints={
 3:['外观找不出差别。把九罐分成相同大小的小组，第一次称量尽量排除多一些。','平衡与左右轻重都是信息。第二次称量应只比较仍有可能的那一组，不必继续称已经排除的罐。','先称 ABC 对 DEF：若平衡，候选 GHI；若左轻，候选 ABC；若右轻，候选 DEF。把候选组三罐中的前两罐互称，轻的就是目标，平衡则是第三罐。点选该罐，再检查罐底。'],
 4:['灯之间有连线。先按一盏，观察哪些灯会一起改变，再撤回确认。','可以先让第一排熄灭，再考虑下一排。重复按同一盏两次会抵消，因此关键是哪些灯需要按奇数次。','复位后按第 1、3、4、5、6、8、9 盏灯，各一次。编号从左到右、从上到下。所有灯熄灭后退出调查，再点房门。'],
 8:['桥板只能向右出轨。先观察与它同一行的竖条，它们需要往哪里让位？','竖条底下的横条也会卡住去路。先腾出底部，再调整中间的竖条；选错了可以撤回。','复位后：A左1，B左1，D上1，E左1，F上1，B左1，F上2，桥板右2，G左1，E左1，H下1，I下3，桥板右2。然后返回场景抽出架子上的桥板。'],
 9:['浮板只能向自己的箭头方向前进。把空位留给对向浮板，才可能交错通过。','连跳可以让两组互相穿插；连续挪动同一方向的一组，容易把空位堵死。试着先撤回到还能跳的位置。','复位后依次点位置：3、5、6、4、2、1、3、5、7、6、4、2、3、5、4。位置始终按从左到右 1—7 编号。'],
 13:['这是两级传动。B与C不是相互啮合，它们固定在同一根轴上，转速相同。','可以先固定一对齿轮观察试转，再换另一对。两个阶段的变速会共同影响最终输出。','一种搭配是 A=8、B=16、C=20、D=24 齿。输入12经第一级变为6，再经第二级变为5圈/分钟。也有其他符合目标的不同搭配。'],
 14:['滚珠只会停在障碍前，不能在路途中随意停住。倒着想：从哪里才能停进右上承接孔？','先确认下一枚铜扣的编号；经过后面的铜扣不会提前点亮。要借墙停在合适的横行或竖列，再从另一侧返回。','复位后依次倾斜：上、右、上、左、上、右、左、下、右、下、上、右、上、下、左、下、右、下、右、上、右、上、右、上。依次压下①②③，最后停进右上孔。'],
 15:['每次会动两层，单独对齐一层还不够。先试三种转动，确认各自带动谁。','同一个控制转七次会回到原状。可以记录每个控制的次数，把已经对齐的一层重新纳入整组考虑。','复位后，“转外环 + 中环”点5次，“转中环 + 内环”点4次，“转内环 + 外环”点6次。顺序可以不同，三环最后会一起归零。']
};
for(const [i,d]of Object.entries(challengeRooms)){Object.assign(levels[i],{title:d.name,goal:d.intro,hint:challengeHints[i],targetLabel:'调查'+d.name.split(' · ')[1]});sceneRules[levels[i].type]=[d.intro,d.controls,'操作说明只解释规则。需要完整解法时，请主动在提示中选择显示。']}
sceneExits[3][3]='罐底的线轴压住门闩，必须用称量辨认被偷吃过的蜂蜜罐。';sceneExits[4][3]='联动灯锁还亮着，抽屉与房门的锁舌都没有释放。';sceneExits[8][3]='桥板被交错的滑轨木条卡住，还不能抽出。';sceneExits[9][3]='两组浮板的缆绳缠住了石阶，必须先交换两组浮板。';sceneExits[14][3]='滚珠还没有依次压下三枚铜扣并落入承接孔，吊篮刹车未松开。';
levels[19].hint[1]='先判断哪一位无论留在哪一岸，都容易让其余两位发生冲突。空船返程和带回乘客都允许。';
levels[20].hint[1]='在岔口先看剩余未走区域：如果被当前路线分成不相连的两块，就需要撤回。';
levels[23].hint[1]='先把相邻的一对看作整体，列出它可能占的两个连续位置，再用其他条件逐一排除。';
// Remove only retired answer notes; completed scenes and carried items remain intact.
state.notes=state.notes.filter(n=>!['蜂蜜标签','停住的时间','展开的叶片','溪边的脚印','传动图纸'].includes(n.title));
state.notes=state.notes.map(n=>n.title==='窗边的刻字'&&n.body?.includes('钟停')?{...n,body:n.body.split('暗匣便签')[0]+'暗匣牵线已松开窗边侧门。'}:n);
render();fitStage();

;

/* test-mode.js */
/* Password-gated, in-memory QA playthrough. Normal progress is never written here. */
'use strict';
let testNormalState=null,testNormalSelection=null;
const testEntry=document.createElement('button');testEntry.className='test-entry';testEntry.id='test-entry';testEntry.textContent='测试';testEntry.setAttribute('aria-label','打开测试模式');document.body.appendChild(testEntry);
function testState(index){return {index,unlocked:29,done:{},items:Object.keys(items).filter(k=>!['lashedShears','longShears'].includes(k)&&(index!==0||k!=='towel')),notes:[],flags:{shards:3},started:true,completed:false}}
function exitTest(){if(!testSession)return;close();testSession=false;state=testNormalState;selected=testNormalSelection;testNormalState=null;testNormalSelection=null;hintStep=0;render();syncHeroPosition();testEntry.textContent='测试';testEntry.setAttribute('aria-label','打开测试模式');document.body.classList.remove('testing-game');say('已退出测试，恢复原来的探索进度。')}
function enterTest(){if(testSession)return;testNormalState=JSON.parse(JSON.stringify(state));testNormalSelection=selected;testSession=true;state=testState(0);selected=null;hintStep=0;document.body.classList.add('testing-game');testEntry.textContent='测试中 · 选关';testEntry.setAttribute('aria-label','测试模式任意选关');render();map()}
function requestTest(){if(testSession){map();return}panel('<h2>测试模式</h2><p>输入测试密码后，可自由选择 5 大关、30 个场景。测试会提供所需道具，退出后恢复正常进度。</p><form id="test-login"><label for="test-password">测试密码</label><input id="test-password" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="12" placeholder="请输入密码" required><p id="test-password-msg" role="status"></p><button class="primary" type="submit">进入测试</button></form>');const input=$('#test-password');input.focus();$('#test-login').onsubmit=e=>{e.preventDefault();if(input.value==='16677'){input.value='';enterTest()}else{$('#test-password-msg').textContent='密码不正确，请重新输入。';input.value='';input.focus();sfx('no')}}}
testEntry.onclick=requestTest;
const normalMap=map;map=function(){if(!testSession)return normalMap();panel('<h2>测试选关</h2><p>所有场景已开放。每次选关都会重新准备该场景与所需道具。</p><div class="test-map-actions"><button id="test-retry">重测当前场景</button><button id="test-exit">退出测试，恢复存档</button></div><div class="map-grid test-map-grid">'+levels.map((l,i)=>`<button data-test-scene="${i}" class="${state.index===i?'here':''}"><small>第${Math.floor(i/6)+1}关 · 场景${i%6+1}/6</small><span>${l.title}</span></button>`).join('')+'</div>');modal.setAttribute('data-mode','atlas');modal.querySelectorAll('[data-test-scene]').forEach(b=>b.onclick=()=>go(+b.dataset.testScene));$('#test-exit').onclick=exitTest;$('#test-retry').onclick=()=>go(state.index)};
const normalGo=go;go=function(i){if(testSession&&Number.isInteger(i)&&i>=0&&i<30){state=testState(i);selected=null;normalGo(i);return}normalGo(i)};
const normalReset=resetGame;resetGame=function(){if(testSession){go(0);return}normalReset()};

;

/* chase.js */
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
   scene.insertAdjacentHTML('beforeend','<img class="found-cookies" src="assets/fast/cinematic/cookie.webp" alt="终于找回的曲奇饼干">');
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

;