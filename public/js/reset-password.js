// public/js/reset-password.js

document.addEventListener('DOMContentLoaded', () => {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const newPasswordField = document.getElementById('newPassword');
    const confirmPasswordField = document.getElementById('confirmPassword');
    const messageElement = document.getElementById('message');

    // Extrair o token da URL
    const urlParams = new URLSearchParams(window.location.search);
    let token = urlParams.get('token'); // Use 'let' para poder modificar se necessário

    console.log('reset-password.js: Token bruto extraído da URL:', token); // <-- DEPURACAO

    if (!token) {
        displayMessage('Erro: Token de redefinição de senha não encontrado na URL.', 'error');
        // Redirecionar para forgot-password ou index após alguns segundos
        setTimeout(() => {
            window.location.href = '/html/forgot-password.html';
        }, 3000);
        return; // Impede que o formulário seja enviado sem token
    }

    // VERIFICAÇÃO ADICIONAL: Se, por algum motivo, o token ainda for uma URL completa,
    // tente extrair a parte do token novamente.
    // Isso é um band-aid, a correção ideal seria garantir que o 'token' no URL PARAMETER
    // seja apenas o JWT desde o 'emailService'.
    if (token.includes('http://') || token.includes('https://') || token.includes('/html/reset-password.html')) {
        console.warn('reset-password.js: Token parece ser uma URL completa. Tentando extrair novamente...');
        try {
            const tempUrl = new URL(token); // Tenta parsear como URL
            token = tempUrl.searchParams.get('token') || token; // Pega o 'token' de dentro da 'token'
            console.log('reset-password.js: Token re-extraído:', token);
            if (!token) { // Se a re-extração falhar
                displayMessage('Erro: Token de redefinição inválido ou incompleto.', 'error');
                setTimeout(() => { window.location.href = '/html/forgot-password.html'; }, 3000);
                return;
            }
        } catch (e) {
            console.error('reset-password.js: Falha ao re-extrair token da URL complexa:', e);
            displayMessage('Erro: Token de redefinição inválido ou formatado incorretamente.', 'error');
            setTimeout(() => { window.location.href = '/html/forgot-password.html'; }, 3000);
            return;
        }
    }


    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newPassword = newPasswordField.value;
        const confirmPassword = confirmPasswordField.value;

        if (newPassword !== confirmPassword) {
            displayMessage('As senhas não coincidem.', 'error');
            return;
        }

        if (newPassword.length < 6) {
            displayMessage('A nova senha deve ter pelo menos 6 caracteres.', 'error');
            return;
        }

        try {
            const requestUrl = `/api/users/reset-password/${token}`;
            console.log('reset-password.js: URL da requisição POST final:', requestUrl); // <-- DEPURACAO

            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newPassword }),
            });

            // Se a resposta NÃO for JSON (ex: HTML de 404), data.json() vai falhar
            // Precisamos verificar o content-type da resposta
            const contentType = response.headers.get('content-type');
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                // Se não for JSON, pode ser HTML de um erro, ou texto simples
                const text = await response.text();
                console.error('reset-password.js: Resposta não é JSON:', text);
                displayMessage('Ocorreu um erro inesperado no servidor. Por favor, tente novamente.', 'error');
                return; // Para não tentar processar como JSON
            }
            
            if (response.ok) {
                displayMessage(data.message, 'success');
                // Redirecionar para a página de login após alguns segundos
                setTimeout(() => {
                    window.location.href = '/html/login.html';
                }, 3000);
            } else {
                displayMessage(data.message || 'Erro ao redefinir a senha.', 'error');
            }
        } catch (error) {
            console.error('reset-password.js: Erro de rede ou servidor:', error);
            // Verifica se o erro é de sintaxe JSON, o que indica que o servidor enviou HTML
            if (error instanceof SyntaxError && error.message.includes('JSON')) {
                 displayMessage('Erro de comunicação: A resposta do servidor não é válida. Tente novamente.', 'error');
            } else {
                 displayMessage('Erro de conexão. Tente novamente mais tarde.', 'error');
            }
        }
    });

    function displayMessage(text, type) {
        messageElement.textContent = text;
        messageElement.className = 'message ' + type; // Limpa e adiciona a classe
    }
});