document.addEventListener("DOMContentLoaded", function () {

    const btnGerir = document.getElementById("btnGerir");
    const formulario = document.getElementById("formularioProduto");
    const setaGerir = document.getElementById("setaGerir");

    async function carregarLojasNoFormulario() {

        const seletorLoja = document.getElementById("lojaProduto");

        if (!seletorLoja) {
            return;
        }

        try {

            const resposta = await fetch("/api/lojas");
            const lojas = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    lojas.erro || "Não foi possível carregar as lojas."
                );
            }

            seletorLoja.innerHTML =
                '<option value="">Selecione a loja</option>';

            lojas.forEach(function (loja) {

                const opcao = document.createElement("option");

                opcao.value = loja.id;
                opcao.textContent = loja.nome;

                seletorLoja.appendChild(opcao);
            });

        } catch (erro) {

            console.error("Erro ao carregar lojas:", erro);

            seletorLoja.innerHTML =
                '<option value="">Não foi possível carregar as lojas</option>';
        }
    }

    const btnPublicar = document.getElementById("btnPublicar");
    const mensagem = document.getElementById("mensagemCadastro");

    btnGerir.addEventListener("click", function () {

        carregarLojasNoFormulario();


        const tokenAdmin = localStorage.getItem(
            "gc_angglobal_admin_token"
        );

        const tokenVendedor = localStorage.getItem(
            "gc_angglobal_seller_token"
        );

        const seletorLoja =
            document.getElementById("lojaProduto");

        const ehAdmin =
            tokenAdmin === "gc-angglobal-admin";

        const ehVendedor =
            !!tokenVendedor;

        if (!ehAdmin && !ehVendedor) {

            const mensagemLogin =
                document.getElementById(
                    "mensagemLoginAdmin"
                );

            mensagemLogin.textContent =
                "Entre como administrador ou vendedor primeiro.";

            document.getElementById(
                "areaLoginAdmin"
            ).classList.remove("fechado");

            return;
        }

        if (ehVendedor && !ehAdmin) {

            seletorLoja.innerHTML =
                '<option value="minha-loja">Minha loja</option>';

            seletorLoja.value =
                "minha-loja";

            seletorLoja.style.display =
                "none";

            const labelLoja =
                document.querySelector(
                    'label[for="lojaProduto"]'
                );

            if (labelLoja) {
                labelLoja.style.display =
                    "none";
            }

        } else {

            seletorLoja.style.display =
                "block";

            const labelLoja =
                document.querySelector(
                    'label[for="lojaProduto"]'
                );

            if (labelLoja) {
                labelLoja.style.display =
                    "block";
            }

            carregarLojasNoFormulario();
        }

        formulario.classList.toggle("fechado");

        setaGerir.textContent =
            formulario.classList.contains("fechado")
                ? "▼"
                : "▲";
    });

    btnPublicar.addEventListener("click", async function () {

        const tipo = document.getElementById("tipoProduto").value;
        const lojaId = document.getElementById("lojaProduto").value;
        const nome = document.getElementById("nomeProduto").value.trim();
        const descricao = document.getElementById("descricaoProduto").value.trim();
        const preco = Number(document.getElementById("precoProduto").value);
        const arquivo = document.getElementById("imagemProduto").files[0] || document.getElementById("cameraProduto").files[0];

        const tokenAdminAtual =
            localStorage.getItem(
                "gc_angglobal_admin_token"
            );

        const tokenVendedorAtual =
            localStorage.getItem(
                "gc_angglobal_seller_token"
            );

        const ehAdminAtual =
            tokenAdminAtual ===
            "gc-angglobal-admin";

        const ehVendedorAtual =
            !!tokenVendedorAtual;

        if (!ehAdminAtual && !ehVendedorAtual) {

            mensagem.textContent =
                "Entre como administrador ou vendedor primeiro.";

            return;
        }

        if (ehAdminAtual && !lojaId) {

            mensagem.textContent =
                "Selecione uma loja antes de publicar.";

            return;
        }

        if (!tipo || !nome || !descricao || !preco) {
            mensagem.textContent =
                "Preencha o tipo, nome, descrição e preço.";
            return;
        }

        btnPublicar.disabled = true;
        btnPublicar.textContent = "A publicar...";
        mensagem.textContent = "";

        async function publicar(imagem) {

            const novoProduto = {
                id: Date.now(),
                tipo,
                nome,
                descricao,
                preco,
                imagem: imagem || ""
            };

            if (ehAdminAtual) {
                novoProduto.loja_id =
                    Number(lojaId);
            }

              try {

                  const idEditando =
                      btnPublicar.dataset.editandoId;

                  const url = idEditando
                      ? "/api/produtos/" + idEditando
                      : "/api/produtos";

                  const metodo = idEditando
                      ? "PUT"
                      : "POST";

                  const resposta = await fetch(url, {
                      method: metodo,
                      headers: {
                          "Content-Type": "application/json",
                          "Authorization":
                              "Bearer " +
                              (
                                  ehAdminAtual
                                      ? tokenAdminAtual
                                      : tokenVendedorAtual
                              )
                      },
                      body: JSON.stringify(novoProduto)
                  });

                  const resultado = await resposta.json();

                  if (!resposta.ok) {
                      throw new Error(
                          resultado.erro || "Erro ao publicar."
                      );
                  }

                  if (idEditando) {

                      mensagem.textContent =
                          tipo === "servico"
                              ? "Serviço atualizado com sucesso!"
                              : "Produto atualizado com sucesso!";

                      delete btnPublicar.dataset.editandoId;

                  } else {

                      mensagem.textContent =
                          tipo === "servico"
                              ? "Serviço publicado com sucesso!"
                              : "Produto publicado com sucesso!";
                  }

                document.getElementById("nomeProduto").value = "";
                document.getElementById("descricaoProduto").value = "";
                document.getElementById("precoProduto").value = "";
                document.getElementById("imagemProduto").value = "";
                  document.getElementById("cameraProduto").value = "";

                await carregarProdutos();

            } catch (erro) {
                console.error(erro);

                mensagem.textContent =
                    "Não foi possível publicar. Tente novamente.";
            }

            btnPublicar.disabled = false;
            btnPublicar.textContent = "Publicar";
        }

        if (!arquivo) {
            await publicar("");
            return;
        }

        const leitor = new FileReader();

        leitor.onload = function (evento) {

            const imagemOriginal = new Image();

            imagemOriginal.onload = async function () {

                const maximo = 900;

                let largura = imagemOriginal.width;
                let altura = imagemOriginal.height;

                if (largura > maximo || altura > maximo) {
                    if (largura > altura) {
                        altura = Math.round(
                            altura * maximo / largura
                        );
                        largura = maximo;
                    } else {
                        largura = Math.round(
                            largura * maximo / altura
                        );
                        altura = maximo;
                    }
                }

                const canvas = document.createElement("canvas");

                canvas.width = largura;
                canvas.height = altura;

                const contexto = canvas.getContext("2d");

                contexto.drawImage(
                    imagemOriginal,
                    0,
                    0,
                    largura,
                    altura
                );

                const imagemReduzida =
                    canvas.toDataURL("image/jpeg", 0.75);

                await publicar(imagemReduzida);
            };

            imagemOriginal.onerror = function () {
                mensagem.textContent =
                    "Não foi possível processar a imagem.";

                btnPublicar.disabled = false;
                btnPublicar.textContent = "Publicar";
            };

            imagemOriginal.src = evento.target.result;
        };

        leitor.onerror = function () {
            mensagem.textContent =
                "Não foi possível carregar a imagem.";

            btnPublicar.disabled = false;
            btnPublicar.textContent = "Publicar";
        };

        leitor.readAsDataURL(arquivo);
    });

});

