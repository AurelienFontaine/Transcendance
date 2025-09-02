// window.history.pushState(state, title, url) adds a new entry to the browser history without reloading the page
import { render } from "./main";

export function navigate(path: string) {
  history.pushState({}, '', path); //ajoute nouv entree dans l'historique
  render(); // re-render the page to match the last history state
} //sPA


function showElement(el: HTMLElement) {
  // hide options before toggling "hidden"
  el.classList.remove('opacity-100', 'scale-y-100');
  el.classList.add('opacity-0', 'scale-y-0');

  // if hiden : show. and vice-versa
  el.classList.toggle('hidden');

  // Force reflow to ensure transition runs
  void el.offsetWidth;
  el.classList.add('opacity-100', 'scale-y-100');
  el.classList.remove('opacity-0', 'scale-y-0');
}//affiche un element avec transition


function hideElement(el: HTMLElement) {
  el.classList.remove('opacity-100', 'scale-y-100');
  el.classList.add('opacity-0', 'scale-y-0');

  // Hide the other options
  el.classList.add('hidden');
}//cache un element avec animation

// function to animate game mode selection
function toggleOptions(showElem: HTMLElement | null, hideElem: HTMLElement | null) {
  if (!showElem || !hideElem) return;//securise si un element est null

  // Show the selected one
  showElement(showElem);

  // Hide the other one
  hideElement(hideElem)  
}
