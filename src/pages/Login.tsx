import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import DbStatus from '@/components/DbStatus';
import logo from '@/assets/logo.png';

const Login = () => {
  const { login, dbConnected, settings } = useData();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await login(username, password);
    if (!result.success) setError(result.error || 'Login failed');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[50%] max-w-[500px] pointer-events-none z-0 opacity-90">
        <img src={logo} alt="" className="w-full h-auto" />
      </div>
      <div className="w-full max-w-sm animate-fade-in relative z-10">
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
          <div className="flex flex-col items-center mb-6">
            <img src={logo} alt={settings.name} className="w-28 h-28 object-contain mb-3" />
            <h1 className="font-display text-2xl font-bold text-foreground">{settings.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">Point of Sale System</p>
            <div className="mt-2"><DbStatus connected={dbConnected} /></div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                placeholder="Enter username" autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                placeholder="Enter password" />
            </div>
            {error && <p className="text-destructive text-sm text-center">{error}</p>}
            <button type="submit"
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
