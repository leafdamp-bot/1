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
