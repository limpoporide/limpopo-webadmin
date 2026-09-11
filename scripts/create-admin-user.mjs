import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const [
  emailArgument,
  firstName = "Peterson",
  lastName = "Zoconis",
  role = "super-admin",
] = process.argv.slice(2);
const email = emailArgument?.trim().toLowerCase();
const password = process.env.NEW_ADMIN_PASSWORD;
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email) {
  throw new Error(
    "Usage: node scripts/create-admin-user.mjs <email> [firstName] [lastName] [role]",
  );
}

if (!password) {
  throw new Error("Missing NEW_ADMIN_PASSWORD environment variable.");
}

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SECRET_KEY.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

let createdUser = false;
let user;

const { data: authData, error: createUserError } =
  await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

if (createUserError?.code === "email_exists") {
  const { data: usersData, error: listUsersError } =
    await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (listUsersError) {
    throw listUsersError;
  }

  user = usersData.users.find(
    (currentUser) => currentUser.email?.toLowerCase() === email,
  );

  if (!user) {
    throw new Error(
      `Auth user already exists for ${email}, but it was not found in the first 1000 users.`,
    );
  }

  const { data: updateData, error: updateUserError } =
    await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });

  if (updateUserError) {
    throw updateUserError;
  }

  user = updateData.user;
} else if (createUserError) {
  throw createUserError;
} else {
  createdUser = true;
  user = authData.user;
}

if (!user) {
  throw new Error("Supabase did not return an auth user.");
}

const { error: profileError } = await supabase.from("admin_profile").upsert(
  {
    uuid: user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    role,
    is_active: true,
    updated_at: new Date().toISOString(),
  },
  { onConflict: "uuid" },
);

if (profileError) {
  if (createdUser) {
    await supabase.auth.admin.deleteUser(user.id);
  }

  throw profileError;
}

console.log(
  `${createdUser ? "Created" : "Updated"} active admin user: ${email}`,
);
