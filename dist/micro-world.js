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
