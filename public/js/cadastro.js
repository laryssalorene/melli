// public/js/cadastro.js

document.getElementById('cadastroForm').addEventListener('submit', async function (event) {
    event.preventDefault(); // Impede o recarregamento da página

    // Captura o valor do campo 'nickname'
    const nickname = document.getElementById('nickname').value; 
    const email = document.getElementById('email').value;
    // Captura o valor do campo de senha (id='senha', mas nome='password' para o backend)
    const password = document.getElementById('senha').value; 
    
    const feedbackMessage = document.getElementById('feedbackMessage');
    feedbackMessage.textContent = ''; // Limpa mensagens anteriores
    feedbackMessage.className = 'message'; // Reseta classes de estilo

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Envia 'nickname', 'email' e 'password' para o backend
            body: JSON.stringify({ nickname, email, password }), 
        });

        const data = await response.json();

        if (response.ok) {
            // Cadastro bem-sucedido
            feedbackMessage.textContent = data.message || 'Cadastro realizado com sucesso!';
            feedbackMessage.classList.add('success-message');
            document.getElementById('cadastroForm').reset();
            
            // Redireciona para a página de login após um pequeno atraso
            setTimeout(() => {
                window.location.href = '/html/login.html';
            }, 2000); 
        } else {
            // Erro no cadastro
            feedbackMessage.textContent = data.message || 'Erro ao cadastrar. Tente novamente.';
            feedbackMessage.classList.add('error-message');
        }
    } catch (error) {
        console.error('Erro na requisição de cadastro:', error);
        feedbackMessage.textContent = 'Erro de conexão. Tente novamente mais tarde.';
        feedbackMessage.classList.add('error-message');
    }
});