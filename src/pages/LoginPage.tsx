import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useHR } from '@/context/HRContext';
import { Eye, EyeOff } from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const { login, signUp, isLoggedIn } = useHR();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (isLoggedIn) return <Navigate to="/dashboard" replace />;

  const usernameToEmail = (u: string) => {
    const clean = u.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    return `${clean}@nishanth.local`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = username.trim();
    if (!clean) {
      toast({ title: 'Username required', variant: 'destructive' });
      return;
    }
    const email = usernameToEmail(clean);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const r = await signUp(email, password);
        if (!r.ok) {
          toast({ title: 'Sign up failed', description: r.error, variant: 'destructive' });
          return;
        }
        toast({ title: 'Account created', description: 'Signing you in...' });
      }
      const r = await login(email, password);
      if (!r.ok) {
        toast({ title: 'Login Failed', description: r.error, variant: 'destructive' });
        return;
      }
      navigate('/dashboard');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4"
      style={{ background: 'linear-gradient(135deg, hsl(215,70%,95%), hsl(210,20%,98%), hsl(174,60%,95%))' }}>
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-white shadow-md overflow-hidden">
            <img src={logo} alt="Nishanth Engineering Works" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Nishanth Engineering Works</h1>
          <p className="text-sm text-muted-foreground mt-1">HR Management System</p>
        </div>

        <div className="bg-card rounded-xl p-8 card-shadow border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-6">
            {mode === 'signin' ? 'Sign in to your account' : 'Create an account'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Username</label>
              <Input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11 font-semibold" disabled={busy}>
              {busy ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-6">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" className="text-primary font-medium hover:underline"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
