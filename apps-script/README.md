# Arth signature helper (no token for anyone)

A Google Apps Script web app that only arthproject.com accounts can open. It shows the
signature generator and does the parts that need a login:

- **uploads** a person's images to this repo with a GitHub token that is hidden inside the script, and
- **sets the Gmail signature** of whoever is signed in, so nobody has to copy and paste.

## One-time setup (admin, about 15 minutes)

1. **Create the GitHub token** (once, for the whole team):
   GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token.
   - Resource owner: **MGPLOrg**
   - Repository access: **Only select repositories → email-signature**
   - Repository permissions: **Contents: Read and write**
   - If MGPLOrg requires it, an owner approves the token under the organisation's settings.
2. **Create the script:** signed in with your arthproject.com account, open
   [script.new](https://script.new) and name the project "Arth Signatures".
3. **Paste the code:**
   - Replace everything in `Code.gs` with [`Code.gs`](Code.gs) from this folder.
   - Project Settings (gear) → tick **Show "appsscript.json" manifest file in editor**, then
     replace that file's contents with [`appsscript.json`](appsscript.json).
4. **Store the token:** Project Settings → Script properties → Add script property:
   name `GITHUB_TOKEN`, value the token from step 1 → Save.
   Only editors of the script can see it; people using the page never do.
5. **Publish it:** Deploy → New deployment → type **Web app**
   - Execute as: **User accessing the web app** (so it sets *their own* Gmail signature)
   - Who has access: **Anyone within arthproject.com**

   Deploy, click Authorize and allow the access it asks for, then copy the **Web app URL**.
   That URL is the page you share with the team.

## Using it (everyone)

1. Open the Web app URL and sign in with your arthproject.com account. The first time,
   Google asks to allow the app to manage your Gmail signature and connect to GitHub.
2. Fill in your details and choose your photo.
3. Click **Set as Gmail signature for you@arthproject.com**. The page uploads the
   images, waits until they are online (under a minute) and sets your signature.
4. Reload Gmail. Under Settings → Signature → Signature defaults, check that the new
   signature is selected for new emails and replies.

To make a signature for **someone else**, fill in their details and click **Copy signature**
instead, then paste it into their Gmail. **Set as Gmail signature** only ever changes the
signed-in person's own signature.

## Updating

The helper always loads the latest `generator.html` from GitHub Pages, so changes to the
page need no redeploy. After changing `Code.gs` or `appsscript.json`: Deploy → Manage
deployments → edit → Version: **New version** → Deploy (the URL stays the same).
If the token expires, replace `GITHUB_TOKEN` in the script properties.
