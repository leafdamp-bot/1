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
