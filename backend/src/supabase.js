import { createHash, randomBytes, randomUUID } from "node:crypto";
import { query, sqlBoolean, sqlNumber, sqlString } from "./postgres.js";

export async function ensureSupabaseSchema() {
  // Tables are created by the migration/bootstrap step. REST mode keeps Render off Postgres TCP.
}

export async function bootstrapHouseholdSession({ installId = "", displayName = "", existingToken = "" }) {
  const existingAuth = existingToken ? await authenticateHouseholdToken(existingToken).catch(() => null) : null;
  if (existingAuth) {
    return {
      token: existingToken,
      user: existingAuth.user,
      household: existingAuth.household,
      role: existingAuth.role
    };
  }

  const installHash = installIdHash(installId);
  let user = installHash ? await fetchUserByInstallHash(installHash) : null;
  if (!user) {
    user = await createAppUser({
      displayName: displayName || "TableUp User",
      installHash
    });
  } else {
    const updatedDisplayName = displayName || user.displayName || "TableUp User";
    await query(`
      update app_users
      set display_name = ${sqlString(updatedDisplayName)},
          last_seen_at = now(),
          updated_at = now()
      where id = ${sqlUuid(user.id)}
    `);
    user = { ...user, displayName: updatedDisplayName };
  }

  let membership = await fetchCurrentHouseholdMembership(user.id);
  if (!membership) {
    const household = await createHouseholdForUser(user);
    membership = {
      household,
      role: "owner"
    };
  }

  const token = await createSessionToken(user.id);
  return {
    token,
    user,
    household: membership.household,
    role: membership.role
  };
}

export async function authenticateHouseholdToken(token) {
  const cleanToken = String(token || "").trim();
  if (!cleanToken) {
    throw new Error("Authentication token is required.");
  }

  const tokenHash = hashSecret(cleanToken);
  const sessionRows = await query(`
    select id::text as id,
           user_id::text as user_id
    from app_user_sessions
    where token_hash = ${sqlString(tokenHash)}
      and revoked_at is null
    limit 1
  `);
  const session = sessionRows[0];
  if (!session?.user_id) {
    throw new Error("Invalid or expired session.");
  }

  const [userRows, membership] = await Promise.all([
    query(`
      select id::text as id,
             display_name,
             last_seen_at::text as last_seen_at
      from app_users
      where id = ${sqlUuid(session.user_id)}
      limit 1
    `),
    fetchCurrentHouseholdMembership(session.user_id)
  ]);
  const userRow = userRows[0];
  if (!userRow || !membership) {
    throw new Error("Session user is not linked to a household.");
  }

  const now = new Date().toISOString();
  await Promise.allSettled([
    query(`update app_user_sessions set last_seen_at = ${sqlString(now)}::timestamptz where id = ${sqlUuid(session.id)}`),
    query(`update app_users set last_seen_at = ${sqlString(now)}::timestamptz, updated_at = now() where id = ${sqlUuid(session.user_id)}`)
  ]);

  return {
    sessionId: session.id,
    user: normalizeUserRow(userRow),
    household: membership.household,
    role: membership.role
  };
}

export async function createHouseholdInvite(auth) {
  const code = await uniqueInviteCode();
  const inviteRows = await query(`
    insert into household_invites (household_id, code, created_by, expires_at)
    values (${sqlUuid(auth.household.id)}, ${sqlString(code)}, ${sqlUuid(auth.user.id)}, now() + interval '7 days')
    returning expires_at::text as expires_at
  `);
  const expiresAt = inviteRows[0]?.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return {
    code,
    householdId: auth.household.id,
    householdName: auth.household.name,
    expiresAt
  };
}

export async function fetchHouseholdMembers(auth) {
  const rows = await query(`
    select u.id::text as user_id,
           u.display_name,
           u.last_seen_at::text as last_seen_at,
           hm.role,
           hm.joined_at::text as joined_at
    from household_members hm
    join app_users u on u.id = hm.user_id
    where hm.household_id = ${sqlUuid(auth.household.id)}
      and hm.active = true
    order by case hm.role
               when 'owner' then 0
               when 'admin' then 1
               else 2
             end,
             hm.joined_at asc
  `);
  return rows.map(normalizeHouseholdMemberRow);
}

export async function joinHouseholdWithInvite({ auth, code }) {
  const cleanCode = normalizeInviteCode(code);
  if (!cleanCode) {
    throw new Error("Invite code is required.");
  }

  const inviteRows = await query(`
    select id::text as id,
           household_id::text as household_id,
           code,
           expires_at::text as expires_at,
           used_at::text as used_at,
           revoked_at::text as revoked_at
    from household_invites
    where code = ${sqlString(cleanCode)}
    limit 1
  `);
  const invite = inviteRows[0];
  if (!invite || invite.used_at || invite.revoked_at || new Date(invite.expires_at).getTime() < Date.now()) {
    throw new Error("Invite code is invalid or expired.");
  }

  await query(`
    insert into household_members (household_id, user_id, role, active, updated_at)
    values (${sqlUuid(invite.household_id)}, ${sqlUuid(auth.user.id)}, 'member', true, now())
    on conflict (household_id, user_id)
    do update set role = excluded.role,
                  active = true,
                  updated_at = now()
  `);

  await query(`
    update household_invites
    set used_by = ${sqlUuid(auth.user.id)},
        used_at = now()
    where id = ${sqlUuid(invite.id)}
  `);

  const membership = await fetchHouseholdMembership(auth.user.id, invite.household_id);
  if (!membership) {
    throw new Error("Unable to join household.");
  }
  return {
    user: auth.user,
    household: membership.household,
    role: membership.role
  };
}

