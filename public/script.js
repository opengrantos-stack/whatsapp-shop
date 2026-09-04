let carrinho = [];
let lojaAtual = null;


// ============================================================
// UTILITÁRIOS
// ============================================================

function formatarPreco(valor) {
    return Number(valor || 0).toLocaleString("pt-PT") + " Kz";
}


// ============================================================
// AUTENTICAÇÃO
// ============================================================

function obterTokenUsuario() {
    return localStorage.getItem(
        "gc_angglobal_user_token"
    );
}


function obterUsuarioLocal() {
    const dados =
        localStorage.getItem(
            "gc_angglobal_user"
        );

    if (!dados) {
        return null;
    }

    try {
        return JSON.parse(dados);
    } catch {
        return null;
    }
}


function guardarSessao(resultado) {

    localStorage.setItem(
        "gc_angglobal_user_token",
        resultado.token
    );

    localStorage.setItem(
        "gc_angglobal_user",
        JSON.stringify(resultado.usuario)
    );
}


function limparSessao() {

    localStorage.removeItem(
        "gc_angglobal_user_token"
    );

    localStorage.removeItem(
        "gc_angglobal_user"
    );
}


// ============================================================
// INTERFACE DA CONTA
// ============================================================

function atualizarInterfaceConta() {

    const token =
        obterTokenUsuario();

    const visitante =
        document.getElementById(
            "acoesVisitante"
        );

    const utilizador =
        document.getElementById(
            "acoesUtilizador"
        );

    const secaoConta =
        document.getElementById(
            "secaoMinhaConta"
        );

    const usuario =
        obterUsuarioLocal();

    if (token && usuario) {

        if (visitante) {
            visitante.style.display =
                "none";
        }

        if (utilizador) {
            utilizador.style.display =
                "block";
        }

        const nome =
            document.getElementById(
                "nomeUtilizadorConta"
            );

        const email =
            document.getElementById(
                "emailUtilizadorConta"
            );

        if (nome) {
            nome.textContent =
                usuario.nome;
        }

        if (email) {
            email.textContent =
                usuario.email;
        }

    } else {

        if (visitante) {
            visitante.style.display =
                "block";
        }

        if (utilizador) {
            utilizador.style.display =
                "none";
        }

        if (secaoConta) {
            secaoConta.style.display =
                "none";
        }
    }
}


// ============================================================
// LOGIN
// ============================================================

async function fazerLogin() {

    const email =
        document.getElementById(
            "emailLogin"
        ).value.trim();

    const senha =
        document.getElementById(
            "senhaLogin"
        ).value;

    const mensagem =
        document.getElementById(
            "mensagemLogin"
        );

    if (!email || !senha) {

        mensagem.textContent =
            "Preencha o email e a senha.";

        return;
    }

    const botao =
        document.getElementById(
            "btnLogin"
        );

    botao.disabled = true;
    botao.textContent = "A entrar...";

    try {

        const resposta =
            await fetch(
                "/api/contas/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        email,
                        senha
                    })
                }
            );

        const resultado =
            await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro ||
                "Não foi possível entrar."
            );
        }

        guardarSessao(
            resultado
        );

        mensagem.textContent =
            "Login efetuado com sucesso.";

        document.getElementById(
            "secaoLogin"
        ).style.display = "none";

        atualizarInterfaceConta();

        await carregarMinhasLojas();

    } catch (erro) {

        mensagem.textContent =
            erro.message;

    } finally {

        botao.disabled = false;
        botao.textContent = "Entrar";
    }
}


// ============================================================
// CRIAR CONTA
// ============================================================

async function criarConta() {

    const nome =
        document.getElementById(
            "nomeCadastro"
        ).value.trim();

    const email =
        document.getElementById(
            "emailCadastro"
        ).value.trim();

    const senha =
        document.getElementById(
            "senhaCadastro"
        ).value;

    const mensagem =
        document.getElementById(
            "mensagemCadastro"
        );

    if (!nome || !email || !senha) {

        mensagem.textContent =
            "Preencha nome, email e senha.";

        return;
    }

    const botao =
        document.getElementById(
            "btnCriarConta"
        );

    botao.disabled = true;
    botao.textContent = "A criar conta...";

    try {

        const resposta =
            await fetch(
                "/api/contas/cadastro",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        nome,
                        email,
                        senha
                    })
                }
            );

        const resultado =
            await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro ||
                "Não foi possível criar a conta."
            );
        }

        guardarSessao(
            resultado
        );

        mensagem.textContent =
            "Conta criada com sucesso.";

        document.getElementById(
            "secaoCadastro"
        ).style.display = "none";

        atualizarInterfaceConta();

        await carregarMinhasLojas();

    } catch (erro) {

        mensagem.textContent =
            erro.message;

    } finally {

        botao.disabled = false;
        botao.textContent = "Criar conta";
    }
}


