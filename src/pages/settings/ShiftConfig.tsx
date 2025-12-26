import React, { useEffect, useState } from 'react';
import { List, Clock, Star, Calendar, Plus, Search, Download, Pencil, Trash2, Sun, Moon, Sunrise } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import ShiftModal from '../../components/ui/ShiftModal';
import { shiftApi } from '../../api/client';
import type { Shift } from '../../types';
import styles from './ShiftConfig.module.css';

const ShiftConfig: React.FC = () => {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState<Shift | null>(null);

    useEffect(() => {
        loadShifts();
    }, []);

    const loadShifts = async () => {
        setLoading(true);
        const res = await shiftApi.getAll();
        if (res.success) {
            setShifts(res.data);
        }
        setLoading(false);
    };

    const handleAddClick = () => {
        setEditingShift(null);
        setModalOpen(true);
    };

    const handleEditClick = (shift: Shift) => {
        setEditingShift(shift);
        setModalOpen(true);
    };

    const handleDeleteClick = async (id: string) => {
        if (window.confirm('確定要刪除這個班別嗎？')) {
            const res = await shiftApi.delete(id);
            if (res.success) {
                await loadShifts();
            }
        }
    };

    const handleModalSubmit = async (shiftData: Omit<Shift, 'id'>) => {
        if (editingShift) {
            await shiftApi.update(editingShift.id, shiftData);
        } else {
            await shiftApi.add(shiftData);
        }
        await loadShifts();
    };

    const filteredShifts = shifts.filter(s => {
        const matchesSearch = s.name.includes(searchTerm) || s.code.includes(searchTerm);
        const matchesType = typeFilter === 'all' || s.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const stats = {
        total: shifts.length,
        standard: shifts.filter(s => s.type === 'Standard').length,
        special: shifts.filter(s => s.type === 'Special').length,
        off: shifts.filter(s => s.type === 'Off').length,
    };

    const getTimeIcon = (code: string) => {
        if (code === 'D' || code === '8-8') return <Sun size={14} />;
        if (code === 'E') return <Sunrise size={14} />;
        if (code === 'N') return <Moon size={14} />;
        return <Calendar size={14} />;
    };

    return (
        <div>
            {/* Page Header */}
            <div className={styles.pageHeader}>
                <div className={styles.breadcrumb}>系統設定 &gt; 班別管理</div>
                <div className={styles.headerActions}>
                    <div>
                        <h1 className={styles.pageTitle}>班別參數設定</h1>
                        <p className={styles.pageDescription}>定義系統中使用的所有班別代碼、時間區段及代表顏色。</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className={styles.lastUpdate}>最後更新: 剛剛</span>
                        <button className={styles.addButton} onClick={handleAddClick}>
                            <Plus size={16} />
                            新增班別
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <StatCard title="班別總數" value={stats.total} icon={List} color="blue" />
                <StatCard title="標準班別" value={stats.standard} icon={Clock} color="blue" />
                <StatCard title="特殊班別" value={stats.special} icon={Star} color="yellow" />
                <StatCard title="休假類別" value={stats.off} icon={Calendar} color="red" />
            </div>

            {/* Data Table */}
            <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div className={styles.searchInput}>
                            <Search size={16} color="var(--text-secondary)" />
                            <input
                                type="text"
                                placeholder="搜尋班別代碼或名稱..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className={styles.filterSelect}
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="all">所有類型</option>
                            <option value="Standard">標準班別</option>
                            <option value="Special">特殊班別</option>
                            <option value="Off">休假類別</option>
                        </select>
                    </div>
                    <button className={styles.exportButton}>
                        <Download size={16} />
                        匯出設定
                    </button>
                </div>

                <table className={styles.dataTable}>
                    <thead>
                        <tr>
                            <th>
                                <input type="checkbox" />
                            </th>
                            <th>代碼</th>
                            <th>班別名稱</th>
                            <th>時間區段</th>
                            <th>計薪時數</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>載入中...</td>
                            </tr>
                        ) : filteredShifts.map((shift) => (
                            <tr key={shift.id}>
                                <td>
                                    <input type="checkbox" />
                                </td>
                                <td>
                                    <div className={styles.shiftCode}>
                                        <span
                                            className={styles.shiftBadge}
                                            style={{ backgroundColor: shift.color }}
                                        >
                                            {shift.code}
                                        </span>
                                        {shift.code}
                                    </div>
                                </td>
                                <td>{shift.name}</td>
                                <td>
                                    <span className={styles.timeIcon}>
                                        {getTimeIcon(shift.code)}
                                        {shift.startTime} - {shift.endTime}
                                    </span>
                                </td>
                                <td>
                                    <strong>{shift.hours.toFixed(1)}</strong> 小時
                                </td>
                                <td>
                                    <div className={styles.actions}>
                                        <button className={styles.iconButton} onClick={() => handleEditClick(shift)}>
                                            <Pencil size={16} />
                                        </button>
                                        <button className={`${styles.iconButton} ${styles.danger}`} onClick={() => handleDeleteClick(shift.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className={styles.tableFooter}>
                    <span>顯示 1 到 {filteredShifts.length} 筆，共 {shifts.length} 筆</span>
                    <div className={styles.pagination}>
                        <button className={`${styles.pageButton} ${styles.active}`}>1</button>
                        <button className={styles.pageButton}>2</button>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <ShiftModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleModalSubmit}
                editShift={editingShift}
            />
        </div>
    );
};

export default ShiftConfig;
