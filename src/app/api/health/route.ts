export async function GET() {
  return Response.json({
    ok: true,
    app: "renotasker",
    timestamp: new Date().toISOString(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  });
}

