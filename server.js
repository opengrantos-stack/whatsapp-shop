require('dotenv').config();

const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { Resend } = require('resend');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL
        ? { rejectUnauthorized: false }
        : false
});

const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;


// ============================================================
// PROTEÇÃO DO POOL POSTGRESQL
// ============================================================

// Evita que uma ligação ociosa interrompida pelo servidor
// PostgreSQL derrube toda a aplicação Node.js.

pool.on(
    'error',
    function (erro) {

        console.error(
            'Erro numa ligação PostgreSQL ociosa:',
            erro.message
        );

    }
);


// ============================================================
// UTILITÁRIOS
// ============================================================

function criarSlug(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}


async function criarSlugUnico(nome) {
    const base = criarSlug(nome) || 'loja';

    let slug = base;
    let contador = 2;

    while (true) {
        const resultado = await pool.query(`
            SELECT id
            FROM gc_angglobal_stores
            WHERE slug = $1
            LIMIT 1
        `, [slug]);

        if (resultado.rowCount === 0) {
            return slug;
        }

        slug = `${base}-${contador}`;
        contador++;
    }
}


// ============================================================
// BASE DE DADOS
// ============================================================

async function prepararBanco() {

    if (!process.env.DATABASE_URL) {
        console.log('DATABASE_URL não configurada.');
        return;
    }

    try {

        // ----------------------------------------------------
        // CONTAS DOS UTILIZADORES
        // ----------------------------------------------------

        await pool.query(`
            CREATE TABLE IF NOT EXISTS gc_angglobal_sellers (
                id BIGSERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                telefone TEXT DEFAULT '',
                senha TEXT NOT NULL,
                ativo BOOLEAN DEFAULT TRUE,
                role TEXT DEFAULT 'user',
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            ALTER TABLE gc_angglobal_sellers
            ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
        `);

        await pool.query(`
            ALTER TABLE gc_angglobal_sellers
            ADD COLUMN IF NOT EXISTS foto_perfil TEXT DEFAULT ''
        `);


        await pool.query(`
            CREATE TABLE IF NOT EXISTS gc_angglobal_password_resets (
                id BIGSERIAL PRIMARY KEY,
                usuario_id BIGINT NOT NULL,
                token_hash TEXT UNIQUE NOT NULL,
                expira_em TIMESTAMP NOT NULL,
                usado BOOLEAN DEFAULT FALSE,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS gc_angglobal_admin_sessions (
                id BIGSERIAL PRIMARY KEY,
                usuario_id BIGINT NOT NULL,
                token_hash TEXT UNIQUE NOT NULL,
                expira_em TIMESTAMP NOT NULL,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS
            idx_gc_angglobal_admin_sessions_expira
            ON gc_angglobal_admin_sessions(expira_em)
        `);


        // ----------------------------------------------------
        // LOJAS
        // ----------------------------------------------------

        await pool.query(`
            CREATE TABLE IF NOT EXISTS gc_angglobal_stores (
                id BIGSERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                descricao TEXT DEFAULT '',
                logo TEXT DEFAULT '',
                whatsapp TEXT DEFAULT '',
                vendedor_id BIGINT,
                slug TEXT,
                ativo BOOLEAN DEFAULT TRUE,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            ALTER TABLE gc_angglobal_stores
            ADD COLUMN IF NOT EXISTS vendedor_id BIGINT
        `);

        await pool.query(`
            ALTER TABLE gc_angglobal_stores
            ADD COLUMN IF NOT EXISTS capa TEXT DEFAULT ''
        `);

        await pool.query(`
            ALTER TABLE gc_angglobal_stores
            ADD COLUMN IF NOT EXISTS slug TEXT
        `);


        // Criar slug para lojas antigas que ainda não têm.
        const lojasSemSlug = await pool.query(`
            SELECT id, nome
            FROM gc_angglobal_stores
            WHERE slug IS NULL
               OR slug = ''
        `);

        for (const loja of lojasSemSlug.rows) {

            const slug = await criarSlugUnico(loja.nome);

            await pool.query(`
                UPDATE gc_angglobal_stores
                SET slug = $1
                WHERE id = $2
            `, [
                slug,
                loja.id
            ]);
        }


        await pool.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS
            idx_gc_angglobal_stores_slug_unique
            ON gc_angglobal_stores(slug)
            WHERE slug IS NOT NULL
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS
            idx_gc_angglobal_stores_vendedor
            ON gc_angglobal_stores(vendedor_id)
        `);


        // ----------------------------------------------------
        // PRODUTOS E SERVIÇOS
        // ----------------------------------------------------

        await pool.query(`
            CREATE TABLE IF NOT EXISTS gc_angglobal_products (
                id BIGINT PRIMARY KEY,
                tipo VARCHAR(20) NOT NULL,
                nome TEXT NOT NULL,
                descricao TEXT NOT NULL,
                preco NUMERIC(15,2) NOT NULL,
                imagem TEXT DEFAULT '',
                loja_id BIGINT,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            ALTER TABLE gc_angglobal_products
            ADD COLUMN IF NOT EXISTS loja_id BIGINT
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS
            idx_gc_angglobal_products_loja
            ON gc_angglobal_products(loja_id)
        `);


        // ----------------------------------------------------
        // PEDIDOS
        // ----------------------------------------------------

        await pool.query(`
            CREATE TABLE IF NOT EXISTS gc_angglobal_orders (
                id BIGSERIAL PRIMARY KEY,
                loja_id BIGINT NOT NULL,
                cliente_id BIGINT,
                cliente_nome TEXT DEFAULT '',
                cliente_whatsapp TEXT DEFAULT '',
                itens JSONB NOT NULL DEFAULT '[]'::jsonb,
                total NUMERIC(15,2) DEFAULT 0,
                status TEXT DEFAULT 'novo',
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS
            idx_gc_angglobal_orders_loja
            ON gc_angglobal_orders(loja_id)
        `);


        // ----------------------------------------------------
        // CONFIGURAÇÕES DA PLATAFORMA
        // ----------------------------------------------------

        await pool.query(`
            CREATE TABLE IF NOT EXISTS gc_angglobal_config (
                id INTEGER PRIMARY KEY DEFAULT 1,
                logo TEXT DEFAULT ''
            )
        `);

        await pool.query(`
            INSERT INTO gc_angglobal_config (id, logo)
            VALUES (1, '')
            ON CONFLICT (id) DO NOTHING
        `);


        await pool.query(`
            CREATE TABLE IF NOT EXISTS gc_angglobal_relatorios (
                id BIGSERIAL PRIMARY KEY,
                usuario_id BIGINT,
                tipo VARCHAR(50) NOT NULL,
                assunto TEXT NOT NULL,
                descricao TEXT NOT NULL,
                imagem TEXT DEFAULT '',
                estado VARCHAR(30) DEFAULT 'novo',
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);


        console.log(
            'Banco de dados preparado para a nova arquitetura GC-AngGlobal.'
        );

    } catch (erro) {

        console.error(
            'Erro ao preparar banco:',
            erro.message
        );
    }
}


// ============================================================
// ADMINISTRADOR
// ============================================================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;


app.post('/api/admin/login', async (req, res) => {

    try {

        const { password } = req.body;

        if (!ADMIN_PASSWORD) {
            console.error('ADMIN_PASSWORD não configurada no ambiente.');
            return res.status(503).json({
                erro: 'Autenticação administrativa não configurada.'
            });
        }

        if (password !== ADMIN_PASSWORD) {
            return res.status(401).json({
                erro: 'Senha incorreta.'
            });
        }

        const administrador =
            await pool.query(`
                SELECT id
                FROM gc_angglobal_sellers
                WHERE role = 'admin'
                  AND ativo = TRUE
                LIMIT 1
            `);

        if (administrador.rowCount === 0) {
            return res.status(503).json({
                erro: 'Administrador não encontrado.'
            });
        }

        const token =
            crypto.randomBytes(32).toString('hex');

        const tokenHash =
            crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

        await pool.query(`
            DELETE FROM gc_angglobal_admin_sessions
            WHERE expira_em < NOW()
        `);

        await pool.query(`
            INSERT INTO gc_angglobal_admin_sessions
            (usuario_id, token_hash, expira_em)
            VALUES (
                $1,
                $2,
                NOW() + INTERVAL '8 hours'
            )
        `, [
            administrador.rows[0].id,
            tokenHash
        ]);

        res.json({
            sucesso: true,
            token
        });

    } catch (erro) {

        console.error(
            'Erro no login administrativo:',
            erro.message
        );

        res.status(500).json({
            erro:
                'Não foi possível efetuar o login administrativo.'
        });
    }
});


async function verificarAdmin(req, res, next) {

    try {

        const autorizacao =
            req.headers.authorization;

        if (!autorizacao || !autorizacao.startsWith('Bearer ')) {
            return res.status(403).json({
                erro: 'Acesso reservado ao administrador.'
            });
        }

        const token =
            autorizacao.substring('Bearer '.length);

        const tokenHash =
            crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

        const resultado =
            await pool.query(`
                SELECT
                    s.id,
                    s.nome,
                    s.email,
                    s.telefone,
                    s.ativo,
                    s.role,
                    s.foto_perfil
                FROM gc_angglobal_admin_sessions sess
                INNER JOIN gc_angglobal_sellers s
                    ON s.id = sess.usuario_id
                WHERE sess.token_hash = $1
                  AND sess.expira_em > NOW()
                  AND s.role = 'admin'
                  AND s.ativo = TRUE
                LIMIT 1
            `, [tokenHash]);

        if (resultado.rowCount === 0) {
            return res.status(403).json({
                erro: 'Sessão administrativa inválida ou expirada.'
            });
        }

        req.usuario =
            resultado.rows[0];

        next();

    } catch (erro) {

        console.error(
            'Erro ao validar administrador:',
            erro.message
        );

        res.status(500).json({
            erro:
                'Não foi possível validar o acesso administrativo.'
        });
    }
}

// ============================================================
// IDENTIDADE DA PLATAFORMA
// ============================================================

app.get(
    '/api/logo',
    async (req, res) => {

        try {

            const resultado = await pool.query(`
                SELECT logo
                FROM gc_angglobal_config
                WHERE id = 1
            `);

            res.json({
                sucesso: true,
                logo: resultado.rows[0]?.logo || ''
            });

        } catch (erro) {

            console.error(
                'Erro ao carregar logotipo público:',
                erro.message
            );

            res.status(500).json({
                erro:
                    'Não foi possível carregar o logotipo.'
            });
        }
    }
);


app.get(
    '/api/admin/logo',
    verificarAdmin,
    async (req, res) => {

        try {

            const resultado = await pool.query(`
                SELECT logo
                FROM gc_angglobal_config
                WHERE id = 1
            `);

            res.json({
                sucesso: true,
                logo: resultado.rows[0]?.logo || ''
            });

        } catch (erro) {

            console.error(
                'Erro ao carregar logotipo:',
                erro.message
            );

            res.status(500).json({
                erro:
                    'Não foi possível carregar o logotipo.'
            });
        }
    }
);


app.post(
    '/api/admin/logo',
    verificarAdmin,
    async (req, res) => {

        try {

            const { logo } = req.body;

            if (!logo || typeof logo !== 'string') {
                return res.status(400).json({
                    erro: 'Logotipo inválido.'
                });
            }

            await pool.query(`
                UPDATE gc_angglobal_config
                SET logo = $1
                WHERE id = 1
            `, [logo]);

            res.json({
                sucesso: true,
                mensagem: 'Logotipo guardado com sucesso.'
            });

        } catch (erro) {

            console.error(
                'Erro ao guardar logotipo:',
                erro.message
            );

            res.status(500).json({
                erro:
                    'Não foi possível guardar o logotipo.'
            });
        }
    }
);


// ============================================================
// CONTAS DOS UTILIZADORES
// ============================================================// ============================================================
// CONTAS DOS UTILIZADORES
// ============================================================

app.post('/api/contas/cadastro', async (req, res) => {

    try {

        const {
            nome,
            email,
            senha
        } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({
                erro:
                    'Nome, email e senha são obrigatórios.'
            });
        }

        if (senha.length < 6) {
            return res.status(400).json({
                erro:
                    'A senha deve ter pelo menos 6 caracteres.'
            });
        }

        const senhaHash =
            await bcrypt.hash(senha, 12);

        const resultado =
            await pool.query(`
                INSERT INTO gc_angglobal_sellers
                (nome, email, senha)
                VALUES ($1, $2, $3)
                RETURNING
                    id,
                    nome,
                    email,
                    telefone,
                    ativo,
                    criado_em
            `, [
                nome.trim(),
                email.trim().toLowerCase(),
                senhaHash
            ]);

        const usuario =
            resultado.rows[0];

        const token =
            'gc-angglobal-user-' +
            usuario.id;

        res.status(201).json({
            sucesso: true,
            mensagem:
                'Conta criada com sucesso.',
            token,
            usuario
        });

    } catch (erro) {

        if (erro.code === '23505') {
            return res.status(409).json({
                erro:
                    'Este email já está registado.'
            });
        }

        console.error(
            'Erro ao criar conta:',
            erro.message
        );

        res.status(500).json({
            erro:
                'Não foi possível criar a conta.'
        });
    }
});


app.post('/api/contas/login', async (req, res) => {

    try {

        const {
            email,
            senha
        } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                erro:
                    'Email e senha são obrigatórios.'
            });
        }

        const resultado =
            await pool.query(`
                SELECT
                    id,
                    nome,
                    email,
                    telefone,
                    ativo,
                    role,
                    foto_perfil,
                    senha
                FROM gc_angglobal_sellers
                WHERE email = $1
                LIMIT 1
            `, [
                email.trim().toLowerCase()
            ]);

        if (resultado.rowCount === 0) {
            return res.status(401).json({
                erro:
                    'Email ou senha incorretos.'
            });
        }

        const usuario =
            resultado.rows[0];

        if (!usuario.ativo) {
            return res.status(403).json({
                erro:
                    'Esta conta está desativada.'
            });
        }

        let senhaValida = false;

        // Contas novas: senha armazenada como hash bcrypt.
        if (
            typeof usuario.senha === 'string' &&
            usuario.senha.startsWith('$2')
        ) {
            senhaValida =
                await bcrypt.compare(
                    senha,
                    usuario.senha
                );
        } else {
            // Compatibilidade com contas antigas.
            senhaValida =
                senha === usuario.senha;

            // Migra automaticamente a senha antiga para hash.
            if (senhaValida) {
                const novoHash =
                    await bcrypt.hash(senha, 12);

                await pool.query(`
                    UPDATE gc_angglobal_sellers
                    SET senha = $1
                    WHERE id = $2
                `, [
                    novoHash,
                    usuario.id
                ]);
            }
        }

        if (!senhaValida) {
            return res.status(401).json({
                erro:
                    'Email ou senha incorretos.'
            });
        }

        delete usuario.senha;

        const token =
            'gc-angglobal-user-' +
            usuario.id;

        res.json({
            sucesso: true,
            mensagem:
                'Login efetuado com sucesso.',
            token,
            usuario
        });

    } catch (erro) {

        console.error(
            'Erro no login:',
            erro.message
        );

        res.status(500).json({
            erro:
                'Não foi possível efetuar o login.'
        });
    }
});



