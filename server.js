require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL
        ? { rejectUnauthorized: false }
        : false
});

async function prepararBanco() {
    if (!process.env.DATABASE_URL) {
        console.log('DATABASE_URL não configurada.');
        return;
    }

    try {
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

        await pool.query(`
            CREATE TABLE IF NOT EXISTS gc_angglobal_stores (
                id BIGSERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                descricao TEXT DEFAULT '',
                logo TEXT DEFAULT '',
                whatsapp TEXT DEFAULT '',
                ativo BOOLEAN DEFAULT TRUE,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

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
            ALTER TABLE gc_angglobal_stores
            ADD COLUMN IF NOT EXISTS vendedor_id BIGINT
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_gc_angglobal_stores_vendedor
            ON gc_angglobal_stores(vendedor_id)
        `);

        await pool.query(`
            ALTER TABLE gc_angglobal_products
            ADD COLUMN IF NOT EXISTS loja_id BIGINT
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_gc_angglobal_products_loja
            ON gc_angglobal_products(loja_id)
        `);

        console.log('Banco de dados do GC-AngGlobal preparado para múltiplas lojas.');
    } catch (erro) {
        console.error('Erro ao preparar banco:', erro.message);
    }
}

app.get('/api/produtos', async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT id, tipo, nome, descricao, preco, imagem, loja_id
            FROM gc_angglobal_products
            ORDER BY criado_em DESC
        `);

        res.json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao buscar produtos:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível carregar os produtos.'
        });
    }
});


const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';

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
    const autorizacao = req.headers.authorization;

    if (autorizacao !== 'Bearer gc-angglobal-admin') {
        return res.status(401).json({
            erro: 'É necessário entrar como administrador.'
        });
    }

    next();
}


// ==================== CONTAS DE VENDEDORES ====================

app.post('/api/vendedores/cadastro', async (req, res) => {
    try {
        const {
            nome,
            email,
            telefone,
            senha
        } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({
                erro: 'Nome, email e senha são obrigatórios.'
            });
        }

        if (senha.length < 6) {
            return res.status(400).json({
                erro: 'A senha deve ter pelo menos 6 caracteres.'
            });
        }

        const resultado = await pool.query(`
            INSERT INTO gc_angglobal_sellers
            (nome, email, telefone, senha)
            VALUES ($1, $2, $3, $4)
            RETURNING id, nome, email, telefone, ativo, criado_em
        `, [
            nome.trim(),
            email.trim().toLowerCase(),
            telefone || '',
            senha
        ]);

        res.status(201).json({
            sucesso: true,
            mensagem: 'Conta criada com sucesso.',
            vendedor: resultado.rows[0]
        });

    } catch (erro) {

        if (erro.code === '23505') {
            return res.status(409).json({
                erro: 'Este email já está registado.'
            });
        }

        console.error('Erro ao cadastrar vendedor:', erro.message);

        res.status(500).json({
            erro: 'Não foi possível criar a conta.'
        });
    }
});


app.post('/api/vendedores/login', async (req, res) => {
    try {

        const {
            email,
            senha
        } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                erro: 'Email e senha são obrigatórios.'
            });
        }

        const resultado = await pool.query(`
            SELECT id, nome, email, telefone, ativo, senha
            FROM gc_angglobal_sellers
            WHERE email = $1
            LIMIT 1
        `, [
            email.trim().toLowerCase()
        ]);

        if (resultado.rowCount === 0) {
            return res.status(401).json({
                erro: 'Email ou senha incorretos.'
            });
        }

        const vendedor = resultado.rows[0];

        if (!vendedor.ativo) {
            return res.status(403).json({
                erro: 'Esta conta está desativada.'
            });
        }

        if (senha !== vendedor.senha) {
            return res.status(401).json({
                erro: 'Email ou senha incorretos.'
            });
        }

        delete vendedor.senha;

        const token = 'gc-angglobal-seller-' + vendedor.id;

        res.json({
            sucesso: true,
            mensagem: 'Login efetuado com sucesso.',
            token,
            vendedor
        });

    } catch (erro) {

        console.error('Erro no login do vendedor:', erro.message);

        res.status(500).json({
            erro: 'Não foi possível efetuar o login.'
        });
    }
});


async function obterVendedorPorToken(req) {

    const autorizacao = req.headers.authorization;

    console.log('DEBUG AUTHORIZATION:', JSON.stringify(autorizacao));

    if (!autorizacao) {
        return null;
    }

    const prefixo = 'Bearer gc-angglobal-seller-';

    if (!autorizacao.startsWith(prefixo)) {
        return null;
    }

    const id = autorizacao.substring(prefixo.length);

    if (!/^\d+$/.test(id)) {
        return null;
    }

    const resultado = await pool.query(`
        SELECT id, nome, email, telefone, ativo
        FROM gc_angglobal_sellers
        WHERE id = $1
        LIMIT 1
    `, [id]);

    if (resultado.rowCount === 0) {
        return null;
    }

    if (!resultado.rows[0].ativo) {
        return null;
    }

    return resultado.rows[0];
}


async function verificarVendedor(req, res, next) {

    try {

        const vendedor = await obterVendedorPorToken(req);

        if (!vendedor) {
            return res.status(401).json({
                erro: 'É necessário entrar como vendedor.'
            });
        }

        req.vendedor = vendedor;

        next();

    } catch (erro) {

        console.error(
            'Erro ao verificar vendedor:',
            erro.message
        );

        res.status(500).json({
            erro: 'Não foi possível validar a conta.'
        });
    }
}


// ==================== LOJA DO VENDEDOR ====================

app.post('/api/vendedores/minha-loja', verificarVendedor, async (req, res) => {
    try {
        const {
            nome,
            descricao,
            logo,
            whatsapp
        } = req.body;

        if (!nome || !nome.trim()) {
            return res.status(400).json({
                erro: 'O nome da loja é obrigatório.'
            });
        }

        const existente = await pool.query(`
            SELECT id, nome, descricao, logo, whatsapp, ativo, criado_em
            FROM gc_angglobal_stores
            WHERE vendedor_id = $1
            LIMIT 1
        `, [req.vendedor.id]);

        if (existente.rowCount > 0) {
            return res.status(409).json({
                erro: 'Este vendedor já possui uma loja.',
                loja: existente.rows[0]
            });
        }

        const resultado = await pool.query(`
            INSERT INTO gc_angglobal_stores
            (nome, descricao, logo, whatsapp, vendedor_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, nome, descricao, logo, whatsapp, ativo, vendedor_id, criado_em
        `, [
            nome.trim(),
            descricao || '',
            logo || '',
            whatsapp || '',
            req.vendedor.id
        ]);

        res.status(201).json({
            sucesso: true,
            mensagem: 'Sua loja foi criada com sucesso.',
            loja: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro ao criar loja do vendedor:', erro.message);

        res.status(500).json({
            erro: 'Não foi possível criar sua loja.'
        });
    }
});


app.get('/api/vendedores/minha-loja', verificarVendedor, async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT id, nome, descricao, logo, whatsapp, ativo, vendedor_id, criado_em
            FROM gc_angglobal_stores
            WHERE vendedor_id = $1
            LIMIT 1
        `, [req.vendedor.id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                erro: 'Você ainda não possui uma loja.'
            });
        }

        res.json({
            sucesso: true,
            loja: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro ao buscar loja do vendedor:', erro.message);

        res.status(500).json({
            erro: 'Não foi possível carregar sua loja.'
        });
    }
});


