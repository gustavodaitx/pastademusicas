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
| **Mammoth.js** | Extração de texto e parágrafos de arquivos DOCX | Open-Source (Licença BSD 2-Clause) | - Execução 100% client-side no navegador<br>- Sem limites de requisição ou dependência de rede | 2026-10-25 | Edição e cópia/cola manual de texto |
| **PDF.js (Mozilla)** | Extração de camada textual de arquivos PDF | Open-Source (Licença Apache 2.0) | - Execução 100% client-side no navegador<br>- Limitado a PDFs que contenham camada de texto vetorial (PDFs escaneados sem OCR não são processados) | 2026-10-25 | Upload em formato TXT ou inserção manual |
| **jsPDF / pdfmake** | Geração e exportação de cifras e playlists em PDF | Open-Source (MIT) | - Execução 100% client-side no navegador<br>- Sem custos de servidor | 2026-10-25 | Impressão nativa do navegador (`window.print`) com folha de estilo CSS print ou exportação em HTML |
| **docx (dolanmiu/docx)** | Exportação de documentos para DOCX | Open-Source (MIT) | - Execução 100% client-side no navegador | 2026-10-25 | Exportação em formato HTML / TXT |

---

## 3. Diretrizes de Monitoramento e Mitigação

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
