import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { staffApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import styles from './SetPassword.module.css';

const SetPassword: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser, refreshUser } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const validatePassword = () => {
        if (password.length < 8) {
            setError('密碼至少需要 8 個字元');
            return false;
        }
        if (password !== confirmPassword) {
            setError('兩次輸入的密碼不一致');
            return false;
        }
        setError('');
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validatePassword() || !currentUser) return;

        setSubmitting(true);
        const res = await staffApi.setPassword(currentUser.id, password);

        if (res.success) {
            await refreshUser();
            navigate('/dashboard');
        } else {
            setError('設定失敗，請稍後再試');
        }
        setSubmitting(false);
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <div className={styles.icon}>
                        <Lock size={32} />
                    </div>
                    <h1>設定您的密碼</h1>
                    <p>首次登入請設定您的專屬密碼</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label>新密碼</label>
                        <div className={styles.passwordInput}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="請輸入至少 8 個字元"
                                autoComplete="new-password"
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

                    <div className={styles.inputGroup}>
                        <label>確認密碼</label>
                        <div className={styles.passwordInput}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="請再次輸入密碼"
                                autoComplete="new-password"
                            />
                            {confirmPassword && password === confirmPassword && (
                                <CheckCircle size={18} className={styles.checkIcon} />
                            )}
                        </div>
                    </div>

                    {error && <p className={styles.error}>{error}</p>}

                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={submitting || !password || !confirmPassword}
                    >
                        {submitting ? '設定中...' : '確認設定'}
                    </button>
                </form>

                <div className={styles.hints}>
                    <p>密碼安全提示：</p>
                    <ul>
                        <li>至少 8 個字元</li>
                        <li>建議包含數字與字母</li>
                        <li>請勿使用常見密碼</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default SetPassword;
