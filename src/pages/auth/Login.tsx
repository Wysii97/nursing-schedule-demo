import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { staffApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import styles from './Login.module.css';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { setCurrentUser } = useAuth();
    const [staffId, setStaffId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!staffId || !password) {
            setError('請輸入員工編號與密碼');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // First, get staff by ID
            const staffRes = await staffApi.getById(staffId);
            if (!staffRes.success || !staffRes.data) {
                setError('員工編號不存在');
                setLoading(false);
                return;
            }

            const staff = staffRes.data;

            // Check if password needs to be set
            if (!staff.passwordHash) {
                // Redirect to set password page
                setCurrentUser(staff);
                navigate('/auth/set-password');
                return;
            }

            // Verify password
            const verifyRes = await staffApi.verifyPassword(staffId, password);
            if (!verifyRes.success || !verifyRes.data) {
                setError('密碼錯誤');
                setLoading(false);
                return;
            }

            // Check if must change password
            if (staff.mustChangePassword) {
                setCurrentUser(staff);
                navigate('/auth/set-password');
                return;
            }

            // Login success
            setCurrentUser(staff);
            navigate('/dashboard');
        } catch {
            setError('登入失敗，請稍後再試');
        }
        setLoading(false);
    };

    return (
        <div className={styles.container}>
            <div className={styles.loginCard}>
                <div className={styles.header}>
                    <div className={styles.logo}>
                        <span className={styles.logoIcon}>🏥</span>
                        <h1>護理排班系統</h1>
                    </div>
                    <p>請輸入您的員工編號與密碼</p>
                </div>

                <form onSubmit={handleLogin} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label>員工編號</label>
                        <div className={styles.inputWrapper}>
                            <User size={18} className={styles.inputIcon} />
                            <input
                                type="text"
                                value={staffId}
                                onChange={(e) => setStaffId(e.target.value)}
                                placeholder="例如：N-1001"
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label>密碼</label>
                        <div className={styles.inputWrapper}>
                            <Lock size={18} className={styles.inputIcon} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="請輸入密碼"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className={styles.eyeBtn}
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className={styles.errorMsg}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className={styles.loginBtn}
                        disabled={loading}
                    >
                        {loading ? '登入中...' : '登入'}
                    </button>
                </form>

                <div className={styles.footer}>
                    <p>首次登入？請使用管理員提供的員工編號</p>
                    <p className={styles.hint}>系統將引導您設定專屬密碼</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
