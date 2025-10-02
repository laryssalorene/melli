// scripts/services/progressService.js
const { get, run, all } = require('../db'); 

const progressService = {
    // Registra a conclusão de uma unidade para um usuário
    recordUnitCompletion: async (id_usuario, id_modulo, id_unidade, pontuacao_unidade) => {
        try {
            const data_conclusao = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

            // Verifica se o usuário já completou esta unidade. Se sim, podemos atualizar.
            const existingProgress = await get(
                'SELECT * FROM progresso_usuario WHERE id_usuario = ? AND id_modulo = ? AND id_unidade = ?', 
                [id_usuario, id_modulo, id_unidade]
            );

            if (existingProgress) {
                // Se já existe, atualiza a pontuação e data (se for uma pontuação melhor, ou apenas a data)
                await run(
                    'UPDATE progresso_usuario SET pontuacao_unidade = ?, data_conclusao = ?, completo = 1 WHERE id_progresso = ?', // CORRIGIDO: pontuacao -> pontuacao_unidade
                    [pontuacao_unidade, data_conclusao, existingProgress.id_progresso]
                );
                return { message: 'Progresso da unidade atualizado com sucesso!' };
            } else {
                // Se não existe, insere um novo registro de progresso
                await run(
                    'INSERT INTO progresso_usuario (id_usuario, id_modulo, id_unidade, data_conclusao, pontuacao_unidade, completo) VALUES (?, ?, ?, ?, ?, 1)', // CORRIGIDO: pontuacao -> pontuacao_unidade
                    [id_usuario, id_modulo, id_unidade, data_conclusao, pontuacao_unidade]
                );
                return { message: 'Unidade marcada como concluída com sucesso!' };
            }
        } catch (error) {
            console.error('Erro ao registrar conclusão da unidade:', error);
            throw error;
        }
    },

    // Obtém o progresso de um usuário para todas as unidades
    getUserProgress: async (id_usuario) => {
        try {
            const progress = await all(
                'SELECT id_modulo, id_unidade, data_conclusao, pontuacao_unidade, completo FROM progresso_usuario WHERE id_usuario = ?', // CORRIGIDO: pontuacao -> pontuacao_unidade
                [id_usuario]
            );
            return progress.map(p => ({
                id_modulo: p.id_modulo,
                id_unidade: p.id_unidade,
                data_conclusao: p.data_conclusao,
                pontuacao_unidade: p.pontuacao_unidade, // CORRIGIDO: p.pontuacao -> p.pontuacao_unidade
                completo: !!p.completo 
            }));
        } catch (error) {
            console.error('Erro ao obter progresso do usuário:', error);
            throw error;
        }
    },

    // Verifica se uma unidade específica está completa para um usuário
    isUnitCompleted: async (id_usuario, id_unidade) => {
        try {
            const result = await get(
                'SELECT completo FROM progresso_usuario WHERE id_usuario = ? AND id_unidade = ? AND completo = 1', 
                [id_usuario, id_unidade]
            );
            return !!result; 
        } catch (error) {
            console.error('Erro ao verificar conclusão da unidade:', error);
            throw error;
        }
    }
};

module.exports = progressService;