document.addEventListener("DOMContentLoaded", function () {

    const btnAdmin = document.getElementById("btnAdmin");
    const areaLoginAdmin = document.getElementById("areaLoginAdmin");
    const btnLoginAdmin = document.getElementById("btnLoginAdmin");
    const senhaAdmin = document.getElementById("senhaAdmin");
    const mensagemLoginAdmin = document.getElementById("mensagemLoginAdmin");
    const btnSairAdmin = document.getElementById("btnSairAdmin");

    btnAdmin.addEventListener("click", function () {
        areaLoginAdmin.classList.toggle("fechado");
    });

    btnLoginAdmin.addEventListener("click", async function () {

        const password = senhaAdmin.value;

        if (!password) {
            mensagemLoginAdmin.textContent =
                "Digite a senha de administrador.";
            return;
        }

        btnLoginAdmin.disabled = true;
        btnLoginAdmin.textContent = "A entrar...";
        mensagemLoginAdmin.textContent = "";

        try {

            const resposta = await fetch("/api/admin/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    password
                })
            });

            const resultado = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    resultado.erro || "Não foi possível entrar."
                );
            }

            localStorage.setItem(
                "gc_angglobal_admin_token",
                resultado.token
            );

            mensagemLoginAdmin.textContent =
                "Login efetuado com sucesso.";

            senhaAdmin.value = "";
            senhaAdmin.style.display = "none";
            btnLoginAdmin.style.display = "none";
            btnSairAdmin.style.display = "block";

        } catch (erro) {

            console.error(erro);

            mensagemLoginAdmin.textContent =
                erro.message || "Senha incorreta.";

        } finally {

            btnLoginAdmin.disabled = false;
            btnLoginAdmin.textContent = "Entrar";
        }
    });

});

