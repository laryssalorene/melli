const jwt = require('jsonwebtoken');

// <<-- NOVO: Define JWT_SECRET uma única vez no arquivo
// Deve vir de process.env.JWT_SECRET que é carregado pelo dotenv no server.js
// Removido o fallback para forçar que a variável de ambiente seja usada
const JWT_SECRET = process.env.JWT_SECRET; 

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Espera "Bearer TOKEN"

    if (token == null) {
        return res.status(401).json({ message: 'Token de autenticação não fornecido.' });
    }

    // Verifica se o secret foi carregado
    if (!JWT_SECRET) {
        console.error("ERRO CRÍTICO: JWT_SECRET não está definido no middleware de autenticação.");
        return res.status(500).json({ message: 'Configuração de segurança do servidor incompleta.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Erro na verificação do token:', err);
            // Retorna 403 para token inválido/expirado
            return res.status(403).json({ message: 'Token de autenticação inválido ou expirado.' });
        }
        
        req.user = user; // Anexa o payload do token (id_usuario) ao objeto de requisição
        next(); // Continua para a próxima função middleware/rota
    });
}

// Exporta um objeto com a função verifyToken
module.exports = {
    verifyToken: verifyToken
};