// ------------------------------------------------------------
// RECUPERAÇÃO DE PALAVRA-PASSE
// ------------------------------------------------------------

app.post('/api/contas/esqueci-senha', async (req, res) => {

    try {

        const email =
            String(req.body.email || '')
                .trim()
                .toLowerCase();

        if (!email) {
            return res.status(400).json({
                erro: 'Informe o seu email.'
            });
        }

        const resultado =
            await pool.query(`
                SELECT id
                FROM gc_angglobal_sellers
                WHERE email = $1
                  AND ativo = TRUE
                LIMIT 1
            `, [email]);

        // Resposta igual para email existente ou inexistente.
        if (resultado.rowCount === 0) {
            return res.json({
                sucesso: true,
                mensagem:
                    'Se o email estiver registado, receberá instruções para recuperar a conta.'
            });
        }

        const usuarioId =
            resultado.rows[0].id;

        const token =
            require('crypto').randomBytes(32).toString('hex');

        const tokenHash =
            require('crypto')
                .createHash('sha256')
                .update(token)
                .digest('hex');

        await pool.query(`
            UPDATE gc_angglobal_password_resets
            SET usado = TRUE
            WHERE usuario_id = $1
              AND usado = FALSE
        `, [usuarioId]);

        await pool.query(`
            INSERT INTO gc_angglobal_password_resets
                (usuario_id, token_hash, expira_em)
            VALUES
                ($1, $2, CURRENT_TIMESTAMP + INTERVAL '30 minutes')
        `, [
            usuarioId,
            tokenHash
        ]);

        const linkRecuperacao =
            'https://gc-angglobal.geracaocalueio.ao/redefinir-senha?token='
            + encodeURIComponent(token);

        const envio = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL,
            to: email,
            subject: 'Recuperação da sua palavra-passe - GC-AngGlobal',
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
                    <h2>Recuperação de palavra-passe</h2>
                    <p>Recebemos um pedido para recuperar a sua palavra-passe da GC-AngGlobal.</p>
                    <p>Use o botão abaixo para criar uma nova palavra-passe:</p>
                    <p>
                        <a href="${linkRecuperacao}"
                           style="display:inline-block;padding:12px 20px;background:#168f86;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">
                            Redefinir palavra-passe
                        </a>
                    </p>
                    <p>Este link é válido durante 30 minutos e só pode ser utilizado uma vez.</p>
                    <p>Se não solicitou esta recuperação, pode ignorar este e-mail.</p>
                </div>
            `
        });

        if (envio.error) {
            console.error('ERRO RESEND:', JSON.stringify(envio.error));
            throw new Error(envio.error.message || 'O Resend recusou o envio.');
        }

        console.log('RESEND OK:', envio.data?.id || 'sem ID');

        return res.json({
            sucesso: true,
            mensagem:
                'Se o email estiver registado, receberá instruções para recuperar a conta.'
        });

    } catch (erro) {

        console.error(
            'Erro na recuperação de palavra-passe:',
            erro.message
        );

        res.status(500).json({
            erro:
                'Não foi possível processar o pedido.'
        });
    }
});


// ------------------------------------------------------------
// REDEFINIR PALAVRA-PASSE COM TOKEN
// ------------------------------------------------------------

app.post('/api/contas/redefinir-senha', async (req, res) => {

    try {

        const token =
            String(req.body.token || '').trim();

        const novaSenha =
            String(req.body.novaSenha || '');

        if (!token || !novaSenha) {
            return res.status(400).json({
                erro:
                    'Token e nova palavra-passe são obrigatórios.'
            });
        }

        if (novaSenha.length < 6) {
            return res.status(400).json({
                erro:
                    'A nova palavra-passe deve ter pelo menos 6 caracteres.'
            });
        }

        const crypto = require('crypto');

        const tokenHash =
            crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

        const resultado =
            await pool.query(`
                SELECT id, usuario_id
                FROM gc_angglobal_password_resets
                WHERE token_hash = $1
                  AND usado = FALSE
                  AND expira_em > CURRENT_TIMESTAMP
                LIMIT 1
            `, [tokenHash]);

        if (resultado.rowCount === 0) {
            return res.status(400).json({
                erro:
                    'O link de recuperação é inválido, expirou ou já foi utilizado.'
            });
        }

        const reset =
            resultado.rows[0];

        const senhaHash =
            await bcrypt.hash(
                novaSenha,
                12
            );

        await pool.query(`
            UPDATE gc_angglobal_sellers
            SET senha = $1
            WHERE id = $2
        `, [
            senhaHash,
            reset.usuario_id
        ]);

        await pool.query(`
            UPDATE gc_angglobal_password_resets
            SET usado = TRUE
            WHERE id = $1
        `, [reset.id]);

        await pool.query(`
            UPDATE gc_angglobal_password_resets
            SET usado = TRUE
            WHERE usuario_id = $1
              AND usado = FALSE
        `, [reset.usuario_id]);

        return res.json({
            sucesso: true,
            mensagem:
                'Palavra-passe redefinida com sucesso.'
        });

    } catch (erro) {

        console.error(
            'Erro ao redefinir palavra-passe:',
            erro.message
        );

        res.status(500).json({
            erro:
                'Não foi possível redefinir a palavra-passe.'
        });
    }
});


// ------------------------------------------------------------
// ALTERAR PALAVRA-PASSE
// ------------------------------------------------------------

app.post('/api/contas/alterar-senha', async (req, res) => {

    try {

        const autorizacao =
            req.headers.authorization;

        if (!autorizacao) {
            return res.status(401).json({
                erro: 'Sessão não autorizada.'
            });
        }

        const prefixo =
            'Bearer gc-angglobal-user-';

        if (!autorizacao.startsWith(prefixo)) {
            return res.status(401).json({
                erro: 'Sessão não autorizada.'
            });
        }

        const id =
            autorizacao.substring(prefixo.length);

        if (!/^\d+$/.test(id)) {
            return res.status(401).json({
                erro: 'Sessão inválida.'
            });
        }

        const {
            senhaAtual,
            novaSenha
        } = req.body;

        if (!senhaAtual || !novaSenha) {
            return res.status(400).json({
                erro:
                    'Informe a palavra-passe atual e a nova palavra-passe.'
            });
        }

        if (novaSenha.length < 6) {
            return res.status(400).json({
                erro:
                    'A nova palavra-passe deve ter pelo menos 6 caracteres.'
            });
        }

        const resultado =
            await pool.query(`
                SELECT id, senha
                FROM gc_angglobal_sellers
                WHERE id = $1
                LIMIT 1
            `, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                erro: 'Utilizador não encontrado.'
            });
        }

        const usuario =
            resultado.rows[0];

        let senhaAtualValida = false;

        if (
            typeof usuario.senha === 'string' &&
            usuario.senha.startsWith('$2')
        ) {
            senhaAtualValida =
                await bcrypt.compare(
                    senhaAtual,
                    usuario.senha
                );
        } else {
            senhaAtualValida =
                senhaAtual === usuario.senha;
        }

        if (!senhaAtualValida) {
            return res.status(401).json({
                erro:
                    'A palavra-passe atual está incorreta.'
            });
        }

        const novoHash =
            await bcrypt.hash(novaSenha, 12);

        await pool.query(`
            UPDATE gc_angglobal_sellers
            SET senha = $1
            WHERE id = $2
        `, [
            novoHash,
            id
        ]);

        res.json({
            sucesso: true,
            mensagem:
                'Palavra-passe alterada com sucesso.'
        });

    } catch (erro) {

        console.error(
            'Erro ao alterar palavra-passe:',
            erro.message
        );

        res.status(500).json({
            erro:
                'Não foi possível alterar a palavra-passe.'
        });
    }
});



// ------------------------------------------------------------
// FOTO DE PERFIL
// ------------------------------------------------------------

app.post('/api/contas/foto-perfil', async (req, res) => {

    try {

        const autorizacao =
            req.headers.authorization;

        const prefixo =
            'Bearer gc-angglobal-user-';

        if (!autorizacao ||
            !autorizacao.startsWith(prefixo)) {
            return res.status(401).json({
                erro: 'Sessão não autorizada.'
            });
        }

        const id =
            autorizacao.substring(prefixo.length);

        if (!/^\d+$/.test(id)) {
            return res.status(401).json({
                erro: 'Sessão inválida.'
            });
        }

        const { foto } = req.body;

        if (!foto || typeof foto !== 'string') {
            return res.status(400).json({
                erro: 'Selecione uma imagem.'
            });
        }

        if (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(foto)) {
            return res.status(400).json({
                erro: 'Formato de imagem não suportado.'
            });
        }

        if (foto.length > 7 * 1024 * 1024) {
            return res.status(400).json({
                erro: 'A imagem é demasiado grande.'
            });
        }

        await pool.query(`
            UPDATE gc_angglobal_sellers
            SET foto_perfil = $1
            WHERE id = $2
        `, [
            foto,
            id
        ]);

        res.json({
            sucesso: true,
            foto
        });

    } catch (erro) {

        console.error(
            'Erro ao guardar foto de perfil:',
            erro.message
        );

        res.status(500).json({
            erro:
                'Não foi possível guardar a foto de perfil.'
        });
    }
});


// ------------------------------------------------------------
// AUTENTICAÇÃO DE UTILIZADOR
// ------------------------------------------------------------

async function obterUsuarioPorToken(req) {

    const autorizacao =
        req.headers.authorization;

    if (!autorizacao) {
        return null;
    }

    const prefixo =
        'Bearer gc-angglobal-user-';

    if (!autorizacao.startsWith(prefixo)) {
        return null;
    }

    const id =
        autorizacao.substring(
            prefixo.length
        );

    if (!/^\d+$/.test(id)) {
        return null;
    }

    const resultado =
        await pool.query(`
            SELECT
                id,
                nome,
                email,
                telefone,
                ativo,
                role,
                foto_perfil
            FROM gc_angglobal_sellers
            WHERE id = $1
            LIMIT 1
        `, [id]);

    if (resultado.rowCount === 0) {
        return null;
    }

    const usuario =
        resultado.rows[0];

    if (!usuario.ativo) {
        return null;
    }

    return usuario;
}


async function verificarUsuario(
    req,
    res,
    next
) {

    try {

        const usuario =
            await obterUsuarioPorToken(req);

        if (!usuario) {
            return res.status(401).json({
                erro:
                    'É necessário entrar na sua conta.'
            });
        }

        req.usuario =
            usuario;

        next();

    } catch (erro) {

        console.error(
            'Erro ao validar utilizador:',
            erro.message
        );

        res.status(500).json({
            erro:
                'Não foi possível validar a conta.'
        });
    }
}


// ============================================================
// MINHA CONTA
// ============================================================

app.get(
    '/api/conta',
    verificarUsuario,
    async (req, res) => {

        res.json({
            sucesso: true,
            usuario: req.usuario
        });
    }
);


// ============================================================
// MINHAS LOJAS
// ============================================================

app.get(
    '/api/minhas-lojas',
    verificarUsuario,
    async (req, res) => {

        try {

            const resultado =
                await pool.query(`
                    SELECT
                        id,
                        nome,
                        descricao,
                        logo,
                        whatsapp,
                        slug,
                        capa,
                        ativo,
                        criado_em
                    FROM gc_angglobal_stores
                    WHERE vendedor_id = $1
                    ORDER BY criado_em DESC
                `, [
                    req.usuario.id
                ]);

            res.json({
                sucesso: true,
                lojas:
                    resultado.rows
            });

        } catch (erro) {

            console.error(
                'Erro ao carregar minhas lojas:',
                erro.message
            );

            res.status(500).json({
                erro:
                    'Não foi possível carregar suas lojas.'
            });
        }
    }
);


app.post(
    '/api/minhas-lojas',
    verificarUsuario,
    async (req, res) => {

        try {

            const {
                nome,
                descricao,
                logo,
                whatsapp
            } = req.body;

            if (
                !nome ||
                !nome.trim()
            ) {
                return res.status(400).json({
                    erro:
                        'O nome da loja é obrigatório.'
                });
            }

            const slug =
                await criarSlugUnico(
                    nome
                );

            const resultado =
                await pool.query(`
                    INSERT INTO gc_angglobal_stores
                    (
                        nome,
                        descricao,
                        logo,
                        whatsapp,
                        vendedor_id,
                        slug
                    )
                    VALUES
                    ($1, $2, $3, $4, $5, $6)
                    RETURNING
                        id,
                        nome,
                        descricao,
                        logo,
                        whatsapp,
                        vendedor_id,
                        slug,
                        ativo,
                        criado_em
                `, [
                    nome.trim(),
                    descricao || '',
                    logo || '',
                    whatsapp || '',
                    req.usuario.id,
                    slug
                ]);

            const loja =
                resultado.rows[0];

            res.status(201).json({
                sucesso: true,
                mensagem:
                    'Loja criada com sucesso.',
                loja: {
                    ...loja,
                    link_publico:
                        `/loja/${loja.slug}`
                }
            });

        } catch (erro) {

            console.error(
                'Erro ao criar loja:',
                erro.message
            );

            res.status(500).json({
                erro:
                    'Não foi possível criar a loja.'
            });
        }
    }
);


// ============================================================
// GESTÃO DE UMA LOJA DO PRÓPRIO UTILIZADOR
// ============================================================

async function obterMinhaLoja(
    req,
    res,
    next
) {

    try {

        const {
            lojaId
        } = req.params;

        const resultado =
            await pool.query(`
                SELECT
                    id,
                    nome,
                    descricao,
                    logo,
                    whatsapp,
                    vendedor_id,
                    slug,
                    ativo
                FROM gc_angglobal_stores
                WHERE id = $1
                  AND vendedor_id = $2
                LIMIT 1
            `, [
                lojaId,
                req.usuario.id
            ]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                erro:
                    'Esta loja não pertence à sua conta.'
            });
        }

        req.minhaLoja =
            resultado.rows[0];

        next();

    } catch (erro) {

        console.error(
            'Erro ao validar loja:',
            erro.message
        );

        res.status(500).json({
            erro:
                'Não foi possível validar a loja.'
        });
    }
}


app.get(
    '/api/minhas-lojas/:lojaId',
    verificarUsuario,
    obterMinhaLoja,
    async (req, res) => {

        res.json({
            sucesso: true,
            loja:
                req.minhaLoja
        });
    }
);


// ============================================================
// RELATÓRIOS — ENVIO DO UTILIZADOR
// ============================================================

app.post('/api/relatorios', verificarUsuario, async (req, res) => {
    try {
        const {
            tipo,
            assunto,
            descricao,
            imagem
        } = req.body;

        if (!tipo || !assunto || !descricao) {
            return res.status(400).json({
                erro: 'Preencha o tipo, assunto e descrição.'
            });
        }

        if (imagem && !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(imagem)) {
            return res.status(400).json({
                erro: 'Formato de imagem não permitido.'
            });
        }

        if (imagem && imagem.length > 7 * 1024 * 1024) {
            return res.status(400).json({
                erro: 'A imagem é demasiado grande.'
            });
        }

        const resultado = await pool.query(`
            INSERT INTO gc_angglobal_relatorios
            (
                usuario_id,
                tipo,
                assunto,
                descricao,
                imagem
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, tipo, assunto, descricao, imagem, estado, criado_em
        `, [
            req.usuario.id,
            tipo.trim(),
            assunto.trim(),
            descricao.trim(),
            imagem || ''
        ]);

        res.status(201).json({
            sucesso: true,
            relatorio: resultado.rows[0]
        });

    } catch (erro) {
        console.error(
            'Erro ao enviar relatório:',
            erro.message
        );

        res.status(500).json({
            erro: 'Não foi possível enviar o relatório.'
        });
    }
});


// ============================================================
// RELATÓRIOS — ADMINISTRADOR
// ============================================================

app.get('/api/admin/relatorios', verificarAdmin, async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                r.id,
                r.usuario_id,
                s.nome,
                s.email,
                r.tipo,
                r.assunto,
                r.descricao,
                r.imagem,
                r.estado,
                r.criado_em
            FROM gc_angglobal_relatorios r
            LEFT JOIN gc_angglobal_sellers s
                ON s.id = r.usuario_id
            ORDER BY r.criado_em DESC
        `);

        res.json({
            sucesso: true,
            relatorios: resultado.rows
        });

    } catch (erro) {
        console.error(
            'Erro ao carregar relatórios:',
            erro.message
        );

        res.status(500).json({
            erro: 'Não foi possível carregar os relatórios.'
        });
    }
});


