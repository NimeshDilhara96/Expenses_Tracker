import { getSupabaseConfig } from "./config.js";

let supabasePromise;

async function getClient() {
  if (supabasePromise) {
    return supabasePromise;
  }

  supabasePromise = (async () => {
    const config = await getSupabaseConfig();

    if (!window.supabase?.createClient) {
      throw new Error("Supabase SDK unavailable. Check network and script loading.");
    }

    return window.supabase.createClient(config.url, config.anonKey);
  })();

  return supabasePromise;
}

export async function getSession() {
  const client = await getClient();
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw error;
  }

  return data.session;
}

export async function signUp(email, password) {
  const client = await getClient();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) {
    throw error;
  }

  return data;
}

export async function signIn(email, password) {
  const client = await getClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const client = await getClient();
  const { error } = await client.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function onAuthStateChanged(callback) {
  const client = await getClient();
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return data.subscription;
}

export async function fetchExpenses() {
  const client = await getClient();
  const { data, error } = await client
    .from("expenses")
    .select("id, amount, category, expense_source, note, expense_date, created_at, updated_at")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function addExpense(payload) {
  const client = await getClient();
  const { data, error } = await client
    .from("expenses")
    .insert(payload)
    .select("id, amount, category, expense_source, note, expense_date, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateExpense(id, payload) {
  const client = await getClient();
  const { data, error } = await client
    .from("expenses")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, amount, category, expense_source, note, expense_date, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteExpense(id) {
  const client = await getClient();
  const { error } = await client.from("expenses").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

export async function fetchIncomeSources() {
  const client = await getClient();
  const { data, error } = await client
    .from("income_sources")
    .select("id, name, details, created_at, updated_at")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function addIncomeSource(name, details = null) {
  const client = await getClient();
  const { data, error } = await client
    .from("income_sources")
    .insert({ name, details })
    .select("id, name, details, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function renameIncomeSource(id, name, details = null) {
  const client = await getClient();
  const { data, error } = await client
    .from("income_sources")
    .update({ name, details, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, name, details, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteIncomeSource(id) {
  const client = await getClient();
  const { error } = await client.from("income_sources").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

export async function replaceIncomeSourceName(oldName, newName) {
  const client = await getClient();
  const { error: incomesError } = await client
    .from("incomes")
    .update({ source: newName, updated_at: new Date().toISOString() })
    .eq("source", oldName);

  if (incomesError) {
    throw incomesError;
  }

  const { error: expensesError } = await client
    .from("expenses")
    .update({ expense_source: newName, updated_at: new Date().toISOString() })
    .eq("expense_source", oldName);

  if (expensesError) {
    throw expensesError;
  }
}

export async function isIncomeSourceInUse(sourceName) {
  const client = await getClient();
  const { data, error } = await client
    .from("incomes")
    .select("id")
    .eq("source", sourceName)
    .limit(1);

  if (error) {
    throw error;
  }

  if ((data?.length ?? 0) > 0) {
    return true;
  }

  const { data: expenseData, error: expenseError } = await client
    .from("expenses")
    .select("id")
    .eq("expense_source", sourceName)
    .limit(1);

  if (expenseError) {
    throw expenseError;
  }

  return (expenseData?.length ?? 0) > 0;
}

export async function fetchIncomes() {
  const client = await getClient();
  const { data, error } = await client
    .from("incomes")
    .select("id, amount, source, note, income_date, created_at, updated_at")
    .order("income_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function addIncome(payload) {
  const client = await getClient();
  const { data, error } = await client
    .from("incomes")
    .insert(payload)
    .select("id, amount, source, note, income_date, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateIncome(id, payload) {
  const client = await getClient();
  const { data, error } = await client
    .from("incomes")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, amount, source, note, income_date, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteIncome(id) {
  const client = await getClient();
  const { error } = await client.from("incomes").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

export async function fetchNotes() {
  const client = await getClient();
  const { data, error } = await client
    .from("notes")
    .select("id, person_name, amount, entry_type, title, category, details, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function addNote(payload) {
  const client = await getClient();
  const { data, error } = await client
    .from("notes")
    .insert(payload)
    .select("id, person_name, amount, entry_type, title, category, details, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteNote(id) {
  const client = await getClient();
  const { error } = await client.from("notes").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

export async function clearNotes() {
  const client = await getClient();
  const { error } = await client.from("notes").delete();
  if (error) {
    throw error;
  }
}
