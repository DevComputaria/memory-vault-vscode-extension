# Copilot Memory Vault

Extensão VS Code em TypeScript que cria memória persistente para uso com Copilot:

- Chat Participant `@memory`
- Captura de Terminal + Workspace + Git
- SQLite local + vetores (embeddings em BLOB)
- Dashboard Webview com React (via CDN no webview)
- Scanner de secrets + regras de privacidade
- Memórias especializadas: Build, Infra, Pipeline, Bug, Architecture

## Rodando localmente

1. Instale dependências com `npm install`
2. Compile com `npm run compile`
3. Aperte `F5` para abrir Extension Development Host
4. Use:
   - comando `Memory Vault: Open Dashboard`
   - comando `Memory Vault: Index Workspace Now`
   - chat `@memory <sua pergunta>`

## Observações

- O participante usa API de chat via fallback em `any` para reduzir quebra entre versões de VS Code.
- Embeddings são locais (`@xenova/transformers`) e salvos no SQLite.
- Segredos detectados não são persistidos.
