document.addEventListener("DOMContentLoaded", function () {

    const btnGerir = document.getElementById("btnGerir");
    const formulario = document.getElementById("formularioProduto");
    const setaGerir = document.getElementById("setaGerir");

    const btnPublicar = document.getElementById("btnPublicar");
    const mensagem = document.getElementById("mensagemCadastro");

    btnGerir.addEventListener("click", function () {

        const token = localStorage.getItem(
            "gc_angglobal_admin_token"
        );

        if (!token) {
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
        const nome = document.getElementById("nomeProduto").value.trim();
        const descricao = document.getElementById("descricaoProduto").value.trim();
        const preco = Number(document.getElementById("precoProduto").value);
        const arquivo = document.getElementById("imagemProduto").files[0] || document.getElementById("cameraProduto").files[0];

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

        if (token) {
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
