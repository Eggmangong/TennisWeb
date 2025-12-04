"use client";

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, addMonths, differenceInDays, endOfMonth, endOfWeek, format, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { fetchCheckins, setCheckin } from '@/lib/api';
import type { CheckInMonth, CheckInItem } from '@/lib/types';

function monthKey(d: Date) {
  return format(d, 'yyyy-MM');
}

export default function Calendar() {
  const [current, setCurrent] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  
  const qc = useQueryClient();
  const ym = useMemo(() => monthKey(current), [current]);

  const { data } = useQuery<CheckInMonth>({
    queryKey: ['checkins', ym],
    queryFn: () => fetchCheckins(ym),
  });

  const checkinMap = useMemo(() => {
    const map = new Map<string, CheckInItem>();
    data?.checkins?.forEach((c) => map.set(c.date, c));
    return map;
  }, [data]);

  const mutation = useMutation({
    mutationFn: ({ dateISO, value, start_time, end_time }: { dateISO: string; value: boolean; start_time?: string | null; end_time?: string | null }) => 
      setCheckin(dateISO, value, undefined, start_time, end_time),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['checkins', ym] });
      setSelectedDate(null);
    },
  });

  const onPrev = () => setCurrent((d) => addMonths(d, -1));
  const onNext = () => setCurrent((d) => addMonths(d, 1));
  const onToday = () => setCurrent(new Date());

  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(current), { weekStartsOn: 0 });
    const days: Date[] = [];
    let d = start;
    while (d <= end) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [current]);

  const handleDayClick = (d: Date) => {
    const iso = format(d, 'yyyy-MM-dd');
    const existing = checkinMap.get(iso);
    setStartTime(existing?.start_time || '18:00');
    setEndTime(existing?.end_time || '20:00');
    setSelectedDate(d);
  };

  const handleSave = () => {
    if (!selectedDate) return;
    const iso = format(selectedDate, 'yyyy-MM-dd');
    mutation.mutate({ 
      dateISO: iso, 
      value: true, 
      start_time: startTime || null, 
      end_time: endTime || null 
    });
  };

  const handleDelete = () => {
    if (!selectedDate) return;
    const iso = format(selectedDate, 'yyyy-MM-dd');
    mutation.mutate({ dateISO: iso, value: false });
  };

  // Stats Calculation
  const stats = useMemo(() => {
    if (!data?.checkins) return { totalHours: 0, maxStreak: 0, count: 0 };
    
    const sorted = [...data.checkins].sort((a, b) => a.date.localeCompare(b.date));
    const totalMinutes = sorted.reduce((acc, c) => acc + c.duration, 0);
    
    let maxStreak = 0;
    let currentStreak = 0;
    let lastDate: Date | null = null;

    for (const c of sorted) {
      const d = parseISO(c.date);
      if (!lastDate) {
        currentStreak = 1;
      } else {
        const diff = differenceInDays(d, lastDate);
        if (diff === 1) {
          currentStreak++;
        } else if (diff > 1) {
          currentStreak = 1;
        }
      }
      maxStreak = Math.max(maxStreak, currentStreak);
      lastDate = d;
    }

    return {
      totalHours: (totalMinutes / 60).toFixed(1),
      maxStreak,
      count: sorted.length
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-indigo-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-indigo-600">{stats.count}</div>
          <div className="text-xs text-gray-600 uppercase tracking-wide">Days Played</div>
        </div>
        <div className="bg-indigo-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-indigo-600">{stats.totalHours}</div>
          <div className="text-xs text-gray-600 uppercase tracking-wide">Total Hours</div>
        </div>
        <div className="bg-indigo-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-indigo-600">{stats.maxStreak}</div>
          <div className="text-xs text-gray-600 uppercase tracking-wide">Max Streak</div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4 relative">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">{format(current, 'MMMM yyyy')}</div>
          <div className="flex gap-2">
            <button onClick={onPrev} className="px-2 py-1 rounded border hover:bg-gray-50">‹</button>
            <button onClick={onToday} className="px-2 py-1 rounded border hover:bg-gray-50">Today</button>
            <button onClick={onNext} className="px-2 py-1 rounded border hover:bg-gray-50">›</button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-600 mb-1">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((w) => (
            <div key={w} className="py-1">{w}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {grid.map((d) => {
            const iso = format(d, 'yyyy-MM-dd');
            const dim = !isSameMonth(d, current);
            const today = isToday(d);
            const item = checkinMap.get(iso);
            const has = !!item;
            
            return (
              <button
                key={iso}
                onClick={() => handleDayClick(d)}
                className={`relative aspect-square rounded border text-sm flex flex-col items-center justify-center select-none transition-colors
                  ${dim ? 'text-gray-300 bg-gray-50' : 'text-gray-800 bg-white'}
                  ${today ? 'ring-2 ring-indigo-500 z-10' : ''}
                  ${has ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-gray-50'}
                `}
              >
                <span className="pointer-events-none font-medium">{format(d, 'd')}</span>
                {has && (
                  <div className="mt-1 flex flex-col items-center">
                    <span className="text-lg leading-none">🎾</span>
                    {item.start_time && item.end_time ? (
                      <span className="text-[9px] text-indigo-600 font-semibold leading-tight mt-0.5">
                        {item.start_time}<br/>{item.end_time}
                      </span>
                    ) : (
                      <span className="text-[10px] text-indigo-600 font-semibold">{item.duration}m</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Edit Modal/Popover */}
        {selectedDate && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg z-20 backdrop-blur-[1px]">
            <div className="bg-white p-4 rounded-lg shadow-xl w-64 border border-gray-200 animate-in fade-in zoom-in duration-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                {format(selectedDate, 'MMM d, yyyy')}
              </h3>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                {checkinMap.has(format(selectedDate, 'yyyy-MM-dd')) && (
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={() => setSelectedDate(null)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded shadow-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