// ============================================================
// MINHA CONTA
// ============================================================

async function abrirMinhaConta() {

    const cabecalhoPlataforma =
        document.getElementById(
            "cabecalhoPlataforma"
        );

    // ========================================================
    // VERIFICAR SESSÃO
    // ========================================================

    const token =
        obterTokenUsuario();

    const usuario =
        obterUsuarioLocal();


    // Se não houver sessão, abrir o login.

    if (!token || !usuario) {

        const secaoLogin =
            document.getElementById(
                "secaoLogin"
            );

        const secaoCadastro =
            document.getElementById(
                "secaoCadastro"
            );

        const secaoMinhaConta =
            document.getElementById(
                "secaoMinhaConta"
            );

        const secaoPlataforma =
            document.getElementById(
                "secaoPlataforma"
            );

        const secaoLoja =
            document.getElementById(
                "secaoLoja"
            );


        if (secaoMinhaConta) {

            secaoMinhaConta.style.display =
                "none";
        }


        if (secaoLoja) {

            secaoLoja.style.display =
                "none";
        }


        if (secaoPlataforma) {

            secaoPlataforma.style.display =
                "block";
        }


        if (secaoCadastro) {

            secaoCadastro.style.display =
                "none";
        }


        if (secaoLogin) {

            secaoLogin.style.display =
                "block";
        }


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        return;
    }


    // ========================================================
    // ABRIR A CONTA
    // ========================================================

    const secaoMinhaConta =
        document.getElementById(
            "secaoMinhaConta"
        );

    const secaoPlataforma =
        document.getElementById(
            "secaoPlataforma"
        );

    const secaoLoja =
        document.getElementById(
            "secaoLoja"
        );

    const secaoLogin =
        document.getElementById(
            "secaoLogin"
        );

    const secaoCadastro =
        document.getElementById(
            "secaoCadastro"
        );


    // Fechar outras áreas.

    if (secaoPlataforma) {

        secaoPlataforma.style.display =
            "none";
    }


    if (secaoLoja) {

        secaoLoja.style.display =
            "none";
    }


    if (secaoLogin) {

        secaoLogin.style.display =
            "none";
    }


    if (secaoCadastro) {

        secaoCadastro.style.display =
            "none";
    }


    // Esconder completamente o cabeçalho
    // da plataforma enquanto a conta estiver aberta.

    if (cabecalhoPlataforma) {

        cabecalhoPlataforma.style.display =
            "none";
    }


    // Atualizar os dados da conta.

    atualizarInterfaceConta();


    // Abrir a área da conta.

    if (secaoMinhaConta) {

        secaoMinhaConta.style.display =
            "block";
    }


    // Garantir que o modo loja não permanece ativo.

    document.body.classList.remove(
        "modo-loja-aberta"
    );


    // Carregar as lojas pertencentes à conta.

    try {

        await carregarMinhasLojas();

    } catch (erro) {

        console.error(
            "Erro ao carregar as lojas da conta:",
            erro
        );
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function sairDaConta() {

    const cabecalhoPlataforma =
        document.getElementById(
            "cabecalhoPlataforma"
        );

    if (cabecalhoPlataforma) {

        cabecalhoPlataforma.style.removeProperty(
            "display"
        );
    }

    limparSessao();

    lojaAtual =
        null;

    document.getElementById(
        "secaoMinhaConta"
    ).style.display = "none";

    document.getElementById(
        "secaoLoja"
    ).style.display = "none";

    document.getElementById(
        "secaoPlataforma"
    ).style.display = "block";

    atualizarInterfaceConta();

    window.history.pushState(
        {},
        "",
        "/"
    );
}



// ============================================================
// CRIAR LOJA
// ============================================================

async function criarLoja() {

    const nome =
        document.getElementById(
            "nomeNovaLoja"
        ).value.trim();

    const descricao =
        document.getElementById(
            "descricaoNovaLoja"
        ).value.trim();

    const whatsapp =
        document.getElementById(
            "whatsappNovaLoja"
        ).value.trim();

    const mensagem =
        document.getElementById(
            "mensagemCriarLoja"
        );

    const botao =
        document.getElementById(
            "btnCriarLoja"
        );

    if (!nome) {

        mensagem.textContent =
            "Digite o nome da loja.";

        return;
    }


    const token =
        obterTokenUsuario();

    if (!token) {

        mensagem.textContent =
            "A sua sessão expirou. Entre novamente.";

        return;
    }


    botao.disabled = true;

    botao.textContent =
        "A criar loja...";

    mensagem.textContent = "";


    try {

        const resposta =
            await fetch(
                "/api/minhas-lojas",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " + token
                    },

                    body: JSON.stringify({
                        nome,
                        descricao,
                        logo: "",
                        whatsapp
                    })
                }
            );


        const resultado =
            await resposta.json();


        if (!resposta.ok) {

            throw new Error(
                resultado.erro ||
                "Não foi possível criar a loja."
            );
        }


        mensagem.textContent =
            "✅ Loja criada com sucesso!";


        document.getElementById(
            "nomeNovaLoja"
        ).value = "";


        document.getElementById(
            "descricaoNovaLoja"
        ).value = "";


        document.getElementById(
            "whatsappNovaLoja"
        ).value = "";


        await carregarMinhasLojas();


    } catch (erro) {

        console.error(
            "Erro ao criar loja:",
            erro
        );

        mensagem.textContent =
            "❌ " + erro.message;

    } finally {

        botao.disabled = false;

        botao.textContent =
            "Criar loja";
    }
}


