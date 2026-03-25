import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import type { MenuItem } from '@/lib/data';
import { Coffee, Search, ArrowUpDown } from 'lucide-react';

interface MenuPanelProps {
  onAddItem: (item: MenuItem, size: string, price: number) => void;
  showImages?: boolean;
}

type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';

const MenuPanel = ({ onAddItem, showImages = true }: MenuPanelProps) => {
  const { menu, categories } = useData();
  const items = menu.filter(i => !i.archived);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sizeModal, setSizeModal] = useState<MenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [showSort, setShowSort] = useState(false);

  const applySearch = (items: MenuItem[]) => {
    if (!searchQuery.trim()) return items;
    const terms = searchQuery.trim().toLowerCase().split(/\s+/);
    const include = terms.filter(t => !t.startsWith('-'));
    const exclude = terms.filter(t => t.startsWith('-')).map(t => t.slice(1)).filter(Boolean);
    return items.filter(item => {
      const searchable = [item.name.toLowerCase(), item.category.toLowerCase(), ...(item.tags || []).map(t => t.toLowerCase())];
      return (include.length === 0 || include.every(term => searchable.some(s => s.includes(term)))) && exclude.every(term => !searchable.some(s => s.includes(term)));
    });
  };

  const applySort = (items: MenuItem[]) => [...items].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'price-asc': return Math.min(...Object.values(a.prices)) - Math.min(...Object.values(b.prices));
      case 'price-desc': return Math.min(...Object.values(b.prices)) - Math.min(...Object.values(a.prices));
      default: return 0;
    }
  });

  let filtered = activeCategory === 'All' ? items : items.filter(i => i.category === activeCategory);
  filtered = applySearch(filtered);
  filtered = applySort(filtered);

  const handleItemClick = (item: MenuItem) => {
    if (item.outOfStock) return;
    const sizes = Object.keys(item.prices);
    if (sizes.length === 1) onAddItem(item, sizes[0], item.prices[sizes[0]]);
    else setSizeModal(item);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 px-3 pt-3 flex-shrink-0">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search items or tags... (use -tag to exclude)" className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-xs" />
        </div>
        <div className="relative">
          <button onClick={() => setShowSort(!showSort)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-input bg-background text-muted-foreground hover:text-foreground text-xs"><ArrowUpDown size={14} /> Sort</button>
          {showSort && (
            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-10 w-36">
              {([['name-asc', 'Name A-Z'], ['name-desc', 'Name Z-A'], ['price-asc', 'Price Low-High'], ['price-desc', 'Price High-Low']] as [SortOption, string][]).map(([val, label]) => (
                <button key={val} onClick={() => { setSortBy(val); setShowSort(false); }} className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-muted ${sortBy === val ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>{label}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1.5 p-3 flex-wrap flex-shrink-0 border-b border-border">
        <button onClick={() => setActiveCategory('All')} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeCategory === 'All' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-secondary'}`}>All</button>
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.name)} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeCategory === cat.name ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-secondary'}`}>{cat.name}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {filtered.map(item => {
            const sizes = Object.keys(item.prices);
            const minPrice = Math.min(...Object.values(item.prices));
            const isOOS = item.outOfStock;
            return (
              <button key={item.id} onClick={() => handleItemClick(item)} disabled={isOOS}
                className={`rounded-xl text-left transition-all border border-border relative group flex overflow-hidden ${isOOS ? 'opacity-40 cursor-not-allowed bg-muted text-muted-foreground' : 'hover:shadow-md hover:scale-[1.01] active:scale-[0.99] bg-card text-card-foreground'}`}>
                {showImages && (
                  <div className="w-20 h-20 flex-shrink-0">
                    {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted flex items-center justify-center"><Coffee size={20} className="text-muted-foreground opacity-40" /></div>}
                  </div>
                )}
                <div className="flex-1 p-2 flex flex-col justify-center min-w-0">
                  <p className="font-semibold text-xs leading-tight truncate">{item.name}</p>
                  <p className="text-[11px] mt-0.5 text-muted-foreground">{sizes.length > 1 ? `from ₱${minPrice}` : `₱${minPrice}`}</p>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-1">{item.tags.slice(0, 2).map(tag => <span key={tag} className="text-[9px] px-1 py-0 rounded bg-secondary text-secondary-foreground">{tag}</span>)}</div>
                  )}
                </div>
                {isOOS && <span className="absolute top-1 right-1 text-[9px] font-bold bg-destructive text-destructive-foreground px-1 py-0.5 rounded">OOS</span>}
              </button>
            );
          })}
        </div>
      </div>

      {sizeModal && (
        <div className="fixed inset-0 bg-foreground/40 flex items-center justify-center z-50" onClick={() => setSizeModal(null)}>
          <div className="bg-card rounded-2xl p-6 w-80 shadow-xl animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-foreground mb-1">{sizeModal.name}</h3>
            <p className="text-muted-foreground text-sm mb-4">Select size</p>
            <div className="space-y-2">
              {Object.entries(sizeModal.prices).map(([size, price]) => (
                <button key={size} onClick={() => { onAddItem(sizeModal, size, price as number); setSizeModal(null); }}
                  className="w-full flex justify-between items-center px-4 py-3 rounded-xl bg-secondary text-secondary-foreground hover:bg-accent transition-colors">
                  <span className="font-medium text-sm">{size}</span><span className="font-bold text-sm">₱{price as number}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setSizeModal(null)} className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export { MenuPanel };
export default MenuPanel;
