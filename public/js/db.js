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

export async function fetchTransfers() {
  const client = await getClient();
  const { data, error } = await client
    .from("transfers")
    .select("id, from_account, to_account, amount, note, transfer_date, created_at, updated_at")
    .order("transfer_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function addTransfer(payload) {
  const client = await getClient();
  const { data, error } = await client
    .from("transfers")
    .insert(payload)
    .select("id, from_account, to_account, amount, note, transfer_date, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateTransfer(id, payload) {
  const client = await getClient();
  const { data, error } = await client
    .from("transfers")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, from_account, to_account, amount, note, transfer_date, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteTransfer(id) {
  const client = await getClient();
  const { error } = await client.from("transfers").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

export async function calculateAccountBalance(accountName) {
  const client = await getClient();
  
  // Get total income for this account
  const { data: incomeData, error: incomeError } = await client
    .from("incomes")
    .select("amount")
    .eq("source", accountName);
  
  if (incomeError) throw incomeError;
  
  const totalIncome = (incomeData || []).reduce((sum, item) => sum + Number(item.amount), 0);
  
  // Get total expenses from this account
  const { data: expenseData, error: expenseError } = await client
    .from("expenses")
    .select("amount")
    .eq("expense_source", accountName);
  
  if (expenseError) throw expenseError;
  
  const totalExpenses = (expenseData || []).reduce((sum, item) => sum + Number(item.amount), 0);
  
  // Get total transfers from this account
  const { data: transferOutData, error: transferOutError } = await client
    .from("transfers")
    .select("amount")
    .eq("from_account", accountName);
  
  if (transferOutError) throw transferOutError;
  
  const totalTransferOut = (transferOutData || []).reduce((sum, item) => sum + Number(item.amount), 0);
  
  // Get total transfers to this account
  const { data: transferInData, error: transferInError } = await client
    .from("transfers")
    .select("amount")
    .eq("to_account", accountName);
  
  if (transferInError) throw transferInError;
  
  const totalTransferIn = (transferInData || []).reduce((sum, item) => sum + Number(item.amount), 0);
  
  // Balance = Income + TransferIn - Expenses - TransferOut
  const balance = totalIncome + totalTransferIn - totalExpenses - totalTransferOut;
  
  return balance;
}

export async function deleteIncomeSource(id, name) {
  // Check if balance is zero
  const balance = await calculateAccountBalance(name);
  
  if (balance !== 0) {
    throw new Error(`Cannot delete account with balance ${balance.toFixed(2)}. Balance must be 0 to delete.`);
  }
  
  // Check if source is in use
  const inUse = await isIncomeSourceInUse(name);
  if (inUse) {
    throw new Error("Cannot delete account that has transactions. Please clear all transactions first.");
  }
  
  const client = await getClient();
  const { error } = await client.from("income_sources").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

async function onDelete(id) {
  if (!confirm(`Delete account "${sourceName}"?`)) {
    return;
  }

  try {
    await deleteIncomeSource(id, sourceName);
    toast("Account deleted successfully");
    // Refresh list
    const sources = await fetchIncomeSources();
    renderSourceList(sources);
  } catch (error) {
    toast(`Cannot delete: ${error.message}`, "error");
  }
}
