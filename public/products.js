let produtos = [];
let lojasVitrine = [];
let lojaSelecionada = null;
let produtoEmEdicao = null;

let pedido = [];


// ==================== CARREGAR LOJAS ====================

async function carregarLojasVitrine() {

    const lista =
        document.getElementById(
            "listaLojas"
        );

    const mensagem =
        document.getElementById(
            "mensagemLojas"
        );

    if (!lista) {
        return;
    }

    lista.innerHTML =
        "A carregar lojas...";

    try {

        const resposta =
            await fetch("/api/lojas");

        const lojas =
            await resposta.json();

        if (!resposta.ok) {

            throw new Error(
                lojas.erro ||
                "Não foi possível carregar as lojas."
            );
        }

        lojasVitrine = lojas;

        lista.innerHTML = "";

        if (!lojas.length) {

            mensagem.textContent =
                "Ainda não existem lojas disponíveis.";

            return;
        }

        mensagem.textContent =
            "Clique no nome de uma loja para entrar.";

        lojas.forEach(
            function (loja) {

                const botao =
                    document.createElement(
                        "button"
                    );

                botao.type =
                    "button";

                botao.className =
                    "loja-vitrine";

                botao.textContent =
                    loja.nome;

                botao.addEventListener(
                    "click",
                    function () {

                        abrirLoja(loja);
                    }
                );

                lista.appendChild(
                    botao
                );
            }
        );

    } catch (erro) {

        console.error(
            "Erro ao carregar lojas:",
            erro
        );

        mensagem.textContent =
            "Não foi possível carregar as lojas.";

        lista.innerHTML = "";
    }
}


// ==================== ABRIR LOJA ====================

