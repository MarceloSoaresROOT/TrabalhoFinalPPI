# Sistema de Biblioteca

Este é um sistema web para controle de livros e leitores de uma biblioteca.

## Funcionalidades

- Login e logout
- Cadastro de livros (título, autor, ISBN)
- Cadastro de leitores (nome, CPF, telefone, data de empréstimo, data de devolução, livro selecionado)
- Listagem de livros e leitores cadastrados
- Exibição da data e hora do último acesso

## Tecnologias

- Node.js
- Express
- Express-session
- Cookie-parser
- Bootstrap para interface

## Como executar

1. Instale as dependências: `npm install`
2. Execute o servidor: `npm start`
3. Acesse http://localhost:3000

Usuário: admin
Senha: admin

## Estrutura

- `app.js`: Arquivo principal do servidor
- `package.json`: Dependências e scripts