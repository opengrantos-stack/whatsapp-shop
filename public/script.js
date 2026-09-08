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


async function sincronizarConta() {

    const token =
        obterTokenUsuario();

    if (!token) {
        return;
    }

    try {

        const resposta =
            await fetch(
                "/api/conta",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        if (!resposta.ok) {

            if (resposta.status === 401) {
                limparSessao();
            }

            return;
        }

        const resultado =
            await resposta.json();

        if (
            resultado.sucesso &&
            resultado.usuario
        ) {
            localStorage.setItem(
                "gc_angglobal_user",
                JSON.stringify(
                    resultado.usuario
                )
            );

            atualizarInterfaceConta();
        }

    } catch (erro) {

        console.error(
            "Erro ao sincronizar conta:",
            erro
        );
    }
}


// ============================================================
// ADMINISTRAÇÃO DA PLATAFORMA
// ============================================================

async function guardarLogoAdmin() {

    const input =
        document.getElementById("adminLogoInput");

    const preview =
        document.getElementById("adminLogoPreview");

    const mensagem =
        document.getElementById("adminLogoMensagem");

    const token =
        obterTokenUsuario();

    if (!token) {
        mensagem.textContent =
            "❌ Sessão administrativa não encontrada.";
        return;
    }

    if (!input || !input.files || !input.files[0]) {
        mensagem.textContent =
            "⚠️ Selecione um logotipo primeiro.";
        return;
    }

    const ficheiro = input.files[0];

    if (!["image/png", "image/jpeg", "image/webp"].includes(ficheiro.type)) {
        mensagem.textContent =
            "❌ Formato inválido. Use PNG, JPG ou WebP.";
        return;
    }

    if (ficheiro.size > 5 * 1024 * 1024) {
        mensagem.textContent =
            "❌ O logotipo deve ter no máximo 5 MB.";
        return;
    }

    mensagem.textContent =
        "⏳ A guardar logotipo...";

    const leitor = new FileReader();

    leitor.onload = async function () {

        try {

            const resposta =
                await fetch(
                    "/api/admin/logo",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": "Bearer " + token
                        },
                        body: JSON.stringify({
                            logo: leitor.result
                        })
                    }
                );

            const dados =
                await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.erro ||
                    "Não foi possível guardar o logotipo."
                );
            }

            if (preview) {
                preview.src =
                    leitor.result;
            }

            mensagem.textContent =
                "✅ Logotipo guardado com sucesso.";

        } catch (erro) {

            console.error(
                "Erro ao guardar logotipo:",
                erro
            );

            mensagem.textContent =
                "❌ " + erro.message;
        }
    };

    leitor.onerror = function () {
        mensagem.textContent =
            "❌ Não foi possível ler a imagem.";
    };

    leitor.readAsDataURL(ficheiro);
}


async function carregarLogoPlataforma() {

    const logo =
        document.getElementById(
            "logoPlataforma"
        );

    if (!logo) {
        return;
    }

    try {

        const resposta =
            await fetch("/api/logo");

        const dados =
            await resposta.json();

        if (
            resposta.ok &&
            dados.logo
        ) {
            logo.src =
                dados.logo;

            logo.style.visibility =
                "visible";
        } else {
            logo.style.visibility =
                "visible";
        }

    } catch (erro) {

        console.error(
            "Erro ao carregar logotipo da plataforma:",
            erro
        );
    }
}


