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
