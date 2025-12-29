import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ScheduleProvider } from './store/scheduleStore';
import AppLayout from './components/layout/AppLayout';
import ShiftConfig from './pages/settings/ShiftConfig';
import UnitRules from './pages/settings/UnitRules';
import StaffManagement from './pages/settings/StaffManagement';
import PreLeave from './pages/nurse/PreLeave';
import MySchedule from './pages/nurse/MySchedule';
import ShiftSwap from './pages/nurse/ShiftSwap';
import Workbench from './pages/schedule/Workbench';
import LeaveApproval from './pages/schedule/LeaveApproval';
import Dashboard from './pages/dashboard/Dashboard';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ScheduleProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="nurse/preleave" element={<PreLeave />} />
                <Route path="nurse/schedule" element={<MySchedule />} />
                <Route path="nurse/swap" element={<ShiftSwap />} />
                <Route path="schedule/workbench" element={<Workbench />} />
                <Route path="schedule/leave-approval" element={<LeaveApproval />} />
                <Route path="settings/shifts" element={<ShiftConfig />} />
                <Route path="settings/rules" element={<UnitRules />} />
                <Route path="settings/staff" element={<StaffManagement />} />
              </Route>
            </Routes>
          </HashRouter>
        </ScheduleProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
