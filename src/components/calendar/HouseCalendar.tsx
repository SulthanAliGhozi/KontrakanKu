import React, { useState } from 'react';
import { CalendarEvent } from '../../types';
import { api } from '../../services/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Sparkles,
  Info,
  Clock,
} from 'lucide-react';
import { Badge } from '../ui/Badge';

interface HouseCalendarProps {
  events: CalendarEvent[];
}

export const HouseCalendar: React.FC<HouseCalendarProps> = ({ events = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 22)); // Sept 2026
  const [viewMode, setViewMode] = useState<'MONTH' | 'WEEK' | 'LIST'>('MONTH');
  const [filterType, setFilterType] = useState<string>('ALL');
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);

  // Month navigation
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const filteredEvents = events.filter((e) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'ACTUAL') return !e.isEstimated;
    if (filterType === 'ESTIMATED') return e.isEstimated;
    return e.type === filterType;
  });

  // Calculate calendar days for the current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  const daysOfWeek = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const getEventsForDay = (day: number) => {
    const targetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(
      2,
      '0'
    )}`;
    return filteredEvents.filter((e) => e.date === targetDateStr);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Smart Shared Living Calendar</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Kalender Rumah</h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Jadwal riil pembelian & prediksi cerdas kapan stok kebutuhan akan habis.
          </p>
        </div>

        {/* Legend & Filter Controls */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-zinc-800 bg-zinc-900 p-1 text-xs">
            <button
              onClick={() => setViewMode('MONTH')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                viewMode === 'MONTH' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Bulan
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                viewMode === 'LIST' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Daftar Agenda
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Visual Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'Semua Agenda' },
            { id: 'ACTUAL', label: 'Solid (Riil)' },
            { id: 'ESTIMATED', label: 'Dashed (Prediksi)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition ${
                filterType === tab.id
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-500/80"></span>
            <span>Riil (Solid)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm border border-dashed border-amber-400 bg-amber-400/20"></span>
            <span>Estimasi (Dashed)</span>
          </div>
        </div>
      </div>

      {viewMode === 'MONTH' ? (
        /* Month Calendar View */
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden shadow-xl">
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900">
            <h3 className="text-base font-bold text-white">
              {monthNames[month]} {year}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-zinc-800 text-center text-xs font-semibold text-zinc-400 bg-zinc-950/40 py-2">
            {daysOfWeek.map((day, idx) => (
              <div key={idx} className={idx === 0 ? 'text-rose-400' : ''}>
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-zinc-800/80 bg-zinc-950/20">
            {/* Empty offset cells */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[90px] sm:min-h-[110px] p-2 bg-zinc-950/40" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday =
                day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

              return (
                <div
                  key={day}
                  onClick={() => { const d = new Date(year, month, day); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const dayStr = String(d.getDate()).padStart(2, '0'); setSelectedDate(`${y}-${m}-${dayStr}`); }}
                  className={`cursor-pointer min-h-[90px] sm:min-h-[110px] p-2 transition hover:bg-zinc-800/30 flex flex-col justify-between ${
                    isToday ? 'bg-emerald-950/15' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isToday
                          ? 'flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-black font-extrabold'
                          : 'text-zinc-300'
                      }`}
                    >
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {dayEvents.length} agenda
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 space-y-1 overflow-y-auto max-h-20">
                    {dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className={`px-1.5 py-0.5 rounded text-[10px] truncate leading-tight font-medium ${
                          evt.isEstimated
                            ? 'border border-dashed text-amber-300 bg-amber-500/15 border-amber-500/40'
                            : 'text-white shadow-xs'
                        }`}
                        style={{
                          backgroundColor: !evt.isEstimated ? evt.color || '#3b82f6' : undefined,
                        }}
                        title={`${evt.title} - ${evt.description || ''}`}
                      >
                        {evt.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 divide-y divide-zinc-800/60">
          {filteredEvents.length === 0 ? (
            <p className="text-xs text-zinc-500 py-8 text-center">Tidak ada agenda pada filter ini.</p>
          ) : (
            filteredEvents.map((evt) => (
              <div key={evt.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white font-bold text-xs ${
                      evt.isEstimated ? 'border border-dashed border-amber-400 bg-amber-400/20 text-amber-400' : ''
                    }`}
                    style={{ backgroundColor: !evt.isEstimated ? evt.color : undefined }}
                  >
                    {evt.isEstimated ? '~' : '✓'}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{evt.title}</h4>
                    <p className="text-zinc-400 mt-0.5">{evt.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={evt.isEstimated ? 'warning' : 'success'} size="sm">
                        {evt.isEstimated ? 'Prediksi Pola Konsumsi' : 'Agenda Terlaksana'}
                      </Badge>
                      <span className="text-[11px] text-zinc-500">Tipe: {evt.type}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-zinc-300 block">
                    {new Date(evt.date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Event Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Tambah Agenda</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Tanggal</label>
                <input type="date" value={selectedDate} readOnly className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Judul Agenda</label>
                <input type="text" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white text-sm focus:border-emerald-500 outline-none" placeholder="Contoh: Rapat Kontrakan" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Deskripsi Singkat</label>
                <input type="text" value={newEventDesc} onChange={e => setNewEventDesc(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white text-sm focus:border-emerald-500 outline-none" placeholder="Catatan tambahan..." />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setSelectedDate(null)} className="px-4 py-2 rounded-xl font-bold text-xs text-zinc-400 hover:text-white transition">Batal</button>
              <button onClick={async () => {
                if (!newEventTitle) return;
                setSavingEvent(true);
                try {
                  await api.createCalendarEvent({
                    id: 'evt_' + Date.now(),
                    houseId: events[0]?.houseId || 'house_harmoni',
                    title: newEventTitle,
                    description: newEventDesc,
                    date: selectedDate,
                    type: 'HOUSE_EVENT',
                    color: '#3b82f6',
                    creatorId: user?.id || 'unknown'
                  });
                  window.dispatchEvent(new CustomEvent('refreshCalendar'));
                  setSelectedDate(null);
                  setNewEventTitle('');
                  setNewEventDesc('');
                } catch(e) {
                  alert('Gagal menyimpan agenda');
                } finally {
                  setSavingEvent(false);
                }
              }} disabled={savingEvent} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-bold text-xs transition disabled:opacity-50">
                {savingEvent ? 'Menyimpan...' : 'Simpan Agenda'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
