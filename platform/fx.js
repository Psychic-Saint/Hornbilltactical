/* ============ HORNBILL — 3D / MOTION FX (dependency-free) ============ */
(function(){
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Scroll reveal */
  const revealables = document.querySelectorAll(".card, .stat, .action, .opt, .reveal, .qcard");
  if("IntersectionObserver" in window && !reduce){
    revealables.forEach(el=>el.classList.add("pre-reveal"));
    const io=new IntersectionObserver((ents)=>{ents.forEach(e=>{if(e.isIntersecting){e.target.classList.add("is-revealed");io.unobserve(e.target);}});},{threshold:.08});
    revealables.forEach(el=>io.observe(el));
  }

  /* 3D tilt for feature cards */
  function tilt(el){
    const strength=el.dataset.tiltStrength?+el.dataset.tiltStrength:8;
    el.style.transformStyle="preserve-3d";
    el.addEventListener("pointermove",(e)=>{
      const r=el.getBoundingClientRect();
      const px=(e.clientX-r.left)/r.width-.5, py=(e.clientY-r.top)/r.height-.5;
      el.style.transform=`perspective(900px) rotateY(${px*strength}deg) rotateX(${-py*strength}deg) translateY(-4px)`;
      el.style.setProperty("--gx",(px*100+50)+"%");
      el.style.setProperty("--gy",(py*100+50)+"%");
    });
    el.addEventListener("pointerleave",()=>{el.style.transform="";});
  }
  if(!reduce) document.querySelectorAll(".action, .opt, .stat3d, [data-tilt]").forEach(tilt);

  /* Count-up numbers */
  window.countUp=function(root){
    (root||document).querySelectorAll("[data-count]").forEach(el=>{
      if(el._done)return;el._done=true;
      const target=+el.dataset.count||0,pre=el.dataset.prefix||"",suf=el.dataset.suffix||"",dur=700;
      if(reduce||target===0){el.textContent=pre+target+suf;return;}
      const t0=performance.now();
      (function step(t){const p=Math.min((t-t0)/dur,1),e=1-Math.pow(1-p,3);
        el.textContent=pre+Math.round(target*e).toLocaleString("en-ZA")+suf;
        if(p<1)requestAnimationFrame(step);})(t0);
    });
  };
  setTimeout(()=>window.countUp&&window.countUp(),80);

  /* Magnetic report buttons */
  if(!reduce) document.querySelectorAll(".btn-report, [data-magnetic]").forEach(b=>{
    b.addEventListener("pointermove",(e)=>{const r=b.getBoundingClientRect();
      b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.15}px, ${(e.clientY-r.top-r.height/2)*.2}px)`;});
    b.addEventListener("pointerleave",()=>{b.style.transform="";});
  });

  /* Spotlight that follows cursor on hero */
  const spot=document.querySelector(".spotlight");
  if(spot && !reduce){document.addEventListener("pointermove",e=>{
    spot.style.setProperty("--mx",e.clientX+"px");spot.style.setProperty("--my",e.clientY+"px");});}

  /* Warm & Easy Blueprints signature — on every page */
  if(!document.querySelector(".web-credit")){
    var side=document.querySelector(".side");
    var f=document.createElement("footer");f.className="web-credit";
    f.innerHTML='<a href="https://weblueprints.co.za/" target="_blank" rel="noopener" title="Warm & Easy Blueprints">'
      +'<span class="web-mono">WEB</span>'
      +'<span class="web-text">Designed &amp; Developed by <b>Warm &amp; Easy Blueprints</b></span></a>';
    (side||document.body).appendChild(f);
  }
})();
