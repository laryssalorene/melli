// public/js/modulo.js

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
    // Lógica Específica da Página de Módulo (Unidades em Círculos)
    // ----------------------------------------------------

    let currentModuleId = null;
    let userProgress = {}; // Guardará o progresso do usuário para as unidades deste módulo

    loadUserProfile();

    const urlParams = new URLSearchParams(window.location.search);
    currentModuleId = urlParams.get('id');

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

                renderUnits(moduleData.unidades);
            } else {
                moduleTitleElement.textContent = 'Módulo não encontrado.';
                unitsContainer.innerHTML = '<p class="loading-message">Módulo não encontrado.</p>';
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes do módulo:', error);
            moduleTitleElement.textContent = 'Erro ao carregar módulo.';
            unitsContainer.innerHTML = '<p class="loading-message">Erro ao carregar módulo.</p>';
        }
    } else {
        moduleTitleElement.textContent = 'Módulo não especificado.';
        unitsContainer.innerHTML = '<p class="loading-message">Módulo não especificado na URL.</p>';
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

    // Função para renderizar as unidades com o novo design
    function renderUnits(units) {
        unitsContainer.innerHTML = ''; // Limpa o conteúdo existente

        if (!units || units.length === 0) {
            unitsContainer.innerHTML = '<p class="loading-message">Nenhuma unidade encontrada para este módulo.</p>';
            return;
        }

        // Adiciona a linha principal de fundo (sempre presente)
        const mainPathLine = document.createElement('div');
        mainPathLine.classList.add('unit-path-line-main');
        unitsContainer.appendChild(mainPathLine);

        units.sort((a, b) => a.ordem - b.ordem);

        let previousUnitCompleted = true;
        let firstUnlockedRendered = false;

        units.forEach((unit, index) => {
            const unitItem = document.createElement('div');
            unitItem.classList.add('unit-item');

            const unitCircle = document.createElement('a');
            unitCircle.href = `/html/quiz.html?moduleId=${currentModuleId}&unitId=${unit.id_unidade}`;
            unitCircle.classList.add('unit-circle');

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

            unitCircle.title = unit.nome_unidade; // Tooltip para o círculo

            // Cria o bloco de informações lateral
            const unitInfo = document.createElement('div');
            unitInfo.classList.add('unit-info');
            unitInfo.classList.add(currentUnitStatus); // Adiciona classe de status para estilo
            unitInfo.innerHTML = `
                <h3>${unit.nome_unidade || 'Nome da Unidade'}</h3>
                <p class="status-text">
                    ${currentUnitStatus === 'completed' ? '<i class="fas fa-check-circle status-icon"></i> Concluída' : ''}
                    ${currentUnitStatus === 'desbloqueada' && !unitCircle.classList.contains('ativa') ? '<i class="fas fa-unlock-alt status-icon"></i> Desbloqueada' : ''}
                    ${currentUnitStatus === 'desbloqueada' && unitCircle.classList.contains('ativa') ? '<i class="fas fa-play-circle status-icon"></i> Iniciar' : ''}
                    ${currentUnitStatus === 'bloqueada' ? '<i class="fas fa-lock status-icon"></i> Bloqueada' : ''}
                </p>
            `;

            // Adiciona círculo e info ao unitItem. A ordem visual será controlada pelo CSS flexbox.
            unitItem.appendChild(unitInfo); // Adiciona info primeiro, CSS ajusta a ordem para pares/ímpares
            unitItem.appendChild(unitCircle);

            unitsContainer.appendChild(unitItem);

            if (currentUnitStatus === 'bloqueada') {
                unitCircle.addEventListener('click', (e) => {
                    e.preventDefault();
                    alert('Esta unidade está bloqueada! Conclua a(s) unidade(s) anterior(es) para desbloqueá-la.');
                });
                unitInfo.addEventListener('click', (e) => { // Também desabilita clique no info box
                    e.preventDefault();
                    alert('Esta unidade está bloqueada! Conclua a(s) unidade(s) anterior(es) para desbloqueá-la.');
                });
            }
        });
    }

    // Event Listeners para o menu e perfil
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