export async function fetchHouseholdInventory(auth) {
  const rows = await query(`
    select id::text as id,
           client_id,
           name,
           normalized_name,
           description_text,
           canonical_ingredient_id::text as canonical_ingredient_id,
           quantity::text as quantity,
           unit,
           canonical_quantity::text as canonical_quantity,
           canonical_unit,
           unit_conversion_ratio::text as unit_conversion_ratio,
           unit_conversion_needs_review,
           unit_conversion_review_reason,
           category,
           location,
           entered_date::text as entered_date,
           expire_date::text as expire_date,
           created_at::text as created_at,
           updated_at::text as updated_at
    from household_inventory_items
    where household_id = ${sqlUuid(auth.household.id)}
      and deleted_at is null
    order by location asc, expire_date asc, name asc
  `);
  return rows.map(normalizeInventoryRow);
}

export async function upsertHouseholdInventory(auth, items) {
  const normalizedItems = Array.isArray(items)
    ? items.map((item) => normalizeInventoryInput(item, auth)).filter(Boolean)
    : [];

  if (normalizedItems.length === 0) {
    return await fetchHouseholdInventory(auth);
  }

  await upsertHouseholdInventoryRows(normalizedItems);
  return await fetchHouseholdInventory(auth);
}

export async function deleteHouseholdInventoryItem(auth, clientId) {
  const cleanClientId = String(clientId || "").trim();
  if (!cleanClientId) {
    throw new Error("clientId is required.");
  }

  await query(`
    update household_inventory_items
    set deleted_at = now(),
        updated_by = ${sqlUuid(auth.user.id)},
        updated_at = now()
    where household_id = ${sqlUuid(auth.household.id)}
      and client_id = ${sqlString(cleanClientId)}
  `);
}

async function fetchUserByInstallHash(installHash) {
  const rows = await query(`
    select id::text as id,
           display_name,
           last_seen_at::text as last_seen_at
    from app_users
    where install_id_hash = ${sqlString(installHash)}
    limit 1
  `);
  return rows[0] ? normalizeUserRow(rows[0]) : null;
}

async function createAppUser({ displayName, installHash }) {
  const rows = await query(`
    insert into app_users (display_name, install_id_hash)
    values (${sqlString(String(displayName || "TableUp User").trim() || "TableUp User")}, ${sqlNullableString(installHash)})
    returning id::text as id,
              display_name,
              last_seen_at::text as last_seen_at
  `);
  return normalizeUserRow(rows[0]);
}

async function createHouseholdForUser(user) {
  const householdRows = await query(`
    insert into households (name, created_by)
    values ('我的厨房', ${sqlUuid(user.id)})
    returning id::text as id,
              name,
              updated_at::text as updated_at
  `);
  const household = normalizeHouseholdRow(householdRows[0]);
  await query(`
    insert into household_members (household_id, user_id, role, active, updated_at)
    values (${sqlUuid(household.id)}, ${sqlUuid(user.id)}, 'owner', true, now())
    on conflict (household_id, user_id)
    do update set role = excluded.role,
                  active = true,
                  updated_at = now()
  `);
  return household;
}

async function fetchCurrentHouseholdMembership(userId) {
  const rows = await query(`
    select household_id::text as household_id,
           role,
           joined_at::text as joined_at
    from household_members
    where user_id = ${sqlUuid(userId)}
      and active = true
    order by joined_at desc
    limit 1
  `);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return await fetchHouseholdMembership(userId, row.household_id);
}

async function fetchHouseholdMembership(userId, householdId) {
  const rows = await query(`
    select hm.role,
           h.id::text as id,
           h.name,
           h.updated_at::text as updated_at
    from household_members hm
    join households h on h.id = hm.household_id
    where hm.user_id = ${sqlUuid(userId)}
      and hm.household_id = ${sqlUuid(householdId)}
      and hm.active = true
    limit 1
  `);
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    household: normalizeHouseholdRow(row),
    role: row.role || "member"
  };
}

async function createSessionToken(userId) {
  const token = `tup_${randomBytes(32).toString("base64url")}`;
  await query(`
    insert into app_user_sessions (user_id, token_hash)
    values (${sqlUuid(userId)}, ${sqlString(hashSecret(token))})
  `);
  return token;
}

async function uniqueInviteCode() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = randomBytes(5).toString("base64url").replace(/[^A-Z0-9]/gi, "").slice(0, 8).toUpperCase();
    const rows = await query(`select id::text as id from household_invites where code = ${sqlString(code)} limit 1`);
    if (rows.length === 0) {
      return code;
    }
  }
  return randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
}

