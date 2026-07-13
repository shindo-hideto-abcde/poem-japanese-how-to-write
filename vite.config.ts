import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages では「https://ユーザー名.github.io/リポジトリ名/」で公開される。
// Actions の実行時だけリポジトリ名を base にして、画像や JavaScript のパスを正しくする。
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : '/'

export default defineConfig({
  base,
  plugins: [react()],
})
