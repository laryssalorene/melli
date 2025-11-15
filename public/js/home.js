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
    const backdrop = document.getElementById('backdrop');
    const logoLink = document.getElementById('logo-link');


    // Mapeamento de ícones para cada tipo de módulo
    const moduleIcons = {
        'Introdução à Plataforma': 'fas fa-microchip',
        'Estruturas de Dados': 'fas fa-sitemap',
        'Desenvolvimento Web': 'fas fa-globe',
        'Banco de Dados': 'fas fa-database',
        'default': 'fas fa-graduation-cap'
    };

    // Função auxiliar para controlar o scroll do body (SEM BACKDROP)
    function toggleBodyScroll(disableScroll) {
        if (window.innerWidth <= 767) { // Aplica apenas em mobile
            if (disableScroll) {
                document.body.classList.add('sidebar-open-mobile'); // Adiciona classe para overflow: hidden
            } else {
                document.body.classList.remove('sidebar-open-mobile'); // Remove classe para restaurar scroll
            }
        } else {
            // Garante que a classe de scroll esteja removida em desktop
            document.body.classList.remove('sidebar-open-mobile');
        }
    }

    // NOVO: Função centralizada para toggle da sidebar de perfil
    function toggleSidebar(open) {
        const isCurrentlyOpen = colunaEsquerda.classList.contains("visivel");
        const shouldOpen = (open !== undefined) ? open : !isCurrentlyOpen;

        if (shouldOpen) {
            colunaEsquerda.classList.add("visivel");
            mobileMenu.classList.remove("visivel"); // Fecha o menu mobile se a sidebar abre
        } else {
            colunaEsquerda.classList.remove("visivel");
        }
        
        // Gerencia o backdrop e o scroll (apenas em mobile)
        if (window.innerWidth <= 767) {
            toggleBodyScroll(shouldOpen);
        }
    }


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
                userAssiduidadeSpan.textContent = `${user.assiduidade_days || 0} dias`;
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
                const existingPaths = Array.from(modulesContainer.querySelectorAll('.module-path'));
                modulesContainer.innerHTML = '';
                existingPaths.forEach(path => modulesContainer.appendChild(path));
            }

            if (modules && modules.length > 0) {
                modules.forEach((module, index) => {
                    const moduleCard = document.createElement('a');
                    moduleCard.href = `/html/modulo.html?id=${module.id_modulo}`;
                    moduleCard.className = `module-card module-${index + 1}`;

                    if (module.completo) {
                        moduleCard.classList.add('completed');
                    } else if (module.bloqueado) {
                        moduleCard.classList.add('bloqueado');
                    } else {
                        moduleCard.classList.add('desbloqueado');
                    }

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
                        modulesContainer.appendChild(moduleCard);
                    }
                });

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

    // Toggle do painel de perfil (desktop e mobile)
    if (btnPerfil) {
        btnPerfil.addEventListener("click", () => {
            toggleSidebar(); // Usa a função centralizada
        });
    }

    if (btnPerfilMobile) { 
        btnPerfilMobile.addEventListener("click", () => {
            toggleSidebar(); // Usa a função centralizada
        }); 
    }

    // Lógica do menu hambúrguer
    if (menuToggle) {
        menuToggle.addEventListener("click", () => {
            const isMenuOpen = mobileMenu.classList.contains("visivel");
            
            mobileMenu.classList.toggle("visivel");
            toggleSidebar(false); // Sempre fecha a sidebar se o menu mobile abre

            // Gerencia o scroll para o menu mobile
            if (window.innerWidth <= 767) {
                toggleBodyScroll(!isMenuOpen);
            }
        });
    }

    // Event Listener para o clique no logo
    if (logoLink) {
        logoLink.addEventListener('click', (event) => {
            event.preventDefault(); 

            // Limpa o estado da sidebar e menu antes de redirecionar
            toggleSidebar(false); // Garante que a sidebar está fechada (e restaura o scroll)
            mobileMenu.classList.remove('visivel'); // Garante que o menu mobile está fechado
            toggleBodyScroll(false); // Garante que o scroll é reativado

            // Redireciona para a home.html
            window.location.href = '/html/home.html';
        });
    }

    // Fechar sidebar/menu mobile ao clicar fora (mobile)
    // O clique na coluna esquerda em mobile NÃO deve fechar (pois a sidebar está 100% da largura).
    // O backdrop (que não usamos) ou o clique no botão de toggle deve fechar.
    
    // NOVO: Adicionado listener para fechar a sidebar ao clicar fora (no main content) em mobile
    // Verifica se a largura é mobile e se a sidebar está visível
    document.querySelector('.conteudo').addEventListener('click', (event) => {
        if (window.innerWidth <= 767 && colunaEsquerda.classList.contains('visivel')) {
            // Se o clique NÃO foi dentro da colunaEsquerda ou do botão de toggle, feche.
            if (!colunaEsquerda.contains(event.target) && 
                !btnPerfil.contains(event.target) && !btnPerfilMobile.contains(event.target)) {
                
                toggleSidebar(false); // Fecha a sidebar
            }
        }
    });


    // Logout
    btnLogout.addEventListener('click', logout);
    if (btnLogoutMobile) { 
        btnLogoutMobile.addEventListener('click', logout); 
    }

    // Opcional: Fechar menus ao redimensionar
    window.addEventListener('resize', () => {
        if (window.innerWidth > 767) {
            // Se estiver em desktop, garantir que o scroll esteja restaurado e menus mobile fechados
            toggleBodyScroll(false); 
            mobileMenu.classList.remove('visivel'); 
        } else {
            // Se estiver em mobile, e algum menu ou sidebar estava aberto, mantém o scroll block
            if (colunaEsquerda.classList.contains('visivel') || mobileMenu.classList.contains('visivel')) {
                toggleBodyScroll(true);
            }
        }
    });
});