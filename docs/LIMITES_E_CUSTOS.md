# Limites e Custos — PDS Pasta de Música

Data de criação/verificação: 2026-10-25  
Responsável: Arquiteto de Software & Engenharia de Qualidade  
Política: **Regra Inegociável — Custo Zero (100% Gratuito / Open-Source)**

---

## 1. Princípio de Custo Zero
Este projeto adota como diretriz estrutural a **ausência total de custos obrigatórios**. Nenhuma funcionalidade essencial dependerá de planos pagos, ativação de cartões de crédito ou serviços de cobrança automática. Caso qualquer provedor altere suas políticas de gratuidade ou uma funcionalidade ultrapasse as cotas gratuitas, a funcionalidade será congelada ou substituída por alternativa local/aberta.

---

## 2. Inventário de Serviços Externos e Ferramentas

| Serviço / Ferramenta | Finalidade | Modalidade Gratuita | Limites Conhecidos da Cota Gratuita | Data da Verificação | Alternativa Gratuita / Fallback |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Firebase Authentication** | Autenticação de usuários (E-mail/Senha e Google OAuth) | Plano Spark (Gratuito sem cartão) | - 50.000 usuários ativos mensais (MAU) para autenticação básica<br>- Não exige migração para Blaze | 2026-10-25 | Autenticação local / LocalStorage com chave de sessão simulada ou Supabase Free Tier |
| **Cloud Firestore** | Banco de dados NoSQL para usuários, músicas e playlists | Plano Spark (Gratuito sem cartão) | - 1 GiB de armazenamento total<br>- 50.000 leituras/dia<br>- 20.000 gravações/dia<br>- 20.000 exclusões/dia<br>- 10 GiB tráfego de saída/mês | 2026-10-25 | Armazenamento local no navegador via IndexedDB (`Dexie.js` ou `idb`) com exportação JSON/backup manual |
| **Firebase Hosting / Cloudflare Pages** | Hospedagem estática da SPA (Single Page Application) | Free Tier (ambos) | - Firebase: 10 GB armazenamento, 360 MB/dia tráfego Spark<br>- Cloudflare Pages: 500 builds/mês, largura de banda ilimitada, 100 domínios personalizados | 2026-10-25 | GitHub Pages / Vercel Hobby / Netlify Free |
| **Google Drive API & Google Picker** | Seleção e importação voluntária de arquivos pelo usuário | Google Cloud Free Tier / OAuth Consent Screen | - 20.000 consultas/dia na Drive API (cota padrão por projeto)<br>- Escopo mínimo `drive.file` (apenas arquivos explicitamente abertos pelo usuário)<br>- Sem custo para chamadas client-side | 2026-10-25 | Upload e download de arquivos locais (`.docx`, `.pdf`, `.txt`) diretamente do disco do usuário |
| **Pix Estático** | Contribuição voluntária para manutenção do projeto | QR Code e código copia-e-cola estáticos | - Custo R$ 0,00<br>- Sem taxa por transação (não utiliza gateway ou intermediário de pagamento)<br>- Confirmação 100% manual | 2026-10-25 | Doações via canais diretos voluntários |
| **JSZip** | Leitura local do pacote OOXML de arquivos DOCX | Open-Source (Licença MIT) | - Execução 100% client-side no navegador<br>- Sem requisições ou dependência de rede | 2026-11-24 | Seleção de outro arquivo DOCX ou importação TXT |
| **PDF.js (Mozilla)** | Extração de camada textual de arquivos PDF | Open-Source (Licença Apache 2.0) | - Execução 100% client-side no navegador<br>- Limitado a PDFs que contenham camada de texto vetorial (PDFs escaneados sem OCR não são processados) | 2026-10-25 | Upload em formato TXT ou inserção manual |
| **jsPDF / pdfmake** | Geração e exportação de cifras e playlists em PDF | Open-Source (MIT) | - Execução 100% client-side no navegador<br>- Sem custos de servidor | 2026-10-25 | Impressão nativa do navegador (`window.print`) com folha de estilo CSS print ou exportação em HTML |
| **docx (dolanmiu/docx)** | Exportação de documentos para DOCX | Open-Source (MIT) | - Execução 100% client-side no navegador | 2026-10-25 | Exportação em formato HTML / TXT |

---

## 3. Importação local de documentos (T05)

