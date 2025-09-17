const path = require('path');
const fs = require('fs/promises');
const Progresso = require('../models/Progresso');

let cachedContent = null;
const CONTENT_FILE_PATH = path.join(__dirname, '..', 'data', 'content.json');

async function loadContent() {
    if (cachedContent) {
        return cachedContent;
    }
    try {
        const data = await fs.readFile(CONTENT_FILE_PATH, 'utf8');
        cachedContent = JSON.parse(data);
        return cachedContent;
    } catch (error) {
        console.error('Erro ao carregar o conteúdo do arquivo JSON:', error);
        throw new Error('Falha ao carregar conteúdo do curso. Verifique o arquivo content.json.');
    }
}

const contentService = {
    getAllModules: async () => {
        const content = await loadContent();
        return content.modulos;
    },

    getModuleById: async (id_modulo) => {
        const content = await loadContent();
        const moduleId = parseInt(id_modulo, 10);
        return content.modulos.find(m => m.id_modulo === moduleId);
    },

    getModuleByIdWithProgress: async (id_modulo, id_usuario) => {
        const content = await loadContent();
        const moduleId = parseInt(id_modulo, 10);
        const module = content.modulos.find(m => m.id_modulo === moduleId);
        if (!module) return null;

        const userProgress = await Progresso.getProgressoUsuario(id_usuario);
        const unitsWithProgress = module.unidades.map(unit => {
            const progressRecord = userProgress.find(p => 
                p.id_modulo === moduleId && p.id_unidade === unit.id_unidade
            );
            return {
                ...unit, // <<-- GARANTE QUE TODAS AS PROPRIEDADES DA UNIDADE (do JSON) SÃO INCLUÍDAS
                concluido: !!progressRecord?.concluido,
                pontuacao: progressRecord ? progressRecord.pontuacao : 0
            };
        });

        return { ...module, unidades: unitsWithProgress };
    },

    getUnitById: async (id_modulo, id_unidade) => {
        const content = await loadContent();
        const moduleId = parseInt(id_modulo, 10);
        const unitId = parseInt(id_unidade, 10);
        const module = content.modulos.find(m => m.id_modulo === moduleId);
        if (!module) return null;
        return module.unidades.find(u => u.id_unidade === unitId);
    },

    getAllModulesWithProgress: async (id_usuario) => {
        const allModules = await contentService.getAllModules();
        const userProgress = await Progresso.getProgressoUsuario(id_usuario);

        return allModules.map(module => {
            const total_unidades = module.unidades.length;
            let unidades_concluidas = 0;

            module.unidades.forEach(unit => {
                const progressRecord = userProgress.find(p => 
                    p.id_modulo === module.id_modulo && p.id_unidade === unit.id_unidade && p.concluido === 1
                );
                if (progressRecord) {
                    unidades_concluidas++;
                }
            });

            return {
                id_modulo: module.id_modulo,
                nome_modulo: module.nome_modulo,
                descricao: module.descricao,
                ordem: module.ordem, // <<-- GARANTE QUE 'ordem' DO MÓDULO É INCLUÍDA
                total_unidades: total_unidades,
                unidades_concluidas: unidades_concluidas
            };
        });
    },
    
    // Este método já estava ok, pois retorna a unidade completa do JSON.
    // Garanta que o JSON tem 'ordem' e 'pontos_por_conclusao' se você quiser exibi-los.
    getUnitsByModuloIdWithProgress: async (id_modulo, id_usuario) => {
        const content = await loadContent();
        const moduleId = parseInt(id_modulo, 10);
        const module = content.modulos.find(m => m.id_modulo === moduleId);
        
        if (!module) return null;

        const userProgress = await Progresso.getProgressoUsuario(id_usuario);
        
        return module.unidades.map(unit => {
            const progressRecord = userProgress.find(p => 
                p.id_modulo === moduleId && p.id_unidade === unit.id_unidade
            );
            return {
                ...unit, // <<-- ESSA LINHA É CRÍTICA para incluir todas as propriedades do JSON
                concluido: !!progressRecord?.concluido,
                pontuacao: progressRecord ? progressRecord.pontuacao : 0
            };
        });
    }
};

module.exports = contentService;