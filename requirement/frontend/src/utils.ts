// window.history.pushState(state, title, url) adds a new entry to the browser history without reloading the page
import { render } from "./main";


export function navigate(path: string) {
  history.pushState({}, '', path); //ajoute nouv entree dans l'historique
  render(); // re-render the page to match the last history state
} //sPA

export function apiBase() {
  const { protocol, hostname } = window.location;
  // En dev LAN : http://IP:3000
  // En prod avec proxy
  return `${protocol}//${hostname}:3000`;
}
