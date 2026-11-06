# GitHub Pages 自動部署

此資料夾是後續 GitHub 更新的來源。

## 已準備的設定
- .github/workflows/pages.yml：master 每次推送後執行測試並部署；Pull Request 只測試，不部署。
- tools/build-pages.cjs：只輸出前端檔案至 .pages，不包含備份、測試、文件或本機啟動工具。
- 不需要手動建立 GitHub Token 密鑰；工作流程使用 GitHub 的短期工作權限。

## 首次連線後
1. 將本資料夾程式碼推送到確認的 GitHub 儲存庫 master 分支。
2. 在儲存庫 Settings → Pages 選 GitHub Actions 作為來源。
3. 等待 Actions 的 Validate and deploy website 成功，查看實際網站網址。

## 後續更新
修改本資料夾檔案後，提交並推送到 master，GitHub 會自動測試及部署。只改電腦上的檔案不會自動上傳；原 ChatGPT Sites 網站更新也不會自動同步至 GitHub。需要以此資料夾為更新來源，提交推送後才能發布。

## 資料
新網址有獨立的瀏覽器儲存空間。請從原網站匯出 JSON 備份，再到 GitHub Pages 網址匯入。不要把含商品、圖片或交易紀錄的備份提交至公開儲存庫。

GitHub Pages 網站通常可由網際網路存取；私有儲存庫不代表 Pages 網站也私有。

官方文件：https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
