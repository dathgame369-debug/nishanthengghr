import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useHR } from '@/context/HRContext';
import { Building2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const { login, isLoggedIn } = useHR();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (isLoggedIn) return <Navigate to="/dashboard" replace />;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      navigate('/dashboard');
    } else {
      toast({ title: 'Login Failed', description: 'Invalid credentials. Use admin / admin123', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4"
      style={{ background: 'linear-gradient(135deg, hsl(215,70%,95%), hsl(210,20%,98%), hsl(174,60%,95%))' }}>
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, hsl(215,70%,28%), hsl(215,70%,38%))' }}>
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Nishanth Engineering Works</h1>
          <p className="text-sm text-muted-foreground mt-1">HR Management System</p>
        </div>

        <div className="bg-card rounded-xl p-8 card-shadow border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-6">Sign in to your account</h2>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Username / Email</label>
              <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" required />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <Checkbox checked={remember} onCheckedChange={v => setRemember(!!v)} />
                Remember me
              </label>
              <button type="button" className="text-sm text-accent hover:underline">Forgot password?</button>
            </div>
            <Button type="submit" className="w-full h-11 font-semibold">Sign In</Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-6">Default: admin / admin123</p>
        </div>
      </div>
    </div>
  );
}
