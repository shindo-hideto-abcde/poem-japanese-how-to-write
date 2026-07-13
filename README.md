# ことばのにわ

小学校3〜4年生向けの詩づくりアプリです。質問に答えると、児童が入力した言葉だけを使った詩案を作れます。

## GitHub Pages で公開する

1. このフォルダを新しい GitHub リポジトリへアップロードします。リポジトリ名は半角英数字とハイフンを推奨します（例：`kotoba-no-niwa`）。
2. GitHubのリポジトリ画面で **Settings → Pages → Build and deployment** を開き、**Source** に **GitHub Actions** を選びます。
3. `main` ブランチへプッシュすると、`Deploy to GitHub Pages` が自動で実行されます。
4. 完了後、**Actions** の実行結果、または **Settings → Pages** に表示されるURLを児童へ共有します。

公開URLは通常、`https://＜GitHubユーザー名＞.github.io/＜リポジトリ名＞/` です。アプリはサーバーに回答を送信せず、作品は利用端末のブラウザ内にだけ保存されます。

## 開発時の実行

```bash
pnpm install
pnpm dev
```

公開前の確認は次で行えます。

```bash
pnpm build
```
