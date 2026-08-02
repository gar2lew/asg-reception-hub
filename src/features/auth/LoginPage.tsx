import { useState, useCallback } from 'react';
import { LogIn, Shield } from 'lucide-react';
import { login } from '../../services/authService';
import { Input } from '../../components/Input/Input';
import { Button } from '../../components/Button/Button';
import styles from './LoginPage.module.css';
interface LoginPageProps { onLogin: () => void; }
export function LoginPage({ onLogin }: LoginPageProps) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !pin.trim()) { setError('Please enter your name and PIN.'); return; }
    setLoading(true);
    try {
      const result = await login(name.trim(), pin.trim());
      if (result.success) { onLogin(); return; }
      setError(result.error || 'Login failed.');
    } catch {
      setError('Login failed.');
    } finally {
      setLoading(false);
    }
  }, [name, pin, onLogin]);
  const staffNames = ['Administrator', 'Brisbane Reception', 'Perth Reception'];
  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <div className={styles.leftContent}>
          <div className={styles.logoArea}>
            <div className={styles.logoMark}>ASG</div>
            <p className={styles.companyName}>AMPLIFY SOLUTIONS GROUP</p>
          </div>
          <h1 className={styles.brandTitle}>Brisbane Reception</h1>
          <p className={styles.subtitle}>Day-to-Day</p>
          <p className={styles.phrase}>Organised. Supported. Confident.</p>
          <p className={styles.description}>
            Your central hub for daily reception operations, training, and team resources.
          </p>
          <div className={styles.features}>
            <div className={styles.featureItem}><span className={styles.featureDot} />Guided</div>
            <div className={styles.featureItem}><span className={styles.featureDot} />Organised</div>
            <div className={styles.featureItem}><span className={styles.featureDot} />Supported</div>
          </div>
        </div>
      </div>
      <div className={styles.rightPanel}>
        <div className={styles.rightContent}>
          <div className={styles.welcomeBlock}>
            <h2 className={styles.welcomeTitle}>Welcome</h2>
            <p className={styles.welcomeSub}>Start Your Day</p>
          </div>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="staff-name" className={styles.fieldLabel}>Staff Name</label>
              <select id="staff-name" className={styles.nameSelect} value={name} onChange={e => setName(e.target.value)}>
                <option value="">Select your name</option>
                {staffNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <Input
              id="staff-pin"
              label="PIN"
              type="password"
              placeholder="Enter your PIN"
              value={pin}
              onChange={e => setPin(e.target.value)}
              maxLength={6}
              autoComplete="off"
              error={error || undefined}
            />
            <Button type="submit" size="lg" disabled={loading} className={styles.signInBtn}>
              <LogIn size={18} />
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <p className={styles.secureNote}>
            <Shield size={12} />
            Secure PIN access. Your session is encrypted in local storage.
          </p>
          <p className={styles.adminHint}>
            Need admin access? Sign in with an admin account.
          </p>
        </div>
      </div>
    </div>
  );
}
