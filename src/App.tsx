import React, { useEffect, useState } from 'react';
import { api, CommandState } from './services/apiClient';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthView } from './components/auth/AuthView';
import { Header } from './components/navigation/Header';
import { Sidebar } from './components/navigation/Sidebar';
import { BottomNav } from './components/navigation/BottomNav';
import { MobileMenu } from './components/navigation/MobileMenu';
import { CommandCenter } from './components/home/CommandCenter';
import { NeedsHub } from './components/needs/NeedsHub';
import { NeedDetailModal } from './components/needs/NeedDetailModal';
import { RecordPurchaseModal } from './components/needs/RecordPurchaseModal';
import { CreateNeedModal } from './components/needs/CreateNeedModal';
import { ConfigureNeedModal } from './components/needs/ConfigureNeedModal';
import { HouseManagerModal } from './components/house/HouseManagerModal';
import { HouseCalendar } from './components/calendar/HouseCalendar';
import { FinanceHub } from './components/finance/FinanceHub';
import { MaintenanceHub } from './components/maintenance/MaintenanceHub';
import { ActivityHub } from './components/activity/ActivityHub';
import { SettingsHub } from './components/settings/SettingsHub';
import { ProfileHub } from './components/profile/ProfileHub';
import { Need, User } from './types';
import { Loader2, Home } from 'lucide-react';
import { UserQRISModal } from './components/finance/UserQRISModal';
import { EditProfileModal } from './components/profile/EditProfileModal';

