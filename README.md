# Copilot Memory Vault

Extensão VS Code em TypeScript que cria **memória persistente** para uso com GitHub Copilot.

## Funcionalidades

- Chat Participant `@memory`
- Captura automática de Terminal, Workspace e Git
- SQLite local + embeddings (BLOB)
- Dashboard Webview com React via CDN
- Scanner de secrets + regras de privacidade
- Memórias especializadas: `build`, `infra`, `pipeline`, `bug`, `architecture`
- Recuperação inteligente de contexto (sessão + branch + bugs + lexical/semântica)

## Rodando localmente

1. Instale dependências com `npm install`
2. Compile com `npm run compile`
3. Aperte `F5` para abrir Extension Development Host
4. Use:
   - comando `Memory Vault: Open Dashboard`
   - comando `Memory Vault: Index Project Now` (recomendado)
   - comando `Memory Vault: Index Workspace Now (Legacy)`
   - chat `@memory <sua pergunta>`

## Observações

- O participante usa API de chat via fallback em `any` para reduzir quebra entre versões de VS Code.
- Embeddings são locais (`@xenova/transformers`) e salvos no SQLite.
- Segredos detectados não são persistidos.

---

**Status atual:** v0.1.0 (base funcional consolidada).
