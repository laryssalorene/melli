
// public/js/home.js

document.addEventListener('DOMContentLoaded', () => {
    // Obtenção de referências aos elementos do DOM
    const btnPerfil = document.getElementById("btn-perfil");
    const btnPerfilMobile = document.getElementById("btn-perfil-mobile");
    const colunaEsquerda = document.getElementById("coluna-esquerda");
    const menuToggle = document.getElementById("menu-toggle");
    const mobileMenu = document.getElementById("mobile-menu");
    const modulesContainer = document.getElementById("modules-container");
    const userNameSpan = document.getElementById("user-name");
    const userAssiduidadeSpan = document.getElementById("user-assiduidade");
    const userPontosSpan = document.getElementById("user-pontos");
    const welcomeNameSpan = document.getElementById("welcome-name");
    const btnLogout = document.getElementById('btn-logout');
    const btnLogoutMobile = document.getElementById('btn-logout-mobile');

    // Função auxiliar para fazer requisições autenticadas
    async function fetchAuthenticatedData(url, options = {}) {
        const token = localStorage.getItem('jwtToken'); // Chave padronizada: 'jwtToken'
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
            let errorData = {};
            try {
                errorData = await response.json();
            } catch (e) {
                // Se a resposta não for JSON, trate como erro genérico
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
                userNameSpan.textContent = user.nome;
                userAssiduidadeSpan.textContent = `${user.assiduidade_dias} dias`;
                userPontosSpan.textContent = user.pontos;
                welcomeNameSpan.textContent = user.nome.split(' ')[0];
                
                // Opcional: Você já salvou o nome e ID no login, mas pode atualizar/garantir aqui
                localStorage.setItem('userId', user.id_usuario);
                localStorage.setItem('userName', user.nome);
            }
        } catch (error) {
            console.error('Erro ao carregar perfil do usuário:', error);
            // O fetchAuthenticatedData já lida com redirecionamento em caso de 401/403
            // Mas outros erros (rede, 500) podem ser exibidos aqui
        }
    }

    // Função para carregar e exibir os módulos
    async function loadModules() {
        try {
            const modules = await fetchAuthenticatedData('/api/content/modulos');
            
            if (modulesContainer) {
                modulesContainer.innerHTML = ''; // Limpa o conteúdo existente
            }

            if (modules && modules.length > 0) {
                modules.forEach(module => {
                    const moduleCard = document.createElement('a');
                    moduleCard.href = `/html/modulo.html?id=${module.id_modulo}`;
                    moduleCard.className = 'module-card flex items-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow module-custom-style'; 
                    
                    if (module.completo) {
                        moduleCard.classList.add('completed');
                    }

                    moduleCard.innerHTML = `
                        <div>
                            <h3 class="text-xl font-semibold text-[#02416d]">${module.nome_modulo}</h3>
                            <p class="text-gray-600">${module.descricao}</p>
                            ${module.progresso_unidades !== undefined ? `<p class="text-sm text-gray-500">${module.progresso_unidades.concluidas}/${module.progresso_unidades.total} unidades</p>` : ''}
                        </div>
                    `;
                    if (modulesContainer) {
                        modulesContainer.appendChild(moduleCard);
                    }
                });
            } else {
                if (modulesContainer) {
                    modulesContainer.innerHTML = '<p class="text-gray-700">Nenhum módulo encontrado.</p>';
                }
            }
        } catch (error) {
            console.error('Erro ao carregar módulos:', error);
             // O fetchAuthenticatedData já lida com redirecionamento em caso de 401/403
        }
    }

    // Função para fazer logout
    function logout() {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('userId'); 
        localStorage.removeItem('userName'); 
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