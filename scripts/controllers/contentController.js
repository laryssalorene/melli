// scripts/controllers/contentController.js
// Importa o novo serviço unificado que gerencia todo o conteúdo e o progresso
const contentService = require('../services/contentService'); // <-- ESTA É A ÚNICA IMPORTAÇÃO DE SERVIÇO DE CONTEÚDO

const contentController = {
    /**
     * Obtém uma lista de todos os módulos disponíveis, incluindo um resumo de progresso para o usuário logado.
     * Ideal para a página inicial (home.html).
     * @param {object} req - Objeto de requisição do Express (req.user pode conter o ID do usuário).
     * @param {object} res - Objeto de resposta do Express.
     */
    getAllModules: async (req, res) => {
        try {
            // Pega o ID do usuário do token JWT, se houver um usuário logado.
            // Se o token não for fornecido ou for inválido, req.user será undefined/null.
            const id_usuario = req.user ? req.user.id_usuario : null; 
            
            // Chama o método do contentService que retorna módulos com resumo de progresso
            const modules = await contentService.getAllModulesWithProgressSummary(id_usuario);
            
            res.status(200).json(modules);
        } catch (error) {
            console.error('Erro ao buscar todos os módulos:', error);
            res.status(500).json({ message: 'Erro interno do servidor ao buscar módulos.' });
        }
    },

    /**
     * Obtém os detalhes de um módulo específico por ID, incluindo suas unidades e o progresso do usuário nelas.
     * @param {object} req - Objeto de requisição do Express (req.params.id para ID do módulo, req.user para ID do usuário).
     * @param {object} res - Objeto de resposta do Express.
     */
    getModuleById: async (req, res) => {
        try {
            const moduleId = req.params.id; // Pega o ID do módulo da URL
            const id_usuario = req.user ? req.user.id_usuario : null; // Pega o ID do usuário logado

            // Chama o método do contentService que retorna o módulo com unidades e progresso
            const module = await contentService.getModuleByIdWithUnitsAndProgress(moduleId, id_usuario);

            if (!module) {
                return res.status(404).json({ message: 'Módulo não encontrado.' });
            }
            res.status(200).json(module);
        } catch (error) {
            console.error(`Erro ao buscar módulo ${req.params.id}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao buscar módulo.' });
        }
    },

    /**
     * Obtém todas as unidades de um módulo específico por ID do módulo (com informações de progresso).
     * Nota: Este método pode ser redundante se `getModuleById` já retorna as unidades.
     * No entanto, ele é útil se o frontend precisar apenas da lista de unidades sem os detalhes completos do módulo.
     * @param {object} req - Objeto de requisição do Express (req.params.id para ID do módulo, req.user para ID do usuário).
     * @param {object} res - Objeto de resposta do Express.
     */
    getUnitsByModuleId: async (req, res) => {
        try {
            const moduleId = req.params.id; // Pega o ID do módulo da URL
            const id_usuario = req.user ? req.user.id_usuario : null; // Pega o ID do usuário logado

            // Reutiliza o método que busca o módulo com unidades e progresso, e extrai apenas as unidades
            const moduleDetails = await contentService.getModuleByIdWithUnitsAndProgress(moduleId, id_usuario);

            if (!moduleDetails || !moduleDetails.unidades || moduleDetails.unidades.length === 0) {
                // Se não encontrar unidades, retorna 200 com array vazio (mais flexível para o frontend)
                return res.status(200).json([]); 
            }
            res.status(200).json(moduleDetails.unidades);
        } catch (error) {
            console.error(`Erro ao buscar unidades do módulo ${req.params.id}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao carregar as unidades.' });
        }
    },

    /**
     * Obtém os detalhes de uma unidade específica por ID, incluindo suas questões.
     * @param {object} req - Objeto de requisição do Express (req.params.id_unidade contém o ID da unidade).
     * @param {object} res - Objeto de resposta do Express.
     */
    getUnitById: async (req, res) => {
        try {
            const unitId = req.params.id_unidade; // <--- CORREÇÃO AQUI: Espera `id_unidade`
            const unitWithDetails = await contentService.getUnitByIdWithDetails(unitId);

            if (!unitWithDetails) {
                return res.status(404).json({ message: 'Unidade não encontrada.' });
            }
            res.status(200).json(unitWithDetails);
        } catch (error) {
            console.error(`Erro ao buscar unidade ${unitId}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao buscar unidade.' });
        }
    },

    /**
     * Obtém todas as questões de uma unidade específica por ID da unidade.
     * @param {object} req - Objeto de requisição do Express (req.params.id_unidade contém o ID da unidade).
     * @param {object} res - Objeto de resposta do Express.
     */
    getQuestionsByUnitId: async (req, res) => {
        try {
            const unitId = req.params.id_unidade; // Assumindo que o parâmetro na rota será 'id_unidade'
            // Reutiliza o método que busca a unidade com suas questões
            const unitWithDetails = await contentService.getUnitByIdWithDetails(unitId); 
            
            if (!unitWithDetails || !unitWithDetails.questoes || unitWithDetails.questoes.length === 0) {
                return res.status(200).json([]); // Retorna array vazio se não houver questões
            }
            res.status(200).json(unitWithDetails.questoes);
        } catch (error) {
            console.error(`Erro ao buscar questões da unidade ${req.params.id_unidade}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao carregar as questões.' });
        }
    },

    /**
     * Retorna uma questão específica por ID.
     * @param {object} req - Objeto de requisição do Express (req.params.id_questao).
     * @param {object} res - Objeto de resposta do Express.
     */
    getQuestionById: async (req, res) => {
        try {
            const questionId = req.params.id_questao;
            const question = await contentService.getQuestionById(questionId);
            if (!question) {
                return res.status(404).json({ message: 'Questão não encontrada.' });
            }
            res.status(200).json(question);
        } catch (error) {
            console.error(`Erro ao buscar questão ${req.params.id_questao}:`, error);
            res.status(500).json({ message: 'Erro interno do servidor ao carregar a questão.' });
        }
    },

    /**
     * Registra ou atualiza o progresso de um usuário em uma unidade.
     * @param {object} req - Objeto de requisição do Express (req.params para IDs, req.body para concluido/pontuacao, req.user para ID do usuário).
     * @param {object} res - Objeto de resposta do Express.
     */
    updateUserProgress: async (req, res) => {
        try {
            const id_usuario = req.user.id_usuario; // Deve vir do token JWT verificado
            const { id_modulo, id_unidade } = req.params; // IDs da URL
            const { concluido, pontuacao } = req.body; // Dados do corpo da requisição

            if (id_usuario === undefined || id_modulo === undefined || id_unidade === undefined || concluido === undefined) {
                return res.status(400).json({ message: 'Dados insuficientes para atualizar o progresso.' });
            }

            const updatedProgress = await contentService.updateUserProgress(
                id_usuario,
                parseInt(id_modulo, 10),
                parseInt(id_unidade, 10),
                concluido,
                pontuacao
            );
            res.status(200).json({ message: 'Progresso atualizado com sucesso!', progress: updatedProgress });
        } catch (error) {
            console.error('Erro ao atualizar progresso do usuário:', error);
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao atualizar progresso.' });
        }
    },

    /**
     * Obtém o progresso de um usuário em uma unidade específica.
     * @param {object} req - Objeto de requisição do Express (req.params para IDs, req.user para ID do usuário).
     * @param {object} res - Objeto de resposta do Express.
     */
    getUnitProgress: async (req, res) => {
        try {
            const id_usuario = req.user.id_usuario;
            const { id_modulo, id_unidade } = req.params;

            if (id_usuario === undefined || id_modulo === undefined || id_unidade === undefined) {
                return res.status(400).json({ message: 'Dados insuficientes para buscar o progresso da unidade.' });
            }

            const progress = await contentService.getProgressoByUnit(
                id_usuario,
                parseInt(id_modulo, 10),
                parseInt(id_unidade, 10)
            );

            // Retorna o progresso (ou null se não houver)
            res.status(200).json(progress);
        } catch (error) {
            console.error('Erro ao buscar progresso da unidade:', error);
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao buscar progresso da unidade.' });
        }
    }
};

module.exports = contentController;