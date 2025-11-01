// public/js/modulo.js

document.addEventListener('DOMContentLoaded', async () => {
    // Obtenção de referências aos elementos do DOM
    const btnPerfil = document.getElementById("btn-perfil");
    const btnPerfilMobile = document.getElementById("btn-perfil-mobile");
    const colunaEsquerda = document.getElementById("coluna-esquerda");
    const menuToggle = document.getElementById("menu-toggle");
    const mobileMenu = document.getElementById("mobile-menu");
    // MUDADO AQUI: userNicknameSpan em vez de userNameSpan
    const userNicknameSpan = document.getElementById("user-nickname");
    const userAssiduidadeSpan = document.getElementById("user-assiduidade");
    const userPontosSpan = document.getElementById("user-pontos");
    const btnLogout = document.getElementById('btn-logout');
    const btnLogoutMobile = document.getElementById('btn-logout-mobile');

    // Função auxiliar para fazer requisições autenticadas
    async function fetchAuthenticatedData(url, options = {}) {
        const token = localStorage.getItem('jwtToken'); // Chave padronizada: 'jwtToken'
        if (!token) {
            alert('Sessão expirada ou não autorizado. Faça login novamente.');
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('userId'); 
            localStorage.removeItem('userNickname'); // MUDADO AQUI: Remove userNickname
            window.location.href = '/html/login.html';
            return null;
        }

        const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
        const response = await fetch(url, { ...options, headers });

        if (response.status === 401 || response.status === 403) {
            alert('Sessão expirada ou não autorizada. Faça login novamente.');
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('userId'); 
            localStorage.removeItem('userNickname'); // MUDADO AQUI: Remove userNickname
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
                // MUDADO AQUI: Altera para user.nickname
                userNicknameSpan.textContent = user.nickname;
                userAssiduidadeSpan.textContent = `${user.assiduidade_dias} dias`;
                userPontosSpan.textContent = user.pontos;
                localStorage.setItem('userId', user.id_usuario);
                // MUDADO AQUI: Armazena o nickname no localStorage
                localStorage.setItem('userNickname', user.nickname);
            }
        } catch (error) {
            console.error('Erro ao carregar perfil do usuário:', error);
        }
    }

    function logout() {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('userId'); 
        localStorage.removeItem('userNickname'); // MUDADO AQUI: Remove userNickname
        alert('Você foi desconectado.');
        window.location.href = '/html/login.html';
    }

    // ----------------------------------------------------
    // Lógica Específica da Página de Módulo
    // ----------------------------------------------------

    let currentModuleId = null; 
    let userProgress = {}; // Guardará o progresso do usuário para as unidades deste módulo

    // A lógica de inicialização foi movida para o DOMContentLoaded para garantir a ordem
    loadUserProfile(); 
    
    const urlParams = new URLSearchParams(window.location.search);
    currentModuleId = urlParams.get('id'); // Pega o ID do módulo da URL

    if (currentModuleId) {
        try {
            const moduleData = await fetchAuthenticatedData(`/api/content/modulo/${currentModuleId}`);
            if (moduleData) {
                document.getElementById('module-title').textContent = moduleData.nome_modulo;
                document.getElementById('module-description').textContent = moduleData.descricao;
                
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
                document.getElementById('module-title').textContent = 'Módulo não encontrado.';
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes do módulo:', error);
            document.getElementById('module-title').textContent = 'Erro ao carregar módulo.';
        }
    } else {
        document.getElementById('module-title').textContent = 'Módulo não especificado.';
    }

    function renderUnits(units) {
        const unitsContainer = document.getElementById('units-container');
        unitsContainer.innerHTML = ''; 

        if (units && units.length > 0) {
            units.forEach(unit => {
                const unitCard = document.createElement('a');
                unitCard.href = `/html/quiz.html?unitId=${unit.id_unidade}`;
                unitCard.className = 'unidade-card unit-card flex flex-col p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer relative'; 
                
                const progressForUnit = userProgress[unit.id_unidade];
                if (progressForUnit && progressForUnit.completo) {
                    unitCard.classList.add('completed');
                }

                unitCard.innerHTML = `
                    <div>
                        <h3 class="text-xl font-semibold text-[#02416d]">${unit.nome_unidade || 'Nome da Unidade'}</h3>
                        <p class="text-gray-600">${unit.descricao || 'Nenhuma descrição disponível.'}</p>
                    </div>
                `;
                unitsContainer.appendChild(unitCard);
            });
        } else {
            unitsContainer.innerHTML = '<p class="text-gray-700">Nenhuma unidade encontrada para este módulo.</p>';
        }
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