let produtos = [];
let lojasVitrine = [];
let lojaSelecionada = null;


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

async function abrirLoja(loja) {

    lojaSelecionada =
        loja;

    const secaoPlataforma =
        document.getElementById(
            "secaoPlataforma"
        );

    const secaoLojaAberta =
        document.getElementById(
            "secaoLoja"
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

    if (secaoLojaAberta) {

        secaoLojaAberta.style.display =
            "block";
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

    document.body.classList.remove(
        "modo-loja-aberta"
    );

    if (secaoPlataforma) {

        secaoPlataforma.style.display =
            "block";
    }

    if (secaoLojaAberta) {

        secaoLojaAberta.style.display =
            "none";
    }

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

        const resposta =
            await fetch(
                "/api/lojas/" +
                lojaId +
                "/produtos"
            );

        if (!resposta.ok) {

            throw new Error(
                "Erro ao carregar produtos da loja."
            );
        }

        const dados =
            await resposta.json();

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

                    await navigator.clipboard.writeText(
                        linkPublico
                    );

                    if (mensagem) {

                        mensagem.textContent =
                            "Link copiado com sucesso.";
                    }

                } catch (erro) {

                    inputLink.select();

                    inputLink.setSelectionRange(
                        0,
                        99999
                    );

                    document.execCommand(
                        "copy"
                    );

                    if (mensagem) {

                        mensagem.textContent =
                            "Link copiado com sucesso.";
                    }
                }
            };
    }
}



// ==================== INICIALIZAÇÃO ====================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

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
