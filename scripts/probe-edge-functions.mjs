/**
 * Checks whether email Edge Functions are deployed on Staging and PROD.
 * Run: node scripts/probe-edge-functions.mjs
 */
const PROJECTS = [
  { label: "Staging", ref: "cgvmclxglxhbuhuovedl" },
  { label: "PROD", ref: "qvansiwlykvhgfdygisu" },
];

const FUNCTIONS = [
  {
    name: "send-project-invite",
    deployHint: "npm run supabase:functions:deploy-invite:staging|prod",
    okStatuses: [401, 405],
    okHint: "deployed; needs x-invite-secret + Brevo secrets",
  },
  {
    name: "send-auth-email",
    deployHint: "npm run supabase:functions:deploy-auth-email:staging|prod",
    okStatuses: [401, 405],
    okHint: "deployed; needs Send Email Hook + SEND_EMAIL_HOOK_SECRET",
  },
];

for (const { label, ref } of PROJECTS) {
  console.log(`\n${label} (${ref}):`);
  for (const fn of FUNCTIONS) {
    const url = `https://${ref}.supabase.co/functions/v1/${fn.name}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      let hint = "";
      if (res.status === 404) hint = ` → deploy: ${fn.deployHint}`;
      else if (fn.okStatuses.includes(res.status)) hint = ` → ${fn.okHint}`;
      console.log(`  ${fn.name}: HTTP ${res.status}${hint}`);
    } catch (e) {
      console.log(`  ${fn.name}: error ${e.message}`);
    }
  }
}