async function carregarLogoAdmin() {

    const token =
        obterTokenUsuario();

    const preview =
        document.getElementById(
            "adminLogoPreview"
        );

    if (!token || !preview) {
        return;
    }

    try {

        const resposta =
            await fetch(
                "/api/admin/logo",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        const dados =
            await resposta.json();

        if (
            resposta.ok &&
            dados.logo
        ) {
            preview.src =
                dados.logo;
        }

    } catch (erro) {

        console.error(
            "Erro ao carregar logotipo:",
            erro
        );
    }
}


async function abrirAdministracao() {

    const token =
        obterTokenUsuario();

    const usuario =
        obterUsuarioLocal();

    if (
        !token ||
        !usuario ||
        usuario.role !== "admin"
    ) {
        alert(
            "Acesso reservado ao administrador."
        );
        return;
    }

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

    const secaoAdmin =
        document.getElementById(
            "secaoAdmin"
        );

    esconderPaginaPublica();

    if (secaoMinhaConta) {
        secaoMinhaConta.style.display =
            "none";
    }

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

    if (secaoAdmin) {
        secaoAdmin.style.display =
            "block";
    }

    document.body.classList.remove(
        "modo-loja-aberta"
    );

    await carregarLogoAdmin();

    await carregarLojasAdmin();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


async function carregarLojasAdmin() {

    const token =
        obterTokenUsuario();

    const lista =
        document.getElementById(
            "adminListaLojas"
        );

    const resumo =
        document.getElementById(
            "adminResumo"
        );

    if (!lista) {
        return;
    }

    lista.innerHTML =
        "A carregar lojas...";

    try {

        const resposta =
            await fetch(
                "/api/admin/lojas",
                {
                    headers: {
                        Authorization:
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

        if (resumo) {
            resumo.textContent =
                "Total de lojas: " +
                lojas.length;
        }

        if (lojas.length === 0) {
            lista.innerHTML =
                "<p>Nenhuma loja cadastrada.</p>";
            return;
        }

        lista.innerHTML =
            lojas.map(
                loja => `
                    <div class="card-admin-loja">
                        <h3>${loja.nome}</h3>

                        <p>
                            Dono: ${loja.dono_nome || "—"}
                        </p>

                        <p>
                            Email: ${loja.dono_email || "—"}
                        </p>

                        <p>
                            Status: ${
                                loja.ativo
                                    ? "🟢 Ativa"
                                    : "🔴 Desativada"
                            }
                        </p>

                        <button
                            type="button"
                            class="btn"
                            data-admin-abrir-loja="${loja.id}"
                            data-admin-loja-slug="${loja.slug}"
                        >
                            🏪 Abrir loja
                        </button>

                        <button
                            type="button"
                            class="btn"
                            data-admin-loja-id="${loja.id}"
                            data-admin-loja-status="${
                                loja.ativo
                                    ? "false"
                                    : "true"
                            }"
                        >
                            ${
                                loja.ativo
                                    ? "🚫 Desativar"
                                    : "✅ Ativar"
                            }
                        </button>
                    </div>
                `
            ).join("");

    } catch (erro) {

        console.error(
            "Erro ao carregar lojas admin:",
            erro
        );

        lista.innerHTML =
            "<p>❌ " +
            erro.message +
            "</p>";
    }
}


async function alterarStatusLojaAdmin(
    lojaId,
    ativo
) {

    const token =
        obterTokenUsuario();

    try {

        const resposta =
            await fetch(
                "/api/admin/lojas/" +
                lojaId +
                "/status",
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization:
                            "Bearer " + token
                    },

                    body: JSON.stringify({
                        ativo:
                            ativo === "true" ||
                            ativo === true
                    })
                }
            );

        const resultado =
            await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro ||
                "Não foi possível alterar o estado da loja."
            );
        }

        await carregarLojasAdmin();

    } catch (erro) {

        alert(
            "❌ " +
            erro.message
        );
    }
}


function sairDaAdministracao() {

    const secaoAdmin =
        document.getElementById(
            "secaoAdmin"
        );

    if (secaoAdmin) {
        secaoAdmin.style.display =
            "none";
    }

    abrirMinhaConta();
}


// ============================================================
// NAVEGAÇÃO DA PÁGINA PÚBLICA
// ============================================================

function mostrarPaginaInicialPublica() {

    const paginaInicial =
        document.getElementById(
            "paginaInicialPublica"
        );

    const secaoPlataforma =
        document.getElementById(
            "secaoPlataforma"
        );


    if (paginaInicial) {

        paginaInicial.style.display =
            "block";
    }


    if (secaoPlataforma) {

        secaoPlataforma.style.display =
            "none";
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function mostrarExplorarLojas() {

    const paginaInicial =
        document.getElementById(
            "paginaInicialPublica"
        );

    const secaoPlataforma =
        document.getElementById(
            "secaoPlataforma"
        );


    if (paginaInicial) {

        paginaInicial.style.display =
            "none";
    }


    if (secaoPlataforma) {

        secaoPlataforma.style.display =
            "block";
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function esconderPaginaPublica() {

    const paginaInicial =
        document.getElementById(
            "paginaInicialPublica"
        );

    const secaoPlataforma =
        document.getElementById(
            "secaoPlataforma"
        );


    if (paginaInicial) {

        paginaInicial.style.display =
            "none";
    }


    if (secaoPlataforma) {

        secaoPlataforma.style.display =
            "none";
    }
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

    const areaAdministracao =
        document.getElementById(
            "areaAdministracao"
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

        const foto =
            document.getElementById(
                "fotoPerfilConta"
            );

        if (nome) {
            nome.textContent =
                usuario.nome;
        }

        if (email) {
            email.textContent =
                usuario.email;
        }

        if (foto) {
            if (usuario.foto_perfil) {
                foto.src =
                    usuario.foto_perfil;
            } else {
                foto.removeAttribute("src");
            }
        }

        if (areaAdministracao) {
            areaAdministracao.style.display =
                usuario.role === "admin"
                    ? "block"
                    : "none";
        }

    } else {

        if (areaAdministracao) {
            areaAdministracao.style.display =
                "none";
        }

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

    esconderPaginaPublica();

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

    mostrarPaginaInicialPublica();

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

    const lista = document.getElementById("listaMinhasLojas");

    if (!lista) return;

    const token = obterTokenUsuario();

    if (!token) {
        lista.innerHTML = "Entre na sua conta para ver as suas lojas.";
        return;
    }

    lista.innerHTML = "A carregar...";

    try {

        const resposta = await fetch("/api/minhas-lojas", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro || "Não foi possível carregar as lojas."
            );
        }

        const lojas = resultado.lojas || [];

        window.minhasLojas = lojas;

        if (lojas.length === 0) {
            lista.innerHTML = "<p>Ainda não criou nenhuma loja.</p>";
            return;
        }

        lista.innerHTML = lojas.map(loja => {

            const link =
                window.location.origin +
                "/loja/" +
                loja.slug;

            return `
                <div class="card-loja-minha">

                    <div class="capa-loja-minha">
                        ${
                            loja.capa
                                ? `<img src="${loja.capa}" alt="Capa da loja">`
                                : `<div class="sem-capa-loja">🖼️ Sem foto de capa</div>`
                        }
                    </div>

                    <h3 style="margin-top:12px;">
                        ${loja.nome}
                    </h3>

                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0;">

                        <button
                            type="button"
                            class="btn"
                            data-editar-loja="${loja.id}"
                        >
                            ✏️ Editar loja
                        </button>

                        <button
                            type="button"
                            class="btn"
                            data-alterar-estado-loja="${loja.id}"
                        >
                            ${
                                loja.ativo
                                    ? "⏸️ Desativar loja"
                                    : "▶️ Reativar loja"
                            }
                        </button>

                    </div>

                    <p>
                        ${loja.descricao || ""}
                    </p>

                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">

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

                </div>
            `;

        }).join("");

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

        // ====================================================
        // BOTÕES DA PÁGINA PRINCIPAL
        // ====================================================

        const btnHeroExplorar =
            document.getElementById(
                "btnHeroExplorar"
            );


        if (btnHeroExplorar) {

            btnHeroExplorar.addEventListener(
                "click",
                function () {

                    mostrarExplorarLojas();

                }
            );
        }


        if (btnHeroCriarConta) {

            btnHeroCriarConta.addEventListener(
                "click",
                function () {

                    const secaoCadastro =
                        document.getElementById(
                            "secaoCadastro"
                        );

                    if (!secaoCadastro) {
                        return;
                    }


                    secaoCadastro.style.display =
                        "block";


                    secaoCadastro.scrollIntoView(
                        {
                            behavior:
                                "smooth",
                            block:
                                "start"
                        }
                    );


                    const campoNome =
                        document.getElementById(
                            "nomeCadastro"
                        );

                    if (campoNome) {

                        setTimeout(
                            function () {

                                campoNome.focus();

                            },
                            400
                        );
                    }
                }
            );
        }



        // ====================================================
        // BOTÕES DA ÁREA EXPLORAR LOJAS
        // ====================================================

        const btnExplorarLogin =
            document.getElementById(
                "btnExplorarLogin"
            );

        const btnExplorarCadastro =
            document.getElementById(
                "btnExplorarCadastro"
            );


        if (btnExplorarLogin) {

            btnExplorarLogin.addEventListener(
                "click",
                function () {

                    esconderPaginaPublica();

                    const secaoLogin =
                        document.getElementById(
                            "secaoLogin"
                        );

                    if (secaoLogin) {

                        secaoLogin.style.display =
                            "block";

                        secaoLogin.scrollIntoView(
                            {
                                behavior:
                                    "smooth",

                                block:
                                    "start"
                            }
                        );
                    }
                }
            );
        }


        if (btnExplorarCadastro) {

            btnExplorarCadastro.addEventListener(
                "click",
                function () {

                    esconderPaginaPublica();

                    const secaoCadastro =
                        document.getElementById(
                            "secaoCadastro"
                        );

                    if (secaoCadastro) {

                        secaoCadastro.style.display =
                            "block";

                        secaoCadastro.scrollIntoView(
                            {
                                behavior:
                                    "smooth",

                                block:
                                    "start"
                            }
                        );
                    }
                }
            );
        }


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


                const abrirAdminLoja =
                    evento.target.closest(
                        "[data-admin-abrir-loja]"
                    );

                if (abrirAdminLoja) {

                    const id =
                        abrirAdminLoja.dataset.adminAbrirLoja;

                    const token =
                        obterTokenUsuario();

                    if (!token) {
                        alert(
                            "Sessão administrativa não encontrada."
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

                        let loja =
                            lojas.find(
                                item =>
                                    String(item.id) ===
                                    String(id)
                            );

                        if (!loja) {

                            const slug =
                                abrirAdminLoja.dataset.adminLojaSlug;

                            loja = {
                                id: id,
                                slug: slug
                            };
                        }

                        await abrirLoja(
                            loja,
                            "admin"
                        );

                    } catch (erro) {

                        console.error(
                            "Erro ao abrir loja como admin:",
                            erro
                        );

                        alert(
                            "❌ " + erro.message
                        );
                    }

                    return;
                }


                const alterarStatus =
                    evento.target.closest(
                        "[data-admin-loja-id]"
                    );

                if (alterarStatus) {

                    const lojaId =
                        alterarStatus.dataset.adminLojaId;

                    const novoStatus =
                        alterarStatus.dataset.adminLojaStatus;

                    await alterarStatusLojaAdmin(
                        lojaId,
                        novoStatus
                    );

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


        const btnAbrirAdministracao =
            document.getElementById(
                "btnAbrirAdministracao"
            );

        if (btnAbrirAdministracao) {
            btnAbrirAdministracao.addEventListener(
                "click",
                abrirAdministracao
            );
        }


        const btnAdminCarregarLojas =
            document.getElementById(
                "btnAdminCarregarLojas"
            );

        if (btnAdminCarregarLojas) {
            btnAdminCarregarLojas.addEventListener(
                "click",
                carregarLojasAdmin
            );
        }


        const btnAdminGuardarLogo =
            document.getElementById(
                "btnAdminGuardarLogo"
            );

        if (btnAdminGuardarLogo) {
            btnAdminGuardarLogo.addEventListener(
                "click",
                guardarLogoAdmin
            );
        }


        const btnAdminSair =
            document.getElementById(
                "btnAdminSair"
            );

        if (btnAdminSair) {
            btnAdminSair.addEventListener(
                "click",
                sairDaAdministracao
            );
        }


        atualizarInterfaceConta();

    }
);

/* ============================================================
   ALTERAR PALAVRA-PASSE
   ============================================================ */

async function alterarPalavraPasse() {

    const senhaAtual =
        document.getElementById("senhaAtual").value;

    const novaSenha =
        document.getElementById("novaSenha").value;

    const confirmarNovaSenha =
        document.getElementById("confirmarNovaSenha").value;

    const mensagem =
        document.getElementById("mensagemAlterarSenha");

    const botao =
        document.getElementById("btnAlterarSenha");

    if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
        mensagem.textContent =
            "Preencha todos os campos.";
        return;
    }

    if (novaSenha.length < 6) {
        mensagem.textContent =
            "A nova palavra-passe deve ter pelo menos 6 caracteres.";
        return;
    }

    if (novaSenha !== confirmarNovaSenha) {
        mensagem.textContent =
            "As novas palavras-passe não coincidem.";
        return;
    }

    const token =
        obterTokenUsuario();

    if (!token) {
        mensagem.textContent =
            "Sessão expirada. Entre novamente.";
        return;
    }

    botao.disabled = true;
    botao.textContent = "A alterar...";

    try {

        const resposta =
            await fetch(
                "/api/contas/alterar-senha",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        "Authorization":
                            "Bearer " + token
                    },
                    body: JSON.stringify({
                        senhaAtual,
                        novaSenha
                    })
                }
            );

        const resultado =
            await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro ||
                "Não foi possível alterar a palavra-passe."
            );
        }

        mensagem.textContent =
            "Palavra-passe alterada com sucesso.";

        document.getElementById("senhaAtual").value = "";
        document.getElementById("novaSenha").value = "";
        document.getElementById("confirmarNovaSenha").value = "";

    } catch (erro) {

        mensagem.textContent =
            erro.message;

    } finally {

        botao.disabled = false;
        botao.textContent =
            "🔑 Alterar palavra-passe";
    }
}


/* Ligar o botão à função */
document.addEventListener("DOMContentLoaded", function () {

    const btnSeguranca =
        document.getElementById("btnAbrirSeguranca");

    const areaSeguranca =
        document.getElementById("areaAlterarSenha");

    if (btnSeguranca && areaSeguranca) {
        btnSeguranca.addEventListener("click", function () {

            const aberto =
                areaSeguranca.style.display !== "none";

            areaSeguranca.style.display =
                aberto ? "none" : "block";

            btnSeguranca.textContent =
                aberto
                    ? "🔐 Segurança da conta"
                    : "🔒 Fechar segurança da conta";
        });
    }

    const botao =
        document.getElementById("btnAlterarSenha");

    if (botao) {
        botao.addEventListener(
            "click",
            alterarPalavraPasse
        );
    }

});

/* ============================================================
   FOTO DE PERFIL — CARREGAR E GUARDAR
   ============================================================ */

async function carregarFotoPerfil(arquivo) {

    if (!arquivo) return;

    if (!arquivo.type.match(/^image\/(png|jpeg|webp)$/)) {
        alert("Selecione uma imagem PNG, JPG ou WEBP.");
        return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 5 MB.");
        return;
    }

    const leitor = new FileReader();

    leitor.onload = async function () {

        const foto = leitor.result;

        const imagem =
            document.getElementById("fotoPerfilConta");

        if (imagem) {
            imagem.src = foto;
        }

        const token =
            obterTokenUsuario();

        if (!token) {
            alert("Sessão expirada. Entre novamente.");
            return;
        }

        try {

            const resposta =
                await fetch(
                    "/api/contas/foto-perfil",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                            "Authorization":
                                "Bearer " + token
                        },
                        body: JSON.stringify({
                            foto
                        })
                    }
                );

            const resultado =
                await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    resultado.erro ||
                    "Não foi possível guardar a foto."
                );
            }

        } catch (erro) {

            alert(erro.message);

        }
    };

    leitor.readAsDataURL(arquivo);
}