document.addEventListener("DOMContentLoaded", function () {

    const btnSairAdmin = document.getElementById("btnSairAdmin");
    const mensagemLoginAdmin =
        document.getElementById("mensagemLoginAdmin");
    const areaLoginAdmin =
        document.getElementById("areaLoginAdmin");
    const formulario =
        document.getElementById("formularioProduto");

    function atualizarEstadoAdmin() {

        const token = localStorage.getItem(
            "gc_angglobal_admin_token"
        );

        if (token === "gc-angglobal-admin") {
            senhaAdmin.style.display = "none";
            btnLoginAdmin.style.display = "none";
            btnSairAdmin.style.display = "block";
        } else {
            senhaAdmin.style.display = "block";
            btnLoginAdmin.style.display = "block";
            btnSairAdmin.style.display = "none";
        }
    }

    btnSairAdmin.addEventListener("click", function () {

        localStorage.removeItem(
            "gc_angglobal_admin_token"
        );

        formulario.classList.add("fechado");

        const setaGerir =
            document.getElementById("setaGerir");

        setaGerir.textContent = "▼";

        senhaAdmin.value = "";
        senhaAdmin.style.display = "block";
        btnLoginAdmin.style.display = "block";
        btnSairAdmin.style.display = "none";

        mensagemLoginAdmin.textContent =
            "Sessão encerrada.";
    });

    atualizarEstadoAdmin();
});



// ==================== GC-ANGGLOBAL-MULTILOJA-ADMIN ====================

