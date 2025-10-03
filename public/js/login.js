// public/js/login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password'); // Elemento HTML
    const loginMessage = document.getElementById('loginMessage');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Impede o recarregamento padrão da página

        const email = emailInput.value;
        const password = passwordInput.value; // Valor do campo de input

        loginMessage.textContent = ''; // Limpa mensagens anteriores
        loginMessage.className = 'message'; // Reseta a classe da mensagem

        try {
            const response = await fetch('/api/users/login', { // Rota de login no backend
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // AQUI ESTAVA O DETALHE: O backend espera 'senha', não 'password'
                body: JSON.stringify({ email, senha: password }), // Backend espera 'senha'
            });

            const data = await response.json();

            if (response.ok) {
                // Login bem-sucedido
                // Chaves para localStorage: 'jwtToken' é um nome comum e bom.
                // Certifique-se de que a página 'home.html' e seus scripts leem essa mesma chave.
                localStorage.setItem('jwtToken', data.token); // Armazena o token JWT
                localStorage.setItem('userId', data.user.id_usuario); // Armazena o ID do usuário
                localStorage.setItem('userName', data.user.nome); // Armazena o nome do usuário

                loginMessage.textContent = 'Login realizado com sucesso! Redirecionando...';
                loginMessage.classList.add('success');
                
                // Redireciona para a página 'home.html'.
                // Se 'home.html' está na raiz de 'public/html', você pode usar '/html/home.html'
                // Ou apenas 'home.html' se a sua rota base estiver configurada para isso.
                // Como você estava sendo redirecionada para lá, vamos manter 'home.html'.
                window.location.href = '/html/home.html'; // Usando o caminho completo para garantir
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