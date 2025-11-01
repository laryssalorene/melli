// public/js/login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    // Corrigido para pegar o elemento com ID 'email' (o campo de input para o e-mail)
    const emailInput = document.getElementById('email'); 
    const passwordInput = document.getElementById('password'); 
    const loginMessage = document.getElementById('loginMessage');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Agora coleta o valor do campo 'email'
        const email = emailInput.value;
        const password = passwordInput.value; 

        loginMessage.textContent = ''; 
        loginMessage.className = 'message'; 

        try {
            // CORREÇÃO 1: Mudar a URL para o endpoint correto de login de autenticação
            const response = await fetch('/api/auth/login', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // CORREÇÃO 2: Enviar 'email' e 'password' no corpo da requisição
                body: JSON.stringify({ email: email, password: password }), 
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('jwtToken', data.token); 
                localStorage.setItem('userId', data.user.id_usuario); 
                localStorage.setItem('userNickname', data.user.nickname); 
                localStorage.setItem('userEmail', data.user.email); // Armazena o e-mail descriptografado no localStorage

                loginMessage.textContent = 'Login realizado com sucesso! Redirecionando...';
                loginMessage.classList.add('success');
                
                // Redireciona para a página 'home.html'
                window.location.href = '/html/home.html'; 
            } else {
                loginMessage.textContent = data.message || 'Erro ao fazer login. Verifique suas credenciais.';
                loginMessage.classList.add('error');
                console.error('Erro de login:', data.message);
            }
        } catch (error) {
            console.error('Erro de rede ou servidor:', error);
            loginMessage.textContent = 'Erro de conexão. Tente novamente mais tarde.';
            loginMessage.classList.add('error');
        }
    });
});