- **Formatos aceitos:** `.txt`, `.docx` e `.pdf` textual. PDF sem texto extraível, como um documento digitalizado em imagem, não é reconhecido; não há OCR.
- **Limites:** arquivo original de até **5 MiB** e conteúdo extraído/editado de até **800.000 bytes UTF-8**.
- **Processamento e privacidade:** leitura, validação e extração são realizadas localmente no navegador. Nenhum binário é enviado ou guardado no Firebase. Após confirmação do usuário, o texto e os metadados são persistidos pelo cadastro/repositório da Biblioteca já existente.
- **Fidelidade DOCX:** a leitura OOXML preserva cada parágrafo, run de texto, espaço preservado, tab e quebra explícita; ignora espaço visual `spaceAfter` e emite uma quebra textual simples entre parágrafos. Parágrafos vazios permanecem. Tabelas são emitidas coluna a coluna, separando cada coluna por uma linha vazia; tabs viram paradas fixas de 4 colunas; sequências internas de espaços em linhas de acordes são comprimidas pelo fator 0,65 e um parágrafo vazio entre acorde e letra é removido; as posições dos acordes são recalibradas pela largura proporcional estimada da letra seguinte (letras estreitas/espaços 0,85; letras largas 1,15), mantendo espaço entre acordes. Recuos, fontes, tab stops personalizados, células mescladas e outros estilos visuais não são reconstruídos; compare e revise a prévia.
- **Fidelidade PDF:** o extrator usa coordenadas X/Y e largura dos itens PDF.js, agrupa por linha de base, detecta um intervalo central sem texto como possível divisória de duas colunas e processa a coluna esquerda antes da direita. A largura de caractere é calibrada por linhas textuais longas da coluna; as lacunas verticais usam a altura mediana das linhas para preservar estrofes. PDFs com título atravessando colunas, mais de duas colunas, sobreposição, ordem de leitura incomum ou fontes proporcionais podem não ser reconstruídos fielmente. Como o resultado fica em texto monoespaçado, a prévia deve ser conferida.
- **Cancelamento:** limpar ou substituir a seleção impede que o resultado antigo atualize a interface, mas não interrompe imediatamente a extração já iniciada. Os recursos do PDF.js são liberados quando a tarefa de extração termina.
- **Testes PDF:** os testes automatizados usam mocks do PDF.js para verificar o comportamento do extrator. Eles não substituem teste funcional com arquivos PDF binários reais em navegadores.
- **Bundle:** neste build, JSZip ocupa cerca de **98 kB** por chunk (um chunk da página e um do Worker DOCX); o chunk PDF.js tem cerca de **501 kB** e o principal cerca de **927 kB**. JSZip/PDF.js são carregados somente nos formatos correspondentes, mas o build continua mostrando o aviso de chunks acima de 500 kB.
- **Dependências e licenças:** JSZip (`jszip`) é open-source sob MIT e PDF.js (`pdfjs-dist`) sob Apache 2.0; ambos executam localmente sem serviço externo.
- **Arquivo binário original (proposta futura; não implementada):** o fluxo atual mantém o `File` apenas durante a extração na página e encaminha para a Biblioteca somente texto e nome, portanto o binário não pode ser baixado novamente após sair do fluxo. IndexedDB poderia manter uma cópia local no mesmo perfil/navegador, sujeita a quota, limpeza pelo usuário/navegador e indisponibilidade em outros dispositivos; deve haver ação explícita para apagar o arquivo e aviso de que o cache local não é backup. Sincronização entre dispositivos exigiria armazenamento remoto com metadados vinculados à música, regras por UID, limites de tamanho/tipo, política de retenção/exclusão e tratamento de acesso. [Cloud Storage for Firebase exige Blaze para provisionar buckets e manter acesso a buckets desde 3 de fevereiro de 2026](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024#pricing-plan-faqs), portanto não atende ao compromisso estrito com Spark, mesmo que o uso ficasse dentro da cota sem custo publicada. Assim, não implementar persistência remota enquanto custo zero/Spark for obrigatório; IndexedDB é uma alternativa local opcional, sem promessa de recuperação multiplataforma.
- **Firebase:** a funcionalidade não requer Firebase Storage, Cloud Functions ou plano Blaze. A persistência do texto continua usando o Firestore e o fluxo já existente, sujeita às cotas do plano Spark.

## Exportação local de cifras e playlists (T10)

- PDF é gerado localmente com `jspdf` (MIT), importado dinamicamente apenas ao solicitar PDF; TXT usa Blob nativo do navegador. Nenhum serviço externo ou infraestrutura paga é usada.
- O chunk de jsPDF neste build tem aproximadamente 391 kB (129 kB gzip) e só é carregado na geração de PDF. O build ainda reporta chunks acima de 500 kB no pacote geral.
- A fonte padrão Courier do jsPDF mantém acentos portugueses comuns, mas não cobre todos os símbolos musicais Unicode. Acentos são mantidos; outros glifos podem não ser exibidos corretamente.
- Todas as páginas PDF usam A4 retrato. A cifra prefere 14 pt e mantém 12 pt como mínimo; conteúdo extenso é distribuído em páginas/painéis, cujos cortes comuns preservam posições horizontais relativas. Linhas identificadas como acordes usam Courier Bold azul-escuro; letras usam Courier normal preta. Tabs são expandidas para espaços até a próxima coluna múltipla de oito. Uma quebra inevitável pode cortar um acorde ou palavra em linhas sem espaços. Courier pode não cobrir alguns símbolos musicais Unicode, e uma inspeção visual manual continua pendente.
- Downloads são criados a partir dos dados em memória. A geração não altera documentos ou metadados e não executa escrita no Firestore.

---

## 4. Diretrizes de Monitoramento e Mitigação

1. **Sem billing ativo**: Nunca executar `firebase billing:enable` ou vincular formas de pagamento na conta Firebase.
2. **Consultas eficientes no Firestore**:
   - Manter cache local com IndexedDB ou Firestore offline persistence.
   - Evitar re-fetches desnecessários em renderizações React.
   - Paginar ou limitar consultas de catálogo (ex: `limit(30)`).
3. **Proteção contra PDFs não textuais**:
   - Detectar PDFs com zero caracteres extraídos e alertar imediatamente o usuário com mensagem informativa clara.
   - Jamais acoplar serviços pagos de OCR na nuvem (Google Cloud Vision, AWS Textract, etc.).
4. **Armazenamento de arquivos**:
   - Binários (como arquivos DOCX ou PDF pesados) **não** devem ser gravados no Firestore para não estourar o limite de 1 GB.
   - Apenas o texto cifrado extraído e metadados leves são salvos.

## 5. Playlists (T06)

- T06 usa somente Firestore já configurado no cliente; não adiciona Firebase Storage, Cloud Functions, serviços pagos ou dependências de drag-and-drop. A solução continua compatível com Spark e sujeita às cotas existentes de leitura, gravação, exclusão e armazenamento.
- Cada playlist aceita até **400 itens** nas mutações de lista. Esse teto mantém exclusão, remoção e reordenação em até 401 escritas por transação (400 itens e o documento pai). Não aumente o limite sem redesenhar a estratégia em lotes e rever atomicidade.
- A duplicação usa uma transação para validar/criar o pai e lotes de até 10 documentos para gravar itens. Para uma playlist com 400 itens, são aproximadamente 1.202 leituras (pai e itens observados; depois pai, itens e músicas validados na transação) e até 401 gravações (pai e itens), além de possível compensação de até 401 exclusões se houver falha. A duplicação não copia documentos de música.
- Reordenação e exclusão com 400 itens podem realizar aproximadamente 802 leituras cada (documentos observados e nova leitura transacional) e até 401 gravações. Operações em listas menores escalam com a quantidade de itens; recarregar detalhes/listagens também consome leituras. Os valores são estimativas de operações da aplicação, sem contar recargas do usuário nem efeitos da camada de regras. Consultas não são paginadas.
- O arraste usa HTML5 nativo e o suporte pode variar em navegadores móveis. Botões de subir/descer e as setas do teclado são alternativas acessíveis.
- Excluir uma playlist remove seus itens, não as músicas. Excluir uma música da Biblioteca mantém referências existentes; elas aparecem como indisponíveis e podem ser removidas manualmente. A duplicação depende de que todas as referências ainda apontem para músicas existentes; falhas de persistência acionam tentativa de limpeza compensatória, que também pode falhar e deve ser reportada.

## 6. Motor musical planejado (T11)

- A T11 prevê processamento local no navegador, em TypeScript, sem APIs externas, backend, Cloud Functions ou infraestrutura paga. A transposição já existente no Modo Palco será reutilizada; parser estruturado, análise tonal e cálculo de capotraste ainda não foram implementados.
- Não há dependência nova aprovada para o motor. Qualquer proposta de biblioteca externa precisa de justificativa técnica e aprovação antes de ser adicionada; a abordagem planejada é manter o núcleo independente de dependências externas.
- A cifra derivada para transposição/capotraste existe somente em memória/apresentação. A cifra original permanece no documento Firestore sem alteração, evitando gravações ou custo adicional de persistência para essas operações.
- As heurísticas de identificação de tonalidade e facilidade de execução têm limites: podem resultar em ambiguidade ou falta de recomendação confiável. A T11 deve expor essa incerteza, documentar os critérios e cobrir os casos em testes; não deve inventar resultados.
