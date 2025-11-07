// public/js/home.js

document.addEventListener('DOMContentLoaded', () => {
    // Obtenção de referências aos elementos do DOM
    const btnPerfil = document.getElementById("btn-perfil");
    const btnPerfilMobile = document.getElementById("btn-perfil-mobile");
    const colunaEsquerda = document.getElementById("coluna-esquerda");
    const menuToggle = document.getElementById("menu-toggle");
    const mobileMenu = document.getElementById("mobile-menu");
    const modulesContainer = document.getElementById("modules-container");
    const userNicknameSpan = document.getElementById("user-nickname");
    const userAssiduidadeSpan = document.getElementById("user-assiduidade");
    const userPontosSpan = document.getElementById("user-pontos");
    const welcomeNicknameSpan = document.getElementById("welcome-nickname");
    const btnLogout = document.getElementById('btn-logout');
    const btnLogoutMobile = document.getElementById('btn-logout-mobile');

    // Mapeamento de ícones para cada tipo de módulo (adapte conforme seus dados)
    const moduleIcons = {
        'Introdução à Programação': 'fas fa-microchip',
        'Estruturas de Dados': 'fas fa-sitemap',
        'Desenvolvimento Web': 'fas fa-globe',
        'Banco de Dados': 'fas fa-database',
        // Adicione outros mapeamentos conforme necessário para seus módulos
        'default': 'fas fa-graduation-cap' // Ícone padrão
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
            let errorData = {};
            try {
                errorData = await response.json();
            } catch (e) {
                throw new Error(`Erro na requisição: ${response.statusText} (${response.status})`);
            }
            throw new Error(errorData.message || `Erro na requisição: ${response.statusText}`);
        }

        return response.json();
    }

    // Função para carregar e exibir os dados do perfil do usuário
    async function loadUserProfile() {
        try {
            const user = await fetchAuthenticatedData('/api/users/profile'); 
            if (user) {
                userNicknameSpan.textContent = user.nickname;
                userAssiduidadeSpan.textContent = `${user.assiduidade_dias} dias`;
                userPontosSpan.textContent = user.pontos;
                welcomeNicknameSpan.textContent = user.nickname; 
                
                localStorage.setItem('userId', user.id_usuario);
                localStorage.setItem('userNickname', user.nickname);
            }
        } catch (error) {
            console.error('Erro ao carregar perfil do usuário:', error);
        }
    }

    // Função para carregar e exibir os módulos
    async function loadModules() {
        try {
            const modules = await fetchAuthenticatedData('/api/content/modulos');
            
            if (modulesContainer) {
                // Guarda as divs das trilhas para recolocá-las
                const existingPaths = Array.from(modulesContainer.querySelectorAll('.module-path'));
                modulesContainer.innerHTML = ''; // Limpa o conteúdo, incluindo a mensagem "Carregando módulos..."
                existingPaths.forEach(path => modulesContainer.appendChild(path)); // Adiciona as trilhas de volta
            }

            if (modules && modules.length > 0) {
                modules.forEach((module, index) => {
                    const moduleCard = document.createElement('a');
                    moduleCard.href = `/html/modulo.html?id=${module.id_modulo}`;
                    // Adiciona as classes necessárias para o novo design
                    moduleCard.className = `module-card module-${index + 1}`; // module-1, module-2, etc.

                    // Adiciona classes de status
                    if (module.completo) {
                        moduleCard.classList.add('completed');
                    } else if (module.bloqueado) { // Assumindo que seu backend pode retornar 'bloqueado'
                        moduleCard.classList.add('bloqueado');
                    } else {
                        moduleCard.classList.add('desbloqueado');
                    }

                    // Obtenha o ícone com base no nome do módulo, se possível, ou use um padrão
                    const iconClass = moduleIcons[module.nome_modulo] || moduleIcons['default'];

                    moduleCard.innerHTML = `
                        <div class="module-content">
                            <span class="module-number">MÓDULO ${index + 1}:</span>
                            <h3 class="module-title">${module.nome_modulo}</h3>
                        </div>
                        <div class="module-icon">
                            <i class="${iconClass}"></i>
                        </div>
                    `;
                    
                    if (modulesContainer) {
                        // Inserir o card antes da próxima trilha ou no final se não houver mais trilhas
                        // Esta lógica simples apenas adiciona no final. Se a ordem das trilhas precisar ser intercalada,
                        // uma lógica de inserção mais complexa seria necessária.
                        modulesContainer.appendChild(moduleCard);
                    }
                });

                // Remove a mensagem "Carregando módulos..." se ainda estiver lá
                const loadingMessage = modulesContainer.querySelector('.text-gray-700');
                if (loadingMessage) {
                    loadingMessage.remove();
                }

            } else {
                if (modulesContainer) {
                    modulesContainer.innerHTML = '<p class="text-gray-700">Nenhum módulo encontrado.</p>';
                }
            }
        } catch (error) {
            console.error('Erro ao carregar módulos:', error);
            if (modulesContainer) {
                modulesContainer.innerHTML = '<p class="text-red-500">Erro ao carregar módulos. Tente novamente mais tarde.</p>';
            }
        }
    }

    // Função para fazer logout
    function logout() {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('userId'); 
        localStorage.removeItem('userNickname'); 
        alert('Você foi desconectado.');
        window.location.href = '/html/login.html';
    }

    // ------------------------------------
    // Event Listeners e Inicialização
    // ------------------------------------

    // Chamadas iniciais
    loadUserProfile();
    loadModules();

    // Toggle do painel de perfil
    btnPerfil.addEventListener("click", () => {
        colunaEsquerda.classList.toggle("visivel");
    });

    if (btnPerfilMobile) { 
        btnPerfilMobile.addEventListener("click", () => {
            colunaEsquerda.classList.toggle("visivel"); 
            mobileMenu.classList.remove("visivel"); 
        }); 
    }

    // Lógica CORRIGIDA para o menu hambúrguer
    menuToggle.addEventListener("click", () => {
        mobileMenu.classList.toggle("visivel");
        colunaEsquerda.classList.remove("visivel"); 
    });

    btnLogout.addEventListener('click', logout);
    if (btnLogoutMobile) { 
        btnLogoutMobile.addEventListener('click', logout); 
    }
});