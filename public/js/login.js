// scripts/js/login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginMessage = document.getElementById('loginMessage');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Impede o recarregamento padrão da página

        const email = emailInput.value;
        const password = passwordInput.value;

        loginMessage.textContent = ''; // Limpa mensagens anteriores
        loginMessage.className = 'message'; // Reseta a classe da mensagem

        try {
            const response = await fetch('/api/users/login', { // Rota de login no backend
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, senha: password }), // Backend espera 'senha'
            });

            const data = await response.json();

            if (response.ok) {
                // Login bem-sucedido
                localStorage.setItem('token', data.token); // Armazena o token JWT
                localStorage.setItem('userId', data.user.id_usuario); // Armazena o ID do usuário
                localStorage.setItem('userName', data.user.nome); // Armazena o nome do usuário

                loginMessage.textContent = 'Login realizado com sucesso! Redirecionando...';
                loginMessage.classList.add('success');
                
                // Redireciona para a dashboard ou página inicial
                window.location.href = 'dashboard.html'; // Altere para a sua página de dashboard
            } else {
                // Login falhou
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