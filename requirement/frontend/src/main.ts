//document.getElementById('message')!.textContent = 'Le site fonctionne via Docker !';
import "./styles.css";
import { renderHome } from '../pages/home';
import { renderProfile } from '../pages/profile';
import { renderPlay } from '../pages/play';

// Record<K, V> utility typescript type with K as key type and V as value type
// () => string : function without parameters returning a string
// "routes" is an object with a path as key and each value is a function that returns a string (here HTML code)
const routes: Record<string, () => string> = {
  '/': renderHome,
  '/profile': renderProfile,
  '/play': renderPlay,
};

// window.history.pushState(state, title, url) adds a new entry to the browser history without reloading the page
function navigate(path: string) {
  history.pushState({}, '', path);
  render(); // re-render the page to match the last history state
}

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
}

function hideElement(el: HTMLElement) {
  el.classList.remove('opacity-100', 'scale-y-100');
  el.classList.add('opacity-0', 'scale-y-0');

  // Hide the other options
  el.classList.add('hidden');
}

// function to animate game mode selection
function toggleOptions(showElem: HTMLElement | null, hideElem: HTMLElement | null) {
  if (!showElem || !hideElem) return;

  // Show the selected one
  showElement(showElem);

  // Hide the other one
  hideElement(hideElem)  
}

// Authentication

async function createUser(event: Event) {
  console.log("submit capté");
  event.preventDefault(); //empeche le rechargement de la page
  alert("On appelle createUser");
  const nameInput = document.getElementById("registerName") as HTMLInputElement | null;
  if (!nameInput) return alert("Champ nom introuvable");
  const name = nameInput.value;
  const emailInput = document.getElementById("registerEmail") as HTMLInputElement | null;
  if (!emailInput) return alert("Champ email introuvable");
  const email = emailInput.value;
  const passwordInput = document.getElementById("registerPassword") as HTMLInputElement | null;
  if (!passwordInput) return alert("Champ mot de passe introuvable");
  const password = passwordInput.value;

  const backendUrl = "http://localhost:3000";

  const response = await fetch(`${backendUrl}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({name, email, password}),
  });
 
  const data = await response.json();
  alert(JSON.stringify(data));
}

async function loginUser(event: Event) {
  event.preventDefault();
  const nameInput = document.getElementById("loginName") as HTMLInputElement;
  const passwordInput = document.getElementById("loginPassword") as HTMLInputElement;
  const name = nameInput.value;
  const password = passwordInput.value;
  const backendUrl = "http://localhost:3000";
  const response = await fetch (`${backendUrl}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({name, password}),
  });
  const data = await response.json();
  alert(JSON.stringify(data));
}




// changes the content of each id="app" component in index.html
// function render() {
//   const path = window.location.pathname; // the current url of the adress bar
//   const page = routes[path] || (() => '<h1>404 Not Found</h1>'); // page gets the route value corresponding to the key
//   document.getElementById('app')!.innerHTML = page(); // writes the result of page() into the right component id="app"

//   // After render, hook up any needed interactivity
//   if (path === '/play') {
//     const localBtn = document.getElementById('localBtn');
//     const localOptions = document.getElementById('localOptions');
//     const onlineBtn = document.getElementById('onlineBtn');
//     const onlineOptions = document.getElementById('onlineOptions');

//     localBtn?.addEventListener('click', () => {
//       toggleOptions(localOptions, onlineOptions);
//     });

//     onlineBtn?.addEventListener('click', () => {
//       toggleOptions(onlineOptions, localOptions);
//     });
//   }

//   // Pour gerer la connexion / inscription
//   if (path === '/profile') {
//     const registerForm = document.getElementById('registerForm') as HTMLElement;
//     if (!registerForm) {
//       alert("registerForm is null");
//     } else {
//       // console.log("registerForm OK:", registerForm.outerHTML);
//       console.log("createUser =", createUser);
//       registerForm.addEventListener('submit', createUser);
//     }

//     // const loginForm = document.getElementById('loginForm');
//     // loginForm?.addEventListener('submit', loginUser);
//   }
// }






function render() {
  const path = window.location.pathname;
  const page = routes[path] || (() => '<h1>404 Not Found</h1>');
  document.getElementById('app')!.innerHTML = page();

  // On attend que le DOM ait fini de peindre le contenu HTML injecté
  requestAnimationFrame(() => {
    if (path === '/play') {
      const localBtn = document.getElementById('localBtn');
      const localOptions = document.getElementById('localOptions');
      const onlineBtn = document.getElementById('onlineBtn');
      const onlineOptions = document.getElementById('onlineOptions');

      localBtn?.addEventListener('click', () => {
        toggleOptions(localOptions, onlineOptions);
      });

      onlineBtn?.addEventListener('click', () => {
        toggleOptions(onlineOptions, localOptions);
      });
    }

    if (path === '/profile') {
      const registerForm = document.getElementById('registerForm');
      if (!registerForm) {
        alert("registerForm introuvable après render");
      } else {
        console.log("✅ registerForm trouvé");
        registerForm.addEventListener('submit', createUser);
      }

      const loginForm = document.getElementById('loginForm');
      if (loginForm) {
        loginForm.addEventListener('submit', loginUser);
      }
    }
  });
}








// Intercept internal navigation
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement; // ensure it is a DOM element
  if (target.matches('[data-link]')) {
    e.preventDefault(); // avoid browser default behavior which would reload the page
    navigate(target.getAttribute('href')!);
  }
});


// backend get

  // async function pingBackend() {
  //   const backendUrl = "http://backend:3000";
  //   const res = await fetch(`${backendUrl}/ping`);
  //   const data = await res.json();
  //   alert(data.message);                  
  // }


// Handle browser back/forward
window.addEventListener('popstate', render);

// Initial render
render();