async function abrirLoja(
    loja,
    origem = "plataforma"
) {

    lojaSelecionada =
        loja;

    window.gcOrigemLoja =
        origem;

    const secaoPlataforma =
        document.getElementById(
            "secaoPlataforma"
        );

    const paginaInicialPublica =
        document.getElementById(
            "paginaInicialPublica"
        );

    if (paginaInicialPublica) {

        paginaInicialPublica.style.display =
            "none";
    }

    const secaoLojaAberta =
        document.getElementById(
            "secaoLoja"
        );

    const secaoMinhaConta =
        document.getElementById(
            "secaoMinhaConta"
        );

    const secaoGestaoLoja =
        document.getElementById(
            "secaoGestaoLoja"
        );

    const nomeLoja =
        document.getElementById(
            "nomeLojaAberta"
        );

    const descricaoLoja =
        document.getElementById(
            "descricaoLojaAberta"
        );

    document.body.classList.add(
        "modo-loja-aberta"
    );

    if (secaoPlataforma) {

        secaoPlataforma.style.display =
            "none";
    }

    if (secaoMinhaConta) {

        secaoMinhaConta.style.display =
            "none";
    }

    if (secaoLojaAberta) {

        secaoLojaAberta.style.display =
            "block";
    }

    if (secaoGestaoLoja) {

        secaoGestaoLoja.style.display =
            "none";
    }

    // ========================================================
    // VERIFICAR SE A CONTA ATUAL É DONA DESTA LOJA
    // ========================================================

    const token =
        obterTokenUsuario();

    if (token) {

        try {

            const resposta =
                await fetch(
                    "/api/minhas-lojas",
                    {
                        headers: {
                            "Authorization":
                                "Bearer " + token
                        }
                    }
                );

            if (!resposta.ok) {

                console.error(
                    "Não foi possível verificar as lojas da conta."
                );

            } else {

                const resultado =
                    await resposta.json();

                const minhasLojas =
                    resultado.lojas || [];

                const souDono =
                    minhasLojas.some(
                        minhaLoja =>
                            String(minhaLoja.id) ===
                            String(loja.id)
                    );

                console.log(
                    "Conta autenticada:",
                    obterUsuarioLocal()
                );

                console.log(
                    "Loja aberta:",
                    loja.id
                );

                console.log(
                    "Minhas lojas:",
                    minhasLojas
                );

                console.log(
                    "Sou dono desta loja?",
                    souDono
                );

                if (
                    souDono &&
                    secaoGestaoLoja
                ) {

                    secaoGestaoLoja.style.display =
                        "flex";
                }
            }

        } catch (erro) {

            console.error(
                "Erro ao verificar o dono da loja:",
                erro
            );
        }
    }

    if (nomeLoja) {

        nomeLoja.textContent =
            "🏪 " + loja.nome;
    }

    if (descricaoLoja) {

        descricaoLoja.textContent =
            loja.descricao ||
            "";
    }

    configurarLinkPublicoLoja(
        loja
    );

    await carregarProdutosDaLoja(
        loja.id
    );

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// ==================== FECHAR LOJA ====================

function voltarParaPlataforma() {

    const origem =
        window.gcOrigemLoja ||
        "plataforma";

    lojaSelecionada =
        null;

    produtos =
        [];

    const secaoPlataforma =
        document.getElementById(
            "secaoPlataforma"
        );

    const secaoLojaAberta =
        document.getElementById(
            "secaoLoja"
        );

    const secaoMinhaConta =
        document.getElementById(
            "secaoMinhaConta"
        );

    document.body.classList.remove(
        "modo-loja-aberta"
    );

    if (secaoLojaAberta) {

        secaoLojaAberta.style.display =
            "none";
    }

    // ================================================
    // VOLTAR PARA MINHA CONTA
    // ================================================

    if (origem === "conta") {

        if (secaoPlataforma) {

            secaoPlataforma.style.display =
                "none";
        }

        if (secaoMinhaConta) {

            secaoMinhaConta.style.display =
                "block";
        }

        window.gcOrigemLoja =
            "plataforma";

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        return;
    }

    // ================================================
    // VOLTAR PARA PLATAFORMA PÚBLICA
    // ================================================

    if (secaoPlataforma) {

        secaoPlataforma.style.display =
            "block";
    }

    if (secaoMinhaConta) {

        secaoMinhaConta.style.display =
            "none";
    }

    window.gcOrigemLoja =
        "plataforma";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// ==================== CARREGAR PRODUTOS ====================

async function carregarProdutosDaLoja(
    lojaId
) {

    try {

        const origem =
            window.gcOrigemLoja ||
            "plataforma";

        let url =
            "/api/lojas/" +
            lojaId +
            "/produtos";

        const opcoes =
            {};

        if (origem === "conta") {

            const token =
                obterTokenUsuario();

            if (!token) {

                throw new Error(
                    "Utilizador não autenticado."
                );
            }

            url =
                "/api/minhas-lojas/" +
                lojaId +
                "/produtos";

            opcoes.headers = {
                "Authorization":
                    "Bearer " +
                    token
            };
        }

        const resposta =
            await fetch(
                url,
                opcoes
            );

        if (!resposta.ok) {

            throw new Error(
                "Erro ao carregar produtos da loja."
            );
        }

        const resultado =
            await resposta.json();

        const dados =
            Array.isArray(resultado)
                ? resultado
                : (
                    resultado.produtos ||
                    []
                );

        produtos =
            dados.map(
                produto => ({

                    ...produto,

                    id:
                        Number(
                            produto.id
                        ),

                    preco:
                        Number(
                            produto.preco
                        ),

                    loja_id:
                        Number(
                            produto.loja_id
                        )
                })
            );

        mostrarProdutos();

    } catch (erro) {

        console.error(
            "Erro ao carregar produtos da loja:",
            erro
        );

        produtos =
            [];

        mostrarProdutos();
    }
}



// ==================== LINK PÚBLICO DA LOJA ====================

function configurarLinkPublicoLoja(loja) {

    const areaLink =
        document.getElementById(
            "areaLinkLoja"
        );

    const inputLink =
        document.getElementById(
            "linkPublicoLoja"
        );

    const btnCopiar =
        document.getElementById(
            "btnCopiarLinkLoja"
        );

    const mensagem =
        document.getElementById(
            "mensagemLinkLoja"
        );

    if (
        !areaLink ||
        !inputLink
    ) {
        return;
    }


    // Esconder por padrão.
    areaLink.style.display =
        "none";


    const utilizadorTexto =
        localStorage.getItem(
            "gc_angglobal_user"
        );

    if (!utilizadorTexto) {
        return;
    }


    let utilizador;

    try {

        utilizador =
            JSON.parse(
                utilizadorTexto
            );

    } catch (erro) {

        console.error(
            "Erro ao ler utilizador:",
            erro
        );

        return;
    }


    const vendedorId =
        Number(
            loja.vendedor_id
        );

    const utilizadorId =
        Number(
            utilizador.id
        );


    if (
        !vendedorId ||
        !utilizadorId ||
        vendedorId !== utilizadorId
    ) {
        return;
    }


    if (!loja.slug) {
        return;
    }


    const linkPublico =
        window.location.origin +
        "/loja/" +
        encodeURIComponent(
            loja.slug
        );


    inputLink.value =
        linkPublico;

    areaLink.style.display =
        "block";


    if (btnCopiar) {

        btnCopiar.onclick =
            async function () {

                try {

                    // Primeiro tentar a Clipboard API.
                    if (
                        navigator.clipboard &&
                        window.isSecureContext
                    ) {

                        await navigator.clipboard.writeText(
                            linkPublico
                        );

                    } else {

                        // Método alternativo mais compatível
                        // com Android e navegadores móveis.
                        const area =
                            document.createElement(
                                "textarea"
                            );

                        area.value =
                            linkPublico;

                        area.setAttribute(
                            "readonly",
                            ""
                        );

                        area.style.position =
                            "fixed";

                        area.style.top =
                            "0";

                        area.style.left =
                            "0";

                        area.style.width =
                            "1px";

                        area.style.height =
                            "1px";

                        area.style.opacity =
                            "0";

                        document.body.appendChild(
                            area
                        );

                        area.focus();

                        area.select();

                        area.setSelectionRange(
                            0,
                            area.value.length
                        );

                        const copiado =
                            document.execCommand(
                                "copy"
                            );

                        document.body.removeChild(
                            area
                        );

                        if (!copiado) {

                            throw new Error(
                                "Não foi possível copiar o link."
                            );
                        }
                    }


                    if (mensagem) {

                        mensagem.textContent =
                            "✓ Link copiado com sucesso.";
                    }


                } catch (erro) {

                    if (mensagem) {

                        mensagem.textContent =
                            "Não foi possível copiar automaticamente. Tente novamente.";
                    }

                    console.error(
                        "Erro ao copiar link:",
                        erro
                    );
                }
            };
    }
}



// ==================== INICIALIZAÇÃO ====================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        // ====================================================
        // GESTÃO DA LOJA
        // ====================================================

        const btnAdicionarProduto =
            document.getElementById(
                "btnAdicionarProduto"
            );

        const btnAdicionarServico =
            document.getElementById(
                "btnAdicionarServico"
            );


        function abrirFormularioPorTipo(
            tipo
        ) {

            const formulario =
                document.getElementById(
                    "formularioProduto"
                );

            const tipoProduto =
                document.getElementById(
                    "tipoProduto"
                );

            if (!formulario) {
                return;
            }


            if (tipoProduto) {

                tipoProduto.value =
                    tipo;
            }


            formulario.style.display =
                "block";


            formulario.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }


        if (btnAdicionarProduto) {

            btnAdicionarProduto.addEventListener(
                "click",
                function () {

                    abrirFormularioPorTipo(
                        "produto"
                    );
                }
            );
        }


        if (btnAdicionarServico) {

            btnAdicionarServico.addEventListener(
                "click",
                function () {

                    abrirFormularioPorTipo(
                        "servico"
                    );
                }
            );
        }


        document.addEventListener(
            "click",
            function (evento) {

                const botaoEditar =
                    evento.target.closest(
                        "[data-editar-produto]"
                    );

                if (botaoEditar) {

                    editarProduto(
                        botaoEditar.dataset.editarProduto
                    );

                    return;
                }

                const botaoExcluir =
                    evento.target.closest(
                        "[data-excluir-produto]"
                    );

                if (botaoExcluir) {

                    excluirProduto(
                        botaoExcluir.dataset.excluirProduto
                    );
                }
            }
        );


        const btnPublicarProduto =
            document.getElementById(
                "btnPublicarProduto"
            );

        if (btnPublicarProduto) {

            btnPublicarProduto.addEventListener(
                "click",
                publicarProduto
            );
        }


        const btnFinalizarPedido =
            document.getElementById(
                "btnFinalizarPedido"
            );

        if (btnFinalizarPedido) {

            btnFinalizarPedido.addEventListener(
                "click",
                finalizarPedido
            );
        }


        // ====================================================
        // MEU PEDIDO: ABRIR / FECHAR
        // ====================================================

        const btnPedido =
            document.getElementById(
                "btnPedido"
            );

        const conteudoPedido =
            document.getElementById(
                "conteudoPedido"
            );

        const setaPedido =
            document.getElementById(
                "setaPedido"
            );

        if (
            btnPedido &&
            conteudoPedido &&
            setaPedido
        ) {

            btnPedido.addEventListener(
                "click",
                function () {

                    conteudoPedido.classList.toggle(
                        "fechado"
                    );

                    setaPedido.textContent =
                        conteudoPedido.classList.contains(
                            "fechado"
                        )
                            ? "▼"
                            : "▲";
                }
            );
        }


        // ====================================================
        // BOTÕES DINÂMICOS: ADICIONAR / + / -
        // ====================================================

        document.addEventListener(
            "click",
            function (evento) {

                const adicionar =
                    evento.target.closest(
                        "[data-adicionar-pedido]"
                    );

                if (adicionar) {

                    adicionarAoPedido(
                        adicionar.dataset.adicionarPedido
                    );

                    return;
                }


                const aumentar =
                    evento.target.closest(
                        "[data-aumentar-pedido]"
                    );

                if (aumentar) {

                    alterarQuantidadePedido(
                        aumentar.dataset.aumentarPedido,
                        1
                    );

                    return;
                }


                const diminuir =
                    evento.target.closest(
                        "[data-diminuir-pedido]"
                    );

                if (diminuir) {

                    alterarQuantidadePedido(
                        diminuir.dataset.diminuirPedido,
                        -1
                    );
                }
            }
        );



        const btnVoltar =
            document.getElementById(
                "btnVoltarPlataforma"
            );

        if (btnVoltar) {

            btnVoltar.addEventListener(
                "click",
                function () {

                    window.history.pushState(
                        {},
                        "",
                        "/"
                    );

                    voltarParaPlataforma();
                }
            );
        }


        // ========================================
        // DETECTAR LINK PÚBLICO DA LOJA
        // ========================================

        const partes =
            window.location.pathname
                .split("/")
                .filter(Boolean);


        const indiceLoja =
            partes.indexOf(
                "loja"
            );


        if (
            indiceLoja !== -1 &&
            partes[
                indiceLoja + 1
            ]
        ) {

            const slug =
                decodeURIComponent(
                    partes[
                        indiceLoja + 1
                    ]
                );


            try {

                const resposta =
                    await fetch(
                        "/api/lojas/slug/" +
                        encodeURIComponent(
                            slug
                        )
                    );


                const dados =
                    await resposta.json();


                if (!resposta.ok) {

                    throw new Error(
                        dados.erro ||
                        "Não foi possível abrir esta loja."
                    );
                }


                if (
                    dados.sucesso &&
                    dados.loja
                ) {

                    await abrirLoja(
                        dados.loja
                    );

                    return;
                }


                throw new Error(
                    "Loja não encontrada."
                );

            } catch (erro) {

                console.error(
                    "Erro ao abrir loja pelo link público:",
                    erro
                );
            }
        }


        // ========================================
        // ABRIR PLATAFORMA NORMALMENTE
        // ========================================

        carregarLojasVitrine();
    }
);



