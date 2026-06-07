import React from 'react';
import { Calendar } from 'lucide-react';
import QueueItem from './QueueItem';

export default function PostQueue({ 
  posts, 
  activeFilter, 
  setActiveFilter, 
  onDelete, 
  onForcePublish, 
  formatLocalDateTime 
}) {
  
  // Filter lists
  const filteredPosts = posts.filter(post => {
    if (activeFilter === 'all') return true;
    return post.status === activeFilter;
  });

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm animate-fade">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold tracking-wide text-stone-900">Sync Queue Logs</h2>
          <span className="bg-stone-100 text-stone-600 text-[10px] px-2.5 py-1 rounded-full font-bold border border-stone-200">
            {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          </span>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'posted', 'failed'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition duration-150 cursor-pointer ${
                activeFilter === filter
                  ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                  : 'border-stone-200 bg-stone-50 text-stone-500 hover:bg-stone-100 hover:text-stone-700'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Queue items */}
      <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-stone-400">
            <Calendar className="w-12 h-12 text-stone-300 mb-4" />
            <p className="font-bold text-sm text-stone-900 mb-1">No scheduled updates found</p>
            <span className="text-xs text-stone-500">Populate schedules by running Notion Sync or drafting a local update.</span>
          </div>
        ) : (
          filteredPosts.map(post => (
            <QueueItem 
              key={post._id}
              post={post}
              onDelete={onDelete}
              onForcePublish={onForcePublish}
              formatLocalDateTime={formatLocalDateTime}
            />
          ))
        )}
      </div>
    </div>
  );
}
