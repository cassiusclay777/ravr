# Claude Desktop Extensions Setup

## Co je nainstalováno

Tento projekt nyní obsahuje kompletní konfiguraci pro Claude Desktop s následujícími MCP (Model Context Protocol) servery:

### 🛠️ Dostupné MCP serveryA

1. **filesystem** - Přístup k souborům projektu
2. **memory** - Trvalá paměť pro kontext
3. **git** - Git operace a správa verzí
4. **fetch** - Stahování obsahu z webu
5. **puppeteer** - Automatizace prohlížeče
6. **sequential-thinking** - Pokročilé řešení problémů

## 📁 Konfigurační soubory

- `claude_desktop_config.json` - Hlavní konfigurace pro Claude Desktop
- `.mcp_config.json` - Alternativní konfigurace pro Windsurf/Claude integraci

## 🚀 Jak použít

1. Ujisti se, že máš nainstalovaný Claude Desktop
2. Restartuj Claude Desktop po přidání konfigurace
3. V Claude Desktop by se měly objevit nové nástroje z MCP serverů
4. Soubor `memory.json` bude automaticky vytvořen pro uchovávání kontextu

## ⚡ Požadavky

- Node.js (pro npx příkazy)
- Python s uv/uvx (pro git server)
- Claude Desktop aplikace

## 🔧 Přizpůsobení

Můžeš upravit cesty a nastavení v konfiguračních souborech podle svých potřeb.
