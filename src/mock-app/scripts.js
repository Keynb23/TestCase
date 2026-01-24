// src/mock-app/scripts.js
const startBtn = document.getElementById('start-btn');
const loginSubmit = document.getElementById('login-submit');
const interfaceSection = document.getElementById('interface-selection');
const loginPage = document.getElementById('login-page');
const dashboard = document.getElementById('dashboard');
const userDisplay = document.getElementById('user-display');

let selectedRole = '';

startBtn?.addEventListener('click', () => {
    const radioButtons = document.getElementsByName('role');
    radioButtons.forEach(radio => {
        if (radio.checked) selectedRole = radio.value;
    });

    if (!selectedRole) return alert('Select a role!');

    interfaceSection?.classList.add('hidden');
    loginPage?.classList.remove('hidden');
});

loginSubmit?.addEventListener('click', () => {
    loginPage?.classList.add('hidden');
    dashboard?.classList.remove('hidden');
    if (userDisplay) {
        userDisplay.innerText = selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1);
    }
});