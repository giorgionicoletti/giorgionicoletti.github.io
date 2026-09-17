/* Keyboard shortcut: G returns to the main synthesis; A opens appendix. */
window.addEventListener('load',()=>{
 Reveal.configure({pdfSeparateFragments:false,autoAnimateDuration:.5,defaultTiming:0});
 const go=id=>{const index=Reveal.getSlides().findIndex(slide=>slide.id===id);if(index>=0)Reveal.slide(index);};
 Reveal.addKeyBinding({keyCode:65,key:'A',description:'Open optional trajectory section'},()=>go('a-delayed-response-as-a-counterexample'));
 Reveal.addKeyBinding({keyCode:71,key:'G',description:'Return to main synthesis'},()=>go('what-the-ordering-of-timescales-decides'));
});
