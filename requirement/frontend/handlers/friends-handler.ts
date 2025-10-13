// requirement/frontend/handlers/friends-handler.ts
import { apiBase } from "../src/utils";
import { t } from './language';
import { notify } from './notify';

let wsInstance: WebSocket | null = null;
let activeFriendHistoryKey: string | null = null;
let activeHistoryRequestVersion = 0;

type Friend = {id: number; name: string; username: string; avatar?: string; online: number};

export type { Friend };

//utilitqire*************************************************************************************************************
//********************************************************************************************************************** */

function buildWebSocketUrl(token: string): string {
  const encoded = encodeURIComponent(token);
  
  // Use the current page's host and protocol (works for localhost and any IP)
  const secure = window.location.protocol === "https:";
  const protocol = secure ? "wss" : "ws";
  const host = window.location.host; // includes port if present (e.g., "10.11.102.4:443" or "localhost:443")
  
  return `${protocol}://${host}/webs?token=${encoded}`;
}



// Raccourci pour éviter de répéter document.getElementById
function byId<T extends HTMLElement>(id: string): T | null { return document.getElementById(id) as T | null;}

/* Renvois true ou false selon si l'amitiee est mutuelle */
async function isMutualFriend(friendusername: string): Promise<boolean> {
	const token = localStorage.getItem("token");
	if (!token) return false;
	try {
		const res = await fetch(`${apiBase()}/friends/mutual?username=${encodeURIComponent(friendusername)}`, {
			headers: { Authorization: `Bearer ${token}` }
		});
		if (!res.ok) return false;
		const data = await res.json();
		return !!data.mutual;
	} catch { return false; }
}