/* Ativar seleção da foto */
document.addEventListener("DOMContentLoaded", function () {

    const input =
        document.getElementById("inputFotoPerfil");

    if (input) {
        input.addEventListener(
            "change",
            function () {
                carregarFotoPerfil(
                    this.files[0]
                );
            }
        );
    }

});

/* ============================================================
   FOTO DE PERFIL — VISUALIZAR / ALTERAR
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {

    const btnVisualizar =
        document.getElementById(
            "btnVisualizarFotoPerfil"
        );

    const btnAlterar =
        document.getElementById(
            "btnAlterarFotoPerfil"
        );

    const input =
        document.getElementById(
            "inputFotoPerfil"
        );

    const imagem =
        document.getElementById(
            "fotoPerfilConta"
        );

    /* Abrir galeria somente pelo botão Alterar */
    if (btnAlterar && input) {
        btnAlterar.addEventListener(
            "click",
            function () {
                input.click();
            }
        );
    }

    /* Tocar na foto apenas visualiza */
    if (btnVisualizar && imagem) {
        btnVisualizar.addEventListener(
            "click",
            function () {

                if (!imagem.src) {
                    return;
                }

                const janela =
                    window.open(
                        "",
                        "_blank"
                    );

                if (janela) {
                    janela.document.write(`
                        <html>
                        <head>
                            <title>Foto de perfil</title>
                            <style>
                                body {
                                    margin:0;
                                    background:#111;
                                    display:flex;
                                    align-items:center;
                                    justify-content:center;
                                    min-height:100vh;
                                }
                                img {
                                    max-width:95vw;
                                    max-height:95vh;
                                    object-fit:contain;
                                }
                            </style>
                        </head>
                        <body>
                            <img src="${imagem.src}">
                        </body>
                        </html>
                    `);
                }
            }
        );
    }

});

