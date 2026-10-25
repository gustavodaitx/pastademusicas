# Configuração do Ambiente Local — PDS Pasta de Música

Data: 2026-10-25  
Versão: 1.0  

---

## 1. Pré-requisitos
- **Node.js**: Versão 20.x ou 22.x LTS instalada (`node -v`).
- **npm**: Versão 10.x instalada (`npm -v`).
- **Git**: Versão 2.x instalada (`git --version`).
- Conta gratuita no Firebase (Plano Spark - sem necessidade de cartão de crédito).

---

## 2. Passo a Passo de Instalação

1. **Obtenção do Código e Acesso ao Diretório**:
   ```bash
   cd "pastademusicas"
   ```

2. **Configuração das Variáveis de Ambiente**:
   Copie o arquivo modelo:
   ```bash
   cp .env.example .env
   ```
   Abra `.env` e preencha as variáveis do Firebase Spark obtidas no console do Firebase:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

3. **Instalação das Dependências (a partir da etapa T01)**:
   ```bash
   npm install
   ```

4. **Execução em Modo de Desenvolvimento**:
   ```bash
   npm run dev
   ```
   A aplicação estará disponível em `http://localhost:5173`.

---

## 3. Comandos Úteis

- `npm run dev`: Inicia o servidor local Vite.
- `npm run build`: Compila os arquivos para a pasta `dist/` com otimização.
- `npm run typecheck`: Valida a integridade dos tipos TypeScript sem compilar.
- `npm run lint`: Inspeciona o código com ESLint.
- `npm run test`: Executa os testes unitários com Vitest.
