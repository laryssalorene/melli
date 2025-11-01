// scripts/utils/anonymize.js
const { run, all } = require('../../database/sqlite-db'); // Ajustar o caminho para o sqlite-db
const bcrypt = require('bcryptjs');
const encryptionService = require('../services/encryptionService'); // Importar o serviço de criptografia

async function anonymizeDatabase() {
    console.log('Iniciando processo de anonimização do banco de dados...');
    try {
        // Importação dinâmica do uuid
        // Certifique-se de que 'uuid' está instalado: npm install uuid
        const { v4: uuidv4 } = await import('uuid'); 

        // Obter todos os usuários
        // Selecionar apenas as colunas necessárias, o e-mail será CRIPTOGRAFADO aqui.
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
            const anonymizedEmailPlain = `${anonymizedNickname}@anonimo.com`; // E-mail em texto simples

            // Criptografar o e-mail anônimo antes de salvar no DB
            const anonymizedEmailEncrypted = encryptionService.encrypt(anonymizedEmailPlain);

            if (!anonymizedEmailEncrypted) {
                console.error(`Falha ao criptografar e-mail anônimo para o usuário ${user.id_usuario}. Pulando este usuário.`);
                continue; // Pula para o próximo usuário se a criptografia falhar
            }

            // Atualizar o usuário no banco de dados
            // NOTA: Limpar reset_token, reset_token_expires e atualizar para o e-mail CRIPTOGRAFADO
            await run(`
                UPDATE Usuario
                SET 
                    nickname = ?,
                    email = ?,
                    senha = ?, -- Corrigido de 'password_hash' para 'senha'
                    reset_token = NULL,
                    reset_token_expires = NULL,
                    ultimo_login = NULL,
                    assiduidade_dias = 0
                WHERE id_usuario = ?
            `, [
                anonymizedNickname,
                anonymizedEmailEncrypted, // Salva o e-mail CRIPTOGRAFADO
                genericPasswordHash,
                user.id_usuario
            ]);
        }

        console.log('Anonimização de usuários concluída.');

        console.log('Banco de dados anonimizado com sucesso!');
    } catch (error) {
        console.error('Erro durante o processo de anonimização:', error);
    } finally {
        // Nada a fazer aqui se as funções 'run' e 'all' gerenciam a conexão
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
        }).catch(err => {
            console.error("Erro final na execução da anonimização:", err);
            // process.exit(1);
        });
    }, 5000); // 5 segundos de espera
}

module.exports = anonymizeDatabase;