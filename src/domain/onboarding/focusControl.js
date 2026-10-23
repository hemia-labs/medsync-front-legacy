// Targets are registered by their owning editor, never discovered with global selectors.
export function focusControl(ref, reveal, hintHost) {
  const element=ref && (ref.$el || ref);
  if(!element)return;
  element.classList.toggle('hemia-guide-target',typeof reveal==='function');
  element.classList.toggle('hemia-guide-focus',typeof reveal!=='function');
  if(typeof ref.focus==='function')ref.focus();
  else {element.setAttribute('tabindex','-1');element.focus();}
  element.scrollIntoView({block:'nearest',behavior:'auto'});
  if(typeof reveal==='function')reveal(element,hintHost);
}
