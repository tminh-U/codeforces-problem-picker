import React, { useMemo } from 'react';
import { subDays, format, startOfDay, getDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { CFSubmission } from '@/services/api';

interface ActivityGraphProps {
  submissions: CFSubmission[];
}

export function ActivityGraph({ submissions }: ActivityGraphProps) {
  // Generate last 365 days until today
  const activityMap = useMemo(() => {
    const map = new Map<string, number>();
    submissions.forEach(sub => {
      // considering all submissions or only 'OK' (Accepted)? Usually GitHub counts all activity.
      const date = format(new Date(sub.creationTimeSeconds * 1000), 'yyyy-MM-dd');
      map.set(date, (map.get(date) || 0) + 1);
    });
    return map;
  }, [submissions]);

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    const ds = [];
    for (let i = 364; i >= 0; i--) {
      const d = subDays(today, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      ds.push({
        date: d,
        dateStr,
        count: activityMap.get(dateStr) || 0,
      });
    }
    return ds;
  }, [activityMap]);

  // Adjust to start on a Sunday or whatever day 0 is so grid aligns well.
  // Actually, standard github graph uses CSS Grid with grid-auto-flow: column
  // Let's rely on standard grid system.
  // Using 53 columns, 7 rows.
  // The first day's row should offset appropriately.

  return (
    <div className="w-full flex-col flex select-none overflow-x-auto pb-2">
      <div className="text-sm text-slate-500 mb-2 flex justify-between items-end">
        <span className="font-bold uppercase tracking-wider text-slate-500 text-xs">TIẾN TRÌNH SUBMISSION (365 NGÀY)</span>
        <span className="text-xs">{submissions.length} contributions in the last year</span>
      </div>
      <div 
        className="flex gap-1.5"
      >
        {/* We can group by weeks to make standard column layout. */}
        {React.useMemo(() => {
          let weeks = [];
          let currentWeek = [];
          // Pad first week to start from Sunday
          const firstDay = days[0].date;
          const firstDayOfWeek = getDay(firstDay); // 0 = Sunday
          for (let i = 0; i < firstDayOfWeek; i++) {
            currentWeek.push(null);
          }

          for (const day of days) {
            currentWeek.push(day);
            if (currentWeek.length === 7) {
              weeks.push(currentWeek);
              currentWeek = [];
            }
          }
          if (currentWeek.length > 0) {
            // pad remaining
            while (currentWeek.length < 7) currentWeek.push(null);
            weeks.push(currentWeek);
          }

          return weeks.map((week, wi) => (
             <div key={wi} className="flex flex-col gap-1.5">
               {week.map((day, di) => {
                 if (!day) return <div key={di} className="w-3 h-3 rounded-sm bg-transparent" />;
                 const count = day.count;
                 let bg = "bg-slate-800"; // level 0
                 if (count > 0 && count <= 2) bg = "bg-green-900";
                 else if (count > 2 && count <= 5) bg = "bg-green-700";
                 else if (count > 5 && count <= 10) bg = "bg-green-500";
                 else if (count > 10) bg = "bg-green-400";
                 
                 return (
                   <div 
                     key={di} 
                     title={`${count} submissions on ${day.dateStr}`}
                     className={cn("w-3 h-3 rounded-sm cursor-pointer hover:ring-1 ring-slate-400 ring-offset-1 transition-colors", bg)} 
                   />
                 )
               })}
             </div>
          ))
        }, [days])}
      </div>
      <div className="flex text-xs text-slate-500 mt-2 gap-4">
        <div className="flex items-center gap-1">Less <div className="w-3 h-3 rounded-sm bg-slate-800" /> <div className="w-3 h-3 rounded-sm bg-green-900" /> <div className="w-3 h-3 rounded-sm bg-green-700" /> <div className="w-3 h-3 rounded-sm bg-green-500" /> <div className="w-3 h-3 rounded-sm bg-green-400" /> More</div>
      </div>
    </div>
  );
}
