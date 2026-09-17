/* Shared caption and calculation rows keep replacement stages aligned.
 * All source content stays in QMD. Hidden stages still size the same grid tracks. */
window.SIFSPrepareLayout = (root = document) => {
for (const stack of root.querySelectorAll('.calc-stack')) {
  for (const stage of stack.querySelectorAll(':scope > .calc-stage')) {
    if (stage.querySelector(':scope > .stage-heading')) continue;
    const parts = [...stage.children];
    const heading = document.createElement('div'); heading.className = 'stage-heading';
    const calculation = document.createElement('div'); calculation.className = 'stage-calculation';
    const note = document.createElement('div'); note.className = 'stage-explanation';
    if (parts[0]?.matches('.stage-caption,.quantity-label,.regime-label')) heading.append(parts.shift());
    const last = parts.at(-1);
    const hasEquation = parts.some(part => part.matches('.math.display') || part.querySelector('.math.display'));
    if (last?.matches('.step-copy') || (hasEquation && last?.tagName === 'P' && !last.querySelector('.math.display') && parts.length > 1)) {
      note.append(parts.pop());
    }
    calculation.append(...parts);
    if (note.childElementCount) calculation.append(note);
    stage.append(heading, calculation);
  }
}

};
window.SIFSPrepareLayout();