// ==================== ESCAPAR HTML ====================

function escaparHTML(valor) {

    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

if (typeof escaparHTML !== "function") {

    function escaparHTML(valor) {

        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}


if (typeof formatarKz !== "function") {

    function formatarKz(valor) {

        const numero =
            Number(valor) || 0;

        return new Intl.NumberFormat(
            "pt-AO",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }
        ).format(numero) + " Kz";
    }
}


if (typeof lerImagemComoBase64 !== "function") {

    function lerImagemComoBase64(arquivo) {

        return new Promise(
            function (resolve, reject) {

                if (!arquivo) {
                    resolve("");
                    return;
                }

                const leitor =
                    new FileReader();

                leitor.onload =
                    function () {
                        resolve(
                            leitor.result || ""
                        );
                    };

                leitor.onerror =
                    function () {
                        reject(
                            new Error(
                                "Não foi possível ler a imagem."
                            )
                        );
                    };

                leitor.readAsDataURL(
                    arquivo
                );
            }
        );
    }
}


// ==================== MOSTRAR PRODUTOS ====================

function mostrarProdutos() {

    const lista =
        document.getElementById(
            "listaProdutosLoja"
        );

    if (!lista) {
        return;
    }

    lista.innerHTML =
        "";


    if (!produtos.length) {

        lista.innerHTML =
            "<p>Esta loja ainda não possui produtos ou serviços.</p>";

        return;
    }


    produtos.forEach(
        function (produto) {

            const bloco =
                document.createElement(
                    "div"
                );

            bloco.className =
                "produto-loja";


            const imagem =
                produto.imagem
                    ? `
                        <img
                            src="${produto.imagem}"
                            alt="${escaparHTML(produto.nome)}"
                            style="
                                max-width:100%;
                                width:180px;
                                border-radius:10px;
                                margin-bottom:10px;
                            "
                        >
                    `
                    : "";


            bloco.innerHTML = `

                ${imagem}

                <h4>
                    ${escaparHTML(
                        produto.nome
                    )}
                </h4>

                <p>
                    ${escaparHTML(
                        produto.descricao
                    )}
                </p>

                <p>
                    <strong>
                        ${formatarKz(
                            produto.preco
                        )}
                    </strong>
                </p>

                <p>
                    ${
                        produto.tipo ===
                        "servico"
                            ? "🛠️ Serviço"
                            : "📦 Produto"
                    }
                </p>

                <button
                    type="button"
                    class="btn"
                    data-adicionar-pedido="${produto.id}"
                >
                    Adicionar ao pedido
                </button>

                ${
                    produtoEmEdicao === null && window.gcOrigemLoja === "conta"
                        ? `
                            <div class="acoes-produto-gestao">
                                <button
                                    type="button"
                                    class="btn"
                                    data-editar-produto="${produto.id}"
                                >
                                    ✏️ Editar
                                </button>

                                <button
                                    type="button"
                                    class="btn"
                                    data-excluir-produto="${produto.id}"
                                >
                                    🗑️ Excluir
                                </button>
                            </div>
                        `
                        : ""
                }

            `;


            lista.appendChild(
                bloco
            );
        }
    );
}


// ============================================================
// EDITAR PRODUTO / SERVIÇO
// ============================================================

function editarProduto(produtoId) {

    const produto =
        produtos.find(
            function (item) {
                return Number(item.id) === Number(produtoId);
            }
        );

    if (!produto) {
        return;
    }

    produtoEmEdicao = produto;

    document.getElementById("tipoProduto").value =
        produto.tipo || "produto";

    document.getElementById("nomeProduto").value =
        produto.nome || "";

    document.getElementById("descricaoProduto").value =
        produto.descricao || "";

    document.getElementById("precoProduto").value =
        produto.preco || "";

    const inputImagem =
        document.getElementById("imagemProduto");

    if (inputImagem) {
        inputImagem.value = "";
    }

    const formulario =
        document.getElementById("formularioProduto");

    if (formulario) {
        formulario.style.display = "block";
    }

    const botao =
        document.getElementById("btnPublicarProduto");

    if (botao) {
        botao.textContent = "Salvar alterações";
    }

    const titulo =
        formulario
            ? formulario.querySelector("h3")
            : null;

    if (titulo) {
        titulo.textContent =
            "Editar produto ou serviço";
    }

    const mensagem =
        document.getElementById(
            "mensagemPublicarProduto"
        );

    if (mensagem) {
        mensagem.textContent = "";
    }

    formulario?.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


// ============================================================
// EXCLUIR PRODUTO / SERVIÇO
// ============================================================

async function excluirProduto(produtoId) {

    const produto =
        produtos.find(
            function (item) {
                return Number(item.id) === Number(produtoId);
            }
        );

    if (!produto) {
        return;
    }

    const confirmar =
        confirm(
            "Tem certeza que deseja eliminar \"" +
            produto.nome +
            "?"
        );

    if (!confirmar) {
        return;
    }

    if (!lojaSelecionada) {
        return;
    }

    const token =
        obterTokenUsuario();

    if (!token) {
        alert("Entre na sua conta para eliminar.");
        return;
    }

    try {

        const resposta =
            await fetch(
                "/api/minhas-lojas/" +
                lojaSelecionada.id +
                "/produtos/" +
                produto.id,
                {
                    method: "DELETE",

                    headers: {
                        "Authorization":
                            "Bearer " +
                            token
                    }
                }
            );

        const resultado =
            await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro ||
                "Não foi possível eliminar."
            );
        }

        produtos =
            produtos.filter(
                function (item) {
                    return Number(item.id) !==
                        Number(produto.id);
                }
            );

        mostrarProdutos();

    } catch (erro) {

        console.error(
            "Erro ao eliminar produto:",
            erro
        );

        alert(erro.message);
    }
}


