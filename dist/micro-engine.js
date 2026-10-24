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