// ============================================================
// RELATÓRIOS — ALTERAR ESTADO
// ============================================================

app.put('/api/admin/relatorios/:id', verificarAdmin, async (req, res) => {
    try {
        const relatorioId = Number(req.params.id);
        const { estado } = req.body;

        const estadosValidos = [
            'novo',
            'em_analise',
            'aguardando_utilizador',
            'resolvido',
            'fechado'
        ];

        if (!Number.isInteger(relatorioId) || !estadosValidos.includes(estado)) {
            return res.status(400).json({
                erro: 'Estado inválido.'
            });
        }

        const resultado = await pool.query(`
            UPDATE gc_angglobal_relatorios
            SET estado = $1
            WHERE id = $2
            RETURNING id, estado
        `, [
            estado,
            relatorioId
        ]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                erro: 'Relatório não encontrado.'
            });
        }

        res.json({
            sucesso: true,
            relatorio: resultado.rows[0]
        });

    } catch (erro) {
        console.error(
            'Erro ao alterar estado do relatório:',
            erro.message
        );

        res.status(500).json({
            erro: 'Não foi possível alterar o estado.'
        });
    }
});


// ============================================================

// EDITAR DADOS DA LOJA PELO PROPRIETÁRIO
app.put('/api/minhas-lojas/:lojaId', verificarUsuario, async (req, res) => {
    try {
        const lojaId = Number(req.params.lojaId);
        const { nome, descricao, whatsapp, logo } = req.body;

        if (!nome || !String(nome).trim()) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'O nome da loja é obrigatório.'
            });
        }

        if (logo && !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(logo)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Formato de logo inválido.'
            });
        }

        if (logo && logo.length > 7 * 1024 * 1024) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A logo é demasiado grande.'
            });
        }

        const resultado = await pool.query(`
            UPDATE gc_angglobal_stores
            SET nome = $1,
                descricao = $2,
                whatsapp = $3,
                logo = $4
            WHERE id = $5
              AND vendedor_id = $6
            RETURNING id, nome, descricao, logo, whatsapp, vendedor_id, slug, ativo, capa
        `, [
            String(nome).trim(),
            descricao || '',
            whatsapp || '',
            logo || '',
            lojaId,
            req.usuario.id
        ]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Loja não encontrada ou sem permissão.'
            });
        }

        res.json({
            sucesso: true,
            loja: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro ao editar loja:', erro);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao atualizar a loja.'
        });
    }
});