// ============================================================
// CARREGAR MINHAS LOJAS
// ============================================================

async function carregarMinhasLojas() {

    const lista =
        document.getElementById(
            "listaMinhasLojas"
        );

    if (!lista) {
        return;
    }


    const token =
        obterTokenUsuario();


    if (!token) {

        lista.innerHTML =
            "Entre na sua conta para ver as suas lojas.";

        return;
    }


    lista.innerHTML =
        "A carregar...";


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


        const resultado =
            await resposta.json();


        if (!resposta.ok) {

            throw new Error(
                resultado.erro ||
                "Não foi possível carregar as lojas."
            );
        }


        const lojas =
            resultado.lojas || [];


        if (lojas.length === 0) {

            lista.innerHTML =
                "<p>Ainda não criou nenhuma loja.</p>";

            return;
        }


        lista.innerHTML =
            lojas.map(
                loja => {

                    const link =
                        window.location.origin +
                        "/loja/" +
                        loja.slug;


                    return `
                        <div class="card-loja-minha">

                            <h3>
                                ${loja.nome}
                            </h3>

                            <p>
                                ${loja.descricao || ""}
                            </p>

                            <p>
                                📱 ${loja.whatsapp || ""}
                            </p>

                            <button
                                class="btn"
                                type="button"
                                data-abrir-loja="${loja.id}"
                            >
                                Abrir loja
                            </button>

                            <button
                                class="btn"
                                type="button"
                                data-copiar-link
                                data-link="${link}"
                            >
                                📋 Copiar link
                            </button>

                        </div>
                    `;
                }
            ).join("");


    } catch (erro) {

        console.error(
            "Erro ao carregar minhas lojas:",
            erro
        );

        lista.innerHTML =
            "❌ " + erro.message;
    }
}



// ============================================================
// EVENTOS
// ============================================================

// ============================================================
// COPIAR TEXTO / LINK
// Compatível com Android e navegadores sem Clipboard API.
// ============================================================

async function copiarLink(textoParaCopiar) {

    if (!textoParaCopiar) {
        throw new Error(
            "Não foi possível encontrar o link da loja."
        );
    }


    // Primeiro tentar Clipboard API moderna.
    if (
        navigator.clipboard &&
        window.isSecureContext
    ) {

        try {

            await navigator.clipboard.writeText(
                textoParaCopiar
            );

            return true;

        } catch (erroClipboard) {

            console.warn(
                "Clipboard API falhou. A usar método alternativo.",
                erroClipboard
            );
        }
    }


    // Método alternativo para Android e outros navegadores.
    const area =
        document.createElement(
            "textarea"
        );

    area.value =
        textoParaCopiar;

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

    area.style.padding =
        "0";

    area.style.border =
        "0";

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


    let copiado = false;

    try {

        copiado =
            document.execCommand(
                "copy"
            );

    } catch (erro) {

        console.error(
            "Erro ao copiar link:",
            erro
        );
    }


    document.body.removeChild(
        area
    );


    if (!copiado) {

        throw new Error(
            "Não foi possível copiar o link. Tente novamente."
        );
    }


    return true;
}


