import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Shift, ShiftType } from '../../types';
import styles from './Modal.module.css';

interface ShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (shift: Omit<Shift, 'id'>) => void;
    editShift?: Shift | null;
}

const SHIFT_TYPES: { value: ShiftType; label: string }[] = [
    { value: 'Standard', label: '標準班別' },
    { value: 'Special', label: '特殊班別' },
    { value: 'Off', label: '休假類別' },
];

const DEFAULT_COLORS = [
    '#3B82F6', '#F59E0B', '#6366F1', '#F43F5E', '#14B8A6', '#8B5CF6', '#EC4899', '#10B981'
];

const ShiftModal: React.FC<ShiftModalProps> = ({ isOpen, onClose, onSubmit, editShift }) => {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        type: 'Standard' as ShiftType,
        startTime: '08:00',
        endTime: '16:00',
        hours: 8,
        color: '#3B82F6'
    });

    useEffect(() => {
        if (editShift) {
            setFormData({
                code: editShift.code,
                name: editShift.name,
                type: editShift.type,
                startTime: editShift.startTime,
                endTime: editShift.endTime,
                hours: editShift.hours,
                color: editShift.color
            });
        } else {
            setFormData({
                code: '',
                name: '',
                type: 'Standard',
                startTime: '08:00',
                endTime: '16:00',
                hours: 8,
                color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]
            });
        }
    }, [editShift, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{editShift ? '編輯班別' : '新增班別'}</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.body}>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>班別代碼</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={formData.code}
                                    onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                                    placeholder="例：D, E, N"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>班別名稱</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={formData.name}
                                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="例：白班"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>開始時間</label>
                                <input
                                    type="time"
                                    className={styles.input}
                                    value={formData.startTime}
                                    onChange={e => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>結束時間</label>
                                <input
                                    type="time"
                                    className={styles.input}
                                    value={formData.endTime}
                                    onChange={e => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>班別類型</label>
                                <select
                                    className={styles.select}
                                    value={formData.type}
                                    onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as ShiftType }))}
                                >
                                    {SHIFT_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>計薪時數</label>
                                <input
                                    type="number"
                                    className={styles.input}
                                    value={formData.hours}
                                    onChange={e => setFormData(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                                    step="0.5"
                                    min="0"
                                />
                            </div>

                            <div className={`${styles.formGroup} ${styles.full}`}>
                                <label className={styles.label}>代表顏色</label>
                                <div className={styles.colorInput}>
                                    <input
                                        type="color"
                                        className={styles.colorPicker}
                                        value={formData.color}
                                        onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                    />
                                    <input
                                        type="text"
                                        className={styles.colorPreview}
                                        value={formData.color}
                                        onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.footer}>
                        <button type="button" className={styles.cancelButton} onClick={onClose}>
                            取消
                        </button>
                        <button type="submit" className={styles.submitButton}>
                            {editShift ? '更新' : '新增'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ShiftModal;