// ATIVAR / DESATIVAR LOJA PELO PROPRIETÁRIO
app.put('/api/minhas-lojas/:lojaId/estado', verificarUsuario, async (req, res) => {
    try {
        const lojaId = Number(req.params.lojaId);
        const { ativo } = req.body;

        if (typeof ativo !== 'boolean') {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Estado da loja inválido.'
            });
        }

        const resultado = await pool.query(`
            UPDATE gc_angglobal_stores
            SET ativo = $1
            WHERE id = $2
              AND vendedor_id = $3
            RETURNING id, nome, ativo
        `, [
            ativo,
            lojaId,
            req.usuario.id
        ]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Loja não encontrada ou sem permissão.'
            });
        }

        res.json({
            sucesso: true,
            loja: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro ao alterar estado da loja:', erro);
        res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao alterar o estado da loja.'
        });
    }
});

// LOJAS PÚBLICAS
// ============================================================

app.get(
    '/api/lojas',
    async (req, res) => {

        try {

            const resultado =
                await pool.query(`
                    SELECT
                        id,
                        nome,
                        descricao,
                        logo,
                        whatsapp,
                        vendedor_id,
                        slug,
                        capa,
                        criado_em
                    FROM gc_angglobal_stores
                    WHERE ativo = TRUE
                    ORDER BY criado_em DESC
                `);

            res.json(
                resultado.rows.map(
                    loja => ({
                        ...loja,
                        link_publico:
                            `/loja/${loja.slug}`
                    })
                )
            );

        } catch (erro) {

            console.error(
                'Erro ao carregar lojas:',
                erro.message
            );

            res.status(500).json({
                erro:
                    'Não foi possível carregar as lojas.'
            });
        }
    }
);


