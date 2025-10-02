// public/js/forgot-password.js

document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const emailInput = document.getElementById('email');
    const messageDisplay = document.getElementById('message');

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Previne o envio padrão do formulário

            const email = emailInput.value;

            // Limpa mensagens anteriores
            messageDisplay.textContent = '';
            messageDisplay.className = 'message';

            if (!email) {
                messageDisplay.textContent = 'Por favor, insira seu e-mail.';
                messageDisplay.classList.add('error');
                return;
            }

            try {
                // Envia a requisição para o endpoint do backend
                const response = await fetch('/api/users/forgot-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email }),
                });

                const data = await response.json();

                // O backend sempre retorna 200 OK por segurança, mesmo que o e-mail não exista.
                // A mensagem é que informa o usuário.
                if (response.ok) {
                    messageDisplay.textContent = data.message; // Ex: "Se o e-mail estiver cadastrado..."
                    messageDisplay.classList.add('success');
                    emailInput.value = ''; // Limpa o campo de e-mail após o envio
                } else {
                    // Isso só deve acontecer se houver um erro 400 ou 500 no backend
                    messageDisplay.textContent = data.message || 'Ocorreu um erro ao processar sua solicitação.';
                    messageDisplay.classList.add('error');
                    console.error('Erro no servidor:', data.message);
                }
            } catch (error) {
                console.error('Erro de rede ou ao tentar enviar solicitação:', error);
                messageDisplay.textContent = 'Não foi possível conectar ao servidor. Tente novamente mais tarde.';
                messageDisplay.classList.add('error');
            }
        });
    }
});