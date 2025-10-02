// scripts/middleware/auth.js
const jwt = require('jsonwebtoken');

// A variável de ambiente JWT_SECRET é carregada pelo 'dotenv' no server.js
// e está disponível globalmente para o processo Node.js.
// É bom fazer esta checagem no início do arquivo para garantir que a variável existe.
const JWT_SECRET = process.env.JWT_SECRET; 

// Checagem crítica na inicialização do módulo.
if (!JWT_SECRET) {
    console.error("ERRO CRÍTICO: Variável de ambiente JWT_SECRET não está definida. O sistema de autenticação não funcionará corretamente. Por favor, defina JWT_SECRET no seu arquivo .env");
    // Em um ambiente de produção, você pode considerar encerrar o processo para evitar falhas inesperadas.
    // process.exit(1); 
}

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    // Espera o formato "Bearer TOKEN". O split(' ')[1] pega apenas o TOKEN.
    const token = authHeader && authHeader.split(' ')[1]; 

    if (token == null) {
        // Retorna 401 se o token não for fornecido na requisição
        return res.status(401).json({ message: 'Não autorizado: Token de autenticação não fornecido.' });
    }

    // Checagem extra para JWT_SECRET antes de usar, caso o ambiente tenha mudado.
    if (!JWT_SECRET) {
        return res.status(500).json({ message: 'Erro de configuração do servidor: JWT_SECRET ausente.' });
    }

    jwt.verify(token, JWT_SECRET, (err, decodedUser) => { // 'decodedUser' contém o payload do token
        if (err) {
            console.error('Erro na verificação do token JWT:', err.message);
            // Retorna 403 (Forbidden) para token inválido (expirado, assinatura incorreta, etc.)
            return res.status(403).json({ message: 'Não autorizado: Token de autenticação inválido ou expirado.' });
        }
        
        // ====================================================================================
        // ESTA É A LINHA AJUSTADA: Usando `id_usuario` do payload do token.
        // O `console.log` anterior confirmou que o ID está nessa propriedade.
        req.userId = decodedUser.id_usuario; 
        // ====================================================================================
        
        // Corrigido: Descomentando/Adicionando esta linha para que `req.user` seja definido
        req.user = decodedUser; // <-- AGORA req.user ESTARÁ DEFINIDO COM O PAYLOAD COMPLETO
        
        next(); // Continua para a próxima função middleware/rota na cadeia
    });
}

// Exporta um objeto com a função verifyToken para ser usada em outras partes da aplicação
module.exports = {
    verifyToken: verifyToken
};