document.addEventListener("DOMContentLoaded", function () {

    const btnLojas = document.getElementById("btnLojas");
    const areaLojas = document.getElementById("areaLojas");
    const listaLojas = document.getElementById("listaLojas");
    const btnCriarLoja = document.getElementById("btnCriarLoja");
    const mensagemLoja = document.getElementById("mensagemLoja");

    if (!btnLojas || !areaLojas || !listaLojas) {
        return;
    }

    function tokenAdmin() {
        return localStorage.getItem("gc_angglobal_admin_token");
    }

    async function carregarLojas() {

        listaLojas.innerHTML = "A carregar lojas...";

        try {

            const resposta = await fetch("/api/lojas");

            const lojas = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    lojas.erro || "Não foi possível carregar as lojas."
                );
            }

            if (!lojas.length) {
                listaLojas.innerHTML =
                    "<p>Ainda não existe nenhuma loja.</p>";
                return;
            }

            listaLojas.innerHTML = "";

            lojas.forEach(function (loja) {

                const item = document.createElement("div");

                item.className = "loja-admin-item";

                item.innerHTML = `
                    <strong>${loja.nome}</strong>
                    <p>${loja.descricao || ""}</p>
                    <small>WhatsApp: ${loja.whatsapp || "Não definido"}</small>
                    <br>
                    <button data-editar-loja="${loja.id}">
                        Editar
                    </button>
                    <button data-desativar-loja="${loja.id}">
                        Desativar
                    </button>
                `;

                listaLojas.appendChild(item);
            });

            document
                .querySelectorAll("[data-desativar-loja]")
                .forEach(function (botao) {

                    botao.addEventListener("click", async function () {

                        const id = botao.dataset.desativarLoja;

                        if (!confirm("Desativar esta loja?")) {
                            return;
                        }

                        const resposta = await fetch(
                            "/api/lojas/" + id,
                            {
                                method: "DELETE",
                                headers: {
                                    "Authorization":
                                        "Bearer " + tokenAdmin()
                                }
                            }
                        );

                        const resultado = await resposta.json();

                        if (!resposta.ok) {
                            alert(
                                resultado.erro ||
                                "Não foi possível desativar a loja."
                            );
                            return;
                        }

                        carregarLojas();
                    });
                });

            document
                .querySelectorAll("[data-editar-loja]")
                .forEach(function (botao) {

                    botao.addEventListener("click", async function () {

                        const id = botao.dataset.editarLoja;

                        const nome = prompt(
                            "Nome da loja:"
                        );

                        if (!nome) {
                            return;
                        }

                        const descricao = prompt(
                            "Descrição da loja:"
                        ) || "";

                        const whatsapp = prompt(
                            "WhatsApp da loja:"
                        ) || "";

                        const resposta = await fetch(
                            "/api/lojas/" + id,
                            {
                                method: "PUT",
                                headers: {
                                    "Content-Type":
                                        "application/json",
                                    "Authorization":
                                        "Bearer " + tokenAdmin()
                                },
                                body: JSON.stringify({
                                    nome,
                                    descricao,
                                    whatsapp
                                })
                            }
                        );

                        const resultado = await resposta.json();

                        if (!resposta.ok) {
                            alert(
                                resultado.erro ||
                                "Não foi possível editar a loja."
                            );
                            return;
                        }

                        carregarLojas();
                    });
                });

        } catch (erro) {

            console.error(erro);

            listaLojas.innerHTML =
                "<p>Não foi possível carregar as lojas.</p>";
        }
    }

    btnLojas.addEventListener("click", function () {

        const token = tokenAdmin();

        if (token !== "gc-angglobal-admin") {

            mensagemLoja.textContent =
                "Entre como administrador primeiro.";

            const areaLogin =
                document.getElementById("areaLoginAdmin");

            if (areaLogin) {
                areaLogin.classList.remove("fechado");
            }

            return;
        }

        areaLojas.classList.toggle("fechado");

        if (!areaLojas.classList.contains("fechado")) {
            carregarLojas();
        }
    });

    btnCriarLoja.addEventListener("click", async function () {

        if (tokenAdmin() !== "gc-angglobal-admin") {
            mensagemLoja.textContent =
                "Entre como administrador primeiro.";
            return;
        }

        const nome = prompt("Nome da nova loja:");

        if (!nome) {
            return;
        }

        const descricao = prompt(
            "Descrição da loja:"
        ) || "";

        const whatsapp = prompt(
            "WhatsApp da loja:"
        ) || "";

        try {

            const resposta = await fetch("/api/lojas", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization":
                        "Bearer " + tokenAdmin()
                },

                body: JSON.stringify({
                    nome,
                    descricao,
                    whatsapp
                })
            });

            const resultado = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    resultado.erro ||
                    "Não foi possível criar a loja."
                );
            }

            mensagemLoja.textContent =
                "Loja criada com sucesso!";

            carregarLojas();

        } catch (erro) {

            console.error(erro);

            mensagemLoja.textContent =
                erro.message ||
                "Não foi possível criar a loja.";
        }
    });

});


// ==================== GC-ANGGLOBAL ÁREA DO VENDEDOR ====================