async function postFriendAction(url: string, body: object, successKey: string): Promise<boolean> {
	try {
		const res = await fetch(`${apiBase()}${url}`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${localStorage.getItem("token")!}`,
				"Content-Type": "application/json",
			},
				body: JSON.stringify(body),
		});

		const data = await res.json();
		if (res.ok) {
			notify(t(successKey), { type: 'success' });
			return true;
		} else {
			// const message =
			// 	data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' && data.error.trim()
			// 		? data.error
			// 		: t('friends.alerts.network');
			const message = t('friends.alerts.actionImpossible');
			notify(message, { type: 'warning' });
			return false;
		}
	} catch (err) {
		console.error(err);
		return false;
	}
}


async function removeFriendByUsername(username: string): Promise<void> {
	const trimmed = username.trim();
	if (!trimmed) return;

	const removed = await postFriendAction("/friends/remove", { unFriendUsername: trimmed }, t('friends.alerts.removed'));
	if (!removed) return;

	const currentUsernameEl = byId<HTMLSpanElement>("friendProfileUsername");
	const currentUsername = currentUsernameEl?.textContent?.trim();
	if (currentUsername && currentUsername.toLowerCase() === trimmed.toLowerCase()) {
		resetFriendProfile();
	}
}


function historyKeyForFriend(friend: Friend): string {
	const parts = [
		friend.id !== undefined ? String(friend.id) : '',
		friend.username ?? '',
		friend.name ?? '',
	];

	const key = parts
		.map((value) => value.trim())
		.filter((value) => value.length > 0)
		.join('|')
		.toLowerCase();

	if (key.length > 0) return key;

	const fallback = (friend.username || friend.name || `friend-${friend.id ?? 'unknown'}`)
		.trim()
		.toLowerCase();

	return fallback.length > 0 ? fallback : `friend-${Date.now()}`;
}

function isLatestHistoryRequest(key: string, version: number): boolean {
	return activeFriendHistoryKey === key && activeHistoryRequestVersion === version;
}

//affichage*************************************************************************************************************
//********************************************************************************************************************** */
export async function refreshFriendsList() {
	const friendsList = byId<HTMLUListElement>("friendsList");
	if (!friendsList ) return;

	const friends = await fetchFriends();
	friendsList.innerHTML = "";

	if (!Array.isArray(friends)) return console.warn(" Mauvais format : friends n'est pas un tableau !");
	if (friends.length === 0) {
		resetFriendProfile();
		console.warn(" Aucun ami trouvé.");
	}
	const avatarLabel = t('profile.avatarTitle');
	const mutuals = await Promise.all(friends.map(f => isMutualFriend(f.username)));

	friends.forEach((friend, i) => {
		const mutual = mutuals[i];
		const li = document.createElement("li");
		li.dataset.username = friend.username;
		li.className = [
			"relative group",
			"grid grid-cols-[auto_1fr_auto_auto] items-center gap-3",
			"rounded-[1.1rem] px-4 py-3 overflow-hidden",
			"bg-gradient-to-br from-base-100/90 via-base-200/75 to-base-200/60",
			"border border-base-300/50",
			"shadow-[0_28px_75px_-55px_rgba(12,10,30,0.75)]",
			"transition duration-200 ease-out",
			"hover:-translate-y-[3px] focus-within:-translate-y-[3px]",
			"hover:border-primary/60 focus-within:border-primary/60",
			"focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-primary/45 focus-visible:outline-offset-4",
		].join(" ");
		li.tabIndex = 0;
		li.setAttribute("role", "button");
		// li.setAttribute("aria-label", `${t('friends.usernameLabel')} ${friend.username}`);
		// ava
		const img = document.createElement("img");
		img.src = friend.avatar
			? `${apiBase()}/images/${friend.avatar}`
			: "/assets/default-avatar.png";
		img.alt = friend.username ? `${friend.username} - ${avatarLabel}` : avatarLabel;
		img.className = "w-8 h-8 rounded-full object-cover";

		// status
		const status = document.createElement("span");
		status.classList.add("status-span");
		if (mutual) {
			status.className = `status-span status-dot h-3 w-3 shrink-0 rounded-full ${friend.online ? "bg-green-500" : "bg-gray-400"}`;
			status.title = friend.online ? t('status.online') : t('status.offline');
		} else {
			status.className = "badge badge-warning badge-outline shrink-0 text-xs";
			status.textContent = t('status.pending');
			status.title = t('friends.alerts.pending', { username: friend.username });
		}
		
		// affihcer les usernames
		const span = document.createElement("span");
		span.textContent = friend.username;
		span.className = "friend-username text-sm font-medium text-base-content/90";

		//appendChild: methode du DOM, ajoute un element html enfant(img, status, span) a un element parent(li) existant
		//le positionnement est important ici on place le spen(username) entre l'image et le status
		li.appendChild(img);
		li.appendChild(span);
		li.appendChild(status);

		const removeBtn = document.createElement("button");
		removeBtn.type = "button";
		removeBtn.className = "btn btn-circle btn-outline btn-error btn-xs md:btn-sm ml-1";		removeBtn.innerHTML = "&times;";
		const removeTarget = friend.username || friend.name || t('common.none');
		const removeLabel = t('friends.removeButton', { username: removeTarget });
		removeBtn.setAttribute("aria-label", removeLabel);
		removeBtn.title = removeLabel;
		removeBtn.addEventListener("click", async (event) => {
			event.preventDefault();
			event.stopPropagation();
			try {
				await removeFriendByUsername(friend.username);
			} catch (err) {
				console.error('removeFriendByUsername failed', err);
			}
		});
		li.appendChild(removeBtn);

		li.addEventListener("click", () => {
			if (!mutual) {// Vérifier amitié réciproque
				notify(t('friends.alerts.pending', { username: friend.username }), { type: 'warning' });
				return;
			}
			void friendProfile(friend);
		});
		li.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
				e.preventDefault();
				if (!mutual) {
						notify(t('friends.alerts.pending', { username: friend.username }), { type: 'warning' });
					return;
				}
				void friendProfile(friend);
			}
		});
		friendsList.appendChild(li);//parent:friendsList; child:li
	});

	const currentProfileUsernameEl = byId<HTMLSpanElement>("friendProfileUsername");
	const currentProfileUsername = currentProfileUsernameEl?.textContent?.trim().toLowerCase();
	if (currentProfileUsername) {
		const stillMutual = friends.some((friend, index) => {
			const candidate = friend.username?.trim().toLowerCase();
			return candidate === currentProfileUsername && mutuals[index];
		});
		if (!stillMutual) {
			resetFriendProfile();
		}
	}

}

export async function friendProfile(friend: Friend){
	const card = byId<HTMLDivElement>("friendProfileCard");
	const hint = byId<HTMLParagraphElement>("friendProfileHint");
	const profName = byId<HTMLDivElement>("friendProfileName");
	const profUsername = byId<HTMLSpanElement>("friendProfileUsername");
	const profAva = byId<HTMLImageElement>("friendProfileAvatar");
	const avatarLabel = t('profile.avatarTitle');
	const noneLabel = t('common.none');
	if (!card || !hint || !profName || !profUsername || !profAva) return;
	try{
		const displayName = friend.name || friend.username ;
		const displayUser = friend.username;
		const avatarFile = friend.avatar ?? "";

		hint.classList.add("hidden");
		card.classList.remove("hidden");
		profName.textContent = displayName;
		profUsername.textContent = displayUser;
		profAva.className = "h-24 w-24 rounded-full border-2 border-primary/50 object-cover";
		profAva.src = avatarFile ? `${apiBase()}/images/${avatarFile}` : "/assets/default-avatar.png";
		profAva.alt = displayUser ? `${displayUser} - ${avatarLabel}` : avatarLabel;

	} catch (e){
		console.warn("friendProfile failed:", e);
		profName.textContent = friend.name;
		const fallbackUsername = friend.username || noneLabel;
		profUsername.textContent = fallbackUsername;
		profAva.src = "/assets/default-avatar.png";
		profAva.alt = avatarLabel;
	}

	const historyKey = historyKeyForFriend(friend);
  	activeFriendHistoryKey = historyKey;
  	const requestVersion = ++activeHistoryRequestVersion;
	await renderFriendHistory(friend, historyKey, requestVersion);
}

async function renderFriendHistory(friend: Friend, historyKey: string, requestVersion: number) {
	const section = byId<HTMLDivElement>("friendHistorySection");
	const content = byId<HTMLDivElement>("friendHistoryContent");
	if (!section || !content) return;

	section.classList.remove("hidden");
	content.innerHTML = `<span class="text-gray-300 text-sm">${t('friends.history.loading')}</span>`;

	const token = localStorage.getItem("token");
	const realName = (localStorage.getItem("name") || "").trim();
	const opponentFallback = friend.username || friend.name || "";

	if (!token || !realName) {
		if (isLatestHistoryRequest(historyKey, requestVersion)) {
			content.innerHTML = `<em class="text-gray-400 text-sm">${t('friends.history.loginPrompt')}</em>`;
		}
		return;
	}

	content.innerHTML = `<span class="text-gray-300 text-sm">${t('friends.history.loading')}</span>`;

	try {
		const res = await fetch(`${apiBase()}/users/${encodeURIComponent(realName)}/history`, {
			headers: { Authorization: `Bearer ${token}` }
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		if (!isLatestHistoryRequest(historyKey, requestVersion)) return;

		const data = await res.json();
		if (!isLatestHistoryRequest(historyKey, requestVersion)) return;

		const matches = Array.isArray(data?.matches) ? data.matches : [];
		const friendKeys = [friend.name, friend.username]
			.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
			.map((value) => value.trim().toLowerCase());

		const filtered = matches
			.filter((match: any) => {
				if (!match || typeof match.opponent !== 'string') return false;
				const opponent = match.opponent.trim().toLowerCase();
				return friendKeys.includes(opponent);
			})
			.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
			.slice(0, 10);

		if (!isLatestHistoryRequest(historyKey, requestVersion)) return;

		if (!filtered.length) {
			content.innerHTML = `<em class="text-gray-400 text-sm">${t('friends.history.empty', { username: opponentFallback })}</em>`;
			return;
		}

		const html = filtered
			.map((match: any) => {
				const isVictory = match.result === 'W';
				const resultLabel = isVictory ? t('profile.match.victory') : t('profile.match.defeat');
				const cardBg = isVictory ? 'bg-green-200' : 'bg-red-200';
				const borderClr = isVictory ? 'border-green-400' : 'border-red-400';
				const when = new Date(match.date).toLocaleString();

				return `
					<div class="${cardBg} border ${borderClr} rounded-lg p-4 shadow space-y-2 text-black">
						<div class="flex flex-wrap items-center gap-3">
							<span class="font-bold">${resultLabel}</span>
							<span class="opacity-60">•</span>
							<span><span class="font-semibold">${t('profile.match.you')} :</span> ${match.me}</span>
							<span class="opacity-60">•</span>
							<span><span class="font-semibold">${t('profile.match.score')} :</span> ${match.myScore} - ${match.oppScore}</span>
							<span class="opacity-60">•</span>
							<span><span class="font-semibold">${t('profile.match.opponent')} :</span> ${match.opponent}</span>
						</div>
						<div class="text-xs opacity-70">${when}</div>
					</div>
				`;
			})
			.join('');

		if (!isLatestHistoryRequest(historyKey, requestVersion)) return;
		content.innerHTML = html;
	} catch (err) {
		console.error(err);
    	if (isLatestHistoryRequest(historyKey, requestVersion)) {
    		content.innerHTML = `<span class="text-red-400 text-sm">${t('friends.history.error')}</span>`;
	    }
	}
}

export function resetFriendProfile() {
	const card = byId<HTMLDivElement>("friendProfileCard");
	const hint = byId<HTMLParagraphElement>("friendProfileHint");
	const profName = byId<HTMLDivElement>("friendProfileName");
	const profUsername = byId<HTMLSpanElement>("friendProfileUsername");
	const profAva = byId<HTMLImageElement>("friendProfileAvatar");
	const avatarLabel = t('profile.avatarTitle');
	if (card) card.classList.add("hidden");
	if (hint) {
		hint.textContent = t('friends.hint');
		hint.classList.remove("hidden");
	}
	if (profName) profName.textContent = "";
	if (profUsername) profUsername.textContent = "";
	if (profAva) {
		profAva.src = "/assets/default-avatar.png";
		profAva.alt = avatarLabel;
		profAva.className = "h-24 w-24 rounded-full border-2 border-gray-500 object-cover";
	}

	const historySection = byId<HTMLDivElement>("friendHistorySection");
	const historyContent = byId<HTMLDivElement>("friendHistoryContent");
	if (historySection) historySection.classList.add("hidden");
	if (historyContent) historyContent.innerHTML = "";


	activeFriendHistoryKey = null;
	activeHistoryRequestVersion++;
}


//api******************************************************************************************************************* */
//********************************************************************************************************************** */

export async function addFriends(event: Event) {
	event.preventDefault();
	const form = event.target as HTMLFormElement;
	const input = form.querySelector("#friendUsernameInput") as HTMLInputElement;
	if (!input || !input.value.trim()) return alert(t('friends.alerts.invalidAdd'));

	await postFriendAction("/friends/add", { friendUsername: input.value.trim() }, t('friends.alerts.added'));
	input.value = "";
}

export async function removeFriends(event: Event) {
	event.preventDefault();
	const input = (event.target as HTMLFormElement).querySelector("#removefriendUsernameInput") as HTMLInputElement;
	if (!input || !input.value.trim()) return alert(t('friends.alerts.invalidRemove'));

	await removeFriendByUsername(input.value);
	input.value = "";
}

/* fetchFriends(): return un tab d'objet: id, name, username.
contenant la liste des amis de l'utilisateur identifie
Recupere le token dans localStorage (!token renvois une erreur).
*/
export async function fetchFriends(): Promise<Friend[]> {
	const token = localStorage.getItem("token");
	if (!token) throw new Error(t('alerts.needLogin'));

	try{
		const res = await fetch(`${apiBase()}/friends`, {
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		if (!res.ok) return [];
		const data = await res.json();
		if (!data || !Array.isArray(data.friends))
			throw new Error("Bad payload");
		return data.friends as Friend[];

	}catch (err){
		console.warn("fetchFriends failed:", err);
		return []; 
	}
}

//socket pastilles****************************************************************************************************** */
//********************************************************************************************************************** */
export function initSocket(token: string) {
	if (wsInstance && (wsInstance.readyState === WebSocket.OPEN || wsInstance.readyState === WebSocket.CONNECTING)) {
		return wsInstance;
	}

	closeSocket();

	const socket = new WebSocket(buildWebSocketUrl(token));
	wsInstance = socket;

	socket.onclose = () => { wsInstance = null; };

	socket.onmessage = (evt) => {
		try {
			const payload = JSON.parse(evt.data);
			if (payload.type === "status_change") {	updateFriendStatus(payload.username, payload.online); }
			if (payload.type === "friendship_change") {	refreshFriendsList(); }
		} catch (err) {	console.warn("Message WS non JSON", err); }
	};

	return socket;
}

export function closeSocket() { 
	if (wsInstance) (wsInstance.close(), wsInstance = null); 
}


function updateFriendStatus(username: string, online: boolean) {
	const friendsList = document.getElementById("friendsList");
	if (!friendsList) return;

	const li = friendsList.querySelector(`li[data-username="${CSS.escape(username)}"]` ) as HTMLLIElement | null;
	if (!li) return;

	const dot = li.querySelector(".status-dot") as HTMLElement | null;
	if (!dot) return;

	dot.classList.remove("bg-green-500", "bg-gray-400");
	dot.classList.add(online ? "bg-green-500" : "bg-gray-400");
	dot.title = online ? t('status.online') : t('status.offline');
}