document.addEventListener("DOMContentLoaded", function () {
    sincronizarConta();
});

document.addEventListener("DOMContentLoaded", function () {

    const secao =
        document.getElementById("secaoRedefinirSenha");

    const botao =
        document.getElementById("btnRedefinirSenha");

    const mensagem =
        document.getElementById("mensagemRedefinirSenha");

    if (!secao || !botao) {
        return;
    }

    const parametros =
        new URLSearchParams(window.location.search);

    const token =
        parametros.get("token");

    if (!token) {
        return;
    }

    secao.style.display = "block";

    const senha =
        document.getElementById("novaSenhaRecuperacao");

    const confirmar =
        document.getElementById("confirmarSenhaRecuperacao");

    botao.addEventListener("click", async function () {

        mensagem.textContent = "";

        if (!senha.value || !confirmar.value) {
            mensagem.textContent =
                "Informe e confirme a nova palavra-passe.";
            return;
        }

        if (senha.value.length < 6) {
            mensagem.textContent =
                "A palavra-passe deve ter pelo menos 6 caracteres.";
            return;
        }

        if (senha.value !== confirmar.value) {
            mensagem.textContent =
                "As palavras-passe não coincidem.";
            return;
        }

        botao.disabled = true;
        botao.textContent = "⏳ A redefinir...";

        try {

            const resposta =
                await fetch(
                    "/api/contas/redefinir-senha",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            token: token,
                            novaSenha: senha.value
                        })
                    }
                );

            const resultado =
                await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    resultado.erro ||
                    "Não foi possível redefinir a palavra-passe."
                );
            }

            mensagem.textContent =
                "✅ Palavra-passe redefinida com sucesso. Já pode entrar na sua conta.";

            senha.value = "";
            confirmar.value = "";

            botao.textContent =
                "✅ Palavra-passe redefinida";

            setTimeout(function () {
                window.location.href = "/";
            }, 2000);

        } catch (erro) {

            mensagem.textContent =
                "❌ " + erro.message;

            botao.disabled = false;
            botao.textContent =
                "🔑 Redefinir palavra-passe";
        }
    });
});


