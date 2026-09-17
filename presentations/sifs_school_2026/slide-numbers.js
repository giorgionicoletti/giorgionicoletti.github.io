(() => {
  const updateSlideChrome = () => {
    const slides = window.Reveal?.getSlides?.()
      ?? [...document.querySelectorAll(".reveal .slides section.slide")];

    // The timed lecture ends at the synthesis. Optional appendix/reference
    // slides must not delay completion of the main lecture's progress rail.
    // Consecutive stages can share one main-slide number without rebuilding
    // their source containers, object identities, layouts or reveal timelines.
    const stages=slides.filter(slide=>!slide.dataset.sifsDerivationParent);
    const route=[],owners=new Map(),members=new Map();
    let previous=null;
    for(const stage of stages){
      const same=stage.dataset.sifsMainGroup&&stage.dataset.sifsMainGroup===previous?.dataset.sifsMainGroup;
      const owner=same?owners.get(previous):stage;
      if(!same){route.push(owner);members.set(owner,[]);}
      owners.set(stage,owner);members.get(owner).push(stage);previous=stage;
    }
    const lastMainSlide = route.reduce((last, slide, index) =>
      members.get(slide).some(s=>Number(s.dataset.timing)>0) ? index : last, 0);

    slides.forEach((slide, index) => {
      const anchor=slide.dataset.sifsDerivationParent?slides.find(s=>s.id===slide.dataset.sifsDerivationParent):slide;
      const position=route.indexOf(owners.get(anchor));
      const progress = lastMainSlide > 0 ? Math.min(Math.max(0,position) / lastMainSlide, 1) : 1;
      slide.style.setProperty("--rail", `${progress * 100}%`);
      let number = slide.querySelector(":scope > .deck-slide-number");
      if (!number) {
        number = document.createElement("div");
        number.className = "deck-slide-number";
        number.setAttribute("aria-hidden", "true");
        slide.appendChild(number);
      }
      const detail=!!slide.dataset.sifsDerivationParent;
      const step=detail?slides.filter(s=>s.dataset.sifsDerivationParent===anchor?.id).indexOf(slide)+1:0;
      slide.dataset.sifsDisplayNumber=String(position+1);
      const parts=members.get(owners.get(anchor))||[];
      slide.dataset.sifsDisplayLabel=detail?`${position+1} · D${step}`:parts.length>1?`${position+1} · ${parts.indexOf(slide)+1}/${parts.length}`:String(position+1);
      number.textContent = document.documentElement.dataset.sifsOutput==='pdf'?String(index+1):String(position+1);
    });
  };

  window.SIFSUpdateSlideChrome = updateSlideChrome;
  document.addEventListener('sifs-deck-changed', updateSlideChrome);
  const initialize = () => {
    updateSlideChrome();
    window.Reveal?.on?.("ready", updateSlideChrome);
    window.Reveal?.on?.("slidechanged", updateSlideChrome);
  };

  if (document.readyState === "complete") {
    initialize();
  } else {
    window.addEventListener("load", initialize, { once: true });
  }
})();
