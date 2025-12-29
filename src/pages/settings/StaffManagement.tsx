import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Save, X, Users, Key } from 'lucide-react';
import { staffApi, managerUnitsApi, unitsApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { Staff, StaffLevel, UserRole } from '../../types';
import { ROLE_LABELS } from '../../types';
import styles from './StaffManagement.module.css';

const LEVEL_OPTIONS: StaffLevel[] = ['N0', 'N1', 'N2', 'N3', 'N4', 'NP', 'AHN', 'HN'];
const ROLE_OPTIONS: UserRole[] = ['nurse', 'deputy', 'manager'];

const StaffManagement: React.FC = () => {
    const { currentUnit, availableUnits } = useAuth();
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState<{
        id: string;
        name: string;
        level: StaffLevel;
        departmentId: string;
        role: UserRole;
    }>({
        id: '',
        name: '',
        level: 'N1',
        departmentId: currentUnit?.id || 'U001',
        role: 'nurse'
    });
    const [isNew, setIsNew] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [managedUnits, setManagedUnits] = useState<string[]>([]);
    const [allUnits, setAllUnits] = useState<{ id: string; name: string }[]>([]);

    const loadStaff = useCallback(async () => {
        if (!currentUnit) return;
        setLoading(true);
        const res = await staffApi.getAll(currentUnit.id);
        if (res.success) {
            setStaffList(res.data);
        }
        setLoading(false);
    }, [currentUnit]);

    // Reload staff when unit changes
    useEffect(() => {
        loadStaff();
    }, [loadStaff]);

    // Load all units on mount for manager unit selection
    useEffect(() => {
        unitsApi.getAll().then(res => {
            if (res.success) {
                setAllUnits(res.data);
            }
        });
    }, []);

    const handleAdd = () => {
        setEditingStaff({
            id: `N-${Date.now().toString().slice(-4)}`,
            name: '',
            level: 'N1',
            departmentId: currentUnit?.id || 'U001',
            role: 'nurse'
        });
        setIsNew(true);
        setShowModal(true);
    };

    const handleEdit = async (staff: Staff) => {
        setEditingStaff({
            id: staff.id,
            name: staff.name,
            level: staff.level,
            departmentId: staff.departmentId,
            role: staff.role
        });
        // Load managed units if manager or deputy
        if (staff.role === 'manager' || staff.role === 'deputy') {
            const res = await managerUnitsApi.get(staff.id);
            if (res.success) {
                setManagedUnits(res.data);
            }
        } else {
            setManagedUnits([]);
        }
        setIsNew(false);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!editingStaff.name.trim()) {
            alert('請輸入姓名');
            return;
        }

        setSaving(true);
        try {
            if (isNew) {
                const res = await staffApi.create(editingStaff);
                if (res.success) {
                    alert('人員已新增！');
                    setShowModal(false);
                    loadStaff();
                } else {
                    alert('新增失敗：' + res.message);
                }
            } else {
                const res = await staffApi.update(editingStaff.id, editingStaff);
                if (res.success) {
                    alert('人員已更新！');
                    setShowModal(false);
                    loadStaff();
                } else {
                    alert('更新失敗：' + res.message);
                }
            }
        } catch (err) {
            alert('發生錯誤：' + (err instanceof Error ? err.message : String(err)));
        }
        // Save managed units if manager or deputy
        if (editingStaff.role === 'manager' || editingStaff.role === 'deputy') {
            await managerUnitsApi.update(editingStaff.id, managedUnits);
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        const res = await staffApi.delete(id);
        if (res.success) {
            alert('人員已刪除');
            setDeleteConfirm(null);
            loadStaff();
        } else {
            alert('刪除失敗：' + res.message);
        }
    };

    const handleResetPassword = async (id: string, name: string) => {
        if (!window.confirm(`確定要重設 ${name} 的密碼嗎？\n用戶下次登入需重新設定密碼。`)) return;
        const res = await staffApi.resetPassword(id);
        if (res.success) {
            alert('密碼已重設，用戶下次登入需設定新密碼');
        } else {
            alert('重設失敗：' + res.message);
        }
    };

    const getUnitName = (unitId: string) => {
        return availableUnits.find(u => u.id === unitId)?.name || unitId;
    };

    if (loading) {
        return <div className={styles.loading}>載入中...</div>;
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.breadcrumb}>系統設定 &gt; 人員管理</div>
                <div className={styles.headerRow}>
                    <div>
                        <h1 className={styles.pageTitle}>
                            <Users size={28} /> 單位人員維護
                        </h1>
                        <p className={styles.pageDescription}>
                            管理單位內護理人員基本資料，包含職級、角色與所屬單位設定。
                        </p>
                    </div>
                    <button className={styles.addBtn} onClick={handleAdd}>
                        <Plus size={18} /> 新增人員
                    </button>
                </div>
            </div>

            {/* Staff Table */}
            <div className={styles.tableCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>員工編號</th>
                            <th>姓名</th>
                            <th>所屬單位</th>
                            <th>職級</th>
                            <th>角色</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {staffList.map(staff => (
                            <tr key={staff.id}>
                                <td className={styles.idCell}>{staff.id}</td>
                                <td>{staff.name}</td>
                                <td>{getUnitName(staff.departmentId)}</td>
                                <td><span className={styles.levelBadge}>{staff.level}</span></td>
                                <td><span className={`${styles.roleBadge} ${styles[staff.role]}`}>{ROLE_LABELS[staff.role]}</span></td>
                                <td className={styles.actions}>
                                    <button className={styles.editBtn} onClick={() => handleEdit(staff)} title="編輯">
                                        <Edit2 size={16} />
                                    </button>
                                    <button className={styles.editBtn} onClick={() => handleResetPassword(staff.id, staff.name)} title="重設密碼">
                                        <Key size={16} />
                                    </button>
                                    <button className={styles.deleteBtn} onClick={() => setDeleteConfirm(staff.id)} title="刪除">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {staffList.length === 0 && (
                    <div className={styles.empty}>尚無人員資料</div>
                )}
            </div>

            {/* Edit Modal */}
            {showModal && (
                <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{isNew ? '新增人員' : '編輯人員'}</h2>
                            <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label>員工編號</label>
                                <input
                                    type="text"
                                    value={editingStaff.id}
                                    onChange={e => setEditingStaff({ ...editingStaff, id: e.target.value })}
                                    disabled={!isNew}
                                    placeholder="如：N-1001"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>姓名 *</label>
                                <input
                                    type="text"
                                    value={editingStaff.name}
                                    onChange={e => setEditingStaff({ ...editingStaff, name: e.target.value })}
                                    placeholder="請輸入姓名"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>所屬單位</label>
                                <select
                                    value={editingStaff.departmentId}
                                    onChange={e => setEditingStaff({ ...editingStaff, departmentId: e.target.value })}
                                >
                                    {availableUnits.map(unit => (
                                        <option key={unit.id} value={unit.id}>{unit.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>職級</label>
                                <select
                                    value={editingStaff.level}
                                    onChange={e => setEditingStaff({ ...editingStaff, level: e.target.value as StaffLevel })}
                                >
                                    {LEVEL_OPTIONS.map(level => (
                                        <option key={level} value={level}>{level}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>角色</label>
                                <select
                                    value={editingStaff.role}
                                    onChange={e => setEditingStaff({ ...editingStaff, role: e.target.value as UserRole })}
                                >
                                    {ROLE_OPTIONS.map(role => (
                                        <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                                    ))}
                                </select>
                            </div>
                            {/* Managed Units - only for manager/deputy */}
                            {(editingStaff.role === 'manager' || editingStaff.role === 'deputy') && (
                                <div className={styles.formGroup}>
                                    <label>可管理單位 (多選)</label>
                                    <div className={styles.checkboxGroup}>
                                        {allUnits.map(unit => (
                                            <label key={unit.id} className={styles.checkboxLabel}>
                                                <input
                                                    type="checkbox"
                                                    checked={managedUnits.includes(unit.id)}
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setManagedUnits([...managedUnits, unit.id]);
                                                        } else {
                                                            setManagedUnits(managedUnits.filter(id => id !== unit.id));
                                                        }
                                                    }}
                                                />
                                                {unit.name}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className={styles.modalFooter}>
                            <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>取消</button>
                            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                                <Save size={16} /> {saving ? '儲存中...' : '儲存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
                    <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
                        <h3>確認刪除</h3>
                        <p>確定要刪除此人員嗎？此操作無法復原。</p>
                        <div className={styles.confirmActions}>
                            <button className={styles.cancelBtn} onClick={() => setDeleteConfirm(null)}>取消</button>
                            <button className={styles.dangerBtn} onClick={() => handleDelete(deleteConfirm)}>確認刪除</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffManagement;