function AppContent() {
  const { user: authUser, session, isAdmin: authIsAdmin, isSuperAdmin: authIsSuperAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active tab from URL path
  const currentPath = location.pathname.replace(/^\//, '') || 'dashboard';
  const activeTab = currentPath.split('/')[0] || 'dashboard';

  const handleNavigate = (tab: string) => {
    navigate('/' + tab);
  };

  const [state, setState] = useState<CommandState | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [currentHouseId, setCurrentHouseId] = useState<string>('house_harmoni');
  const [currentUserId, setCurrentUserId] = useState<string>(() => authUser?.id || 'user_ghozi');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [selectedNeedId, setSelectedNeedId] = useState<string | null>(null);
  const [selectedNeedToConfigure, setSelectedNeedToConfigure] = useState<Need | null>(null);
  const [isRecordPurchaseOpen, setIsRecordPurchaseOpen] = useState(false);
  const [recordPurchaseInitialNeed, setRecordPurchaseInitialNeed] = useState<Need | undefined>();
  const [isCreateNeedOpen, setIsCreateNeedOpen] = useState(false);
  const [isHouseManagerOpen, setIsHouseManagerOpen] = useState(false);
  const [isUserQRISModalOpen, setIsUserQRISModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [financeData, setFinanceData] = useState<any>({
    transactions: [],
    contributions: [],
    splitBills: [],
    settlements: [],
  });

  // Keep currentUserId in sync with authUser if logged in
  useEffect(() => {
    if (authUser?.id) {
      setCurrentUserId(authUser.id);
    }
  }, [authUser?.id]);

  // Load house state
  const loadHouseState = async (userIdToUse?: string, houseIdToUse?: string) => {
    try {
      setError(null);
      const uid = userIdToUse || currentUserId || authUser?.id || 'user_ghozi';
      const hid = houseIdToUse || currentHouseId || 'house_harmoni';
      const [cmdState, allUsers, calEvents] = await Promise.all([
        api.getCurrentState(hid, uid),
        api.getUsers().catch(() => []),
        api.getCalendarEvents(hid).catch(() => []),
      ]);
      // Check if logged in user still exists in the user registry
      if (authUser && allUsers && allUsers.length > 0) {
        const userStillExists = allUsers.some((u: User) => u.id === authUser.id);
        if (!userStillExists) {
          alert('Akun Anda telah dinonaktifkan atau dihapus oleh Admin.');
          await signOut();
          navigate('/login');
          return;
        }
      }

      setState(cmdState);
      setUsers(allUsers || []);
      setCalendarEvents(calEvents || []);
      if (cmdState.house?.id && currentHouseId !== cmdState.house.id) {
        setCurrentHouseId(cmdState.house.id);
      }

      // Load calendar & finance in parallel
      const [events, fin] = await Promise.all([
        api.getCalendarEvents(cmdState.house.id).catch(() => []),
        api.getFinanceOverview(cmdState.house.id).catch(() => ({
          wallet: cmdState.wallet,
          transactions: [],
          contributions: [],
          splitBills: [],
          settlements: [],
          netBalances: [],
          settlementPlan: [],
        })),
      ]);
      setCalendarEvents(events || []);
      setFinanceData(fin);
    } catch (err: any) {
      if (err?.userDeleted || err?.status === 401 || err?.message?.includes('dihapus') || err?.message?.includes('tidak ditemukan')) {
        alert('Sesi Anda telah berakhir. Akun Anda tidak ditemukan atau telah dihapus oleh Admin.');
        await signOut();
        navigate('/login');
        return;
      }
      console.error('Failed to load state:', err);
      setError(err.message || 'Gagal memuat data rumah.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && authUser) {
      loadHouseState(currentUserId, currentHouseId);

      // 1. Realtime Server-Sent Events (SSE) Listener
      let eventSource: EventSource | null = null;
      try {
        eventSource = new EventSource('/api/realtime/stream');
        eventSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'USER_DELETED') {
              if (data.deletedUserId === authUser.id || data.deletedUserId === currentUserId) {
                alert('Akun Anda telah dinonaktifkan atau dihapus oleh Admin.');
                signOut();
                navigate('/login');
                return;
              }
            }
            if (data.type !== 'CONNECTED') {
              loadHouseState(currentUserId, currentHouseId);
            }
          } catch {
            loadHouseState(currentUserId, currentHouseId);
          }
        };
      } catch (err) {
        console.warn('Realtime SSE unavailable, fallback to fast poll');
      }

      // 2. High-speed background sync (every 2.5s)
      const interval = setInterval(() => {
        loadHouseState(currentUserId, currentHouseId);
      }, 2500);
      
      // 3. Instant sync when user switches tab or unlocks mobile screen
      const handleFocus = () => {
        loadHouseState(currentUserId, currentHouseId);
      };
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          handleFocus();
        }
      });

      const handleRefresh = () => loadHouseState(currentUserId, currentHouseId);
      window.addEventListener('refreshCalendar', handleRefresh);
      
      return () => {
        if (eventSource) eventSource.close();
        clearInterval(interval);
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('refreshCalendar', handleRefresh);
      };
    }
  }, [currentUserId, currentHouseId, session, authUser]);

  const handleUserChange = (newUser: User) => {
    setCurrentUserId(newUser.id);
  };

  const handleOpenRecordPurchase = (need?: Need) => {
    setRecordPurchaseInitialNeed(need);
    setIsRecordPurchaseOpen(true);
  };

  const handleRecordPurchaseSubmit = async (data: any) => {
    if (!state) return;
    await api.recordPurchase({
      ...data,
      houseId: state.house.id,
    });
    await loadHouseState();
  };

  const handleCreateNeedSubmit = async (data: any) => {
    if (!state) return;
    await api.createNeed({
      ...data,
      houseId: state.house.id,
      actorId: currentUserId,
    });
    await loadHouseState();
  };

  const handlePaySettlement = async (data: any) => {
    if (!state) return;
    await api.submitSettlement({
      houseId: state.house.id,
      debtorId: currentUserId,
      creditorId: data.creditorId,
      amount: data.amount,
      notes: data.notes,
      qrisUsed: true,
    });
    await loadHouseState();
  };

  const handleConfirmSettlement = async (settlementId: string) => {
    await api.confirmSettlement(settlementId, currentUserId);
    await loadHouseState();
  };

  const handleCreateSplitBill = async (data: any) => {
    if (!state) return;
    await api.createSplitBill({
      ...data,
      houseId: state.house.id,
      creatorId: currentUserId,
    });
    await loadHouseState();
  };

  const handlePayContribution = async (contributionId: string, amount: number) => {
    await api.payContribution({
      contributionId,
      paidAmount: amount,
      actorId: currentUserId,
    });
    await loadHouseState();
  };

  const handleCreateWalletTx = async (data: any) => {
    await api.createWalletTx(data);
    await loadHouseState();
  };

  const handleCreateTicket = async (data: any) => {
    if (!state) return;
    await api.createMaintenanceTicket({
      ...data,
      houseId: state.house.id,
      reporterId: currentUserId,
    });
    await loadHouseState();
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: any) => {
    await api.updateTicketStatus(ticketId, status);
    await loadHouseState();
  };

  const handleReimburseTicket = async (ticketId: string, actualCost: number) => {
    if (!state) return;
    await api.reimburseMaintenance({
      ticketId,
      houseId: state.house.id,
      actorId: currentUserId,
      actualCost,
    });
    await loadHouseState();
  };

  const handleUpdateTelegramSettings = async (settings: any) => {
    if (!state) return;
    await api.updateTelegramSettings(state.house.id, settings);
    await loadHouseState();
  };

  const handleSwitchHouse = (newHouseId: string) => {
    setCurrentHouseId(newHouseId);
    loadHouseState(currentUserId, newHouseId);
  };

  // Auth Loading State


  // Not Logged In -> Show Real Auth View
  if (!session || !authUser) {
    return (
      <Routes>
        <Route path="/login" element={<AuthView />} />
        <Route path="/register" element={<AuthView />} />
        <Route path="/reset-password" element={<AuthView />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Initial App Data Loading
  if (!state) {
    if (error) {
      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6 max-w-md">
            <h2 className="text-lg font-bold text-rose-300 mb-2">Terjadi Gangguan</h2>
            <p className="text-xs text-rose-200/80 mb-4">{error}</p>
            <button
              onClick={() => {
                setIsLoading(true);
                setError(null);
                loadHouseState();
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-pulse">
          <Home className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Memuat KONTRAKAN MARKAS WARUNG...</span>
        </div>
      </div>
    );
  }

  const currentUserObj = users.find((u) => u.id === currentUserId) || state.currentUser;
  const currentMember = state?.members.find((m) => m.userId === currentUserId);
  const isSuperAdmin = Boolean(
    authIsSuperAdmin ||
    currentUserId === 'user_ghozi' ||
    authUser?.email?.toLowerCase() === 's.a.ghozi@gmail.com' ||
    authUser?.email?.toLowerCase() === 's.a.ghozi@gmail.com' ||
    currentMember?.role === 'SUPER_ADMIN'
  );
  const isAdmin = Boolean(
    isSuperAdmin ||
    authIsAdmin ||
    currentUserId === 'user_ilaa' ||
    authUser?.email?.toLowerCase() === 'ilaaapedia@gmail.com' ||
    currentMember?.role === 'ADMIN' ||
    currentMember?.role === 'OWNER'
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-black">
      {/* Top Header */}
      <Header
        house={state.house}
        users={users}
        currentUser={currentUserObj}
        onSelectUser={handleUserChange}
        notifications={[]}
        onMarkNotificationsRead={() => api.markNotificationRead(undefined, currentUserId)}
        onNavigate={handleNavigate}
        onOpenHouseManager={isSuperAdmin ? () => setIsHouseManagerOpen(true) : undefined}
        onOpenUserQRIS={() => setIsUserQRISModalOpen(true)}
        onOpenEditProfile={() => handleNavigate('profil')}
        onSignOut={signOut}
      />

      {/* Main Layout Container */}
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        {/* Desktop Sidebar */}
        <Sidebar
          isAdmin={isAdmin}
          activeTab={activeTab}
          onTabChange={handleNavigate}
          pendingDutiesCount={
            state.needs.filter(
              (n) => n.dutyEnabled && n.currentDutyMemberId === currentUserId && n.status !== 'AVAILABLE' && !n.archived
            ).length
          }
          unsettledDebtsCount={
            state.actionItems.filter(
              (a) => a.type === 'UNPAID_SPLIT' || a.type === 'CONFIRM_SETTLEMENT'
            ).length
          }
          openMaintenanceCount={state.activeMaintenance.length}
        />

        {/* Content View Area */}
        <main className="flex-1 px-4 py-6 sm:px-8 max-w-5xl overflow-x-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            <Route path="/dashboard" element={
              <ErrorBoundary fallbackMessage="Gagal memuat Dashboard Home.">
                <CommandCenter
                  state={state}
                  onNavigate={handleNavigate}
                  onSelectNeed={(id) => setSelectedNeedId(id)}
                  onQuickRecordPurchase={(need) => handleOpenRecordPurchase(need)}
                />
              </ErrorBoundary>
            } />

            <Route path="/kebutuhan" element={
              <ErrorBoundary fallbackMessage="Gagal memuat Hub Kebutuhan.">
                <NeedsHub
                  needs={state.needs}
                  clusters={state.clusters}
                  users={users}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onSelectNeed={(id) => setSelectedNeedId(id)}
                  onOpenRecordPurchase={(need) => handleOpenRecordPurchase(need)}
                  onOpenCreateNeed={() => setIsCreateNeedOpen(true)}
                  onOpenConfigureNeed={(need) => setSelectedNeedToConfigure(need)}
                />
              </ErrorBoundary>
            } />

            <Route path="/kalender" element={
              <ErrorBoundary fallbackMessage="Gagal memuat Kalender Rumah.">
                <HouseCalendar events={calendarEvents} houseId={state.house.id} />
              </ErrorBoundary>
            } />

            <Route path="/keuangan" element={
              <ErrorBoundary fallbackMessage="Gagal memuat Hub Keuangan & QRIS.">
                <FinanceHub
                  onOpenUserQRIS={() => setIsUserQRISModalOpen(true)}
                  wallet={state.wallet}
                  netBalances={state.netBalances}
                  settlementPlan={state.settlementPlan}
                  transactions={financeData.transactions}
                  contributions={financeData.contributions}
                  splitBills={financeData.splitBills}
                  settlements={financeData.settlements}
                  currentUserId={currentUserId}
                  users={users}
                  onPaySettlement={handlePaySettlement}
                  onConfirmSettlement={handleConfirmSettlement}
                  onCreateSplitBill={handleCreateSplitBill}
                  onPayContribution={handlePayContribution}
                  onCreateWalletTx={handleCreateWalletTx}
                  onRefresh={() => loadHouseState()}
                />
              </ErrorBoundary>
            } />

            <Route path="/pemeliharaan" element={
              <ErrorBoundary fallbackMessage="Gagal memuat Hub Pemeliharaan.">
                <MaintenanceHub
                  tickets={state.activeMaintenance}
                  users={users}
                  currentUserId={currentUserId}
                  onCreateTicket={handleCreateTicket}
                  onUpdateStatus={handleUpdateTicketStatus}
                  onReimburse={handleReimburseTicket}
                  onRefresh={() => loadHouseState()}
                />
              </ErrorBoundary>
            } />

            <Route path="/aktivitas" element={
              <ErrorBoundary fallbackMessage="Gagal memuat Rekap Aktivitas.">
                <ActivityHub
                  houseId={state.house.id}
                  activities={state.recentActivities}
                  users={users}
                />
              </ErrorBoundary>
            } />

            <Route path="/profil" element={
              <ErrorBoundary fallbackMessage="Gagal memuat Profil.">
                <ProfileHub users={users} currentUserId={currentUserId} onRefresh={() => loadHouseState()} />
              </ErrorBoundary>
            } />

            <Route path="/lainnya" element={
              <ErrorBoundary fallbackMessage="Gagal memuat Menu Lainnya.">
                <MobileMenu
                  onNavigate={handleNavigate}
                  openMaintenanceCount={state.activeMaintenance.filter(m => m.status !== 'RESOLVED').length}
                />
              </ErrorBoundary>
            } />

            <Route path="/pengaturan" element={
              <ErrorBoundary fallbackMessage="Gagal memuat Pengaturan Rumah.">
                {!isAdmin ? (
                  <div className="p-8 text-center text-zinc-500">Anda tidak memiliki akses ke halaman ini.</div>
                ) : (
                <SettingsHub
                  house={state.house}
                  members={state.members}
                  clusters={state.clusters}
                  users={users}
                  currentUserId={currentUserId}
                />
                )}
              </ErrorBoundary>
            } />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleNavigate}
        actionRequiredCount={state.actionItems.length}
      />

      {/* House Manager Modal (Multi-House & Members) */}
      {isHouseManagerOpen && (
        <HouseManagerModal
          currentHouse={state.house}
          currentUserId={currentUserId}
          members={state.members}
          allUsers={users}
          onClose={() => setIsHouseManagerOpen(false)}
          onSelectHouse={handleSwitchHouse}
          onHouseUpdated={() => loadHouseState(currentUserId, currentHouseId)}
        />
      )}

      {/* Need Detail Modal */}
      <NeedDetailModal
        needId={selectedNeedId}
        isOpen={!!selectedNeedId}
        onClose={() => setSelectedNeedId(null)}
        onOpenRecordPurchase={(need) => handleOpenRecordPurchase(need)}
        onOpenConfigure={(need) => setSelectedNeedToConfigure(need)}
        users={users}
        currentUserId={currentUserId}
        onRefresh={() => loadHouseState()}
      />

      {/* Record Purchase Modal */}
      <RecordPurchaseModal
        isOpen={isRecordPurchaseOpen}
        onClose={() => {
          setIsRecordPurchaseOpen(false);
          setRecordPurchaseInitialNeed(undefined);
        }}
        needs={state.needs}
        users={users}
        currentUserId={currentUserId}
        initialNeedId={recordPurchaseInitialNeed?.id}
        onSubmit={handleRecordPurchaseSubmit}
      />

      {/* Create Need Modal */}
      <CreateNeedModal
        isOpen={isCreateNeedOpen}
        onClose={() => setIsCreateNeedOpen(false)}
        clusters={state.clusters}
        members={state.members}
        isAdmin={isAdmin}
        onSubmit={handleCreateNeedSubmit}
      />

      {/* Configure Need Modal */}
      {selectedNeedToConfigure && (
        <ConfigureNeedModal
          need={selectedNeedToConfigure}
          clusters={state.clusters}
          members={state.members}
          onClose={() => setSelectedNeedToConfigure(null)}
          onSaved={() => loadHouseState()}
        />
      )}

      {/* User Personal QRIS Modal (1 Akun 1 QRIS) */}
      <UserQRISModal
        isOpen={isUserQRISModalOpen}
        onClose={() => setIsUserQRISModalOpen(false)}
        user={currentUserObj}
        onUpdated={() => loadHouseState()}
        houseAddress={state.house.address}
      />
      
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
