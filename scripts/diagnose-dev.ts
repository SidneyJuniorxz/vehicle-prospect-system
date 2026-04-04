import "dotenv/config";
import net from "node:net";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import http from "node:http";
import pg from "pg";

type CheckResult = {
  ok: boolean;
  details: string;
};

function timestampForFile(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function checkPort(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    const done = (result: boolean) => {
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(1500);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, host);
  });
}

function checkHttp(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: "/",
        method: "GET",
        timeout: 2500,
      },
      (res) => {
        resolve((res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 500);
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function checkDatabase(): Promise<CheckResult> {
  if (!process.env.DATABASE_URL) {
    return { ok: false, details: "DATABASE_URL ausente no ambiente." };
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const [{ now }] = (await client.query<{ now: string }>("select now() as now")).rows;
    const [{ ads }] = (await client.query<{ ads: string }>("select count(*) as ads from vehicle_ads")).rows;
    const [{ leads }] = (await client.query<{ leads: string }>("select count(*) as leads from leads")).rows;

    return {
      ok: true,
      details: `Conexao OK. now=${now} vehicle_ads=${ads} leads=${leads}`,
    };
  } catch (error) {
    return {
      ok: false,
      details: `Falha ao conectar/query DB: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function runDevProbe(timeoutMs: number): Promise<CheckResult & { logs: string[] }> {
  const logs: string[] = [];

  const killTree = (pid: number | undefined) => {
    if (!pid) return;
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(pid), "/t", "/f"], { windowsHide: true });
      return;
    }
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // ignore
    }
  };

  return new Promise((resolve) => {
    const child = spawn(
      process.platform === "win32" ? "cmd.exe" : "pnpm",
      process.platform === "win32" ? ["/d", "/s", "/c", "pnpm dev"] : ["dev"],
      {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: "development" },
      shell: false,
      windowsHide: true,
      }
    );

    let resolved = false;

    const finalize = (ok: boolean, details: string) => {
      if (resolved) return;
      resolved = true;
      killTree(child.pid);
      resolve({ ok, details, logs });
    };

    child.stdout.on("data", (chunk) => {
      const text = String(chunk);
      logs.push(`[stdout] ${text.trimEnd()}`);
      if (text.includes("Server running on http://") || text.includes("ready in")) {
        finalize(true, "Servidor iniciou e publicou URL.");
      }
    });

    child.stderr.on("data", (chunk) => {
      const text = String(chunk);
      logs.push(`[stderr] ${text.trimEnd()}`);
    });

    child.on("exit", (code) => {
      if (!resolved) {
        finalize(false, `Processo dev encerrou cedo com codigo ${code ?? "n/a"}.`);
      }
    });

    setTimeout(() => {
      if (!resolved) {
        const joined = logs.join("\n");
        const hint = joined.includes("EADDRINUSE")
          ? "Porta ocupada detectada (EADDRINUSE)."
          : "Timeout aguardando startup do dev.";
        finalize(false, hint);
      }
    }, timeoutMs);
  });
}

async function main() {
  const preferredPort = Number(process.env.PORT || 3000);
  const reportLines: string[] = [];

  reportLines.push("# Diagnostico de execucao (dev)");
  reportLines.push(`Data: ${new Date().toISOString()}`);
  reportLines.push("");

  const localhostOpen = await checkPort("127.0.0.1", preferredPort);
  const localhostHttp = localhostOpen ? await checkHttp(preferredPort) : false;
  reportLines.push(`- Porta ${preferredPort} ocupada antes do start: ${localhostOpen ? "sim" : "nao"}`);
  reportLines.push(`- HTTP em ${preferredPort}: ${localhostHttp ? "respondendo" : "sem resposta"}`);

  const db = await checkDatabase();
  reportLines.push(`- Banco: ${db.ok ? "OK" : "FALHA"} - ${db.details}`);

  const dev = localhostHttp
    ? { ok: true, details: `Aplicacao ja estava ativa em http://127.0.0.1:${preferredPort}`, logs: [] as string[] }
    : await runDevProbe(30000);

  reportLines.push(`- Start dev: ${dev.ok ? "OK" : "FALHA"} - ${dev.details}`);
  reportLines.push("");
  reportLines.push("## Logs coletados");
  if (dev.logs.length === 0) {
    reportLines.push("(sem logs)");
  } else {
    reportLines.push("```text");
    reportLines.push(...dev.logs.slice(-200));
    reportLines.push("```");
  }

  mkdirSync(join(process.cwd(), "reports"), { recursive: true });
  const filePath = join(process.cwd(), "reports", `diagnose-dev-${timestampForFile()}.md`);
  writeFileSync(filePath, reportLines.join("\n"), "utf8");

  const summary = {
    database: db.ok,
    dev: dev.ok,
    preferredPort,
    report: filePath,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!db.ok || !dev.ok) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Diagnostico falhou:", err);
  process.exit(1);
});
