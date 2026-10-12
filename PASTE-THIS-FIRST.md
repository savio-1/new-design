# Collage Studio — set up in a new Claude account (no terminal needed)

You only click; Claude does the rest.

## What you do (about 5 minutes of clicking)

1. **Save your designs from the old copy** (they don't move by themselves): on the home page, each design card's
   **⋯ → Download project file**; for each of My templates, **⋯ → Download template file**. Keep the files.
2. **New GitHub account → New repository** (github.com → the **+** at the top right → *New repository*).
   Name it `collage-studio`, choose **Private**, tick **Add a README file**, then **Create repository**.
3. **Connect GitHub to the new Claude account:** sign in to claude.ai with the new account and open
   https://claude.ai/connect-github → sign in with the new GitHub account → allow access to `collage-studio`
   (if GitHub asks to install the Claude app, choose *Only select repositories* → `collage-studio`).
4. **Start Claude Code on the web:** open https://claude.ai/code, pick the repository `collage-studio`, and start a
   session. If it asks about network access, choose the broadest option offered (or *Trusted*).
5. **Attach `collage-studio-handoff.zip`** to your first message and **paste the message below**. Then just answer any
   question Claude asks.
6. When Claude gives you the new app link: open it → home page → **Open file** → pick the files you saved in step 1.

## The message to paste (with the zip attached)

```
I'm moving my project "Collage Studio" to this account. Everything is in the attached
collage-studio-handoff.zip. I can't use a terminal, so please do all of the following yourself
and only ask me when you need me to click something.

1. Unzip the attachment into your scratch folder and read START-HERE.md, HANDOFF.md, CLAUDE.md
   and studio/README.md. Treat CLAUDE.md as the project rules from now on.

2. Restore the project with its full history into this repository: fetch the branch
   claude/charming-mendel-rchh9w from the zip's new-design.bundle, make this repo's main branch
   exactly that history (it replaces the starter README) and push it to main. If you aren't
   allowed to push to main, push it to a new branch and tell me what to click to make it the
   default.

3. Update CLAUDE.md, HANDOFF.md, START-HERE.md and SETUP-NEW-ACCOUNT.md for the new home:
   this repository's name, working branch main, and remove the old artifact link (the new one
   comes in step 5). Keep every other rule. Commit and push.

4. Check that everything works: run node studio/tools/smoke_test.js and fix anything that fails.
   If a website is blocked (Google Fonts, cdn.jsdelivr.net, cdnjs.cloudflare.com,
   huggingface.co), tell me exactly which setting to change and where.

5. Publish the app as a new private artifact: build it with
   python3 studio/tools/build_single_file.py --artifact <folder> and publish
   <folder>/collage-studio.html. So background removal works inside the artifact, publish next
   to it the files bgremove.js reads: models/rmbg.part0.txt … models/rmbg.part4.txt (base64 of
   https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model_quantized.onnx split into 5
   equal parts), models/ultraface.txt (base64 of
   https://huggingface.co/onnxmodelzoo/version-RFB-320/resolve/main/version-RFB-320.onnx) and
   vendor/ort-wasm-simd.wasm (onnxruntime-web 1.16.3). Write the new artifact link into
   CLAUDE.md and HANDOFF.md, rebuild studio/dist/collage-studio.html, commit and push.

6. Tell me the new app link, and how to bring my saved designs back in (home page → Open file).
```

## If something goes wrong

- **Claude can't see the repository** → redo step 3 and make sure `collage-studio` is allowed, then start a new session.
- **The zip won't attach** (too big) → attach `studio/dist/collage-studio.html` plus `CLAUDE.md` and `HANDOFF.md` from
  inside the zip instead, and ask Claude to "rebuild the project from these files" (the change history is lost, the app
  is not: the single file contains all the code).
- **You just want to use the app**, no Claude at all → double-click `studio/dist/collage-studio.html` inside the zip;
  it opens in Chrome and works offline (except Google Fonts and background removal).
