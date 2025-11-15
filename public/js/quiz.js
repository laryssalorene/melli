document.addEventListener('DOMContentLoaded', async () => {
    // --- Variáveis Globais e Elementos do DOM ---
    const btnPerfil = document.getElementById("btn-perfil");
    const btnPerfilMobile = document.getElementById("btn-perfil-mobile");
    const colunaEsquerda = document.getElementById("coluna-esquerda");
    const menuToggle = document.getElementById("menu-toggle");
    const mobileMenu = document.getElementById("mobile-menu");
    const userNicknameSpan = document.getElementById("user-nickname"); 
    const userAssiduidadeSpan = document.getElementById("user-assiduidade");
    const userPontosSpan = document.getElementById("user-pontos");
    const btnLogout = document.getElementById('btn-logout');
    const btnLogoutMobile = document.getElementById('btn-logout-mobile');
    const postExplanationTextElement = document.getElementById('post-explanation-text'); 

    // Elementos do Quiz
    const unitTitleElement = document.getElementById('unit-title');
    const questionCounterElement = document.getElementById('question-counter');
    const questionImageElement = document.getElementById('question-image');
    const questionTextElement = document.getElementById('question-text');
    const alternativesContainer = document.getElementById('alternatives-container');
    const submitButton = document.getElementById('submit-button');
    const questionArea = document.getElementById('question-area'); 
    const resultsArea = document.getElementById('results-area');
    const finalScoreElement = document.getElementById('final-score');
    
    // Elementos da Nova Área de Explicação Passo a Passo
    const explanationStepArea = document.getElementById('explanation-step-area'); 
    const currentExplanationBlockContent = document.getElementById('current-explanation-block-content');
    const nextStepButton = document.getElementById('next-step-button'); 

    // Elementos da área de Ranking
    const rankingArea = document.getElementById('ranking-area');
    const rankingList = document.getElementById('ranking-list');
    const returnToModulesFromRankingButton = document.getElementById('return-to-modules-from-ranking-button');

    // Elemento de feedback na tela (NOVO)
    const userFeedbackMessage = document.getElementById('user-feedback-message');
    // Elementos de progresso (NOVO)
    const progressBarContainer = document.getElementById('progress-bar-container');
    const progressBar = document.getElementById('progress-bar');


    let questions = []; 
    let currentQuestionIndex = 0; 
    let userScore = 0; 
    let unitId = null; 
    let currentModuleId = null; 
    let currentExplanationBlocks = []; 
    let currentExplanationBlockIndex = 0; 

    // Variáveis de controle de progresso (NOVO)
    let totalContentSteps = 0;
    let currentContentStep = 0;


    // --- Funções Auxiliares ---

    // NOVO: Função para atualizar a barra de progresso
    function updateProgressBar(advance = 0) {
        currentContentStep += advance;
        if (totalContentSteps === 0) {
            progressBar.style.width = '0%';
            return;
        }

        const percentage = (currentContentStep / totalContentSteps) * 100;
        progressBar.style.width = `${Math.min(percentage, 100).toFixed(2)}%`;
    }

    // NOVO: Função para calcular o total de passos
    function calculateTotalSteps(allQuestions) {
        // Total de passos = (Número de questões) + (Total de blocos de explicação pré-questão)
        let total = allQuestions.length; // Cada questão é um passo principal
        
        allQuestions.forEach(q => {
            if (q.explicacoes_pre_questao) {
                total += q.explicacoes_pre_questao.length;
            }
        });
        totalContentSteps = total;
        currentContentStep = 0; // Reseta o contador para o início
        updateProgressBar(0); // Inicializa a barra em 0%
    }


    // Função para exibir mensagens de feedback na tela (substitui alert)
    function displayFeedbackMessage(message, type = 'warning', duration = 3000) {
        userFeedbackMessage.textContent = message;
        userFeedbackMessage.className = ``; // Limpa classes anteriores
        userFeedbackMessage.classList.add('user-feedback-message'); // Adiciona classe base
        userFeedbackMessage.classList.remove('hidden');

        if (type === 'error') {
            userFeedbackMessage.classList.add('error');
        } else if (type === 'success') {
            userFeedbackMessage.classList.add('success');
        } else {
            userFeedbackMessage.classList.add('warning'); // Padrão
        }

        setTimeout(() => {
            userFeedbackMessage.classList.add('hidden');
        }, duration);
    }

    async function fetchAuthenticatedData(url, options = {}) {
        const token = localStorage.getItem('jwtToken'); 
        if (!token) {
            displayFeedbackMessage('Sessão expirada ou não autorizado. Faça login novamente.', 'error');
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('userId'); 
            localStorage.removeItem('userNickname'); 
            setTimeout(() => {
                window.location.href = '/html/login.html';
            }, 1500);
            return null;
        }

        const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
        const response = await fetch(url, { ...options, headers });

        if (response.status === 401 || response.status === 403) {
            displayFeedbackMessage('Sessão expirada ou não autorizada. Faça login novamente.', 'error');
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('userId'); 
            localStorage.removeItem('userNickname'); 
            setTimeout(() => {
                window.location.href = '/html/login.html';
            }, 1500);
            return null;
        }

        if (!response.ok) {
            let errorBody = await response.text(); 
            let errorData = {};

            try {
                errorData = JSON.parse(errorBody); 
            } catch (e) {
                console.warn(`Resposta de erro não-JSON da URL ${url}:`, errorBody);
            }
            
            const errorMessage = errorData.message || `Erro na requisição: ${response.status} ${response.statusText}. Detalhes: ${errorBody.substring(0, 200)}...`;
            displayFeedbackMessage(errorMessage, 'error');
            throw new Error(errorMessage);
        }

        return response.json();
    }

    async function loadUserProfile() {
        try {
            const user = await fetchAuthenticatedData('/api/users/profile');
            if (user) {
                userNicknameSpan.textContent = user.nickname; 
                userAssiduidadeSpan.textContent = `${user.assiduidade_dias} dias`;
                userPontosSpan.textContent = user.pontos;
                localStorage.setItem('userId', user.id_usuario);
                localStorage.setItem('userNickname', user.nickname); 
            }
        } catch (error) {
            console.error('Erro ao carregar perfil do usuário:', error);
            // O fetchAuthenticatedData já exibe a mensagem de erro da requisição
        }
    }

    function hideAllContainers() {
        explanationStepArea.classList.add('hidden');
        questionArea.classList.add('hidden');
        resultsArea.classList.add('hidden');
        rankingArea.classList.add('hidden'); 
    }

    function logout() {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('userId'); 
        localStorage.removeItem('userNickname'); 
        displayFeedbackMessage('Você foi desconectado.', 'success', 500);
        setTimeout(() => {
            window.location.href = '/html/login.html';
        }, 500);
    }

    // =======================================================
    // Funções de Fluxo de Explicações (Duolingo/Mimo Style)
    // =======================================================

    // Renderiza o bloco de explicação atual no container
    function renderCurrentExplanationBlock() {
        currentExplanationBlockContent.innerHTML = ''; 

        if (currentExplanationBlockIndex < currentExplanationBlocks.length) {
            const expBlock = currentExplanationBlocks[currentExplanationBlockIndex];
            
            if (expBlock.texto) {
                const p = document.createElement('p');
                p.textContent = expBlock.texto;
                currentExplanationBlockContent.appendChild(p);
            }
            if (expBlock.url_media && expBlock.tipo_media === 'imagem') {
                const img = document.createElement('img');
                img.src = expBlock.url_media;
                img.alt = expBlock.texto || "Conteúdo visual da explicação";
                currentExplanationBlockContent.appendChild(img);
            }
            if (expBlock.url_media && expBlock.tipo_media === 'video') {
                const iframeContainer = document.createElement('div');
                iframeContainer.classList.add('iframe-container');
                const iframe = document.createElement('iframe');
                
                // Formata URL do YouTube para embed
                let videoSrc = expBlock.url_media;
                if (videoSrc.includes('youtube.com/watch?v=')) {
                    const videoId = videoSrc.split('v=')[1].split('&')[0];
                    videoSrc = `https://www.youtube.com/embed/${videoId}`;
                } else if (videoSrc.includes('youtu.be/')) {
                    const videoId = videoSrc.split('youtu.be/')[1].split('?')[0];
                    videoSrc = `https://www.youtube.com/embed/${videoId}`;
                }
                iframe.src = videoSrc;
                
                iframe.frameBorder = "0";
                iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
                iframe.allowFullscreen = true;
                iframeContainer.appendChild(iframe);
                currentExplanationBlockContent.appendChild(iframeContainer);
            }
            nextStepButton.textContent = 'Próximo'; 
        } else {
            nextStepButton.textContent = 'Iniciar Questão'; 
        }
    }

    function displayExplanationStep() {
        hideAllContainers();
        explanationStepArea.classList.remove('hidden');
        userFeedbackMessage.classList.add('hidden'); // Esconde feedback da tela

        renderCurrentExplanationBlock();
        
        nextStepButton.removeEventListener('click', handleNextStep);
        nextStepButton.addEventListener('click', handleNextStep);
    }

    function handleNextStep() {
        // Avanca o progresso na barra
        updateProgressBar(1); 
        
        currentExplanationBlockIndex++;
        if (currentExplanationBlockIndex < currentExplanationBlocks.length) {
            renderCurrentExplanationBlock(); // Próximo bloco de explicação
        } else {
            displayQuestion(); // Acabaram as explicações, mostre a pergunta
        }
    }

    // =======================================================
    // Funções de Quiz (Pergunta, Resposta, Avanço)
    // =======================================================

    function displayQuestion() {
        hideAllContainers();
        questionArea.classList.remove('hidden');
        userFeedbackMessage.classList.add('hidden'); // Esconde feedback da tela

        const question = questions[currentQuestionIndex];
        
        questionCounterElement.textContent = `Questão ${currentQuestionIndex + 1} de ${questions.length}`;
        
        questionImageElement.classList.add('hidden');
        questionImageElement.src = ''; 
        if (question.img_url_pergunta) { 
            questionImageElement.src = question.img_url_pergunta;
            questionImageElement.classList.remove('hidden');
        }

        questionTextElement.textContent = question.enunciado_pergunta;
        postExplanationTextElement.classList.add('hidden'); 
        postExplanationTextElement.textContent = ''; 
        alternativesContainer.innerHTML = ''; 

        question.respostas.forEach(alternative => { 
            const label = document.createElement('label');
            label.className = 'alternative-item'; // Nova classe base
            label.innerHTML = `
                <input type="radio" name="alternative" value="${alternative.id_resposta}" data-correct="${alternative.eh_correto ? '1' : '0'}">
                <span>${alternative.texto_resposta}</span>
            `;
            
            // Adiciona listener para marcar a alternativa como 'selected' visualmente
            label.addEventListener('click', () => {
                // Remove 'selected' de todas as outras
                alternativesContainer.querySelectorAll('.alternative-item').forEach(item => {
                    item.classList.remove('selected');
                });
                // Adiciona 'selected' à clicada
                label.classList.add('selected');
                // Marca o radio button interno
                label.querySelector('input[type="radio"]').checked = true;
            });
            
            alternativesContainer.appendChild(label);
        });

        submitButton.disabled = false;
        submitButton.textContent = 'Confirmar Resposta';
        submitButton.removeEventListener('click', handleSubmitOrNextQuestion); 
        submitButton.addEventListener('click', handleSubmitOrNextQuestion);
    }

    function handleSubmitOrNextQuestion() {
        if (submitButton.textContent === 'Confirmar Resposta') {
            const selectedAlternativeInput = alternativesContainer.querySelector('input[name="alternative"]:checked');

            if (!selectedAlternativeInput) {
                displayFeedbackMessage('Por favor, selecione uma alternativa antes de confirmar.', 'warning', 2000); // Usa displayFeedbackMessage
                return;
            }

            const currentQuestion = questions[currentQuestionIndex]; 
            const isCorrect = selectedAlternativeInput.dataset.correct === '1';
            
            const labelSelected = selectedAlternativeInput.closest('label');
            alternativesContainer.querySelectorAll('input').forEach(input => input.disabled = true); // Desabilita inputs

            if (isCorrect) {
                labelSelected.classList.add('correct-answer');
                userScore++;
                displayFeedbackMessage('Resposta Correta! Bom trabalho!', 'success');
            } else {
                labelSelected.classList.add('wrong-answer');
                
                // Revela a alternativa correta
                const correctAnswerLabel = alternativesContainer.querySelector('input[data-correct="1"]').closest('label');
                if (correctAnswerLabel) { 
                    correctAnswerLabel.classList.add('correct-answer-feedback');
                }

                if (currentQuestion.explicacao_pergunta) {
                    postExplanationTextElement.textContent = `Explicação: ${currentQuestion.explicacao_pergunta}`;
                    postExplanationTextElement.classList.remove('hidden');
                }
                displayFeedbackMessage('Resposta Incorreta. Revise a explicação abaixo.', 'error');
            }

            submitButton.textContent = 'Próxima Questão';
        } else {
            // Avanca o progresso na barra
            updateProgressBar(1); 

            // Após a resposta, avança para a próxima questão
            currentQuestionIndex++;
            resetAlternativeStyles(); // Limpa estilos de feedback
            startQuestionFlow(currentQuestionIndex); // Inicia o fluxo para a próxima questão
        }
    }

    function resetAlternativeStyles() {
        alternativesContainer.querySelectorAll('.alternative-item').forEach(item => {
            item.classList.remove('correct-answer', 'wrong-answer', 'correct-answer-feedback', 'selected');
            item.querySelector('input').disabled = false;
            item.querySelector('input').checked = false; 
        });
        postExplanationTextElement.classList.add('hidden');
        postExplanationTextElement.textContent = '';
        userFeedbackMessage.classList.add('hidden');
    }

    // Função para iniciar o fluxo de uma questão (explicações ou direto para a pergunta)
    function startQuestionFlow(index) {
        if (index >= questions.length) {
            // Se todas as questões foram respondidas, avança o progresso e mostra os resultados
            updateProgressBar(1); 
            showResults();
            return;
        }

        const question = questions[index];
        currentExplanationBlocks = question.explicacoes_pre_questao || [];
        currentExplanationBlockIndex = 0; 
        
        // Se houver explicações pré-questão, a barra avança no handleNextStep
        // Senão, ela avança ao carregar a questão
        if (currentExplanationBlocks.length > 0) {
            displayExplanationStep();
        } else {
            updateProgressBar(1); // Avança o progresso para a tela da questão
            displayQuestion();
        }
    }


    // Função para exibir os resultados finais e salvar o progresso
    async function showResults() {
        hideAllContainers();
        resultsArea.classList.remove('hidden'); 

        const totalQuestions = questions.length;
        const percentage = (userScore / totalQuestions) * 100;

        finalScoreElement.textContent = `${userScore} de ${totalQuestions} (${percentage.toFixed(0)}%)`;

        try {
            if (currentModuleId === null) {
                console.error("Erro: currentModuleId não definido. Não é possível registrar o progresso.");
                displayFeedbackMessage("Erro interno ao registrar progresso: ID do módulo não encontrado.", 'error');
                return;
            }

            // 1. Enviar o progresso e pontos para o backend
            const response = await fetchAuthenticatedData(`/api/content/units/${unitId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    id_modulo: currentModuleId, 
                    pontuacao: userScore, // Envia a pontuação total do quiz
                    concluido: true 
                }),
            });

            if (response) {
                console.log('Unidade concluída e progresso salvo:', response);
                await loadUserProfile(); // Atualiza o perfil do usuário (XP, etc.)
                
                // 2. Chamar a função para exibir o ranking
                await displayRanking();

                const moduleIdToRedirect = currentModuleId; 

                // 3. Configurar o botão da tela de ranking para redirecionar
                returnToModulesFromRankingButton.addEventListener('click', () => { 
                    if (moduleIdToRedirect) {
                        window.location.href = `/html/modulo.html?id=${moduleIdToRedirect}`;
                    } else {
                        window.location.href = '/html/home.html'; 
                    }
                });

            }
        } catch (error) {
            console.error('Erro ao registrar conclusão da unidade:', error);
            displayFeedbackMessage('Não foi possível registrar seu progresso. Tente novamente.', 'error');
        }
    }

    // NOVO: Função para exibir o ranking
    async function displayRanking() {
        hideAllContainers();
        rankingArea.classList.remove('hidden');
        rankingList.innerHTML = ''; 

        try {
            const rankingData = await fetchAuthenticatedData('/api/users/ranking'); 
            
            const top5 = rankingData.slice(0, 5); 

            top5.forEach((user, index) => {
                const rankPosition = index + 1;
                const rankingItem = document.createElement('div');
                rankingItem.className = `ranking-item`; 

                if (rankPosition === 1) rankingItem.classList.add('top-1');
                if (rankPosition === 2) rankingItem.classList.add('top-2');
                if (rankPosition === 3) rankingItem.classList.add('top-3');

                rankingItem.innerHTML = `
                    <img src="/img/ranking/ranking_${rankPosition}.png" alt="Badge Posição ${rankPosition}" class="ranking-badge">
                    <div class="ranking-info">
                        <span class="user-name">${user.nickname}</span> <span class="user-points">⭐ ${user.pontos} XP</span>
                    </div>
                    <span class="ranking-position">${rankPosition}º</span>
                `;
                rankingList.appendChild(rankingItem);
            });

        } catch (error) {
            console.error('Erro ao carregar o ranking:', error);
            rankingList.innerHTML = '<p class="text-red-500">Não foi possível carregar o ranking no momento.</p>';
        }
    }


    // --- Event Listeners para o menu e perfil ---
    btnPerfil.addEventListener("click", () => {
        colunaEsquerda.classList.toggle("visivel");
    });
    
    if (btnPerfilMobile) { 
        btnPerfilMobile.addEventListener("click", () => {
            colunaEsquerda.classList.toggle("visivel"); 
            mobileMenu.classList.remove("visivel"); 
        }); 
    }

    menuToggle.addEventListener("click", () => {
        mobileMenu.classList.toggle("visivel");
        colunaEsquerda.classList.remove("visivel"); 
    });

    btnLogout.addEventListener('click', logout);
    
    if (btnLogoutMobile) { 
        btnLogoutMobile.addEventListener('click', logout); 
    }

    // --- Inicialização da página ---
    loadUserProfile(); 

    const urlParams = new URLSearchParams(window.location.search);
    unitId = urlParams.get('unitId');
    currentModuleId = urlParams.get('moduleId');

    if (!unitId || !currentModuleId) {
        unitTitleElement.textContent = 'Unidade não especificada.';
        displayFeedbackMessage('A unidade ou o módulo não foram especificados na URL.', 'error');
        hideAllContainers();
        return;
    }

    try {
        const unitInfo = await fetchAuthenticatedData(`/api/content/unidade/${unitId}`);
        if (unitInfo) {
            unitTitleElement.textContent = `Quiz: ${unitInfo.nome_unidade}`;
            
        }

        const fetchedQuestions = await fetchAuthenticatedData(`/api/content/unidade/${unitId}/questions`);
        if (fetchedQuestions && fetchedQuestions.length > 0) {
            questions = fetchedQuestions;
            currentQuestionIndex = 0; 
            
            // NOVO: Calcula o total de passos antes de iniciar o quiz
            calculateTotalSteps(questions);

            startQuestionFlow(currentQuestionIndex); // Inicia o fluxo
        } else {
            unitTitleElement.textContent = `Nenhuma questão encontrada para esta unidade.`;
            displayFeedbackMessage('Nenhuma questão encontrada para esta unidade.', 'warning');
            hideAllContainers();
        }
    } catch (error) {
        console.error('Erro ao carregar quiz (info da unidade ou questões):', error);
        unitTitleElement.textContent = 'Erro ao carregar o quiz.';
        hideAllContainers();
        // displayFeedbackMessage já foi chamada dentro do fetchAuthenticatedData
    }
});