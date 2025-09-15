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

export async function getCurrentUser() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  // Toujours des strings côté front (jamais null)
  let id = localStorage.getItem("id") || "";
  let name = localStorage.getItem("name") || "";
  let username = localStorage.getItem("username") || "";

  if (!id || !name) {
    try {
      const res = await fetch(`${apiBase()}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;

      const data = await res.json();
      // /me renvoie { user: {...} }
      const u = (data && data.user) ? data.user : data;

      id = String(u?.id ?? "");
      name = String(u?.name ?? "");
      username = String(u?.username ?? "");

      // Écrire UNIQUEMENT des strings si non vides)
      if (id)       localStorage.setItem("id", id);
      if (name)     localStorage.setItem("name", name);
      if (username) localStorage.setItem("username", username);
    } catch (err) {
      console.error("Impossible de récupérer /me :", err);
      return null;
    }
  }

  // Si on n’a toujours pas de quoi identifier l’utilisateur, on considère qu’il n’est pas utilisable
  if (!id || !name) return null;

  return { id, name, username };
}

