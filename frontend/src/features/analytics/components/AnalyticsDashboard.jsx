import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  ThumbsUp, 
  MessageCircle, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function AnalyticsDashboard({ posts = [] }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // 1. Calculate Summary Metrics
  const stats = useMemo(() => {
    const total = posts.length;
    const posted = posts.filter(p => p.status === 'posted');
    const failed = posts.filter(p => p.status === 'failed');
    const pending = posts.filter(p => p.status === 'pending' || p.status === 'publishing');

    const totalPosted = posted.length;
    const totalFailed = failed.length;

    const successRate = totalPosted + totalFailed > 0 
      ? Math.round((totalPosted / (totalPosted + totalFailed)) * 100) 
      : 100;

    let totalLikes = 0;
    let totalComments = 0;

    posted.forEach(p => {
      totalLikes += p.analytics?.likes || 0;
      totalComments += p.analytics?.comments || 0;
    });

    return {
      total,
      posted: totalPosted,
      failed: totalFailed,
      pending: pending.length,
      successRate,
      likes: totalLikes,
      comments: totalComments
    };
  }, [posts]);

  // 2. Prepare Engagement Trend Data (last 8 published posts, sorted chronologically)
  const trendData = useMemo(() => {
    return posts
      .filter(p => p.status === 'posted' && p.postedAt)
      .sort((a, b) => new Date(a.postedAt) - new Date(b.postedAt))
      .slice(-8)
      .map((p, idx) => {
        const dateObj = new Date(p.postedAt);
        const day = dateObj.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        return {
          id: p._id,
          label: day,
          likes: p.analytics?.likes || 0,
          comments: p.analytics?.comments || 0,
          engagement: (p.analytics?.likes || 0) + (p.analytics?.comments || 0),
          snippet: p.text.substring(0, 45) + (p.text.length > 45 ? '...' : '')
        };
      });
  }, [posts]);

  // 3. Prepare Weekly Volume Data (past 6 weeks)
  const weeklyData = useMemo(() => {
    const weeks = {};
    const now = new Date();

    // Initialize past 6 weeks
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i * 7);
      
      // Calculate start and end of week
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay());
      const label = `Wk ${startOfWeek.getDate()} ${startOfWeek.toLocaleString('default', { month: 'short' })}`;
      
      weeks[label] = { label, count: 0 };
    }

    posts.forEach(p => {
      const postDate = p.postedAt ? new Date(p.postedAt) : new Date(p.scheduledTime);
      const diffDays = Math.floor((now - postDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays < 42) {
        const postWeekStart = new Date(postDate);
        postWeekStart.setDate(postDate.getDate() - postDate.getDay());
        const label = `Wk ${postWeekStart.getDate()} ${postWeekStart.toLocaleString('default', { month: 'short' })}`;
        if (weeks[label]) {
          weeks[label].count++;
        }
      }
    });

    return Object.values(weeks);
  }, [posts]);

  // SVG dimensions for Line Chart
  const svgWidth = 540;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  // Max engagement calculation for Y-scaling
  const maxVal = useMemo(() => {
    const maxEng = Math.max(...trendData.map(d => d.engagement), 1);
    // Round to a nice number
    return Math.ceil(maxEng / 5) * 5;
  }, [trendData]);

  // Points mapping for Line Chart
  const linePoints = useMemo(() => {
    if (trendData.length === 0) return [];
    
    return trendData.map((d, index) => {
      const x = paddingX + (index / (trendData.length - 1 || 1)) * chartWidth;
      const y = paddingY + chartHeight - (d.engagement / maxVal) * chartHeight;
      return { x, y, data: d };
    });
  }, [trendData, maxVal, chartWidth, chartHeight]);

  const linePath = useMemo(() => {
    if (linePoints.length === 0) return '';
    return linePoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [linePoints]);

  const areaPath = useMemo(() => {
    if (linePoints.length === 0) return '';
    const start = `M ${linePoints[0].x} ${paddingY + chartHeight}`;
    const line = linePoints.map(p => `L ${p.x} ${p.y}`).join(' ');
    const end = `L ${linePoints[linePoints.length - 1].x} ${paddingY + chartHeight} Z`;
    return `${start} ${line} ${end}`;
  }, [linePoints, chartHeight]);

  return (
    <div className="space-y-6">
      
      {/* 1. Summary Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Card: Total Posts */}
        <div className="bg-white/70 backdrop-blur-md border border-stone-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-stone-50 rounded-bl-full z-0 group-hover:bg-amber-100/55 transition duration-300"></div>
          <div className="relative z-10 flex flex-col">
            <span className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-1">Queue Size</span>
            <span className="text-2xl font-bold text-stone-900">{stats.total}</span>
            <div className="flex items-center gap-1.5 mt-2 text-stone-500 text-[10px] font-semibold">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>{stats.pending} pending, {stats.posted} posted</span>
            </div>
          </div>
        </div>

        {/* Card: Success Rate */}
        <div className="bg-white/70 backdrop-blur-md border border-stone-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-stone-50 rounded-bl-full z-0 group-hover:bg-emerald-50 transition duration-300"></div>
          <div className="relative z-10 flex flex-col">
            <span className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-1">Delivery Rate</span>
            <span className={`text-2xl font-bold ${stats.successRate >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {stats.successRate}%
            </span>
            <div className="flex items-center gap-1.5 mt-2 text-stone-500 text-[10px] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{stats.failed} delivery failures</span>
            </div>
          </div>
        </div>

        {/* Card: Total Likes */}
        <div className="bg-white/70 backdrop-blur-md border border-stone-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-stone-50 rounded-bl-full z-0 group-hover:bg-amber-100/55 transition duration-300"></div>
          <div className="relative z-10 flex flex-col">
            <span className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Likes</span>
            <span className="text-2xl font-bold text-stone-900">{stats.likes}</span>
            <div className="flex items-center gap-1.5 mt-2 text-stone-500 text-[10px] font-semibold">
              <ThumbsUp className="w-3.5 h-3.5 text-amber-500" />
              <span>Average {(stats.likes / (stats.posted || 1)).toFixed(1)} / post</span>
            </div>
          </div>
        </div>

        {/* Card: Total Comments */}
        <div className="bg-white/70 backdrop-blur-md border border-stone-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-stone-50 rounded-bl-full z-0 group-hover:bg-amber-100/55 transition duration-300"></div>
          <div className="relative z-10 flex flex-col">
            <span className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Comments</span>
            <span className="text-2xl font-bold text-stone-900">{stats.comments}</span>
            <div className="flex items-center gap-1.5 mt-2 text-stone-500 text-[10px] font-semibold">
              <MessageCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Average {(stats.comments / (stats.posted || 1)).toFixed(1)} / post</span>
            </div>
          </div>
        </div>

      </div>

      {/* 2. Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Engagement Trend (Line Chart) */}
        <div className="lg:col-span-7 bg-white/70 backdrop-blur-md border border-stone-200/60 rounded-3xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-stone-700" />
                Engagement Trend
              </h4>
              <span className="text-[10px] text-stone-400 font-medium mt-0.5">Sum of likes & comments for the last 8 published posts</span>
            </div>
          </div>

          {trendData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 border border-dashed border-stone-200 rounded-2xl">
              <AlertCircle className="w-8 h-8 text-stone-300 mb-2" />
              <p className="text-xs text-stone-400 font-semibold">No published posts available to map trends.</p>
            </div>
          ) : (
            <div className="relative flex-1 flex items-center justify-center">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
                <defs>
                  <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d97706" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#d97706" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y Axes lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((val, i) => {
                  const y = paddingY + chartHeight * val;
                  const labelVal = Math.round(maxVal * (1 - val));
                  return (
                    <g key={i} className="opacity-40">
                      <line 
                        x1={paddingX} 
                        y1={y} 
                        x2={svgWidth - paddingX} 
                        y2={y} 
                        stroke="#e7e5e4" 
                        strokeWidth="1" 
                        strokeDasharray="3 3" 
                      />
                      <text 
                        x={paddingX - 10} 
                        y={y + 4} 
                        textAnchor="end" 
                        className="text-[9px] fill-stone-400 font-bold"
                      >
                        {labelVal}
                      </text>
                    </g>
                  );
                })}

                {/* Area Gradient fill */}
                <path d={areaPath} fill="url(#chart-area-grad)" />

                {/* Main trend line */}
                <path 
                  d={linePath} 
                  fill="none" 
                  stroke="#d97706" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />

                {/* Graph Dots */}
                {linePoints.map((pt, idx) => (
                  <circle 
                    key={idx}
                    cx={pt.x} 
                    cy={pt.y} 
                    r="4" 
                    fill="#fff" 
                    stroke="#d97706" 
                    strokeWidth="2.5"
                    className="cursor-pointer transition hover:scale-150 duration-200"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}

                {/* X Axis Labels */}
                {linePoints.map((pt, idx) => (
                  <text 
                    key={idx}
                    x={pt.x} 
                    y={svgHeight - 10} 
                    textAnchor="middle" 
                    className="text-[9px] fill-stone-400 font-bold opacity-80"
                  >
                    {pt.data.label}
                  </text>
                ))}
              </svg>

              {/* Tooltip Overlay */}
              {hoveredPoint && (
                <div 
                  className="absolute bg-stone-900 border border-stone-800 text-white rounded-lg p-2.5 shadow-xl pointer-events-none z-10 flex flex-col text-[10px]"
                  style={{
                    left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                    top: `${(hoveredPoint.y / svgHeight) * 100 - 32}%`,
                    transform: 'translate(-50%, -100%)'
                  }}
                >
                  <span className="font-bold mb-0.5 text-stone-300">{hoveredPoint.data.label}</span>
                  <p className="text-amber-400 font-semibold mb-1">
                    Engagement: {hoveredPoint.data.engagement} ({hoveredPoint.data.likes} L, {hoveredPoint.data.comments} C)
                  </p>
                  <span className="text-[9px] text-stone-500 italic max-w-[140px] truncate">
                    "{hoveredPoint.data.snippet}"
                  </span>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Weekly Posts Volume (Bar Chart) */}
        <div className="lg:col-span-5 bg-white/70 backdrop-blur-md border border-stone-200/60 rounded-3xl p-6 shadow-sm flex flex-col">
          <div className="flex flex-col mb-6">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-stone-700" />
              Weekly Output
            </h4>
            <span className="text-[10px] text-stone-400 font-medium mt-0.5">Number of published/scheduled posts per week</span>
          </div>

          <div className="flex-1 flex flex-col justify-between space-y-4">
            {weeklyData.map((wk, idx) => {
              const maxCount = Math.max(...weeklyData.map(w => w.count), 1);
              const percentage = Math.max((wk.count / maxCount) * 100, 4);
              
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-stone-400 w-16 select-none leading-none">
                    {wk.label}
                  </span>
                  
                  {/* Bar container */}
                  <div className="flex-1 h-5 bg-stone-100 rounded-md overflow-hidden relative border border-stone-200/20">
                    <div 
                      className="h-full bg-stone-900 rounded-r-md transition-all duration-500 ease-out origin-left cursor-pointer hover:bg-stone-850"
                      style={{ width: `${percentage}%` }}
                      title={`${wk.count} posts`}
                    ></div>
                  </div>

                  <span className="text-[10px] font-bold text-stone-900 w-6 text-right leading-none">
                    {wk.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. Detailed Recent Performance Table */}
      <div className="bg-white/70 backdrop-blur-md border border-stone-200/60 rounded-3xl p-6 shadow-sm">
        <h4 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
          Recent Post Metrics
        </h4>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200/80 text-stone-400 font-semibold uppercase tracking-wider text-[9px]">
                <th className="py-2.5 pb-2">Publish Date</th>
                <th className="py-2.5 pb-2">Snippet</th>
                <th className="py-2.5 pb-2 text-center">Likes</th>
                <th className="py-2.5 pb-2 text-center">Comments</th>
                <th className="py-2.5 pb-2 text-center">Total Engagement</th>
              </tr>
            </thead>
            <tbody>
              {posts
                .filter(p => p.status === 'posted' && p.postedAt)
                .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt))
                .slice(0, 5)
                .map((post, idx) => {
                  const dateStr = new Date(post.postedAt).toLocaleDateString(undefined, { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                  const snippet = post.text.substring(0, 75) + (post.text.length > 75 ? '...' : '');
                  const likes = post.analytics?.likes || 0;
                  const comments = post.analytics?.comments || 0;
                  
                  return (
                    <tr key={idx} className="border-b border-stone-100 hover:bg-stone-50/50 transition">
                      <td className="py-3 font-semibold text-stone-500 whitespace-nowrap">{dateStr}</td>
                      <td className="py-3 font-medium text-stone-800 pr-4">{snippet}</td>
                      <td className="py-3 text-center font-bold text-stone-900">{likes}</td>
                      <td className="py-3 text-center font-bold text-stone-900">{comments}</td>
                      <td className="py-3 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-amber-600 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/35">
                          {likes + comments}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              {posts.filter(p => p.status === 'posted').length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-stone-400 font-semibold italic">
                    No published posts with metrics found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
