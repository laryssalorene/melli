const Usuario = require('../models/Usuario'); // Caminho CORRIGIDO para sua classe Usuario
const bcrypt = require('bcryptjs'); // ou 'bcrypt'
const jwt = require('jsonwebtoken');

const authService = {
    registerUser: async (nome, email, senha) => {
        if (!nome || !email || !senha) {
            throw new Error('Nome, e-mail e senha são obrigatórios.');
        }

        const existingUser = await Usuario.findByEmail(email); // Usando sua classe Usuario
        if (existingUser) {
            throw new Error('E-mail já cadastrado.');
        }

        const senhaHash = await bcrypt.hash(senha, 10);
        const userId = await Usuario.create(nome, email, senhaHash); // Usando sua classe Usuario

        return { message: 'Usuário registrado com sucesso!', userId };
    },

    loginUser: async (email, senha) => {
        try {
            // DEBUG 1: Recebimento das credenciais
            console.log(`[AUTH SERVICE DEBUG] Tentativa de login para E-mail: "${email}"`);
            console.log(`[AUTH SERVICE DEBUG] Senha recebida (plain text): "${senha}"`);

            const user = await Usuario.findByEmail(email); // Usando sua classe Usuario

            if (!user) {
                console.log(`[AUTH SERVICE DEBUG] ERRO: Usuário com email "${email}" NÃO encontrado no DB.`);
                throw new Error('Credenciais inválidas.');
            }

            // DEBUG 2: Usuário encontrado e hash do DB
            console.log(`[AUTH SERVICE DEBUG] Usuário encontrado. Nome: ${user.nome}, ID: ${user.id_usuario}`);
            console.log(`[AUTH SERVICE DEBUG] Senha HASHADA do DB: "${user.senha}"`);

            // >>> TESTE DE DEPURAÇÃO IRREFUTÁVEL - REMOVER DEPOIS <<<
            const testPassword = "1234"; // Senha que você tem certeza que é a correta
            const testHashFromDB = user.senha; // O hash que veio do seu DB

            console.log(`\n--- [DEBUGINHO] Teste de Senha '1234' vs Hash do DB ---`);
            console.log(`[DEBUGINHO] Senha para testar: "${testPassword}"`);
            console.log(`[DEBUGINHO] Hash do DB para testar: "${testHashFromDB}"`);

            const resultTest = await bcrypt.compare(testPassword, testHashFromDB);
            console.log(`[DEBUGINHO] Resultado de bcrypt.compare("${testPassword}", DB_HASH) = ${resultTest}`);

            // Agora, para ter certeza absoluta de que "1234" gera o hash esperado:
            // Use uma "salt round" (10) que deve ser a mesma usada no registro
            const hashOf1234 = await bcrypt.hash(testPassword, 10); 
            console.log(`[DEBUGINHO] Hash GERADO AGORA para "${testPassword}": "${hashOf1234}"`);

            // Compare o hash recém-gerado de "1234" com o hash do DB
            // Atenção: A comparação de hashes brutos (string === string) geralmente não funciona com bcrypt
            // porque bcrypt gera um salt aleatório para cada hash.
            // O objetivo aqui é ver se 'bcrypt.compare' retorna true para os mesmos inputs.
            // Se 'resultTest' acima for false, este teste abaixo apenas visualiza a diferença dos hashes.
            const areHashesLiterallyEqual = (hashOf1234 === testHashFromDB);
            console.log(`[DEBUGINHO] O hash GERADO agora para "${testPassword}" é LITERALMENTE o mesmo do DB? ${areHashesLiterallyEqual} (isso é normal ser false)`);
            console.log(`------------------------------------------------------\n`);
            // >>> FIM DO TESTE DE DEPURAÇÃO IRREFUTÁVEL - REMOVER DEPOIS <<<


            const isMatch = await bcrypt.compare(senha, user.senha); // ESTE É O PONTO CRÍTICO

            if (!isMatch) {
                console.log(`[AUTH SERVICE DEBUG] ERRO: Senhas NÃO correspondem para "${email}".`);
                throw new Error('Credenciais inválidas.');
            }

            console.log(`[AUTH SERVICE DEBUG] SUCESSO: Senhas correspondem para "${email}".`);

            const token = jwt.sign(
                { id_usuario: user.id_usuario, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            return {
                message: 'Login bem-sucedido!',
                token,
                user: {
                    id_usuario: user.id_usuario,
                    nome: user.nome,
                    email: user.email,
                    // Garante que pontos e assiduidade_dias sempre tenham um valor para o frontend
                    pontos: user.pontos || 0,
                    assiduidade_dias: user.assiduidade_dias || 0
                }
            };
        } catch (error) {
            console.error(`[AUTH SERVICE DEBUG] Erro no loginUser para ${email}:`, error.message);
            // Re-lança o erro para ser tratado no controller (que já o faz)
            throw error;
        }
    }
};

module.exports = authService;