document.addEventListener("DOMContentLoaded", function () {

    const btnEsqueci =
        document.getElementById("btnEsqueciSenha");

    const area =
        document.getElementById("areaRecuperarSenha");

    const btnSolicitar =
        document.getElementById("btnSolicitarRecuperacao");

    const email =
        document.getElementById("emailRecuperacao");

    const mensagem =
        document.getElementById("mensagemRecuperacao");

    if (!btnEsqueci || !area || !btnSolicitar) {
        return;
    }

    btnEsqueci.addEventListener("click", function () {
        area.style.display = "block";
    });

    btnSolicitar.addEventListener(
        "click",
        async function () {

            const endereco =
                email.value.trim().toLowerCase();

            mensagem.textContent = "";

            if (!endereco) {
                mensagem.textContent =
                    "Informe o seu email.";
                return;
            }

            btnSolicitar.disabled = true;
            btnSolicitar.textContent =
                "⏳ A enviar...";

            try {

                const resposta =
                    await fetch(
                        "/api/contas/esqueci-senha",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify({
                                email: endereco
                            })
                        }
                    );

                const resultado =
                    await resposta.json();

                if (!resposta.ok) {
                    throw new Error(
                        resultado.erro ||
                        "Não foi possível processar o pedido."
                    );
                }

                mensagem.textContent =
                    "✅ Se o email estiver registado, receberá as instruções de recuperação.";

                email.value = "";

            } catch (erro) {

                mensagem.textContent =
                    "❌ " + erro.message;

            } finally {

                btnSolicitar.disabled = false;
                btnSolicitar.textContent =
                    "📧 Enviar link de recuperação";
            }
        }
    );
});


document.addEventListener("click", function (evento) {

    const botao = evento.target.closest("[data-alterar-capa]");

    if (!botao) {
        return;
    }

    const lojaId = botao.getAttribute("data-alterar-capa");
    const input = document.querySelector(
        `[data-input-capa="${lojaId}"]`
    );

    if (input) {
        input.click();
    }
});