app.get(
    '/api/lojas/slug/:slug',
    async (req, res) => {

        try {

            const resultado =
                await pool.query(`
                    SELECT
                        id,
                        nome,
                        descricao,
                        logo,
                        whatsapp,
                        vendedor_id,
                        slug,
                        capa,
                        criado_em
                    FROM gc_angglobal_stores
                    WHERE slug = $1
                      AND ativo = TRUE
                    LIMIT 1
                `, [
                    req.params.slug
                ]);

            if (resultado.rowCount === 0) {
                return res.status(404).json({
                    erro:
                        'Loja não encontrada.'
                });
            }

            res.json({
                sucesso: true,
                loja: {
                    ...resultado.rows[0],
                    link_publico:
                        `/loja/${resultado.rows[0].slug}`
                }
            });

        } catch (erro) {

            console.error(
                'Erro ao abrir loja:',
                erro.message
            );

            res.status(500).json({
                erro:
                    'Não foi possível abrir a loja.'
            });
        }
    }
);


// ============================================================
// PRODUTOS E SERVIÇOS PÚBLICOS DA LOJA
// ============================================================

app.get(
    '/api/lojas/:id/produtos',
    async (req, res) => {

        try {

            const resultado =
                await pool.query(`
                    SELECT
                        id,
                        tipo,
                        nome,
                        descricao,
                        preco,
                        imagem,
                        loja_id,
                        criado_em
                    FROM gc_angglobal_products
                    WHERE loja_id = $1
                    ORDER BY criado_em DESC
                `, [
                    req.params.id
                ]);

            res.json(
                resultado.rows
            );

        } catch (erro) {

            console.error(
                'Erro ao carregar produtos:',
                erro.message
            );

            res.status(500).json({
                erro:
                    'Não foi possível carregar os produtos.'
            });
        }
    }
);


