document.addEventListener("DOMContentLoaded", function () {

    const btnGerir = document.getElementById("btnGerir");
    const formulario = document.getElementById("formularioProduto");
    const setaGerir = document.getElementById("setaGerir");

    const btnPublicar = document.getElementById("btnPublicar");
    const mensagem = document.getElementById("mensagemCadastro");

    btnGerir.addEventListener("click", function () {
        formulario.classList.toggle("fechado");

        setaGerir.textContent =
            formulario.classList.contains("fechado") ? "▼" : "▲";
    });

    btnPublicar.addEventListener("click", async function () {

        const tipo = document.getElementById("tipoProduto").value;
        const nome = document.getElementById("nomeProduto").value.trim();
        const descricao = document.getElementById("descricaoProduto").value.trim();
        const preco = Number(document.getElementById("precoProduto").value);
        const arquivo = document.getElementById("imagemProduto").files[0];

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
                const resposta = await fetch("/api/produtos", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(novoProduto)
                });

                const resultado = await resposta.json();

                if (!resposta.ok) {
                    throw new Error(
                        resultado.erro || "Erro ao publicar."
                    );
                }

                mensagem.textContent =
                    tipo === "servico"
                        ? "Serviço publicado com sucesso!"
                        : "Produto publicado com sucesso!";

                document.getElementById("nomeProduto").value = "";
                document.getElementById("descricaoProduto").value = "";
                document.getElementById("precoProduto").value = "";
                document.getElementById("imagemProduto").value = "";

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
                "whatsapp_shop_admin_token",
                resultado.token
            );

            mensagemLoginAdmin.textContent =
                "Login efetuado com sucesso.";

            senhaAdmin.value = "";

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
