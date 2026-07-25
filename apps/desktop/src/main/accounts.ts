// Account storage as plaintext JSON in the user's data folder.
import { app } from "electron";
import { join } from "path";
import { readFile, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import type { Account, AccountInput } from "@iptv/contracts";

const filePath = (): string => join(app.getPath("userData"), "accounts.json");

export async function load(): Promise<Account[]> {
  try {
    const raw = await readFile(filePath(), "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? (data as Account[]) : [];
  } catch {
    return [];
  }
}

async function persist(accounts: Account[]): Promise<Account[]> {
  await writeFile(filePath(), JSON.stringify(accounts, null, 2), "utf-8");
  return accounts;
}

export async function add(account: AccountInput): Promise<Account> {
  const accounts = await load();
  const entry: Account = {
    id: randomUUID(),
    name: account.name?.trim() || account.host,
    host: account.host.trim(),
    username: account.username.trim(),
    password: account.password,
  };
  accounts.push(entry);
  await persist(accounts);
  return entry;
}

export async function update(id: string, patch: Partial<Account>): Promise<Account | null> {
  const accounts = await load();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  accounts[idx] = { ...accounts[idx], ...patch, id };
  await persist(accounts);
  return accounts[idx];
}

export async function remove(id: string): Promise<boolean> {
  const accounts = await load();
  await persist(accounts.filter((a) => a.id !== id));
  return true;
}