document.addEventListener("DOMContentLoaded", function () {

    const btnVendedor =
        document.getElementById("btnVendedor");

    const areaVendedor =
        document.getElementById("areaVendedor");

    const painelDeslogado =
        document.getElementById(
            "painelVendedorDeslogado"
        );

    const painelLogado =
        document.getElementById(
            "painelVendedorLogado"
        );

    const mensagemVendedor =
        document.getElementById(
            "mensagemVendedor"
        );

    const mensagemMinhaLoja =
        document.getElementById(
            "mensagemMinhaLoja"
        );

    const nomeVendedorLogado =
        document.getElementById(
            "nomeVendedorLogado"
        );

    const btnCriarConta =
        document.getElementById(
            "btnCriarContaVendedor"
        );

    const btnLogin =
        document.getElementById(
            "btnLoginVendedor"
        );

    const btnCriarMinhaLoja =
        document.getElementById(
            "btnCriarMinhaLoja"
        );

    const btnSairVendedor =
        document.getElementById(
            "btnSairVendedor"
        );

    const btnEntrarMinhaLoja =
        document.getElementById(
            "btnEntrarMinhaLoja"
        );

    const areaInternaMinhaLoja =
        document.getElementById(
            "areaInternaMinhaLoja"
        );

    const tituloAreaMinhaLoja =
        document.getElementById(
            "tituloAreaMinhaLoja"
        );

    const descricaoAreaMinhaLoja =
        document.getElementById(
            "descricaoAreaMinhaLoja"
        );

    const btnAdicionarNaMinhaLoja =
        document.getElementById(
            "btnAdicionarNaMinhaLoja"
        );

    function tokenVendedor() {
        return localStorage.getItem(
            "gc_angglobal_seller_token"
        );
    }

    function vendedorGuardado() {

        try {
            const dados = localStorage.getItem(
                "gc_angglobal_seller"
            );

            return dados
                ? JSON.parse(dados)
                : null;

        } catch (erro) {
            return null;
        }
    }

    function atualizarPainelVendedor() {

        const token = tokenVendedor();
        const vendedor = vendedorGuardado();

        if (token && vendedor) {

            painelDeslogado.style.display = "none";
            painelLogado.style.display = "block";

            nomeVendedorLogado.textContent =
                "👤 " + vendedor.nome;

            mensagemVendedor.textContent =
                "Sessão de vendedor ativa.";

        } else {

            painelDeslogado.style.display = "block";
            painelLogado.style.display = "none";

            mensagemVendedor.textContent = "";
        }
    }

    async function carregarMinhaLoja() {

        const token = tokenVendedor();

        const painelLojaCriada =
            document.getElementById(
                "painelLojaCriada"
            );

        const nomeLojaCriada =
            document.getElementById(
                "nomeLojaCriada"
            );

        const descricaoLojaCriada =
            document.getElementById(
                "descricaoLojaCriada"
            );

        if (!token) {
            return;
        }

        try {

            const resposta = await fetch(
                "/api/vendedores/minha-loja",
                {
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

            const resultado =
                await resposta.json();

            if (resposta.status === 404) {

                mensagemMinhaLoja.textContent =
                    "Você ainda não possui uma loja.";

                btnCriarMinhaLoja.style.display =
                    "block";

                btnCriarMinhaLoja.disabled =
                    false;

                btnCriarMinhaLoja.textContent =
                    "Criar minha loja";

                if (painelLojaCriada) {
                    painelLojaCriada.style.display =
                        "none";
                }

                return;
            }

            if (!resposta.ok) {
                throw new Error(
                    resultado.erro ||
                    "Não foi possível carregar sua loja."
                );
            }

            const loja = resultado.loja;

            document.getElementById(
                "nomeMinhaLoja"
            ).value = loja.nome || "";

            document.getElementById(
                "descricaoMinhaLoja"
            ).value = loja.descricao || "";

            document.getElementById(
                "whatsappMinhaLoja"
            ).value = loja.whatsapp || "";

            mensagemMinhaLoja.textContent =
                "🏪 Sua loja está pronta.";

            btnCriarMinhaLoja.style.display =
                "none";

            if (nomeLojaCriada) {
                nomeLojaCriada.textContent =
                    "🏪 " + loja.nome;
            }

            if (descricaoLojaCriada) {
                descricaoLojaCriada.textContent =
                    loja.descricao ||
                    "Bem-vindo à nossa loja.";
            }

            if (painelLojaCriada) {
                painelLojaCriada.style.display =
                    "block";
            }

        } catch (erro) {

            console.error(
                "Erro ao carregar minha loja:",
                erro
            );

            mensagemMinhaLoja.textContent =
                erro.message ||
                "Não foi possível carregar sua loja.";
        }
    }

    btnVendedor.addEventListener(
        "click",
        async function () {

            areaVendedor.classList.toggle(
                "fechado"
            );

            if (
                !areaVendedor.classList.contains(
                    "fechado"
                )
            ) {

                atualizarPainelVendedor();

                if (tokenVendedor()) {
                    await carregarMinhaLoja();
                }
            }
        }
    );


    // ==================== CRIAR CONTA ====================

    btnCriarConta.addEventListener(
        "click",
        async function () {

            const nome =
                document.getElementById(
                    "nomeVendedor"
                ).value.trim();

            const email =
                document.getElementById(
                    "emailVendedor"
                ).value.trim();

            const telefone =
                document.getElementById(
                    "telefoneVendedor"
                ).value.trim();

            const senha =
                document.getElementById(
                    "senhaNovoVendedor"
                ).value;

            mensagemVendedor.textContent = "";

            if (!nome || !email || !senha) {

                mensagemVendedor.textContent =
                    "Preencha nome, email e senha.";

                return;
            }

            btnCriarConta.disabled = true;
            btnCriarConta.textContent =
                "A criar...";

            try {

                const resposta = await fetch(
                    "/api/vendedores/cadastro",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            nome,
                            email,
                            telefone,
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

                mensagemVendedor.textContent =
                    "Conta criada. Agora entre com o seu email e senha.";

                document.getElementById(
                    "senhaNovoVendedor"
                ).value = "";

            } catch (erro) {

                console.error(erro);

                mensagemVendedor.textContent =
                    erro.message ||
                    "Não foi possível criar a conta.";

            } finally {

                btnCriarConta.disabled = false;

                btnCriarConta.textContent =
                    "Criar conta";
            }
        }
    );


    // ==================== LOGIN ====================

    btnLogin.addEventListener(
        "click",
        async function () {

            const email =
                document.getElementById(
                    "emailLoginVendedor"
                ).value.trim();

            const senha =
                document.getElementById(
                    "senhaLoginVendedor"
                ).value;

            mensagemVendedor.textContent = "";

            if (!email || !senha) {

                mensagemVendedor.textContent =
                    "Digite o email e a senha.";

                return;
            }

            btnLogin.disabled = true;
            btnLogin.textContent =
                "A entrar...";

            try {

                const resposta = await fetch(
                    "/api/vendedores/login",
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

                    if (resposta.status === 401 || resposta.status === 404) {

                        throw new Error(
                            "Conta não encontrada. Se ainda não possui uma conta, clique em \"Criar conta\"."
                        );
                    }

                    throw new Error(
                        resultado.erro ||
                        "Não foi possível entrar."
                    );
                }

                localStorage.setItem(
                    "gc_angglobal_seller_token",
                    resultado.token
                );

                localStorage.setItem(
                    "gc_angglobal_seller",
                    JSON.stringify(
                        resultado.vendedor
                    )
                );

                atualizarPainelVendedor();

                await carregarMinhaLoja();

            } catch (erro) {

                console.error(erro);

                mensagemVendedor.textContent =
                    erro.message ||
                    "Não foi possível entrar.";

            } finally {

                btnLogin.disabled = false;

                btnLogin.textContent =
                    "Entrar";
            }
        }
    );


    // ==================== CRIAR MINHA LOJA ====================

    btnCriarMinhaLoja.addEventListener(
        "click",
        async function () {

            const nome =
                document.getElementById(
                    "nomeMinhaLoja"
                ).value.trim();

            const descricao =
                document.getElementById(
                    "descricaoMinhaLoja"
                ).value.trim();

            const whatsapp =
                document.getElementById(
                    "whatsappMinhaLoja"
                ).value.trim();

            if (!nome) {

                mensagemMinhaLoja.textContent =
                    "Digite o nome da sua loja.";

                return;
            }

            const token = tokenVendedor();

            if (!token) {

                mensagemMinhaLoja.textContent =
                    "Sessão de vendedor não encontrada.";

                return;
            }

            btnCriarMinhaLoja.disabled = true;

            btnCriarMinhaLoja.textContent =
                "A criar...";

            try {

                const resposta = await fetch(
                    "/api/vendedores/minha-loja",
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
                        "Não foi possível criar sua loja."
                    );
                }

                mensagemMinhaLoja.textContent =
                    "🏪 Sua loja foi criada com sucesso.";

                btnCriarMinhaLoja.style.display =
                    "none";

            } catch (erro) {

                console.error(erro);

                mensagemMinhaLoja.textContent =
                    erro.message ||
                    "Não foi possível criar sua loja.";

            } finally {

                btnCriarMinhaLoja.disabled = false;

                btnCriarMinhaLoja.textContent =
                    "Criar minha loja";
            }
        }
    );


    // ==================== ENTRAR NA MINHA LOJA ====================

    if (btnEntrarMinhaLoja) {

        btnEntrarMinhaLoja.addEventListener(
            "click",
            async function () {

                const token = tokenVendedor();

                if (!token) {

                    mensagemMinhaLoja.textContent =
                        "Sessão de vendedor não encontrada.";

                    return;
                }

                try {

                    const resposta = await fetch(
                        "/api/vendedores/minha-loja",
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
                            "Não foi possível abrir sua loja."
                        );
                    }

                    const loja = resultado.loja;

                    if (tituloAreaMinhaLoja) {

                        tituloAreaMinhaLoja.textContent =
                            "🏪 " + loja.nome;
                    }

                    if (descricaoAreaMinhaLoja) {

                        descricaoAreaMinhaLoja.textContent =
                            loja.descricao ||
                            "";
                    }

                    if (areaInternaMinhaLoja) {

                        areaInternaMinhaLoja.style.display =
                            "block";
                    }

                    areaInternaMinhaLoja.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                } catch (erro) {

                    console.error(
                        "Erro ao entrar na loja:",
                        erro
                    );

                    mensagemMinhaLoja.textContent =
                        erro.message ||
                        "Não foi possível abrir sua loja.";
                }
            }
        );
    }


    // ==================== ADICIONAR NA MINHA LOJA ====================

    if (btnAdicionarNaMinhaLoja) {

        btnAdicionarNaMinhaLoja.addEventListener(
            "click",
            function () {

                const formulario =
                    document.getElementById(
                        "formularioProduto"
                    );

                const seletorLoja =
                    document.getElementById(
                        "lojaProduto"
                    );

                const labelLoja =
                    document.querySelector(
                        'label[for="lojaProduto"]'
                    );

                const token =
                    tokenVendedor();

                if (!token) {

                    mensagemMinhaLoja.textContent =
                        "Sessão de vendedor não encontrada.";

                    return;
                }

                if (formulario) {

                    formulario.classList.remove(
                        "fechado"
                    );
                }

                if (seletorLoja) {

                    seletorLoja.innerHTML =
                        '<option value="minha-loja">Minha loja</option>';

                    seletorLoja.value =
                        "minha-loja";

                    seletorLoja.style.display =
                        "none";
                }

                if (labelLoja) {

                    labelLoja.style.display =
                        "none";
                }

                setTimeout(function () {

                    const nomeProduto =
                        document.getElementById(
                            "nomeProduto"
                        );

                    if (nomeProduto) {

                        nomeProduto.focus();

                    }

                    if (formulario) {

                        formulario.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                    }

                }, 100);
            }
        );
    }

    // ==================== SAIR ====================

    btnSairVendedor.addEventListener(
        "click",
        function () {

            localStorage.removeItem(
                "gc_angglobal_seller_token"
            );

            localStorage.removeItem(
                "gc_angglobal_seller"
            );

            mensagemMinhaLoja.textContent = "";

            document.getElementById(
                "nomeMinhaLoja"
            ).value = "";

            document.getElementById(
                "descricaoMinhaLoja"
            ).value = "";

            document.getElementById(
                "whatsappMinhaLoja"
            ).value = "";

            btnCriarMinhaLoja.style.display =
                "block";

            atualizarPainelVendedor();
        }
    );


    atualizarPainelVendedor();

});


// ==================== ALTERNAR LOGIN / CRIAR CONTA ====================

document.addEventListener("DOMContentLoaded", function () {

    const painelLogin =
        document.getElementById("painelLoginVendedor");

    const painelCriar =
        document.getElementById("painelCriarContaVendedor");

    const btnMostrarCriar =
        document.getElementById("btnMostrarCriarConta");

    const btnMostrarLogin =
        document.getElementById("btnMostrarLogin");

    if (
        !painelLogin ||
        !painelCriar ||
        !btnMostrarCriar ||
        !btnMostrarLogin
    ) {
        return;
    }

    btnMostrarCriar.addEventListener(
        "click",
        function () {

            painelLogin.style.display = "none";
            painelCriar.style.display = "block";

        }
    );

    btnMostrarLogin.addEventListener(
        "click",
        function () {

            painelCriar.style.display = "none";
            painelLogin.style.display = "block";

        }
    );

});
