import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Download, Upload, AlertTriangle } from 'lucide-react';

const DataBackup = () => {
  const { exportBackup, importBackup } = useData();
  const [importStatus, setImportStatus] = useState<string>('');

  const handleExport = () => {
    const data = exportBackup();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `jos-coffee-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result as string;
      if (await importBackup(result)) setImportStatus('Data refreshed successfully from database!');
      else setImportStatus('Import failed. Invalid backup file.');
    };
    reader.readAsText(file); e.target.value = '';
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">Data Backup & Restore</h2>
      <p className="text-muted-foreground text-sm mb-6">Export or import all system data</p>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <Download size={32} className="text-primary mb-3" /><h3 className="font-display text-lg font-bold text-foreground mb-1">Export Backup</h3>
          <p className="text-muted-foreground text-sm mb-4">Download a complete backup of all data.</p>
          <button onClick={handleExport} className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90">Download Backup</button>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <Upload size={32} className="text-primary mb-3" /><h3 className="font-display text-lg font-bold text-foreground mb-1">Import Data</h3>
          <p className="text-muted-foreground text-sm mb-2">Restore data from a previously exported backup file.</p>
          <div className="flex items-center gap-2 text-xs text-destructive mb-4"><AlertTriangle size={14} /><span>This will overwrite existing data</span></div>
          <label className="inline-block px-6 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm cursor-pointer hover:opacity-90">Select File<input type="file" accept=".json" onChange={handleImport} className="hidden" /></label>
        </div>
      </div>
      {importStatus && <div className={`mt-4 p-3 rounded-xl text-sm font-medium ${importStatus.includes('success') ? 'bg-accent text-accent-foreground' : 'bg-destructive/10 text-destructive'}`}>{importStatus}</div>}
    </div>
  );
};

export default DataBackup;
