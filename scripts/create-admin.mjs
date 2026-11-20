// Promotes an existing account to administrator, or creates a new admin account.
// Admins are never created from the website. Run locally with the service-role key:
//   node --env-file=.env.local scripts/create-admin.mjs admin@example.org "Full Name" [password]
// If the email does not exist yet, a password (min 12 chars) is required.
import { createClient } from "@supabase/supabase-js";

const [email, name = "Administrator", password] = process.argv.slice(2);
if (!email) {
  console.error("Usage: node --env-file=.env.local scripts/create-admin.mjs <email> [name] [password]");
  process.exit(1);
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listErr) throw listErr;
let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

if (!user) {
  if (!password || password.length < 12) {
    console.error("New admin accounts need a password of at least 12 characters.");
    process.exit(1);
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: name } });
  if (error) throw error;
  user = data.user;
  console.log("created account", email);
}

const { error } = await admin.from("profiles").update({ role: "admin", display_name: name }).eq("id", user.id);
if (error) throw error;
await admin.from("audit_logs").insert({ actor_id: user.id, action: "admin.provisioned", target_type: "profile", target_id: user.id, details: { via: "scripts/create-admin.mjs" } });
console.log(`${email} is now an administrator.`);
