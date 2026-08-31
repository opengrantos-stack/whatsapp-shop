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


        const token = localStorage.getItem(
            "gc_angglobal_admin_token"
        );

        if (token !== "gc-angglobal-admin") {
            const mensagemLogin =
                document.getElementById("mensagemLoginAdmin");

            mensagemLogin.textContent =
                "Entre como administrador primeiro.";

            document.getElementById(
                "areaLoginAdmin"
            ).classList.remove("fechado");

            return;
        }

        formulario.classList.toggle("fechado");

        setaGerir.textContent =
            formulario.classList.contains("fechado") ? "▼" : "▲";
    });

    btnPublicar.addEventListener("click", async function () {

        const tipo = document.getElementById("tipoProduto").value;
        const lojaId = document.getElementById("lojaProduto").value;
        const nome = document.getElementById("nomeProduto").value.trim();
        const descricao = document.getElementById("descricaoProduto").value.trim();
        const preco = Number(document.getElementById("precoProduto").value);
        const arquivo = document.getElementById("imagemProduto").files[0] || document.getElementById("cameraProduto").files[0];

        if (!lojaId) {
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
                imagem: imagem || "",
                loja_id: Number(lojaId)
            };

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
                              localStorage.getItem(
                                  "gc_angglobal_admin_token"
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