async function editarLojaGC(lojaId) {

    const loja = (window.minhasLojas || []).find(
        l => String(l.id) === String(lojaId)
    );

    if (!loja) {
        alert("❌ Não foi possível encontrar esta loja.");
        return;
    }

    const existente = document.getElementById("editor-loja-" + lojaId);

    if (existente) {
        existente.remove();
        return;
    }

    const card = document.querySelector(
        `[data-editar-loja="${lojaId}"]`
    )?.closest(".card-loja-minha");

    if (!card) return;

    const editor = document.createElement("div");

    editor.id = "editor-loja-" + lojaId;
    editor.style.marginTop = "15px";
    editor.style.padding = "16px";
    editor.style.border = "1px solid #ddd";
    editor.style.borderRadius = "12px";
    editor.style.background = "#f8faf9";

    editor.innerHTML = `
        <h3>✏️ Editar loja</h3>

        <input
            id="editar-nome-${lojaId}"
            class="input"
            type="text"
            placeholder="Nome da loja"
            value="${(loja.nome || "").replace(/"/g, "&quot;")}"
            style="width:100%;box-sizing:border-box;margin-bottom:10px;"
        >

        <textarea
            id="editar-descricao-${lojaId}"
            class="input"
            placeholder="Descrição da loja"
            style="width:100%;box-sizing:border-box;margin-bottom:10px;min-height:90px;"
        >${loja.descricao || ""}</textarea>

        <input
            id="editar-whatsapp-${lojaId}"
            class="input"
            type="text"
            placeholder="WhatsApp da loja"
            value="${(loja.whatsapp || "").replace(/"/g, "&quot;")}"
            style="width:100%;box-sizing:border-box;margin-bottom:12px;"
        >

        <p style="margin-bottom:6px;"><strong>📷 Foto de capa</strong></p>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">

            <button
                type="button"
                class="btn"
                data-editor-galeria-capa="${lojaId}"
            >
                🖼️ Galeria
            </button>

            <button
                type="button"
                class="btn"
                data-editor-camera-capa="${lojaId}"
            >
                📷 Câmara
            </button>

        </div>

        <input
            type="file"
            id="editor-capa-${lojaId}"
            accept="image/png,image/jpeg,image/webp"
            style="display:none;"
        >

        <div
            id="preview-editor-capa-${lojaId}"
            style="margin-bottom:12px;"
        >
            ${
                loja.capa
                    ? `<img src="${loja.capa}" style="width:100%;max-height:180px;object-fit:cover;border-radius:10px;">`
                    : ""
            }
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;">

            <button
                type="button"
                class="btn"
                data-guardar-edicao-loja="${lojaId}"
            >
                💾 Guardar alterações
            </button>

            <button
                type="button"
                class="btn"
                data-fechar-edicao-loja="${lojaId}"
            >
                Fechar
            </button>

        </div>

        <p id="mensagem-edicao-loja-${lojaId}" style="margin-top:10px;"></p>
    `;

    card.appendChild(editor);

    const inputCapa =
        document.getElementById("editor-capa-" + lojaId);

    const preview =
        document.getElementById("preview-editor-capa-" + lojaId);

    const btnGaleria =
        editor.querySelector(
            `[data-editor-galeria-capa="${lojaId}"]`
        );

    const btnCamera =
        editor.querySelector(
            `[data-editor-camera-capa="${lojaId}"]`
        );

    btnGaleria.addEventListener("click", () => {
        inputCapa.removeAttribute("capture");
        inputCapa.click();
    });

    btnCamera.addEventListener("click", () => {
        inputCapa.setAttribute("capture", "environment");
        inputCapa.click();
    });

    inputCapa.addEventListener("change", () => {

        const arquivo = inputCapa.files?.[0];

        if (!arquivo) return;

        if (!arquivo.type.match(/^image\/(png|jpeg|webp)$/)) {
            alert("Escolha uma imagem PNG, JPG ou WEBP.");
            inputCapa.value = "";
            return;
        }

        if (arquivo.size > 5 * 1024 * 1024) {
            alert("A imagem deve ter no máximo 5 MB.");
            inputCapa.value = "";
            return;
        }

        const leitor = new FileReader();

        leitor.onload = () => {
            preview.innerHTML =
                `<img src="${leitor.result}" style="width:100%;max-height:180px;object-fit:cover;border-radius:10px;">`;
        };

        leitor.readAsDataURL(arquivo);
    });

    editor.querySelector(
        `[data-fechar-edicao-loja="${lojaId}"]`
    ).addEventListener("click", () => {
        editor.remove();
    });

    editor.querySelector(
        `[data-guardar-edicao-loja="${lojaId}"]`
    ).addEventListener("click", async () => {

        const nome =
            document.getElementById(
                "editar-nome-" + lojaId
            ).value.trim();

        const descricao =
            document.getElementById(
                "editar-descricao-" + lojaId
            ).value.trim();

        const whatsapp =
            document.getElementById(
                "editar-whatsapp-" + lojaId
            ).value.trim();

        const mensagem =
            document.getElementById(
                "mensagem-edicao-loja-" + lojaId
            );

        if (!nome) {
            mensagem.textContent =
                "❌ O nome da loja é obrigatório.";
            return;
        }

        try {

            let capa = loja.capa || "";

            const arquivo = inputCapa.files?.[0];

            if (arquivo) {
                capa = await new Promise((resolve, reject) => {

                    const leitor = new FileReader();

                    leitor.onload = () => resolve(leitor.result);
                    leitor.onerror = reject;

                    leitor.readAsDataURL(arquivo);
                });
            }

            const resposta = await fetch(
                `/api/minhas-lojas/${lojaId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization":
                            "Bearer " + obterTokenUsuario()
                    },
                    body: JSON.stringify({
                        nome,
                        descricao,
                        whatsapp,
                        logo: loja.logo || "",
                        capa
                    })
                }
            );

            const dados = await resposta.json();

            if (!resposta.ok || !dados.sucesso) {
                mensagem.textContent =
                    "❌ " +
                    (dados.mensagem ||
                    "Não foi possível atualizar a loja.");
                return;
            }

            if (capa !== (loja.capa || "")) {

                const respostaCapa = await fetch(
                    `/api/minhas-lojas/${lojaId}/capa`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization":
                                "Bearer " + obterTokenUsuario()
                        },
                        body: JSON.stringify({ capa })
                    }
                );

                const dadosCapa =
                    await respostaCapa.json();

                if (!respostaCapa.ok || !dadosCapa.sucesso) {
                    mensagem.textContent =
                        "⚠️ Dados atualizados, mas não foi possível atualizar a capa.";
                    return;
                }
            }

            alert("✅ Dados da loja atualizados.");
            editor.remove();
            await carregarMinhasLojas();

        } catch (erro) {

            console.error(
                "Erro ao editar loja:",
                erro
            );

            mensagem.textContent =
                "❌ Não foi possível atualizar a loja.";
        }
    });
}

async function alterarEstadoLojaGC(lojaId) {
    const loja = minhasLojas.find(l => String(l.id) === String(lojaId));
    if (!loja) return;

    const novoEstado = !loja.ativo;
    const acao = novoEstado ? "reativar" : "desativar";

    if (!confirm(`Tem certeza que deseja ${acao} esta loja?`)) {
        return;
    }

    try {
        const resposta = await fetch(`/api/minhas-lojas/${lojaId}/estado`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${obterTokenUsuario()}`
            },
            body: JSON.stringify({
                ativo: novoEstado
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            alert("❌ " + (dados.mensagem || "Não foi possível alterar o estado da loja."));
            return;
        }

        alert(novoEstado ? "✅ Loja reativada." : "⏸️ Loja desativada.");
        carregarMinhasLojas();

    } catch (erro) {
        console.error("Erro ao alterar estado da loja:", erro);
        alert("❌ Não foi possível alterar o estado da loja.");
    }
}

document.addEventListener("click", function (evento) {
    const editar = evento.target.closest("[data-editar-loja]");
    if (editar) {
        editarLojaGC(editar.getAttribute("data-editar-loja"));
        return;
    }

    const estado = evento.target.closest("[data-alterar-estado-loja]");
    if (estado) {
        alterarEstadoLojaGC(estado.getAttribute("data-alterar-estado-loja"));
    }
});

document.addEventListener("change", async function (evento) {

    const input = evento.target.closest("[data-input-capa]");

    if (!input || !input.files || !input.files[0]) {
        return;
    }

    const arquivo = input.files[0];
    const lojaId = input.getAttribute("data-input-capa");
    const token = obterTokenUsuario();

    if (!token) {
        alert("Sessão expirada. Entre novamente.");
        return;
    }

    if (!arquivo.type.match(/^image\/(png|jpeg|webp)$/)) {
        alert("Escolha uma imagem PNG, JPG ou WEBP.");
        return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 5 MB.");
        return;
    }

    const leitor = new FileReader();

    leitor.onload = async function () {

        try {

            const resposta = await fetch(
                `/api/minhas-lojas/${lojaId}/capa`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + token
                    },
                    body: JSON.stringify({
                        capa: leitor.result
                    })
                }
            );

            const resultado = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    resultado.erro ||
                    "Não foi possível guardar a capa."
                );
            }

            alert("✅ Foto de capa atualizada.");

            carregarMinhasLojas();

        } catch (erro) {

            console.error(
                "Erro ao alterar capa:",
                erro
            );

            alert("❌ " + erro.message);
        }
    };

    leitor.readAsDataURL(arquivo);
});


