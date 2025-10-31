// public/js/quiz.js

document.addEventListener('DOMContentLoaded', async () => {
    // --- Funções de Perfil e Autenticação ---
    const btnPerfil = document.getElementById("btn-perfil");
    const btnPerfilMobile = document.getElementById("btn-perfil-mobile");
    const colunaEsquerda = document.getElementById("coluna-esquerda");
    const menuToggle = document.getElementById("menu-toggle");
    const mobileMenu = document.getElementById("mobile-menu");
    const userNameSpan = document.getElementById("user-name");
    const userAssiduidadeSpan = document.getElementById("user-assiduidade");
    const userPontosSpan = document.getElementById("user-pontos");
    const btnLogout = document.getElementById('btn-logout');
    const btnLogoutMobile = document.getElementById('btn-logout-mobile');
    const postExplanationTextElement = document.getElementById('post-explanation-text'); 

    async function fetchAuthenticatedData(url, options = {}) {
        const token = localStorage.getItem('jwtToken'); 
        if (!token) {
            alert('Sessão expirada ou não autorizado. Faça login novamente.');
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('userId'); 
            localStorage.removeItem('userName'); 
            window.location.href = '/html/login.html';
            return null;
        }

        const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
        const response = await fetch(url, { ...options, headers });

        if (response.status === 401 || response.status === 403) {
            alert('Sessão expirada ou não autorizada. Faça login novamente.');
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('userId'); 
            localStorage.removeItem('userName');
            window.location.href = '/html/login.html';
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
            throw new Error(errorMessage);
        }

        return response.json();
    }

    async function loadUserProfile() {
        try {
            const user = await fetchAuthenticatedData('/api/users/profile');
            if (user) {
                userNameSpan.textContent = user.nome;
                userAssiduidadeSpan.textContent = `${user.assiduidade_dias} dias`;
                userPontosSpan.textContent = user.pontos;
                localStorage.setItem('userId', user.id_usuario);
                localStorage.setItem('userName', user.nome);
            }
        } catch (error) {
            console.error('Erro ao carregar perfil do usuário:', error);
        }
    }

    function logout() {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('userId'); 
        localStorage.removeItem('userName');
        alert('Você foi desconectado.');
        window.location.href = '/html/login.html';
    }

    // ----------------------------------------------------
    // Lógica Específica da Página de Quiz
    // ----------------------------------------------------

    let questions = []; 
    let currentQuestionIndex = 0; 
    let userScore = 0; 
    let unitId = null; 
    let currentModuleId = null; 
    let currentExplanationBlocks = []; 
    let currentExplanationBlockIndex = 0; 

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
    const returnToModulesButton = document.getElementById('return-to-modules-button');

    // Elementos da Nova Área de Explicação Passo a Passo
    const explanationStepArea = document.getElementById('explanation-step-area'); 
    const currentExplanationBlockContent = document.getElementById('current-explanation-block-content');
    const nextStepButton = document.getElementById('next-step-button'); 

    // NOVO: Elementos da área de Ranking
    const rankingArea = document.getElementById('ranking-area');
    const rankingList = document.getElementById('ranking-list');
    const returnToModulesFromRankingButton = document.getElementById('return-to-modules-from-ranking-button');


    // Inicialização da página
    loadUserProfile(); 

    const urlParams = new URLSearchParams(window.location.search);
    unitId = urlParams.get('unitId');

    if (!unitId) {
        unitTitleElement.textContent = 'Unidade não especificada.';
        hideAllContainers();
        return;
    }

    try {
        const unitInfo = await fetchAuthenticatedData(`/api/content/unidade/${unitId}`);
        if (unitInfo) {
            unitTitleElement.textContent = `Quiz: ${unitInfo.nome_unidade}`;
            currentModuleId = unitInfo.id_modulo; 
        }

        const fetchedQuestions = await fetchAuthenticatedData(`/api/content/unidade/${unitId}/questions`);
        if (fetchedQuestions && fetchedQuestions.length > 0) {
            questions = fetchedQuestions;
            currentQuestionIndex = 0; 
            startQuestionFlow(currentQuestionIndex); // Inicia o fluxo
        } else {
            unitTitleElement.textContent = `Nenhuma questão encontrada para esta unidade.`;
            hideAllContainers();
        }
    } catch (error) {
        console.error('Erro ao carregar quiz (info da unidade ou questões):', error);
        unitTitleElement.textContent = 'Erro ao carregar o quiz.';
        hideAllContainers();
    }

    // Função para ocultar todos os containers principais (explicação, questão, resultados, ranking)
    function hideAllContainers() {
        explanationStepArea.classList.add('hidden');
        questionArea.classList.add('hidden');
        resultsArea.classList.add('hidden');
        rankingArea.classList.add('hidden'); // Oculta a área de ranking
    }

    // Função para iniciar o fluxo de uma questão (explicações ou direto para a pergunta)
    function startQuestionFlow(index) {
        if (index >= questions.length) {
            showResults();
            return;
        }

        const question = questions[index];
        currentExplanationBlocks = question.explicacoes_pre_questao || [];
        currentExplanationBlockIndex = 0; 

        if (currentExplanationBlocks.length > 0) {
            displayExplanationStep();
        } else {
            displayQuestion();
        }
    }

    // Função para exibir a tela de explicações passo a passo
    function displayExplanationStep() {
        hideAllContainers();
        explanationStepArea.classList.remove('hidden');

        renderCurrentExplanationBlock();
        
        nextStepButton.removeEventListener('click', handleNextStep);
        nextStepButton.addEventListener('click', handleNextStep);
    }

    // Renderiza o bloco de explicação atual no container
    function renderCurrentExplanationBlock() {
        currentExplanationBlockContent.innerHTML = ''; 

        if (currentExplanationBlockIndex < currentExplanationBlocks.length) {
            const expBlock = currentExplanationBlocks[currentExplanationBlockIndex];
            
            if (expBlock.texto) {
                const p = document.createElement('p');
                p.textContent = expBlock.texto;
                p.classList.add('mb-2', 'text-gray-800'); 
                currentExplanationBlockContent.appendChild(p);
            }
            if (expBlock.url_media && expBlock.tipo_media === 'imagem') {
                const img = document.createElement('img');
                img.src = expBlock.url_media;
                img.alt = expBlock.texto || "Conteúdo visual da explicação";
                img.classList.add('w-full', 'max-w-md', 'mx-auto', 'my-4', 'rounded-lg', 'shadow-sm'); 
                currentExplanationBlockContent.appendChild(img);
            }
            if (expBlock.url_media && expBlock.tipo_media === 'video') {
                const iframeContainer = document.createElement('div');
                iframeContainer.classList.add('iframe-container', 'max-w-full', 'mx-auto', 'my-4');
                const iframe = document.createElement('iframe');
                
                // --- CORREÇÃO: Formata URL do YouTube para embed ---
                let videoSrc = expBlock.url_media;
                if (videoSrc.includes('youtube.com/watch?v=')) {
                    const videoId = videoSrc.split('v=')[1].split('&')[0];
                    videoSrc = `https://www.youtube.com/embed/${videoId}`;
                } else if (videoSrc.includes('youtu.be/')) {
                    const videoId = videoSrc.split('youtu.be/')[1].split('?')[0];
                    videoSrc = `https://www.youtube.com/embed/${videoId}`;
                }
                // Se a URL já estiver no formato embed, ela será usada diretamente
                // Se não for YouTube, será usada como está (pode não funcionar para outros players sem ajuste)
                iframe.src = videoSrc;
                // --- Fim da CORREÇÃO ---

                iframe.classList.add('w-full', 'h-full', 'rounded-lg');
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

    // Handler para o botão "Próximo" na tela de explicação
    function handleNextStep() {
        currentExplanationBlockIndex++;
        if (currentExplanationBlockIndex < currentExplanationBlocks.length) {
            renderCurrentExplanationBlock();
        } else {
            displayQuestion();
        }
    }

    // Função para exibir a pergunta e alternativas
    function displayQuestion() {
        hideAllContainers();
        questionArea.classList.remove('hidden');

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
            label.className = 'alternative-item block p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors';
            label.innerHTML = `
                <input type="radio" name="alternative" value="${alternative.id_alternativa}" class="mr-3 leading-tight" data-correct="${alternative.eh_correto ? '1' : '0'}">
                <span class="text-gray-900">${alternative.texto_resposta}</span>
            `;
            alternativesContainer.appendChild(label);
        });

        submitButton.disabled = false;
        submitButton.textContent = 'Confirmar Resposta';
        submitButton.removeEventListener('click', handleSubmitOrNextQuestion); 
        submitButton.addEventListener('click', handleSubmitOrNextQuestion);
    }

    // Handler para o botão "Confirmar Resposta" ou "Próxima Questão"
    function handleSubmitOrNextQuestion() {
        if (submitButton.textContent === 'Confirmar Resposta') {
            const selectedAlternative = alternativesContainer.querySelector('input[name="alternative"]:checked');
            const currentQuestion = questions[currentQuestionIndex]; 

            if (!selectedAlternative) {
                alert('Por favor, selecione uma alternativa!');
                return;
            }

            const isCorrect = selectedAlternative.dataset.correct === '1';
            
            const labelSelected = selectedAlternative.closest('label');
            if (isCorrect) {
                labelSelected.classList.add('correct-answer');
                userScore++;
            } else {
                labelSelected.classList.add('wrong-answer');
                const correctAnswerLabel = alternativesContainer.querySelector('input[data-correct="1"]').closest('label');
                if (correctAnswerLabel) { 
                    correctAnswerLabel.classList.add('correct-answer-feedback');
                }

                if (currentQuestion.explicacao_pergunta) {
                    postExplanationTextElement.textContent = `Explicação: ${currentQuestion.explicacao_pergunta}`;
                    postExplanationTextElement.classList.remove('hidden');
                }
            }

            alternativesContainer.querySelectorAll('input').forEach(input => input.disabled = true);
            
            submitButton.textContent = 'Próxima Questão';
        } else {
            currentQuestionIndex++;
            resetAlternativeStyles(); 
            startQuestionFlow(currentQuestionIndex); 
        }
    }

    // Função para resetar os estilos das alternativas e esconder explicações pós-resposta
    function resetAlternativeStyles() {
        alternativesContainer.querySelectorAll('.alternative-item').forEach(label => {
            label.classList.remove('correct-answer', 'wrong-answer', 'correct-answer-feedback');
            label.querySelector('input').disabled = false;
            label.querySelector('input').checked = false; 
        });
        postExplanationTextElement.classList.add('hidden');
        postExplanationTextElement.textContent = '';
    }

    // Função para exibir os resultados finais e salvar o progresso
    async function showResults() {
        hideAllContainers();
        resultsArea.classList.remove('hidden'); // Exibe a área de resultados temporariamente

        const totalQuestions = questions.length;
        const percentage = (userScore / totalQuestions) * 100;

        finalScoreElement.textContent = `${userScore} de ${totalQuestions} (${percentage.toFixed(0)}%)`;

        try {
            if (currentModuleId === null) {
                console.error("Erro: currentModuleId não definido. Não é possível registrar o progresso.");
                alert("Erro interno ao registrar progresso: ID do módulo não encontrado.");
                return;
            }

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
                
                // Agora, chame a função para exibir o ranking
                await displayRanking();

                // Remove o event listener antigo e adiciona o novo para o botão do ranking
                returnToModulesButton.removeEventListener('click', redirectToHome); 
                returnToModulesFromRankingButton.addEventListener('click', () => { // Botão da tela de ranking
                    if (currentModuleId) {
                        window.location.href = `/html/modulo.html?id=${currentModuleId}`;
                    } else {
                        window.location.href = '/html/home.html'; 
                    }
                });

            }
        } catch (error) {
            console.error('Erro ao registrar conclusão da unidade:', error);
            alert('Não foi possível registrar seu progresso. Tente novamente.');
        }
    }

    // NOVO: Função para exibir o ranking
    async function displayRanking() {
        hideAllContainers();
        rankingArea.classList.remove('hidden');
        rankingList.innerHTML = ''; // Limpa a lista antes de preencher

        try {
            const rankingData = await fetchAuthenticatedData('/api/ranking');
            
            // Pega apenas os 5 primeiros
            const top5 = rankingData.slice(0, 5); 

            top5.forEach((user, index) => {
                const rankPosition = index + 1;
                const rankingItem = document.createElement('div');
                rankingItem.className = `ranking-item`; // Tailwind classes já no CSS global

                // Adiciona classes específicas para top 3
                if (rankPosition === 1) rankingItem.classList.add('top-1');
                if (rankPosition === 2) rankingItem.classList.add('top-2');
                if (rankPosition === 3) rankingItem.classList.add('top-3');

                rankingItem.innerHTML = `
                    <img src="/img/ranking/ranking_${rankPosition}.png" alt="Badge Posição ${rankPosition}" class="ranking-badge">
                    <div class="ranking-info">
                        <span class="user-name">${user.nome}</span>
                        <span class="user-points">⭐ ${user.pontos} XP</span>
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


    function redirectToHome() {
        window.location.href = '/html/home.html';
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
});