// ==================== API DE LOJAS ====================

app.get('/api/lojas', async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT id, nome, descricao, logo, whatsapp, ativo, criado_em
            FROM gc_angglobal_stores
            WHERE ativo = TRUE
            ORDER BY criado_em DESC
        `);

        res.json(resultado.rows);
    } catch (erro) {
        console.error('ERRO REAL AO BUSCAR LOJAS:', erro);
        res.status(500).json({
            erro: 'Não foi possível carregar as lojas.'
        });
    }
});


app.post('/api/lojas', verificarAdmin, async (req, res) => {
    try {
        const {
            nome,
            descricao,
            logo,
            whatsapp
        } = req.body;

        if (!nome) {
            return res.status(400).json({
                erro: 'O nome da loja é obrigatório.'
            });
        }

        const resultado = await pool.query(`
            INSERT INTO gc_angglobal_stores
            (nome, descricao, logo, whatsapp)
            VALUES ($1, $2, $3, $4)
            RETURNING id, nome, descricao, logo, whatsapp, ativo, criado_em
        `, [
            nome,
            descricao || '',
            logo || '',
            whatsapp || ''
        ]);

        res.json({
            sucesso: true,
            mensagem: 'Loja criada com sucesso.',
            loja: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro ao criar loja:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível criar a loja.'
        });
    }
});


app.put('/api/lojas/:id', verificarAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nome,
            descricao,
            logo,
            whatsapp,
            ativo
        } = req.body;

        if (!nome) {
            return res.status(400).json({
                erro: 'O nome da loja é obrigatório.'
            });
        }

        const resultado = await pool.query(`
            UPDATE gc_angglobal_stores
            SET
                nome = $1,
                descricao = $2,
                logo = $3,
                whatsapp = $4,
                ativo = COALESCE($5, ativo)
            WHERE id = $6
            RETURNING id, nome, descricao, logo, whatsapp, ativo, criado_em
        `, [
            nome,
            descricao || '',
            logo || '',
            whatsapp || '',
            ativo,
            id
        ]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                erro: 'Loja não encontrada.'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Loja atualizada.',
            loja: resultado.rows[0]
        });

    } catch (erro) {
        console.error('Erro ao editar loja:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível editar a loja.'
        });
    }
});


app.delete('/api/lojas/:id', verificarAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(`
            UPDATE gc_angglobal_stores
            SET ativo = FALSE
            WHERE id = $1
            RETURNING id
        `, [id]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                erro: 'Loja não encontrada.'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Loja desativada.'
        });

    } catch (erro) {
        console.error('Erro ao desativar loja:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível desativar a loja.'
        });
    }
});


// Produtos por loja
app.get('/api/lojas/:id/produtos', async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(`
            SELECT id, tipo, nome, descricao, preco, imagem, loja_id
            FROM gc_angglobal_products
            WHERE loja_id = $1
            ORDER BY criado_em DESC
        `, [id]);

        res.json(resultado.rows);

    } catch (erro) {
        console.error('Erro ao buscar produtos da loja:', erro.message);
        res.status(500).json({
            erro: 'Não foi possível carregar os produtos da loja.'
        });
    }
});


app.post('/api/produtos', verificarVendedor, async (req, res) => {
    try {
        const {
            id,
            tipo,
            nome,
            descricao,
            preco,
            imagem
        } = req.body;

        if (!id || !tipo || !nome || !descricao || !preco) {
            return res.status(400).json({
                erro: 'Dados incompletos.'
            });
        }

        const loja = await pool.query(`
            SELECT id
            FROM gc_angglobal_stores
            WHERE vendedor_id = $1
              AND ativo = TRUE
            LIMIT 1
        `, [req.vendedor.id]);

        if (loja.rowCount === 0) {
            return res.status(404).json({
                erro: 'Você ainda não possui uma loja ativa.'
            });
        }

        const lojaId = loja.rows[0].id;

        await pool.query(`
            INSERT INTO gc_angglobal_products
            (id, tipo, nome, descricao, preco, imagem, loja_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id) DO UPDATE SET
                tipo = EXCLUDED.tipo,
                nome = EXCLUDED.nome,
                descricao = EXCLUDED.descricao,
                preco = EXCLUDED.preco,
                imagem = EXCLUDED.imagem,
                loja_id = EXCLUDED.loja_id
        `, [
            id,
            tipo,
            nome,
            descricao,
            preco,
            imagem || '',
            lojaId
        ]);

        res.json({
            sucesso: true,
            mensagem: 'Produto/serviço guardado.',
            loja_id: lojaId
        });

    } catch (erro) {
        console.error('ERRO AO GUARDAR PRODUTO:', erro.message);

        res.status(500).json({
            erro: 'Não foi possível guardar o produto.'
        });
    }
});


app.put('/api/produtos/:id', verificarVendedor, async (req, res) => {
    try {
        const { id } = req.params;

        const {
            tipo,
            nome,
            descricao,
            preco,
            imagem
        } = req.body;

        if (!tipo || !nome || !descricao || !preco) {
            return res.status(400).json({
                erro: 'Dados incompletos.'
            });
        }

        const loja = await pool.query(`
            SELECT id
            FROM gc_angglobal_stores
            WHERE vendedor_id = $1
              AND ativo = TRUE
            LIMIT 1
        `, [req.vendedor.id]);

        if (loja.rowCount === 0) {
            return res.status(404).json({
                erro: 'Você ainda não possui uma loja ativa.'
            });
        }

        const lojaId = loja.rows[0].id;

        const resultado = await pool.query(`
            UPDATE gc_angglobal_products
            SET
                tipo = $1,
                nome = $2,
                descricao = $3,
                preco = $4,
                imagem = $5
            WHERE id = $6
              AND loja_id = $7
            RETURNING id, tipo, nome, descricao, preco, imagem, loja_id
        `, [
            tipo,
            nome,
            descricao,
            preco,
            imagem || '',
            id,
            lojaId
        ]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                erro: 'Produto não encontrado na sua loja.'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Produto/serviço atualizado.',
            produto: resultado.rows[0]
        });

    } catch (erro) {
        console.error('ERRO AO EDITAR PRODUTO:', erro.message);

        res.status(500).json({
            erro: 'Não foi possível editar o produto/serviço.'
        });
    }
});


app.delete('/api/produtos/:id', verificarVendedor, async (req, res) => {
    try {
        const { id } = req.params;

        const loja = await pool.query(`
            SELECT id
            FROM gc_angglobal_stores
            WHERE vendedor_id = $1
              AND ativo = TRUE
            LIMIT 1
        `, [req.vendedor.id]);

        if (loja.rowCount === 0) {
            return res.status(404).json({
                erro: 'Você ainda não possui uma loja ativa.'
            });
        }

        const lojaId = loja.rows[0].id;

        const resultado = await pool.query(`
            DELETE FROM gc_angglobal_products
            WHERE id = $1
              AND loja_id = $2
            RETURNING id
        `, [id, lojaId]);

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                erro: 'Produto não encontrado na sua loja.'
            });
        }

        res.json({
            sucesso: true,
            mensagem: 'Produto/serviço eliminado.'
        });

    } catch (erro) {
        console.error('ERRO AO ELIMINAR PRODUTO:', erro.message);

        res.status(500).json({
            erro: 'Não foi possível eliminar o produto/serviço.'
        });
    }
});


app.listen(port, () => {
    console.log('Servidor a rodar em http://localhost:' + port);
});
