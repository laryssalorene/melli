const contentService = require('../services/contentService');
const Progresso = require('../models/Progresso');

const contentController = {
    getAllModules: async (req, res) => {
        try {
            const id_usuario = req.user.id_usuario;
            const modulesWithProgress = await contentService.getAllModulesWithProgress(id_usuario);
            res.json(modulesWithProgress);
        } catch (error) {
            console.error('Erro ao obter módulos com progresso:', error);
            res.status(500).json({ message: error.message });
        }
    },

    getModuleDetails: async (req, res) => {
        try {
            const { id } = req.params;
            const id_usuario = req.user.id_usuario;
            const module = await contentService.getModuleByIdWithProgress(id, id_usuario);
            if (!module) {
                return res.status(404).json({ message: 'Módulo não encontrado.' });
            }
            res.json(module);
        } catch (error) {
            console.error('Erro ao obter detalhes do módulo:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // <<-- FUNÇÃO getUnitsByModuloId (AGORA ADICIONADA)
    getUnitsByModuloId: async (req, res) => {
        try {
            const id_modulo = req.params.id; // O Express extrai o 'id' da URL
            const id_usuario = req.user.id_usuario;

            // Chama o serviço para buscar as unidades e combinar com o progresso
            const unitsWithProgress = await contentService.getUnitsByModuloIdWithProgress(id_modulo, id_usuario);

            if (!unitsWithProgress) {
                return res.status(404).json({ message: 'Módulo não encontrado.' });
            }

            res.json(unitsWithProgress);
        } catch (error) {
            console.error('Erro ao obter unidades com progresso:', error);
            res.status(500).json({ message: error.message });
        }
    },
    getUnitsByModuloId: async (req, res) => {
        try {
            const id_modulo = req.params.id; // O Express extrai o 'id' da URL
            const id_usuario = req.user.id_usuario;

            // Chama o serviço para buscar as unidades e combinar com o progresso
            const unitsWithProgress = await contentService.getUnitsByModuloIdWithProgress(id_modulo, id_usuario);

            if (!unitsWithProgress) {
                return res.status(404).json({ message: 'Módulo não encontrado.' });
            }

            res.json(unitsWithProgress);
        } catch (error) {
            console.error('Erro ao obter unidades com progresso:', error);
            res.status(500).json({ message: error.message });
        }
    },

    getUnitDetails: async (req, res) => {
        try {
            const { id_modulo, id_unidade } = req.params;
            const unit = await contentService.getUnitById(id_modulo, id_unidade);
            if (!unit) {
                return res.status(404).json({ message: 'Unidade não encontrada.' });
            }
            res.json(unit);
        } catch (error) {
            console.error('Erro ao obter detalhes da unidade:', error);
            res.status(500).json({ message: error.message });
        }
    },

    getQuestionsByUnitId: async (req, res) => {
        try {
            const { unitId } = req.params;
            const questions = await contentService.getQuestionsForUnit(unitId);
            res.status(200).json(questions);
        } catch (error) {
            console.error('Erro ao buscar questões da unidade:', error);
            res.status(500).json({ message: 'Erro ao buscar questões.' });
        }
    },

    markUnitAsComplete: async (req, res) => {
        try {
            const { id_modulo, id_unidade } = req.params;
            const { pontuacao } = req.body;
            const id_usuario = req.user.id_usuario;
            
            const result = await Progresso.setUnidadeConcluida(id_usuario, parseInt(id_modulo, 10), parseInt(id_unidade, 10), pontuacao);

            // TODO: Adicione a lógica de atualização de pontos e assiduidade aqui, chamando o userService
            // Exemplo: await userService.updateUserPoints(id_usuario, pontuacao);

            res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao marcar unidade como concluída:', error);
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = contentController;