// ============================================================
// ADICIONAR AO PEDIDO
// ============================================================

function adicionarAoPedido(
    produtoId
) {

    const produto =
        produtos.find(
            function (item) {

                return Number(
                    item.id
                ) === Number(
                    produtoId
                );
            }
        );

    if (!produto) {
        return;
    }


    const existente =
        pedido.find(
            function (item) {

                return Number(
                    item.id
                ) === Number(
                    produto.id
                );
            }
        );


    if (existente) {

        existente.quantidade +=
            1;

    } else {

        pedido.push({
            ...produto,
            quantidade: 1
        });
    }


    mostrarPedido();
}


// ============================================================
// ALTERAR QUANTIDADE
// ============================================================

function alterarQuantidadePedido(
    produtoId,
    alteracao
) {

    const item =
        pedido.find(
            function (produto) {

                return Number(
                    produto.id
                ) === Number(
                    produtoId
                );
            }
        );

    if (!item) {
        return;
    }


    item.quantidade +=
        alteracao;


    if (
        item.quantidade <= 0
    ) {

        pedido =
            pedido.filter(
                function (produto) {

                    return Number(
                        produto.id
                    ) !== Number(
                        produtoId
                    );
                }
            );
    }


    mostrarPedido();
}


// ============================================================
// MOSTRAR PEDIDO
// ============================================================