// ============================================================
// PRODUTOS DA MINHA LOJA
// ============================================================

app.post('/api/minhas-lojas/:lojaId/capa', verificarUsuario, async (req, res) => {
    try {
        const lojaId = Number(req.params.lojaId);
        const { capa } = req.body;

        if (!Number.isInteger(lojaId) || !capa) {
            return res.status(400).json({ erro: 'Imagem de capa inválida.' });
        }

        if (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(capa)) {
            return res.status(400).json({ erro: 'Formato de imagem não permitido.' });
        }

        if (capa.length > 7 * 1024 * 1024) {
            return res.status(400).json({ erro: 'A imagem é demasiado grande. Máximo: 5 MB.' });
        }

        const loja = await pool.query(`
            SELECT id
            FROM gc_angglobal_stores
            WHERE id = $1 AND vendedor_id = $2
            LIMIT 1
        `, [lojaId, req.usuario.id]);

        if (loja.rows.length === 0) {
            return res.status(403).json({ erro: 'Não tem permissão para alterar esta loja.' });
        }

        await pool.query(`
            UPDATE gc_angglobal_stores
            SET capa = $1
            WHERE id = $2
        `, [capa, lojaId]);

        return res.json({
            sucesso: true,
            capa
        });

    } catch (erro) {
        console.error('Erro ao guardar capa da loja:', erro.message);
        return res.status(500).json({ erro: 'Não foi possível guardar a capa.' });
    }
});

