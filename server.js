require('dotenv').config();

const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL
        ? { rejectUnauthorized: false }
        : false
});


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
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
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

const ADMIN_PASSWORD =
    process.env.ADMIN_PASSWORD || '123456';


app.post('/api/admin/login', (req, res) => {

    const { password } = req.body;

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({
            erro: 'Senha incorreta.'
        });
    }

    res.json({
        sucesso: true,
        token: 'gc-angglobal-admin'
    });
});


function verificarAdmin(req, res, next) {

    const autorizacao =
        req.headers.authorization;

    if (
        autorizacao !==
        'Bearer gc-angglobal-admin'
    ) {
        return res.status(401).json({
            erro:
                'É necessário entrar como administrador.'
        });
    }

    next();
}


// ============================================================
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
                senha
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

        if (senha !== usuario.senha) {
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
                ativo
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
                        slug,
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
                        slug,
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
