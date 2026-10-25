PDS — Pasta de Música
Especificação técnica e Prompt Mestre para Codex ou Antigravity
Versão: 1.0  
Objetivo: orientar a construção incremental de uma aplicação web responsiva para organizar músicas cifradas, criar repertórios e playlists, importar documentos, exportar materiais e integrar-se ao Google Drive.  
Regra inegociável: o projeto deve ser desenvolvido e operado sem custos obrigatórios. Usar somente ferramentas, planos e cotas gratuitas, sem ativar faturamento pago. Se uma funcionalidade exigir serviço pago, plano pago ou exceder cotas gratuitas, não implementá-la como dependência obrigatória: propor alternativa gratuita e documentar a limitação.
---
PARTE A — ESPECIFICAÇÃO TÉCNICA
1. Visão do produto
O Pasta de Música será uma aplicação web responsiva, com possibilidade de instalação como PWA, para cadastrar, importar, pesquisar, visualizar e organizar músicas cifradas. Deverá funcionar em computador, notebook, tablet e celular.
Objetivos principais
Importar arquivos `.docx`, `.pdf` e `.txt` do computador.
Planejar integração com Google Drive para selecionar e importar arquivos autorizados.
Cadastrar e pesquisar músicas cifradas.
Criar playlists manuais e automáticas.
Oferecer modo Igreja com momentos litúrgicos ordenados.
Oferecer modo Barzinho com repertório por estilo e quantidade.
Exibir cifras em modo palco, com rolagem automática e fonte ajustável.
Exportar músicas e playlists em PDF, DOCX, HTML e TXT, conforme viabilidade técnica.
Separar perfil ADMIN de perfil FREE.
Exibir opção de patrocínio voluntário por Pix, sem processamento pago obrigatório.
Preparar, em fase futura, exportação/sincronização de TXT ou `.pro` com pastas do Google Drive e eventual aplicativo Android.
Fora do escopo inicial
Aplicativo Android nativo completo.
Pagamento recorrente ou confirmação automática de Pix por API paga.
API própria que extraia letras/cifras de sites de terceiros sem autorização.
OCR avançado obrigatório para PDFs digitalizados.
Serviços de backend que exijam plano pago.
Promessa de armazenamento ou tráfego ilimitados.
2. Regra de custo zero — obrigatória
O agente de programação deve obedecer às seguintes restrições em todas as fases:
Não ativar nem recomendar ativação de faturamento pago.
Não migrar Firebase Spark para Blaze.
Não adicionar serviços que exijam cartão de crédito, assinatura ou cobrança para as funções essenciais.
Não usar APIs pagas, modelos de IA pagos, serviços de OCR pagos, bancos pagos, hospedagem paga ou armazenamento pago.
Preferir processamento no navegador e bibliotecas open-source com licença compatível.
Usar Firebase Authentication e Cloud Firestore somente dentro do plano gratuito e das cotas vigentes.
Usar hospedagem estática gratuita, por exemplo Cloudflare Pages ou Firebase Hosting, após verificar os limites atuais.
Usar Google Drive API/Picker dentro das cotas e condições gratuitas aplicáveis; não prometer uso ilimitado.
Usar Pix estático com chave/código real fornecido pelo responsável, sem gateway de pagamento. Não afirmar que uma contribuição foi recebida automaticamente.
Não guardar segredos, chaves privadas, tokens OAuth ou credenciais de serviço no repositório.
Se uma funcionalidade não puder ser concluída dentro dessas restrições, documentar a limitação e apresentar alternativa gratuita; não implementar uma dependência paga “temporária”.
Não fazer deploy que habilite faturamento ou gere cobrança sem aprovação explícita do responsável — e, neste projeto, a solução padrão deve continuar sem cobrança.
O termo “gratuito” significa sem custo obrigatório enquanto o uso permanecer nos limites e termos do fornecedor. O projeto deve informar que cotas e condições de terceiros podem mudar.
3. Stack proposta
Adotar esta stack salvo se o repositório já possuir uma arquitetura estabelecida que justifique outra opção gratuita:
Frontend: React + TypeScript + Vite.
Estilo: Tailwind CSS e componentes acessíveis, sem dependência de bibliotecas pagas.
Rotas: React Router.
Formulários/validação: React Hook Form e Zod, se necessários.
Autenticação e banco: Firebase Authentication + Cloud Firestore, plano Spark.
Hospedagem: Cloudflare Pages ou Firebase Hosting em modalidade gratuita.
PWA: manifest e service worker com estratégia conservadora; não armazenar dados privados em cache compartilhado.
DOCX import: Mammoth.js ou alternativa open-source adequada.
PDF import: PDF.js para extrair texto de PDFs com camada textual.
DOCX export: biblioteca open-source compatível com navegador, por exemplo `docx`.
PDF export: biblioteca open-source executada no navegador, como jsPDF ou pdfmake, avaliando qualidade de impressão.
HTML/TXT export: geração local no navegador.
Google Drive: Google Picker + Google Drive API, usando escopos mínimos e consentimento explícito.
Testes: Vitest, React Testing Library e Playwright, se compatíveis com o ambiente e sem serviços pagos.
Qualidade: ESLint, Prettier e TypeScript strict quando possível.
Antes de instalar dependências, conferir versões, manutenção, licença, compatibilidade e tamanho do bundle. Evitar dependências redundantes.
4. Perfis e permissões
ADMIN
Acessar painel administrativo.
Gerenciar categorias e metadados do catálogo público.
Cadastrar, editar, desativar ou remover músicas públicas, respeitando histórico e referências.
Visualizar métricas técnicas não sensíveis e estado da aplicação.
Configurar informações públicas do patrocínio Pix.
Não receber automaticamente acesso aos arquivos privados do Google Drive dos usuários.
Não ler ou alterar playlists privadas de outros usuários, salvo necessidade explicitamente definida e legalmente justificada.
FREE
Criar e editar seu perfil básico.
Importar músicas próprias/autorizadas.
Pesquisar o catálogo público e suas próprias músicas.
Criar, editar, ordenar e apagar suas playlists.
Favoritar músicas.
Exportar documentos e playlists dentro dos limites locais.
Conectar e desconectar seu próprio Google Drive mediante consentimento.
Acessar a opção de patrocínio voluntário.
Atribuição segura de ADMIN
Nunca permitir que o cliente altere seu próprio campo de perfil para obter privilégios. Criar o primeiro ADMIN por procedimento administrativo seguro e documentado, por exemplo configuração inicial controlada ou Firebase custom claims configuradas por ferramenta administrativa autorizada. Não colocar segredo administrativo no frontend.
5. Telas e navegação
Telas obrigatórias
Página inicial / Dashboard
Pesquisa rápida.
Atalhos para Biblioteca, Playlists, Importar e Favoritos.
Músicas recentes e playlists recentes, sem expor dados de terceiros.
Login e cadastro
E-mail e senha.
Estados de carregamento e mensagens de erro compreensíveis.
Recuperação de senha, se suportada pelo provedor configurado.
Biblioteca
Lista ou grade responsiva.
Pesquisa por título, artista, trecho, tom, categoria e tags.
Filtros e ordenação.
Importar música
Selecionar arquivo local DOCX/PDF/TXT.
Mostrar progresso, erro, tipo não suportado e tamanho máximo.
Pré-visualizar texto extraído.
Formulário para revisar título, artista, tom, categoria e origem.
Salvar somente após confirmação do usuário.
Visualização da música
Título, artista, tom e metadados.
Letra cifrada preservando espaços e quebras de linha.
Ações: editar (quando autorizado), favoritar, adicionar à playlist, exportar e abrir modo palco.
Editor de música
Campo de cifra com preservação de formatação monoespaçada.
Alterar título, tom, artista, tags e categorias.
Não transpor acordes por substituição textual ingênua.
Playlists
Listar, criar, renomear, duplicar e excluir playlist própria.
Adicionar/remover músicas.
Reordenar por drag-and-drop com alternativa acessível por botões “subir/descer”.
Salvar e reabrir com ordem preservada.
Criador de playlist — Modo Igreja
Nome do evento/celebração.
Dez posições em ordem: Entrada, Perdão, Glória, Salmo, Aclamação, Ofertório, Santo, Comunhão, Pós-comunhão, Final.
Selecionar uma música existente por posição.
Gerar sugestões apenas a partir do catálogo autorizado e dos metadados.
Deixar posição vazia quando não houver correspondência; nunca inventar música ou cifra.
Permitir troca manual, salvamento e exportação.
Criador de playlist — Modo Barzinho
Estilo musical, quantidade de músicas (por exemplo 5–40), preferência por tons e alternância de ritmo.
Selecionar músicas reais já existentes na biblioteca autorizada.
Evitar repetições na mesma playlist quando houver opções suficientes.
Exibir aviso quando não houver músicas suficientes.
Modo palco
Tema escuro.
Fonte ajustável.
Rolagem automática com iniciar, pausar, continuar e reiniciar.
Controle de velocidade.
Manter alinhamento de cifras e letra.
Navegação anterior/próxima música da playlist.
Botões grandes e acessíveis.
Exportação
PDF como prioridade.
TXT e HTML.
DOCX quando a qualidade de formatação for aceitável.
Layout clássico de uma coluna, duas colunas e compacto, se possível.
Exibir pré-visualização e tratar erros.
Configurações
Tema, fonte e preferências.
Conectar/desconectar Drive.
Exportar dados próprios quando viável.
Excluir conta/dados próprios conforme política implementada.
Patrocínio
Explicar que a contribuição é voluntária.
Mostrar valores sugeridos e opção de valor livre apenas como orientação.
Exibir QR Code/código Pix estático configurado pelo responsável.
Botão para copiar código Pix.
Não simular confirmação automática.
Administração
Acesso exclusivo a ADMIN.
Gerenciar catálogo público, categorias e configurações públicas do Pix.
Mostrar mensagens de estado e confirmação antes de ações destrutivas.
6. Modelo de dados Firestore
Usar IDs gerados pelo Firestore. Todos os documentos devem ter `createdAt` e `updatedAt` quando aplicável. Definir índices somente quando exigidos pelas consultas reais.
`usuarios/{uid}`
`uid: string`
`nome: string`
`email: string`
`perfil: "ADMIN" | "FREE"` — campo informativo; privilégios não devem depender apenas de valor enviado pelo cliente.
`preferencias: { tema: "claro" | "escuro" | "sistema", tamanhoFonte: number, velocidadeAutoscroll: number }`
`createdAt: timestamp`
`updatedAt: timestamp`
`musicas/{musicaId}`
`titulo: string`
`artista: string | null`
`tomOriginal: string | null`
`conteudoCifrado: string`
`categorias: string[]`
`tags: string[]`
`momentosLiturgicos: string[]`
`estilo: string[]`
`origemTipo: "catalogo" | "upload_local" | "google_drive" | "manual"`
`proprietarioUid: string | null`
`visibilidade: "publica" | "privada"`
`driveFileId: string | null` — quando aplicável; não armazenar tokens.
`arquivoNome: string | null`
`licencaOuPermissao: string | null`
`createdAt: timestamp`
`updatedAt: timestamp`
A aplicação deve validar tamanho máximo do texto e dos arrays. Arquivos binários não devem ser armazenados no Firestore.
`playlists/{playlistId}`
`nome: string`
`tipo: "manual" | "igreja" | "barzinho"`
`proprietarioUid: string`
`visibilidade: "privada" | "compartilhada"`
`itens: Array<{ musicaId: string, posicao: number, momento: string | null, tomPersonalizado: string | null }>`
`parametrosGeracao: map | null`
`createdAt: timestamp`
`updatedAt: timestamp`
Validar que o proprietário é o usuário autenticado. Se playlists compartilhadas forem implementadas, definir explicitamente a lista de autorizados e suas permissões; não presumir que a palavra “compartilhada” seja suficiente para liberar acesso.
`pastas/{pastaId}`
`nome: string`
`proprietarioUid: string`
`musicaIds: string[]` ou subcoleção, conforme os limites e consultas
`createdAt: timestamp`
`updatedAt: timestamp`
`categorias/{categoriaId}`
`nome: string`
`tipo: "publica" | "pessoal"`
`proprietarioUid: string | null`
`ativa: boolean`
`createdAt: timestamp`
`updatedAt: timestamp`
`patrocinios/{patrocinioId}`
`valorInformado: number | null`
`status: "informado" | "confirmado_manualmente"`
`referencia: string | null`
`createdAt: timestamp`
Não guardar dados bancários sensíveis ou credenciais.
Não declarar pagamento confirmado sem confirmação real por processo autorizado.
Observação de modelagem
A coleção `arquivos` só deve ser criada se houver necessidade real de registrar metadados de arquivos externos. Para a primeira versão, `origemTipo`, `arquivoNome` e `driveFileId` na música podem bastar. Evitar modelagem antecipada desnecessária.
7. Regras de segurança
As regras devem ser escritas e testadas com o Firebase Emulator Suite quando possível. Não publicar regras permissivas como `allow read, write: if true`.
Requisitos:
Exigir autenticação para dados pessoais.
Usuário FREE só pode criar/ler/editar/excluir suas próprias músicas privadas, playlists, pastas e preferências.
Usuários autenticados podem ler apenas músicas públicas do catálogo e os dados privados próprios.
Somente ADMIN pode modificar o catálogo público e configurações administrativas.
O papel ADMIN deve ser verificado por mecanismo confiável, idealmente custom claims configuradas fora do cliente. Não confiar apenas em `usuarios/{uid}.perfil` gravável pelo usuário.
Validar tipos, campos permitidos, tamanhos e transições de estado nas regras e também na camada de aplicação.
Não permitir alteração de `proprietarioUid` após a criação.
Não permitir que o usuário modifique o UID de outra pessoa.
Não expor chaves privadas, service account, client secret ou tokens em código versionado.
OAuth do Drive: usar escopo mínimo, fluxo oficial e consentimento explícito. Tokens devem ser tratados com segurança e nunca enviados a logs.
O front-end nunca deve incluir credenciais administrativas.
Implementar estados de erro e negar acesso por padrão.
Não afirmar que regras foram validadas sem executar testes.
As regras reais dependem da estratégia de custom claims e das consultas finais. O agente deve escrever regras coerentes com o modelo implementado e incluir testes positivos e negativos. Se a promoção inicial de ADMIN exigir ferramenta fora do cliente, documentar o procedimento; não criar botão público para isso.
8. Importação e formatação de cifras
DOCX: extrair parágrafos e, quando possível, preservar a sequência. Documentos com tabelas/colunas podem exigir revisão.
PDF textual: usar PDF.js para extração.
PDF escaneado: informar que não há texto extraível; OCR é melhoria opcional e deve ser gratuito/local ou ficar fora do MVP.
TXT: preservar quebras de linha, espaços e acordes.
Mostrar pré-visualização e pedir confirmação antes de salvar.
Definir limite de tamanho configurável e explicar erros.
Não executar macros nem conteúdo ativo de documentos.
Tratar nomes de arquivos como dados não confiáveis.
Não enviar o conteúdo de documentos a serviços externos sem consentimento.
Preservar formatação por meio de área de texto monoespaçada ou representação estruturada; não confiar em HTML arbitrário importado.
Não prometer conversão perfeita de todo DOCX/PDF para cifra alinhada.
9. Pesquisa e geração automática
Pesquisa
Começar com pesquisa simples no conjunto de músicas acessível ao usuário.
Filtrar por título, artista, tags, categoria, tom e momento litúrgico.
Se o catálogo crescer, avaliar índices e custos antes de adotar serviço externo.
Mostrar resultados vazios e erros de forma clara.
Playlist automática — Igreja
Usar exatamente a ordem de dez momentos definida na seção 5.
Consultar apenas músicas existentes e acessíveis ao usuário.
Pontuar compatibilidade com `momentosLiturgicos`, `categorias`, tags e preferências.
Evitar repetir a mesma música na playlist quando houver alternativas.
Deixar posição sem seleção quando não existir correspondência adequada.
Não fazer scraping automático de sites externos.
Exibir que sugestões automáticas precisam de revisão humana.
Playlist automática — Barzinho
Parâmetros: estilo, quantidade, preferência de tom e alternância de ritmo.
Consultar músicas existentes na biblioteca autorizada.
Remover duplicatas e, quando possível, alternar andamento/estilo.
Se não houver quantidade suficiente, informar quantas músicas foram encontradas e não inventar conteúdo.
10. Transposição de tom e modo palco
A transposição deve ser implementada como funcionalidade independente e testável. Não substituir letras como “A”, “C” ou “D” indiscriminadamente, pois essas letras também podem aparecer no texto. Identificar acordes por padrões definidos e cobrir acordes maiores, menores, sustenidos/bemóis, sétimas e baixos invertidos conforme o escopo. Documentar limitações.
Modo palco:
tema escuro de alto contraste;
fonte e espaçamento ajustáveis;
rolagem controlada sem bloquear a página inteira;
iniciar, pausar, continuar, reiniciar;
velocidade com limites;
manter a música ativa ao mudar temporariamente de controle, quando possível;
respeitar preferências de acessibilidade e reduzir movimento quando apropriado.
11. Google Drive
Implementar somente depois do fluxo local funcionar.
Configurar projeto Google Cloud e OAuth.
Usar Google Picker/Drive API e escopos mínimos.
O usuário escolhe quais arquivos compartilhar com a aplicação.
Guardar apenas IDs e metadados necessários; não persistir tokens no Firestore.
Tratar cancelamento de autorização, token expirado, arquivo excluído e acesso revogado.
Não criar sincronização bidirecional complexa no MVP.
Primeiro: selecionar/importar arquivo. Depois: exportar para pasta escolhida, quando permitido.
Confirmar o formato `.pro` com o aplicativo de destino antes de produzi-lo.
Não garantir funcionamento offline do arquivo que só existe no Drive.
Documentar quotas e restrições de OAuth.
12. Exportação
PDF — prioridade
Exportar playlist na ordem salva.
Incluir nome da playlist, título da música e tom.
Evitar dividir blocos de cifra de forma ilegível.
Suportar modo compacto e uma coluna inicialmente.
Duas colunas pode ser fase posterior.
Mostrar pré-visualização ou permitir regeneração.
TXT
Preservar linhas, acordes e ordem das músicas.
Formato robusto para sincronização futura.
HTML
Documento autônomo com estilos embutidos simples, sem scripts desnecessários.
DOCX
Usar biblioteca open-source compatível.
Testar em Word/LibreOffice e documentar diferenças de formatação.
13. Patrocínio via Pix
MVP: contribuição voluntária com QR Code Pix estático e código copia-e-cola configurados pelo responsável.
Não incluir chave Pix inventada ou fictícia na versão publicada.
Não integrar gateway pago nem implementar recorrência.
Não confirmar pagamento automaticamente.
Se houver registro, distinguir “informado pelo usuário” de “confirmado manualmente”.
Não exigir contribuição para usar recursos FREE.
Não coletar dados bancários desnecessários.
14. Estrutura de pastas proposta
```text
pasta-de-musica/
├── public/
│   ├── icons/
│   ├── manifest.webmanifest
│   └── robots.txt
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers/
│   ├── assets/
│   ├── components/
│   │   ├── common/
│   │   ├── layout/
│   │   ├── music/
│   │   ├── playlist/
│   │   └── forms/
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── library/
│   │   ├── import-music/
│   │   ├── music-viewer/
│   │   ├── playlists/
│   │   ├── church-mode/
│   │   ├── bar-mode/
│   │   ├── stage-mode/
│   │   ├── export/
│   │   ├── google-drive/
│   │   ├── sponsorship/
│   │   ├── settings/
│   │   └── admin/
│   ├── hooks/
│   ├── lib/
│   │   ├── firebase/
│   │   ├── document-parsers/
│   │   ├── chord-transposition/
│   │   └── export/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── styles/
│   └── main.tsx
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── ESPECIFICACAO_TECNICA.md
│   ├── ARQUITETURA.md
│   ├── MODELO_DE_DADOS.md
│   ├── SEGURANCA.md
│   ├── CONFIGURACAO_LOCAL.md
│   ├── DEPLOY_GRATUITO.md
│   ├── LIMITES_E_CUSTOS.md
│   └── DECISOES_TECNICAS.md
├── TASK.md
├── README.md
├── .env.example
├── .gitignore
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── package.json
├── tsconfig.json
└── vite.config.ts
```
A estrutura é uma proposta inicial, não uma exigência para criar diretórios vazios. Criar arquivos e pastas conforme a funcionalidade realmente implementada. Se o repositório já tiver estrutura, inspecioná-lo e adaptar sem reescrever tudo.
15. Arquivo obrigatório `TASK.md`
Criar na raiz um arquivo `TASK.md` com caixas de seleção por etapa. Cada tarefa precisa conter:
ID;
descrição e resultado esperado;
dependências;
implementação;
testes obrigatórios;
critérios de aceite;
estado: `PENDENTE`, `EM ANDAMENTO`, `BLOQUEADA` ou `CONCLUÍDA`;
observações e limitações.
O agente deve atualizar o `TASK.md` durante o trabalho. Não marcar tarefa como concluída sem executar os testes aplicáveis e registrar seus resultados. Se não puder executar um teste, marcar como bloqueado/não executado e explicar.
Modelo mínimo do `TASK.md`
[ ] T00 — Diagnóstico do repositório
Inspecionar estrutura, stack, scripts e estado do Git.
Não alterar arquivos antes de apresentar o diagnóstico e plano.
Aceite: diagnóstico e plano registrados em `docs/DECISOES_TECNICAS.md`.
[ ] T01 — Base da aplicação e layout responsivo
Criar/ajustar app, rotas, layout, tema e navegação.
Testar desktop e viewport móvel.
Aceite: telas-base navegáveis, sem erros de console relevantes.
[ ] T02 — Autenticação
Configurar Firebase Authentication sem segredos no repositório.
Testar cadastro, login, logout e erros.
Aceite: sessão e estados protegidos funcionam.
[ ] T03 — Modelo de dados e segurança
Definir tipos, regras Firestore e índices necessários.
Testar leitura/escrita autorizada e negada.
Aceite: usuário não acessa dados privados de outro usuário; ADMIN é protegido.
[ ] T04 — Biblioteca e pesquisa
Implementar cadastro/listagem, filtros e visualização.
Aceite: pesquisar e abrir músicas de exemplo e próprias.
[ ] T05 — Importação local
DOCX, PDF textual e TXT, com pré-visualização.
Testar arquivo válido, vazio, inválido e grande demais.
Aceite: usuário revisa antes de salvar; erros são claros.
[ ] T06 — Playlists manuais
Criar, editar, reordenar, remover itens e salvar.
Aceite: ordem permanece após recarregar e reabrir.
[ ] T07 — Modo Igreja
Dez momentos na ordem definida e sugestões apenas do catálogo.
Aceite: não inventa músicas; posições sem correspondência ficam vazias.
[ ] T08 — Modo Barzinho
Filtros de estilo, quantidade, preferência de tom e alternância.
Aceite: sem duplicatas evitáveis e sem conteúdo inventado.
[ ] T09 — Modo palco e rolagem automática
Tema escuro, tamanho de fonte, velocidade, pausar/retomar.
Aceite: controles funcionam em desktop e celular.
[ ] T10 — Exportação PDF e TXT
Exportar música e playlist.
Aceite: ordem, títulos, tons e quebras de linha corretos.
[ ] T11 — Exportação DOCX e HTML
Implementar e testar compatibilidade.
Aceite: arquivos abrem e conteúdo está legível.
[ ] T12 — Google Drive
OAuth, Picker, importação autorizada e tratamento de revogação.
Aceite: usuário escolhe arquivo e a aplicação não acessa todo o Drive indiscriminadamente.
[ ] T13 — Patrocínio Pix
QR Code estático real configurável, copiar código e texto informativo.
Aceite: não há cobrança/gateway nem falsa confirmação automática.
[ ] T14 — PWA, acessibilidade e responsividade
Manifest, ícones, teclado, foco e layouts.
Aceite: telas essenciais funcionam em larguras móveis e desktop.
[ ] T15 — Testes finais e documentação
Rodar lint, typecheck, testes e build.
Atualizar README e documentação de custos, implantação e limitações.
Aceite: resultados documentados; nenhuma dependência paga obrigatória.
16. Estratégia de testes e critérios globais
Executar conforme a etapa:
`npm run lint`
`npm run typecheck` (criar script se necessário)
`npm run test`
`npm run build`
testes de regras Firestore com Emulator Suite quando viável;
testes unitários de parsers, playlist e transposição;
testes de integração de autenticação e persistência;
testes E2E de fluxos essenciais;
inspeção responsiva em pelo menos um viewport móvel e um desktop.
Critérios globais:
Nenhuma função essencial exige serviço pago.
Nenhuma credencial secreta está versionada.
As regras de segurança não são abertas.
Usuários não acessam músicas privadas ou playlists de terceiros sem permissão.
Importações inválidas falham com mensagens claras.
O sistema não inventa letras, cifras ou músicas para completar playlists.
Playlist mantém a ordem depois de salvar e reabrir.
PDF exportado é legível e preserva a sequência.
A interface é utilizável por teclado e em telas pequenas.
A documentação declara limitações, cotas gratuitas e procedimentos de configuração.
O agente não declara testes como aprovados sem executá-los.
O projeto permanece em modo gratuito e não ativa billing.
17. Fluxo Git e trabalho seguro
Antes de alterar código, inspecionar branch, status, estrutura, scripts e mudanças existentes.
Trabalhar na branch atual de tarefa ou solicitar/criar uma branch de trabalho adequada, sem tocar diretamente em `master`/`main`.
Não descartar alterações preexistentes do usuário.
Não executar reset destrutivo, force-push, merge ou publicação sem autorização explícita.
Fazer alterações pequenas e coerentes por etapa.
Revisar diff antes de encerrar cada etapa.
Não fazer commit automaticamente, a menos que o responsável solicite.
Registrar arquivos alterados, testes executados, resultados, riscos e pendências.
Preservar a arquitetura existente quando o repositório já estiver iniciado.
18. Documentação exigida
Manter atualizados:
`README.md`: visão geral, requisitos, instalação e comandos.
`docs/ESPECIFICACAO_TECNICA.md`: este documento.
`docs/ARQUITETURA.md`: módulos e fluxo de dados.
`docs/MODELO_DE_DADOS.md`: coleções, campos e relações.
`docs/SEGURANCA.md`: regras, papéis e configuração de ADMIN.
`docs/CONFIGURACAO_LOCAL.md`: setup local.
`docs/DEPLOY_GRATUITO.md`: publicação dentro de limites gratuitos.
`docs/LIMITES_E_CUSTOS.md`: serviços usados, cotas verificadas, riscos de mudança e alternativas.
`docs/DECISOES_TECNICAS.md`: diagnóstico inicial, decisões e motivos.
`TASK.md`: estado real das tarefas.
---
PARTE B — PROMPT MESTRE PARA CODEX OU ANTIGRAVITY
Copie o prompt abaixo para a ferramenta de programação. O agente deve ler o repositório antes de agir.
PROMPT MESTRE
Você é um engenheiro de software sênior, arquiteto de aplicações web e responsável por qualidade, segurança, acessibilidade e controle de custos. Sua missão é construir o projeto PDS Pasta de Música de forma incremental, testável e documentada, seguindo a especificação deste documento.
A. REGRA INEGOCIÁVEL: CUSTO ZERO
Este projeto não pode ter custos obrigatórios. Use somente alternativas gratuitas e open-source, banco de dados gratuito, hospedagem gratuita e cotas gratuitas. Não ative billing, não migre Firebase Spark para Blaze, não adicione APIs pagas, não use armazenamento pago, não contrate domínio pago e não crie dependência essencial de serviço pago.
Antes de selecionar qualquer serviço externo:
Verifique se existe opção gratuita adequada.
Registre no documento `docs/LIMITES_E_CUSTOS.md` o nome, a finalidade, a modalidade gratuita, os limites conhecidos, a data de verificação e a alternativa.
Não prometa gratuidade ilimitada.
Se a função ultrapassar as cotas ou exigir plano pago, interrompa essa parte, documente o bloqueio e apresente uma alternativa gratuita.
Nunca habilite cobrança nem solicite cartão como parte da implementação.
Use Firebase Spark para Authentication/Firestore quando adequado, e hospedagem estática gratuita, como Cloudflare Pages ou Firebase Hosting, respeitando os limites atuais. Pix deve ser estático e voluntário, sem gateway pago e sem confirmação automática.
B. PRIMEIRO PASSO: DIAGNÓSTICO, NÃO CODIFICAR IMEDIATAMENTE
Antes de editar qualquer arquivo:
Inspecione a estrutura do repositório, arquivos de configuração, dependências, scripts, branch e `git status`.
Identifique se o projeto já existe e quais padrões devem ser preservados.
Não sobrescreva arquivos nem remova funcionalidades existentes sem justificativa.
Produza um diagnóstico curto com stack, estado atual, riscos e plano incremental.
Crie/atualize `docs/DECISOES_TECNICAS.md` e o `TASK.md` na raiz.
Só então implemente a primeira etapa aprovada pelo plano; se a ferramenta puder agir autonomamente, implemente apenas a primeira etapa e valide-a antes de continuar.
C. ARQUIVO TASK.md OBRIGATÓRIO
Crie na raiz um arquivo `TASK.md` com todas as etapas T00–T15 da especificação. Para cada etapa, registre:
objetivo;
dependências;
subtarefas;
testes;
critérios de aceite;
estado `PENDENTE`, `EM ANDAMENTO`, `BLOQUEADA` ou `CONCLUÍDA`;
resultado dos testes e observações.
Atualize esse arquivo durante a execução. Nunca marque uma tarefa como concluída sem testes aplicáveis executados e resultados registrados. Se um teste não puder ser executado, registre “NÃO EXECUTADO” e o motivo. Não marque toda a aplicação como concluída se apenas parte estiver implementada.
D. IMPLEMENTAÇÃO POR FASES
Siga a ordem abaixo e evite misturar várias fases em uma mudança grande:
Diagnóstico, decisões técnicas e TASK.md.
Base React + TypeScript + Vite, layout responsivo, rotas e tema.
Firebase Authentication e proteção de rotas.
Modelo Firestore, regras e testes de autorização.
Biblioteca, cadastro e pesquisa de músicas.
Importação local de DOCX, PDF textual e TXT com pré-visualização.
Playlists manuais com persistência e ordenação.
Modo Igreja com dez momentos fixos.
Modo Barzinho com filtros e geração a partir de músicas existentes.
Modo palco e rolagem automática.
Exportação PDF e TXT.
Exportação DOCX e HTML.
Integração Google Drive via OAuth/Picker com escopos mínimos.
Patrocínio via Pix estático.
PWA, acessibilidade, testes finais, documentação e publicação gratuita.
Após cada fase:
execute lint, typecheck, testes e build disponíveis;
adicione ou ajuste testes;
revise o diff;
atualize `TASK.md`;
registre arquivos alterados, resultados, limitações e próximo passo;
não avance silenciosamente sobre uma falha bloqueadora.
E. ARQUITETURA E ORGANIZAÇÃO
Use a stack React + TypeScript + Vite, Tailwind CSS, Firebase Authentication e Cloud Firestore, salvo se o repositório já tiver uma solução compatível e funcional. Reutilize componentes e serviços; evite duplicação.
Siga a estrutura de pastas proposta na especificação, adaptando-a à estrutura existente. Não crie diretórios vazios sem uso real. Separe componentes de interface, regras de negócio, serviços Firebase, parsers de documentos, transposição de acordes e exportação.
Mantenha tipos TypeScript claros para `Usuario`, `Musica`, `Playlist`, `Categoria` e preferências. Evite `any` sem justificativa.
F. SEGURANÇA OBRIGATÓRIA
Não use regras Firestore abertas.
Usuários FREE só podem acessar seus próprios dados privados.
Músicas públicas só podem ser alteradas por ADMIN.
ADMIN deve ser validado por mecanismo confiável; não confiar em campo que o usuário possa alterar.
Não criar interface pública para o usuário promover a si mesmo a ADMIN.
Não colocar segredos, tokens privados ou credenciais de serviço no frontend ou Git.
Usar escopos mínimos para Google Drive e solicitar consentimento.
Validar entradas e tratar arquivos externos como dados não confiáveis.
Não registrar conteúdo privado, tokens ou dados sensíveis em logs.
Escrever testes para acesso permitido e negado. Não afirmar segurança sem testes.
G. IMPORTAÇÃO DE DOCUMENTOS
Implementar TXT e PDF textual e DOCX com bibliotecas open-source executadas localmente no navegador sempre que viável.
Exibir pré-visualização e pedir confirmação antes de salvar.
Tratar PDF digitalizado sem texto como caso não suportado no MVP; informar claramente e não adicionar OCR pago.
Preservar quebras de linha e espaços importantes para alinhamento de cifras.
Não executar macros nem conteúdo ativo de documentos.
Não enviar documentos a serviços externos sem consentimento.
Mostrar mensagens claras para arquivo inválido, vazio, grande demais ou sem texto extraível.
H. PLAYLISTS E MÚSICAS
Modo Igreja deve conter, exatamente nesta ordem:
Entrada
Perdão
Glória
Salmo
Aclamação
Ofertório
Santo
Comunhão
Pós-comunhão
Final
O modo automático deve consultar apenas músicas existentes no catálogo autorizado e usar seus metadados. Se não houver correspondência, deixar a posição vazia e pedir seleção manual. Não inventar títulos, letras ou cifras.
Modo Barzinho deve permitir estilo, quantidade, preferência de tom e alternância de ritmos. Deve selecionar músicas reais disponíveis, evitar duplicatas quando possível e informar quando não houver opções suficientes.
Playlists manuais devem permitir criar, editar, reordenar, remover itens e persistir a ordem no banco.
I. MODO PALCO, TRANSPOSIÇÃO E EXPORTAÇÃO
Modo palco: tema escuro, fonte ajustável, rolagem automática com iniciar/pausar/continuar/reiniciar e velocidade ajustável. Testar a funcionalidade em desktop e celular.
Transposição: não substituir letras de acordes por busca textual ingênua. Criar função isolada e testes para acordes maiores, menores, sustenidos/bemóis, sétimas e inversões que estiverem no escopo. Documentar limites.
Exportação:
PDF primeiro, legível e na ordem correta.
TXT com quebras de linha preservadas.
HTML simples e seguro.
DOCX com biblioteca open-source, validando a qualidade antes de considerar concluído.
Não declarar formato concluído apenas porque um botão baixa um arquivo; verificar conteúdo e abrir/testar o arquivo.
J. GOOGLE DRIVE
Só iniciar essa fase depois que a importação local estiver testada. Usar fluxo oficial OAuth/Google Picker, escopos mínimos e consentimento explícito. Permitir escolher arquivos; não pedir acesso amplo ao Drive sem necessidade. Tratar autorização cancelada, expirada e revogada. Não guardar tokens no Firestore nem no repositório. Não implementar sincronização bidirecional complexa antes de a importação e exportação simples funcionarem.
K. PIX
Implementar contribuição voluntária usando QR Code Pix estático configurado pelo responsável. Não inventar chave Pix real, não integrar gateway pago, não exigir pagamento para usar o perfil FREE e não declarar confirmação automática. Diferenciar contribuição informada de contribuição confirmada manualmente.
L. TESTES E CRITÉRIOS DE ACEITE
Executar os scripts existentes e, se necessário, criar:
`npm run lint`
`npm run typecheck`
`npm run test`
`npm run build`
Testar pelo menos:
login e logout;
proteção de rotas;
autorização e negação de leitura/escrita no Firestore;
importação válida e inválida de documentos;
pesquisa;
criar/salvar/reabrir/reordenar playlist;
ordem fixa do Modo Igreja;
geração Barzinho sem inventar músicas;
controles do modo palco;
exportação PDF/TXT;
layout móvel e desktop;
falhas e cancelamento da integração Drive.
Não inventar resultados de testes. Se dependências, credenciais ou ambiente impedirem a execução, registrar precisamente o que faltou.
M. GIT E CONTROLE DE ALTERAÇÕES
Inspecionar branch e alterações locais antes de começar.
Trabalhar na branch de tarefa, sem alterar diretamente `master`/`main`.
Não descartar mudanças do usuário.
Não executar reset destrutivo, force-push, merge, deploy ou commit automático sem autorização explícita.
Fazer mudanças pequenas, revisar o diff e resumir os arquivos alterados.
Não incluir `.env` real, credenciais, `node_modules`, builds ou arquivos temporários no Git.
Manter `.env.example` apenas com nomes de variáveis e valores ilustrativos não secretos.
N. RELATÓRIO AO FINAL DE CADA ETAPA
Responda com:
etapa concluída ou bloqueada;
funcionalidades implementadas;
arquivos criados/alterados;
comandos de teste executados e resultados reais;
limitações conhecidas;
confirmação de que não foi ativado billing nem adicionado serviço pago;
próximo item do `TASK.md`.
Não tente construir tudo de uma vez. Priorize um fluxo funcional de ponta a ponta, mantenha a documentação atualizada e avance somente quando a fase atual estiver testada ou suas limitações estiverem explicitamente registradas.
Comece agora apenas pelo diagnóstico do repositório e pela criação/atualização de `TASK.md` e da documentação técnica. Não implemente todas as funcionalidades na primeira execução.