app.get(
    '/api/minhas-lojas/:lojaId/produtos',
    verificarUsuario,
    obterMinhaLoja,
    async (req, res) => {

        try {

            const resultado =
                await pool.query(`
                    SELECT
                        id,
                        tipo,
                        nome,
                        descricao,
                        preco,
                        imagem,
                        loja_id,
                        criado_em
                    FROM gc_angglobal_products
                    WHERE loja_id = $1
                    ORDER BY criado_em DESC
                `, [
                    req.minhaLoja.id
                ]);

            res.json({
                sucesso: true,
                produtos:
                    resultado.rows
            });

        } catch (erro) {

            console.error(
                'Erro ao carregar produtos da loja:',
                erro.message
            );

            res.status(500).json({
                erro:
                    'Não foi possível carregar os produtos.'
            });
        }
    }
);


app.post(
    '/api/minhas-lojas/:lojaId/produtos',
    verificarUsuario,
    obterMinhaLoja,
    async (req, res) => {

        try {

            const {
                tipo,
                nome,
                descricao,
                preco,
                imagem
            } = req.body;

            if (
                !tipo ||
                !nome ||
                !descricao ||
                preco === undefined
            ) {
                return res.status(400).json({
                    erro:
                        'Dados incompletos.'
                });
            }

            if (
                !['produto', 'servico']
                    .includes(tipo)
            ) {
                return res.status(400).json({
                    erro:
                        'Tipo inválido.'
                });
            }

            const id =
                Date.now();

            const resultado =
                await pool.query(`
                    INSERT INTO gc_angglobal_products
                    (
                        id,
                        tipo,
                        nome,
                        descricao,
                        preco,
                        imagem,
                        loja_id
                    )
                    VALUES
                    ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING
                        id,
                        tipo,
                        nome,
                        descricao,
                        preco,
                        imagem,
                        loja_id,
                        criado_em
                `, [
                    id,
                    tipo,
                    nome.trim(),
                    descricao.trim(),
                    preco,
                    imagem || '',
                    req.minhaLoja.id
                ]);

            res.status(201).json({
                sucesso: true,
                mensagem:
                    'Produto/serviço criado com sucesso.',
                produto:
                    resultado.rows[0]
            });

        } catch (erro) {

            console.error(
                'Erro ao criar produto:',
                erro.message
            );

            res.status(500).json({
                erro:
                    'Não foi possível criar o produto.'
            });
        }
    }
);


app.put(
    '/api/minhas-lojas/:lojaId/produtos/:produtoId',
    verificarUsuario,
    obterMinhaLoja,
    async (req, res) => {

        try {

            const {
                tipo,
                nome,
                descricao,
                preco,
                imagem
            } = req.body;

            const resultado =
                await pool.query(`
                    UPDATE gc_angglobal_products
                    SET
                        tipo = $1,
                        nome = $2,
                        descricao = $3,
                        preco = $4,
                        imagem = $5
                    WHERE id = $6
                      AND loja_id = $7
                    RETURNING *
                `, [
                    tipo,
                    nome,
                    descricao,
                    preco,
                    imagem || '',
                    req.params.produtoId,
                    req.minhaLoja.id
                ]);

            if (resultado.rowCount === 0) {
                return res.status(404).json({
                    erro:
                        'Produto não encontrado nesta loja.'
                });
            }

            res.json({
                sucesso: true,
                produto:
                    resultado.rows[0]
            });

        } catch (erro) {

            console.error(
                'Erro ao editar produto:',
                erro.message
            );

            res.status(500).json({
                erro:
                    'Não foi possível editar o produto.'
            });
        }
    }
);


app.delete(
    '/api/minhas-lojas/:lojaId/produtos/:produtoId',
    verificarUsuario,
    obterMinhaLoja,
    async (req, res) => {

        try {

            const resultado =
                await pool.query(`
                    DELETE FROM gc_angglobal_products
                    WHERE id = $1
                      AND loja_id = $2
                    RETURNING id
                `, [
                    req.params.produtoId,
                    req.minhaLoja.id
                ]);

            if (resultado.rowCount === 0) {
                return res.status(404).json({
                    erro:
                        'Produto não encontrado nesta loja.'
                });
            }

            res.json({
                sucesso: true,
                mensagem:
                    'Produto eliminado.'
            });

        } catch (erro) {

            console.error(
                'Erro ao eliminar produto:',
                erro.message
            );

            res.status(500).json({
                erro:
                    'Não foi possível eliminar o produto.'
            });
        }
    }
);