document.addEventListener("click", function (evento) {

    if (evento.target.closest("#btnGaleriaProduto")) {
        const input = document.getElementById("imagemProduto");
        if (input) {
            input.removeAttribute("capture");
            input.click();
        }
    }

    if (evento.target.closest("#btnCameraProduto")) {
        const input = document.getElementById("imagemProduto");
        if (input) {
            input.setAttribute("capture", "environment");
            input.click();
        }
    }

});

document.addEventListener("click", async function (evento) {

    const botao = evento.target.closest("#btnAdminRelatorios");

    if (!botao) {
        return;
    }

    const token = obterTokenUsuario();

    if (!token) {
        alert("Sessão expirada. Entre novamente.");
        return;
    }

    try {
        const resposta = await fetch("/api/admin/relatorios", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro ||
                "Não foi possível carregar os relatórios."
            );
        }

        let area = document.getElementById("adminRelatorios");

        if (!area) {
            area = document.createElement("div");
            area.id = "adminRelatorios";
            area.style.marginTop = "20px";
            document.getElementById("adminResumo").after(area);
        }

        const adminResumo = document.getElementById("adminResumo");
        const adminIdentidade = document.getElementById("adminIdentidade");
        const adminListaLojas = document.getElementById("adminListaLojas");
        const adminAcoes = document.querySelector(".admin-acoes");

        if (adminResumo) adminResumo.style.display = "none";

        if (adminIdentidade) adminIdentidade.style.display = "none";
        if (adminListaLojas) adminListaLojas.style.display = "none";
        if (adminAcoes) adminAcoes.style.display = "none";

        if (!resultado.relatorios.length) {
            area.innerHTML = "<p>📭 Nenhum relatório recebido.</p>";
            return;
        }

        area.innerHTML = `
            <button type="button" class="btn" id="btnVoltarAdminLojas">
                ← Voltar à administração
            </button>

            <h3>📩 Relatórios recebidos</h3>
            ${resultado.relatorios.map(r => `
                <div style="border:1px solid #ddd;border-radius:12px;padding:16px;margin:12px 0;background:#fff;">
                    <strong>${r.tipo}</strong>
                    <h4>${r.assunto}</h4>
                    <p>${r.descricao}</p>
                    <small>
                        👤 ${r.nome || "Utilizador"} — ${r.email || ""}
                    </small>
                    <br>
                    <small>📅 ${new Date(r.criado_em).toLocaleString("pt-PT")}</small>
                    <div style="margin-top:10px;">
                        <label>
                            Estado:
                            <select
                                class="select-estado-relatorio"
                                data-relatorio-id="${r.id}"
                            >
                                <option value="novo" ${r.estado === "novo" ? "selected" : ""}>🔴 Novo</option>
                                <option value="em_analise" ${r.estado === "em_analise" ? "selected" : ""}>🟡 Em análise</option>
                                <option value="aguardando_utilizador" ${r.estado === "aguardando_utilizador" ? "selected" : ""}>🔵 Aguardando utilizador</option>
                                <option value="resolvido" ${r.estado === "resolvido" ? "selected" : ""}>🟢 Resolvido</option>
                                <option value="fechado" ${r.estado === "fechado" ? "selected" : ""}>⚫ Fechado</option>
                            </select>
                        </label>
                    </div>
                    ${
                        r.imagem
                            ? `<img src="${r.imagem}" style="max-width:100%;max-height:300px;border-radius:8px;margin-top:10px;">`
                            : ""
                    }
                </div>
            `).join("")}
        `;

    } catch (erro) {
        console.error("Erro ao carregar relatórios:", erro);
        alert("❌ " + erro.message);
    }

});