function installIdHash(installId) {
  const clean = String(installId || "").trim();
  return clean ? hashSecret(clean) : "";
}

function hashSecret(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function normalizeInviteCode(code) {
  return String(code || "").trim().replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function normalizeUserRow(row) {
  return {
    id: row.id,
    displayName: row.display_name || "TableUp User",
    lastSeenAt: row.last_seen_at || ""
  };
}

function normalizeHouseholdRow(row) {
  return {
    id: row.id,
    name: row.name || "我的厨房",
    updatedAt: row.updated_at || ""
  };
}

function normalizeHouseholdMemberRow(row) {
  return {
    id: row.user_id,
    userId: row.user_id,
    displayName: row.display_name || "TableUp User",
    role: row.role || "member",
    joinedAt: row.joined_at || "",
    lastSeenAt: row.last_seen_at || ""
  };
}

function normalizeInventoryInput(item, auth) {
  const clientId = String(item.clientId || item.id || "").trim();
  const name = String(item.name || "").trim();
  if (!clientId || !name) {
    return null;
  }

  const canonicalId = String(item.canonicalIngredientId || "").trim();
  return {
    household_id: auth.household.id,
    client_id: clientId,
    name,
    normalized_name: String(item.normalizedName || canonicalIngredientId(name)).trim(),
    description_text: String(item.descriptionText || "").trim(),
    canonical_ingredient_id: isUUID(canonicalId) ? canonicalId : null,
    quantity: safeNumber(item.quantity, 1),
    unit: String(item.unit || "piece").trim() || "piece",
    canonical_quantity: safeNumber(item.canonicalQuantity, 0),
    canonical_unit: String(item.canonicalUnit || "").trim(),
    unit_conversion_ratio: safeNumber(item.unitConversionRatio, 0),
    unit_conversion_needs_review: Boolean(item.unitConversionNeedsReview),
    unit_conversion_review_reason: String(item.unitConversionReviewReason || "").trim(),
    category: String(item.category || item.categoryRaw || "Other").trim() || "Other",
    location: String(item.location || item.locationRaw || "Fridge").trim() || "Fridge",
    entered_date: dateOnly(item.enteredDate || item.entered_date),
    expire_date: dateOnly(item.expireDate || item.expire_date),
    created_by: auth.user.id,
    updated_by: auth.user.id,
    updated_at: new Date().toISOString(),
    deleted_at: null
  };
}

async function upsertHouseholdInventoryRows(items) {
  const values = items.map(sqlHouseholdInventoryValue).join(",\n");
  await query(`
    insert into household_inventory_items (
      household_id,
      client_id,
      name,
      normalized_name,
      description_text,
      canonical_ingredient_id,
      quantity,
      unit,
      canonical_quantity,
      canonical_unit,
      unit_conversion_ratio,
      unit_conversion_needs_review,
      unit_conversion_review_reason,
      category,
      location,
      entered_date,
      expire_date,
      created_by,
      updated_by,
      updated_at,
      deleted_at
    )
    values ${values}
    on conflict (household_id, client_id)
    do update set
      name = excluded.name,
      normalized_name = excluded.normalized_name,
      description_text = excluded.description_text,
      canonical_ingredient_id = excluded.canonical_ingredient_id,
      quantity = excluded.quantity,
      unit = excluded.unit,
      canonical_quantity = excluded.canonical_quantity,
      canonical_unit = excluded.canonical_unit,
      unit_conversion_ratio = excluded.unit_conversion_ratio,
      unit_conversion_needs_review = excluded.unit_conversion_needs_review,
      unit_conversion_review_reason = excluded.unit_conversion_review_reason,
      category = excluded.category,
      location = excluded.location,
      entered_date = excluded.entered_date,
      expire_date = excluded.expire_date,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at,
      deleted_at = null
  `);
}

function sqlHouseholdInventoryValue(item) {
  return `(
    ${sqlUuid(item.household_id)},
    ${sqlString(item.client_id)},
    ${sqlString(item.name)},
    ${sqlString(item.normalized_name)},
    ${sqlString(item.description_text)},
    ${sqlNullableUuid(item.canonical_ingredient_id)},
    ${sqlNumber(item.quantity, 1)},
    ${sqlString(item.unit)},
    ${sqlNumber(item.canonical_quantity, 0)},
    ${sqlString(item.canonical_unit)},
    ${sqlNumber(item.unit_conversion_ratio, 0)},
    ${sqlBoolean(item.unit_conversion_needs_review)},
    ${sqlString(item.unit_conversion_review_reason)},
    ${sqlString(item.category)},
    ${sqlString(item.location)},
    ${sqlDate(item.entered_date)},
    ${sqlDate(item.expire_date)},
    ${sqlUuid(item.created_by)},
    ${sqlUuid(item.updated_by)},
    now(),
    null
  )`;
}

function normalizeInventoryRow(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    normalizedName: row.normalized_name || "",
    descriptionText: row.description_text || "",
    canonicalIngredientId: row.canonical_ingredient_id || "",
    quantity: Number(row.quantity || 0),
    unit: row.unit || "piece",
    canonicalQuantity: Number(row.canonical_quantity || 0),
    canonicalUnit: row.canonical_unit || "",
    unitConversionRatio: Number(row.unit_conversion_ratio || 0),
    unitConversionNeedsReview: sqlBooleanValue(row.unit_conversion_needs_review),
    unitConversionReviewReason: row.unit_conversion_review_reason || "",
    category: row.category || "Other",
    location: row.location || "Fridge",
    enteredDate: row.entered_date || "",
    expireDate: row.expire_date || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || ""
  };
}

function safeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sqlUuid(value) {
  const clean = String(value || "").trim();
  if (!isUUID(clean)) {
    throw new Error("Invalid UUID value.");
  }
  return `${sqlString(clean)}::uuid`;
}

function sqlNullableUuid(value) {
  const clean = String(value || "").trim();
  return isUUID(clean) ? sqlUuid(clean) : "null";
}

function sqlNullableString(value) {
  const clean = String(value || "").trim();
  return clean ? sqlString(clean) : "null";
}

function sqlDate(value) {
  return `${sqlString(dateOnly(value))}::date`;
}

function sqlBooleanValue(value) {
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "t" || normalized === "1";
}

function dateOnly(value) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

export async function fetchCloudRecipes() {
  const [recipeRows, ingredientRows, stepRows] = await Promise.all([
    restSelectAll("pantry_recipes", "select=recipe_id,name,image_url,video_url,updated_at,total_time_minutes,active_time_minutes,primary_cooking_method,difficulty,leftover_score,cleanup_score&active=eq.true&order=updated_at.desc,name.asc"),
    restSelectAll("pantry_recipe_ingredients", "select=recipe_id,ingredient_id,canonical_ingredient_id,canonical_ingredient_slug,role,name,quantity,unit,sort_order,required_flag,optional_flag,pantry_flag&order=recipe_id.asc,sort_order.asc,ingredient_id.asc"),
    restSelectAll("pantry_recipe_steps", "select=recipe_id,step_id,step_order,instruction&order=recipe_id.asc,step_order.asc,step_id.asc")
  ]);

  const activeRecipeIds = new Set(recipeRows.map((recipe) => recipe.recipe_id));
  const ingredientsByRecipe = groupBy(
    ingredientRows.filter((ingredient) => activeRecipeIds.has(ingredient.recipe_id)),
    "recipe_id"
  );
  const stepsByRecipe = groupBy(
    stepRows.filter((step) => activeRecipeIds.has(step.recipe_id)),
    "recipe_id"
  );

  return recipeRows.map((recipe) => ({
    id: recipe.recipe_id,
    name: recipe.name,
    imageURL: recipe.image_url || "",
    videoURL: recipe.video_url || "",
    updatedAt: recipe.updated_at,
    totalTimeMinutes: Number(recipe.total_time_minutes || 0),
    activeTimeMinutes: Number(recipe.active_time_minutes || 0),
    primaryCookingMethod: recipe.primary_cooking_method || "",
    difficulty: recipe.difficulty || "",
    leftoverScore: Number(recipe.leftover_score || 0),
    cleanupScore: Number(recipe.cleanup_score || 0),
    ingredients: (ingredientsByRecipe.get(recipe.recipe_id) || []).map((ingredient) => ({
      id: ingredient.ingredient_id,
      canonicalIngredientId: ingredient.canonical_ingredient_id || "",
      canonicalIngredientSlug: ingredient.canonical_ingredient_slug || "",
      role: normalizeRole(ingredient.role),
      name: ingredient.name,
      quantity: Number(ingredient.quantity || 1),
      unit: ingredient.unit || "piece",
      sortOrder: Number(ingredient.sort_order || 0),
      requiredFlag: ingredient.required_flag ?? normalizeRole(ingredient.role) === "main",
      optionalFlag: ingredient.optional_flag ?? normalizeRole(ingredient.role) === "secondary",
      pantryFlag: ingredient.pantry_flag ?? normalizeRole(ingredient.role) === "seasoning"
    })),
    steps: (stepsByRecipe.get(recipe.recipe_id) || []).map((step) => normalizeStoredRecipeStep(step))
  }));
}

export async function upsertCloudRecipe(input, recipeId = randomUUID()) {
  const recipe = normalizeRecipeInput(input, recipeId);
  const now = new Date().toISOString();

  await restWrite(
    "pantry_recipes?on_conflict=recipe_id",
    "POST",
    [{
      recipe_id: recipe.id,
      name: recipe.name,
      image_url: recipe.imageURL,
      video_url: recipe.videoURL,
      total_time_minutes: recipe.totalTimeMinutes,
      active_time_minutes: recipe.activeTimeMinutes,
      primary_cooking_method: recipe.primaryCookingMethod,
      difficulty: recipe.difficulty,
      leftover_score: recipe.leftoverScore,
      cleanup_score: recipe.cleanupScore,
      updated_at: now,
      active: true
    }],
    { prefer: "resolution=merge-duplicates" }
  );

  await restWrite(`pantry_recipe_ingredients?recipe_id=eq.${encodeURIComponent(recipe.id)}`, "DELETE");
  await restWrite(`pantry_recipe_steps?recipe_id=eq.${encodeURIComponent(recipe.id)}`, "DELETE");

  if (recipe.ingredients.length > 0) {
    await restWrite(
      "pantry_recipe_ingredients",
      "POST",
      recipe.ingredients.map((ingredient, index) => ({
        ingredient_id: ingredient.id || randomUUID(),
        recipe_id: recipe.id,
        role: normalizeRole(ingredient.role),
        name: ingredient.name,
        canonical_ingredient_id: ingredient.canonicalIngredientId || "",
        quantity: Number.isFinite(Number(ingredient.quantity)) ? Number(ingredient.quantity) : 1,
        unit: ingredient.unit || "piece",
        sort_order: Number.isFinite(Number(ingredient.sortOrder)) ? Number(ingredient.sortOrder) : index + 1,
        required_flag: ingredient.requiredFlag ?? normalizeRole(ingredient.role) === "main",
        optional_flag: ingredient.optionalFlag ?? normalizeRole(ingredient.role) === "secondary",
        pantry_flag: ingredient.pantryFlag ?? normalizeRole(ingredient.role) === "seasoning"
      }))
    );
  }

  if (recipe.steps.length > 0) {
    await restWrite(
      "pantry_recipe_steps",
      "POST",
      recipe.steps.map((step, index) => ({
        step_id: step.id || randomUUID(),
        recipe_id: recipe.id,
        step_order: Number.isFinite(Number(step.order)) ? Number(step.order) : index + 1,
        instruction: JSON.stringify({
          text: step.text,
          phase: normalizeStepPhase(step.phase),
          imageURLs: Array.isArray(step.imageURLs) ? step.imageURLs : []
        })
      }))
    );
  }

  return (await fetchCloudRecipes()).find((cloudRecipe) => cloudRecipe.id === recipe.id);
}

export async function deleteCloudRecipe(recipeId) {
  if (!recipeId || typeof recipeId !== "string") {
    throw new Error("recipe id is required");
  }

  await restWrite(
    `pantry_recipes?recipe_id=eq.${encodeURIComponent(recipeId)}`,
    "PATCH",
    {
      active: false,
      updated_at: new Date().toISOString()
    }
  );
}

export async function uploadVolumeFile({ data, mimeType = "application/octet-stream", extension = "bin" }) {
  const safeExtension = String(extension || "bin").replace(/[^A-Za-z0-9]/g, "") || "bin";
  const fileName = `${randomUUID()}.${safeExtension}`;

  await restWrite(
    "pantry_media?on_conflict=file_name",
    "POST",
    [{
      file_name: fileName,
      mime_type: mimeType,
      data_base64: Buffer.from(data).toString("base64")
    }],
    { prefer: "resolution=merge-duplicates" }
  );

  return {
    fileName,
    path: `pantry_media/${fileName}`,
    url: `/api/media/${encodeURIComponent(fileName)}`
  };
}

export async function readVolumeFile(fileName) {
  const safeFileName = sanitizeFileName(fileName);
  const rows = await restSelect(
    "pantry_media",
    `select=mime_type,data_base64&file_name=eq.${encodeURIComponent(safeFileName)}&limit=1`
  );

  if (rows.length === 0 || !rows[0].data_base64) {
    throw new Error("Media file was not found.");
  }

  return {
    data: Buffer.from(rows[0].data_base64, "base64"),
    mimeType: rows[0].mime_type || mimeTypeForFileName(safeFileName)
  };
}

export async function upsertMediaFile({ fileName, data, mimeType = "application/octet-stream" }) {
  const safeFileName = sanitizeFileName(fileName);
  await restWrite(
    "pantry_media?on_conflict=file_name",
    "POST",
    [{
      file_name: safeFileName,
      mime_type: mimeType,
      data_base64: Buffer.from(data).toString("base64")
    }],
    { prefer: "resolution=merge-duplicates" }
  );
}

export async function recipeCount() {
  const rows = await restSelect("pantry_recipes", "select=recipe_id&active=eq.true");
  return rows.length;
}

export async function fetchMatchingRules() {
  const [ingredients, aliases, modifiers, categories, tags, functionalProfiles, substitutionRules, verifiedSubstitutions] = await Promise.all([
    restSelectAll("ingredients", "select=ingredient_id,ingredient_slug,canonical_name,category,category_id,subcategory_id,canonical_unit&order=canonical_name.asc"),
    fetchIngredientAliasesForMatching(),
    restSelectAll("ingredient_modifiers", "select=modifier_text,normalized_text,modifier_type,normalized_value,language,strength,active&active=eq.true&order=normalized_text.asc").catch((error) => {
      console.warn(`Unable to fetch ingredient modifiers: ${error.message}`);
      return [];
    }),
    restSelectAll("ingredient_categories", "select=id,slug,name,parent_category_id&order=slug.asc"),
    restSelectAll("ingredient_tags", "select=id,slug,name,tag_type&order=slug.asc"),
    restSelectAll("ingredient_functional_profiles", "select=ingredient_id,tag_id,weight,source,notes&order=ingredient_id.asc,tag_id.asc"),
    restSelectAll("substitution_rules", "select=source_category_id,target_category_id,context,base_score,notes&order=context.asc"),
    restSelectAll("verified_substitutions", "select=ingredient_id,substitute_ingredient_id,substitute_combo_slug,context,confidence_score,replacement_ratio,notes,source_name,source_url,active&active=eq.true&order=ingredient_id.asc,confidence_score.desc")
  ]);

  return {
    ingredients,
    aliases,
    modifiers,
    categories,
    tags,
    functionalProfiles,
    substitutionRules,
    verifiedSubstitutions
  };
}

async function fetchIngredientAliasesForMatching() {
  try {
    return await restSelectAll(
      "ingredient_aliases",
      "select=alias_name,ingredient_id,ingredient_slug,language,verified,confidence_score,active,review_status&active=eq.true&review_status=eq.accepted&order=alias_name.asc"
    );
  } catch (error) {
    console.warn(`Unable to fetch accepted active ingredient aliases, falling back to active alias query: ${error.message}`);
    return await restSelectAll(
      "ingredient_aliases",
      "select=alias_name,ingredient_id,ingredient_slug,language,verified,confidence_score,active&active=eq.true&order=alias_name.asc"
    );
  }
}

export async function fetchIngredientUnitConversions(ingredientId) {
  const id = await resolveIngredientId(ingredientId);
  if (!id) {
    return [];
  }
  return await restSelectAll(
    "ingredient_unit_conversion",
    `select=ingredient_id,ingredient_slug,from_unit,to_unit,ratio,conversion_type,is_default,notes&ingredient_id=eq.${encodeURIComponent(id)}&order=from_unit.asc`
  );
}

export async function fetchUnitAliases(language = "") {
  const normalizedLanguage = String(language || "").trim().toLowerCase();
  const query = normalizedLanguage
    ? `select=alias,unit,language,notes&language=eq.${encodeURIComponent(normalizedLanguage)}&order=unit.asc,alias.asc`
    : "select=alias,unit,language,notes&order=unit.asc,alias.asc";
  return await restSelectAll("unit_aliases", query);
}

export async function fetchIngredientDictionary(language = "en") {
  const ingredients = await restSelectAll(
    "ingredients",
    "select=ingredient_id,ingredient_slug,canonical_name,category,canonical_unit&order=category.asc,canonical_name.asc"
  );
  const normalizedLanguage = String(language || "en").trim().toLowerCase();
  if (normalizedLanguage !== "zh") {
    return ingredients.map((ingredient) => ({
      ...ingredient,
      display_name: ingredient.canonical_name
    }));
  }

  const aliases = await restSelectAll(
    "ingredient_aliases",
    "select=alias_name,ingredient_id&language=eq.zh&verified=eq.true&order=alias_name.asc"
  );
  const aliasByIngredientId = new Map();
  for (const alias of aliases) {
    if (!aliasByIngredientId.has(alias.ingredient_id)) {
      aliasByIngredientId.set(alias.ingredient_id, alias.alias_name);
    }
  }

  return ingredients.map((ingredient) => ({
    ...ingredient,
    display_name: aliasByIngredientId.get(ingredient.ingredient_id) || ingredient.canonical_name
  }));
}

export async function fetchIngredientStorageLifeRules() {
  return await restSelectAll(
    "ingredient_storage_life_rules",
    "select=ingredient_id,ingredient_slug,category,storage_approach,storage_location,default_days,condition_state,priority,notes,source_name,source_url,source_priority,safety_note,active&active=eq.true&condition_state=eq.default&order=priority.asc,ingredient_id.asc,storage_approach.asc"
  );
}

export async function upsertUnknownIngredients(items) {
  const normalized = Array.isArray(items)
    ? items
        .map((item) => ({
          raw_name: typeof item.rawName === "string" ? item.rawName.trim() : "",
          normalized_name: canonicalIngredientId(item.rawName),
          source: typeof item.source === "string" ? item.source : "inventory",
          status: "pending",
          occurrence_count: Number.isFinite(Number(item.occurrenceCount)) ? Number(item.occurrenceCount) : 1,
          last_seen_at: new Date().toISOString()
        }))
        .filter((item) => item.raw_name && item.normalized_name)
    : [];

  if (normalized.length === 0) {
    return;
  }

  await Promise.all(normalized.map(async (item) => {
    try {
      const existing = await restSelect(
        "unknown_ingredients",
        `select=id,occurrence_count&normalized_name=eq.${encodeURIComponent(item.normalized_name)}&source=eq.${encodeURIComponent(item.source)}&status=eq.pending&limit=1`
      );

      if (existing.length > 0) {
        await restWrite(
          `unknown_ingredients?id=eq.${encodeURIComponent(existing[0].id)}`,
          "PATCH",
          {
            raw_name: item.raw_name,
            occurrence_count: Number(existing[0].occurrence_count || 0) + item.occurrence_count,
            last_seen_at: item.last_seen_at
          }
        );
        return;
      }

      await restWrite("unknown_ingredients", "POST", [{
        raw_name: item.raw_name,
        normalized_name: item.normalized_name,
        source: item.source,
        status: item.status,
        occurrence_count: item.occurrence_count,
        first_seen_at: item.last_seen_at,
        last_seen_at: item.last_seen_at
      }]);
    } catch (error) {
      console.warn(`Unable to record unknown ingredient "${item.raw_name}": ${error.message}`);
    }
  }));
}

export async function fetchPendingUnknownIngredients(limit = 25, source = "") {
  try {
    const normalizedSource = String(source || "").trim();
    const sourceFilter = normalizedSource ? `&source=eq.${encodeURIComponent(normalizedSource)}` : "";
    return await restSelect(
      "unknown_ingredients",
      `select=id,raw_name,normalized_name,source,suggested_canonical_name,ai_confidence,status,occurrence_count,first_seen_at,last_seen_at&status=eq.pending${sourceFilter}&order=last_seen_at.desc&limit=${Math.max(1, Math.min(Number(limit) || 25, 100))}`
    );
  } catch (error) {
    console.warn(`Unable to fetch pending unknown ingredients: ${error.message}`);
    return [];
  }
}

export async function upsertIngredientAliasSuggestion({ aliasName, ingredientId, canonicalName, category = "other", confidenceScore = 0.7, verified = false, language = "mixed", unknownIngredientId = "" }) {
  const alias = String(aliasName || "").trim();
  const canonical = String(canonicalName || ingredientId || "").trim();
  const slug = canonicalIngredientId(canonical);
  const requestedId = String(ingredientId || "").trim();
  if (!alias || !canonical) {
    throw new Error("aliasName and canonicalName are required.");
  }

  await restWrite(
    "ingredients?on_conflict=ingredient_slug",
    "POST",
    [{
      ingredient_slug: slug,
      canonical_name: canonical,
      category
    }],
    { prefer: "resolution=merge-duplicates" }
  );
  const resolvedIngredientId = await resolveIngredientId(requestedId || slug);

  await restWrite(
    "ingredient_aliases?on_conflict=alias_name",
    "POST",
    [{
      alias_name: alias,
      ingredient_id: resolvedIngredientId || null,
      ingredient_slug: slug,
      canonical_name: canonical,
      category,
      language,
      confidence_score: confidenceScore,
      verified
    }],
    { prefer: "resolution=merge-duplicates" }
  );

  if (unknownIngredientId) {
    await restWrite(
      `unknown_ingredients?id=eq.${encodeURIComponent(unknownIngredientId)}`,
      "PATCH",
      {
        suggested_canonical_name: canonical,
        suggested_ingredient_id: resolvedIngredientId || null,
        suggested_ingredient_slug: slug,
        ai_confidence: confidenceScore,
        status: "resolved",
        last_seen_at: new Date().toISOString()
      }
    );
  }
}

export async function markUnknownIngredientResolved({ unknownIngredientId = "", ingredientId = "", canonicalName = "", confidenceScore = 1 }) {
  const id = String(unknownIngredientId || "").trim();
  const requestedIngredientId = String(ingredientId || "").trim();
  const canonical = String(canonicalName || requestedIngredientId).trim();

  if (!id || !requestedIngredientId) {
    throw new Error("unknownIngredientId and ingredientId are required.");
  }
  const resolvedIngredientId = await resolveIngredientId(requestedIngredientId);

  await restWrite(
    `unknown_ingredients?id=eq.${encodeURIComponent(id)}`,
    "PATCH",
    {
      suggested_canonical_name: canonical,
      suggested_ingredient_id: resolvedIngredientId || null,
      suggested_ingredient_slug: isUUID(requestedIngredientId) ? "" : requestedIngredientId,
      ai_confidence: Number(confidenceScore || 1),
      status: "resolved",
      last_seen_at: new Date().toISOString()
    }
  );
}

async function resolveIngredientId(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  if (isUUID(raw)) {
    return raw;
  }
  try {
    const rows = await restSelect(
      "ingredients",
      `select=ingredient_id&ingredient_slug=eq.${encodeURIComponent(raw)}&limit=1`
    );
    return rows[0]?.ingredient_id || "";
  } catch {
    return "";
  }
}

function isUUID(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

export async function restSelect(table, queryString) {
  return restRequest(`${table}?${queryString}`, { method: "GET" });
}

export async function restSelectAll(table, queryString, pageSize = 1000) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await restRequest(`${table}?${queryString}`, {
      method: "GET",
      range: `${offset}-${offset + pageSize - 1}`
    });
    rows.push(...page);
    if (page.length < pageSize) {
      return rows;
    }
  }
}

