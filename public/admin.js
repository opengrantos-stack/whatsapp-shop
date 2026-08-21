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

    btnPublicar.addEventListener("click", function () {

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

        function publicar(imagem) {

            const novoProduto = {
                id: Date.now(),
                tipo: tipo,
                nome: nome,
                descricao: descricao,
                preco: preco,
                imagem: imagem || ""
            };

            try {

                produtos.push(novoProduto);

                localStorage.setItem(
                    "whatsappShopProdutos",
                    JSON.stringify(produtos)
                );

                mostrarProdutos();

                mensagem.textContent =
                    tipo === "servico"
                        ? "Serviço publicado com sucesso!"
                        : "Produto publicado com sucesso!";

                document.getElementById("nomeProduto").value = "";
                document.getElementById("descricaoProduto").value = "";
                document.getElementById("precoProduto").value = "";
                document.getElementById("imagemProduto").value = "";

            } catch (erro) {

                console.error(erro);

                produtos.pop();

                mensagem.textContent =
                    "Não foi possível guardar a imagem. Tente uma foto menor.";

            } finally {

                btnPublicar.disabled = false;
                btnPublicar.textContent = "Publicar";
            }
        }

        if (!arquivo) {
            publicar("");
            return;
        }

        const leitor = new FileReader();

        leitor.onload = function (evento) {

            const imagemOriginal = new Image();

            imagemOriginal.onload = function () {

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

                publicar(imagemReduzida);
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
