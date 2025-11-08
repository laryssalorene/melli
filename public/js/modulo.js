// Função debounce para otimizar eventos de redimensionamento
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    // Obtenção de referências aos elementos do DOM
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
    const moduleTitleElement = document.getElementById('module-title');
    const moduleDescriptionElement = document.getElementById('module-description');
    const unitsContainer = document.getElementById('units-container');
    const petMascote = document.getElementById('pet-mascote'); // Referência ao mascote

    console.log("DOM Content Loaded. Iniciando script.");
    console.log("Elemento petMascote:", petMascote);

    // Mapeamento de ícones para as unidades (você pode expandir isso)
    const unitIcons = {
        'Introdução': 'fas fa-book-reader',
        'Pesquisa': 'fas fa-search',
        'Criação': 'fas fa-pencil-alt',
        'Vendas': 'fas fa-dollar-sign',
        'Atendimento': 'fas fa-headset',
        'Logística': 'fas fa-shipping-fast',
        'Análise': 'fas fa-chart-line',
        'Estratégias': 'fas fa-lightbulb',
        'Básico': 'fas fa-graduation-cap',
        'Avançado': 'fas fa-flask',
        'default': 'fas fa-star' // Ícone padrão
    };

    // Função auxiliar para fazer requisições autenticadas
    async function fetchAuthenticatedData(url, options = {}) {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            alert('Sessão expirada ou não autorizado. Faça login novamente.');
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('userId');
            localStorage.removeItem('userNickname');
            window.location.href = '/html/login.html';
            return null;
        }

        const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
        const response = await fetch(url, { ...options, headers });

        if (response.status === 401 || response.status === 403) {
            alert('Sessão expirada ou não autorizada. Faça login novamente.');
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('userId');
            localStorage.removeItem('userNickname');
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
                userNicknameSpan.textContent = user.nickname;
                userAssiduidadeSpan.textContent = `${user.assiduidade_dias || 0} dias`;
                userPontosSpan.textContent = user.pontos || 0;
                localStorage.setItem('userId', user.id_usuario);
                localStorage.setItem('userNickname', user.nickname);
            }
        } catch (error) {
            console.error('Erro ao carregar perfil do usuário:', error);
        }
    }

    function logout() {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userNickname');
        alert('Você foi desconectado.');
        window.location.href = '/html/login.html';
    }

    // ----------------------------------------------------
    // Lógica Específica da Página de Módulo (Unidades em Círculos e Mascote)
    // ----------------------------------------------------

    let currentModuleId = null;
    let userProgress = {}; // Guardará o progresso do usuário para as unidades deste módulo
    let allUnits = []; // Guardará todas as unidades para o mascote
    let currentPetPositionIndex = -1; // Índice da unidade onde o mascote está atualmente

    // Funções para manipulação de animação do mascote
    const petAnimations = {
        idle: 'pet-idle',
        walkNorth: 'pet-walking-north',
        walkSouth: 'pet-walking-south',
        walkEast: 'pet-walking-east',
        walkWest: 'pet-walking-west'
    };

    function setPetAnimation(animationClass) {
        if (petMascote) {
            petMascote.className = ''; // Remove todas as classes de animação
            petMascote.classList.add(animationClass);
            // console.log(`Animação do mascote setada para: ${animationClass}`); // Descomentar para depuração
        }
    }

    // NOVO: Função para determinar a direção da caminhada
    function determineWalkDirection(fromIndex, toIndex, unitsArray) {
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
            return petAnimations.idle;
        }

        const fromUnitElement = document.getElementById(`circle-${unitsArray[fromIndex].id_unidade}`);
        const toUnitElement = document.getElementById(`circle-${unitsArray[toIndex].id_unidade}`);

        if (!fromUnitElement || !toUnitElement) {
            return petAnimations.idle;
        }

        const unitsContainerRect = unitsContainer.getBoundingClientRect();
        const fromRect = fromUnitElement.getBoundingClientRect();
        const toRect = toUnitElement.getBoundingClientRect();

        // A direção será principalmente vertical, já que o mascote caminha na linha
        const fromY = (fromRect.top + fromRect.height / 2) - unitsContainerRect.top;
        const toY = (toRect.top + toRect.height / 2) - unitsContainerRect.top;

        // Adicione um pequeno limiar para evitar detecção de movimento em caso de pequenas variações de float
        if (toY < fromY - 5) { // Movimento para cima
            return petAnimations.walkNorth;
        } else if (toY > fromY + 5) { // Movimento para baixo
            return petAnimations.walkSouth;
        }
        // Se a mudança vertical não for significativa, considere idle ou ajuste para horizontal se o design permitir
        return petAnimations.idle; 
    }

    async function positionMascot(unitIndex, unitsArray, animate = false) {
        if (!petMascote || unitsArray.length === 0 || unitIndex < 0 || unitIndex >= unitsArray.length) {
            if (petMascote) petMascote.style.display = 'none';
            return;
        }

        const targetUnit = unitsArray[unitIndex];
        const targetCircleId = `circle-${targetUnit.id_unidade}`;
        const targetUnitElement = unitsContainer.querySelector(`#${targetCircleId}`);
        
        if (!targetUnitElement) {
            if (petMascote) petMascote.style.display = 'none';
            return;
        }

        // Antes de ler offsetWidth/Rect, garanta que o mascote esteja visível e sem transição
        petMascote.style.transition = 'none'; 
        petMascote.style.display = 'block'; 

        const unitsContainerRect = unitsContainer.getBoundingClientRect();
        const targetRect = targetUnitElement.getBoundingClientRect();
        const petSize = petMascote.offsetWidth; 

        // --- DEPURANDO VALORES ---
        console.log("--- DEBUG MASCOTE POSICIONAMENTO ---");
        console.log("  unitsContainerRect (width, height):", unitsContainerRect.width, unitsContainerRect.height);
        console.log("  targetRect (top, height):", targetRect.top, targetRect.height);
        console.log("  petMascote.offsetWidth (petSize):", petSize);
        console.log("-----------------------------------");
        // --- FIM DEPURANDO VALORES ---

        // Calcula a posição Y para o centro do círculo (relativo ao unitsContainer)
        const targetY = (targetRect.top + targetRect.height / 2) - unitsContainerRect.top - (petSize / 2);

        // --- CORREÇÃO TEMPORÁRIA AQUI: Removemos o cálculo do targetX no JS ---
        // Agora, o CSS '#pet-mascote { left: 50%; transform: translateX(-50%); }' cuidará do X.
        // O JavaScript só precisa aplicar a translação vertical.
        // const targetX = (unitsContainerRect.width / 2) - (petSize / 2); // Linha COMENTADA
        // --- FIM DA CORREÇÃO TEMPORÁRIA ---

        if (animate) {
            petMascote.style.transition = `transform 1s ease-in-out`;
        } else {
            petMascote.style.transition = 'none';
        }
        
        // Apenas aplica a translação vertical, deixando o X para o CSS
        petMascote.style.transform = `translateY(${targetY}px)`; // <-- ALTERADO AQUI
        setPetAnimation(petAnimations.idle); 
        currentPetPositionIndex = unitIndex;
        // console.log(`Mascote posicionado em Y:${targetY}. currentPetPositionIndex: ${currentPetPositionIndex}. TargetID: ${targetCircleId}`); // Removi o X do log pois o JS não controla ele agora.
        console.log(`Mascote posicionado em Y:${targetY}. currentPetPositionIndex: ${currentPetPositionIndex}. TargetID: ${targetCircleId}`);
    }

    async function moveMascot(targetUnitIndex, unitsArray) {
        if (currentPetPositionIndex === targetUnitIndex) {
            setPetAnimation(petAnimations.idle);
            return;
        }
        if (!petMascote || unitsArray.length === 0 || targetUnitIndex < 0 || targetUnitIndex >= unitsArray.length) {
            return;
        }

        petMascote.style.display = 'block'; 

        // Define a animação de caminhada ANTES de mover
        const walkAnimationClass = determineWalkDirection(currentPetPositionIndex, targetUnitIndex, unitsArray);
        setPetAnimation(walkAnimationClass);

        // Chame positionMascot com animate=true para aplicar a transição e a posição final
        await positionMascot(targetUnitIndex, unitsArray, true);
        
        // Aguarda a transição terminar antes de setar idle
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1000ms = duração da transição CSS

        setPetAnimation(petAnimations.idle);
    }

    loadUserProfile();

    const urlParams = new URLSearchParams(window.location.search);
    currentModuleId = urlParams.get('id');

    console.log("Módulo ID:", currentModuleId);

    if (currentModuleId) {
        try {
            const moduleData = await fetchAuthenticatedData(`/api/content/modulo/${currentModuleId}`);
            if (moduleData) {
                moduleTitleElement.textContent = moduleData.nome_modulo;
                moduleDescriptionElement.textContent = moduleData.descricao;

                const progressoResponse = await fetchAuthenticatedData(`/api/content/progress/${currentModuleId}/allunits`);
                if (progressoResponse && progressoResponse.progresso) {
                    userProgress = progressoResponse.progresso.reduce((acc, item) => {
                        acc[item.id_unidade] = item;
                        return acc;
                    }, {});
                    console.log("Progresso do usuário carregado:", userProgress);
                } else {
                    console.log("Nenhum progresso encontrado para este módulo ou usuário.");
                }

                allUnits = moduleData.unidades.sort((a, b) => a.ordem - b.ordem); 
                console.log("Unidades carregadas:", allUnits);

                if (petMascote && unitsContainer && !unitsContainer.contains(petMascote)) {
                    unitsContainer.appendChild(petMascote);
                }
                if (petMascote) {
                    petMascote.style.display = 'none'; 
                    console.log("Mascote adicionado ao unitsContainer (temporariamente escondido) antes de renderizar unidades.");
                }

                await renderUnits(allUnits); 

                let lastCompletedUnitIndex = -1;
                let firstUnlockedUnitIndex = -1;

                for (let i = 0; i < allUnits.length; i++) {
                    const unit = allUnits[i];
                    const progress = userProgress[unit.id_unidade];
                    if (progress && progress.completo) {
                        lastCompletedUnitIndex = i;
                    } else if (firstUnlockedUnitIndex === -1 && (i === 0 || userProgress[allUnits[i-1].id_unidade]?.completo)) {
                        firstUnlockedUnitIndex = i;
                    }
                }

                console.log("lastCompletedUnitIndex:", lastCompletedUnitIndex);
                console.log("firstUnlockedUnitIndex:", firstUnlockedUnitIndex);

                let initialMascotPositionIndex = -1;

                if (firstUnlockedUnitIndex !== -1) {
                    initialMascotPositionIndex = firstUnlockedUnitIndex;
                } else if (lastCompletedUnitIndex !== -1 && lastCompletedUnitIndex === allUnits.length - 1) {
                    initialMascotPositionIndex = lastCompletedUnitIndex; 
                } else if (allUnits.length > 0) { 
                    initialMascotPositionIndex = 0;
                }

                console.log("initialMascotPositionIndex calculado:", initialMascotPositionIndex);

                await new Promise(resolve => setTimeout(resolve, 100)); 

                if (initialMascotPositionIndex !== -1) {
                    console.log(`Posicionando mascote no índice ${initialMascotPositionIndex}`);
                    positionMascot(initialMascotPositionIndex, allUnits, false); 
                } else {
                    console.log("Não há posição válida para o mascote. Escondendo.");
                    if (petMascote) petMascote.style.display = 'none';
                }

            } else {
                moduleTitleElement.textContent = 'Módulo não encontrado.';
                unitsContainer.innerHTML = '<p class="loading-message">Módulo não encontrado.</p>';
                if (petMascote) petMascote.style.display = 'none';
                console.log("Módulo não encontrado. Escondendo mascote.");
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes do módulo:', error);
            moduleTitleElement.textContent = 'Erro ao carregar módulo.';
            unitsContainer.innerHTML = '<p class="loading-message">Erro ao carregar módulo.</p>';
            if (petMascote) petMascote.style.display = 'none';
            console.log("Erro no carregamento do módulo. Escondendo mascote.");
        }
    } else {
        moduleTitleElement.textContent = 'Módulo não especificado.';
        unitsContainer.innerHTML = '<p class="loading-message">Módulo não especificado na URL.</p>';
        if (petMascote) petMascote.style.display = 'none';
        console.log("Módulo não especificado. Escondendo mascote.");
    }

    function getUnitIconClass(unitName) {
        const lowerCaseName = unitName.toLowerCase();
        for (const keyword in unitIcons) {
            if (lowerCaseName.includes(keyword.toLowerCase())) {
                return unitIcons[keyword];
            }
        }
        return unitIcons['default'];
    }

    async function renderUnits(units) {
        console.log("Iniciando renderização das unidades.");
        unitsContainer.innerHTML = ''; 

        if (!units || units.length === 0) {
            unitsContainer.innerHTML = '<p class="loading-message">Nenhuma unidade encontrada para este módulo.</p>';
            console.log("Nenhuma unidade para renderizar.");
            if (petMascote) petMascote.style.display = 'none';
            return;
        }

        const mainPathLine = document.createElement('div');
        mainPathLine.classList.add('unit-path-line-main');
        unitsContainer.appendChild(mainPathLine);
        console.log("Linha principal da trilha adicionada.");

        if (petMascote && unitsContainer && !unitsContainer.contains(petMascote)) {
               unitsContainer.appendChild(petMascote);
        }
        if (petMascote) {
            petMascote.style.display = 'none'; 
        }

        let previousUnitCompleted = true;
        let firstUnlockedRendered = false;

        units.forEach((unit, index) => {
            const unitItem = document.createElement('div');
            unitItem.classList.add('unit-item');
            unitItem.id = `unit-item-${unit.id_unidade}`; 
            unitItem.dataset.unitId = unit.id_unidade; 

            const unitCircle = document.createElement('a');
            unitCircle.href = `/html/quiz.html?moduleId=${currentModuleId}&unitId=${unit.id_unidade}`;
            unitCircle.classList.add('unit-circle');
            unitCircle.id = `circle-${unit.id_unidade}`; 

            const progressForUnit = userProgress[unit.id_unidade];
            let currentUnitStatus = 'bloqueada';

            if (progressForUnit && progressForUnit.completo) {
                currentUnitStatus = 'completed';
            } else if (previousUnitCompleted) {
                currentUnitStatus = 'desbloqueada';
            }

            unitCircle.classList.add(currentUnitStatus);

            if (currentUnitStatus === 'desbloqueada' && !firstUnlockedRendered) {
                unitCircle.classList.add('primeira');
                unitCircle.classList.add('ativa');
                firstUnlockedRendered = true;
            }

            previousUnitCompleted = (currentUnitStatus === 'completed');

            const unitIconElement = document.createElement('i');
            unitIconElement.classList.add(...getUnitIconClass(unit.nome_unidade).split(' '));
            unitCircle.appendChild(unitIconElement);

            unitCircle.title = unit.nome_unidade; 

            const unitInfo = document.createElement('div');
            unitInfo.classList.add('unit-info');
            unitInfo.classList.add(currentUnitStatus); 
            unitInfo.innerHTML = `
                <h3>${unit.nome_unidade || 'Nome da Unidade'}</h3>
                <p class="status-text">
                    ${currentUnitStatus === 'completed' ? '<i class="fas fa-check-circle status-icon"></i> Concluída' : ''}
                    ${currentUnitStatus === 'desbloqueada' && !unitCircle.classList.contains('ativa') ? '<i class="fas fa-unlock-alt status-icon"></i> Desbloqueada' : ''}
                    ${currentUnitStatus === 'desbloqueada' && unitCircle.classList.contains('ativa') ? '<i class="fas fa-play-circle status-icon"></i> Iniciar' : ''}
                    ${currentUnitStatus === 'bloqueada' ? '<i class="fas fa-lock status-icon"></i> Bloqueada' : ''}
                </p>
            `;

            unitItem.appendChild(unitInfo);
            unitItem.appendChild(unitCircle);

            unitsContainer.appendChild(unitItem);

            if (currentUnitStatus === 'bloqueada') {
                unitCircle.addEventListener('click', (e) => {
                    e.preventDefault();
                    alert('Esta unidade está bloqueada! Conclua a(s) unidade(s) anterior(es) para desbloqueá-la.');
                });
                unitInfo.addEventListener('click', (e) => { 
                    e.preventDefault();
                    alert('Esta unidade está bloqueada! Conclua a(s) unidade(s) anterior(es) para desbloqueá-la.');
                });
            }
        });

        console.log("Todas as unidades renderizadas.");
        unitsContainer.addEventListener('click', async (event) => {
            const targetCircle = event.target.closest('.unit-circle');
            if (targetCircle && !targetCircle.classList.contains('bloqueada')) {
                const unitItem = targetCircle.closest('.unit-item');
                if (unitItem) {
                    const clickedUnitId = parseInt(unitItem.dataset.unitId);
                    const clickedUnitIndex = allUnits.findIndex(unit => unit.id_unidade === clickedUnitId);

                    if (clickedUnitIndex !== -1 && clickedUnitIndex !== currentPetPositionIndex) {
                        console.log(`Clicou na unidade ${clickedUnitId}. Movendo mascote de ${currentPetPositionIndex} para ${clickedUnitIndex}`);
                        await moveMascot(clickedUnitIndex, allUnits);
                    } else {
                        console.log(`Mascote já está na posição ${clickedUnitIndex} ou índice inválido.`);
                    }
                }
            }
        });
    }

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

    const debouncedResizeHandler = debounce(() => {
        if (currentPetPositionIndex !== -1 && allUnits.length > 0) {
            console.log("Redimensionamento detectado. Reposicionando mascote.");
            positionMascot(currentPetPositionIndex, allUnits, false); 
        }
    }, 250); 

    window.addEventListener('resize', debouncedResizeHandler);

    window.addEventListener('load', () => {
        if (currentPetPositionIndex !== -1 && allUnits.length > 0) {
            console.log("Evento 'load' disparado. Reposicionando mascote.");
            positionMascot(currentPetPositionIndex, allUnits, false);
        }
    });

});