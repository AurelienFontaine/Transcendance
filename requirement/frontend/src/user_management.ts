const backendUrl = "http://localhost:3000";

import { navigate } from "./utils";

export async function changeUsername(event: Event) {
  // get info + basic test
  event.preventDefault();
  // alert('On essaie de changer le pseudo');
  const input = document.getElementById('newUsername') as HTMLInputElement;
  if (!input)
    return (alert('Error: no input found'));
  const newUsername = input.value.trim();
  if (!newUsername)
      return (alert('Error: please enter a valid username (3 - 30 char)'));
  const token = localStorage.getItem('token');
  if (!token)
    return (alert('Error: you should be connected to do that'));

  try { // call back functions
    const res = await fetch(`${backendUrl}/me/username`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username: newUsername })
    });
    const data = await res.json();
    if (!res.ok)
      return (alert('Error: ' + (data.error || res.statusText)));
    //update local storage + UI
    localStorage.setItem('username', data.username);
    if (data.token)
      localStorage.setItem('token', data.token);
    
    const currentUsername = document.getElementById('currentUsername');
    if (currentUsername)
      currentUsername.textContent = data.username;
    
    input.value = '';
    // alert('Username successfully updated!!!!!');
  } catch (err) {
    console.error(err);
    alert ('Error: could not change username');
  }
}

//////// changement de mot de passe /////////////////

export async function changePassword(event: Event) {
    // get info + basic test
    event.preventDefault();
    const input = document.getElementById('newPassword') as HTMLInputElement;
    const inputConfirm = document.getElementById('confirmPassword') as HTMLInputElement;
    if (!input || !inputConfirm)
        return (alert('Error: no input found'));
    const password = input.value.trim();
    const confirmPassword = inputConfirm.value.trim();
    if (!password || !confirmPassword)
        return (alert('Error: please enter a valid password (3+ char)'));
    if (password != confirmPassword)
        return (alert('Error: please input the same password'))
    const token = localStorage.getItem('token');
    if (!token)
        return (alert('Error: you should be connected to do that'));

    try { // call back functions
        const res = await fetch(`${backendUrl}/me/password`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            password: password,
            confirmPassword: confirmPassword 
        })
    });
    const data = await res.json();
    if (!res.ok)
        return (alert('Error: ' + (data.error || res.statusText)));
    //update local storage + UI
    if (data.username)
      localStorage.setItem('username', data.username);
    if (data.token)
      localStorage.setItem('token', data.token);
    
    // Reset du formulaire apres utilisation
    input.value = '';
    inputConfirm.value = '';
    alert('Password successfully updated');
    navigate('/profile');
  } catch (err) {
    console.error(err);
    alert ('Error: server');
  }
}

// Gestion des images

export async function setDefaultAvatar(filename: string) {
  await fetch("http://localhost:3000/setDefaultAvatar", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("token") },
    body: JSON.stringify({ avatar: filename })
  });
  alert("On appelle setDefaultAvatar !" + filename);
  // document.getElementById("currentAvatar")?.setAttribute("src", `${backendUrl}/images/${filename}`);
  loadAvatar();
}

export async function loadAvatar() {
	try {
		const response = await fetch("http://localhost:3000/me", {
			method: "GET",
			headers: {
				"Authorization": "Bearer " + localStorage.getItem("token")
			}
		});
		if (!response.ok)
			throw (new Error("Can't load profile"));
		const data = await response.json();
		const avatarFile = data.userSQL.avatar; //nom du fichier image
		const avatarImg = document.getElementById("currentAvatar") as HTMLImageElement;
		if (avatarFile && avatarImg)
			avatarImg.src = `http://localhost:3000/images/${avatarFile}`;
    // alert("On va chercher les images a" + `http://localhost:3000/images/${avatarFile}`);
	} catch (err) {
		console.error(err);
	}
}

