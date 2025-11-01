// public/js/login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    // Corrigido para pegar o elemento com ID 'nickname'
    const nicknameInput = document.getElementById('nickname'); 
    const passwordInput = document.getElementById('password'); 
    const loginMessage = document.getElementById('loginMessage');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Corrigido para pegar o valor do campo 'nickname'
        const nickname = nicknameInput.value;
        const password = passwordInput.value; 

        loginMessage.textContent = ''; 
        loginMessage.className = 'message'; 

        try {
            const response = await fetch('/api/users/login', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Corrigido para enviar 'nickname' e 'senha' (que o backend espera)
                body: JSON.stringify({ nickname: nickname, senha: password }), 
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('jwtToken', data.token); 
                localStorage.setItem('userId', data.user.id_usuario); 
                // Armazena o nickname do usuário (consistente com o que é retornado do backend)
                localStorage.setItem('userNickname', data.user.nickname); 

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