export async function restWrite(path, method, body, options = {}) {
  return restRequest(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    prefer: options.prefer
  });
}

async function restRequest(path, { method, body, prefer, range }) {
  const config = supabaseRestConfig();
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      ...(range ? { Range: range } : {}),
      ...(prefer ? { Prefer: prefer } : {})
    },
    body
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Supabase REST failed with ${response.status}`);
  }
  return text ? JSON.parse(text) : [];
}

function supabaseRestConfig() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!url || !key) {
    throw new Error("Supabase REST is not configured. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.");
  }
  return { url, key };
}

function normalizeRecipeInput(input, recipeId) {
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  if (!name) {
    throw new Error("Recipe name is required.");
  }

  return {
    id: typeof input.id === "string" && input.id.trim() ? input.id.trim() : recipeId,
    name,
    imageURL: typeof input.imageURL === "string" ? input.imageURL.trim() : "",
    videoURL: typeof input.videoURL === "string" ? input.videoURL.trim() : "",
    totalTimeMinutes: Number(input.totalTimeMinutes || 0),
    activeTimeMinutes: Number(input.activeTimeMinutes || 0),
    primaryCookingMethod: normalizeCookingMethods(input.primaryCookingMethod),
    difficulty: typeof input.difficulty === "string" ? input.difficulty.trim() : "",
    leftoverScore: Number(input.leftoverScore || 0),
    cleanupScore: Number(input.cleanupScore || 0),
    ingredients: Array.isArray(input.ingredients)
      ? input.ingredients
          .map((ingredient) => ({
            id: typeof ingredient.id === "string" ? ingredient.id : "",
            canonicalIngredientId: typeof ingredient.canonicalIngredientId === "string" ? ingredient.canonicalIngredientId : "",
            role: ingredient.role,
            name: typeof ingredient.name === "string" ? ingredient.name.trim() : "",
            quantity: Number(ingredient.quantity || 1),
            unit: typeof ingredient.unit === "string" ? ingredient.unit.trim() : "piece",
            sortOrder: Number(ingredient.sortOrder || 0),
            requiredFlag: typeof ingredient.requiredFlag === "boolean" ? ingredient.requiredFlag : undefined,
            optionalFlag: typeof ingredient.optionalFlag === "boolean" ? ingredient.optionalFlag : undefined,
            pantryFlag: typeof ingredient.pantryFlag === "boolean" ? ingredient.pantryFlag : undefined
          }))
          .filter((ingredient) => ingredient.name)
      : [],
    steps: Array.isArray(input.steps)
      ? input.steps
          .map((step, index) => ({
            id: typeof step.id === "string" ? step.id : "",
            order: Number(step.order || index + 1),
            phase: normalizeStepPhase(step.phase),
            text: typeof step.text === "string" ? step.text.trim() : "",
            imageURLs: Array.isArray(step.imageURLs)
              ? step.imageURLs.map((url) => String(url || "").trim()).filter(Boolean)
              : []
          }))
          .filter((step) => step.text || step.imageURLs.length > 0)
      : []
  };
}

function normalizeStoredRecipeStep(step) {
  const parsed = parseStepInstruction(step.instruction);
  return {
    id: step.step_id,
    order: Number(step.step_order || 0),
    phase: normalizeStepPhase(parsed.phase),
    text: parsed.text,
    imageURLs: parsed.imageURLs
  };
}

function parseStepInstruction(instruction) {
  const value = String(instruction || "").trim();
  if (!value.startsWith("{")) {
    return { text: value, phase: "COOK", imageURLs: [] };
  }

  try {
    const parsed = JSON.parse(value);
    return {
      text: typeof parsed.text === "string" ? parsed.text : value,
      phase: normalizeStepPhase(parsed.phase),
      imageURLs: Array.isArray(parsed.imageURLs)
        ? parsed.imageURLs.map((url) => String(url || "").trim()).filter(Boolean)
        : []
    };
  } catch {
    return { text: value, phase: "COOK", imageURLs: [] };
  }
}

function normalizeStepPhase(phase) {
  const value = String(phase || "").trim().toUpperCase();
  if (value === "CLEANUP") {
    return "FINISH";
  }
  return ["PLANNING", "PREP", "COOK", "FINISH"].includes(value) ? value : "COOK";
}

function normalizeCookingMethod(method) {
  const value = String(method || "").trim().toLowerCase();
  const allowed = new Set([
    "",
    "stir_fry",
    "pan_fry",
    "grill",
    "bake",
    "roast",
    "braise",
    "stew",
    "slow_cook",
    "soup",
    "steam",
    "boil",
    "hot_pot",
    "air_fry",
    "deep_fry",
    "poach",
    "smoke",
    "quick_boil",
    "sauce",
    "stuffing",
    "raw"
  ]);
  return allowed.has(value) ? value : "";
}

function normalizeCookingMethods(methods) {
  const normalized = String(methods || "")
    .split(",")
    .map(normalizeCookingMethod)
    .filter(Boolean);
  return [...new Set(normalized)].join(",");
}

function sanitizeFileName(fileName) {
  const safeFileName = String(fileName || "");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(safeFileName)) {
    throw new Error("Invalid media file name.");
  }
  return safeFileName;
}

function mimeTypeForFileName(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".heic")) {
    return "image/heic";
  }
  if (lower.endsWith(".mov")) {
    return "video/quicktime";
  }
  if (lower.endsWith(".mp4")) {
    return "video/mp4";
  }
  return "application/octet-stream";
}

function groupBy(rows, key) {
  const grouped = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!grouped.has(value)) {
      grouped.set(value, []);
    }
    grouped.get(value).push(row);
  }
  return grouped;
}

function normalizeRole(role) {
  if (role === "secondary" || role === "seasoning") {
    return role;
  }
  return "main";
}

function canonicalIngredientId(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
