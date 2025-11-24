// public/js/cadastro.js

document.getElementById('cadastroForm').addEventListener('submit', async function (event) {
    event.preventDefault(); // Impede o recarregamento da página

    // Captura os valores do formulário
    const nickname = document.getElementById('nickname').value; 
    const email = document.getElementById('email').value;
    const password = document.getElementById('senha').value; 
    
    // Captura o mascote selecionado
    const selectedMascoteInput = document.querySelector('input[name="mascote"]:checked');
    // IMPORTANTE: Captura o ID NUMÉRICO (1, 2, 3) diretamente do valor do rádio
    const mascoteId = selectedMascoteInput ? parseInt(selectedMascoteInput.value, 10) : null; 

    const feedbackMessage = document.getElementById('feedbackMessage');
    feedbackMessage.textContent = ''; // Limpa mensagens anteriores
    feedbackMessage.className = 'message'; // Reseta classes de estilo

    // Validação para garantir que um mascote foi escolhido
    if (mascoteId === null || isNaN(mascoteId)) { // Verifica se é null ou NaN
        feedbackMessage.textContent = 'Por favor, escolha um mascote.';
        feedbackMessage.classList.add('error-message');
        return; 
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Envia 'nickname', 'email', 'password' e o 'mascote_id' (NUMÉRICO) para o backend
            body: JSON.stringify({ nickname, email, password, mascote_id: mascoteId }), 
        });

        const data = await response.json();

        if (response.ok) {
            feedbackMessage.textContent = data.message || 'Cadastro realizado com sucesso!';
            feedbackMessage.classList.add('success-message');
            document.getElementById('cadastroForm').reset();
            
            // Opcional: Limpar a descrição do mascote e remover a borda após o cadastro bem-sucedido
            const descriptionBox = document.getElementById('mascote-description-box');
            descriptionBox.textContent = 'Clique em um mascote para ver sua descrição.';
            descriptionBox.classList.remove('mascote-active');
            document.querySelectorAll('.mascote-option').forEach(opt => opt.classList.remove('selected-mascote-border'));

            setTimeout(() => {
                window.location.href = '/html/login.html';
            }, 2000); 
        } else {
            feedbackMessage.textContent = data.message || 'Erro ao cadastrar. Tente novamente.';
            feedbackMessage.classList.add('error-message');
        }
    } catch (error) {
        console.error('Erro na requisição de cadastro:', error);
        feedbackMessage.textContent = 'Erro de conexão. Tente novamente mais tarde.';
        feedbackMessage.classList.add('error-message');
    }
});

// Lógica de Exibição de Descrição e Borda no Clique
document.addEventListener('DOMContentLoaded', () => {
    const mascoteOptions = document.querySelectorAll('.mascote-option');
    const descriptionBox = document.getElementById('mascote-description-box');

    // Estado inicial da caixa de descrição
    descriptionBox.textContent = 'Clique em um mascote para ver sua descrição.';
    descriptionBox.classList.remove('mascote-active'); 

    mascoteOptions.forEach(option => {
        const radio = option.querySelector('input[type="radio"]');
        const descriptionText = option.dataset.description; 

        const applySelectionStyles = (selected) => {
            mascoteOptions.forEach(opt => opt.classList.remove('selected-mascote-border'));
            
            if (selected) {
                option.classList.add('selected-mascote-border');
                descriptionBox.textContent = descriptionText;
                descriptionBox.classList.add('mascote-active');
            } else {
                descriptionBox.textContent = 'Clique em um mascote para ver sua descrição.';
                descriptionBox.classList.remove('mascote-active');
            }
        };

        // Escuta o clique em qualquer lugar da label (área do mascote)
        option.addEventListener('click', () => {
            setTimeout(() => {
                applySelectionStyles(radio.checked);
            }, 0);
        });

        if (radio.checked) {
            applySelectionStyles(true);
        }
    });
});