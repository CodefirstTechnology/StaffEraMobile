/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HOUSE_OWNER_APP_URL: string;
  readonly VITE_SERVANT_APP_URL: string;
  readonly VITE_AGENT_PORTAL_URL: string;
  readonly VITE_PLAY_STORE_HOUSE_OWNER: string;
  readonly VITE_PLAY_STORE_SERVANT: string;
  readonly VITE_APP_STORE_HOUSE_OWNER: string;
  readonly VITE_APP_STORE_SERVANT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
