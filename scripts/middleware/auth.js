//scripts/middleware/auth.js
const jwt = require('jsonwebtoken');

// A chave secreta deve ser carregada de uma variável de ambiente para segurança
const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura';

/**
 * Middleware para autenticar requisições usando tokens JWT.
 * @param {Object} req O objeto de requisição do Express.
 * @param {Object} res O objeto de resposta do Express.
 * @param {Function} next A próxima função de middleware na cadeia.
 */
function authenticateToken(req, res, next) {
    // 1. Tenta obter o token do cabeçalho 'Authorization'
    const authHeader = req.headers['authorization'];
    // Espera o formato 'Bearer TOKEN', então divide para pegar apenas o token
    const token = authHeader && authHeader.split(' ')[1];

    // 2. Se não houver token, retorna um erro 401 (Não Autorizado)
    if (token == null) {
        return res.status(401).json({ message: 'Token de autenticação não fornecido.' });
    }

    // 3. Tenta verificar o token
    jwt.verify(token, JWT_SECRET, (err, user) => {
        // Se houver um erro na verificação (token inválido ou expirado),
        // retorna um erro 403 (Proibido)
        if (err) {
            console.error('Erro na verificação do token:', err);
            return res.status(403).json({ message: 'Token de autenticação inválido ou expirado.' });
        }
        
        // 4. Se o token for válido, anexa a informação do usuário à requisição
        // e passa o controle para a próxima função (o controller)
        req.user = user;
        next();
    });
}

module.exports = { authenticateToken };