function calcularTotalPedido() {

    return pedido.reduce(
        function (
            total,
            item
        ) {

            return (
                total +
                (
                    Number(
                        item.preco
                    ) *
                    Number(
                        item.quantidade
                    )
                )
            );

        },
        0
    );
}


function mostrarPedido() {

    const lista =
        document.getElementById(
            "listaPedido"
        );

    if (!lista) {
        return;
    }


    if (!pedido.length) {

        lista.innerHTML =
            "<p>O seu pedido está vazio.</p>";

    } else {

        lista.innerHTML =
            "";

        pedido.forEach(
            function (item) {

                const linha =
                    document.createElement(
                        "div"
                    );

                linha.className =
                    "item-pedido";


                linha.innerHTML = `

                    <div class="item-pedido-info">

                        <strong>
                            ${escaparHTML(
                                item.nome
                            )}
                        </strong>

                        <span>
                            ${formatarKz(
                                item.preco
                            )}
                        </span>

                    </div>


                    <div class="item-pedido-controles">

                        <button
                            type="button"
                            class="btn"
                            data-diminuir-pedido="${item.id}"
                        >
                            −
                        </button>


                        <strong>
                            ${item.quantidade}
                        </strong>


                        <button
                            type="button"
                            class="btn"
                            data-aumentar-pedido="${item.id}"
                        >
                            +
                        </button>

                    </div>

                `;


                lista.appendChild(
                    linha
                );
            }
        );
    }


    const total =
        calcularTotalPedido();


    let totalElemento =
        document.getElementById(
            "totalPedido"
        );


    if (!totalElemento) {

        totalElemento =
            document.querySelector(
                "#secaoPedido h3 + div + p"
            );
    }


    if (totalElemento) {

        totalElemento.textContent =
            "TOTAL: " +
            formatarKz(
                total
            );
    }
}

