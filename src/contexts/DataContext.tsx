import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { UserRole, User, Category, MenuItem, OrderItem, Transaction, StoreSettings } from '@/lib/data';
import { generateTransactionId } from '@/lib/data';

/* eslint-disable @typescript-eslint/no-explicit-any */
const from = (t: string) => (supabase as any).from(t);

const SESSION_KEY = 'jos_session';
interface AppSession { username: string; role: UserRole }

interface DataContextType {
  dbConnected: boolean; loading: boolean;
  session: AppSession | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  users: User[]; menu: MenuItem[]; categories: Category[]; transactions: Transaction[]; settings: StoreSettings;
  addUser: (u: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  addMenuItem: (item: Partial<MenuItem> & { name: string }) => Promise<void>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<Category>;
  removeCategory: (id: string) => Promise<void>;
  renameCategory: (id: string, newName: string) => Promise<void>;
  saveTransaction: (items: OrderItem[], subtotal: number, adjustment: number, adjustmentInput: string, total: number, cashReceived: number, change: number, customerName?: string, specialInstructions?: string) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  saveSettings: (updates: Partial<StoreSettings>) => Promise<void>;
  exportBackup: () => string;
  importBackup: (json: string) => Promise<boolean>;
  refreshAll: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);
export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

const defaultSettings: StoreSettings = { id: '', name: "Jo's Coffee Shop", logo: '', locked: false };

export function DataProvider({ children }: { children: ReactNode }) {
  const [dbConnected, setDbConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AppSession | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);

  const toUser = (r: any): User => ({ id: r.id, username: r.username, password: '', role: r.role as UserRole, active: r.active });
  const toMenuItem = (r: any, cats: Category[]): MenuItem => {
    const cat = cats.find(c => c.id === r.category_id);
    return { id: r.id, code: r.code, name: r.name, category: cat?.name || 'Uncategorized', categoryId: r.category_id || '', prices: (r.prices || {}) as Record<string, number>, archived: r.archived, image: r.image || undefined, outOfStock: r.out_of_stock, tags: r.tags || [] };
  };
  const toOrderItem = (r: any): OrderItem => ({ menuItemId: r.menu_item_code, name: r.name, size: r.size, price: Number(r.price), quantity: r.quantity, customizations: r.customizations || [] });
  const toTransaction = (r: any, items: OrderItem[]): Transaction => ({
    id: r.id, code: r.transaction_code, items, subtotal: Number(r.subtotal), adjustment: Number(r.adjustment), adjustmentInput: r.adjustment_input, total: Number(r.total), cashReceived: Number(r.cash_received), change: Number(r.change), cashier: r.cashier, timestamp: r.created_at,
    status: r.voided ? 'voided' : (r.status as any), customerName: r.customer_name || undefined, specialInstructions: r.special_instructions || undefined, refundedAt: r.refunded_at || undefined, refundedBy: r.refunded_by || undefined, voided: r.voided, voidedAt: r.voided_at || undefined, voidedBy: r.voided_by || undefined,
  });

  const loadUsers = useCallback(async () => { const { data } = await (supabase as any).rpc('list_users_safe'); if (data) setUsers((data as any[]).map(toUser)); }, []);
  const loadCategories = useCallback(async (): Promise<Category[]> => {
    const { data } = await from('categories').select('*').order('sort_order');
    const cats = ((data || []) as any[]).map((r: any) => ({ id: r.id, name: r.name, sortOrder: r.sort_order }));
    setCategories(cats); return cats;
  }, []);
  const loadMenu = useCallback(async (cats?: Category[]) => {
    const catsToUse = cats || categories;
    const { data } = await from('menu_items').select('*');
    if (data) setMenu((data as any[]).map((r: any) => toMenuItem(r, catsToUse)));
  }, [categories]);
  const loadTransactions = useCallback(async () => {
    const { data: txData } = await from('transactions').select('*').order('created_at', { ascending: false }).limit(1000);
    if (!txData || (txData as any[]).length === 0) { setTransactions([]); return; }
    const txIds = (txData as any[]).map((t: any) => t.id);
    const { data: ois } = await from('order_items').select('*').in('transaction_id', txIds);
    const byTx: Record<string, OrderItem[]> = {};
    ((ois || []) as any[]).forEach((o: any) => { if (!byTx[o.transaction_id]) byTx[o.transaction_id] = []; byTx[o.transaction_id].push(toOrderItem(o)); });
    setTransactions((txData as any[]).map((t: any) => toTransaction(t, byTx[t.id] || [])));
  }, []);
  const loadSettings = useCallback(async () => {
    const { data } = await from('store_settings').select('*').limit(1).single();
    if (data) { const d = data as any; setSettings({ id: d.id, name: d.name, logo: d.logo || '', locked: d.locked }); }
  }, []);

  const refreshAll = useCallback(async () => {
    try { const cats = await loadCategories(); await Promise.all([loadUsers(), loadMenu(cats), loadTransactions(), loadSettings()]); setDbConnected(true); } catch { setDbConnected(false); }
  }, [loadUsers, loadCategories, loadMenu, loadTransactions, loadSettings]);

  useEffect(() => {
    (async () => {
      try { const saved = localStorage.getItem(SESSION_KEY); if (saved) setSession(JSON.parse(saved)); } catch { /* */ }
      try { const cats = await loadCategories(); await Promise.all([loadUsers(), loadMenu(cats), loadTransactions(), loadSettings()]); setDbConnected(true); } catch { setDbConnected(false); }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const channel = supabase.channel('db-sync')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'menu_items' }, () => loadCategories().then(c => loadMenu(c)))
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'categories' }, () => loadCategories().then(c => loadMenu(c)))
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'store_settings' }, async () => {
        const { data } = await from('store_settings').select('*').limit(1).single();
        if (data) {
          const d = data as any;
          const newSettings = { id: d.id, name: d.name, logo: d.logo || '', locked: d.locked };
          setSettings(newSettings);
          // Force-logout cashiers when store becomes locked
          setSession(prev => {
            if (prev && prev.role === 'cashier' && d.locked) {
              localStorage.removeItem(SESSION_KEY);
              return null;
            }
            return prev;
          });
        }
      })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'transactions' }, () => loadTransactions())
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'app_users' }, async () => {
        await loadUsers();
        // Check if current session user was deleted
        setSession(prev => {
          if (!prev) return null;
          // We need to verify user still exists via RPC
          (supabase as any).rpc('list_users_safe').then(({ data }: any) => {
            if (data) {
              const stillExists = (data as any[]).some((u: any) => u.username === prev.username && u.active);
              if (!stillExists) {
                localStorage.removeItem(SESSION_KEY);
                setSession(null);
              }
            }
          });
          return prev;
        });
      })
      .subscribe((status: string) => { setDbConnected(status === 'SUBSCRIBED'); });
    return () => { supabase.removeChannel(channel); };
  }, []);

  const login = async (username: string, password: string) => {
    const { data, error } = await (supabase as any).rpc('verify_login', { p_username: username, p_password: password });
    if (error) return { success: false, error: 'Login failed' };
    const result = data as any;
    if (!result.success) return { success: false, error: result.error };
    const u = result.user;
    if (settings.locked && u.role === 'cashier') return { success: false, error: 'Store is currently locked. Please contact an admin.' };
    const sess: AppSession = { username: u.username, role: u.role };
    setSession(sess); localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    return { success: true };
  };
  const logout = () => { setSession(null); localStorage.removeItem(SESSION_KEY); };

  const addUser = async (u: Omit<User, 'id'>) => { await (supabase as any).rpc('add_user', { p_username: u.username, p_password: u.password, p_role: u.role, p_active: u.active }); await loadUsers(); };
  const updateUser = async (id: string, upd: Partial<User>) => { await (supabase as any).rpc('update_user_safe', { p_id: id, p_username: upd.username || null, p_password: upd.password || null, p_role: upd.role || null, p_active: upd.active ?? null }); await loadUsers(); };
  const removeUser = async (id: string) => { await (supabase as any).rpc('delete_user_safe', { p_id: id }); await loadUsers(); };

  const addMenuItemFn = async (item: Partial<MenuItem> & { name: string }) => {
    await from('menu_items').insert({ code: item.code || `item-${Date.now()}`, name: item.name, category_id: item.categoryId || null, prices: item.prices || {}, archived: item.archived || false, image: item.image || '', out_of_stock: item.outOfStock || false, tags: item.tags || [] });
    const cats = await loadCategories(); await loadMenu(cats);
  };
  const updateMenuItemFn = async (id: string, upd: Partial<MenuItem>) => {
    const d: any = {};
    if (upd.name !== undefined) d.name = upd.name; if (upd.categoryId !== undefined) d.category_id = upd.categoryId; if (upd.prices !== undefined) d.prices = upd.prices; if (upd.archived !== undefined) d.archived = upd.archived; if ('image' in upd) d.image = upd.image || ''; if (upd.outOfStock !== undefined) d.out_of_stock = upd.outOfStock; if (upd.tags !== undefined) d.tags = upd.tags;
    await from('menu_items').update(d).eq('id', id); const cats = await loadCategories(); await loadMenu(cats);
  };
  const deleteMenuItemFn = async (id: string) => { await from('menu_items').delete().eq('id', id); const cats = await loadCategories(); await loadMenu(cats); };

  const addCategoryFn = async (name: string): Promise<Category> => { const maxOrd = Math.max(0, ...categories.map(c => c.sortOrder)); const { data } = await from('categories').insert({ name, sort_order: maxOrd + 1 }).select().single(); const cats = await loadCategories(); await loadMenu(cats); const newCat = cats.find((c: Category) => c.id === (data as any)?.id) || cats.find((c: Category) => c.name === name); return newCat || { id: (data as any)?.id || '', name, sortOrder: maxOrd + 1 }; };
  const removeCategoryFn = async (id: string) => { await from('categories').delete().eq('id', id); const cats = await loadCategories(); await loadMenu(cats); };
  const renameCategoryFn = async (id: string, newName: string) => { await from('categories').update({ name: newName }).eq('id', id); const cats = await loadCategories(); await loadMenu(cats); };

  const saveTransactionFn = async (items: OrderItem[], subtotal: number, adjustment: number, adjustmentInput: string, total: number, cashReceived: number, change: number, customerName?: string, specialInstructions?: string): Promise<Transaction> => {
    const txCode = generateTransactionId();
    const { data: txRow, error } = await from('transactions').insert({ transaction_code: txCode, subtotal, adjustment, adjustment_input: adjustmentInput, total, cash_received: cashReceived, change, cashier: session?.username || 'unknown', status: 'paid', customer_name: customerName || '', special_instructions: specialInstructions || '' }).select().single();
    if (error || !txRow) throw error || new Error('Failed');
    const row = txRow as any;
    await from('order_items').insert(items.map(i => ({ transaction_id: row.id, menu_item_code: i.menuItemId, name: i.name, size: i.size, price: i.price, quantity: i.quantity, customizations: i.customizations || [] })));
    const tx: Transaction = { id: row.id, code: txCode, items, subtotal, adjustment, adjustmentInput, total, cashReceived, change, cashier: session?.username || 'unknown', timestamp: row.created_at, status: 'paid', customerName, specialInstructions };
    setTransactions(prev => [tx, ...prev]); return tx;
  };

  const updateTransactionFn = async (id: string, upd: Partial<Transaction>) => {
    const d: any = {};
    if ('status' in upd) d.status = upd.status === 'voided' ? 'paid' : upd.status;
    if ('refundedAt' in upd) d.refunded_at = upd.refundedAt || null;
    if ('refundedBy' in upd) d.refunded_by = upd.refundedBy || null;
    if ('voided' in upd) d.voided = upd.voided;
    if ('voidedAt' in upd) d.voided_at = upd.voidedAt || null;
    if ('voidedBy' in upd) d.voided_by = upd.voidedBy || null;
    await from('transactions').update(d).eq('id', id); await loadTransactions();
  };

  const saveSettingsFn = async (upd: Partial<StoreSettings>) => {
    const d: any = { updated_at: new Date().toISOString() };
    if (upd.name !== undefined) d.name = upd.name; if (upd.logo !== undefined) d.logo = upd.logo; if (upd.locked !== undefined) d.locked = upd.locked;
    await from('store_settings').update(d).eq('id', settings.id); await loadSettings();
  };

  const exportBackup = () => JSON.stringify({ users, menu, categories, transactions, settings, exportDate: new Date().toISOString() });
  const importBackup = async (json: string): Promise<boolean> => { try { JSON.parse(json); await refreshAll(); return true; } catch { return false; } };

  return (
    <DataContext.Provider value={{ dbConnected, loading, session, login, logout, users, menu, categories, transactions, settings, addUser, updateUser, removeUser, addMenuItem: addMenuItemFn, updateMenuItem: updateMenuItemFn, deleteMenuItem: deleteMenuItemFn, addCategory: addCategoryFn, removeCategory: removeCategoryFn, renameCategory: renameCategoryFn, saveTransaction: saveTransactionFn, updateTransaction: updateTransactionFn, saveSettings: saveSettingsFn, exportBackup, importBackup, refreshAll }}>
      {children}
    </DataContext.Provider>
  );
}
