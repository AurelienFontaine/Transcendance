const backendUrl = "http://localhost:3000";

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
    alert('Username successfully updated!!!!!');
  } catch (err) {
    console.error(err);
    alert ('Error: could not change username');
  }
}

export async function changePassword(event: Event) {
    // get info + basic test
    event.preventDefault();
    const inputOld = document.getElementById('oldPassword') as HTMLInputElement;
    const inputNew = document.getElementById('newPassword') as HTMLInputElement;
    if (!inputNew || !inputOld)
        return (alert('Error: no input found'));
    const oldPassword = inputOld.value.trim();
    const newPassword = inputNew.value.trim();
    if (!newPassword || !oldPassword)
        return (alert('Error: please enter a valid password (3+ char)'));
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
            oldPassword: oldPassword,
            newPassword: newPassword 
        })
    });
    const data = await res.json();
    if (!res.ok)
        return (alert('Error: ' + (data.error || res.statusText)));
    //update local storage + UI
    localStorage.setItem('username', data.username);
    if (data.token)
      localStorage.setItem('token', data.token);
    
    // Reset du formulaire apres utilisation
    inputNew.value = '';
    inputOld.value = '';
    alert('Password successfully updated');
  } catch (err) {
    console.error(err);
    alert ('Error: server');
  }
}



//////// Lie a google Auth /////////////////


export async function googleChangePassword(event: Event) {
    // get info + basic test
    event.preventDefault();
    const input = document.getElementById('Password') as HTMLInputElement;
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
        const res = await fetch(`${backendUrl}/me/googlePassword`, {
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
    localStorage.setItem('username', data.username);
    if (data.token)
      localStorage.setItem('token', data.token);
    
    // Reset du formulaire apres utilisation
    input.value = '';
    inputConfirm.value = '';
    alert('Password successfully updated');
  } catch (err) {
    console.error(err);
    alert ('Error: server');
  }
}