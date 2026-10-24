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
