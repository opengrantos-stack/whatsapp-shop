# GC-AngGlobal — Licença Comercial

Plataforma de comércio online desenvolvida com Node.js, Express e PostgreSQL.

## Recursos

- Listagem de produtos e serviços
- Visualização detalhada de produtos
- Gestão de pedidos
- Integração com WhatsApp
- Painel administrativo
- Publicação, edição e eliminação de produtos e serviços
- Interface web responsiva
- PostgreSQL
- Estrutura preparada para implantação em produção

## Requisitos

- Node.js 18 ou superior
- PostgreSQL
- npm

## Instalação

1. Extraia os arquivos do projeto.
2. Abra o terminal na pasta do projeto.
3. Instale as dependências com:

npm install

4. Configure as variáveis de ambiente:

DATABASE_URL=postgresql://UTILIZADOR:SENHA@HOST:5432/NOME_DA_BASE
ADMIN_PASSWORD=SUA_SENHA_DE_ADMINISTRADOR

## Iniciar

Execute:

node server.js

Por padrão, o servidor utiliza a porta 3000.

Acesse:

http://localhost:3000

## Implantação em produção

Configure DATABASE_URL, ADMIN_PASSWORD e, quando necessário, PORT no ambiente de hospedagem.

## Segurança

A senha de administrador deve ser definida através da variável de ambiente ADMIN_PASSWORD.

Não coloque senhas, credenciais ou URLs privadas de banco de dados diretamente nos arquivos do projeto.

## Licença

Este pacote é fornecido sob licença comercial.

A compra concede ao comprador o direito de utilizar e adaptar o software de acordo com os termos da licença comercial fornecida pelo vendedor.

---

GC-AngGlobal
Commercial Release v1.1.0