// ============================================================
// PEDIDOS POR LOJA
// ============================================================

app.post(
    '/api/lojas/:id/pedidos',
    async (req, res) => {

        try {

            const {
                cliente_nome,
                cliente_whatsapp,
                itens,
                total
            } = req.body;

            if (
                !Array.isArray(itens) ||
                itens.length === 0
            ) {
                return res.status(400).json({
                    erro:
                        'O pedido está vazio.'
                });
            }

            const loja =
                await pool.query(`
                    SELECT id
                    FROM gc_angglobal_stores
                    WHERE id = $1
                      AND ativo = TRUE
                    LIMIT 1
                `, [
                    req.params.id
                ]);

            if (loja.rowCount === 0) {
                return res.status(404).json({
                    erro:
                        'Loja não encontrada.'
                });
            }

            let clienteId =
                null;

            const usuario =
                await obterUsuarioPorToken(
                    req
                );

            if (usuario) {
                clienteId =
                    usuario.id;
            }

            const resultado =
                await pool.query(`
                    INSERT INTO gc_angglobal_orders
                    (
                        loja_id,
                        cliente_id,
                        cliente_nome,
                        cliente_whatsapp,
                        itens,
                        total
                    )
                    VALUES
                    ($1, $2, $3, $4, $5, $6)
                    RETURNING *
                `, [
                    req.params.id,
                    clienteId,
                    cliente_nome || '',
                    cliente_whatsapp || '',
                    JSON.stringify(itens),
                    total || 0
                ]);

            res.status(201).json({
                sucesso: true,
                pedido:
                    resultado.rows[0]
            });

        } catch (erro) {

            console.error(
                'Erro ao criar pedido:',
                erro.message
            );

            res.status(500).json({
                erro:
                    'Não foi possível criar o pedido.'
            });
        }
    }
);


app.get(
    '/api/minhas-lojas/:lojaId/pedidos',
    verificarUsuario,
    obterMinhaLoja,
    async (req, res) => {

        try {

            const resultado =
                await pool.query(`
                    SELECT *
                    FROM gc_angglobal_orders
                    WHERE loja_id = $1
                    ORDER BY criado_em DESC
                `, [
                    req.minhaLoja.id
                ]);

            res.json({
                sucesso: true,
                pedidos:
                    resultado.rows
            });

        } catch (erro) {

            console.error(
                'Erro ao carregar pedidos:',
                erro.message
            );

            res.status(500).json({
                erro:
                    'Não foi possível carregar os pedidos.'
            });
        }
    }
);


// ============================================================
// ADMINISTRAÇÃO DA PLATAFORMA
// ============================================================

app.get(
    '/api/admin/lojas',
    verificarAdmin,
    async (req, res) => {

        try {

            const resultado =
                await pool.query(`
                    SELECT
                        lojas.id,
                        lojas.nome,
                        lojas.descricao,
                        lojas.logo,
                        lojas.whatsapp,
                        lojas.slug,
                        lojas.ativo,
                        lojas.criado_em,
                        usuarios.nome AS dono_nome,
                        usuarios.email AS dono_email
                    FROM gc_angglobal_stores lojas
                    LEFT JOIN gc_angglobal_sellers usuarios
                        ON usuarios.id =
                           lojas.vendedor_id
                    ORDER BY lojas.criado_em DESC
                `);

            res.json({
                sucesso: true,
                lojas:
                    resultado.rows
            });

        } catch (erro) {

            console.error(
                'Erro ao carregar lojas para admin:',
                erro.message
            );

            res.status(500).json({
                erro:
                    'Não foi possível carregar as lojas.'
            });
        }
    }
);


app.patch(
    '/api/admin/lojas/:id/status',
    verificarAdmin,
    async (req, res) => {

        try {

            const {
                ativo
            } = req.body;

            const resultado =
                await pool.query(`
                    UPDATE gc_angglobal_stores
                    SET ativo = $1
                    WHERE id = $2
                    RETURNING
                        id,
                        nome,
                        ativo
                `, [
                    !!ativo,
                    req.params.id
                ]);

            if (resultado.rowCount === 0) {
                return res.status(404).json({
                    erro:
                        'Loja não encontrada.'
                });
            }

            res.json({
                sucesso: true,
                loja:
                    resultado.rows[0]
            });

        } catch (erro) {

            console.error(
                'Erro ao atualizar loja:',
                erro.message
            );

            res.status(500).json({
                erro:
                    'Não foi possível atualizar a loja.'
            });
        }
    }
);


// ============================================================
// ADMIN — GERIR PRODUTOS / SERVIÇOS
// ============================================================

app.delete(
    '/api/admin/lojas/:lojaId/produtos/:produtoId',
    verificarAdmin,
    async (req, res) => {

        try {

            const resultado =
                await pool.query(
                    `
                    DELETE FROM gc_angglobal_products
                    WHERE id = $1
                      AND loja_id = $2
                    RETURNING id, nome
                    `,
                    [
                        req.params.produtoId,
                        req.params.lojaId
                    ]
                );

            if (resultado.rowCount === 0) {

                return res.status(404).json({
                    erro:
                        'Produto ou serviço não encontrado nesta loja.'
                });
            }

            res.json({
                sucesso: true,
                mensagem:
                    'Produto/serviço eliminado.',
                produto:
                    resultado.rows[0]
            });

        } catch (erro) {

            console.error(
                'Erro ao eliminar produto como admin:',
                erro.message
            );

            res.status(500).json({
                erro:
                    'Não foi possível eliminar o produto/serviço.'
            });
        }
    }
);


// ============================================================
// ROTAS PÚBLICAS DO FRONTEND
// ============================================================

app.use(
    express.static(
        path.join(
            __dirname,
            'public'
        )
    )
);


// A SPA também abre links públicos de lojas.
app.get(
    '/loja/:slug',
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                'public',
                'index.html'
            )
        );
    }
);


// ============================================================
// INICIAR SERVIDOR
// ============================================================

prepararBanco()
    .then(() => {

        app.listen(
            port,
            () => {

                console.log(
                    'GC-AngGlobal a rodar em http://localhost:' +
                    port
                );
            }
        );

    })
    .catch(
        erro => {

            console.error(
                'Erro ao iniciar:',
                erro
            );

            process.exit(1);
        }
    );