// ============================================================
// PUBLICAR PRODUTO OU SERVIÇO
// ============================================================

async function lerImagemComoBase64(
    ficheiro
) {

    return new Promise(
        function (
            resolve,
            reject
        ) {

            const leitor =
                new FileReader();


            leitor.onload =
                function () {

                    resolve(
                        leitor.result
                    );
                };


            leitor.onerror =
                reject;


            leitor.readAsDataURL(
                ficheiro
            );
        }
    );
}


async function publicarProduto() {

    const mensagem =
        document.getElementById(
            "mensagemPublicarProduto"
        );

    if (!lojaSelecionada) {

        if (mensagem) {
            mensagem.textContent =
                "Abra primeiro a sua loja.";
        }

        return;
    }

    const token =
        obterTokenUsuario();

    if (!token) {

        if (mensagem) {
            mensagem.textContent =
                "Entre na sua conta.";
        }

        return;
    }

    const tipo =
        document.getElementById(
            "tipoProduto"
        ).value;

    const nome =
        document.getElementById(
            "nomeProduto"
        ).value.trim();

    const descricao =
        document.getElementById(
            "descricaoProduto"
        ).value.trim();

    const preco =
        document.getElementById(
            "precoProduto"
        ).value;

    const inputImagem =
        document.getElementById(
            "imagemProduto"
        );

    if (
        !nome ||
        !descricao ||
        preco === ""
    ) {

        if (mensagem) {
            mensagem.textContent =
                "Preencha nome, descrição e preço.";
        }

        return;
    }

    let imagem = "";

    if (
        inputImagem &&
        inputImagem.files &&
        inputImagem.files[0]
    ) {

        try {

            imagem =
                await lerImagemComoBase64(
                    inputImagem.files[0]
                );

        } catch (erro) {

            if (mensagem) {
                mensagem.textContent =
                    "Não foi possível ler a imagem.";
            }

            return;
        }
    }

    const botao =
        document.getElementById(
            "btnPublicarProduto"
        );

    if (botao) {

        botao.disabled = true;
        botao.textContent =
            "A publicar...";
    }

    try {

        const urlProduto =
        produtoEmEdicao
            ? "/api/minhas-lojas/" +
              lojaSelecionada.id +
              "/produtos/" +
              produtoEmEdicao.id
            : "/api/minhas-lojas/" +
              lojaSelecionada.id +
              "/produtos";

    const resposta =
            await fetch(
                urlProduto,
                {
                    method:
                        produtoEmEdicao
                            ? "PUT"
                            : "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " +
                            token
                    },

                    body: JSON.stringify({
                        tipo,
                        nome,
                        descricao,
                        preco:
                            Number(preco),
                        imagem
                    })
                }
            );

        const resultado =
            await resposta.json();

        if (!resposta.ok) {

            throw new Error(
                resultado.erro ||
                "Não foi possível publicar."
            );
        }

        if (resultado.produto) {

            const produtoAtualizado = {
                ...resultado.produto,
                id: Number(resultado.produto.id),
                preco: Number(resultado.produto.preco),
                loja_id: Number(resultado.produto.loja_id)
            };

            produtos = produtos.filter(
                produto =>
                    Number(produto.id) !==
                    Number(produtoAtualizado.id)
            );

            produtos.unshift(produtoAtualizado);

            mostrarProdutos();
        }

        if (produtoEmEdicao) {

            if (mensagem) {
                mensagem.textContent =
                    "✅ Alterações salvas com sucesso.";
            }

            produtoEmEdicao = null;

        } else {

            if (mensagem) {
                mensagem.textContent =
                    tipo === "servico"
                        ? "✅ Serviço publicado com sucesso."
                        : "✅ Produto publicado com sucesso.";
            }
        }

        document.getElementById(
            "nomeProduto"
        ).value = "";

        document.getElementById(
            "descricaoProduto"
        ).value = "";

        document.getElementById(
            "precoProduto"
        ).value = "";

        if (inputImagem) {
            inputImagem.value = "";
        }

        const formulario =
            document.getElementById(
                "formularioProduto"
            );

        if (formulario) {
            formulario.style.display =
                "none";
        }

        // Recarregar da base de dados para sincronizar.
        // O produto já foi mostrado acima mesmo antes desta chamada.

        try {

            await carregarProdutosDaLoja(
                lojaSelecionada.id
            );

        } catch (erroCarregar) {

            console.error(
                "Produto criado, mas não foi possível sincronizar a lista:",
                erroCarregar
            );
        }

    } catch (erro) {

        console.error(
            "Erro ao publicar:",
            erro
        );

        if (mensagem) {
            mensagem.textContent =
                erro.message;
        }

    } finally {

        if (botao) {

            botao.disabled = false;
            botao.textContent =
                "Publicar";
        }
    }
}


