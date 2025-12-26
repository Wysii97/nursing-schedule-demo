import React, { useState, useEffect } from 'react';
import { Calendar, Shuffle, Star, Clock, Save, RotateCcw } from 'lucide-react';
import { ruleApi } from '../../api/client';
import type { UnitRule } from '../../types';
import styles from './UnitRules.module.css';

const UnitRules: React.FC = () => {
    const [rule, setRule] = useState<UnitRule>({
        maxLeavePerMonth: 4,
        maxLeavePerDay: 2,
        conflictStrategy: 'Score'
    });
    const [originalRule, setOriginalRule] = useState<UnitRule | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string>('');

    useEffect(() => {
        loadRules();
    }, []);

    const loadRules = async () => {
        setLoading(true);
        const res = await ruleApi.get();
        if (res.success) {
            setRule(res.data);
            setOriginalRule(res.data);
        }
        setLoading(false);
    };

    const handleStrategyChange = (strategy: 'Score' | 'Random') => {
        setRule(prev => ({ ...prev, conflictStrategy: strategy }));
    };

    const handleReset = () => {
        if (originalRule) {
            setRule(originalRule);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        const res = await ruleApi.update(rule);
        if (res.success) {
            setOriginalRule(rule);
            setLastUpdated(new Date().toLocaleString('zh-TW'));
            alert('設定已儲存');
        }
        setSaving(false);
    };

    if (loading) {
        return <div>載入中...</div>;
    }

    return (
        <div>
            {/* Page Header */}
            <div className={styles.pageHeader}>
                <div className={styles.breadcrumb}>系統設定 &gt; 單位管理</div>
                <div className={styles.headerRow}>
                    <div>
                        <h1 className={styles.pageTitle}>單位規則設定</h1>
                        <p className={styles.pageDescription}>
                            設定單位內護理人員的預假額度限制以及排班衝突時的優先順序規則，
                            這些設定將直接影響下個月的排班自動化運算。
                        </p>
                    </div>
                    <div className={styles.lastUpdate}>
                        <Clock size={14} />
                        設定最後更新: {lastUpdated || '尚未儲存'}
                    </div>
                </div>
            </div>

            {/* Pre-leave Quota Section */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionIcon}>
                        <Calendar size={20} />
                    </div>
                    <div>
                        <h2 className={styles.sectionTitle}>預假額度設定</h2>
                        <p className={styles.sectionDescription}>控制每位人員及每日的預假數量上限</p>
                    </div>
                </div>

                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>每人每月預假上限 (天)</label>
                        <div className={styles.inputWrapper}>
                            <input
                                type="number"
                                className={styles.formInput}
                                value={rule.maxLeavePerMonth}
                                onChange={(e) => setRule(prev => ({ ...prev, maxLeavePerMonth: parseInt(e.target.value) || 0 }))}
                            />
                            <span className={styles.inputSuffix}>天/月</span>
                        </div>
                        <span className={styles.formHint}>建議設定 3-5 天，避免影響正常排班人力。</span>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>每日預假人數上限 (人)</label>
                        <div className={styles.inputWrapper}>
                            <input
                                type="number"
                                className={styles.formInput}
                                value={rule.maxLeavePerDay}
                                onChange={(e) => setRule(prev => ({ ...prev, maxLeavePerDay: parseInt(e.target.value) || 0 }))}
                            />
                            <span className={styles.inputSuffix}>人/日</span>
                        </div>
                        <span className={styles.formHint}>超過此人數將觸發衝突判定或需要人工審核。</span>
                    </div>
                </div>
            </div>

            {/* Conflict Strategy Section */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionIcon}>
                        <Shuffle size={20} />
                    </div>
                    <div>
                        <h2 className={styles.sectionTitle}>衝突判定規則</h2>
                        <p className={styles.sectionDescription}>當同一日預假申請人數超過上限時的自動篩選機制</p>
                    </div>
                </div>

                <div className={styles.strategyGrid}>
                    <div
                        className={`${styles.strategyCard} ${rule.conflictStrategy === 'Score' ? styles.active : ''}`}
                        onClick={() => handleStrategyChange('Score')}
                    >
                        <div className={styles.strategyIcon}>
                            <Star size={18} />
                        </div>
                        <h3 className={styles.strategyTitle}>積分優先</h3>
                        <p className={styles.strategyDescription}>
                            系統將依據積分高低自動排序。積分計算包含：年資、上月工時、以及過往預假被駁回次數。
                        </p>
                    </div>

                    <div
                        className={`${styles.strategyCard} ${rule.conflictStrategy === 'Random' ? styles.active : ''}`}
                        onClick={() => handleStrategyChange('Random')}
                    >
                        <div className={styles.strategyIcon}>
                            <Shuffle size={18} />
                        </div>
                        <h3 className={styles.strategyTitle}>隨機抽籤</h3>
                        <p className={styles.strategyDescription}>
                            當申請人數超額時，系統將完全隨機抽選核准名單，確保每位人員機會均等。
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className={styles.footerActions}>
                <button className={styles.cancelButton} onClick={handleReset}>
                    <RotateCcw size={14} />
                    取消重置
                </button>
                <button className={styles.saveButton} onClick={handleSave} disabled={saving}>
                    <Save size={16} />
                    {saving ? '儲存中...' : '儲存設定'}
                </button>
            </div>
        </div>
    );
};

export default UnitRules;