document.addEventListener("click", function (evento) {

    if (evento.target.closest("#btnAbrirRelatorio")) {
        const formulario = document.getElementById("formularioRelatorio");
        if (formulario) {
            formulario.style.display = "block";
        }
    }

    if (evento.target.closest("#btnFecharRelatorio")) {
        const formulario = document.getElementById("formularioRelatorio");
        if (formulario) {
            formulario.style.display = "none";
        }
    }

    if (evento.target.closest("#btnGaleriaRelatorio")) {
        const input = document.getElementById("imagemRelatorio");
        if (input) {
            input.removeAttribute("capture");
            input.click();
        }
    }

    if (evento.target.closest("#btnCameraRelatorio")) {
        const input = document.getElementById("imagemRelatorio");
        if (input) {
            input.setAttribute("capture", "environment");
            input.click();
        }
    }

});

document.addEventListener("click", async function (evento) {

    const botao = evento.target.closest("#btnEnviarRelatorio");

    if (!botao) {
        return;
    }

    const token = obterTokenUsuario();

    const tipo = document.getElementById("tipoRelatorio");
    const assunto = document.getElementById("assuntoRelatorio");
    const descricao = document.getElementById("descricaoRelatorio");
    const inputImagem = document.getElementById("imagemRelatorio");
    const mensagem = document.getElementById("mensagemRelatorio");

    if (!token) {
        alert("Sessão expirada. Entre novamente.");
        return;
    }

    if (!tipo.value || !assunto.value.trim() || !descricao.value.trim()) {
        alert("Preencha o tipo, assunto e descrição.");
        return;
    }

    let imagem = "";

    if (inputImagem.files && inputImagem.files[0]) {
        const arquivo = inputImagem.files[0];

        if (!arquivo.type.match(/^image\/(png|jpeg|webp)$/)) {
            alert("Escolha uma imagem PNG, JPG ou WEBP.");
            return;
        }

        if (arquivo.size > 5 * 1024 * 1024) {
            alert("A imagem deve ter no máximo 5 MB.");
            return;
        }

        imagem = await new Promise((resolve, reject) => {
            const leitor = new FileReader();

            leitor.onload = () => resolve(leitor.result);
            leitor.onerror = reject;

            leitor.readAsDataURL(arquivo);
        });
    }

    botao.disabled = true;
    mensagem.textContent = "Enviando...";

    try {

        const resposta = await fetch("/api/relatorios", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
                tipo: tipo.value,
                assunto: assunto.value.trim(),
                descricao: descricao.value.trim(),
                imagem
            })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro ||
                "Não foi possível enviar o relatório."
            );
        }

        mensagem.textContent = "✅ Relatório enviado com sucesso.";

        tipo.value = "";
        assunto.value = "";
        descricao.value = "";
        inputImagem.value = "";

    } catch (erro) {

        console.error("Erro ao enviar relatório:", erro);
        mensagem.textContent = "❌ " + erro.message;

    } finally {
        botao.disabled = false;
    }

});

document.addEventListener("change", async function (evento) {

    const seletor = evento.target.closest(".select-estado-relatorio");

    if (!seletor) {
        return;
    }

    const token = obterTokenUsuario();
    const relatorioId = seletor.getAttribute("data-relatorio-id");

    if (!token) {
        alert("Sessão expirada. Entre novamente.");
        return;
    }

    try {

        const resposta = await fetch(
            `/api/admin/relatorios/${relatorioId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify({
                    estado: seletor.value
                })
            }
        );

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                resultado.erro ||
                "Não foi possível alterar o estado."
            );
        }

        alert("✅ Estado atualizado.");

    } catch (erro) {

        console.error(
            "Erro ao alterar estado do relatório:",
            erro
        );

        alert("❌ " + erro.message);
    }

});

document.addEventListener("click", function (evento) {

    if (!evento.target.closest("#btnVoltarAdminLojas")) {
        return;
    }

    const area = document.getElementById("adminRelatorios");
    const adminResumo = document.getElementById("adminResumo");
    const adminIdentidade = document.getElementById("adminIdentidade");
    const adminListaLojas = document.getElementById("adminListaLojas");
    const adminAcoes = document.querySelector(".admin-acoes");

    if (area) area.style.display = "none";
    if (adminResumo) adminResumo.style.display = "";
    if (adminIdentidade) adminIdentidade.style.display = "";
    if (adminListaLojas) adminListaLojas.style.display = "";
    if (adminAcoes) adminAcoes.style.display = "";

});
