import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ScheduleProvider } from './store/scheduleStore';
import AppLayout from './components/layout/AppLayout';
import ShiftConfig from './pages/settings/ShiftConfig';
import UnitRules from './pages/settings/UnitRules';
import PreLeave from './pages/nurse/PreLeave';
import MySchedule from './pages/nurse/MySchedule';
import ConflictResolution from './pages/schedule/ConflictResolution';
import Workbench from './pages/schedule/Workbench';
import Dashboard from './pages/dashboard/Dashboard';

function App() {
  return (
    <AuthProvider>
      <ScheduleProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="nurse/preleave" element={<PreLeave />} />
              <Route path="nurse/schedule" element={<MySchedule />} />
              <Route path="schedule/conflicts" element={<ConflictResolution />} />
              <Route path="schedule/workbench" element={<Workbench />} />
              <Route path="settings/shifts" element={<ShiftConfig />} />
              <Route path="settings/rules" element={<UnitRules />} />
            </Route>
          </Routes>
        </HashRouter>
      </ScheduleProvider>
    </AuthProvider>
  );
}

export default App;

