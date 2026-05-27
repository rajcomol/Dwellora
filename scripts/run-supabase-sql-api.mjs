/**
 * Run SQL on a Supabase hosted project via Management API (no direct Postgres).
 * Uses Supabase CLI access token from Windows Credential Manager.
 *
 * Usage:
 *   node scripts/run-supabase-sql-api.mjs --project-ref cgvmclxglxhbuhuovedl --file supabase/migrations/foo.sql
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function parseArgs(argv) {
  let projectRef = "";
  let file = "";
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--project-ref") projectRef = argv[++i] ?? "";
    else if (a === "--file" || a === "-f") file = argv[++i] ?? "";
    else if (a === "--help" || a === "-h") {
      console.log("Usage: node scripts/run-supabase-sql-api.mjs --project-ref <ref> --file <path.sql>");
      process.exit(0);
    }
  }
  if (!projectRef || !file) {
    console.error("Required: --project-ref and --file");
    process.exit(1);
  }
  return { projectRef, file: resolve(root, file) };
}

function getAccessToken() {
  const ps = `
$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class NativeCred {
  public enum CredType { Generic = 1 }
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public int Flags;
    public int Type;
    public IntPtr TargetName;
    public IntPtr Comment;
    public long LastWritten;
    public int CredentialBlobSize;
    public IntPtr CredentialBlob;
    public int Persist;
    public int AttributeCount;
    public IntPtr Attributes;
    public IntPtr TargetAlias;
    public IntPtr UserName;
  }
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr cred);
  [DllImport("advapi32.dll", SetLastError = true)]
  public static extern bool CredFree(IntPtr cred);
}
"@
$ptr = [IntPtr]::Zero
$target = "Supabase CLI:supabase"
if (-not [NativeCred]::CredRead($target, [int][NativeCred+CredType]::Generic, 0, [ref]$ptr)) {
  $target = "LegacyGeneric:target=Supabase CLI:supabase"
  if (-not [NativeCred]::CredRead($target, [int][NativeCred+CredType]::Generic, 0, [ref]$ptr)) {
    throw "Supabase CLI access token not found in Credential Manager"
  }
}
$cred = [Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][NativeCred+CREDENTIAL])
$bytes = New-Object byte[] $cred.CredentialBlobSize
[Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
[NativeCred]::CredFree($ptr) | Out-Null
[Console]::Out.Write([Text.Encoding]::UTF8.GetString($bytes))
`;
  try {
    return execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (err) {
    console.error("Failed to read Supabase CLI token from Windows Credential Manager.");
    console.error(err?.message ?? err);
    process.exit(1);
  }
}

async function runQuery(projectRef, sql, token) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const msg = body?.message ?? body?.error ?? text;
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }
  return body;
}

async function main() {
  const { projectRef, file } = parseArgs(process.argv);
  if (!existsSync(file)) {
    console.error("File not found:", file);
    process.exit(1);
  }
  const sql = readFileSync(file, "utf8");
  const token = getAccessToken();
  if (!token) {
    console.error("Empty Supabase access token");
    process.exit(1);
  }

  console.log(`Applying SQL to project ${projectRef} (${file})...`);
  const result = await runQuery(projectRef, sql, token);
  console.log("OK");
  if (result && typeof result === "object" && !Array.isArray(result)) {
    if (result.error) {
      console.error(result.error);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
