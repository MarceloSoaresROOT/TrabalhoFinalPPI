import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const host = '0.0.0.0';
const porta = 3000;

const app = express();

// --- Middlewares ---
app.use(session({
    secret: 'M1nh4Ch4v3S3cr3t4',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 30 } 
}));

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

var listaLivros = [];
var listaLeitores = [];

// --- Função para capturar a data/hora no fuso de Brasília ---
function obterDataHoraBrasilia() {
    return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// --- Middleware de Autenticação ---
function estaAutenticado(req, res, next) {
    if (req.session.logado) {
        next();
    } else {
        res.send(`
            <html lang="pt-br">
                <head>
                    <meta charset="UTF-8">
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
                </head>
                <body class="container mt-5 text-center">
                    <div class="alert alert-danger">Acesso negado. Por favor, faça login primeiro.</div>
                    <a href="/login" class="btn btn-primary">Ir para Login</a>
                </body>
            </html>
        `);
    }
}

// --- Rotas ---

app.get("/login", (req, res) => {
    const ultimoAcesso = req.cookies.ultimoAcesso || "Primeiro acesso no sistema.";
    
    res.send(`
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="utf-8">
        <title>Login - Biblioteca</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body class="bg-light">
        <div class="container min-vh-100 d-flex justify-content-center align-items-center">
            <div class="card shadow-lg w-100" style="max-width: 420px;">
                <div class="card-body text-center">
                    <img src="/Imagens/loogo.png" alt="Logo" class="img-fluid mb-3" style="max-width: 150px;">
                    <h2 class="card-title mb-4">Autenticação do Sistema</h2>
                    <form action='/login' method='POST'>
                        <div class="mb-3 text-start">
                            <label for="usuario" class="form-label">Usuário</label>
                            <input type="text" class="form-control" id="usuario" name="usuario" value="admin" required>
                        </div>
                        <div class="mb-3 text-start">
                            <label for="senha" class="form-label">Senha</label>
                            <input type="password" class="form-control" id="senha" name="senha" value="admin" required>
                        </div>
                        <button class="btn btn-primary w-100" type="submit">Login</button>
                    </form>
                    <div class="mt-4 border-top pt-3">
                        <small class="text-muted">Último acesso gravado: ${ultimoAcesso}</small>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `);
});

app.post("/login", (req, res) => {
    const { usuario, senha } = req.body;

    if (usuario == 'admin' && senha == 'admin') {
        req.session.logado = true;
        req.session.usuarioNome = usuario;

        // CORREÇÃO DO HORÁRIO: Forçando fuso de Brasília (pt-BR + America/Sao_Paulo)
        const agora = obterDataHoraBrasilia();
        res.cookie("ultimoAcesso", agora, { 
            maxAge: 1000 * 60 * 60 * 24, 
            httpOnly: true 
        });

        res.redirect("/menu");
    } else {
        res.send("<script>alert('Usuário ou senha inválidos!'); window.location.href='/login';</script>");
    }
});

app.get('/', estaAutenticado, (req, res) => {
    res.redirect('/menu');
});

app.get("/menu", estaAutenticado, (req, res) => {
    const ultimoAcesso = req.cookies.ultimoAcesso || "Primeiro acesso";
    
    res.send(`
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
        <title>Menu - Biblioteca</title>
    </head>
    <body class="bg-light">
        <div class="container mt-5">
            <div class="card shadow mx-auto" style="max-width: 600px;">
                <div class="card-header bg-primary text-white text-center">
                    <h3 class="mb-0">📚 Menu do Sistema</h3>
                </div>
                <div class="card-body text-center">
                    <p class="text-muted">Último acesso: <strong>${ultimoAcesso}</strong></p>
                    <div class="d-grid gap-2">
                        <a href="/cadastrarLivro" class="btn btn-success btn-lg">📖 Cadastro de Livros</a>
                        <a href="/cadastrarLeitor" class="btn btn-info btn-lg">👤 Cadastro de Leitores</a>
                        <a href="/logout" class="btn btn-danger btn-lg">🚪 Logout</a>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `);
});

app.get("/cadastrarLivro", estaAutenticado, (req, res) => {
    gerarFormularioLivro(res);
});

app.post("/cadastrarLivro", estaAutenticado, (req, res) => {
    const dados = req.body;
    if (dados.titulo && dados.autor && dados.isbn) {
        listaLivros.push(dados);
        res.redirect("/listarLivros");
    } else {
        gerarFormularioLivro(res, dados, "Todos os campos são obrigatórios");
    }
});

app.get("/listarLivros", estaAutenticado, (req, res) => {
    const ultimoAcesso = req.cookies.ultimoAcesso || "N/A";
    
    let html = `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
        <title>Livros Cadastrados</title>
    </head>
    <body class="bg-light">
        <nav class="navbar navbar-dark bg-primary mb-4 shadow">
            <div class="container-fluid">
                <span class="navbar-brand">📚 Biblioteca</span>
                <a href="/logout" class="btn btn-outline-light btn-sm">Sair</a>
            </div>
        </nav>
        <div class="container">
            <div class="card shadow">
                <div class="card-header bg-primary text-white text-center">
                    <h5 class="mb-0">Lista de Livros Cadastrados</h5>
                </div>
                <div class="card-body">
                    <table class="table table-striped">
                        <thead class="table-dark">
                            <tr>
                                <th>Título</th>
                                <th>Autor</th>
                                <th>ISBN</th>
                            </tr>
                        </thead>
                        <tbody>`;
    
    if (listaLivros.length === 0) {
        html += `<tr><td colspan="3" class="text-center text-muted">Nenhum livro cadastrado</td></tr>`;
    } else {
        listaLivros.forEach(livro => {
            html += `<tr>
                <td>${livro.titulo}</td>
                <td>${livro.autor}</td>
                <td>${livro.isbn}</td>
            </tr>`;
        });
    }

    html += `           </tbody>
                    </table>
                    <div class="alert alert-info mt-3 p-2 text-center" style="font-size: 0.9rem;">
                        Usuário: <strong>${req.session.usuarioNome}</strong> | Último acesso: ${ultimoAcesso}
                    </div>
                    <div class="d-flex justify-content-between mt-3 gap-2">
                        <a href="/cadastrarLivro" class="btn btn-success">➕ Novo Livro</a>
                        <a href="/menu" class="btn btn-secondary">Menu</a>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>`;
    res.send(html);
});

app.get("/cadastrarLeitor", estaAutenticado, (req, res) => {
    gerarFormularioLeitor(res);
});

app.post("/cadastrarLeitor", estaAutenticado, (req, res) => {
    const dados = req.body;
    
    // Validação
    if (!dados.nome || dados.nome.trim() === "") {
        return gerarFormularioLeitor(res, dados, "Nome é obrigatório");
    }
    
    if (!dados.cpf || dados.cpf.trim() === "") {
        return gerarFormularioLeitor(res, dados, "CPF é obrigatório");
    }
    
    if (!dados.telefone || dados.telefone.trim() === "") {
        return gerarFormularioLeitor(res, dados, "Telefone é obrigatório");
    }
    
    if (!dados.dataEmprestimo || dados.dataEmprestimo === "") {
        return gerarFormularioLeitor(res, dados, "Data de Empréstimo é obrigatória");
    }
    
    if (!dados.dataDevolucao || dados.dataDevolucao === "") {
        return gerarFormularioLeitor(res, dados, "Data de Devolução é obrigatória");
    }
    
    if (listaLivros.length === 0) {
        return gerarFormularioLeitor(res, dados, "Cadastre um livro antes de emprestar");
    }
    
    if (!dados.livro || dados.livro === "") {
        return gerarFormularioLeitor(res, dados, "Selecione um livro para emprestar");
    }
    
    // Salvar leitor
    listaLeitores.push(dados);
    res.redirect("/sucessoLeitor");
});

app.get("/sucessoLeitor", estaAutenticado, (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
        <title>Sucesso</title>
    </head>
    <body class="bg-light">
        <div class="container mt-5">
            <div class="card shadow mx-auto" style="max-width: 600px; border: none;">
                <div class="card-body text-center py-5">
                    <div class="mb-4">
                        <svg class="text-success" style="width: 80px; height: 80px;" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z"/>
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                        </svg>
                    </div>
                    <h2 class="text-success mb-3">Livro Emprestado com Sucesso!</h2>
                    <p class="text-muted mb-1">O leitor foi cadastrado e o livro foi atribuído.</p>
                    <p class="text-muted small">Redirecionando para a lista de leitores...</p>
                </div>
            </div>
        </div>
        <script>
            setTimeout(() => {
                window.location.href = "/listarLeitores";
            }, 3000);
        </script>
    </body>
    </html>
    `);
});

app.get("/listarLeitores", estaAutenticado, (req, res) => {
    const ultimoAcesso = req.cookies.ultimoAcesso || "N/A";
    
    let html = `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
        <title>Leitores com Empréstimos</title>
    </head>
    <body class="bg-light">
        <nav class="navbar navbar-dark bg-primary mb-4 shadow">
            <div class="container-fluid">
                <span class="navbar-brand">📚 Biblioteca</span>
                <a href="/logout" class="btn btn-outline-light btn-sm">Sair</a>
            </div>
        </nav>
        <div class="container">
            <div class="card shadow">
                <div class="card-header bg-primary text-white text-center">
                    <h5 class="mb-0">Leitores com Livros Emprestados</h5>
                </div>
                <div class="card-body">
                    <table class="table table-striped">
                        <thead class="table-dark">
                            <tr>
                                <th>Nome</th>
                                <th>CPF</th>
                                <th>Telefone</th>
                                <th>Livro</th>
                                <th>Empréstimo</th>
                                <th>Devolução</th>
                            </tr>
                        </thead>
                        <tbody>`;
    
    if (listaLeitores.length === 0) {
        html += `<tr><td colspan="6" class="text-center text-muted">Nenhum empréstimo registrado</td></tr>`;
    } else {
        listaLeitores.forEach(leitor => {
            html += `<tr>
                <td>${leitor.nome}</td>
                <td>${leitor.cpf}</td>
                <td>${leitor.telefone}</td>
                <td>${leitor.livro}</td>
                <td>${leitor.dataEmprestimo}</td>
                <td>${leitor.dataDevolucao}</td>
            </tr>`;
        });
    }

    html += `           </tbody>
                    </table>
                    <div class="alert alert-info mt-3 p-2 text-center" style="font-size: 0.9rem;">
                        Usuário: <strong>${req.session.usuarioNome}</strong> | Último acesso: ${ultimoAcesso}
                    </div>
                    <div class="d-flex justify-content-between mt-3 gap-2">
                        <a href="/cadastrarLeitor" class="btn btn-success">➕ Novo Empréstimo</a>
                        <a href="/menu" class="btn btn-secondary">Menu</a>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>`;
    res.send(html);
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

function gerarFormularioLivro(res, dados = {}, erro = "") {
    const alertaErro = erro ? `<div class="alert alert-danger alert-dismissible fade show" role="alert">${erro}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>` : '';
    
    res.send(`
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
        <title>Cadastro de Livro</title>
    </head>
    <body class="bg-light">
        <div class="container mt-5">
            <div class="card shadow mx-auto" style="max-width: 800px;">
                <div class="card-header bg-primary text-white text-center">
                    <h3 class="mb-0">Cadastro de Livro</h3>
                </div>
                <div class="card-body">
                    ${alertaErro}
                    <form method="POST" action="/cadastrarLivro" class="row g-3">
                        <div class="col-md-12">
                            <label class="form-label">Título</label>
                            <input type="text" name="titulo" class="form-control" value="${dados.titulo || ''}" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Autor</label>
                            <input type="text" name="autor" class="form-control" value="${dados.autor || ''}" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">ISBN</label>
                            <input type="text" name="isbn" class="form-control" value="${dados.isbn || ''}" required>
                        </div>
                        <div class="col-12 text-center mt-4">
                            <button type="submit" class="btn btn-primary px-5">Cadastrar</button>
                            <a href="/listarLivros" class="btn btn-outline-secondary ms-2">Ver Lista</a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </body>
    </html>`);
}

function gerarFormularioLeitor(res, dados = {}, erro = "") {
    let options = '<option value="">Selecione um livro</option>';
    if (listaLivros.length > 0) {
        options += listaLivros.map(livro => 
            `<option value="${livro.titulo}" ${dados.livro === livro.titulo ? 'selected' : ''}>${livro.titulo}</option>`
        ).join('');
    }
    
    const alertaErro = erro ? `<div class="alert alert-danger alert-dismissible fade show" role="alert">${erro}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>` : '';
    
    res.send(`
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
        <title>Cadastro de Leitor</title>
    </head>
    <body class="bg-light">
        <div class="container mt-5">
            <div class="card shadow mx-auto" style="max-width: 800px;">
                <div class="card-header bg-primary text-white text-center">
                    <h3 class="mb-0">Cadastro de Leitor e Empréstimo de Livro</h3>
                </div>
                <div class="card-body">
                    ${alertaErro}
                    <form method="POST" action="/cadastrarLeitor" class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label">Nome</label>
                            <input type="text" name="nome" class="form-control" value="${dados.nome || ''}" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">CPF</label>
                            <input type="text" name="cpf" class="form-control" value="${dados.cpf || ''}" placeholder="000.000.000-00" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Telefone</label>
                            <input type="text" name="telefone" class="form-control" value="${dados.telefone || ''}" placeholder="(00) 00000-0000" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Livro para Emprestar</label>
                            <select name="livro" class="form-control" required>
                                ${options}
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Data do Empréstimo</label>
                            <input type="date" name="dataEmprestimo" class="form-control" value="${dados.dataEmprestimo || ''}" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Data de Devolução</label>
                            <input type="date" name="dataDevolucao" class="form-control" value="${dados.dataDevolucao || ''}" required>
                        </div>
                        <div class="col-12 text-center mt-4">
                            <button type="submit" class="btn btn-success px-5">Emprestar Livro</button>
                            <a href="/listarLeitores" class="btn btn-outline-secondary ms-2">Ver Lista</a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </body>
    </html>`);
}


app.listen(porta, host, () => {
    console.log(`Servidor rodando em http://${host}:${porta}`);
});