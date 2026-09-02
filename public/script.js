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

    const secao =
        document.getElementById(
            "secaoMinhaConta"
        );

    if (!obterTokenUsuario()) {
        return;
    }

    document.getElementById(
        "secaoLogin"
    ).style.display = "none";

    document.getElementById(
        "secaoCadastro"
    ).style.display = "none";

    if (secao) {
        secao.style.display =
            "block";

        secao.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    await carregarMinhasLojas();
}


// ============================================================
// MINHAS LOJAS
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
            "<p>Entre na sua conta para ver as suas lojas.</p>";
        return;
    }

    lista.innerHTML =
        "<p>A carregar as suas lojas...</p>";

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

        if (!resultado.lojas.length) {

            lista.innerHTML =
                "<p>Ainda não possui lojas.</p>";

            return;
        }

        lista.innerHTML = "";

        resultado.lojas.forEach(
            function (loja) {

                const bloco =
                    document.createElement(
                        "div"
                    );

                bloco.className =
                    "minha-loja-card";

                bloco.innerHTML = `
                    <h4>🏪 ${loja.nome}</h4>

                    <p>
                        ${loja.descricao || ""}
                    </p>

                    <button
                        class="btn"
                        type="button"
                        data-abrir-loja="${loja.id}"
                    >
                        Entrar na loja
                    </button>

                    <p>
                        🔗 ${window.location.origin}/loja/${loja.slug}
                    </p>

                    <button
                        class="btn"
                        type="button"
                        data-copiar-link="${loja.id}"
                        data-link="${window.location.origin}/loja/${loja.slug}"
                    >
                        📋 Copiar link
                    </button>
                `;

                lista.appendChild(
                    bloco
                );
            }
        );

    } catch (erro) {

        console.error(
            "Erro ao carregar minhas lojas:",
            erro
        );

        lista.innerHTML =
            "<p>Não foi possível carregar as suas lojas.</p>";
    }
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

    const token =
        obterTokenUsuario();

    if (!token) {

        mensagem.textContent =
            "Entre na sua conta primeiro.";

        return;
    }

    if (!nome) {

        mensagem.textContent =
            "Digite o nome da loja.";

        return;
    }

    const botao =
        document.getElementById(
            "btnCriarLoja"
        );

    botao.disabled = true;
    botao.textContent =
        "A criar loja...";

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
            "Loja criada com sucesso.";

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

        mensagem.textContent =
            erro.message;

    } finally {

        botao.disabled = false;
        botao.textContent =
            "Criar loja";
    }
}


// ============================================================
// COPIAR LINK
// ============================================================

async function copiarLink(link) {

    try {

        await navigator.clipboard.writeText(
            link
        );

        return true;

    } catch {

        const area =
            document.createElement(
                "textarea"
            );

        area.value =
            link;

        document.body.appendChild(
            area
        );

        area.select();

        document.execCommand(
            "copy"
        );

        area.remove();

        return true;
    }
}


// ============================================================
// SAIR
// ============================================================

function sairDaConta() {

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
// EVENTOS
// ============================================================

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

                    window.location.href =
                        "/?loja=" + id;

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
