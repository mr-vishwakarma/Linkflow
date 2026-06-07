import React from 'react';
import { Clock, Image as ImageIcon, Send, Trash2 } from 'lucide-react';

export default function QueueItem({ post, onDelete, onForcePublish, formatLocalDateTime }) {
  return (
    <div className={`flex flex-col gap-3.5 p-4 bg-white border border-stone-200 rounded-xl hover:border-stone-300 transition duration-150 status-border-${post.status}`}>
      {/* Meta details */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span>{formatLocalDateTime(post.scheduledTime)}</span>
          </div>
          <div className="text-[10px] text-stone-400">
            {post.notionPageId.startsWith('local-') 
              ? 'Queued Local Draft' 
              : `Synced: ${new Date(post.syncedAt).toLocaleDateString()}`}
          </div>
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

      {/* Copy Text */}
      <div className="text-xs text-stone-600 leading-relaxed whitespace-pre-wrap break-words line-clamp-3">
        {post.text}
      </div>

      {/* Media link */}
      {post.imageUrl && (
        <div className="flex items-center gap-2 p-2.5 bg-[#fbfaf7] border border-stone-200 rounded-lg text-[10px] text-stone-500 overflow-hidden">
          <ImageIcon className="text-stone-400 shrink-0 w-3.5 h-3.5" />
          <span className="truncate" title={post.imageUrl}>{post.imageUrl}</span>
        </div>
      )}

      {/* Failure Error log */}
      {post.status === 'failed' && post.error && (
        <div className="text-[10px] text-rose-600 bg-rose-500/5 border-l-2 border-rose-500 rounded px-2.5 py-1.5 mt-1 leading-normal">
          Error Log: {post.error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center border-t border-stone-100 pt-3 mt-1">
        <span className="text-[10px] text-stone-400">
          {post.postedAt ? `Published: ${formatLocalDateTime(post.postedAt)}` : ''}
        </span>
        
        <div className="flex items-center gap-1.5">
          {(post.status === 'pending' || post.status === 'failed') && (
            <button 
              onClick={(e) => onForcePublish(post._id, e)}
              title="Publish immediately to LinkedIn"
              className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 transition duration-150 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
          <button 
            onClick={() => onDelete(post._id)}
            title="Delete schedule slot"
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition duration-150 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
