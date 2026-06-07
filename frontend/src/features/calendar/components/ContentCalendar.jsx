import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Image as ImageIcon, 
  X, 
  Edit2, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  TrendingUp
} from 'lucide-react';

export default function ContentCalendar({ 
  posts, 
  apiFetch, 
  onRefresh, 
  showToast, 
  formatLocalDateTime 
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [newScheduleTime, setNewScheduleTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    setCurrentMonth(new Date());
  };

  // Date Math for Monthly Grid
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday, 6 = Saturday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Create calendar cells (42 total: 6 rows * 7 columns)
  const cells = [];

  // Previous month cells padding
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    cells.push({
      day,
      isCurrentMonth: false,
      date: new Date(year, month - 1, day)
    });
  }

  // Current month cells
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i)
    });
  }

  // Next month cells padding to reach 42 cells
  const remainingCells = 42 - cells.length;
  for (let i = 1; i <= remainingCells; i++) {
    cells.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i)
    });
  }

  // Filter posts that are scheduled for a specific date cell
  const getPostsForDate = (date) => {
    return posts.filter(post => {
      const pDate = new Date(post.scheduledTime);
      return pDate.getFullYear() === date.getFullYear() &&
             pDate.getMonth() === date.getMonth() &&
             pDate.getDate() === date.getDate();
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Format date-time for datetime-local input prefill (YYYY-MM-DDTHH:MM)
  const formatForDatetimeLocal = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // Reschedule API Action
  const handleRescheduleSubmit = async (postId) => {
    if (!newScheduleTime) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time: newScheduleTime })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Post rescheduled successfully!', 'success');
        setEditingPostId(null);
        setNewScheduleTime('');
        onRefresh();
      } else {
        showToast(data.message || 'Rescheduling failed', 'error');
      }
    } catch (err) {
      showToast('Error connecting to backend API', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group posts by status for rendering analytics header
  const totalScheduled = posts.filter(p => p.status === 'pending').length;
  const totalPublished = posts.filter(p => p.status === 'posted').length;
  const totalFailed = posts.filter(p => p.status === 'failed').length;

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm animate-fade flex flex-col gap-6">
      
      {/* Metrics Banner */}
      <div className="grid grid-cols-3 gap-4 p-3 bg-stone-50 border border-stone-100 rounded-xl">
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400">Scheduled</span>
          <span className="text-lg font-extrabold text-amber-600">{totalScheduled}</span>
        </div>
        <div className="flex flex-col items-center justify-center text-center border-x border-stone-200">
          <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400">Published</span>
          <span className="text-lg font-extrabold text-emerald-600">{totalPublished}</span>
        </div>
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400">Failed</span>
          <span className="text-lg font-extrabold text-rose-600">{totalFailed}</span>
        </div>
      </div>

      {/* Calendar Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-stone-100 pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-stone-900 leading-none">{monthName}</h2>
          <span className="bg-stone-100 text-stone-600 text-[10px] px-2 py-0.5 rounded font-bold border border-stone-200">
            {posts.length} Sync Slots
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleGoToToday}
            className="px-3 py-1.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-lg shadow-sm transition duration-150 cursor-pointer"
          >
            Today
          </button>
          
          <div className="flex items-center border border-stone-200 bg-white rounded-lg shadow-sm overflow-hidden">
            <button 
              onClick={handlePrevMonth}
              title="Previous Month"
              className="p-1.5 hover:bg-stone-50 text-stone-600 transition border-r border-stone-200 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={handleNextMonth}
              title="Next Month"
              className="p-1.5 hover:bg-stone-50 text-stone-600 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Grid */}
      <div className="flex flex-col">
        {/* Days of Week Headers */}
        <div className="grid grid-cols-7 text-center border-b border-stone-100 pb-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-[10px] font-bold uppercase tracking-wider text-stone-400 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((cell, idx) => {
            const datePosts = getPostsForDate(cell.date);
            const isTodayCell = isToday(cell.date);

            return (
              <div 
                key={idx}
                onClick={() => {
                  if (datePosts.length > 0) {
                    setSelectedDate(cell.date);
                  }
                }}
                className={`min-h-[75px] max-h-[120px] p-1.5 border rounded-xl flex flex-col justify-between transition duration-150 relative ${
                  datePosts.length > 0 ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
                } ${
                  cell.isCurrentMonth 
                    ? 'bg-white border-stone-200/80' 
                    : 'bg-stone-50/50 border-stone-200/40 opacity-50'
                } ${
                  isTodayCell 
                    ? 'ring-2 ring-stone-900 border-stone-900' 
                    : 'hover:border-stone-300'
                }`}
              >
                {/* Day Number */}
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[10px] font-bold ${
                    isTodayCell 
                      ? 'bg-stone-900 text-white w-5 h-5 rounded-full flex items-center justify-center scale-95' 
                      : cell.isCurrentMonth ? 'text-stone-900' : 'text-stone-400'
                  }`}>
                    {cell.day}
                  </span>
                  {datePosts.length > 0 && (
                    <span className="text-[8px] font-extrabold text-stone-400 px-1 bg-stone-100 rounded">
                      {datePosts.length}
                    </span>
                  )}
                </div>

                {/* Posts Badges list inside cell */}
                <div className="flex flex-col gap-1 overflow-y-auto max-h-[55px] custom-scrollbar pr-0.5">
                  {datePosts.slice(0, 3).map(post => {
                    const timeStr = new Date(post.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div 
                        key={post._id}
                        className={`text-[8px] font-bold px-1.5 py-0.5 rounded border leading-tight truncate ${
                          post.status === 'pending' ? 'bg-amber-500/10 text-amber-800 border-amber-500/20' :
                          post.status === 'posted' ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20' :
                          post.status === 'failed' ? 'bg-rose-500/10 text-rose-800 border-rose-500/20' :
                          'bg-blue-500/10 text-blue-800 border-blue-500/20 animate-pulse'
                        }`}
                        title={`${timeStr} - ${post.text}`}
                      >
                        {timeStr}
                      </div>
                    );
                  })}
                  {datePosts.length > 3 && (
                    <div className="text-[7px] text-stone-400 font-bold text-center py-0.5">
                      + {datePosts.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inline Help */}
      <div className="flex items-start gap-2.5 p-3.5 bg-amber-500/5 rounded-xl border border-amber-500/10 text-[11px] text-amber-800">
        <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
        <p className="leading-relaxed font-medium">
          Click any date with a post count indicator to view the scheduling cards, review live statuses, or update posting slots.
        </p>
      </div>

      {/* Selected Date Detail Modal Overlay */}
      {selectedDate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col max-h-[85vh] text-stone-900 animate-slide-in">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-stone-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-stone-500" />
                <h3 className="text-sm font-bold text-stone-900">
                  Schedules for {selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setSelectedDate(null);
                  setEditingPostId(null);
                  setNewScheduleTime('');
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content - List of posts for day */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 custom-scrollbar">
              {getPostsForDate(selectedDate).map(post => {
                const isEditing = editingPostId === post._id;
                
                return (
                  <div 
                    key={post._id}
                    className={`p-4 border border-stone-200 rounded-xl flex flex-col gap-3 relative transition status-border-${post.status}`}
                  >
                    {/* Status Badge & Time */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>{formatLocalDateTime(post.scheduledTime)}</span>
                      </div>
                      <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border leading-none ${
                        post.status === 'pending' ? 'bg-amber-500/10 text-amber-700 border-amber-500/20' :
                        post.status === 'posted' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' :
                        post.status === 'failed' ? 'bg-rose-500/10 text-rose-700 border-rose-500/20' :
                        'bg-blue-500/10 text-blue-700 border-blue-500/20 animate-pulse'
                      }`}>
                        {post.status}
                      </span>
                    </div>

                    {/* Post Content preview */}
                    <p className="text-xs text-stone-600 whitespace-pre-wrap leading-relaxed break-words">
                      {post.text}
                    </p>

                    {/* Optional Image */}
                    {post.imageUrl && (
                      <div className="flex items-center gap-2 p-2 bg-stone-50 border border-stone-200 rounded-lg text-[10px] text-stone-500 overflow-hidden">
                        <ImageIcon className="text-stone-400 shrink-0 w-3.5 h-3.5" />
                        <span className="truncate">{post.imageUrl}</span>
                      </div>
                    )}

                    {/* Failure details if any */}
                    {post.status === 'failed' && post.error && (
                      <div className="text-[10px] text-rose-600 bg-rose-50 border-l-2 border-rose-500 px-2.5 py-1.5 rounded">
                        Error: {post.error}
                      </div>
                    )}

                    {/* Footer buttons / edit form */}
                    <div className="border-t border-stone-100 pt-3 mt-1 flex flex-col gap-3">
                      {!isEditing ? (
                        <div className="flex justify-between items-center text-[10px] text-stone-400">
                          <span>
                            {post.notionPageId.startsWith('local-') 
                              ? 'Local Draft' 
                              : `Notion Synced`}
                          </span>
                          <button 
                            onClick={() => {
                              setEditingPostId(post._id);
                              setNewScheduleTime(formatForDatetimeLocal(post.scheduledTime));
                            }}
                            className="flex items-center gap-1 px-3 py-1 border border-stone-200 hover:border-stone-400 hover:bg-stone-50 text-stone-700 font-bold rounded-lg transition cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Reschedule</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5 p-3 bg-stone-50 border border-stone-200 rounded-xl">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                            Select New Posting Slot:
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input 
                              type="datetime-local" 
                              value={newScheduleTime}
                              onChange={(e) => setNewScheduleTime(e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900 focus:border-stone-900"
                            />
                            <div className="flex gap-1.5 justify-end">
                              <button 
                                onClick={() => {
                                  setEditingPostId(null);
                                  setNewScheduleTime('');
                                }}
                                disabled={isSubmitting}
                                className="px-3 py-1.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 text-xs font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={() => handleRescheduleSubmit(post._id)}
                                disabled={isSubmitting || !newScheduleTime}
                                className="px-3.5 py-1.5 bg-stone-950 hover:bg-stone-900 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                              >
                                {isSubmitting ? (
                                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : null}
                                <span>Save</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-stone-100 pt-4 mt-4 flex justify-end">
              <button 
                onClick={() => {
                  setSelectedDate(null);
                  setEditingPostId(null);
                  setNewScheduleTime('');
                }}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-950 text-white text-xs font-bold rounded-full shadow-md transition cursor-pointer"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
