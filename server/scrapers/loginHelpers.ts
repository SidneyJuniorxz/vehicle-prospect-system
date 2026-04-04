import fs from "fs";
import path from "path";

export async function ensureOlxLogin(page: any) {
  // Nesta rotina só aguardamos o usuário logar manualmente na primeira vez.
  console.log("[OLX] Login necessário. Abra a janela, faça login e feche o popup manualmente. Continuando em 20s...");
  await page.waitForTimeout(20000);
  // Depois de logado, salvamos storageState para sessões futuras
  const storagePath =
    process.env.OLX_STORAGE ||
    path.join(process.cwd(), ".wwebjs_auth", "olx_state.json");
  const state = await page.context().storageState();
  fs.mkdirSync(path.dirname(storagePath), { recursive: true });
  fs.writeFileSync(storagePath, JSON.stringify(state, null, 2));
  console.log("[OLX] Sessão salva em", storagePath);
}
