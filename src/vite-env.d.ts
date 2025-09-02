/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HEDERA_ACCOUNT_ID: string
  readonly VITE_HEDERA_PRIVATE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