// ============================================================
// FINALIZAR PEDIDO
// ============================================================

async function finalizarPedido() {

    if (!lojaSelecionada) {
        return;
    }


    if (!pedido.length) {

        alert(
            "O seu pedido está vazio."
        );

        return;
    }


    const cliente_nome =
        prompt(
            "Digite o seu nome:"
        );


    if (!cliente_nome) {
        return;
    }


    const cliente_whatsapp =
        prompt(
            "Digite o seu WhatsApp:"
        );


    if (!cliente_whatsapp) {
        return;
    }


    const itens =
        pedido.map(
            function (item) {

                return {

                    produto_id:
                        item.id,

                    nome:
                        item.nome,

                    quantidade:
                        item.quantidade,

                    preco:
                        Number(
                            item.preco
                        )
                };
            }
        );


    const total =
        calcularTotalPedido();


    try {

        const resposta =
            await fetch(

                "/api/lojas/" +
                lojaSelecionada.id +
                "/pedidos",

                {
                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            cliente_nome,

                            cliente_whatsapp,

                            itens,

                            total
                        })
                }
            );


        const resultado =
            await resposta.json();


        if (!resposta.ok) {

            throw new Error(
                resultado.erro ||
                "Não foi possível finalizar o pedido."
            );
        }


        // ====================================================
        // OBTER O WHATSAPP DA LOJA
        // ====================================================

        let numeroLoja =
            String(
                lojaSelecionada.whatsapp ||
                lojaSelecionada.whatsapp_numero ||
                lojaSelecionada.telefone ||
                ""
            ).replace(
                /\D/g,
                ""
            );


        if (
            numeroLoja.startsWith(
                "00"
            )
        ) {

            numeroLoja =
                numeroLoja.slice(
                    2
                );
        }


        if (
            numeroLoja.startsWith(
                "0"
            )
        ) {

            numeroLoja =
                "244" +
                numeroLoja.slice(
                    1
                );

        } else if (
            /^9\d{8}$/.test(
                numeroLoja
            )
        ) {

            numeroLoja =
                "244" +
                numeroLoja;
        }


        if (!numeroLoja) {

            throw new Error(
                "Esta loja não tem um número de WhatsApp configurado."
            );
        }


        // ====================================================
        // CRIAR LISTA DO PEDIDO
        // ====================================================

        const linhasPedido =
            pedido
                .map(
                    function (item) {

                        const subtotal =
                            Number(
                                item.preco
                            ) *
                            Number(
                                item.quantidade
                            );


                        return (
                            "• " +
                            item.nome +
                            " — " +
                            item.quantidade +
                            " x " +
                            formatarKz(
                                item.preco
                            ) +
                            " = " +
                            formatarKz(
                                subtotal
                            )
                        );
                    }
                )
                .join(
                    "\n"
                );


        // ====================================================
        // MENSAGEM DO WHATSAPP
        // ====================================================

        const mensagemWhatsApp =
            "Olá, " +
            lojaSelecionada.nome +
            "!\n\n" +

            "Gostaria de fazer este pedido:\n\n" +

            linhasPedido +

            "\n\nTOTAL: " +
            formatarKz(
                total
            ) +

            "\n\nCliente: " +
            cliente_nome +

            "\nWhatsApp do cliente: " +
            cliente_whatsapp +

            "\n\nAguardo a confirmação do pedido.";


        const urlWhatsApp =
            "https://wa.me/" +
            numeroLoja +
            "?text=" +
            encodeURIComponent(
                mensagemWhatsApp
            );


        // ====================================================
        // LIMPAR PEDIDO
        // ====================================================

        pedido =
            [];

        mostrarPedido();


        // ====================================================
        // ABRIR WHATSAPP
        // ====================================================

        // ====================================================
        // ABRIR DIRETAMENTE O APLICATIVO WHATSAPP NO ANDROID
        // ====================================================

        const urlWhatsAppApp =
            "intent://send?phone=" +
            numeroLoja +
            "&text=" +
            encodeURIComponent(
                mensagemWhatsApp
            ) +
            "#Intent;scheme=whatsapp;" +
            "package=com.whatsapp;" +
            "end";


        window.location.href =
            urlWhatsAppApp;


    } catch (erro) {

        alert(
            erro.message
        );
    }
}

// ============================================================
// EVENTOS DA LOJA
// ============================================================

