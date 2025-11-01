// scripts/utils/anonymize.js
const { run, all } = require('../db');
const bcrypt = require('bcryptjs');
// const { v4: uuidv4 } = require('uuid'); // REMOVA ESTA LINHA
const path = require('path');
const fs = require('fs/promises');

// Importar o UsuarioModel para usar as funções de hash de senha, etc.
const UsuarioModel = require('../models/Usuario');

async function anonymizeDatabase() {
    console.log('Iniciando processo de anonimização do banco de dados...');
    try {
        // Importação dinâmica do uuid
        const { v4: uuidv4 } = await import('uuid'); // ADICIONE ESTA LINHA E USE 'await'

        // Obter todos os usuários
        const users = await all('SELECT id_usuario, nickname, email, pontos, ultimo_login, assiduidade_dias FROM Usuario', []);

        if (users.length === 0) {
            console.log('Nenhum usuário encontrado para anonimizar.');
            return;
        }

        console.log(`Anonimizando ${users.length} usuários...`);

        // Senha genérica para os usuários anonimizados
        const genericPasswordHash = await bcrypt.hash('senhaanonima123', 10);

        for (const user of users) {
            // Gerar um novo nickname e email anônimos
            const anonymizedNickname = `user_${uuidv4().substring(0, 8)}`; // ex: user_a1b2c3d4
            const anonymizedEmail = `${anonymizedNickname}@anonimo.com`;

            // Atualizar o usuário no banco de dados
            // NOTA: Os tokens de reset de senha devem ser limpos para segurança.
            await run(`
                UPDATE Usuario
                SET 
                    nickname = ?,
                    email = ?,
                    password_hash = ?,
                    token_reset_senha = NULL,
                    token_reset_expiracao = NULL,
                    ultimo_login = NULL,
                    assiduidade_dias = 0
                WHERE id_usuario = ?
            `, [
                anonymizedNickname,
                anonymizedEmail,
                genericPasswordHash,
                user.id_usuario
            ]);
            // Poderíamos manter os pontos, ou zerar, dependendo da necessidade de teste
            // Neste exemplo, mantemos os pontos, mas zeramos ultimo_login e assiduidade_dias
        }

        console.log('Anonimização de usuários concluída.');

        // Opcional: Anonimizar logs ou outros dados sensíveis se houver
        // Por exemplo, se houvesse uma tabela de logs que registra IP, você a limparia aqui.

        console.log('Banco de dados anonimizado com sucesso!');
    } catch (error) {
        console.error('Erro durante o processo de anonimização:', error);
    } finally {
        // Fechar a conexão com o banco de dados se não for gerenciada globalmente
        // (No seu caso, 'run'/'all' já gerenciam a conexão, então não é necessário aqui)
    }
}

// Para que possamos executar este script diretamente
if (require.main === module) {
    // Adicionar um delay ou uma confirmação para evitar anonimizar acidentalmente
    console.warn("AVISO: Este script anonimizará permanentemente todos os dados de usuários no banco de dados.");
    console.warn("Ele deve ser executado APENAS em ambientes de desenvolvimento/teste.");
    console.warn("Pressione Ctrl+C para cancelar ou aguarde 5 segundos para continuar...");

    setTimeout(() => {
        anonymizeDatabase().then(() => {
            console.log("Processo de anonimização finalizado.");
            // process.exit(0); // Opcional: Sair do processo após a anonimização
        });
    }, 5000); // 5 segundos de espera
}

module.exports = anonymizeDatabase;