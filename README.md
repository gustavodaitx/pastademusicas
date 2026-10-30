# PDS — Pasta de Música 🎵

> Aplicação web responsiva e PWA para organizar músicas cifradas, criar repertórios litúrgicos (Modo Igreja) e de apresentações (Modo Barzinho), visualizar acordes em Modo Palco com autoscroll, importar documentos locais (DOCX, PDF, TXT) e exportar repertórios.

---

## ⚡ Regra de Ouro: Custo Zero Obrigatório
Este projeto foi concebido e estruturado para ter **custo zero permanente**.
- **100% Gratuito e Open-Source**: Sem cobranças obrigatórias, sem ativação de cartões de crédito.
- **Firebase Spark**: Authentication e Cloud Firestore operando dentro das cotas gratuitas mensais e diárias.
- **Processamento no Navegador**: Extração de arquivos DOCX, PDFs textuais, TXT e transposição de acordes executados inteiramente client-side (sem servidores caros).
- **Patrocínio Voluntário**: Doações via Pix estático (sem intermediários ou gateways de pagamento pagos).
- Detalhes completos e limites de cotas documentados em [`docs/LIMITES_E_CUSTOS.md`](file:///c:/Users/Gustavo%20Daitx/Desktop/Ulbra/10Semestre/pastademusicas/docs/LIMITES_E_CUSTOS.md).

---

## 🚀 Funcionalidades Principais

1. **Biblioteca e Pesquisa**: Cadastro e pesquisa inteligente de cifras por título, tom, artista, categoria, tags e momentos litúrgicos.
2. **Importação Local Multi-formato**: Suporte a arquivos `.docx` (via Mammoth), `.pdf` textual (via PDF.js) e `.txt`, com pré-visualização e confirmação antes de salvar.
3. **Playlists Manuais**: Criação, edição, reordenação acessível e persistência de repertórios.
4. **Modo Igreja**: Sequência litúrgica obrigatória de 10 momentos (Entrada, Perdão, Glória, Salmo, Aclamação, Ofertório, Santo, Comunhão, Pós-comunhão e Final) com sugestões baseadas exclusivamente no catálogo existente (sem alucinação).
5. **Modo Barzinho**: Geração de repertório assistido com filtros de estilo, quantidade (5 a 40), alternância de ritmos e preferência de tom.
6. **Modo Palco**: Interface escurecida com contraste de alta legibilidade, rolagem automática suave com velocidade regulável e atalhos rápidos.
7. **Exportação**: Geração de repertórios em PDF formatado, TXT, HTML e DOCX.
8. **Integração Google Drive**: Importação assistida de arquivos via Google Picker oficial com escopo mínimo (`drive.file`).
9. **Apoio Voluntário via Pix**: QR Code e código copia-e-cola estáticos do Pix sem intermediários.

---

## 🛠️ Stack Tecnológica

- **Frontend**: React 18 / TypeScript / Vite
- **Estilização**: Tailwind CSS / Lucide Icons
- **Roteamento**: React Router v6
- **Autenticação e Nuvem**: Firebase Authentication & Cloud Firestore (Plano Spark)
- **Parsers Locais**: Mammoth.js (DOCX), PDF.js (PDF com camada de texto), FileReader nativo (TXT)
- **Exportação Local**: jsPDF (PDF), docx (DOCX), Blobs nativos (HTML / TXT)
- **Testes**: Vitest, React Testing Library

---

## 📂 Estrutura de Documentação

- [`docs/ESPECIFICACAO_TECNICA.md`](file:///c:/Users/Gustavo%20Daitx/Desktop/Ulbra/10Semestre/pastademusicas/docs/ESPECIFICACAO_TECNICA.md): Especificação completa e prompt mestre.
- [`docs/DECISOES_TECNICAS.md`](file:///c:/Users/Gustavo%20Daitx/Desktop/Ulbra/10Semestre/pastademusicas/docs/DECISOES_TECNICAS.md): Diagnóstico, decisões arquiteturais e mitigação de riscos.
- [`docs/LIMITES_E_CUSTOS.md`](file:///c:/Users/Gustavo%20Daitx/Desktop/Ulbra/10Semestre/pastademusicas/docs/LIMITES_E_CUSTOS.md): Inventário de cotas gratuitas e alternativas.
- [`TASK.md`](file:///c:/Users/Gustavo%20Daitx/Desktop/Ulbra/10Semestre/pastademusicas/TASK.md): Rastreamento detalhado das etapas T00 a T15 e critérios de aceite.

---

## 💻 Como Executar Localmente

### Pré-requisitos
- Node.js `v20+` ou `v22+`
- npm `10+`
- Git

### Instalação (após implementação da fase T01)
```bash
# Clone ou acesse o repositório
git clone <url-do-repositorio>

# Crie seu arquivo de variáveis de ambiente a partir do exemplo
cp .env.example .env.local

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

### Comandos de Testes e Validação
```bash
npm run typecheck    # Verificação estrita de tipagem TypeScript
npm run lint         # Verificação de padrões de código
npm run test         # Execução dos testes unitários
npm run build        # Geração do bundle de produção
```

## Autenticação Firebase (T02)

A autenticação usa Firebase Authentication com e-mail e senha no plano Spark. Crie um projeto Firebase exclusivo para Pasta de Música, cadastre um aplicativo Web e habilite **Authentication > Sign-in method > E-mail/senha**. Em **Authentication > Settings > Authorized domains**, confira os domínios usados localmente e na hospedagem. Em **Configurações do projeto > Seus aplicativos**, copie a configuração do aplicativo Web.

Na raiz do projeto, copie `.env.example` para `.env.local` e preencha as seis variáveis `VITE_FIREBASE_*` com os valores desse projeto. O `.env.local` é ignorado pelo Git. Reinicie `npm run dev` após editar as variáveis. Sem configuração, a tela de login informa o que falta e não simula autenticação.

As rotas Biblioteca, Playlists, Importar, Igreja, Barzinho, Palco, Patrocínio e Configurações exigem login. O dashboard em `/` e a tela `/login` permanecem públicos.