document.addEventListener(
    "DOMContentLoaded",
    function () {

        const btnAbrirLogin =
            document.getElementById(
                "btnAbrirLogin"
            );

        if (btnAbrirLogin) {
            btnAbrirLogin.addEventListener(
                "click",
                function () {
                    document.getElementById(
                        "secaoLogin"
                    ).style.display = "block";

                    document.getElementById(
                        "secaoCadastro"
                    ).style.display = "none";
                }
            );
        }


        const btnAbrirCadastro =
            document.getElementById(
                "btnAbrirCadastro"
            );

        if (btnAbrirCadastro) {
            btnAbrirCadastro.addEventListener(
                "click",
                function () {
                    document.getElementById(
                        "secaoCadastro"
                    ).style.display = "block";

                    document.getElementById(
                        "secaoLogin"
                    ).style.display = "none";
                }
            );
        }


        const irParaCadastro =
            document.getElementById(
                "irParaCadastro"
            );

        if (irParaCadastro) {
            irParaCadastro.addEventListener(
                "click",
                function () {
                    document.getElementById(
                        "secaoLogin"
                    ).style.display = "none";

                    document.getElementById(
                        "secaoCadastro"
                    ).style.display = "block";
                }
            );
        }


        const irParaLogin =
            document.getElementById(
                "irParaLogin"
            );

        if (irParaLogin) {
            irParaLogin.addEventListener(
                "click",
                function () {
                    document.getElementById(
                        "secaoCadastro"
                    ).style.display = "none";

                    document.getElementById(
                        "secaoLogin"
                    ).style.display = "block";
                }
            );
        }


        const btnLogin =
            document.getElementById(
                "btnLogin"
            );

        if (btnLogin) {
            btnLogin.addEventListener(
                "click",
                fazerLogin
            );
        }


        const btnCriarConta =
            document.getElementById(
                "btnCriarConta"
            );

        if (btnCriarConta) {
            btnCriarConta.addEventListener(
                "click",
                criarConta
            );
        }


        const btnAbrirMinhaConta =
            document.getElementById(
                "btnAbrirMinhaConta"
            );

        if (btnAbrirMinhaConta) {
            btnAbrirMinhaConta.addEventListener(
                "click",
                abrirMinhaConta
            );
        }


        const btnCriarLoja =
            document.getElementById(
                "btnCriarLoja"
            );

        if (btnCriarLoja) {
            btnCriarLoja.addEventListener(
                "click",
                criarLoja
            );
        }


        const btnSair =
            document.getElementById(
                "btnSair"
            );

        if (btnSair) {
            btnSair.addEventListener(
                "click",
                sairDaConta
            );
        }


        document.addEventListener(
            "click",
            async function (evento) {

                const abrir =
                    evento.target.closest(
                        "[data-abrir-loja]"
                    );

                if (abrir) {

                    const id =
                        abrir.dataset.abrirLoja;

                    const token =
                        obterTokenUsuario();

                    if (!token) {

                        console.error(
                            "Utilizador não autenticado."
                        );

                        return;
                    }

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

                        const resultado =
                            await resposta.json();

                        if (!resposta.ok) {

                            throw new Error(
                                resultado.erro ||
                                "Não foi possível carregar a loja."
                            );
                        }

                        const lojas =
                            resultado.lojas || [];

                        const loja =
                            lojas.find(
                                item =>
                                    String(item.id) ===
                                    String(id)
                            );

                        if (!loja) {

                            throw new Error(
                                "Loja não encontrada."
                            );
                        }

                        if (
                            typeof abrirLoja ===
                            "function"
                        ) {

                            await abrirLoja(
                                loja,
                                "conta"
                            );

                        } else {

                            throw new Error(
                                "Função abrirLoja não encontrada."
                            );
                        }

                    } catch (erro) {

                        console.error(
                            "Erro ao abrir loja:",
                            erro
                        );

                        alert(
                            erro.message
                        );
                    }

                    return;
                }


                const copiar =
                    evento.target.closest(
                        "[data-copiar-link]"
                    );

                if (copiar) {

                    const link =
                        copiar.dataset.link;

                    await copiarLink(
                        link
                    );

                    copiar.textContent =
                        "✅ Link copiado";

                    setTimeout(
                        function () {
                            copiar.textContent =
                                "📋 Copiar link";
                        },
                        1500
                    );
                }
            }
        );


        atualizarInterfaceConta();

    }
);
